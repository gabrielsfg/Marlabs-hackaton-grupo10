using Hackaton.Domain.Common;

namespace Hackaton.Domain.Entities
{
    public class Client : BaseEntity
    {
        public Guid AdvisorId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Profile { get; set; } = string.Empty;
        public string Cpf { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal FinancialAssets { get; set; }
        public decimal PhysicalAssets { get; set; }
        public decimal OutsideInstitutionPercentage { get; set; }
        public int AlertCount { get; set; }
        public string NextDate { get; set; } = string.Empty;
    }
}