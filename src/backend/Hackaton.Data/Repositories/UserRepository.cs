using Hackaton.Data.Data;
using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
            _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        public Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken) =>
            _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email, cancellationToken);

        public Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken) =>
            _context.Users.AnyAsync(u => u.Email == email, cancellationToken);

        public Task<bool> ExistsByCpfAsync(string cpf, CancellationToken cancellationToken) =>
            _context.Users.AnyAsync(u => u.Cpf == cpf, cancellationToken);

        public async Task AddAsync(User user, CancellationToken cancellationToken) =>
            await _context.Users.AddAsync(user, cancellationToken);

        public Task SaveChangesAsync(CancellationToken cancellationToken) =>
            _context.SaveChangesAsync(cancellationToken);
    }
}
