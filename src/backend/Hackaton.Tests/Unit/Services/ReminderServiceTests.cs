using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Services.Services;
using Hackaton.Shared.Dtos.Request;
using Moq;

namespace Hackaton.Tests.Unit.Services
{
    public class ReminderServiceTests
    {
        private readonly Mock<IReminderRepository> _reminderRepository = new();
        private readonly Mock<IClientRepository> _clientRepository = new();
        private readonly ReminderService _service;

        public ReminderServiceTests()
        {
            _service = new ReminderService(_reminderRepository.Object, _clientRepository.Object);
        }

        [Fact]
        public async Task ListAsync_ReturnsAdvisorReminders()
        {
            var advisorId = Guid.CreateVersion7();
            var reminder = new Reminder
            {
                AdvisorId = advisorId,
                Title = "Ligar para o cliente",
                DueDate = new DateOnly(2026, 10, 15),
                Client = new Client { Name = "Cliente" }
            };
            _reminderRepository
                .Setup(repository => repository.ListByAdvisorAsync(advisorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync([reminder]);

            var result = await _service.ListAsync(advisorId, TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            var savedReminder = Assert.Single(result.Value);
            Assert.Equal("Ligar para o cliente", savedReminder.Title);
            Assert.Equal("Cliente", savedReminder.ClientName);
        }

        [Fact]
        public async Task GetByIdAsync_ReminderNotFound_ReturnsNotFound()
        {
            var result = await _service.GetByIdAsync(
                Guid.CreateVersion7(),
                Guid.CreateVersion7(),
                TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("Reminder.NotFound", result.Error!.Code);
        }

        [Fact]
        public async Task CreateAsync_ValidReminder_ReturnsCreatedReminder()
        {
            var advisorId = Guid.CreateVersion7();
            var clientId = Guid.CreateVersion7();
            _clientRepository
                .Setup(repository => repository.GetByIdAsync(clientId, advisorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(new Client { Id = clientId, AdvisorId = advisorId, Name = "Cliente" });

            var result = await _service.CreateAsync(
                advisorId,
                new CreateReminderRequest
                {
                    Title = "  Ligar para o cliente  ",
                    DueDate = new DateOnly(2026, 10, 15),
                    ClientId = clientId
                },
                TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal("Ligar para o cliente", result.Value.Title);
            Assert.Equal("Cliente", result.Value.ClientName);
            _reminderRepository.Verify(repository => repository.AddAsync(
                It.Is<Reminder>(reminder => reminder.AdvisorId == advisorId && reminder.ClientId == clientId),
                It.IsAny<CancellationToken>()), Times.Once);
            _reminderRepository.Verify(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_ClientDoesNotBelongToAdvisor_ReturnsNotFound()
        {
            var advisorId = Guid.CreateVersion7();
            var clientId = Guid.CreateVersion7();

            var result = await _service.CreateAsync(
                advisorId,
                new CreateReminderRequest
                {
                    Title = "Ligar para o cliente",
                    DueDate = new DateOnly(2026, 10, 15),
                    ClientId = clientId
                },
                TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("Reminder.ClientNotFound", result.Error!.Code);
            _reminderRepository.Verify(repository => repository.AddAsync(It.IsAny<Reminder>(), It.IsAny<CancellationToken>()), Times.Never);
        }

        [Fact]
        public async Task UpdateAsync_ExistingReminder_UpdatesCompletion()
        {
            var advisorId = Guid.CreateVersion7();
            var reminder = new Reminder
            {
                AdvisorId = advisorId,
                Title = "Ligar para o cliente",
                DueDate = new DateOnly(2026, 10, 15)
            };
            _reminderRepository
                .Setup(repository => repository.GetByIdForUpdateAsync(reminder.Id, advisorId, It.IsAny<CancellationToken>()))
                .ReturnsAsync(reminder);

            var result = await _service.UpdateAsync(
                advisorId,
                reminder.Id,
                new UpdateReminderRequest
                {
                    Title = "Retorno sobre o aporte",
                    DueDate = new DateOnly(2026, 10, 16),
                    IsCompleted = true
                },
                TestContext.Current.CancellationToken);

            Assert.True(result.IsSuccess);
            Assert.Equal("Retorno sobre o aporte", result.Value.Title);
            Assert.True(result.Value.IsCompleted);
            Assert.Equal(new DateOnly(2026, 10, 16), reminder.DueDate);
            _reminderRepository.Verify(repository => repository.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task DeleteAsync_ReminderNotFound_ReturnsNotFound()
        {
            var result = await _service.DeleteAsync(
                Guid.CreateVersion7(),
                Guid.CreateVersion7(),
                TestContext.Current.CancellationToken);

            Assert.True(result.IsFailure);
            Assert.Equal("Reminder.NotFound", result.Error!.Code);
        }
    }
}
