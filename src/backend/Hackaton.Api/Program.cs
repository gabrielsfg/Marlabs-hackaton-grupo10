using Hackaton.Data.Data;
using Microsoft.EntityFrameworkCore;
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

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

// Qualquer rota que nao seja /api cai no index.html (rotas do React)
app.MapFallbackToFile("/index.html");

app.Run();

// Exposto para o WebApplicationFactory dos testes de integracao
public partial class Program;
