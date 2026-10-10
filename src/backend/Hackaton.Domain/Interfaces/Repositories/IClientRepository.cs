using Hackaton.Domain.Entities;

namespace Hackaton.Domain.Interfaces.Repositories
{
    public interface IClientRepository
    {
        Task<List<Client>> ListByAdvisorAsync(Guid advisorId, string? search, string? profile, bool onlyWithAlerts, CancellationToken cancellationToken);
        Task<Client?> GetByIdAsync(Guid id, Guid advisorId, CancellationToken cancellationToken);
        Task<Client?> GetByIdForUpdateAsync(Guid id, Guid advisorId, CancellationToken cancellationToken);
        Task AddAsync(Client client, CancellationToken cancellationToken);
        void Remove(Client client);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}