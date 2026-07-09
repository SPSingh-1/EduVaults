using System;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class BulkImportTeacherDto
    {
        [Required]
        [EmailAddress]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string DateOfBirth { get; set; } = string.Empty; // dd-MM-yyyy format expected

        [Required]
        [StringLength(100)]
        public string Department { get; set; } = string.Empty;

        [StringLength(150)]
        public string OfficeLocation { get; set; } = string.Empty;

        [StringLength(200)]
        public string Qualifications { get; set; } = string.Empty;

        [StringLength(200)]
        public string Specialization { get; set; } = string.Empty;
    }
}
