using FluentValidation;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Request;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Api.Controllers
{
    public class ClientsController : ApiControllerBase
    {
        private readonly IClientService _clientService;
        private readonly IValidator<CreateClientRequest> _createValidator;
        private readonly IValidator<UpdateClientRequest> _updateValidator;

        public ClientsController(
            IClientService clientService,
            IValidator<CreateClientRequest> createValidator,
            IValidator<UpdateClientRequest> updateValidator)
        {
            _clientService = clientService;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
        }

        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string? search,
            [FromQuery] string? profile,
            [FromQuery] bool onlyWithAlerts,
            CancellationToken cancellationToken)
        {
            var result = await _clientService.ListAsync(CurrentUserId, search, profile, onlyWithAlerts, cancellationToken);
            return HandleResult(result);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        {
            var result = await _clientService.GetByIdAsync(CurrentUserId, id, cancellationToken);
            return HandleResult(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateClientRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_createValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _clientService.CreateAsync(CurrentUserId, request, cancellationToken);
            return HandleCreated(result, nameof(GetById), client => new { id = client.Id });
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateClientRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_updateValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _clientService.UpdateAsync(CurrentUserId, id, request, cancellationToken);
            return HandleResult(result);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
        {
            var result = await _clientService.DeleteAsync(CurrentUserId, id, cancellationToken);
            return HandleResult(result);
        }
    }
}