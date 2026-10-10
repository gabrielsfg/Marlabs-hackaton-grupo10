using System.Net;
using System.Net.Http.Headers;
using Hackaton.Tests.Helpers;

namespace Hackaton.Tests.Integration
{
    public class AuthorizationTests : IClassFixture<ApiFactory>
    {
        private readonly HttpClient _client;

        public AuthorizationTests(ApiFactory factory)
        {
            _client = factory.CreateClient();
        }

        [Fact]
        public async Task GetMe_WithoutToken_ReturnsUnauthorized()
        {
            var response = await _client.GetAsync("/api/users/me", TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Theory]
        [InlineData("GET", "/api/bankconnections")]
        [InlineData("POST", "/api/bankconnections")]
        [InlineData("POST", "/api/bankconnections/0199d5a0-0000-7000-8000-000000000000/sync")]
        [InlineData("GET", "/api/bankinvestments")]
        public async Task BankEndpoints_WithoutToken_ReturnUnauthorized(string method, string url)
        {
            using var request = new HttpRequestMessage(new HttpMethod(method), url);

            var response = await _client.SendAsync(request, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetMe_WithInvalidToken_ReturnsUnauthorized()
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/users/me");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "token-invalido");

            var response = await _client.SendAsync(request, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
