using Hackaton.Shared.Models;

namespace Hackaton.Services.Services.Errors
{
    public static class AuthErrors
    {
        // Mesma mensagem para e-mail inexistente e senha errada, para nao revelar quais e-mails tem conta
        public static readonly Error InvalidCredentials =
            Error.Unauthorized("Auth.InvalidCredentials", "E-mail ou senha invalidos");
    }
}
