using Hackaton.Domain.Entities;

namespace Hackaton.Domain.Interfaces.Repositories
{
    public interface IBankConnectionRepository
    {
        Task<List<BankConnection>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken);

        // Rastreado e com os investimentos carregados, para o sync atualizar no lugar
        Task<BankConnection?> GetForSyncAsync(Guid id, Guid userId, CancellationToken cancellationToken);
        Task<bool> ExistsAsync(Guid userId, Guid pluggyItemId, CancellationToken cancellationToken);
        Task AddAsync(BankConnection connection, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
