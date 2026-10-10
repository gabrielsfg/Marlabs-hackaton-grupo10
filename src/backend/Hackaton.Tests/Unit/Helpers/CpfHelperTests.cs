using Hackaton.Shared.Helpers;

namespace Hackaton.Tests.Unit.Helpers
{
    public class CpfHelperTests
    {
        [Theory]
        [InlineData("529.982.247-25")]
        [InlineData("52998224725")]
        public void IsValid_ValidCpf_ReturnsTrue(string cpf)
        {
            Assert.True(CpfHelper.IsValid(cpf));
        }

        [Theory]
        [InlineData("529.982.247-26")]
        [InlineData("11111111111")]
        [InlineData("1234")]
        [InlineData("")]
        [InlineData(null)]
        public void IsValid_InvalidCpf_ReturnsFalse(string? cpf)
        {
            Assert.False(CpfHelper.IsValid(cpf));
        }
    }
}
