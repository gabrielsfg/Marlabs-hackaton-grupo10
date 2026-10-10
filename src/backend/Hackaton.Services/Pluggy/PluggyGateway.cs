using Pluggy.SDK.Model;

namespace Hackaton.Services.Pluggy
{
    public class PluggyGateway : IPluggyGateway
    {
        private readonly PluggyClientProvider _clientProvider;

        public PluggyGateway(PluggyClientProvider clientProvider)
        {
            _clientProvider = clientProvider;
        }

        public Task<Item> FetchItemAsync(Guid itemId) =>
            _clientProvider.GetClient().FetchItem(itemId);

        // Pagina unica de ate 500 posicoes (padrao da API), mais que suficiente para o limite de 5 conexoes do plano gratuito
        public async Task<IList<Investment>> FetchInvestmentsAsync(Guid itemId)
        {
            var page = await _clientProvider.GetClient().FetchInvestments(itemId);
            return page.Results;
        }

        public async Task<IList<Account>> FetchAccountsAsync(Guid itemId)
        {
            var page = await _clientProvider.GetClient().FetchAccounts(itemId);
            return page.Results;
        }
    }
}
