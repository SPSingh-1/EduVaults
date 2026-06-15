using System;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class SaveTimetableItemRequest
    {
        [Required]
        public Guid ClassId { get; set; }

        public Guid? TeacherId { get; set; }

        public Guid? SubjectId { get; set; }

        public string? CustomSubjectName { get; set; }

        [Required]
        [Range(1, 10)]
        public int PeriodNumber { get; set; }

        [Required]
        public string DayOfWeek { get; set; } = string.Empty;
    }
}
