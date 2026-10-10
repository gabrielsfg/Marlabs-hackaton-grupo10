using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Services.Services.Errors;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;
using Mapster;

namespace Hackaton.Services.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<Result<UserResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByIdAsync(id, cancellationToken);
            if (user is null)
                return UserErrors.NotFound;

            return user.Adapt<UserResponse>();
        }
    }
}
