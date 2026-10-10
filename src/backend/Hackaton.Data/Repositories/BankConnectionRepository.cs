using Hackaton.Data.Data;
using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data.Repositories
{
    public class BankConnectionRepository : IBankConnectionRepository
    {
        private readonly ApplicationDbContext _context;

        public BankConnectionRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<List<BankConnection>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken) =>
            _context.BankConnections.AsNoTracking()
                .Where(c => c.UserId == userId)
                .OrderBy(c => c.CreatedAt)
                .ToListAsync(cancellationToken);

        public Task<BankConnection?> GetForSyncAsync(Guid id, Guid userId, CancellationToken cancellationToken) =>
            _context.BankConnections
                .Include(c => c.Investments)
                .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, cancellationToken);

        public Task<bool> ExistsAsync(Guid userId, Guid pluggyItemId, CancellationToken cancellationToken) =>
            _context.BankConnections.AnyAsync(c => c.UserId == userId && c.PluggyItemId == pluggyItemId, cancellationToken);

        public async Task AddAsync(BankConnection connection, CancellationToken cancellationToken) =>
            await _context.BankConnections.AddAsync(connection, cancellationToken);

        public Task SaveChangesAsync(CancellationToken cancellationToken) =>
            _context.SaveChangesAsync(cancellationToken);
    }
}
