namespace Hackaton.Shared.Dtos.Request
{
    public class CreateClientRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Profile { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
    }
}