using FluentValidation;
using Hackaton.Shared.Dtos.Request;

namespace Hackaton.Services.Validations
{
    public class ConnectBankRequestValidator : AbstractValidator<ConnectBankRequest>
    {
        public ConnectBankRequestValidator()
        {
            RuleFor(x => x.ItemId)
                .NotEmpty().WithMessage("ItemId e obrigatorio")
                .Must(id => Guid.TryParse(id, out _)).WithMessage("ItemId deve ser um UUID valido");
        }
    }
}
