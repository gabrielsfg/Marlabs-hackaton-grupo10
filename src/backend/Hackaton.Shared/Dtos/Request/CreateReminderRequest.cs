namespace Hackaton.Shared.Dtos.Request
{
    public class CreateReminderRequest
    {
        public string Title { get; set; } = string.Empty;
        public DateOnly DueDate { get; set; }
        public Guid? ClientId { get; set; }
    }
}
