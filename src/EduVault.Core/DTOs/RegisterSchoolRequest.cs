using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class RegisterSchoolRequest
    {
        [Required]
        [StringLength(255)]
        public string SchoolName { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Website { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string AdminName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string AdminEmail { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string AdminPassword { get; set; } = string.Empty;
    }
}
