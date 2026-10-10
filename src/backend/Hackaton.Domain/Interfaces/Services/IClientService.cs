using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface IClientService
    {
        Task<Result<List<ClientResponse>>> ListAsync(Guid advisorId, string? search, string? profile, bool onlyWithAlerts, CancellationToken cancellationToken);
        Task<Result<ClientResponse>> GetByIdAsync(Guid advisorId, Guid id, CancellationToken cancellationToken);
        Task<Result<ClientResponse>> CreateAsync(Guid advisorId, CreateClientRequest request, CancellationToken cancellationToken);
        Task<Result<ClientResponse>> UpdateAsync(Guid advisorId, Guid id, UpdateClientRequest request, CancellationToken cancellationToken);
        Task<Result> DeleteAsync(Guid advisorId, Guid id, CancellationToken cancellationToken);
    }
}