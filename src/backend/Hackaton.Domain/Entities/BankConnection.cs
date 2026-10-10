using Hackaton.Domain.Common;

namespace Hackaton.Domain.Entities
{
    // Um Item da Pluggy (uma conexao bancaria) pertencente a um usuario
    public class BankConnection : BaseEntity
    {
        public Guid UserId { get; set; }
        public Guid PluggyItemId { get; set; }
        public string ConnectorName { get; set; } = string.Empty;

        // Corretora/banco de origem (ex: "XP"). Pelo MeuPluggy o conector e sempre "MeuPluggy" e os investimentos
        // nao trazem a instituicao, entao o nome vem das contas do item
        public string? InstitutionName { get; set; }
        public string Status { get; set; } = string.Empty;
        public DateTime? LastSyncedAt { get; set; }

        public ICollection<BankInvestment> Investments { get; set; } = [];
    }
}
