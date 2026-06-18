using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;
using EduVault.Infrastructure.Repositories;
using EduVault.Api.Services;

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
            var superAdmin = new EduVault.Core.Entities.User
            {
                Email = "superadmin@eduvault.com",
                PasswordHash = authService.HashPassword("Admin123!"),
                Role = "superadmin",
                FirstName = "EduVault",
                LastName = "SuperAdmin",
                IsActive = true
            };
            context.Users.Add(superAdmin);
            context.SaveChanges();
            Console.WriteLine("Seeded Super Admin: superadmin@eduvault.com / Admin123!");
        }

        // ─── Inline schema migration: add CustomSubjectName column if missing ──
        try
        {
            var conn = context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "ALTER TABLE \"TimetableItems\" ADD COLUMN IF NOT EXISTS \"CustomSubjectName\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();
            
            cmd.CommandText = "ALTER TABLE \"Teachers\" ADD COLUMN IF NOT EXISTS \"Specialization\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"Exams\" ADD COLUMN IF NOT EXISTS \"Time\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"FeeStructures\" ADD COLUMN IF NOT EXISTS \"Installments\" INTEGER NOT NULL DEFAULT 1;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"FeeStructures\" ADD COLUMN IF NOT EXISTS \"StudentId\" UUID NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"FeeStructures\" ADD COLUMN IF NOT EXISTS \"SubmissionTime\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"FeeStructures\" ADD COLUMN IF NOT EXISTS \"Breakdown\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"Classes\" ADD COLUMN IF NOT EXISTS \"AreMarksPublished\" BOOLEAN NOT NULL DEFAULT FALSE;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"Schools\" ADD COLUMN IF NOT EXISTS \"LogoUrl\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"Schools\" ADD COLUMN IF NOT EXISTS \"EmailDomain\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "ALTER TABLE \"Schools\" ADD COLUMN IF NOT EXISTS \"ThemeColor\" TEXT NULL;";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = @"
                CREATE TABLE IF NOT EXISTS ""PlatformSettings"" (
                    ""Id"" UUID PRIMARY KEY,
                    ""OrgName"" TEXT NOT NULL,
                    ""LogoUrl"" TEXT NULL,
                    ""PrimaryColor"" TEXT NULL,
                    ""MaintenanceMode"" BOOLEAN NOT NULL DEFAULT FALSE,
                    ""MaintenanceMessage"" TEXT NULL,
                    ""BackupFrequency"" TEXT NULL,
                    ""BackupTime"" TEXT NULL,
                    ""BackupTarget"" TEXT NULL
                );";
            await cmd.ExecuteNonQueryAsync();

            cmd.CommandText = "SELECT COUNT(*) FROM \"PlatformSettings\";";
            var settingsCount = Convert.ToInt32(await cmd.ExecuteScalarAsync());
            if (settingsCount == 0)
            {
                cmd.CommandText = @"
                    INSERT INTO ""PlatformSettings"" (""Id"", ""OrgName"", ""LogoUrl"", ""PrimaryColor"", ""MaintenanceMode"", ""MaintenanceMessage"", ""BackupFrequency"", ""BackupTime"", ""BackupTarget"")
                    VALUES ('" + Guid.NewGuid() + @"', 'SuperAdmin Global', '/logo.jpeg', '#1a2744', false, 'Scheduled maintenance in progress. We''ll be back shortly.', 'Daily', '02:00 AM', 'Amazon S3: production-vault-01');";
                await cmd.ExecuteNonQueryAsync();
            }
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

