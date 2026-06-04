using System;

namespace EduVault.Core.Entities
{
    public class Subscription
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string PlanType { get; set; } = string.Empty; // Standard, Enterprise
        public decimal Amount { get; set; }
        public string Status { get; set; } = "success"; // success, failed
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime EndDate { get; set; }

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
