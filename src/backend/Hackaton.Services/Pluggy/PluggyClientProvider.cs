using Hackaton.Shared.Models;
using Pluggy.SDK;

namespace Hackaton.Services.Pluggy
{
    // O PluggyAPI guarda a apiKey do primeiro POST /auth, mas ela expira em 2h e o SDK nao renova sozinho.
    // Por isso o cliente e recriado antes de expirar; um unico HttpClient e compartilhado entre as instancias.
    public class PluggyClientProvider
    {
        private static readonly TimeSpan ClientLifetime = TimeSpan.FromMinutes(100);

        private static readonly HttpClient SharedHttpClient = new(new SocketsHttpHandler
        {
            PooledConnectionLifetime = TimeSpan.FromMinutes(15)
        });

        private readonly PluggySettings _settings;
        private readonly TimeProvider _timeProvider;
        private readonly Lock _lock = new();
        private PluggyAPI? _client;
        private DateTimeOffset _createdAt;

        public PluggyClientProvider(PluggySettings settings, TimeProvider timeProvider)
        {
            _settings = settings;
            _timeProvider = timeProvider;
        }

        public PluggyAPI GetClient()
        {
            lock (_lock)
            {
                var now = _timeProvider.GetUtcNow();
                if (_client is null || now - _createdAt >= ClientLifetime)
                {
                    _client = new PluggyAPI(_settings.ClientId, _settings.ClientSecret, SharedHttpClient);
                    _createdAt = now;
                }

                return _client;
            }
        }
    }
}
