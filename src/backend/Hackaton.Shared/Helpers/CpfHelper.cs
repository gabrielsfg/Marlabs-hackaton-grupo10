namespace Hackaton.Shared.Helpers
{
    public static class CpfHelper
    {
        // Aceita com ou sem mascara; confere os dois digitos verificadores
        public static bool IsValid(string? cpf)
        {
            var digits = DigitsHelper.OnlyDigits(cpf);
            if (digits.Length != 11 || digits.Distinct().Count() == 1)
                return false;

            return digits[9] - '0' == CalculateCheckDigit(digits, 9)
                && digits[10] - '0' == CalculateCheckDigit(digits, 10);
        }

        private static int CalculateCheckDigit(string digits, int length)
        {
            var sum = 0;
            for (var i = 0; i < length; i++)
                sum += (digits[i] - '0') * (length + 1 - i);

            var remainder = sum % 11;
            return remainder < 2 ? 0 : 11 - remainder;
        }
    }
}
