using System;

namespace EduVault.Core.Entities
{
    public class AdmissionInquiryEntry
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string ChildName { get; set; } = string.Empty;
        public string TargetClass { get; set; } = string.Empty;
        public string ParentName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "Inquiry"; // "Inquiry", "FollowUp", "Registered", "Enrolled", "Lost"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual School? School { get; set; }
    }
}
