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

## Frontend: IA e Google Agenda

O frontend usa duas integracoes que precisam de chaves num arquivo `src/frontend/.env` (ja ignorado pelo Git,
nunca commite). Pegue os valores com o time em privado:

```env
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
VITE_GROQ_API_KEY=sua-chave-da-groq
```

| Variavel | Para que serve |
|----------|----------------|
| `VITE_GOOGLE_CLIENT_ID` | Login com Google para criar eventos no Google Agenda (escopo `calendar.events`) |
| `VITE_GROQ_API_KEY` | IA (Groq) que extrai os dados do cliente a partir de uma transcricao `.txt`/`.md` |

Depois de criar ou alterar o `.env`, reinicie o `npm run dev` (o Vite so le o arquivo ao iniciar).

- **Google Agenda:** no cenario da simulacao todos os assessores usam conta Gmail. Lembretes do Dashboard viram
  eventos de dia inteiro na data escolhida; datas do cliente (aniversarios etc.) viram eventos anuais de dia inteiro.
- **Atencao, chave da Groq:** a chamada a IA e feita direto do navegador, entao a `VITE_GROQ_API_KEY` vai embutida no
  JavaScript e qualquer pessoa com o DevTools consegue ve-la; os dados da transcricao tambem vao do navegador para a Groq.
  Decisao consciente para a demo do hackathon: use uma chave so para o projeto, nao publique o site e revogue a chave
  no painel da Groq ao final. Para producao, a chamada deve passar por um endpoint da API com a chave no user-secrets.
