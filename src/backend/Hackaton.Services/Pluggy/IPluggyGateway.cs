using Pluggy.SDK.Model;

namespace Hackaton.Services.Pluggy
{
    // Fronteira com a API da Pluggy (so leitura); existe para os services poderem ser testados com mock
    public interface IPluggyGateway
    {
        Task<Item> FetchItemAsync(Guid itemId);
        Task<IList<Investment>> FetchInvestmentsAsync(Guid itemId);

        // Usado so para descobrir a instituicao de origem (os investimentos do MeuPluggy nao trazem)
        Task<IList<Account>> FetchAccountsAsync(Guid itemId);
    }
}
