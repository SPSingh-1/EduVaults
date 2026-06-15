using System;

namespace EduVault.Core.Entities
{
    public class ExamResult
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ExamId { get; set; }
        public Guid StudentId { get; set; }
        public decimal? MarksObtained { get; set; }
        public decimal? TheoryMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public string Grade { get; set; } = string.Empty;
        public string Remarks { get; set; } = string.Empty;
        public bool IsSubmitted { get; set; } = false; // Locks the entry and sends to admin

        // Navigation properties
        public virtual Exam? Exam { get; set; }
        public virtual Student? Student { get; set; }
    }
}
