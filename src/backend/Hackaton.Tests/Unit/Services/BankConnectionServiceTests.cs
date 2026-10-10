using System.Net;
using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Services.Pluggy;
using Hackaton.Services.Services;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Enums;
using Hackaton.Tests.Helpers;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Pluggy.SDK.Errors;
using PluggyModel = Pluggy.SDK.Model;

namespace Hackaton.Tests.Unit.Services
{
    public class BankConnectionServiceTests
    {
        private static readonly DateTimeOffset Now = new(2026, 10, 10, 12, 0, 0, TimeSpan.Zero);

        private readonly Mock<IBankConnectionRepository> _connectionRepository = new();
        private readonly Mock<IBankInvestmentRepository> _investmentRepository = new();
        private readonly Mock<IPluggyGateway> _pluggy = new();
        private readonly BankConnectionService _service;

        private readonly Guid _userId = Guid.CreateVersion7();
        private readonly Guid _itemId = Guid.NewGuid();

        public BankConnectionServiceTests()
        {
            _service = new BankConnectionService(
                _connectionRepository.Object,
                _investmentRepository.Object,
                _pluggy.Object,
                new FixedTimeProvider(Now),
                NullLogger<BankConnectionService>.Instance);

            _pluggy.Setup(p => p.FetchItemAsync(_itemId)).ReturnsAsync(new PluggyModel.Item
            {
                Id = _itemId,
                Status = PluggyModel.ItemStatus.UPDATED,
                Connector = new PluggyModel.Connector { Name = "MeuPluggy" }
            });
            _pluggy.Setup(p => p.FetchInvestmentsAsync(_itemId)).ReturnsAsync([]);
            _pluggy.Setup(p => p.FetchAccountsAsync(_itemId)).ReturnsAsync([
                new PluggyModel.Account { Id = Guid.NewGuid(), ItemId = _itemId, Name = "XP", MarketingName = "" }
            ]);
        }

        [Fact]
        public async Task ConnectAsync_ItemAlreadyConnected_ReturnsConflict()
        {
            _connectionRepository
                .Setup(r => r.ExistsAsync(_userId, _itemId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);

            var result = await _service.ConnectAsync(_userId, new ConnectBankRequest { ItemId = _itemId.ToString() },
                TestContext.Current.CancellationToken);

            Assert.Equal("BankConnection.AlreadyConnected", result.Error!.Code);
            _connectionRepository.Verify(r => r.AddAsync(It.IsAny<BankConnection>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task ConnectAsync_ItemNotFoundOnPluggy_ReturnsNotFound()
        {
            var unknownItemId = Guid.NewGuid();
            _pluggy.Setup(p => p.FetchItemAsync(unknownItemId)).ThrowsAsync(new ApiException(HttpStatusCode.NotFound));

            var result = await _service.ConnectAsync(_userId, new ConnectBankRequest { ItemId = unknownItemId.ToString() },
                TestContext.Current.CancellationToken);

            Assert.Equal("Pluggy.ItemNotFound", result.Error!.Code);
            Assert.Equal(ErrorType.NotFound, result.Error.Type);
        }

        [Fact]
        public async Task ConnectAsync_ValidItem_SavesConnectionWithConnectorData()
        {
            BankConnection? saved = null;
            _connectionRepository
                .Setup(r => r.AddAsync(It.IsAny<BankConnection>(), It.IsAny<CancellationToken>()))
                .Callback<BankConnection, CancellationToken>((c, _) => saved = c);

            var result = await _service.ConnectAsync(_userId, new ConnectBankRequest { ItemId = _itemId.ToString() },
                TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.NotNull(saved);
            Assert.Equal(_userId, saved.UserId);
            Assert.Equal("MeuPluggy", saved.ConnectorName);
            Assert.Equal("XP", saved.InstitutionName);
            Assert.Equal("UPDATED", saved.Status);
        }

        [Fact]
        public async Task SyncAsync_ConnectionOfAnotherUser_ReturnsNotFound()
        {
            var result = await _service.SyncAsync(_userId, Guid.CreateVersion7(), TestContext.Current.CancellationToken);

            Assert.Equal("BankConnection.NotFound", result.Error!.Code);
        }

        [Fact]
        public async Task SyncAsync_NewInvestments_CreatesPositions()
        {
            var connection = GivenConnection();
            var stock = Investment("PETR4", PluggyModel.InvestmentType.EQUITY, quantity: 10, value: 38.5);
            _pluggy.Setup(p => p.FetchInvestmentsAsync(_itemId)).ReturnsAsync([stock]);

            var result = await _service.SyncAsync(_userId, connection.Id, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal(1, result.Value.InvestmentsSynced);
            Assert.Equal(0, result.Value.InvestmentsRemoved);
            Assert.Equal(Now.UtcDateTime, connection.LastSyncedAt);
            Assert.Equal("XP", connection.InstitutionName);
            _investmentRepository.Verify(r => r.AddAsync(
                It.Is<BankInvestment>(i => i.PluggyInvestmentId == stock.Id
                    && i.Code == "PETR4"
                    && i.Type == "EQUITY"
                    && i.Quantity == 10m
                    && i.UnitValue == 38.5m
                    && i.BankConnectionId == connection.Id
                    && i.Date.Kind == DateTimeKind.Utc),
                It.IsAny<CancellationToken>()), Times.Once);
            _connectionRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task SyncAsync_ExistingAndSoldInvestments_UpdatesKeptAndRemovesSold()
        {
            var connection = GivenConnection();
            var kept = Investment("BOVA11", PluggyModel.InvestmentType.ETF, quantity: 5, value: 130);
            var storedKept = new BankInvestment { BankConnectionId = connection.Id, PluggyInvestmentId = kept.Id, Quantity = 2 };
            var storedSold = new BankInvestment { BankConnectionId = connection.Id, PluggyInvestmentId = Guid.NewGuid(), Code = "VALE3" };
            connection.Investments.Add(storedKept);
            connection.Investments.Add(storedSold);
            _pluggy.Setup(p => p.FetchInvestmentsAsync(_itemId)).ReturnsAsync([kept]);

            var result = await _service.SyncAsync(_userId, connection.Id, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal(1, result.Value.InvestmentsSynced);
            Assert.Equal(1, result.Value.InvestmentsRemoved);
            Assert.Equal(5m, storedKept.Quantity);
            _investmentRepository.Verify(r => r.AddAsync(It.IsAny<BankInvestment>(), It.IsAny<CancellationToken>()), Times.Never);
            _investmentRepository.Verify(r => r.RemoveRange(
                It.Is<IEnumerable<BankInvestment>>(removed => removed.Single() == storedSold)), Times.Once);
        }

        [Fact]
        public async Task SyncAsync_ItemWithoutAccounts_KeepsPreviousInstitutionName()
        {
            var connection = GivenConnection();
            connection.InstitutionName = "XP";
            _pluggy.Setup(p => p.FetchAccountsAsync(_itemId)).ReturnsAsync([]);

            var result = await _service.SyncAsync(_userId, connection.Id, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal("XP", connection.InstitutionName);
        }

        [Fact]
        public async Task SyncAsync_PluggyRejectsCredentials_ReturnsUnauthorizedErrorAndDoesNotSave()
        {
            var connection = GivenConnection();
            _pluggy.Setup(p => p.FetchItemAsync(_itemId)).ThrowsAsync(new ApiException(HttpStatusCode.Unauthorized));

            var result = await _service.SyncAsync(_userId, connection.Id, TestContext.Current.CancellationToken);

            Assert.Equal("Pluggy.Unauthorized", result.Error!.Code);
            Assert.Null(connection.LastSyncedAt);
            _connectionRepository.Verify(r => r.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Never);
        }

        private BankConnection GivenConnection()
        {
            var connection = new BankConnection { UserId = _userId, PluggyItemId = _itemId };
            _connectionRepository
                .Setup(r => r.GetForSyncAsync(connection.Id, _userId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(connection);
            return connection;
        }

        private PluggyModel.Investment Investment(string code, PluggyModel.InvestmentType type, double quantity, double value) => new()
        {
            Id = Guid.NewGuid(),
            ItemId = _itemId,
            Name = code,
            Code = code,
            Type = type,
            Status = PluggyModel.InvestmentStatus.ACTIVE,
            CurrencyCode = PluggyModel.CurrencyCode.BRL,
            Quantity = quantity,
            Value = value,
            Amount = quantity * value,
            Balance = quantity * value,
            Date = new DateTime(2026, 10, 9, 0, 0, 0, DateTimeKind.Unspecified)
        };
    }
}
