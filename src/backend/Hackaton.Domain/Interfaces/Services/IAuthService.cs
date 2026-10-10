using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface IAuthService
    {
        Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken);
        Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
    }
}
