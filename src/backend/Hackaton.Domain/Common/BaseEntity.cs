namespace Hackaton.Domain.Common
{
    public abstract class BaseEntity
    {
        // UUID v7 (ordenado pelo tempo): nao e adivinhavel como um int sequencial e nao fragmenta o indice como o v4
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
