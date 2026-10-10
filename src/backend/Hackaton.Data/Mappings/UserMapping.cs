using Hackaton.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hackaton.Data.Mappings
{
    public class UserMapping : IEntityTypeConfiguration<User>
    {
        public void Configure(EntityTypeBuilder<User> builder)
        {
            builder.ToTable("Users");

            builder.Property(u => u.Name).IsRequired().HasMaxLength(150);
            builder.Property(u => u.Email).IsRequired().HasMaxLength(150);
            builder.Property(u => u.Cpf).IsRequired().HasMaxLength(11);
            builder.Property(u => u.Phone).IsRequired().HasMaxLength(20);
            builder.Property(u => u.PasswordHash).IsRequired().HasMaxLength(256);

            builder.HasIndex(u => u.Email).IsUnique();
            builder.HasIndex(u => u.Cpf).IsUnique();
        }
    }
}
