using Hackaton.Data.Data;
using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data.Repositories
{
    public class ClientRepository : IClientRepository
    {
        private readonly ApplicationDbContext _context;

        public ClientRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<List<Client>> ListByAdvisorAsync(Guid advisorId, string? search, string? profile, bool onlyWithAlerts, CancellationToken cancellationToken)
        {
            var query = _context.Clients.AsNoTracking().Where(client => client.AdvisorId == advisorId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var normalizedSearch = search.Trim().ToLower();
                query = query.Where(client => client.Name.ToLower().Contains(normalizedSearch));
            }

            if (!string.IsNullOrWhiteSpace(profile) && profile != "Todos")
                query = query.Where(client => client.Profile == profile);

            if (onlyWithAlerts)
                query = query.Where(client => client.AlertCount > 0);

            return query.OrderBy(client => client.Name).ToListAsync(cancellationToken);
        }

        public Task<Client?> GetByIdAsync(Guid id, Guid advisorId, CancellationToken cancellationToken) =>
            _context.Clients.AsNoTracking()
                .FirstOrDefaultAsync(client => client.Id == id && client.AdvisorId == advisorId, cancellationToken);

        public Task<Client?> GetByIdForUpdateAsync(Guid id, Guid advisorId, CancellationToken cancellationToken) =>
            _context.Clients.FirstOrDefaultAsync(client => client.Id == id && client.AdvisorId == advisorId, cancellationToken);

        public async Task AddAsync(Client client, CancellationToken cancellationToken) =>
            await _context.Clients.AddAsync(client, cancellationToken);

        public void Remove(Client client) => _context.Clients.Remove(client);

        public Task SaveChangesAsync(CancellationToken cancellationToken) =>
            _context.SaveChangesAsync(cancellationToken);
    }
}