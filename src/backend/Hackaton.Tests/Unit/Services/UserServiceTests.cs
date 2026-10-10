using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Services.Services;
using Hackaton.Shared.Enums;
using Moq;

namespace Hackaton.Tests.Unit.Services
{
    public class UserServiceTests
    {
        private readonly Mock<IUserRepository> _userRepository = new();
        private readonly UserService _userService;

        public UserServiceTests()
        {
            _userService = new UserService(_userRepository.Object);
        }

        [Fact]
        public async Task GetByIdAsync_UserExists_ReturnsUser()
        {
            var userId = Guid.CreateVersion7();
            _userRepository
                .Setup(r => r.GetByIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new User { Id = userId, Name = "Maria", PasswordHash = "hashed" });

            var result = await _userService.GetByIdAsync(userId, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal(userId, result.Value.Id);
            Assert.Equal("Maria", result.Value.Name);
        }

        [Fact]
        public async Task GetByIdAsync_UserNotFound_ReturnsNotFound()
        {
            var result = await _userService.GetByIdAsync(Guid.CreateVersion7(), TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("User.NotFound", result.Error!.Code);
            Assert.Equal(ErrorType.NotFound, result.Error.Type);
        }
    }
}
