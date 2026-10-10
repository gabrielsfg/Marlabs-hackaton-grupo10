using FluentValidation;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Request;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Api.Controllers
{
    public class RemindersController : ApiControllerBase
    {
        private readonly IReminderService _reminderService;
        private readonly IValidator<CreateReminderRequest> _createValidator;
        private readonly IValidator<UpdateReminderRequest> _updateValidator;

        public RemindersController(
            IReminderService reminderService,
            IValidator<CreateReminderRequest> createValidator,
            IValidator<UpdateReminderRequest> updateValidator)
        {
            _reminderService = reminderService;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken cancellationToken)
        {
            var result = await _reminderService.ListAsync(CurrentUserId, cancellationToken);
            return HandleResult(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        {
            var result = await _reminderService.GetByIdAsync(CurrentUserId, id, cancellationToken);
            return HandleResult(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateReminderRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_createValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _reminderService.CreateAsync(CurrentUserId, request, cancellationToken);
            return HandleCreated(result, nameof(GetById), reminder => new { id = reminder.Id });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateReminderRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_updateValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _reminderService.UpdateAsync(CurrentUserId, id, request, cancellationToken);
            return HandleResult(result);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            var result = await _reminderService.DeleteAsync(CurrentUserId, id, cancellationToken);
            return HandleResult(result);
        }
    }
}
