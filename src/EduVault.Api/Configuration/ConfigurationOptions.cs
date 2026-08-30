using System.ComponentModel.DataAnnotations;

namespace EduVault.Api.Configuration
{
    public class JwtOptions
    {
        public const string SectionName = "Jwt";

        [Required(ErrorMessage = "JWT Secret is required and must be configured centrally in environment variables.")]
        [MinLength(32, ErrorMessage = "JWT Secret must be at least 32 characters long.")]
        public string Secret { get; set; } = string.Empty;

        public string Issuer { get; set; } = "EduVault";
        public string Audience { get; set; } = "EduVaultUsers";
        public int ExpirationDays { get; set; } = 7;
    }

    public class DatabaseOptions
    {
        public const string SectionName = "ConnectionStrings";

        [Required(ErrorMessage = "DefaultConnection database connection string is required.")]
        public string DefaultConnection { get; set; } = string.Empty;
    }

    public class SuperAdminOptions
    {
        public const string SectionName = "SuperAdmin";

        public string Email { get; set; } = "superadmin@eduvault.com";
        public string Password { get; set; } = "Admin123!";
    }

    public class CorsOptions
    {
        public const string SectionName = "Cors";

        public string[] AllowedOrigins { get; set; } = new[]
        {
            "http://localhost:5173",
            "http://localhost:3000",
            "http://localhost:5265",
            "http://localhost:5005"
        };
    }

    public class RateLimitOptions
    {
        public const string SectionName = "RateLimiting";

        public int PermitLimit { get; set; } = 300;
        public int AuthPermitLimit { get; set; } = 10;
        public int WindowMinutes { get; set; } = 1;
        public int QueueLimit { get; set; } = 20;
    }

    public class TwilioOptions
    {
        public const string SectionName = "Twilio";

        public string AccountSid { get; set; } = string.Empty;
        public string AuthToken { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
    }

    public class SmtpOptions
    {
        public const string SectionName = "Smtp";

        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 587;
        public string User { get; set; } = string.Empty;
        public string Pass { get; set; } = string.Empty;
    }
}
