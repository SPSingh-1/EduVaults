using System;

namespace EduVault.Core.Entities
{
    public class SchoolPlanConfiguration
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string PlanType { get; set; } = string.Empty; // Standard, Enterprise
        public decimal ImplementationCost { get; set; }
        public string StudentCapacity { get; set; } = string.Empty;
        public string StorageLimit { get; set; } = string.Empty;
        public string MonthlyPrice { get; set; } = string.Empty;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
