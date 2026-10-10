using Hackaton.Data.Data;
using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data.Repositories
{
    public class BankInvestmentRepository : IBankInvestmentRepository
    {
        private readonly ApplicationDbContext _context;

        public BankInvestmentRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<List<BankInvestment>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken) =>
            _context.BankInvestments.AsNoTracking()
                .Include(i => i.BankConnection)
                .Where(i => i.BankConnection!.UserId == userId)
                .OrderByDescending(i => i.Balance)
                .ToListAsync(cancellationToken);

        // Add explicito: o Id (UUID v7) ja vem preenchido, entao o EF trataria como existente se fosse so pela navegacao
        public async Task AddAsync(BankInvestment investment, CancellationToken cancellationToken) =>
            await _context.BankInvestments.AddAsync(investment, cancellationToken);

        public void RemoveRange(IEnumerable<BankInvestment> investments) =>
            _context.BankInvestments.RemoveRange(investments);
    }
}
