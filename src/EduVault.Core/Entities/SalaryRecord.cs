using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Monthly salary record for a teacher. Auto-calculated from attendance + leave data + SalaryRules.
    /// Formula:
    ///   PerDayRate    = GrossSalary / TotalWorkingDays
    ///   PaidLeaves    = MIN(LeaveDaysUsed, RemainingQuota)
    ///   LwpDays       = MAX(0, LeaveDaysUsed - RemainingQuota)
    ///   BasicEarned   = (PresentDays + HalfDays*0.5 + PaidLeaves) * PerDayRate
    ///   NetPay        = BasicEarned + RuleAllowances + ManualAllowances
    ///                 - RuleDeductions - ManualDeductions - (LwpDays * PerDayRate)
    /// </summary>
    public class SalaryRecord
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid TeacherUserId { get; set; }
        public int Month { get; set; }
        public int Year { get; set; }

        // Base salary
        public decimal GrossSalary { get; set; }

        // Attendance data (auto-fetched during generation)
        public int TotalWorkingDays { get; set; }
        public decimal PresentDays { get; set; }
        public decimal AbsentDays { get; set; }
        public decimal HalfDays { get; set; }
        public decimal LeaveDaysUsed { get; set; }                   // approved leaves taken
        public decimal LwpDays { get; set; }                         // Leave Without Pay (beyond quota)

        // Calculated fields
        public decimal PerDayRate { get; set; }
        public decimal BasicEarned { get; set; }

        // Rule-based (auto-applied from active SalaryRules with IsDefault=true)
        public decimal RuleBasedAllowances { get; set; }
        public decimal RuleBasedDeductions { get; set; }

        // Manual overrides by Account Manager
        public decimal ManualAllowances { get; set; }
        public decimal ManualDeductions { get; set; }
        public decimal LwpDeduction { get; set; }

        public decimal NetPay { get; set; }
        public string Status { get; set; } = "Draft";               // "Draft", "Pending", "Paid"
        public DateTime? PaidOn { get; set; }
        public string? Remarks { get; set; }
        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
