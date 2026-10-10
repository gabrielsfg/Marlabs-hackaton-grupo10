using Hackaton.Domain.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Api.Controllers
{
    public class UsersController : ApiControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
        {
            var result = await _userService.GetByIdAsync(CurrentUserId, cancellationToken);
            return HandleResult(result);
        }
    }
}
