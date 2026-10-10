using Hackaton.Domain.Common;

namespace Hackaton.Domain.Entities
{
    public class User : BaseEntity
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
    }
}
