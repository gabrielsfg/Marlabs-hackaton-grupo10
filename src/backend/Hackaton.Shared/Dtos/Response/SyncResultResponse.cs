namespace Hackaton.Shared.Dtos.Response
{
    public class SyncResultResponse
    {
        public Guid BankConnectionId { get; set; }
        public int InvestmentsSynced { get; set; }
        public int InvestmentsRemoved { get; set; }
        public DateTime SyncedAt { get; set; }
    }
}
