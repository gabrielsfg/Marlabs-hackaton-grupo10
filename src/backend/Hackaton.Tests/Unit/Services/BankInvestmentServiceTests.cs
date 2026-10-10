using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Services.Extensions;
using Hackaton.Services.Services;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Hackaton.Tests.Unit.Services
{
    public class BankInvestmentServiceTests
    {
        private readonly Mock<IBankInvestmentRepository> _investmentRepository = new();
        private readonly BankInvestmentService _service;

        public BankInvestmentServiceTests()
        {
            // Registra as configuracoes do Mapster (MapsterConfigs), como a Api faz no startup
            new ServiceCollection().AddApplicationServices();
            _service = new BankInvestmentService(_investmentRepository.Object);
        }

        [Fact]
        public async Task GetAllAsync_ReturnsInstitutionNameFromConnection()
        {
            var userId = Guid.CreateVersion7();
            var connection = new BankConnection { UserId = userId, ConnectorName = "MeuPluggy", InstitutionName = "XP" };
            _investmentRepository
                .Setup(r => r.GetByUserIdAsync(userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([new BankInvestment { BankConnectionId = connection.Id, BankConnection = connection, Code = "BBAS3" }]);

            var result = await _service.GetAllAsync(userId, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            var investment = Assert.Single(result.Value);
            Assert.Equal("BBAS3", investment.Code);
            Assert.Equal("XP", investment.InstitutionName);
        }
    }
}
