using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Services.Services;
using Hackaton.Tests.Helpers;
using Moq;

namespace Hackaton.Tests.Unit.Services
{
    public class DailyActionServiceTests
    {
        // 10/10/2026 23:30 em Brasilia = 11/10/2026 02:30 UTC
        private static readonly DateTimeOffset Now = new(2026, 10, 11, 2, 30, 0, TimeSpan.Zero);

        private readonly Mock<IBankInvestmentRepository> _investmentRepository = new();
        private readonly Mock<IClientRepository> _clientRepository = new();
        private readonly DailyActionService _service;

        private readonly Guid _advisorId = Guid.CreateVersion7();
        private readonly Client _client;
        private readonly BankConnection _connection;

        public DailyActionServiceTests()
        {
            _service = new DailyActionService(_investmentRepository.Object, _clientRepository.Object, new FixedTimeProvider(Now));
            _client = new Client { AdvisorId = _advisorId, Name = "Carlos Menezes" };
            _connection = new BankConnection { UserId = _advisorId, ClientId = _client.Id, InstitutionName = "XP" };
            _clientRepository
                .Setup(r => r.ListByAdvisorAsync(_advisorId, null, null, false, It.IsAny<CancellationToken>()))
                .ReturnsAsync([_client]);
        }

        [Fact]
        public async Task GetAsync_IssuerAboveFgcLimit_ReturnsFgcActionWithExcess()
        {
            GivenPositions(
                Position("CDB", "Banco Aurora", balance: 200_000),
                Position("LCI", "Banco Aurora", balance: 120_000),
                Position("CDB", "Banco Horizonte", balance: 100_000));

            var result = await _service.GetAsync(_advisorId, TestContext.Current.CancellationToken);

            var action = Assert.Single(result.Value);
            Assert.Equal("FGC", action.Type);
            Assert.Equal("Alta", action.Priority);
            Assert.Equal(70_000m, action.HighlightValue);
            Assert.Equal(_client.Id, action.ClientId);
            Assert.Equal("Carlos Menezes", action.ClientName);
            Assert.Contains("Banco Aurora", action.Description);
        }

        [Fact]
        public async Task GetAsync_StocksAboveLimit_AreNotCoveredByFgc()
        {
            GivenPositions(Position("STOCK", "Petrobras", balance: 900_000));

            var result = await _service.GetAsync(_advisorId, TestContext.Current.CancellationToken);

            Assert.Empty(result.Value);
        }

        [Fact]
        public async Task GetAsync_MaturitiesWithinWindow_UseBrasiliaDateAndPriorityByDays()
        {
            GivenPositions(
                Position("CDB", "Banco A", balance: 10_000, dueDate: new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)),
                Position("CDB", "Banco B", balance: 20_000, dueDate: new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc)),
                Position("CDB", "Banco C", balance: 30_000, dueDate: new DateTime(2026, 12, 20, 0, 0, 0, DateTimeKind.Utc)),
                Position("CDB", "Banco D", balance: 40_000, dueDate: new DateTime(2027, 6, 1, 0, 0, 0, DateTimeKind.Utc)));

            var result = await _service.GetAsync(_advisorId, TestContext.Current.CancellationToken);

            Assert.Equal(3, result.Value.Count);
            Assert.All(result.Value, a => Assert.Equal("Vencimento", a.Type));
            // Hoje em Brasilia e 10/10, nao 11/10 (UTC): 15/10 fica a 5 dias
            Assert.Equal([5, 22, 71], result.Value.Select(a => a.DaysUntilDue!.Value).ToArray());
            Assert.Equal(["Alta", "Média", "Baixa"], result.Value.Select(a => a.Priority).ToArray());
        }

        [Fact]
        public async Task GetAsync_PortfolioLinkedToClientOfAnotherAdvisor_IsIgnored()
        {
            var otherClientConnection = new BankConnection { UserId = _advisorId, ClientId = Guid.CreateVersion7() };
            GivenPositions(new BankInvestment
            {
                BankConnection = otherClientConnection, Subtype = "CDB", Issuer = "Banco Aurora", Balance = 900_000
            });

            var result = await _service.GetAsync(_advisorId, TestContext.Current.CancellationToken);

            Assert.Empty(result.Value);
        }

        private void GivenPositions(params BankInvestment[] positions) =>
            _investmentRepository
                .Setup(r => r.GetLinkedToClientsAsync(_advisorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(positions.ToList());

        private BankInvestment Position(string subtype, string issuer, decimal balance, DateTime? dueDate = null) => new()
        {
            BankConnectionId = _connection.Id,
            BankConnection = _connection,
            Name = $"{subtype} {issuer}",
            Subtype = subtype,
            Issuer = issuer,
            Balance = balance,
            DueDate = dueDate
        };
    }
}
