using Hackaton.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hackaton.Data.Mappings
{
    public class BankConnectionMapping : IEntityTypeConfiguration<BankConnection>
    {
        public void Configure(EntityTypeBuilder<BankConnection> builder)
        {
            builder.ToTable("BankConnections");

            builder.Property(c => c.ConnectorName).IsRequired().HasMaxLength(150);
            builder.Property(c => c.InstitutionName).HasMaxLength(150);
            builder.Property(c => c.Status).IsRequired().HasMaxLength(50);

            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Excluir o cliente so desvincula a carteira; os investimentos continuam com o assessor
            builder.HasOne<Client>()
                .WithMany()
                .HasForeignKey(c => c.ClientId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasMany(c => c.Investments)
                .WithOne(i => i.BankConnection)
                .HasForeignKey(i => i.BankConnectionId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasIndex(c => new { c.UserId, c.PluggyItemId }).IsUnique();
            builder.HasIndex(c => c.ClientId);
        }
    }
}
