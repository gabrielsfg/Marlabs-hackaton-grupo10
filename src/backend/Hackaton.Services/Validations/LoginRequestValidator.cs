using FluentValidation;
using Hackaton.Shared.Dtos.Request;

namespace Hackaton.Services.Validations
{
    public class LoginRequestValidator : AbstractValidator<LoginRequest>
    {
        public LoginRequestValidator()
        {
            RuleFor(x => x.Email).NotEmpty().WithMessage("E-mail e obrigatorio");
            RuleFor(x => x.Password).NotEmpty().WithMessage("Senha e obrigatoria");
        }
    }
}
