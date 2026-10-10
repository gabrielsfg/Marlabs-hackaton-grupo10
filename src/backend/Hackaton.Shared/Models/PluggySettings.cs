namespace Hackaton.Shared.Models
{
    public class PluggySettings
    {
        public const string SectionName = "Pluggy";

        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
    }
}
