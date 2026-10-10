using System.Net;
using Hackaton.Shared.Models;
using Pluggy.SDK.Errors;

namespace Hackaton.Services.Services.Errors
{
    public static class BankConnectionErrors
    {
        public static readonly Error NotFound = Error.NotFound("BankConnection.NotFound", "Conexao bancaria nao encontrada");
        public static readonly Error AlreadyConnected =
            Error.Conflict("BankConnection.AlreadyConnected", "Este item da Pluggy ja esta conectado");
        public static readonly Error ItemNotFound = Error.NotFound("Pluggy.ItemNotFound",
            "Item nao encontrado na Pluggy. Confira o itemId no Dashboard (pagina Demo > Itens Conectados)");
        public static readonly Error Unauthorized = Error.Failure("Pluggy.Unauthorized",
            "Credenciais da Pluggy invalidas. Confira Pluggy:ClientId e Pluggy:ClientSecret no user-secrets");
        public static readonly Error Unavailable =
            Error.Failure("Pluggy.Unavailable", "Nao foi possivel falar com a Pluggy agora. Tente novamente");

        public static Error FromPluggy(ApiException exception) => exception.StatusCode switch
        {
            HttpStatusCode.NotFound => ItemNotFound,
            HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden => Unauthorized,
            _ => Unavailable
        };
    }
}
