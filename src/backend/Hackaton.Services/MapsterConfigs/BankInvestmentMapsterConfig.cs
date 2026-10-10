using Hackaton.Domain.Entities;
using Hackaton.Shared.Dtos.Response;
using Mapster;

namespace Hackaton.Services.MapsterConfigs
{
    public class BankInvestmentMapsterConfig : IRegister
    {
        public void Register(TypeAdapterConfig config)
        {
            // A corretora fica na conexao; o repository carrega a BankConnection junto
            config.NewConfig<BankInvestment, BankInvestmentResponse>()
                .Map(dest => dest.InstitutionName, src => src.BankConnection != null ? src.BankConnection.InstitutionName : null);
        }
    }
}
