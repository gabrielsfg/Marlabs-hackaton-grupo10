var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Em producao o React buildado fica em wwwroot e e servido pela propria API
app.UseDefaultFiles();
app.MapStaticAssets();

var api = app.MapGroup("/api");

api.MapGet("/health", () => Results.Ok(new { status = "ok", timestamp = DateTime.UtcNow }))
    .WithName("Health");

// Qualquer rota que nao seja /api cai no index.html (rotas do React)
app.MapFallbackToFile("/index.html");

app.Run();
