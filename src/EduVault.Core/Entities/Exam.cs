using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class Exam
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid ClassId { get; set; }
        public Guid SubjectId { get; set; }
        public string ExamType { get; set; } = string.Empty; // e.g. Mid-term assessment, Final Examination
        public DateTime Date { get; set; }
        public string? Time { get; set; }
        public Guid? ProctorId { get; set; }
        public string Status { get; set; } = "Scheduled"; // Draft, Scheduled, Ongoing, Completed
        
        // Question Paper Submission & 3-Day Deadline Verification
        public string? QuestionPaperUrl { get; set; }
        public DateTime? QuestionPaperUploadedAt { get; set; }
        public Guid? QuestionPaperUploadedByTeacherId { get; set; }
        public string? QuestionPaperNotes { get; set; }

        // Navigation properties
        public virtual Class? Class { get; set; }
        public virtual Subject? Subject { get; set; }
        public virtual Teacher? Proctor { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.ForeignKey(nameof(QuestionPaperUploadedByTeacherId))]
        public virtual Teacher? QuestionPaperUploader { get; set; }
        public virtual ICollection<ExamResult> ExamResults { get; set; } = new List<ExamResult>();
    }
}
