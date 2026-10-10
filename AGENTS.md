# AGENTS.md

Regras do projeto para **qualquer** assistente de IA (Claude, Copilot, Cursor, Codex, Gemini...) e para humanos.
O time tem 5 pessoas usando IAs diferentes: seguir este arquivo e o que mantem o codigo consistente.
Na duvida, copie o padrao de um arquivo existente em vez de inventar um novo. Se uma regra daqui conflitar com
um pedido, siga a regra e avise quem pediu.

Visao geral do projeto, setup e como rodar: ver [README.md](README.md).

## Regras gerais

- **Codigo sempre em ingles**: classes, metodos, variaveis, propriedades, arquivos, pastas, rotas, tabelas, colunas,
  query keys, nomes de branch.
- **Portugues** apenas em: texto exibido ao usuario (labels, mensagens de erro/validacao), comentarios e mensagens de commit.
- Comentarios: poucos, so quando necessarios e sempre em portugues. Ver [Comentarios](#comentarios).
- Nao adicione pacotes NuGet/npm novos sem combinar com o time. Os ja escolhidos estao listados abaixo.
- Nao refatore nem reformate codigo fora do escopo da tarefa (gera conflito de merge para os outros).
- Nunca commite segredos (senhas, connection strings completas, tokens). Use `dotnet user-secrets`.
- O time usa Windows: comandos de exemplo em PowerShell, nada de scripts que so rodam em bash.

## Comentarios

IAs tendem a comentar demais. Neste projeto o padrao e **codigo autoexplicativo e quase nenhum comentario**.
Se voce sentiu vontade de comentar, primeiro tente melhorar o nome da variavel/metodo ou extrair um metodo.

**Sempre em portugues**, curtos (uma linha, de preferencia), sem acentuacao obrigatoria.

Comente **somente** quando o codigo nao consegue dizer sozinho:

- **Por que** foi feito assim, quando nao e obvio (decisao, limitacao, workaround).
- Regra de negocio ou exigencia externa que nao da para deduzir do codigo (limite da API do Pluggy, regra do hackathon).
- Comportamento surpreendente que alguem poderia "consertar" e quebrar.
- `TODO:` com o que falta, quando algo ficou pendente de proposito.

**Nao** comente:

- O que o codigo faz linha a linha (`// busca o usuario`, `// retorna o resultado`, `// valida o request`).
- O obvio pelo nome (`// construtor`, `// propriedade Name`, `// injeta o repository`).
- Separadores e banners (`// ===== Metodos publicos =====`, `#region`).
- Codigo comentado: apague, o git guarda o historico.
- Historico de alteracao (`// alterado por Fulano`, `// antes era X`): isso vai no commit.
- O caminho do arquivo no topo do arquivo (`// Hackaton.Api/Controllers/UsersController.cs`).
- XML docs (`/// <summary>`) em todo metodo: so em algo realmente reutilizavel e nao obvio.
- Explicacoes para quem pediu a tarefa (`// aqui eu mudei para...`, `// conforme solicitado`): isso vai na resposta, nao no codigo.

```csharp
// Ruim: repete o codigo
// Verifica se o usuario existe
if (user is null)
    return UserErrors.NotFound;

// Bom: explica um porque que o codigo nao mostra
// O Pluggy free so atualiza transacoes 1x por dia, por isso o cache de 24h
var cacheDuration = TimeSpan.FromHours(24);
```

Ao **editar** codigo existente: nao adicione comentarios explicando a sua alteracao e remova comentarios que ficaram
desatualizados por causa dela.

---

## Backend (.NET 10 / ASP.NET Core)

### Camadas e responsabilidades

Dependencias: `Api -> Services -> Data -> Domain -> Shared`. Nunca referencie uma camada "de cima".

| Camada | Pasta | Responsabilidade | NAO pode |
|---|---|---|---|
| Controller | `Hackaton.Api/Controllers` | Receber a requisicao, **chamar** o validator do FluentValidation, chamar o service, converter o `Result` em HTTP | Ter qualquer `if` de validacao ou regra de negocio, acessar `DbContext` ou repository, fazer mapeamento |
| Service | `Hackaton.Services/Services` | **Toda** regra de negocio; orquestra repositories; mapeia Entity <-> DTO | Acessar `DbContext` direto, escrever LINQ/SQL de banco, conhecer HTTP (`IActionResult`, status code) |
| Repository | `Hackaton.Data/Repositories` | **Toda** consulta/escrita no banco (LINQ ou SQL) | Ter regra de negocio, retornar `IQueryable`, retornar DTO |
| Entity | `Hackaton.Domain/Entities` | Modelo do banco | Ser exposta na API |
| DTO | `Hackaton.Shared/Dtos/Request` e `Dtos/Response` | Contrato da API | Ter logica |

Fluxo de uma requisicao:

```
Controller -> Validator (FluentValidation) -> Service -> Repository -> DbContext
                                                 |
                                                 +-> retorna Result<ResponseDto> -> Controller converte em HTTP
```

### Onde fica cada coisa

| O que | Onde | Nome |
|---|---|---|
| Entity | `Hackaton.Domain/Entities/` | `User` |
| Interface de repository | `Hackaton.Domain/Interfaces/Repositories/` | `IUserRepository` |
| Interface de service | `Hackaton.Domain/Interfaces/Services/` | `IUserService` |
| Configuracao EF da entity | `Hackaton.Data/Mappings/` | `UserMapping : IEntityTypeConfiguration<User>` |
| Repository | `Hackaton.Data/Repositories/` | `UserRepository` |
| Service | `Hackaton.Services/Services/` | `UserService` |
| Validator | `Hackaton.Services/Validations/` | `CreateUserRequestValidator` |
| Config customizada do Mapster | `Hackaton.Services/MapsterConfigs/` | `UserMapsterConfig : IRegister` |
| Registro de DI | `Hackaton.Services/Extensions/ServiceCollectionExtensions.cs` | adicionar no `AddApplicationServices` |
| Request DTO | `Hackaton.Shared/Dtos/Request/` | `CreateUserRequest`, `UpdateUserRequest` |
| Response DTO | `Hackaton.Shared/Dtos/Response/` | `UserResponse` |
| Enum | `Hackaton.Shared/Enums/` | `TransactionType` |
| Controller | `Hackaton.Api/Controllers/` | `UsersController` (plural) |
| Teste do service | `Hackaton.Tests/Unit/Services/` | `UserServiceTests` |

### Estilo de codigo C#

- Namespaces em bloco (`namespace X { ... }`), igual aos arquivos existentes. Namespace = caminho da pasta.
- **Uma classe/record/enum/interface por arquivo**, com o mesmo nome do arquivo.
- Injecao de dependencia por construtor, guardando em campos `private readonly` com prefixo `_` (`_userRepository`).
- `PascalCase` para tipos, metodos e propriedades; `camelCase` para parametros e variaveis locais; interfaces com `I`.
- Nullable esta habilitado: trate os warnings, nao use `!` para silenciar sem motivo.
- `var` quando o tipo e obvio pelo lado direito.

### Async

- Todo metodo que toca I/O e `async`, retorna `Task`/`Task<T>` e termina com `Async`.
- **`CancellationToken cancellationToken` e o ultimo parametro** e e repassado do controller ate o EF Core.
- Nunca use `.Result`, `.Wait()` ou `async void`.

### DTOs

- A API **nunca** recebe nem retorna Entity: sempre DTO.
- DTOs de entrada em `Dtos/Request` (sufixo `Request`), de saida em `Dtos/Response` (sufixo `Response`).
- **DTOs sao unicos e nao aninham tipos de outras camadas**: se um DTO tem uma propriedade que e outro objeto,
  esse objeto tambem e um DTO proprio, em arquivo proprio. Nada de classe aninhada, nada de Entity dentro de DTO.
- DTOs sao `class` com propriedades `{ get; set; }`, sem logica.
- Colecoes como `List<T>` inicializadas com `[]`.

`Hackaton.Shared/Dtos/Response/AccountResponse.cs`:

```csharp
namespace Hackaton.Shared.Dtos.Response
{
    public class AccountResponse
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Balance { get; set; }
        public BankResponse Bank { get; set; } = new();
        public List<TransactionResponse> Transactions { get; set; } = [];
    }
}
```

### Entities e banco (EF Core + Postgres/Supabase)

- Toda entity herda de `BaseEntity` (`Id`, `CreatedAt`, `UpdatedAt`). `CreatedAt`/`UpdatedAt` sao preenchidos
  automaticamente pelo `ApplicationDbContext`: nao preencha na mao.
- `Id` e `Guid` (UUID v7), gerado no proprio `BaseEntity`: nunca use `int` sequencial como id (da para adivinhar
  ids de outros usuarios). Chaves estrangeiras tambem sao `Guid` (`ClientId`), e rotas usam `{id:guid}`.
- Nomes de tabela e coluna no **padrao do EF (PascalCase)**. Em SQL escrito a mao, use aspas: `SELECT "Name" FROM "Users"`.
- Configuracao da entity (tamanho, indices, relacionamentos) via `IEntityTypeConfiguration<T>` em `Data/Mappings`,
  nunca por Data Annotations na entity. O `ApplicationDbContext` ja aplica tudo de `Data/Mappings` automaticamente.
- Adicione o `DbSet<T>` no `ApplicationDbContext`.
- Datas sempre em UTC (`DateTime.UtcNow`). Dinheiro sempre `decimal`.

### Migrations (banco e COMPARTILHADO entre os 5)

O Supabase e um banco unico para todo o time. Uma migration aplicada afeta todo mundo.

- De `git pull` na `master` antes de criar uma migration.
- Avise no grupo **antes** de rodar `database update`.
- Nunca edite nem apague uma migration que ja foi aplicada/commitada: crie outra.
- Migration vai no mesmo PR da entity que a gerou. Nome em ingles e descritivo: `AddAccountsTable`, `AddEmailToUsers`.

```powershell
dotnet ef migrations add AddAccountsTable --project src/backend/Hackaton.Data --startup-project src/backend/Hackaton.Api
dotnet ef database update --project src/backend/Hackaton.Data --startup-project src/backend/Hackaton.Api
```

### Entity x DTO

A Entity **nunca sai do service**. Ela so existe no caminho `Repository -> Service` (e no sentido inverso para gravar):

```
Controller  <-- DTO -->  Service  <-- Entity -->  Repository
```

- O repository retorna Entity porque o service precisa dela para aplicar regra de negocio e para alterar e salvar
  (o EF so atualiza o que ele esta rastreando). Se o repository devolvesse DTO, o mapeamento iria para a camada de
  dados e a atualizacao viraria "DTO -> busca de novo -> copia campos".
- Metodos **publicos** de service recebem e retornam **so DTOs** (`Result<UserResponse>`), nunca Entity. Assim, entre
  services e entre service e controller, so trafega DTO.
- Se um service precisa de algo de outro dominio, ele chama o **service** desse dominio (e recebe DTO), nao o
  repository dele.

### Repository

- **Um repository por entity**, com metodos especificos (`GetByEmailAsync`, `ListByUserIdAsync`). Sem repository generico.
- Interface em `Domain/Interfaces/Repositories`, implementacao em `Data/Repositories`.
- Retorna **Entity** (ou `null` / lista vazia). Nunca DTO, nunca `IQueryable`, nunca `Result`.
  O repository trabalha com o modelo do banco; quem converte para DTO e o service (ver [Entity x DTO](#entity-x-dto)).
- Leitura usa `AsNoTracking()`. Metodos que buscam para alterar (`GetByIdForUpdateAsync`) nao usam.
- Escrita: `AddAsync`, `Update`, `Remove` + `SaveChangesAsync`. Como o `DbContext` e scoped, o `SaveChangesAsync`
  de qualquer repository salva tudo que foi alterado na requisicao: o **service** decide quando salvar.

`Hackaton.Domain/Interfaces/Repositories/IUserRepository.cs`:

```csharp
namespace Hackaton.Domain.Interfaces.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
        Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken);
        Task AddAsync(User user, CancellationToken cancellationToken);
        Task SaveChangesAsync(CancellationToken cancellationToken);
    }
}
```

`Hackaton.Data/Repositories/UserRepository.cs`:

```csharp
namespace Hackaton.Data.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;

        public UserRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public Task<User?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
            _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        public Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken) =>
            _context.Users.AnyAsync(u => u.Email == email, cancellationToken);

        public async Task AddAsync(User user, CancellationToken cancellationToken) =>
            await _context.Users.AddAsync(user, cancellationToken);

        public Task SaveChangesAsync(CancellationToken cancellationToken) =>
            _context.SaveChangesAsync(cancellationToken);
    }
}
```

### Erros: Result pattern

Erros **esperados** (nao encontrado, regra de negocio violada, conflito) **nao lancam exception**: o service
retorna um `Result`. Exceptions ficam so para erros inesperados (banco fora, bug), que viram 500 pelo
`UseExceptionHandler` + `ProblemDetails` ja configurados.

Classes prontas, **use estas, nao crie outras**:

- `Hackaton.Shared/Models/Result.cs`: `Result` (sem valor) e `Result<T>` (com valor)
- `Hackaton.Shared/Models/Error.cs`: `Error(Code, Message, Type)` com fabricas `Error.NotFound(...)`, `Error.Conflict(...)`,
  `Error.Validation(...)`, `Error.Unauthorized(...)`, `Error.Forbidden(...)`, `Error.Failure(...)`
- `Hackaton.Shared/Enums/ErrorType.cs`

Regras:

- Todo metodo publico de service retorna `Task<Result<TResponse>>` ou `Task<Result>` (quando nao ha retorno).
- `Code` em ingles no formato `Entidade.Motivo` (`"User.NotFound"`, `"Account.InsufficientBalance"`).
  `Message` em portugues, e o texto que o usuario vai ver.
- Erros reutilizados de uma entidade podem ficar numa classe estatica `UserErrors` em `Hackaton.Services/Services/Errors/`.
- Conversoes implicitas: dentro do service da para fazer `return response;` ou `return Error.NotFound(...);` direto.

### Mapeamento (Mapster)

- Mapeamento Entity <-> DTO **so no service**, com Mapster: `user.Adapt<UserResponse>()`, `request.Adapt<User>()`.
- Propriedades com o mesmo nome mapeiam sozinhas. Quando precisar de regra (nome diferente, campo calculado),
  crie uma classe `IRegister` em `Hackaton.Services/MapsterConfigs/` (ja e carregada no startup).

### Service

`Hackaton.Services/Services/UserService.cs`:

```csharp
namespace Hackaton.Services.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<Result<UserResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
        {
            var user = await _userRepository.GetByIdAsync(id, cancellationToken);
            if (user is null)
                return Error.NotFound("User.NotFound", "Usuario nao encontrado");

            return user.Adapt<UserResponse>();
        }

        public async Task<Result<UserResponse>> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken)
        {
            if (await _userRepository.ExistsByEmailAsync(request.Email, cancellationToken))
                return Error.Conflict("User.EmailAlreadyExists", "Ja existe um usuario com este e-mail");

            var user = request.Adapt<User>();
            await _userRepository.AddAsync(user, cancellationToken);
            await _userRepository.SaveChangesAsync(cancellationToken);

            return user.Adapt<UserResponse>();
        }
    }
}
```

### Validacao (FluentValidation)

- Um validator por Request DTO, em `Hackaton.Services/Validations/`, nome `<Request>Validator`.
- Validator faz validacao de **formato** (obrigatorio, tamanho, e-mail valido, valor > 0). Regra que precisa do banco
  (e-mail ja existe, saldo suficiente) fica no **service**.
- Mensagens em portugues com `.WithMessage("...")`.
- Validators sao registrados automaticamente (`AddValidatorsFromAssembly`). Repositories e services **nao**: registre
  em `AddApplicationServices` como `AddScoped`.

```csharp
namespace Hackaton.Services.Validations
{
    public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
    {
        public CreateUserRequestValidator()
        {
            RuleFor(x => x.Name).NotEmpty().WithMessage("Nome e obrigatorio").MaximumLength(100);
            RuleFor(x => x.Email).NotEmpty().EmailAddress().WithMessage("E-mail invalido");
        }
    }
}
```

### Controller

- Herda de `ApiControllerBase` (ja tem `[ApiController]` e rota `api/[controller]`). Nome no plural: `UsersController`.
- Cada action faz so tres coisas: chama o validator via `ValidateAsync` (quando ha body), chama **um** metodo do
  service e devolve com `HandleResult` / `HandleCreated`.
- O controller **nao valida nada por conta propria**: nenhum `if` sobre os dados do request, nenhum
  `ModelState.IsValid`, nenhuma checagem manual. Toda regra de validacao fica no validator; toda regra de negocio no service.
- Rotas REST em ingles e minusculas: `GET api/users/{id}`, `POST api/users`, `PUT api/users/{id}`, `DELETE api/users/{id}`.
- Retorna sempre `Task<IActionResult>`. Erros saem como `ProblemDetails` (400 de validacao, 404, 409...).

```csharp
namespace Hackaton.Api.Controllers
{
    public class UsersController : ApiControllerBase
    {
        private readonly IUserService _userService;
        private readonly IValidator<CreateUserRequest> _createValidator;

        public UsersController(IUserService userService, IValidator<CreateUserRequest> createValidator)
        {
            _userService = userService;
            _createValidator = createValidator;
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
        {
            var result = await _userService.GetByIdAsync(id, cancellationToken);
            return HandleResult(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateUserRequest request, CancellationToken cancellationToken)
        {
            var validation = await ValidateAsync(_createValidator, request, cancellationToken);
            if (validation is not null)
                return validation;

            var result = await _userService.CreateAsync(request, cancellationToken);
            return HandleCreated(result, nameof(GetById), user => new { id = user.Id });
        }
    }
}
```

### Testes

- Todo service novo tem teste unitario em `Hackaton.Tests/Unit/Services/<Service>Tests.cs`.
- xUnit v3 + Moq: mocke os repositories, teste o service. Cubra pelo menos o caminho feliz e cada `Error` retornado.
- Nome do teste: `Metodo_Cenario_ResultadoEsperado` (`CreateAsync_EmailAlreadyExists_ReturnsConflict`).
- Use `TestContext.Current.CancellationToken` como cancellation token.
- Rode antes de abrir PR:

```powershell
dotnet test
```

---

## Frontend (React 19 + Vite, JavaScript)

### Stack

- **JavaScript** (`.jsx` / `.js`), sem TypeScript.
- **Axios** para HTTP, **TanStack Query** para estado de servidor (cache, loading, erro).
- **Tailwind CSS** puro para estilo (sem biblioteca de componentes; componentes reutilizaveis ficam em `components/ui`).
- **React Router** para rotas.
- Lint: `npm run lint` (oxlint) tem que passar.

### Estrutura

```
src/
├── features/<feature>/      -> tudo de uma funcionalidade
│   ├── api.js               -> funcoes que chamam a API dessa feature
│   ├── hooks.js             -> useQuery/useMutation dessa feature
│   └── components/          -> componentes usados so nessa feature
├── pages/                   -> uma tela por rota (compoe features), ex: AccountsPage.jsx
├── components/
│   ├── ui/                  -> componentes genericos (Button, Input, Modal, Card)
│   ├── layout/              -> Header, Sidebar, PageLayout
│   └── shared/              -> componentes usados por mais de uma feature
└── lib/
    ├── api/client.js        -> instancia UNICA do Axios (baseURL "/api")
    ├── hooks/               -> hooks genericos (useDebounce...)
    ├── utils/               -> formatadores (moeda, data) e helpers puros
    └── config/              -> constantes e configuracao
```

- Componente de feature que passar a ser usado em outra feature sobe para `components/shared`.
- `pages` nao chamam Axios nem tem logica de dados: usam hooks das features.

### Convencoes

- Componentes: `PascalCase.jsx`, um componente exportado por arquivo, **function components** com `export default`.
- Hooks: `useAlgumaCoisa`, sempre comecando com `use`. Demais arquivos: `camelCase.js`.
- Props desestruturadas na assinatura: `function AccountCard({ account, onSelect })`.
- Sem `class` components, sem estado global novo (Redux, Zustand...): estado de servidor e do TanStack Query,
  estado de tela e `useState`.
- Texto visivel em portugues; nomes de variaveis, props e funcoes em ingles.
- Valores monetarios formatados com um helper unico em `lib/utils` (`formatCurrency`), nunca formatacao inline.

### Chamadas a API

- **Nunca** use `fetch` ou crie outra instancia do Axios: importe `api` de `lib/api/client.js`.
- URLs relativas (`/users`), o client ja tem `baseURL: '/api'`. Em dev o Vite faz proxy de `/api` para o backend.
- Os campos chegam em **camelCase** (padrao do ASP.NET): o front usa exatamente os nomes dos Response DTOs.
- Erros do backend vem como `ProblemDetails`: a mensagem para o usuario esta em `error.response.data.detail`;
  erros de validacao (400) estao em `error.response.data.errors` (objeto `campo -> [mensagens]`).

`features/users/api.js`:

```js
import { api } from '../../lib/api/client'

export const getUser = (id) => api.get(`/users/${id}`).then((res) => res.data)
export const createUser = (data) => api.post('/users', data).then((res) => res.data)
```

`features/users/hooks.js`:

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, getUser } from './api'

export const userKeys = {
  all: ['users'],
  detail: (id) => ['users', id],
}

export function useUser(id) {
  return useQuery({ queryKey: userKeys.detail(id), queryFn: () => getUser(id) })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}
```

- Query keys em ingles, definidas num objeto `<feature>Keys` no `hooks.js` da feature.
- Toda tela trata os tres estados: carregando, erro e vazio.

---

## Git e trabalho em equipe

- **Ninguem commita direto na `master`.** Uma branch por tarefa, PR para a `master`, pelo menos 1 pessoa revisa.
- Branch em ingles, kebab-case: `feature/user-accounts`, `fix/balance-rounding`, `chore/update-readme`.
- Commits em **portugues**, no imperativo e curtos: `Adiciona endpoint de criacao de usuario`.
- PRs pequenos e focados. Antes de abrir: `dotnet build`, `dotnet test` e `npm run lint` passando.
- Contrato da API (DTOs/rotas) e o ponto de encontro entre back e front: quem mudar um DTO ou rota avisa o time.

## Checklist antes de entregar uma tarefa (para a IA conferir)

- [ ] Nomes de codigo em ingles; textos de usuario em portugues
- [ ] Controller so chama o validator, chama o service e converte o `Result` (sem nenhuma logica de validacao)
- [ ] Regra de negocio so no service; LINQ/SQL so no repository
- [ ] Entity nao sai do service (metodos publicos so com DTO); cada objeto aninhado em DTO e outro DTO, em arquivo proprio
- [ ] Erros esperados via `Result`/`Error`, sem `throw`
- [ ] Comentarios so onde necessario, em portugues, explicando o porque (nada de comentar o obvio)
- [ ] `async` + `CancellationToken` ate o banco
- [ ] Repository e service registrados em `AddApplicationServices`
- [ ] Teste unitario do service criado/atualizado
- [ ] Front usa `lib/api/client.js` + TanStack Query, sem `fetch` solto
- [ ] Nenhum pacote novo sem combinar; nenhum segredo commitado
