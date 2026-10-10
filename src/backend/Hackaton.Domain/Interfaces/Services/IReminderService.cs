using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface IReminderService
    {
        Task<Result<List<ReminderResponse>>> ListAsync(Guid advisorId, CancellationToken cancellationToken);
        Task<Result<ReminderResponse>> GetByIdAsync(Guid advisorId, Guid id, CancellationToken cancellationToken);
        Task<Result<ReminderResponse>> CreateAsync(Guid advisorId, CreateReminderRequest request, CancellationToken cancellationToken);
        Task<Result<ReminderResponse>> UpdateAsync(Guid advisorId, Guid id, UpdateReminderRequest request, CancellationToken cancellationToken);
        Task<Result> DeleteAsync(Guid advisorId, Guid id, CancellationToken cancellationToken);
    }
}
