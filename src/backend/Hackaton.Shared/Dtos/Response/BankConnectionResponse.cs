namespace Hackaton.Shared.Dtos.Response
{
    public class BankConnectionResponse
    {
        public Guid Id { get; set; }
        public Guid PluggyItemId { get; set; }
        public string ConnectorName { get; set; } = string.Empty;
        public string? InstitutionName { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? LastSyncedAt { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
