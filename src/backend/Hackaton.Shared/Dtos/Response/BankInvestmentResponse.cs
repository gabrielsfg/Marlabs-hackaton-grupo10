namespace Hackaton.Shared.Dtos.Response
{
    public class BankInvestmentResponse
    {
        public Guid Id { get; set; }
        public Guid BankConnectionId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Isin { get; set; }
        public string Type { get; set; } = string.Empty;
        public string? Subtype { get; set; }
        public string Status { get; set; } = string.Empty;
        public string CurrencyCode { get; set; } = string.Empty;
        public decimal? Quantity { get; set; }
        public decimal? UnitValue { get; set; }
        public decimal? Amount { get; set; }
        public decimal? Balance { get; set; }
        public decimal? AmountOriginal { get; set; }
        public decimal? AmountProfit { get; set; }
        public DateTime Date { get; set; }
        public DateTime? DueDate { get; set; }
        public string? Issuer { get; set; }
        // Corretora de origem, vinda da conexao (ex: "XP")
        public string? InstitutionName { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
