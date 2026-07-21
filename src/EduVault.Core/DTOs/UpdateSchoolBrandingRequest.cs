using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class UpdateSchoolBrandingRequest
    {
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = string.Empty;

        public string LogoUrl { get; set; } = string.Empty;

        public string EmailDomain { get; set; } = string.Empty;

        public string ThemeColor { get; set; } = string.Empty;

        public string? Address { get; set; }

        public string? City { get; set; }

        public string? Website { get; set; }

        public string? AdminName { get; set; }

        public string? AdminEmail { get; set; }

        public string? AdminPassword { get; set; }
    }
}
