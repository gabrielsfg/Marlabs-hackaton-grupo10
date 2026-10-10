using Hackaton.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hackaton.Data.Mappings
{
    public class BankInvestmentMapping : IEntityTypeConfiguration<BankInvestment>
    {
        public void Configure(EntityTypeBuilder<BankInvestment> builder)
        {
            builder.ToTable("BankInvestments");

            builder.Property(i => i.Name).IsRequired().HasMaxLength(200);
            builder.Property(i => i.Code).HasMaxLength(50);
            builder.Property(i => i.Isin).HasMaxLength(20);
            builder.Property(i => i.Type).IsRequired().HasMaxLength(30);
            builder.Property(i => i.Subtype).HasMaxLength(30);
            builder.Property(i => i.Status).IsRequired().HasMaxLength(30);
            builder.Property(i => i.CurrencyCode).IsRequired().HasMaxLength(3);
            builder.Property(i => i.Issuer).HasMaxLength(200);

            // Quantidade e cotacao aceitam fracoes (ex: cotas de fundo, ETF fracionado)
            builder.Property(i => i.Quantity).HasPrecision(18, 6);
            builder.Property(i => i.UnitValue).HasPrecision(18, 6);
            builder.Property(i => i.Amount).HasPrecision(18, 2);
            builder.Property(i => i.Balance).HasPrecision(18, 2);
            builder.Property(i => i.AmountOriginal).HasPrecision(18, 2);
            builder.Property(i => i.AmountProfit).HasPrecision(18, 2);

            builder.HasIndex(i => new { i.BankConnectionId, i.PluggyInvestmentId }).IsUnique();
        }
    }
}
