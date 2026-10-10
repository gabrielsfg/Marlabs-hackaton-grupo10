using Hackaton.Domain.Common;
using Hackaton.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Hackaton.Data.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Client> Clients => Set<Client>();
        public DbSet<BankConnection> BankConnections => Set<BankConnection>();
        public DbSet<BankInvestment> BankInvestments => Set<BankInvestment>();

        public override int SaveChanges()
        {
            UpdateOrCreateEntity();
            return base.SaveChanges();
        }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            UpdateOrCreateEntity();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void UpdateOrCreateEntity()
        {
            var entries = ChangeTracker.Entries<BaseEntity>();

            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Added)
                    entry.Property(e => e.CreatedAt).CurrentValue = DateTime.UtcNow;
                else if (entry.State == EntityState.Modified)
                    entry.Property(e => e.UpdatedAt).CurrentValue = DateTime.UtcNow;
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
        }
    }
}
