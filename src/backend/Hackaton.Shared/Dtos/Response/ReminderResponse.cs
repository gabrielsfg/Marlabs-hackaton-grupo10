namespace Hackaton.Shared.Dtos.Response
{
    public class ReminderResponse
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateOnly DueDate { get; set; }
        public Guid? ClientId { get; set; }
        public string? ClientName { get; set; }
        public bool IsCompleted { get; set; }
    }
}
