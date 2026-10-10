using Hackaton.Shared.Models;

namespace Hackaton.Api.Extensions
{
    public static class PluggyExtensions
    {
        public static IServiceCollection AddPluggySettings(this IServiceCollection services, IConfiguration configuration)
        {
            // Lido sob demanda: a API sobe sem as credenciais e so falha quando alguem chama um endpoint da Pluggy
            services.AddSingleton(_ => GetPluggySettings(configuration));
            return services;
        }

        private static PluggySettings GetPluggySettings(IConfiguration configuration)
        {
            var settings = configuration.GetSection(PluggySettings.SectionName).Get<PluggySettings>() ?? new PluggySettings();

            if (string.IsNullOrWhiteSpace(settings.ClientId) || string.IsNullOrWhiteSpace(settings.ClientSecret))
                throw new InvalidOperationException(
                    "Pluggy:ClientId e Pluggy:ClientSecret ausentes. Configure via dotnet user-secrets (ver README).");

            return settings;
        }
    }
}
