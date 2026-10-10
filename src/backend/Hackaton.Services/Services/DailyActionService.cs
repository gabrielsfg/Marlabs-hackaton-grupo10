using System.Globalization;
using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Services.Services
{
    // Gera os cards de "Acoes do dia" a partir das carteiras (Pluggy) vinculadas aos clientes do assessor
    public class DailyActionService : IDailyActionService
    {
        private const decimal FgcLimit = 250_000m;
        private const int MaturityWindowDays = 90;

        // Produtos cobertos pelo FGC (mesma lista usada no perfil do cliente)
        private static readonly HashSet<string> FgcSubtypes = ["CDB", "LCI", "LCA", "LC", "LIG"];
        private static readonly CultureInfo PtBr = CultureInfo.GetCultureInfo("pt-BR");

        // "Hoje" no horario de Brasilia: em UTC, depois das 21h ja seria o dia seguinte
        private static readonly TimeZoneInfo Brasilia = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

        private readonly IBankInvestmentRepository _investmentRepository;
        private readonly IClientRepository _clientRepository;
        private readonly TimeProvider _timeProvider;

        public DailyActionService(
            IBankInvestmentRepository investmentRepository,
            IClientRepository clientRepository,
            TimeProvider timeProvider)
        {
            _investmentRepository = investmentRepository;
            _clientRepository = clientRepository;
            _timeProvider = timeProvider;
        }

        public async Task<Result<List<DailyActionResponse>>> GetAsync(Guid advisorId, CancellationToken cancellationToken)
        {
            var investments = await _investmentRepository.GetLinkedToClientsAsync(advisorId, cancellationToken);
            if (investments.Count == 0)
                return new List<DailyActionResponse>();

            // So clientes do proprio assessor (a carteira pode ter sido vinculada antes de o cliente mudar de dono)
            var clientNames = (await _clientRepository.ListByAdvisorAsync(advisorId, null, null, false, cancellationToken))
                .ToDictionary(c => c.Id, c => c.Name);

            var positions = investments
                .Where(i => clientNames.ContainsKey(i.BankConnection!.ClientId!.Value))
                .ToList();

            return GetFgcActions(positions, clientNames)
                .Concat(GetMaturityActions(positions, clientNames))
                .OrderBy(a => PriorityOrder(a.Priority))
                .ToList();
        }

        private static IEnumerable<DailyActionResponse> GetFgcActions(
            List<BankInvestment> positions, Dictionary<Guid, string> clientNames) =>
            positions
                .Where(i => i.Subtype is not null && FgcSubtypes.Contains(i.Subtype))
                .GroupBy(i => (ClientId: i.BankConnection!.ClientId!.Value, Issuer: IssuerOf(i)))
                .Select(g => (g.Key.ClientId, g.Key.Issuer, Total: g.Sum(PositionValue)))
                .Where(g => g.Total > FgcLimit)
                .Select(g =>
                {
                    var excess = g.Total - FgcLimit;
                    return new DailyActionResponse
                    {
                        Type = "FGC",
                        Priority = excess > FgcLimit * 0.2m ? "Alta" : "Média",
                        ClientId = g.ClientId,
                        ClientName = clientNames[g.ClientId],
                        Description = $"{Brl(g.Total)} em investimentos do {g.Issuer}, {Brl(excess)} acima do limite de {Brl(FgcLimit)} do FGC.",
                        SuggestedAction = "Diversificar o excedente em outro emissor.",
                        HighlightValue = excess,
                        Label = "Acima do limite"
                    };
                });

        private IEnumerable<DailyActionResponse> GetMaturityActions(
            List<BankInvestment> positions, Dictionary<Guid, string> clientNames)
        {
            var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_timeProvider.GetUtcNow(), Brasilia).DateTime);

            foreach (var investment in positions.Where(i => i.DueDate.HasValue))
            {
                var dueDate = DateOnly.FromDateTime(investment.DueDate!.Value);
                var days = dueDate.DayNumber - today.DayNumber;
                if (days < 0 || days > MaturityWindowDays)
                    continue;

                var clientId = investment.BankConnection!.ClientId!.Value;
                var dueText = days == 0 ? "vence hoje" : $"vence em {days} dia{(days == 1 ? "" : "s")}";
                yield return new DailyActionResponse
                {
                    Type = "Vencimento",
                    Priority = days <= 7 ? "Alta" : days <= 30 ? "Média" : "Baixa",
                    ClientId = clientId,
                    ClientName = clientNames[clientId],
                    Description = $"{investment.Name} {dueText} ({Brl(PositionValue(investment))}).",
                    SuggestedAction = "Entrar em contato para discutir o reinvestimento.",
                    HighlightValue = PositionValue(investment),
                    Label = "Valor que vence",
                    DaysUntilDue = days,
                    DueDate = dueDate
                };
            }
        }

        // Mesmo criterio do perfil do cliente: saldo liquido, ou bruto quando nao houver
        private static decimal PositionValue(BankInvestment investment) => investment.Balance ?? investment.Amount ?? 0;

        private static string IssuerOf(BankInvestment investment) =>
            investment.Issuer ?? investment.BankConnection?.InstitutionName ?? "Emissor desconhecido";

        private static string Brl(decimal value) => value.ToString("C0", PtBr);

        private static int PriorityOrder(string priority) => priority switch
        {
            "Alta" => 0,
            "Média" => 1,
            _ => 2
        };
    }
}
