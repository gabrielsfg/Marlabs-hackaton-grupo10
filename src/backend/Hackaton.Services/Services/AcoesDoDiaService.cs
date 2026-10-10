using Hackaton.Data.Data;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Services.Services;

public record AcaoDoDiaDto(
    string Tipo,
    string Prioridade,
    Guid ClienteId,
    string ClienteNome,
    string Descricao,
    string AcaoSugerida,
    decimal? ValorDestaque,
    string? Label
);

public class AcoesDoDiaService(ApplicationDbContext db)
{
    // Subtipos cobertos pelo FGC
    private static readonly HashSet<string> SubtiposFgc = new(StringComparer.OrdinalIgnoreCase)
    {
        "CDB", "LCI", "LCA", "LC", "LIG", "POUPANCA", "POUPANÇA"
    };

    private const decimal LimiteFgc = 250_000m;

    public async Task<List<AcaoDoDiaDto>> GetAcoesAsync(Guid advisorId, CancellationToken ct = default)
    {
        var acoes = new List<AcaoDoDiaDto>();

        acoes.AddRange(await GetFgcAcoesAsync(advisorId, ct));
        acoes.AddRange(await GetVencimentoAcoesAsync(advisorId, ct));

        return acoes
            .OrderBy(a => a.Prioridade switch { "Alta" => 0, "Média" => 1, _ => 2 })
            .ToList();
    }

    private async Task<List<AcaoDoDiaDto>> GetFgcAcoesAsync(Guid advisorId, CancellationToken ct)
    {
        // Busca todos os investimentos FGC dos clientes do assessor
        var dados = await db.BankInvestments
            .Where(i =>
                i.BankConnection.Client.AdvisorId == advisorId &&
                i.Subtype != null &&
                SubtiposFgc.Contains(i.Subtype))
            .Select(i => new
            {
                ClienteId = i.BankConnection.ClientId,
                ClienteNome = i.BankConnection.Client.Name,
                Emissor = i.Issuer ?? i.BankConnection.InstitutionName ?? "Emissor desconhecido",
                i.Amount,
            })
            .ToListAsync(ct);

        // Agrupa por cliente + emissor e soma os valores
        var agrupado = dados
            .GroupBy(i => (i.ClienteId, i.ClienteNome, i.Emissor))
            .Select(g => new
            {
                g.Key.ClienteId,
                g.Key.ClienteNome,
                g.Key.Emissor,
                Total = g.Sum(x => x.Amount),
            })
            .Where(g => g.Total > LimiteFgc)
            .ToList();

        return agrupado.Select(g =>
        {
            var excedente = g.Total - LimiteFgc;
            var prioridade = excedente > LimiteFgc * 0.2m ? "Alta" : "Média";

            return new AcaoDoDiaDto(
                Tipo: "FGC",
                Prioridade: prioridade,
                ClienteId: g.ClienteId,
                ClienteNome: g.ClienteNome,
                Descricao: $"R$ {g.Total:N0} em investimentos do {g.Emissor}, R$ {excedente:N0} acima do limite de R$ {LimiteFgc:N0} do FGC.",
                AcaoSugerida: "Diversificar o excedente em outro emissor.",
                ValorDestaque: excedente,
                Label: "Acima do limite"
            );
        }).ToList();
    }

    private async Task<List<AcaoDoDiaDto>> GetVencimentoAcoesAsync(Guid advisorId, CancellationToken ct)
    {
        var hoje = DateTime.UtcNow.Date;
        var limite = hoje.AddDays(90);

        var vencimentos = await db.BankInvestments
            .Where(i =>
                i.BankConnection.Client.AdvisorId == advisorId &&
                i.DueDate.HasValue &&
                i.DueDate.Value.Date >= hoje &&
                i.DueDate.Value.Date <= limite)
            .Select(i => new
            {
                ClienteId = i.BankConnection.ClientId,
                ClienteNome = i.BankConnection.Client.Name,
                i.Name,
                i.Amount,
                DueDate = i.DueDate!.Value,
            })
            .ToListAsync(ct);

        return vencimentos.Select(v =>
        {
            var dias = (v.DueDate.Date - hoje).Days;
            var prioridade = dias <= 7 ? "Alta" : dias <= 30 ? "Média" : "Baixa";
            var label = dias == 0 ? "Vence hoje" : $"Vence em {dias} dia{(dias == 1 ? "" : "s")}";

            return new AcaoDoDiaDto(
                Tipo: "Vencimento",
                Prioridade: prioridade,
                ClienteId: v.ClienteId,
                ClienteNome: v.ClienteNome,
                Descricao: $"{v.Name} vence em {dias} dia{(dias == 1 ? "" : "s")} (R$ {v.Amount:N0}).",
                AcaoSugerida: "Entrar em contato para discutir o reinvestimento.",
                ValorDestaque: v.Amount,
                Label: label
            );
        }).ToList();
    }
}