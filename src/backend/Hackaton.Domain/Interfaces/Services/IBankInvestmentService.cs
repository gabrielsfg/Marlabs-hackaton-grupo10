using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface IBankInvestmentService
    {
        Task<Result<List<BankInvestmentResponse>>> GetAllAsync(Guid userId, CancellationToken cancellationToken);
    }
}
