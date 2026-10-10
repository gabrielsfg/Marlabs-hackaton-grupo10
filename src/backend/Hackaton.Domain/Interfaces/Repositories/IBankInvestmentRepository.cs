using Hackaton.Domain.Entities;

namespace Hackaton.Domain.Interfaces.Repositories
{
    public interface IBankInvestmentRepository
    {
        Task<List<BankInvestment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken);
        Task AddAsync(BankInvestment investment, CancellationToken cancellationToken);
        void RemoveRange(IEnumerable<BankInvestment> investments);
    }
}
