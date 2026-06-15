using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class UpdateTeacherRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        public string? Password { get; set; }

        [Required]
        public string Department { get; set; } = string.Empty;

        public string OfficeLocation { get; set; } = string.Empty;
        public string Qualifications { get; set; } = string.Empty;
        public string? Specialization { get; set; }

        [Required]
        public bool IsActive { get; set; } = true;
    }
}
