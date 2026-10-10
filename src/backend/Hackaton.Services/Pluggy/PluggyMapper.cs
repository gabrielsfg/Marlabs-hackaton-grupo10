using Hackaton.Domain.Entities;
using PluggyModel = Pluggy.SDK.Model;

namespace Hackaton.Services.Pluggy
{
    // Copia os dados da Pluggy para as entidades; usado tanto para criar quanto para atualizar no sync
    public static class PluggyMapper
    {
        public static void Apply(PluggyModel.Investment source, BankInvestment target)
        {
            target.PluggyInvestmentId = source.Id;
            target.Name = Truncate(source.Name, 200) ?? string.Empty;
            target.Code = Truncate(source.Code, 50);
            target.Isin = Truncate(source.ISIN, 20);
            target.Type = source.Type.ToString();
            target.Subtype = source.Subtype?.ToString();
            target.Status = source.Status.ToString();
            target.CurrencyCode = source.CurrencyCode.ToString();
            target.Quantity = ToDecimal(source.Quantity);
            target.UnitValue = ToDecimal(source.Value);
            target.Amount = ToDecimal(source.Amount);
            target.Balance = ToDecimal(source.Balance);
            target.AmountOriginal = ToDecimal(source.AmountOriginal);
            target.AmountProfit = ToDecimal(source.AmountProfit);
            target.Date = ToUtc(source.Date);
            target.DueDate = ToUtc(source.DueDate);
            target.Issuer = Truncate(source.Issuer, 200);
        }

        // Limites iguais aos das Mappings: um texto maior derrubaria o sync inteiro no SaveChanges
        private static string? Truncate(string? value, int maxLength) =>
            value is null || value.Length <= maxLength ? value : value[..maxLength];

        private static decimal? ToDecimal(double? value) => value is null ? null : (decimal)value.Value;

        private static DateTime? ToUtc(DateTime? value) => value is null ? null : ToUtc(value.Value);

        // O Npgsql so grava "timestamp with time zone" com Kind = Utc
        private static DateTime ToUtc(DateTime value) => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }
}
