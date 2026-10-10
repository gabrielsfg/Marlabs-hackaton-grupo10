namespace Hackaton.Shared.Dtos.Request
{
    public class UpdateReminderRequest
    {
        public string Title { get; set; } = string.Empty;
        public DateOnly DueDate { get; set; }
        public Guid? ClientId { get; set; }
        public bool IsCompleted { get; set; }
    }
}
