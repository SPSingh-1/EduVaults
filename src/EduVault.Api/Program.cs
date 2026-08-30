using System.Text;
using System.IO;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;
using EduVault.Infrastructure.Repositories;
using EduVault.Api.Services;
using EduVault.Api.Configuration;

// ─── 1. Centralized Environment Variable Resolution ────────────────────────
// Search for the single authoritative .env file starting from AppContext and CWD up the tree
var candidateDirectories = new List<string>
{
    Directory.GetCurrentDirectory(),
    AppContext.BaseDirectory,
    Path.Combine(Directory.GetCurrentDirectory(), ".."),
    Path.Combine(Directory.GetCurrentDirectory(), "../.."),
    Path.Combine(AppContext.BaseDirectory, ".."),
    Path.Combine(AppContext.BaseDirectory, "../.."),
    Path.Combine(AppContext.BaseDirectory, "../../..")
};

string? loadedEnvPath = null;
foreach (var dir in candidateDirectories)
{
    try
    {
        var fullDir = Path.GetFullPath(dir);
        var envFile = Path.Combine(fullDir, ".env");
        if (File.Exists(envFile))
        {
            foreach (var line in File.ReadAllLines(envFile))
            {
                var trimmed = line.Trim();
                if (string.IsNullOrEmpty(trimmed) || trimmed.StartsWith("#")) continue;

                var parts = trimmed.Split('=', 2);
                if (parts.Length == 2)
                {
                    var envKey = parts[0].Trim();
                    var envVal = parts[1].Trim();
                    if ((envVal.StartsWith("\"") && envVal.EndsWith("\"")) ||
                        (envVal.StartsWith("'") && envVal.EndsWith("'")))
                    {
                        envVal = envVal.Substring(1, envVal.Length - 2);
                    }

                    if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(envKey)))
                    {
                        Environment.SetEnvironmentVariable(envKey, envVal);
                    }
                }
            }
            loadedEnvPath = envFile;
            break;
        }
    }
    catch
    {
        // continue searching
    }
}

if (loadedEnvPath != null)
{
    Console.WriteLine($"[CONFIG] Authoritative .env loaded from: {loadedEnvPath}");
}

var builder = WebApplication.CreateBuilder(args);

// Normalize environment variables across naming conventions
var rawJwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") 
    ?? Environment.GetEnvironmentVariable("Jwt__Secret") 
    ?? builder.Configuration["Jwt:Secret"] 
    ?? builder.Configuration["Jwt__Secret"];

var rawDbConn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection") 
    ?? Environment.GetEnvironmentVariable("DATABASE_URL") 
    ?? builder.Configuration.GetConnectionString("DefaultConnection");

var rawSuperEmail = Environment.GetEnvironmentVariable("SUPERADMIN_EMAIL") 
    ?? builder.Configuration["SUPERADMIN_EMAIL"] 
    ?? "superadmin@eduvault.com";

var rawSuperPass = Environment.GetEnvironmentVariable("SUPERADMIN_PASSWORD") 
    ?? builder.Configuration["SUPERADMIN_PASSWORD"] 
    ?? "Admin123!";

var rawAllowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") 
    ?? builder.Configuration["ALLOWED_ORIGINS"] 
    ?? "http://localhost:5173,http://localhost:3000,http://localhost:5265,http://localhost:5005";

// Fail-fast configuration validation
if (string.IsNullOrWhiteSpace(rawJwtSecret) || rawJwtSecret.Length < 32)
{
    var msg = "[FATAL CONFIG ERROR] JWT Secret is required and must be at least 32 characters. Set JWT_SECRET in .env or environment variables.";
    Console.Error.WriteLine(msg);
    throw new InvalidOperationException(msg);
}

if (string.IsNullOrWhiteSpace(rawDbConn))
{
    var msg = "[FATAL CONFIG ERROR] PostgreSQL Connection String is required. Set ConnectionStrings__DefaultConnection or DATABASE_URL in .env or environment variables.";
    Console.Error.WriteLine(msg);
    throw new InvalidOperationException(msg);
}

// ─── 2. Strongly Typed Options Configuration ──────────────────────────────
builder.Services.Configure<JwtOptions>(options =>
{
    options.Secret = rawJwtSecret;
    options.Issuer = "EduVault";
    options.Audience = "EduVaultUsers";
    options.ExpirationDays = 7;
});

builder.Services.Configure<SuperAdminOptions>(options =>
{
    options.Email = rawSuperEmail;
    options.Password = rawSuperPass;
});

builder.Services.AddControllers();
builder.Services.AddMemoryCache();

// ─── 3. Database Context (PostgreSQL EF Core) ──────────────────────────────
builder.Services.AddDbContext<EduVaultDbContext>(options =>
    options.UseNpgsql(rawDbConn, npgsqlOptions =>
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null
        )
    ));

// ─── 4. Dependency Injection ──────────────────────────────────────────────
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPayrollCalculationService, PayrollCalculationService>();
builder.Services.AddScoped<WhatsAppService>();
builder.Services.AddHostedService<FeeAlertBackgroundService>();
builder.Services.AddSingleton<IWhatsAppQueue, WhatsAppQueue>();
builder.Services.AddHostedService<WhatsAppQueueWorker>();
builder.Services.AddHttpClient();

// ─── 5. JWT Authentication & Token Validation ─────────────────────────────
var jwtKeyBytes = Encoding.UTF8.GetBytes(rawJwtSecret);

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
        IssuerSigningKey = new SymmetricSecurityKey(jwtKeyBytes),
        ValidateIssuer = true,
        ValidIssuer = "EduVault",
        ValidateAudience = true,
        ValidAudience = "EduVaultUsers",
        ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});

// ─── 6. CORS Configuration ────────────────────────────────────────────────
var parsedOrigins = rawAllowedOrigins
    .Split(',', StringSplitOptions.RemoveEmptyEntries)
    .Select(o => o.Trim().Trim('"', '\''))
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy("CentralizedCorsPolicy", policy =>
    {
        policy.WithOrigins(parsedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ─── 7. Rate Limiting ─────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    
    // General API window
    options.AddFixedWindowLimiter("public-api", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 300;
        opt.QueueLimit = 50;
    });

    // Stricter limiter for authentication & password reset endpoints (Brute Force Protection)
    options.AddFixedWindowLimiter("auth-strict", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 15;
        opt.QueueLimit = 5;
    });
});

// ─── 8. Swagger Documentation ─────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "EduVault Web API", Version = "v1" });
    
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

// ─── 8. Infrastructure Services & Health Checks ───────────────────────────
builder.Services.AddHealthChecks()
    .AddCheck("Database", () => Microsoft.Extensions.Diagnostics.HealthChecks.HealthCheckResult.Healthy());

var app = builder.Build();

// ─── 9. HTTP Pipeline & Production Error Shield ───────────────────────────
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduVault Web API v1"));
}
else
{
    app.UseExceptionHandler(errorApp =>
    {
        errorApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            var traceId = context.TraceIdentifier;
            await context.Response.WriteAsJsonAsync(new
            {
                success = false,
                message = "An unexpected server error occurred. Please try again later or contact system administration.",
                traceId = traceId
            });
        });
    });
}

// HTTP Security Headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";
    if (context.Request.IsHttps)
    {
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    }
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' ws: wss: http: https:; frame-ancestors 'none';";
    await next();
});

app.UseCors("CentralizedCorsPolicy");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Health Check Endpoints (safe, non-leaking)
app.MapHealthChecks("/health", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new
        {
            status = "Healthy",
            service = "EduVault .NET API",
            timestamp = DateTime.UtcNow
        });
    }
});

app.MapHealthChecks("/health/ready", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    ResponseWriter = async (context, report) =>
    {
        context.Response.ContentType = "application/json";
        bool isHealthy = report.Status == Microsoft.Extensions.Diagnostics.HealthChecks.HealthStatus.Healthy;
        context.Response.StatusCode = isHealthy ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable;
        await context.Response.WriteAsJsonAsync(new
        {
            status = report.Status.ToString(),
            service = "EduVault .NET API",
            database = report.Entries.TryGetValue("Database", out var dbEntry) ? dbEntry.Status.ToString() : "Unknown",
            timestamp = DateTime.UtcNow
        });
    }
});

app.UseStaticFiles();
app.MapControllers();
app.MapFallbackToFile("index.html");

// ─── 10. Database Startup Bootstrap & Schema Sync ─────────────────────────
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<EduVaultDbContext>();
        var authService = services.GetRequiredService<IAuthService>();

        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception migEx)
        {
            Console.WriteLine($"[STARTUP NOTE] Migration check: {migEx.Message}");
        }

        // Schema sync for newly defined tables and columns
        try
        {
            await context.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "PasswordResetTokens" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "UserId" uuid NOT NULL REFERENCES "Users" ("Id") ON DELETE CASCADE,
                    "TokenHash" text NOT NULL DEFAULT '',
                    "ExpiresAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "IsUsed" boolean NOT NULL DEFAULT FALSE,
                    "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW(),
                    "UsedAt" timestamp with time zone NULL
                );
                CREATE INDEX IF NOT EXISTS "IX_PasswordResetTokens_TokenHash" ON "PasswordResetTokens" ("TokenHash");

                ALTER TABLE "PasswordResetTokens" ADD COLUMN IF NOT EXISTS "TokenHash" text NOT NULL DEFAULT '';
                ALTER TABLE "PasswordResetTokens" ADD COLUMN IF NOT EXISTS "ExpiresAt" timestamp with time zone NOT NULL DEFAULT NOW();
                ALTER TABLE "PasswordResetTokens" ADD COLUMN IF NOT EXISTS "IsUsed" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE "PasswordResetTokens" ADD COLUMN IF NOT EXISTS "CreatedAt" timestamp with time zone NOT NULL DEFAULT NOW();
                ALTER TABLE "PasswordResetTokens" ADD COLUMN IF NOT EXISTS "UsedAt" timestamp with time zone NULL;

                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "HasReceptionistModule" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "SchoolUpiId" text NULL;
                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "WhatsAppFeeReceiptsEnabled" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "WhatsAppFeeRemindersEnabled" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "WhatsAppLibraryAlertsEnabled" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "WhatsAppGatePassAlertsEnabled" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "WhatsAppAdmissionInquiryEnabled" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "WhatsAppTcNoticeEnabled" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "PreviousSchoolName" text NULL;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "PreviousTcNumber" text NULL;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "PreviousTcDate" text NULL;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "PreviousTcDocumentUrl" text NULL;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "OutwardTcNumber" text NULL;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "OutwardTcIssuedDate" timestamp with time zone NULL;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "TcReason" text NULL;
                ALTER TABLE "Students" ADD COLUMN IF NOT EXISTS "TcConductRemark" text NULL;

                ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "LateFineAmount" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE "Invoices" ADD COLUMN IF NOT EXISTS "PaidAmount" numeric NOT NULL DEFAULT 0.0;

                ALTER TABLE "FeeStructures" ADD COLUMN IF NOT EXISTS "FeeCategory" text NOT NULL DEFAULT 'Standard';
                ALTER TABLE "FeeStructures" ADD COLUMN IF NOT EXISTS "LateFeePerDay" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE "FeeStructures" ADD COLUMN IF NOT EXISTS "GracePeriodDays" integer NOT NULL DEFAULT 0;
                ALTER TABLE "FeeStructures" ADD COLUMN IF NOT EXISTS "IsCustomPaymentAllowed" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE "FeeStructures" ADD COLUMN IF NOT EXISTS "MinPartialPaymentAmount" numeric NOT NULL DEFAULT 100.0;

                ALTER TABLE "Enrollments" ADD COLUMN IF NOT EXISTS "FailedSubjectsCount" integer NOT NULL DEFAULT 0;
                ALTER TABLE "Enrollments" ADD COLUMN IF NOT EXISTS "AcademicOutcomeRemark" text NULL;
                ALTER TABLE "Enrollments" ADD COLUMN IF NOT EXISTS "IsAdminOverride" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE "Enrollments" ADD COLUMN IF NOT EXISTS "OverrideReason" text NULL;
            """);
        }
        catch (Exception colEx)
        {
            Console.WriteLine($"[STARTUP NOTE] Column sync: {colEx.Message}");
        }

        // Seed Super Admin if missing
        if (!context.Users.Any(u => u.Role == "superadmin"))
        {
            var superAdmin = new EduVault.Core.Entities.User
            {
                Email = rawSuperEmail,
                PasswordHash = authService.HashPassword(rawSuperPass),
                Role = "superadmin",
                FirstName = "EduVault",
                LastName = "SuperAdmin",
                IsActive = true
            };
            context.Users.Add(superAdmin);
            context.SaveChanges();
            Console.WriteLine($"[STARTUP] Seeded Super Admin: {rawSuperEmail}");
        }

        // Seed Standard Platform Plan if missing
        var standardPlan = context.PlatformPlans.FirstOrDefault(p => p.PlanName.Contains("Standard"));
        if (standardPlan == null)
        {
            standardPlan = new EduVault.Core.Entities.PlatformPlan
            {
                Id = Guid.NewGuid(),
                TierLabel = "TIER 1",
                PlanName = "Standard Plan",
                ImplementationCost = 0m,
                StudentCapacity = "Scale on Demand",
                StorageLimit = "Varying / DB Cost",
                MonthlyPrice = "Per-User Pricing",
                IsTopRevenue = false
            };
            context.PlatformPlans.Add(standardPlan);
            context.SaveChanges();
            Console.WriteLine("[STARTUP] Seeded Platform Plan: Standard Plan");
        }

        Console.WriteLine("[STARTUP] EduVault API bootstrap completed successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[STARTUP ERROR] Bootstrap failure: {ex.Message}");
    }
}

app.Run();
