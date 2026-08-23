using System;

namespace EduVault.Core.Entities
{
    public class SalaryRule
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;             // "House Rent Allowance", "PF Deduction"
        public string Type { get; set; } = string.Empty;             // "Allowance", "Deduction"
        public string CalculationMode { get; set; } = "Fixed";       // "Fixed", "Percentage"
        public decimal Value { get; set; }                           // fixed amount OR % of gross salary
        public bool IsDefault { get; set; } = true;                  // auto-apply to all salary calculations?
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
