using FluentValidation;
using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Helpers;

namespace Hackaton.Services.Validations
{
    public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
    {
        public RegisterRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Nome e obrigatorio")
                .MaximumLength(150).WithMessage("Nome deve ter no maximo 150 caracteres");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("E-mail e obrigatorio")
                .EmailAddress().WithMessage("E-mail invalido")
                .MaximumLength(150).WithMessage("E-mail deve ter no maximo 150 caracteres");

            RuleFor(x => x.Cpf)
                .Must(CpfHelper.IsValid).WithMessage("CPF invalido");

            RuleFor(x => x.Phone)
                .Must(phone => DigitsHelper.OnlyDigits(phone).Length is >= 10 and <= 13)
                .WithMessage("Telefone invalido");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Senha e obrigatoria")
                .MinimumLength(8).WithMessage("Senha deve ter no minimo 8 caracteres")
                .MaximumLength(100).WithMessage("Senha deve ter no maximo 100 caracteres")
                .Matches("[A-Za-z]").WithMessage("Senha deve ter pelo menos uma letra")
                .Matches("[0-9]").WithMessage("Senha deve ter pelo menos um numero");
        }
    }
}
