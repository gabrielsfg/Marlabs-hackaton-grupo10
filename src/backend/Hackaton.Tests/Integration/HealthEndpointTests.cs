using System.Net;
using Hackaton.Tests.Helpers;

namespace Hackaton.Tests.Integration
{
    public class HealthEndpointTests : IClassFixture<ApiFactory>
    {
        private readonly HttpClient _client;

        public HealthEndpointTests(ApiFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task Health_ReturnsOk()
        {
            var response = await _client.GetAsync("/api/health", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
