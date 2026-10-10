using FluentValidation;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Request;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hackaton.Api.Controllers
{
    [AllowAnonymous]
    public class AuthController : ApiControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IValidator<RegisterRequest> _registerValidator;
        private readonly IValidator<LoginRequest> _loginValidator;

        public AuthController(
            IAuthService authService,
            IValidator<RegisterRequest> registerValidator,
            IValidator<LoginRequest> loginValidator)
        {
            _authService = authService;
            _registerValidator = registerValidator;
            _loginValidator = loginValidator;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_registerValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _authService.RegisterAsync(request, cancellationToken);
            return HandleResult(result);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_loginValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _authService.LoginAsync(request, cancellationToken);
            return HandleResult(result);
        }
    }
}
