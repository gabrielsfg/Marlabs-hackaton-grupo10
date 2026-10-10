namespace Hackaton.Shared.Helpers
{
    public static class DigitsHelper
    {
        public static string OnlyDigits(string? value) =>
            string.IsNullOrEmpty(value) ? string.Empty : new string(value.Where(char.IsAsciiDigit).ToArray());
    }
}
