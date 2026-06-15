using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class OnboardTeacherRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Department { get; set; } = string.Empty;

        public string? OfficeLocation { get; set; }
        public string? Qualifications { get; set; }
        public string? Specialization { get; set; }
    }
}
