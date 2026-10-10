using Hackaton.Domain.Common;

namespace Hackaton.Domain.Entities
{
    public class Reminder : BaseEntity
    {
        public Guid AdvisorId { get; set; }
        public Guid? ClientId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateOnly DueDate { get; set; }
        public bool IsCompleted { get; set; }
        public Client? Client { get; set; }
    }
}
