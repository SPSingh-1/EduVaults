using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;
using EduVault.Infrastructure.Repositories;
using EduVault.Api.Services;

using System.IO;

// Load environment variables from .env file if it exists at API root or workspace root
var pathsToTry = new[] {
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(AppContext.BaseDirectory, ".env")
};
foreach (var path in pathsToTry)
{
    if (File.Exists(path))
    {
        foreach (var line in File.ReadAllLines(path))
        {
            var trimmedLine = line.Trim();
            if (string.IsNullOrEmpty(trimmedLine) || trimmedLine.StartsWith("#")) continue;
            
            var parts = trimmedLine.Split('=', 2);
            if (parts.Length == 2)
            {
                var envKey = parts[0].Trim();
                var envVal = parts[1].Trim();
                if (envVal.StartsWith("\"") && envVal.EndsWith("\"")) envVal = envVal.Substring(1, envVal.Length - 2);
                else if (envVal.StartsWith("'") && envVal.EndsWith("'")) envVal = envVal.Substring(1, envVal.Length - 2);
                
                Environment.SetEnvironmentVariable(envKey, envVal);
            }
        }
        break; // Only load from the first one found
    }
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure EF Core with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<EduVaultDbContext>(options =>
    options.UseNpgsql(connectionString));

// Register repositories and services
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<WhatsAppService>();
builder.Services.AddHostedService<FeeAlertBackgroundService>();
builder.Services.AddHttpClient();

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Secret"] ?? "EduVaultSuperSecretJWTKey2025!WithSecureKey32BytesLength";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Swagger support
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "EduVault Web API", Version = "v1" });
    
    // Add JWT support in Swagger UI
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduVault Web API v1"));
}

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Database Startup — Schema creation and minimal bootstrap only
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<EduVaultDbContext>();
        var authService = services.GetRequiredService<IAuthService>();

        // ─── Seed Super Admin (required for platform operation) ────────────────
        if (!context.Users.Any(u => u.Role == "superadmin"))
        {
            var seedEmail = Environment.GetEnvironmentVariable("SUPERADMIN_EMAIL") ?? "superadmin@eduvault.com";
            var seedPassword = Environment.GetEnvironmentVariable("SUPERADMIN_PASSWORD") ?? "Admin123!";

            var superAdmin = new EduVault.Core.Entities.User
            {
                Email = seedEmail,
                PasswordHash = authService.HashPassword(seedPassword),
                Role = "superadmin",
                FirstName = "EduVault",
                LastName = "SuperAdmin",
                IsActive = true
            };
            context.Users.Add(superAdmin);
            context.SaveChanges();
            Console.WriteLine($"Seeded Super Admin: {seedEmail} / [HIDDEN]");
        }

        // Apply database migrations programmatically via EF Core
        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception migEx)
        {
            Console.WriteLine($"Migration note: {migEx.Message}");
        }

        Console.WriteLine("EduVault startup complete. All real data must be entered via the admin portal.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Startup error: {ex.Message}");
    }
}

app.Run();

