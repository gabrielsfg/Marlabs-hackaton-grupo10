using Hackaton.Shared.Models;

namespace Hackaton.Services.Services.Errors
{
    public static class UserErrors
    {
        public static readonly Error NotFound = Error.NotFound("User.NotFound", "Usuario nao encontrado");
        public static readonly Error EmailAlreadyExists =
            Error.Conflict("User.EmailAlreadyExists", "Ja existe um usuario com este e-mail");
        public static readonly Error CpfAlreadyExists =
            Error.Conflict("User.CpfAlreadyExists", "Ja existe um usuario com este CPF");
    }
}
