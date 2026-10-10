namespace Hackaton.Shared.Dtos.Request
{
    public class LinkBankConnectionClientRequest
    {
        // Id do cliente dono da carteira; null desvincula
        public Guid? ClientId { get; set; }
    }
}
