using Hackaton.Domain.Interfaces.Repositories;
using Hackaton.Domain.Interfaces.Services;
using Hackaton.Services.Services.Errors;
using Hackaton.Shared.Dtos.Response;
using Hackaton.Shared.Models;
using Mapster;

namespace Hackaton.Services.Services
{
    public class BankInvestmentService : IBankInvestmentService
    {
        private readonly IBankInvestmentRepository _investmentRepository;
        private readonly IClientRepository _clientRepository;

        public BankInvestmentService(IBankInvestmentRepository investmentRepository, IClientRepository clientRepository)
        {
            _investmentRepository = investmentRepository;
            _clientRepository = clientRepository;
        }

        public async Task<Result<List<BankInvestmentResponse>>> GetAllAsync(Guid userId, CancellationToken cancellationToken)
        {
            var investments = await _investmentRepository.GetByUserIdAsync(userId, cancellationToken);
            return investments.Adapt<List<BankInvestmentResponse>>();
        }

        public async Task<Result<List<BankInvestmentResponse>>> GetByClientAsync(
            Guid userId, Guid clientId, CancellationToken cancellationToken)
        {
            if (await _clientRepository.GetByIdAsync(clientId, userId, cancellationToken) is null)
                return BankConnectionErrors.ClientNotFound;

            var investments = await _investmentRepository.GetByClientIdAsync(userId, clientId, cancellationToken);
            return investments.Adapt<List<BankInvestmentResponse>>();
        }
    }
}
