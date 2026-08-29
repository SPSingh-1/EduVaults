using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;
using EduVault.Infrastructure.Repositories;
using EduVault.Api.Services;

using System.IO;

// Load environment variables from .env file if it exists at API root or workspace root
var pathsToTry = new[] {
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "src", "EduVault.Api", ".env"),
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
builder.Services.AddMemoryCache();

// Configure EF Core with PostgreSQL
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<EduVaultDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null
        )
    ));

// Register repositories and services
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IPayrollCalculationService, PayrollCalculationService>();
builder.Services.AddScoped<WhatsAppService>();
builder.Services.AddHostedService<FeeAlertBackgroundService>();
builder.Services.AddSingleton<IWhatsAppQueue, WhatsAppQueue>();
builder.Services.AddHostedService<WhatsAppQueueWorker>();
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

// Configure Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("public-api", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 300; // Allow sufficient throughput for campus networks & test suites
        opt.QueueLimit = 50;
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

// HTTP Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' ws: wss: http: https:;";
    await next();
});

app.UseCors("AllowAll");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.UseStaticFiles();

app.MapControllers();
app.MapFallbackToFile("index.html");

// Database Startup — Schema creation and minimal bootstrap only
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<EduVaultDbContext>();
        var authService = services.GetRequiredService<IAuthService>();

        // Apply database migrations programmatically via EF Core
        try
        {
            await context.Database.MigrateAsync();
        }
        catch (Exception migEx)
        {
            Console.WriteLine($"Migration note: {migEx.Message}");
        }

        // Ensure newly added columns exist in PostgreSQL
        try
        {
            await context.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""HasReceptionistModule"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""SchoolUpiId"" text NULL;
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""WhatsAppFeeReceiptsEnabled"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""WhatsAppFeeRemindersEnabled"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""WhatsAppLibraryAlertsEnabled"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""WhatsAppGatePassAlertsEnabled"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""WhatsAppAdmissionInquiryEnabled"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Schools"" ADD COLUMN IF NOT EXISTS ""WhatsAppTcNoticeEnabled"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""PreviousSchoolName"" text NULL;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""PreviousTcNumber"" text NULL;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""PreviousTcDate"" text NULL;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""PreviousTcDocumentUrl"" text NULL;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""OutwardTcNumber"" text NULL;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""OutwardTcIssuedDate"" timestamp with time zone NULL;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""TcReason"" text NULL;
                ALTER TABLE ""Students"" ADD COLUMN IF NOT EXISTS ""TcConductRemark"" text NULL;

                ALTER TABLE ""Invoices"" ADD COLUMN IF NOT EXISTS ""LateFineAmount"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""Invoices"" ADD COLUMN IF NOT EXISTS ""PaidAmount"" numeric NOT NULL DEFAULT 0.0;

                ALTER TABLE ""FeeStructures"" ADD COLUMN IF NOT EXISTS ""FeeCategory"" text NOT NULL DEFAULT 'Standard';
                ALTER TABLE ""FeeStructures"" ADD COLUMN IF NOT EXISTS ""LateFeePerDay"" numeric NOT NULL DEFAULT 0.0;
                ALTER TABLE ""FeeStructures"" ADD COLUMN IF NOT EXISTS ""GracePeriodDays"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""FeeStructures"" ADD COLUMN IF NOT EXISTS ""IsCustomPaymentAllowed"" boolean NOT NULL DEFAULT TRUE;
                ALTER TABLE ""FeeStructures"" ADD COLUMN IF NOT EXISTS ""MinPartialPaymentAmount"" numeric NOT NULL DEFAULT 100.0;

                ALTER TABLE ""Enrollments"" ADD COLUMN IF NOT EXISTS ""FailedSubjectsCount"" integer NOT NULL DEFAULT 0;
                ALTER TABLE ""Enrollments"" ADD COLUMN IF NOT EXISTS ""AcademicOutcomeRemark"" text NULL;
                ALTER TABLE ""Enrollments"" ADD COLUMN IF NOT EXISTS ""IsAdminOverride"" boolean NOT NULL DEFAULT FALSE;
                ALTER TABLE ""Enrollments"" ADD COLUMN IF NOT EXISTS ""OverrideReason"" text NULL;
            ");
        }
        catch (Exception colEx)
        {
            Console.WriteLine($"Column check note: {colEx.Message}");
        }

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

        // ─── Seed or Update Standard Platform Plan ────────────────
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
            Console.WriteLine("Seeded Platform Plan: Standard Plan");
        }
        else
        {
            standardPlan.ImplementationCost = 0m;
            standardPlan.StudentCapacity = "Scale on Demand";
            standardPlan.StorageLimit = "Varying / DB Cost";
            standardPlan.MonthlyPrice = "Per-User Pricing";
            context.PlatformPlans.Update(standardPlan);
            context.SaveChanges();
            Console.WriteLine("Updated Platform Plan: Standard Plan details");
        }

        Console.WriteLine("EduVault startup complete. All real data must be entered via the admin portal.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Startup error: {ex.Message}");
    }
}

app.Run();
