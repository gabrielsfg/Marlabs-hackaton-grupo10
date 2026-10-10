# Hackaton - Grupo 10

Monolito com **backend em ASP.NET Core (.NET 10)** e **frontend em React (JavaScript + Vite)**.

```
Hackaton.sln
src/
├── backend/
│   ├── Hackaton.Api/       -> Entry point: Controllers, Middleware, Extensions (serve o React em producao a partir do wwwroot)
│   ├── Hackaton.Services/  -> Regras de negocio: Services, Validations, Extensions (DI), Helpers
│   ├── Hackaton.Data/      -> Persistencia: Data (DbContext), Mappings
│   ├── Hackaton.Domain/    -> Entities, Common, Interfaces/Services
│   └── Hackaton.Shared/    -> Dtos/Request, Dtos/Response, Enums, Models, Helpers
└── frontend/               -> React + Vite
    └── src/
        ├── features/       -> uma pasta por funcionalidade (componentes + hooks da feature)
        ├── pages/          -> telas
        ├── components/     -> ui, layout, shared
        └── lib/            -> api (client HTTP), hooks, utils, config
```

Dependencias: `Api -> Services -> Data -> Domain -> Shared`.

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
