# Hackaton - Grupo 10

Monolito com **backend em ASP.NET Core (.NET 10)** e **frontend em React (JavaScript + Vite)**.

```
Hackaton.sln
src/
├── backend/
│   ├── Hackaton.Api/       -> Entry point: Controllers, Middleware, Extensions (serve o React em producao a partir do wwwroot)
│   ├── Hackaton.Services/  -> Regras de negocio: Services, Validations, MapsterConfigs, Extensions (DI), Helpers
│   ├── Hackaton.Data/      -> Persistencia: Data (DbContext), Mappings (config EF), Repositories
│   ├── Hackaton.Domain/    -> Entities, Common, Interfaces/Services, Interfaces/Repositories
│   └── Hackaton.Shared/    -> Dtos/Request, Dtos/Response, Enums, Models, Helpers
└── frontend/               -> React + Vite
    └── src/
        ├── features/       -> uma pasta por funcionalidade (componentes + hooks da feature)
        ├── pages/          -> telas
        ├── components/     -> ui, layout, shared
        └── lib/            -> api (client HTTP), hooks, utils, config
```

Dependencias: `Api -> Services -> Data -> Domain -> Shared`.

**Padroes de codigo do time (para pessoas e IAs): ver [AGENTS.md](AGENTS.md).**

## Pre-requisitos

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) 20.19+ (recomendado a versao LTS)
- Visual Studio 2026, VS Code (C# Dev Kit) ou Rider 2025.3+ (o Visual Studio 2022 nao suporta .NET 10)

Na primeira vez, confie no certificado HTTPS de desenvolvimento:

```powershell
dotnet dev-certs https --trust
```

## Banco de dados (Supabase)

O banco e um Postgres compartilhado no Supabase, acessado pelo **Session pooler** (IPv4). O `appsettings.json`
tem a connection string **sem a senha**. Cada um configura a string completa localmente, uma vez, via user-secrets
(pegue a senha com o time em privado, nunca commite):

```powershell
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=aws-0-us-east-2.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.equxsufnvywujqczeoiy;Password=SUA_SENHA;SSL Mode=Require" --project src/backend/Hackaton.Api
```

Para testar: `GET /api/health/db` deve responder `{ "status": "ok", "database": "connected" }`.

## Autenticacao (JWT)

Login e cadastro em `POST /api/auth/register` e `POST /api/auth/login`, que devolvem um `accessToken`. As demais
rotas exigem o header `Authorization: Bearer <accessToken>` (no Swagger, botao **Authorize**). O token carrega o Id
do usuario na claim `sub`; nos controllers use `CurrentUserId` para filtrar os dados do usuario logado.

A chave de assinatura nao fica no `appsettings`. Cada um gera a sua localmente, uma vez (minimo 32 caracteres):

```powershell
dotnet user-secrets set "Jwt:Key" "$([Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48)))" --project src/backend/Hackaton.Api
```

## Open Finance (Pluggy)

Usamos o plano gratuito (**Meu Pluggy**) so para os **investimentos** (acoes, ETFs, renda fixa...). As contas sao
conectadas no site do Meu Pluggy e ligadas a aplicacao no Dashboard pelo conector **MeuPluggy**; a API so **le** os
dados e o backend grava no nosso banco. O itemId e cadastrado na mao (no produto real o assessor pediria o
consentimento ao cliente pelo Pluggy Connect, que e do plano pago).

1. Credenciais da aplicacao (Dashboard > Aplicacoes), uma vez por maquina:

   ```powershell
   dotnet user-secrets set "Pluggy:ClientId" "SEU_CLIENT_ID" --project src/backend/Hackaton.Api
   dotnet user-secrets set "Pluggy:ClientSecret" "SEU_CLIENT_SECRET" --project src/backend/Hackaton.Api
   ```

   Nao precisa da API key: o SDK faz o `POST /auth` sozinho (e o backend renova antes das 2h de validade).

2. Fluxo (todas as rotas exigem o token do login):

   | Rota | O que faz |
   |------|-----------|
   | `POST /api/bankconnections` `{ "itemId": "..." }` | Liga um item da Pluggy (Dashboard > Demo > Itens Conectados) ao usuario logado |
   | `GET /api/bankconnections` | Lista as conexoes do usuario |
   | `POST /api/bankconnections/{id}/sync` | Puxa os investimentos da Pluggy e grava/atualiza no banco |
   | `GET /api/bankinvestments` | Carteira salva (acoes, ETFs, renda fixa...) do ultimo sync |

   A carteira salva espelha a atual: posicoes vendidas/resgatadas (que a Pluggy nao retorna mais) sao removidas.
   A Pluggy so atualiza os dados 1x a cada 24h.

## Rodando em desenvolvimento

### Visual Studio (Windows)

1. Abra o `Hackaton.sln`
2. Aperte **F5** (perfil `https`)

Na primeira build o `npm install` do frontend roda sozinho. Ao iniciar a API, o Vite tambem sobe automaticamente
e o navegador abre em `http://localhost:5173`.

### Linha de comando

```powershell
dotnet run --project src/backend/Hackaton.Api --launch-profile https
```

Ou, se preferir rodar separado (dois terminais):

```powershell
# Terminal 1 - API
dotnet run --project src/backend/Hackaton.Api --launch-profile http

# Terminal 2 - Frontend
cd src/frontend
npm install
npm run dev
```

## Como as partes conversam

| O que              | Endereco                          |
|--------------------|-----------------------------------|
| Frontend (Vite)    | http://localhost:5173             |
| API (HTTP)         | http://localhost:5058             |
| API (HTTPS)        | https://localhost:7024            |
| Swagger (dev)      | http://localhost:5058/swagger         |

- Todas as rotas da API ficam sob **`/api`** (ex: `GET /api/health`).
- Em dev, o Vite faz proxy de `/api` para a API, entao no React basta usar `fetch('/api/...')`.
- Em producao, o `dotnet publish` builda o React para `src/backend/Hackaton.Api/wwwroot` e a propria API serve o site.

## Publicando

```powershell
dotnet publish src/backend/Hackaton.Api -c Release -o publish
```
