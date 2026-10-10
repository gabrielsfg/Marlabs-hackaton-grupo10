using Hackaton.Domain.Common;

namespace Hackaton.Domain.Entities
{
    // Uma posicao de investimento (acao, ETF, CDB, fundo...) de uma conexao, como a Pluggy reportou no ultimo sync
    public class BankInvestment : BaseEntity
    {
        public Guid BankConnectionId { get; set; }
        public BankConnection? BankConnection { get; set; }

        public Guid PluggyInvestmentId { get; set; }
        public string Name { get; set; } = string.Empty;

        // Ticker (ex: PETR4) para renda variavel
        public string? Code { get; set; }
        public string? Isin { get; set; }

        // Valores vindos da Pluggy: Type = EQUITY | ETF | FIXED_INCOME | MUTUAL_FUND | SECURITY | COE | OTHER
        public string Type { get; set; } = string.Empty;
        public string? Subtype { get; set; }
        public string Status { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = string.Empty;

        public decimal? Quantity { get; set; }

        // Cotacao/valor unitario
        public decimal? UnitValue { get; set; }

        // Valor bruto da posicao (quantidade x cotacao)
        public decimal? Amount { get; set; }

        // Saldo liquido (descontados impostos/taxas)
        public decimal? Balance { get; set; }
        public decimal? AmountOriginal { get; set; }
        public decimal? AmountProfit { get; set; }

        public DateTime Date { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Issuer { get; set; }
    }
}
