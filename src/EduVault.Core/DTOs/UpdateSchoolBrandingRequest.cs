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
    }
}
