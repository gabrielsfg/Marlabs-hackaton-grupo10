using Hackaton.Domain.Entities;
using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Services.Services
{
    public class ReminderService : IReminderService
    {
        private readonly IReminderRepository _reminderRepository;
        private readonly IClientRepository _clientRepository;

        public ReminderService(IReminderRepository reminderRepository, IClientRepository clientRepository)
        {
            _reminderRepository = reminderRepository;
            _clientRepository = clientRepository;
        }

        public async Task<Result<List<ReminderResponse>>> ListAsync(Guid advisorId, CancellationToken cancellationToken)
        {
            var reminders = await _reminderRepository.ListByAdvisorAsync(advisorId, cancellationToken);
            return reminders.Select(Map).ToList();
        }

        public async Task<Result<ReminderResponse>> GetByIdAsync(Guid advisorId, Guid id, CancellationToken cancellationToken)
        {
            var reminder = await _reminderRepository.GetByIdAsync(id, advisorId, cancellationToken);
            if (reminder is null)
                return Error.NotFound("Reminder.NotFound", "Lembrete nao encontrado");

            return Map(reminder);
        }

        public async Task<Result<ReminderResponse>> CreateAsync(Guid advisorId, CreateReminderRequest request, CancellationToken cancellationToken)
        {
            var clientError = await ValidateClientAsync(advisorId, request.ClientId, cancellationToken);
            if (clientError is not null)
                return clientError;

            var reminder = new Reminder
            {
                AdvisorId = advisorId,
                ClientId = request.ClientId,
                Title = request.Title.Trim(),
                DueDate = request.DueDate
            };

            await _reminderRepository.AddAsync(reminder, cancellationToken);
            await _reminderRepository.SaveChangesAsync(cancellationToken);

            if (request.ClientId.HasValue)
                reminder.Client = await _clientRepository.GetByIdAsync(request.ClientId.Value, advisorId, cancellationToken);

            return Map(reminder);
        }

        public async Task<Result<ReminderResponse>> UpdateAsync(Guid advisorId, Guid id, UpdateReminderRequest request, CancellationToken cancellationToken)
        {
            var reminder = await _reminderRepository.GetByIdForUpdateAsync(id, advisorId, cancellationToken);
            if (reminder is null)
                return Error.NotFound("Reminder.NotFound", "Lembrete nao encontrado");

            var clientError = await ValidateClientAsync(advisorId, request.ClientId, cancellationToken);
            if (clientError is not null)
                return clientError;

            reminder.ClientId = request.ClientId;
            reminder.Title = request.Title.Trim();
            reminder.DueDate = request.DueDate;
            reminder.IsCompleted = request.IsCompleted;

            await _reminderRepository.SaveChangesAsync(cancellationToken);

            if (request.ClientId.HasValue)
                reminder.Client = await _clientRepository.GetByIdAsync(request.ClientId.Value, advisorId, cancellationToken);
            else
                reminder.Client = null;

            return Map(reminder);
        }

        public async Task<Result> DeleteAsync(Guid advisorId, Guid id, CancellationToken cancellationToken)
        {
            var reminder = await _reminderRepository.GetByIdForUpdateAsync(id, advisorId, cancellationToken);
            if (reminder is null)
                return Error.NotFound("Reminder.NotFound", "Lembrete nao encontrado");

            _reminderRepository.Remove(reminder);
            await _reminderRepository.SaveChangesAsync(cancellationToken);

            return Result.Success();
        }

        private async Task<Error?> ValidateClientAsync(Guid advisorId, Guid? clientId, CancellationToken cancellationToken)
        {
            if (clientId is null)
                return null;

            var client = await _clientRepository.GetByIdAsync(clientId.Value, advisorId, cancellationToken);
            return client is null
                ? Error.NotFound("Reminder.ClientNotFound", "Cliente nao encontrado")
                : null;
        }

        private static ReminderResponse Map(Reminder reminder) =>
            new()
            {
                Id = reminder.Id,
                Title = reminder.Title,
                DueDate = reminder.DueDate,
                ClientId = reminder.ClientId,
                ClientName = reminder.Client?.Name,
                IsCompleted = reminder.IsCompleted
            };
    }
}
