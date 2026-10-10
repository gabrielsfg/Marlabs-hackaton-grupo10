using FluentValidation;
using Mapster;
using Microsoft.Extensions.DependencyInjection;

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

            return services;
        }
    }
}
