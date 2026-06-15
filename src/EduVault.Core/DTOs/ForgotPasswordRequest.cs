using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class ForgotPasswordRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string NewPassword { get; set; } = string.Empty;
    }
}
