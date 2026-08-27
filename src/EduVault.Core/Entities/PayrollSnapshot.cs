using System;

namespace EduVault.Core.Entities
{
    public class PayrollSnapshot
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid PayrollId { get; set; } // 1-to-1 with Payroll
        public string CompleteEngineSnapshotJson { get; set; } = "{}"; // Complete immutable dump of all configurations, rules and calculation traces
        public DateTime SnapshotTakenAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual Payroll? Payroll { get; set; }
    }
}
