using Hackaton.Services.Helpers;

namespace Hackaton.Tests.Unit.Helpers
{
    public class PasswordHasherTests
    {
        private readonly PasswordHasher _passwordHasher = new();

        [Fact]
        public void Verify_CorrectPassword_ReturnsTrue()
        {
            var hash = _passwordHasher.Hash("Senha123");

            Assert.True(_passwordHasher.Verify("Senha123", hash));
        }

        [Fact]
        public void Verify_WrongPassword_ReturnsFalse()
        {
            var hash = _passwordHasher.Hash("Senha123");

            Assert.False(_passwordHasher.Verify("Senha124", hash));
        }

        [Fact]
        public void Hash_SamePasswordTwice_ReturnsDifferentHashes()
        {
            Assert.NotEqual(_passwordHasher.Hash("Senha123"), _passwordHasher.Hash("Senha123"));
        }
    }
}
