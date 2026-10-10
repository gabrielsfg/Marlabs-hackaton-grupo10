using FluentValidation;
using Hackaton.Shared.Dtos.Request;

namespace Hackaton.Services.Validations
{
    public class UpdateReminderRequestValidator : AbstractValidator<UpdateReminderRequest>
    {
        public UpdateReminderRequestValidator()
        {
            RuleFor(request => request.Title)
                .Must(title => !string.IsNullOrWhiteSpace(title)).WithMessage("Texto do lembrete e obrigatorio")
                .MaximumLength(300).WithMessage("Texto deve ter no maximo 300 caracteres");
            RuleFor(request => request.DueDate)
                .NotEmpty().WithMessage("Data do lembrete e obrigatoria");
        }
    }
}
