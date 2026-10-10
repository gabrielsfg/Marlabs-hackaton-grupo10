using Hackaton.Shared.Dtos.Response;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface ITokenService
    {
        AuthResponse Generate(UserResponse user);
    }
}
