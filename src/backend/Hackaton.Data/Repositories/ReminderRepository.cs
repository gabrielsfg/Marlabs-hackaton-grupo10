using Hackaton.Data.Data;
using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data.Repositories
{
    public class ReminderRepository : IReminderRepository
    {
        private readonly ApplicationDbContext _context;

        public ReminderRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<List<Reminder>> ListByAdvisorAsync(Guid advisorId, CancellationToken cancellationToken) =>
            _context.Reminders
                .AsNoTracking()
                .Include(reminder => reminder.Client)
                .Where(reminder => reminder.AdvisorId == advisorId)
                .OrderBy(reminder => reminder.IsCompleted)
                .ThenBy(reminder => reminder.DueDate)
                .ToListAsync(cancellationToken);

        public Task<Reminder?> GetByIdAsync(Guid id, Guid advisorId, CancellationToken cancellationToken) =>
            _context.Reminders
                .AsNoTracking()
                .Include(reminder => reminder.Client)
                .FirstOrDefaultAsync(reminder => reminder.Id == id && reminder.AdvisorId == advisorId, cancellationToken);

        public Task<Reminder?> GetByIdForUpdateAsync(Guid id, Guid advisorId, CancellationToken cancellationToken) =>
            _context.Reminders
                .FirstOrDefaultAsync(reminder => reminder.Id == id && reminder.AdvisorId == advisorId, cancellationToken);

        public async Task AddAsync(Reminder reminder, CancellationToken cancellationToken) =>
            await _context.Reminders.AddAsync(reminder, cancellationToken);

        public void Remove(Reminder reminder) => _context.Reminders.Remove(reminder);

        public Task SaveChangesAsync(CancellationToken cancellationToken) =>
            _context.SaveChangesAsync(cancellationToken);
    }
}
