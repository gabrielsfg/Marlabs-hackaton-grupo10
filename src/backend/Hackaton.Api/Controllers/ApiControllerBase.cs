using System.Security.Claims;
using FluentValidation;
using Hackaton.Shared.Enums;
using Hackaton.Shared.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Hackaton.Api.Controllers
{
    // Toda rota exige token por padrao; endpoints publicos usam [AllowAnonymous]
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public abstract class ApiControllerBase : ControllerBase
    {
        // Id do usuario logado, vindo do token. Use sempre este valor para filtrar dados, nunca um id do request
        protected Guid CurrentUserId =>
            Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)
                ?? throw new InvalidOperationException("Token sem a claim sub"));

        // Retorna null quando valido; senao, o 400 pronto para o controller devolver
        protected async Task<IActionResult?> ValidateAsync<T>(IValidator<T> validator, T request, CancellationToken cancellationToken)
        {
            var validation = await validator.ValidateAsync(request, cancellationToken);
            if (validation.IsValid)
                return null;

            foreach (var failure in validation.Errors)
                ModelState.AddModelError(failure.PropertyName, failure.ErrorMessage);

            return ValidationProblem(ModelState);
        }

        protected IActionResult HandleResult(Result result) =>
            result.IsSuccess ? NoContent() : ToProblem(result.Error!);

        protected IActionResult HandleResult<T>(Result<T> result) =>
            result.IsSuccess ? Ok(result.Value) : ToProblem(result.Error!);

        protected IActionResult HandleCreated<T>(Result<T> result, string actionName, Func<T, object> routeValues) =>
            result.IsSuccess
                ? CreatedAtAction(actionName, routeValues(result.Value), result.Value)
                : ToProblem(result.Error!);

        private ObjectResult ToProblem(Error error)
        {
            var statusCode = error.Type switch
            {
                ErrorType.Validation => StatusCodes.Status400BadRequest,
                ErrorType.NotFound => StatusCodes.Status404NotFound,
                ErrorType.Conflict => StatusCodes.Status409Conflict,
                ErrorType.Unauthorized => StatusCodes.Status401Unauthorized,
                ErrorType.Forbidden => StatusCodes.Status403Forbidden,
                _ => StatusCodes.Status500InternalServerError
            };

            return Problem(statusCode: statusCode, title: error.Code, detail: error.Message);
        }
    }
}
