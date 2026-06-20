using System;

namespace EduVault.Core.Entities
{
    public class PlatformPlan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string TierLabel { get; set; } = string.Empty; // e.g. TIER 1, TIER 2
        public string PlanName { get; set; } = string.Empty; // e.g. Standard Plan
        public decimal ImplementationCost { get; set; }
        public string StudentCapacity { get; set; } = string.Empty;
        public string StorageLimit { get; set; } = string.Empty;
        public string MonthlyPrice { get; set; } = string.Empty; // e.g. Rs. 499/mo, Custom /mo
        public bool IsTopRevenue { get; set; }
    }
}
