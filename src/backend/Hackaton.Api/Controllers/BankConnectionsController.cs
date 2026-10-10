using FluentValidation;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Request;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Api.Controllers
{
    public class BankConnectionsController : ApiControllerBase
    {
        private readonly IBankConnectionService _connectionService;
        private readonly IValidator<ConnectBankRequest> _connectValidator;

        public BankConnectionsController(IBankConnectionService connectionService, IValidator<ConnectBankRequest> connectValidator)
        {
            _connectionService = connectionService;
            _connectValidator = connectValidator;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var result = await _connectionService.GetAllAsync(CurrentUserId, cancellationToken);
            return HandleResult(result);
        }

        // Liga um item da Pluggy (ja conectado pelo Meu Pluggy + Dashboard) ao usuario logado
        [HttpPost]
        public async Task<IActionResult> Connect(ConnectBankRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_connectValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _connectionService.ConnectAsync(CurrentUserId, request, cancellationToken);
            return HandleResult(result);
        }

        // Vincula a carteira a um cliente do assessor ({ "clientId": null } desvincula)
        [HttpPut("{id:guid}/client")]
        public async Task<IActionResult> LinkClient(Guid id, LinkBankConnectionClientRequest request, CancellationToken cancellationToken)
        {
            var result = await _connectionService.LinkClientAsync(CurrentUserId, id, request, cancellationToken);
            return HandleResult(result);
        }

        // Puxa contas e transacoes da Pluggy e grava no banco (cria as novas, atualiza as existentes)
        [HttpPost("{id:guid}/sync")]
        public async Task<IActionResult> Sync(Guid id, CancellationToken cancellationToken)
        {
            var result = await _connectionService.SyncAsync(CurrentUserId, id, cancellationToken);
            return HandleResult(result);
        }
    }
}
