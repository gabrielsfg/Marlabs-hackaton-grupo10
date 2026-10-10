using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Services.Services;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Enums;
using Moq;

namespace Hackaton.Tests.Unit.Services
{
    public class AuthServiceTests
    {
        private readonly Mock<IUserRepository> _userRepository = new();
        private readonly Mock<IPasswordHasher> _passwordHasher = new();
        private readonly Mock<ITokenService> _tokenService = new();
        private readonly AuthService _authService;

        public AuthServiceTests()
        {
            _tokenService
                .Setup(t => t.Generate(It.IsAny<UserResponse>()))
                .Returns((UserResponse user) => new AuthResponse { AccessToken = "token", User = user });

            _authService = new AuthService(_userRepository.Object, _passwordHasher.Object, _tokenService.Object);
        }

        private static RegisterRequest CreateRegisterRequest() => new()
        {
            Name = " Maria Silva ",
            Email = " Maria@Email.com ",
            Cpf = "529.982.247-25",
            Phone = "(11) 98765-4321",
            Password = "Senha123"
        };

        [Fact]
        public async Task RegisterAsync_ValidRequest_SavesNormalizedUserAndReturnsToken()
        {
            _passwordHasher.Setup(h => h.Hash("Senha123")).Returns("hashed");
            User? savedUser = null;
            _userRepository
                .Setup(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()))
                .Callback((User user, CancellationToken _) => savedUser = user);

            var result = await _authService.RegisterAsync(CreateRegisterRequest(), TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal("token", result.Value.AccessToken);
            Assert.NotNull(savedUser);
            Assert.Equal("Maria Silva", savedUser.Name);
            Assert.Equal("maria@email.com", savedUser.Email);
            Assert.Equal("52998224725", savedUser.Cpf);
            Assert.Equal("11987654321", savedUser.Phone);
            Assert.Equal("hashed", savedUser.PasswordHash);
            _userRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task RegisterAsync_EmailAlreadyExists_ReturnsConflict()
        {
            _userRepository
                .Setup(r => r.ExistsByEmailAsync("maria@email.com", It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var result = await _authService.RegisterAsync(CreateRegisterRequest(), TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("User.EmailAlreadyExists", result.Error!.Code);
            Assert.Equal(ErrorType.Conflict, result.Error.Type);
            _userRepository.Verify(r => r.AddAsync(It.IsAny<User>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task RegisterAsync_CpfAlreadyExists_ReturnsConflict()
        {
            _userRepository
                .Setup(r => r.ExistsByCpfAsync("52998224725", It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var result = await _authService.RegisterAsync(CreateRegisterRequest(), TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("User.CpfAlreadyExists", result.Error!.Code);
            Assert.Equal(ErrorType.Conflict, result.Error.Type);
        }

        [Fact]
        public async Task LoginAsync_ValidCredentials_ReturnsToken()
        {
            var user = new User { Email = "maria@email.com", PasswordHash = "hashed" };
            _userRepository
                .Setup(r => r.GetByEmailAsync("maria@email.com", It.IsAny<CancellationToken>()))
                .ReturnsAsync(user);
            _passwordHasher.Setup(h => h.Verify("Senha123", "hashed")).Returns(true);

            var request = new LoginRequest { Email = "MARIA@email.com", Password = "Senha123" };
            var result = await _authService.LoginAsync(request, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal(user.Id, result.Value.User.Id);
        }

        [Fact]
        public async Task LoginAsync_UserNotFound_ReturnsUnauthorized()
        {
            var request = new LoginRequest { Email = "naoexiste@email.com", Password = "Senha123" };
            var result = await _authService.LoginAsync(request, TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("Auth.InvalidCredentials", result.Error!.Code);
            Assert.Equal(ErrorType.Unauthorized, result.Error.Type);
        }

        [Fact]
        public async Task LoginAsync_WrongPassword_ReturnsUnauthorized()
        {
            _userRepository
                .Setup(r => r.GetByEmailAsync("maria@email.com", It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Email = "maria@email.com", PasswordHash = "hashed" });
            _passwordHasher.Setup(h => h.Verify("errada123", "hashed")).Returns(false);

            var request = new LoginRequest { Email = "maria@email.com", Password = "errada123" };
            var result = await _authService.LoginAsync(request, TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("Auth.InvalidCredentials", result.Error!.Code);
            _tokenService.Verify(t => t.Generate(It.IsAny<UserResponse>()), Times.Never);
        }
    }
}
