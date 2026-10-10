using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Services.Pluggy;
using Hackaton.Services.Services.Errors;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;
using Mapster;
using Microsoft.Extensions.Logging;
using Pluggy.SDK.Errors;
using PluggyModel = Pluggy.SDK.Model;

namespace Hackaton.Services.Services
{
    public class BankConnectionService : IBankConnectionService
    {
        private readonly IBankConnectionRepository _connectionRepository;
        private readonly IBankInvestmentRepository _investmentRepository;
        private readonly IPluggyGateway _pluggy;
        private readonly TimeProvider _timeProvider;
        private readonly ILogger<BankConnectionService> _logger;

        public BankConnectionService(
            IBankConnectionRepository connectionRepository,
            IBankInvestmentRepository investmentRepository,
            IPluggyGateway pluggy,
            TimeProvider timeProvider,
            ILogger<BankConnectionService> logger)
        {
            _connectionRepository = connectionRepository;
            _investmentRepository = investmentRepository;
            _pluggy = pluggy;
            _timeProvider = timeProvider;
            _logger = logger;
        }

        public async Task<Result<List<BankConnectionResponse>>> GetAllAsync(Guid userId, CancellationToken cancellationToken)
        {
            var connections = await _connectionRepository.GetByUserIdAsync(userId, cancellationToken);
            return connections.Adapt<List<BankConnectionResponse>>();
        }

        public async Task<Result<BankConnectionResponse>> ConnectAsync(
            Guid userId, ConnectBankRequest request, CancellationToken cancellationToken)
        {
            var itemId = Guid.Parse(request.ItemId);

            if (await _connectionRepository.ExistsAsync(userId, itemId, cancellationToken))
                return BankConnectionErrors.AlreadyConnected;

            // Confere na Pluggy que o item existe e pertence a esta aplicacao antes de salvar
            PluggyModel.Item item;
            try
            {
                item = await _pluggy.FetchItemAsync(itemId);
            }
            catch (ApiException exception)
            {
                _logger.LogWarning(exception, "Pluggy recusou o item {ItemId}: {StatusCode}", itemId, exception.StatusCode);
                return BankConnectionErrors.FromPluggy(exception);
            }

            var connection = new BankConnection
            {
                UserId = userId,
                PluggyItemId = item.Id,
                ConnectorName = item.Connector?.Name ?? string.Empty,
                Status = item.Status.ToString(),
                InstitutionName = await FetchInstitutionNameAsync(item.Id)
            };

            await _connectionRepository.AddAsync(connection, cancellationToken);
            await _connectionRepository.SaveChangesAsync(cancellationToken);

            return connection.Adapt<BankConnectionResponse>();
        }

        public async Task<Result<SyncResultResponse>> SyncAsync(Guid userId, Guid connectionId, CancellationToken cancellationToken)
        {
            var connection = await _connectionRepository.GetForSyncAsync(connectionId, userId, cancellationToken);
            if (connection is null)
                return BankConnectionErrors.NotFound;

            var now = _timeProvider.GetUtcNow().UtcDateTime;
            var result = new SyncResultResponse { BankConnectionId = connection.Id, SyncedAt = now };

            try
            {
                var item = await _pluggy.FetchItemAsync(connection.PluggyItemId);
                connection.Status = item.Status.ToString();
                connection.ConnectorName = item.Connector?.Name ?? connection.ConnectorName;
                connection.InstitutionName = await FetchInstitutionNameAsync(connection.PluggyItemId) ?? connection.InstitutionName;

                var pluggyInvestments = await _pluggy.FetchInvestmentsAsync(connection.PluggyItemId);
                await SyncInvestmentsAsync(connection, pluggyInvestments, result, cancellationToken);
            }
            catch (ApiException exception)
            {
                _logger.LogWarning(exception, "Falha no sync da conexao {ConnectionId}: {StatusCode}", connectionId, exception.StatusCode);
                return BankConnectionErrors.FromPluggy(exception);
            }
            catch (HttpRequestException exception)
            {
                _logger.LogWarning(exception, "Pluggy indisponivel no sync da conexao {ConnectionId}", connectionId);
                return BankConnectionErrors.Unavailable;
            }

            connection.LastSyncedAt = now;
            await _connectionRepository.SaveChangesAsync(cancellationToken);

            return result;
        }

        // O nome vem das contas do item (ex: "XP"); null se o item nao tiver contas
        private async Task<string?> FetchInstitutionNameAsync(Guid itemId)
        {
            var accounts = await _pluggy.FetchAccountsAsync(itemId);
            var name = accounts
                .Select(a => string.IsNullOrWhiteSpace(a.MarketingName) ? a.Name : a.MarketingName)
                .FirstOrDefault(n => !string.IsNullOrWhiteSpace(n))
                ?.Trim();

            return name is { Length: > 150 } ? name[..150] : name;
        }

        // A carteira salva espelha a da Pluggy: cria as novas, atualiza as existentes e remove as que sumiram (vendidas/resgatadas)
        private async Task SyncInvestmentsAsync(
            BankConnection connection,
            IList<PluggyModel.Investment> pluggyInvestments,
            SyncResultResponse result,
            CancellationToken cancellationToken)
        {
            var existing = connection.Investments.ToDictionary(i => i.PluggyInvestmentId);

            foreach (var pluggyInvestment in pluggyInvestments)
            {
                if (!existing.Remove(pluggyInvestment.Id, out var investment))
                {
                    investment = new BankInvestment { BankConnectionId = connection.Id };
                    await _investmentRepository.AddAsync(investment, cancellationToken);
                }

                PluggyMapper.Apply(pluggyInvestment, investment);
                result.InvestmentsSynced++;
            }

            _investmentRepository.RemoveRange(existing.Values);
            result.InvestmentsRemoved = existing.Count;
        }
    }
}
