using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Hackaton.Tests.Helpers
{
    // Key fixa de teste para nao depender do user-secrets de quem roda os testes
    public class ApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Jwt:Key", "chave-de-teste-com-pelo-menos-32-caracteres");
        }
    }
}
