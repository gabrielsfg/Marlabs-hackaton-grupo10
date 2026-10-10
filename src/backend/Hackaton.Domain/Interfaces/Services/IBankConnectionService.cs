using Hackaton.Shared.Dtos.Request;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;

namespace Hackaton.Domain.Interfaces.Services
{
    public interface IBankConnectionService
    {
        Task<Result<List<BankConnectionResponse>>> GetAllAsync(Guid userId, CancellationToken cancellationToken);
        Task<Result<BankConnectionResponse>> ConnectAsync(Guid userId, ConnectBankRequest request, CancellationToken cancellationToken);
        Task<Result<SyncResultResponse>> SyncAsync(Guid userId, Guid connectionId, CancellationToken cancellationToken);
    }
}
