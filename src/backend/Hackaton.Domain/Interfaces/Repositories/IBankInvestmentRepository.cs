using Hackaton.Domain.Entities;

namespace Hackaton.Domain.Interfaces.Repositories
{
    public interface IBankInvestmentRepository
    {
        Task<List<BankInvestment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken);
        // Posicoes das carteiras do assessor que estao vinculadas a algum cliente (com a conexao carregada)
        Task<List<BankInvestment>> GetLinkedToClientsAsync(Guid userId, CancellationToken cancellationToken);
        Task<List<BankInvestment>> GetByClientIdAsync(Guid userId, Guid clientId, CancellationToken cancellationToken);

        // Soma das posicoes (saldo liquido, ou bruto quando nao houver) por cliente, so dos clientes com carteira vinculada
        Task<Dictionary<Guid, decimal>> GetTotalsByClientIdsAsync(
            Guid userId, IReadOnlyCollection<Guid> clientIds, CancellationToken cancellationToken);
        Task AddAsync(BankInvestment investment, CancellationToken cancellationToken);
        void RemoveRange(IEnumerable<BankInvestment> investments);
    }
}
