using System;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class UpdateStudentRequest
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
        public Guid ClassId { get; set; }

        public string BloodGroup { get; set; } = string.Empty;

        [Required]
        public string GuardianName { get; set; } = string.Empty;

        [Required]
        public string GuardianPhone { get; set; } = string.Empty;

        [Required]
        public string GuardianRelationship { get; set; } = string.Empty;

        public string Address { get; set; } = string.Empty;

        [Required]
        public string Status { get; set; } = "ACTIVE";
    }
}
