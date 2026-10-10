using FluentValidation;
using Hackaton.Shared.Dtos.Request;

namespace Hackaton.Services.Validations
{
    public class CreateClientRequestValidator : AbstractValidator<CreateClientRequest>
    {
        public CreateClientRequestValidator()
        {
            RuleFor(request => request.Name)
                .NotEmpty().WithMessage("Nome e obrigatorio")
                .MaximumLength(150).WithMessage("Nome deve ter no maximo 150 caracteres");
            RuleFor(request => request.Profile)
                .Must(profile => profile is "Conservador" or "Moderado" or "Arrojado")
                .WithMessage("Perfil de investidor invalido");
            RuleFor(request => request.Cpf)
                .MaximumLength(20).WithMessage("CPF deve ter no maximo 20 caracteres");
            RuleFor(request => request.Email)
                .EmailAddress().When(request => !string.IsNullOrWhiteSpace(request.Email))
                .WithMessage("E-mail invalido");
        }
    }
}