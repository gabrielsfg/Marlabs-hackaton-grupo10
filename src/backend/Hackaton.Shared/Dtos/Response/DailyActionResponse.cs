namespace Hackaton.Shared.Dtos.Response
{
    // Card de "Acoes do dia" do Dashboard, calculado a partir das carteiras vinculadas aos clientes do assessor
    public class DailyActionResponse
    {
        // FGC | Vencimento
        public string Type { get; set; } = string.Empty;

        // Alta | Média | Baixa
        public string Priority { get; set; } = string.Empty;
        public Guid ClientId { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string SuggestedAction { get; set; } = string.Empty;
        public decimal? HighlightValue { get; set; }
        public string? Label { get; set; }

        // So para vencimentos
        public int? DaysUntilDue { get; set; }
        public DateOnly? DueDate { get; set; }
    }
}
