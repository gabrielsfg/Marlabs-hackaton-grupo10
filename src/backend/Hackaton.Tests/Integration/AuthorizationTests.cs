using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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

        [Fact]
        public async Task Login_WithValidCredentials_ReturnsToken()
        {
            using var registerResponse = await _client.PostAsJsonAsync("/api/auth/register", new
            {
                name = "Maria Silva",
                email = "maria@email.com",
                cpf = "52998224725",
                phone = "11987654321",
                password = "Senha123"
            }, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, registerResponse.StatusCode);

            using var loginResponse = await _client.PostAsJsonAsync("/api/auth/login", new
            {
                email = "MARIA@email.com",
                password = "Senha123"
            }, TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
            using var loginBody = await JsonDocument.ParseAsync(
                await loginResponse.Content.ReadAsStreamAsync(TestContext.Current.CancellationToken),
                cancellationToken: TestContext.Current.CancellationToken);
            Assert.False(string.IsNullOrWhiteSpace(loginBody.RootElement.GetProperty("accessToken").GetString()));
            Assert.Equal("maria@email.com", loginBody.RootElement.GetProperty("user").GetProperty("email").GetString());

            var invalidCredentials = new[]
            {
                new { email = "naoexiste@email.com", password = "Senha123" },
                new { email = "maria@email.com", password = "SenhaErrada123" }
            };

            foreach (var credentials in invalidCredentials)
            {
                using var response = await _client.PostAsJsonAsync("/api/auth/login", credentials, TestContext.Current.CancellationToken);
                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

                using var errorBody = await JsonDocument.ParseAsync(
                    await response.Content.ReadAsStreamAsync(TestContext.Current.CancellationToken),
                    cancellationToken: TestContext.Current.CancellationToken);
                Assert.Equal("Auth.InvalidCredentials", errorBody.RootElement.GetProperty("title").GetString());
                Assert.Equal("E-mail ou senha invalidos", errorBody.RootElement.GetProperty("detail").GetString());
            }
        }
    }
}
