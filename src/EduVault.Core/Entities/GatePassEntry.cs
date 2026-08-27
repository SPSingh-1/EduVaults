using System;

namespace EduVault.Core.Entities
{
    public class GatePassEntry
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string PassNumber { get; set; } = string.Empty;
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string ClassSection { get; set; } = string.Empty;
        public string ParentName { get; set; } = string.Empty;
        public string ParentPhone { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Issued"; // "Issued", "Exited", "Cancelled"

        // Navigation property
        public virtual School? School { get; set; }
    }
}
