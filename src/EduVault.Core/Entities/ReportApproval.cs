using System;

namespace EduVault.Core.Entities
{
    public class ReportApproval
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public Guid StudentId { get; set; }
        public string ExamType { get; set; } = string.Empty;
        public bool IsApproved { get; set; } = false;
        public DateTime? ApprovedAt { get; set; }
        public Guid? ApprovedBy { get; set; }
        public string RevokedReason { get; set; } = string.Empty;
    }
}
