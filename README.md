# Hackaton - Grupo 10 · Central do Assessor

Plataforma para o assessor de investimentos acompanhar a carteira dos seus clientes: custódia consolidada via
Open Finance (Pluggy), alertas de FGC e vencimentos, patrimônio físico, cadastro de clientes a partir de
transcrições (IA), lembretes no Google Agenda e um módulo de notícias e eventos corporativos.

Monolito com **backend em ASP.NET Core (.NET 10)** e **frontend em React 19 (JavaScript + Vite)**, mais um módulo
de notícias em **Python** (`script_noticias`).

**Padrões de código do time (para pessoas e IAs): ver [AGENTS.md](AGENTS.md).**

## Sumário

- [Como acessar (login)](#como-acessar-login)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Pré-requisitos](#pré-requisitos)
- [Configuração inicial (uma vez por máquina)](#configuração-inicial-uma-vez-por-máquina)
- [Rodando em desenvolvimento](#rodando-em-desenvolvimento)
- [Banco de dados (Supabase)](#banco-de-dados-supabase)
- [Autenticação (JWT)](#autenticação-jwt)
- [Rotas da API](#rotas-da-api)
- [Open Finance (Pluggy)](#open-finance-pluggy)
- [Frontend](#frontend)
- [Módulo de notícias (script_noticias)](#módulo-de-notícias-script_noticias)
- [Testes](#testes)
- [Publicando](#publicando)

## Como acessar (login)

**Não existe tela de cadastro.** Isso é proposital: num produto real, a conta do assessor é criada internamente
pela instituição (com os vínculos e permissões dele), e não pelo próprio usuário. Por isso o login não oferece
"criar conta". Há duas formas de testar:

### 1. Conta de demonstração (sem configurar nada)

A tela de login já abre preenchida com a conta de demonstração:

| E-mail | Senha |
|--------|-------|
| `rafael.mendes@demo.com` | `demo1234` |

Ela entra **sem chamar a API**: todas as telas usam os dados fictícios de `src/frontend/src/data/mockData.js`
(aparece o selo **Demonstração** na barra). É o jeito mais rápido de conhecer o produto inteiro, incluindo alertas,
lembretes e notícias do Dashboard.

### 2. Conta real (dados do banco e do Open Finance)

Crie o usuário pelo **Swagger** (`http://localhost:5058/swagger`), com a API rodando e o banco configurado:

1. `POST /api/auth/register` com o corpo abaixo (o endpoint é público, não precisa de token):

   ```json
   {
     "name": "Seu Nome",
     "email": "seu.email@exemplo.com",
     "cpf": "52998224725",
     "phone": "11987654321",
     "password": "Senha123"
   }
   ```

   - **CPF** precisa ser válido e único no banco (que é compartilhado pelo time): se der `User.CpfAlreadyExists`,
     use outro CPF válido de teste. O e-mail também é único.
   - **Senha**: mínimo de 8 caracteres, com pelo menos uma letra e um número.
   - **Telefone**: de 10 a 13 dígitos.

2. Faça login na tela com esse e-mail e senha. As telas passam a usar os dados reais da API (clientes, carteiras,
   investimentos). Para chamar as rotas pelo Swagger, use `POST /api/auth/login`, copie o `accessToken` e clique em
   **Authorize**.

Cada assessor só enxerga os próprios clientes e carteiras.

## Estrutura do repositório

```
Hackaton.sln
global.json                    -> fixa o SDK do .NET 10 e o runner de testes (Microsoft.Testing.Platform)
AGENTS.md / CLAUDE.md          -> padroes de codigo do time (o CLAUDE.md so aponta para o AGENTS.md)
src/
├── backend/
│   ├── Hackaton.Api/          -> Entry point: Controllers, Extensions (JWT, Pluggy), Program.cs; serve o React em producao (wwwroot)
│   ├── Hackaton.Services/     -> Regras de negocio: Services (+ Errors), Pluggy (SDK), Validations, MapsterConfigs, Extensions (DI), Helpers
│   ├── Hackaton.Data/         -> Persistencia: Data (DbContext), Mappings (config EF), Repositories, Migrations
│   ├── Hackaton.Domain/       -> Entities, Common (BaseEntity), Interfaces/Services, Interfaces/Repositories
│   ├── Hackaton.Shared/       -> Dtos/Request, Dtos/Response, Enums, Models (Result, Error, settings), Helpers
│   └── Hackaton.Tests/        -> xUnit v3: Unit (services, helpers) e Integration (WebApplicationFactory + banco em memoria)
└── frontend/                  -> React + Vite + Tailwind
    └── src/
        ├── pages/             -> telas: Login, Dashboard, Clients, ClientProfile, Simulation
        ├── components/        -> Navbar e componentes compartilhados
        ├── features/          -> chamadas por funcionalidade: auth, clients (API real + demoApi do modo demonstracao)
        ├── lib/               -> api/client.js (axios + token), session.js (sessao demo x real)
        ├── utils/             -> investments (Pluggy -> graficos), googleCalendar, extractFromTranscription (IA)
        └── data/mockData.js   -> dados ficticios da conta de demonstracao
script_noticias/
└── news_module/               -> Python: coleta diaria do RSS do InfoMoney e de eventos IPE da CVM, com resumo por LLM
```

Dependências entre os projetos do backend: `Api -> Services -> Data -> Domain -> Shared`.

## Pré-requisitos

- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) 20.19+ (recomendado a versão LTS)
- Visual Studio 2026, VS Code (C# Dev Kit) ou Rider 2025.3+ (o **Visual Studio 2022 não suporta .NET 10**)
- Ferramenta do EF Core, para aplicar migrations: `dotnet tool install -g dotnet-ef` (ou `dotnet tool update -g dotnet-ef`)
- Opcional, só para o módulo de notícias: Python 3.11+

Na primeira vez, confie no certificado HTTPS de desenvolvimento:

```powershell
dotnet dev-certs https --trust
```

## Configuração inicial (uma vez por máquina)

Nenhum segredo fica no repositório: cada um configura localmente. Pegue os valores com o time **em privado**.

### Backend (user-secrets)

```powershell
# Banco (Supabase) - ver a secao "Banco de dados"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=aws-0-us-east-2.pooler.supabase.com;Port=5432;Database=postgres;Username=postgres.equxsufnvywujqczeoiy;Password=SUA_SENHA;SSL Mode=Require" --project src/backend/Hackaton.Api

# Chave de assinatura do JWT (cada um gera a sua, minimo 32 caracteres)
dotnet user-secrets set "Jwt:Key" "$([Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48)))" --project src/backend/Hackaton.Api

# Pluggy (so para quem for usar o Open Finance) - Dashboard da Pluggy > Aplicacoes
dotnet user-secrets set "Pluggy:ClientId" "SEU_CLIENT_ID" --project src/backend/Hackaton.Api
dotnet user-secrets set "Pluggy:ClientSecret" "SEU_CLIENT_SECRET" --project src/backend/Hackaton.Api
```

| Segredo | Obrigatório? | Sem ele |
|---------|--------------|---------|
| `ConnectionStrings:DefaultConnection` | Sim, para a conta real | A API sobe, mas login, clientes e carteiras falham (confira com `GET /api/health/db`) |
| `Jwt:Key` | Sim, para a conta real | Login e rotas protegidas falham com mensagem pedindo a chave |
| `Pluggy:ClientId` / `Pluggy:ClientSecret` | Só para o Open Finance | Só as rotas da Pluggy falham; o resto funciona |

### Frontend (`src/frontend/.env`)

```env
VITE_GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
VITE_GROQ_API_KEY=sua-chave-da-groq
```

O arquivo já é ignorado pelo Git. Depois de criar ou alterar o `.env`, reinicie o `npm run dev` (o Vite só lê o
arquivo ao iniciar). Detalhes em [Frontend](#frontend).

## Rodando em desenvolvimento

### Visual Studio (Windows)

1. Abra o `Hackaton.sln`
2. Aperte **F5** (perfil `https`)

Na primeira build o `npm install` do frontend roda sozinho. Ao iniciar a API, o Vite também sobe automaticamente e o
navegador abre em `http://localhost:5173`.

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

> Só quer ver as telas com a conta de demonstração? Basta o terminal 2 (frontend): ela não usa a API.

### Endereços

| O que           | Endereço                           |
|-----------------|------------------------------------|
| Frontend (Vite) | http://localhost:5173              |
| API (HTTP)      | http://localhost:5058              |
| API (HTTPS)     | https://localhost:7024             |
| Swagger (dev)   | http://localhost:5058/swagger      |

- Todas as rotas da API ficam sob **`/api`** (ex: `GET /api/health`).
- Em dev, o Vite faz proxy de `/api` para a API, então o React chama `'/api/...'` direto.
- Em produção, o `dotnet publish` builda o React para `src/backend/Hackaton.Api/wwwroot` e a própria API serve o site.

## Banco de dados (Supabase)

O banco é um Postgres **compartilhado por todo o time** no Supabase, acessado pelo **Session pooler** (IPv4; a
conexão "direct" do Supabase é só IPv6 e costuma falhar). O `appsettings.json` tem a connection string **sem a
senha**; a completa vai no user-secrets (ver [Configuração inicial](#configuração-inicial-uma-vez-por-máquina)).

Para testar: `GET /api/health/db` deve responder `{ "status": "ok", "database": "connected" }`.

### Migrations

Uma migration aplicada afeta todo mundo. Antes de criar ou aplicar, siga as regras do [AGENTS.md](AGENTS.md)
(dar `git pull` na `master`, avisar o grupo antes do `database update`, nunca editar uma migration já aplicada).

```powershell
# Aplicar as migrations pendentes
dotnet ef database update --project src/backend/Hackaton.Data --startup-project src/backend/Hackaton.Api

# Criar uma nova
dotnet ef migrations add NomeDescritivo --project src/backend/Hackaton.Data --startup-project src/backend/Hackaton.Api
```

| Tabela | O que guarda |
|--------|--------------|
| `Users` | Assessores (login) |
| `Clients` | Clientes de cada assessor (`AdvisorId`) |
| `BankConnections` | Carteiras da Pluggy (item do Meu Pluggy) do assessor, opcionalmente vinculadas a um cliente (`ClientId`) |
| `BankInvestments` | Posições de cada carteira, espelhadas a cada sync |

## Autenticação (JWT)

`POST /api/auth/login` (e o `register`, ver [Como acessar](#como-acessar-login)) devolve um `accessToken` válido por
8 horas. As demais rotas exigem o header `Authorization: Bearer <accessToken>` (no Swagger, botão **Authorize**).
O token carrega o Id do usuário na claim `sub`; nos controllers use `CurrentUserId` para filtrar os dados do
usuário logado.

No frontend, o token fica no `sessionStorage` (vale só para a aba aberta: abrir outra aba ou fechar o navegador pede
login de novo). Toda a sessão é controlada por `src/frontend/src/lib/session.js`.

## Rotas da API

Todas exigem token, exceto as marcadas como públicas.

| Rota | O que faz |
|------|-----------|
| `GET /api/health` · `GET /api/health/db` | Saúde da API e da conexão com o banco (públicas) |
| `POST /api/auth/register` | Cria um usuário assessor (pública; sem tela, ver [Como acessar](#como-acessar-login)) |
| `POST /api/auth/login` | Login; devolve `accessToken` e o usuário (pública) |
| `GET /api/users/me` | Dados do usuário logado |
| `GET /api/clients?search=&profile=&onlyWithAlerts=` | Clientes do assessor |
| `GET /api/clients/{id}` | Um cliente |
| `POST /api/clients` · `PUT /api/clients/{id}` · `DELETE /api/clients/{id}` | Cria, edita e exclui cliente |
| `GET /api/clients/{id}/investments` | Posições das carteiras vinculadas ao cliente |
| `POST /api/bankconnections` `{ "itemId": "..." }` | Liga um item da Pluggy ao assessor logado |
| `GET /api/bankconnections` | Carteiras do assessor |
| `PUT /api/bankconnections/{id}/client` `{ "clientId": "..." }` | Vincula a carteira a um cliente (`null` desvincula) |
| `POST /api/bankconnections/{id}/sync` | Puxa os investimentos da Pluggy e grava/atualiza no banco |
| `GET /api/bankinvestments` | Todas as posições salvas do assessor |

## Open Finance (Pluggy)

Usamos o plano gratuito (**Meu Pluggy**) só para os **investimentos** (ações, ETFs, renda fixa...). A API da Pluggy
só é **lida**; o backend grava as posições no nosso banco. No produto real, o assessor pediria o consentimento ao
cliente pelo Pluggy Connect (plano pago); aqui o item é cadastrado na mão.

### Ligar uma conta (uma vez por banco/corretora)

1. Conecte o banco no site **meu.pluggy.ai**.
2. No **Dashboard da Pluggy** > Aplicações > sua aplicação > **Demo** > **Conectar Conta**, escolha o conector
   **MeuPluggy** (não escolha o banco direto nem o Sandbox). Se ele não aparecer, habilite em
   **Customização > Conectores > Direct Connectors**.
3. Copie o **itemId** em **Itens Conectados**.

Não precisa da API key da Pluggy: o SDK faz o `POST /auth` sozinho a partir do Client ID e do Client Secret (e o
backend recria o cliente antes das 2h de validade da chave).

### Levar os investimentos para a tela de um cliente (pelo Swagger)

1. `POST /api/bankconnections` com `{ "itemId": "..." }` → guarde o `id` da carteira (não é o itemId).
2. `POST /api/bankconnections/{id}/sync` → grava as posições.
3. `GET /api/clients` → copie o `id` do cliente.
4. `PUT /api/bankconnections/{id}/client` com `{ "clientId": "..." }`.
5. Abra o cliente na tela: custódia, composição por tipo, concentração no FGC e vencimentos passam a vir da
   carteira real, e o patrimônio financeiro do cliente vira a soma das posições.

Observações:

- A carteira salva espelha a atual: posições vendidas/resgatadas (que a Pluggy não retorna mais) são removidas.
- A corretora de origem (ex: XP) é lida das contas do item, porque pelo MeuPluggy o conector é sempre "MeuPluggy".
- A Pluggy só atualiza os dados 1 vez a cada 24h.
- Limites do plano gratuito: até 5 conexões, todas do mesmo titular.

## Frontend

### Conta de demonstração x conta real

| | Conta de demonstração | Conta real |
|---|---|---|
| Login | Não chama a API | `POST /api/auth/login` |
| Clientes e perfil | `mockData.js` em memória (criar/editar/excluir vale até recarregar a página) | API |
| Investimentos do perfil | Posições do `mockData.js` | Carteiras da Pluggy vinculadas ao cliente |
| Dashboard (alertas, lembretes, clientes afetados por notícias) | `mockData.js` | Começam vazios (ainda não têm API) |

A troca fica em `src/frontend/src/lib/session.js` (tipo de sessão) e `src/frontend/src/features/clients/api.js`
(demo ou API); as telas não sabem em qual modo estão.

### IA e Google Agenda

| Variável (`src/frontend/.env`) | Para que serve |
|--------------------------------|----------------|
| `VITE_GOOGLE_CLIENT_ID` | Login com Google para criar eventos no Google Agenda (escopo `calendar.events`) |
| `VITE_GROQ_API_KEY` | IA (Groq) que extrai os dados do cliente a partir de uma transcrição `.txt`/`.md` |

- **Cadastro por transcrição:** em Clientes > Novo cliente, envie a transcrição da conversa; a IA preenche nome,
  perfil, CPF e e-mail e mostra insights, familiares, objetivos, bens e datas citados (esses extras não são salvos
  pela API de clientes; ficam como apoio ao assessor).
- **Google Agenda:** no cenário da simulação todos os assessores usam conta Gmail. Lembretes do Dashboard viram
  eventos de dia inteiro na data escolhida; datas do cliente (aniversários etc.) viram eventos anuais de dia inteiro.
- **Atenção, chave da Groq:** a chamada à IA é feita direto do navegador, então a `VITE_GROQ_API_KEY` vai embutida no
  JavaScript e qualquer pessoa com o DevTools consegue vê-la; os dados da transcrição também vão do navegador para a
  Groq. Decisão consciente para a demo do hackathon: use uma chave só para o projeto, não publique o site e revogue a
  chave no painel da Groq ao final. Para produção, a chamada deve passar por um endpoint da API com a chave no
  user-secrets.

## Módulo de notícias (script_noticias)

Script Python independente que coleta diariamente o RSS do InfoMoney e os eventos IPE da CVM e gera um resumo com LLM
(Groq). Ele ainda não está ligado ao frontend: as notícias do Dashboard vêm do `mockData.js`.

```bash
cd script_noticias
python3 -m venv .venv
source .venv/bin/activate          # Windows: .\.venv\Scripts\Activate.ps1
cd news_module
python -m pip install -r requirements.txt
cp .env.example .env               # preencha LLM_API_KEY com a chave da Groq
python -m app.run_daily --dry-run  # coleta sem chamar o LLM
```

Instalação no Windows, variáveis, saídas (`data/runs/AAAA-MM-DD/`), agendamento (cron e GitHub Actions) e a
demonstração com Fatos Relevantes (`python -m app.run_demo`) estão em
[script_noticias/news_module/README.md](script_noticias/news_module/README.md).

## Testes

```powershell
# Backend (xUnit v3, banco em memoria: nao toca o Supabase)
dotnet test --solution Hackaton.sln

# Frontend (lint e build)
cd src/frontend
npm run lint
npm run build

# Modulo de noticias (a partir de script_noticias/news_module, com o venv ativo)
python -m pytest
```

## Publicando

```powershell
dotnet publish src/backend/Hackaton.Api -c Release -o publish
```
