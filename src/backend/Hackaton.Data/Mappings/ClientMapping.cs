using Hackaton.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hackaton.Data.Mappings
{
    public class ClientMapping : IEntityTypeConfiguration<Client>
    {
        public void Configure(EntityTypeBuilder<Client> builder)
        {
            builder.ToTable("Clients");

            builder.Property(client => client.Name).IsRequired().HasMaxLength(150);
            builder.Property(client => client.Profile).IsRequired().HasMaxLength(30);
            builder.Property(client => client.Cpf).IsRequired().HasMaxLength(20);
            builder.Property(client => client.Email).IsRequired().HasMaxLength(150);
            builder.Property(client => client.FinancialAssets).HasPrecision(18, 2);
            builder.Property(client => client.PhysicalAssets).HasPrecision(18, 2);
            builder.Property(client => client.OutsideInstitutionPercentage).HasPrecision(5, 2);
            builder.Property(client => client.NextDate).HasMaxLength(150);

            builder.HasIndex(client => client.AdvisorId);
            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(client => client.AdvisorId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}