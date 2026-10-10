using Hackaton.Domain.Entities;

namespace Hackaton.Domain.Interfaces.Repositories
{
    public interface IReminderRepository
    {
        Task<List<Reminder>> ListByAdvisorAsync(Guid advisorId, CancellationToken cancellationToken);
        Task<Reminder?> GetByIdAsync(Guid id, Guid advisorId, CancellationToken cancellationToken);
        Task<Reminder?> GetByIdForUpdateAsync(Guid id, Guid advisorId, CancellationToken cancellationToken);
        Task AddAsync(Reminder reminder, CancellationToken cancellationToken);
        void Remove(Reminder reminder);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
