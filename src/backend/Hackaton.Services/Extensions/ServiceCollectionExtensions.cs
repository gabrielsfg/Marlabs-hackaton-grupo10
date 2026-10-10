using FluentValidation;
using Hackaton.Data.Repositories;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Services.Helpers;
using Hackaton.Services.Pluggy;
using Hackaton.Services.Services;
using Mapster;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Hackaton.Services.Extensions
{
    public static class ServiceCollectionExtensions
    {
        // Ponto unico de registro de DI: todo repository e service novo e registrado aqui
        public static IServiceCollection AddApplicationServices(this IServiceCollection services)
        {
            var assembly = typeof(ServiceCollectionExtensions).Assembly;

            services.AddValidatorsFromAssembly(assembly);

            // Carrega os IRegister de Services/MapsterConfigs (configuracoes customizadas do Mapster)
            TypeAdapterConfig.GlobalSettings.Scan(assembly);

            services.AddScoped<IUserRepository, UserRepository>();
            services.AddScoped<IClientRepository, ClientRepository>();
            services.AddScoped<IBankConnectionRepository, BankConnectionRepository>();
            services.AddScoped<IBankInvestmentRepository, BankInvestmentRepository>();
            services.AddScoped<IReminderRepository, ReminderRepository>();

            // Pluggy: o PluggySettings e registrado pela Api (lido do user-secrets)
            services.TryAddSingleton(TimeProvider.System);
            services.AddSingleton<PluggyClientProvider>();
            services.AddSingleton<IPluggyGateway, PluggyGateway>();

            services.AddSingleton<IPasswordHasher, PasswordHasher>();
            services.AddSingleton<ITokenService, TokenService>();
            services.AddScoped<IAuthService, AuthService>();
            services.AddScoped<IUserService, UserService>();
            services.AddScoped<IClientService, ClientService>();
            services.AddScoped<IBankConnectionService, BankConnectionService>();
            services.AddScoped<IBankInvestmentService, BankInvestmentService>();
            services.AddScoped<IReminderService, ReminderService>();
            services.AddScoped<IDailyActionService, DailyActionService>();

            return services;
        }
    }
}
