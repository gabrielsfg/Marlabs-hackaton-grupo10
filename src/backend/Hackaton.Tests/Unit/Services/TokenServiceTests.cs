using Hackaton.Services.Services;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Hackaton.Tests.Unit.Services
{
    public class TokenServiceTests
    {
        [Fact]
        public void Generate_User_ReturnsTokenWithUserIdInSubClaim()
        {
            var settings = new JwtSettings
            {
                Issuer = "issuer",
                Audience = "audience",
                Key = new string('k', 32),
                ExpirationMinutes = 60
            };
            var tokenService = new TokenService(settings);

            var userId = Guid.CreateVersion7();
            var response = tokenService.Generate(new UserResponse { Id = userId, Name = "Maria", Email = "maria@email.com" });

            var token = new JsonWebToken(response.AccessToken);
            Assert.Equal(userId.ToString(), token.Subject);
            Assert.Equal("issuer", token.Issuer);
            Assert.True(response.ExpiresAt > DateTime.UtcNow);
        }
    }
}
