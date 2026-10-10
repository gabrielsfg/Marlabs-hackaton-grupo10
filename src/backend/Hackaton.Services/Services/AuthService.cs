using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Services.Services.Errors;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Helpers;
using Hackaton.Shared.Models;
using Mapster;

namespace Hackaton.Services.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IPasswordHasher _passwordHasher;
        private readonly ITokenService _tokenService;

        public AuthService(IUserRepository userRepository, IPasswordHasher passwordHasher, ITokenService tokenService)
        {
            _userRepository = userRepository;
            _passwordHasher = passwordHasher;
            _tokenService = tokenService;
        }

        public async Task<Result<AuthResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken)
        {
            var email = NormalizeEmail(request.Email);
            var cpf = DigitsHelper.OnlyDigits(request.Cpf);

            if (await _userRepository.ExistsByEmailAsync(email, cancellationToken))
                return UserErrors.EmailAlreadyExists;

            if (await _userRepository.ExistsByCpfAsync(cpf, cancellationToken))
                return UserErrors.CpfAlreadyExists;

            var user = request.Adapt<User>();
            user.Name = request.Name.Trim();
            user.Email = email;
            user.Cpf = cpf;
            user.Phone = DigitsHelper.OnlyDigits(request.Phone);
            user.PasswordHash = _passwordHasher.Hash(request.Password);

            await _userRepository.AddAsync(user, cancellationToken);
            await _userRepository.SaveChangesAsync(cancellationToken);

            return _tokenService.Generate(user.Adapt<UserResponse>());
        }

        public async Task<Result<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByEmailAsync(NormalizeEmail(request.Email), cancellationToken);
            if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
                return AuthErrors.InvalidCredentials;

            return _tokenService.Generate(user.Adapt<UserResponse>());
        }

        private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
    }
}
