using Hackaton.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Api.Controllers
{
    public class DailyActionsController : ApiControllerBase
    {
        private readonly IDailyActionService _dailyActionService;

        public DailyActionsController(IDailyActionService dailyActionService)
        {
            _dailyActionService = dailyActionService;
        }

        // Cards de "Acoes do dia" do assessor logado (FGC acima do limite e vencimentos em ate 90 dias)
        [HttpGet]
        public async Task<IActionResult> Get(CancellationToken cancellationToken)
        {
            var result = await _dailyActionService.GetAsync(CurrentUserId, cancellationToken);
            return HandleResult(result);
        }
    }
}
