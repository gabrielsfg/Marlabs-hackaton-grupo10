using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;
using Mapster;

namespace Hackaton.Services.Services
{
    public class ClientService : IClientService
    {
        private readonly IClientRepository _clientRepository;
        private readonly IBankInvestmentRepository _investmentRepository;

        public ClientService(IClientRepository clientRepository, IBankInvestmentRepository investmentRepository)
        {
            _clientRepository = clientRepository;
            _investmentRepository = investmentRepository;
        }

        public async Task<Result<List<ClientResponse>>> ListAsync(Guid advisorId, string? search, string? profile, bool onlyWithAlerts, CancellationToken cancellationToken)
        {
            var clients = await _clientRepository.ListByAdvisorAsync(advisorId, search, profile, onlyWithAlerts, cancellationToken);
            var responses = clients.Adapt<List<ClientResponse>>();
            await ApplyLinkedInvestmentsAsync(advisorId, responses, cancellationToken);
            return responses;
        }

        public async Task<Result<ClientResponse>> GetByIdAsync(Guid advisorId, Guid id, CancellationToken cancellationToken)
        {
            var client = await _clientRepository.GetByIdAsync(id, advisorId, cancellationToken);
            if (client is null)
                return Error.NotFound("Client.NotFound", "Cliente nao encontrado");

            var response = client.Adapt<ClientResponse>();
            await ApplyLinkedInvestmentsAsync(advisorId, [response], cancellationToken);
            return response;
        }

        public async Task<Result<ClientResponse>> CreateAsync(Guid advisorId, CreateClientRequest request, CancellationToken cancellationToken)
        {
            var client = request.Adapt<Client>();
            client.AdvisorId = advisorId;

            await _clientRepository.AddAsync(client, cancellationToken);
            await _clientRepository.SaveChangesAsync(cancellationToken);

            return client.Adapt<ClientResponse>();
        }

        public async Task<Result<ClientResponse>> UpdateAsync(Guid advisorId, Guid id, UpdateClientRequest request, CancellationToken cancellationToken)
        {
            var client = await _clientRepository.GetByIdForUpdateAsync(id, advisorId, cancellationToken);
            if (client is null)
                return Error.NotFound("Client.NotFound", "Cliente nao encontrado");

            client.Name = request.Name;
            client.Profile = request.Profile;
            client.Cpf = request.Cpf;
            client.Email = request.Email;

            await _clientRepository.SaveChangesAsync(cancellationToken);

            return client.Adapt<ClientResponse>();
        }

        // Com carteira vinculada, o patrimonio financeiro vem da soma das posicoes; sem carteira, fica o valor cadastrado
        private async Task ApplyLinkedInvestmentsAsync(Guid advisorId, List<ClientResponse> clients, CancellationToken cancellationToken)
        {
            if (clients.Count == 0)
                return;

            var totals = await _investmentRepository.GetTotalsByClientIdsAsync(
                advisorId, clients.Select(c => c.Id).ToList(), cancellationToken);

            foreach (var client in clients)
            {
                if (totals.TryGetValue(client.Id, out var total))
                    client.FinancialAssets = total;
            }
        }

        public async Task<Result> DeleteAsync(Guid advisorId, Guid id, CancellationToken cancellationToken)
        {
            var client = await _clientRepository.GetByIdForUpdateAsync(id, advisorId, cancellationToken);
            if (client is null)
                return Error.NotFound("Client.NotFound", "Cliente nao encontrado");

            _clientRepository.Remove(client);
            await _clientRepository.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }
    }
}