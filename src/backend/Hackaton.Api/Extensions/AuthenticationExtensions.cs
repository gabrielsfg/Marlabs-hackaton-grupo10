using System.Text;
using Hackaton.Shared.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Hackaton.Api.Extensions
{
    public static class AuthenticationExtensions
    {
        // Key minima de 32 bytes exigida pelo HMAC-SHA256
        private const int MinimumKeyLength = 32;

        public static IServiceCollection AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            // Lido sob demanda (e nao no startup) para os testes conseguirem injetar a Key pelo WebApplicationFactory
            services.AddSingleton(_ => GetJwtSettings(configuration));

            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();

            services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
                .Configure<JwtSettings>((options, jwtSettings) =>
                {
                    // Mantem o "sub" como "sub" em vez de converter para o ClaimTypes.NameIdentifier
                    options.MapInboundClaims = false;
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = jwtSettings.Issuer,
                        ValidateAudience = true,
                        ValidAudience = jwtSettings.Audience,
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.FromMinutes(1),
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key))
                    };
                });

            services.AddAuthorization();

            return services;
        }

        private static JwtSettings GetJwtSettings(IConfiguration configuration)
        {
            var jwtSettings = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();

            if (Encoding.UTF8.GetByteCount(jwtSettings.Key) < MinimumKeyLength)
                throw new InvalidOperationException(
                    $"Jwt:Key ausente ou com menos de {MinimumKeyLength} caracteres. Configure via dotnet user-secrets (ver README).");

            return jwtSettings;
        }
    }
}
