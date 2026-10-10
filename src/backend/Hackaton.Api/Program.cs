using Hackaton.Api.Extensions;
using Hackaton.Data.Data;
using Hackaton.Services.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .WriteTo.Console());

// A connection string com senha fica no user-secrets (ver README), nunca no appsettings
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsql => npgsql.EnableRetryOnFailure()));

builder.Services.AddApplicationServices();
builder.Services.AddJwtAuthentication(builder.Configuration);
builder.Services.AddPluggySettings(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Cole o accessToken retornado pelo /api/auth/login"
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseSerilogRequestLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Em producao o React buildado fica em wwwroot e e servido pela propria API
app.UseDefaultFiles();
app.MapStaticAssets();

var api = app.MapGroup("/api");

api.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
    .WithName("Health");

api.MapGet("/health/db", async (ApplicationDbContext db, CancellationToken ct) =>
        await db.Database.CanConnectAsync(ct)
            ? Results.Ok(new { status = "ok", database = "connected" })
            : Results.Problem("Nao foi possivel conectar ao banco", statusCode: StatusCodes.Status503ServiceUnavailable))
    .WithName("HealthDb");

api.MapGet("/news/digest", async (IHostEnvironment environment, CancellationToken ct) =>
{
    var path = Path.GetFullPath(Path.Combine(
        environment.ContentRootPath,
        "..", "..", "..",
        "script_noticias",
        "news_module",
        "data",
        "demo",
        "2026-10-10",
        "digest.txt"));

    if (!File.Exists(path))
        return Results.NotFound(new { message = "Digest nao encontrado" });

    var content = await File.ReadAllTextAsync(path, ct);
    return Results.Text(content, "text/plain; charset=utf-8");
}).WithName("NewsDigest");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Qualquer rota que nao seja /api cai no index.html (rotas do React)
app.MapFallbackToFile("/index.html");

app.Run();

// Exposto para o WebApplicationFactory dos testes de integracao
public partial class Program;
