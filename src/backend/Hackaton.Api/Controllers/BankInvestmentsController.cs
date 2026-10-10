using Hackaton.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Api.Controllers
{
    public class BankInvestmentsController : ApiControllerBase
    {
        private readonly IBankInvestmentService _investmentService;

        public BankInvestmentsController(IBankInvestmentService investmentService)
        {
            _investmentService = investmentService;
        }

        // Carteira salva no ultimo sync (POST /api/bankconnections/{id}/sync)
        [HttpGet]
        public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
        {
            var result = await _investmentService.GetAllAsync(CurrentUserId, cancellationToken);
            return HandleResult(result);
        }
    }
}
