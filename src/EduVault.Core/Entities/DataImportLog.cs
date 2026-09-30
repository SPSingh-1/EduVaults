using System;

namespace EduVault.Core.Entities
{
    public class DataImportLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string ImportType { get; set; } = "Students"; // "Students", "Teachers", "Fees", "Classes"
        public string SourceName { get; set; } = "CSV File";  // "Government UDISE+", "Fedena", "Custom CSV"
        public int TotalRecords { get; set; }
        public int SuccessCount { get; set; }
        public int ErrorCount { get; set; }
        public string Status { get; set; } = "Completed";     // "Completed", "Failed", "Partial"
        public string? ErrorSummary { get; set; }
        public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
        public string? ImportedBy { get; set; }

        public virtual School? School { get; set; }
    }
}
