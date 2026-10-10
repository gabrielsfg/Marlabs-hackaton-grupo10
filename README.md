# Hackaton - Grupo 10

Monolito com **backend em ASP.NET Core (.NET 9)** e **frontend em React (JavaScript + Vite)**.

```
Hackaton.sln
src/
├── Hackaton.Api/   -> API .NET (serve o React em producao a partir do wwwroot)
└── frontend/       -> React + Vite
```

## Pre-requisitos

- [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
- [Node.js](https://nodejs.org/) 20.19+ (recomendado a versao LTS)
- Visual Studio 2022 (17.12+), VS Code ou Rider

Na primeira vez, confie no certificado HTTPS de desenvolvimento:

```powershell
dotnet dev-certs https --trust
```

## Rodando em desenvolvimento

### Visual Studio (Windows)

1. Abra o `Hackaton.sln`
2. Aperte **F5** (perfil `https`)

Na primeira build o `npm install` do frontend roda sozinho. Ao iniciar a API, o Vite tambem sobe automaticamente
e o navegador abre em `http://localhost:5173`.

### Linha de comando

```powershell
dotnet run --project src/Hackaton.Api --launch-profile https
```

Ou, se preferir rodar separado (dois terminais):

```powershell
# Terminal 1 - API
dotnet run --project src/Hackaton.Api --launch-profile http

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
| OpenAPI (dev)      | http://localhost:5058/openapi/v1.json |

- Todas as rotas da API ficam sob **`/api`** (ex: `GET /api/health`).
- Em dev, o Vite faz proxy de `/api` para a API, entao no React basta usar `fetch('/api/...')`.
- Em producao, o `dotnet publish` builda o React para `src/Hackaton.Api/wwwroot` e a propria API serve o site.

## Publicando

```powershell
dotnet publish src/Hackaton.Api -c Release -o publish
```
