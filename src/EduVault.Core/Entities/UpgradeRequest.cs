using System;

namespace EduVault.Core.Entities
{
    public class UpgradeRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string RequestedPlanType { get; set; } = string.Empty; // Standard, Enterprise
        public string Status { get; set; } = "Pending"; // Pending, Approved, Rejected
        public string? Requirements { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
