using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface IUserService
    {
        Task<Result<UserResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    }
}
