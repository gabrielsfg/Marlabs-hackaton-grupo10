using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface IDailyActionService
    {
        Task<Result<List<DailyActionResponse>>> GetAsync(Guid advisorId, CancellationToken cancellationToken);
    }
}
