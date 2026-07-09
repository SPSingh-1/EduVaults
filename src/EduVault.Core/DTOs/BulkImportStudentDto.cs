using System;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class BulkImportStudentDto
    {
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
        public Guid ClassId { get; set; }

        [StringLength(10)]
        public string BloodGroup { get; set; } = string.Empty;

        [Required]
        [StringLength(150)]
        public string GuardianName { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string GuardianPhone { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string GuardianRelationship { get; set; } = string.Empty;

        [StringLength(300)]
        public string Address { get; set; } = string.Empty;
    }
}
