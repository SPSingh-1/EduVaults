using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class EnterMarksRequest
    {
        [Required]
        public Guid ExamId { get; set; }

        [Required]
        public List<StudentMarkDto> Results { get; set; } = new List<StudentMarkDto>();
    }

    public class StudentMarkDto
    {
        [Required]
        public Guid StudentId { get; set; }

        public decimal MarksObtained { get; set; }
        public string Remarks { get; set; } = string.Empty;
    }
}
