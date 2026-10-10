using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;
using Mapster;

namespace Hackaton.Services.Services
{
    public class BankInvestmentService : IBankInvestmentService
    {
        private readonly IBankInvestmentRepository _investmentRepository;

        public BankInvestmentService(IBankInvestmentRepository investmentRepository)
        {
            _investmentRepository = investmentRepository;
        }

        public async Task<Result<List<BankInvestmentResponse>>> GetAllAsync(Guid userId, CancellationToken cancellationToken)
        {
            var investments = await _investmentRepository.GetByUserIdAsync(userId, cancellationToken);
            return investments.Adapt<List<BankInvestmentResponse>>();
        }
    }
}
