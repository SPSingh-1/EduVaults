using System;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class ReassignTeacherRequest
    {
        [Required]
        public Guid TeacherId { get; set; }
    }
}
