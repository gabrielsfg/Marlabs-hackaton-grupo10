using Hackaton.Shared.Enums;

namespace Hackaton.Shared.Models
{
    // Code em ingles e estavel (ex: "User.NotFound"); Message e o texto exibido ao usuario, em portugues
    public sealed record Error(string Code, string Message, ErrorType Type)
    {
        public static Error Failure(string code, string message) => new(code, message, ErrorType.Failure);
        public static Error Validation(string code, string message) => new(code, message, ErrorType.Validation);
        public static Error NotFound(string code, string message) => new(code, message, ErrorType.NotFound);
        public static Error Conflict(string code, string message) => new(code, message, ErrorType.Conflict);
        public static Error Unauthorized(string code, string message) => new(code, message, ErrorType.Unauthorized);
        public static Error Forbidden(string code, string message) => new(code, message, ErrorType.Forbidden);
    }
}
