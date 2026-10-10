using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Services.Services;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Enums;
using Moq;

namespace Hackaton.Tests.Unit.Services
{
    public class ClientServiceTests
    {
        private readonly Mock<IClientRepository> _clientRepository = new();
        private readonly Mock<IBankInvestmentRepository> _investmentRepository = new();
        private readonly ClientService _clientService;

        public ClientServiceTests()
        {
            _clientService = new ClientService(_clientRepository.Object, _investmentRepository.Object);
            _investmentRepository
                .Setup(r => r.GetTotalsByClientIdsAsync(It.IsAny<Guid>(), It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync([]);
        }

        [Fact]
        public async Task CreateAsync_ValidRequest_ReturnsCreatedClientForAdvisor()
        {
            var advisorId = Guid.CreateVersion7();
            Client? addedClient = null;
            _clientRepository
                .Setup(repository => repository.AddAsync(It.IsAny<Client>(), It.IsAny<CancellationToken>()))
                .Callback<Client, CancellationToken>((client, _) => addedClient = client)
                .Returns(Task.CompletedTask);
            _clientRepository
                .Setup(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var result = await _clientService.CreateAsync(
                advisorId,
                new CreateClientRequest
                {
                    Name = "Maria Silva",
                    Profile = "Moderado",
                    Cpf = "12345678900",
                    Email = "maria@example.com"
                },
                TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal(advisorId, addedClient!.AdvisorId);
            Assert.Equal("Maria Silva", result.Value.Name);
            Assert.Equal(0, result.Value.AlertCount);
        }

        [Fact]
        public async Task GetByIdAsync_WithLinkedPortfolio_ReturnsFinancialAssetsFromInvestments()
        {
            var advisorId = Guid.CreateVersion7();
            var client = new Client { AdvisorId = advisorId, Name = "Maria Silva", FinancialAssets = 1000 };
            _clientRepository
                .Setup(r => r.GetByIdAsync(client.Id, advisorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(client);
            _investmentRepository
                .Setup(r => r.GetTotalsByClientIdsAsync(advisorId, It.IsAny<IReadOnlyCollection<Guid>>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new Dictionary<Guid, decimal> { [client.Id] = 25432.10m });

            var result = await _clientService.GetByIdAsync(advisorId, client.Id, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal(25432.10m, result.Value.FinancialAssets);
        }

        [Fact]
        public async Task GetByIdAsync_WithoutLinkedPortfolio_KeepsRegisteredFinancialAssets()
        {
            var advisorId = Guid.CreateVersion7();
            var client = new Client { AdvisorId = advisorId, Name = "Maria Silva", FinancialAssets = 1000 };
            _clientRepository
                .Setup(r => r.GetByIdAsync(client.Id, advisorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(client);

            var result = await _clientService.GetByIdAsync(advisorId, client.Id, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal(1000m, result.Value.FinancialAssets);
        }

        [Fact]
        public async Task GetByIdAsync_ClientDoesNotBelongToAdvisor_ReturnsNotFound()
        {
            var result = await _clientService.GetByIdAsync(
                Guid.CreateVersion7(),
                Guid.CreateVersion7(),
                TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("Client.NotFound", result.Error!.Code);
            Assert.Equal(ErrorType.NotFound, result.Error.Type);
        }

        [Fact]
        public async Task UpdateAsync_ClientExists_UpdatesEditableFields()
        {
            var clientId = Guid.CreateVersion7();
            var advisorId = Guid.CreateVersion7();
            var client = new Client
            {
                Id = clientId,
                AdvisorId = advisorId,
                Name = "Maria Silva",
                Profile = "Moderado",
                FinancialAssets = 1000
            };
            _clientRepository
                .Setup(repository => repository.GetByIdForUpdateAsync(clientId, advisorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(client);
            _clientRepository
                .Setup(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()))
                .Returns(Task.CompletedTask);

            var result = await _clientService.UpdateAsync(
                advisorId,
                clientId,
                new UpdateClientRequest
                {
                    Name = "Maria Santos",
                    Profile = "Arrojado",
                    Cpf = "12345678900",
                    Email = "maria@example.com"
                },
                TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal("Maria Santos", client.Name);
            Assert.Equal("Arrojado", result.Value.Profile);
            Assert.Equal(1000, result.Value.FinancialAssets);
        }

        [Fact]
        public async Task DeleteAsync_ClientDoesNotBelongToAdvisor_ReturnsNotFound()
        {
            var result = await _clientService.DeleteAsync(
                Guid.CreateVersion7(),
                Guid.CreateVersion7(),
                TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("Client.NotFound", result.Error!.Code);
            Assert.Equal(ErrorType.NotFound, result.Error.Type);
        }
    }
}