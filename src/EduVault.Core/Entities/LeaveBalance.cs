using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Stores computed leave balance snapshots per employee per leave type per year.
    /// Rebuilt on-demand by LeaveBalanceEngine; cached here for read performance.
    /// </summary>
    public class LeaveBalance
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid? TeacherUserId { get; set; }        // Legacy: auth User Id
        public Guid LeavePolicyId { get; set; }
        public string LeaveTypeCode { get; set; } = string.Empty;
        public int AcademicYear { get; set; }

        public decimal OpeningBalance { get; set; } = 0;
        public decimal TotalAccrued { get; set; } = 0;   // Sum of all accruals so far
        public decimal CarryForward { get; set; } = 0;
        public decimal ManualCredits { get; set; } = 0;
        public decimal TotalAvailable { get; set; } = 0; // OpeningBalance + Accrued + CarryForward + Manual - Used
        public decimal TotalUsed { get; set; } = 0;      // Sum of approved leaves
        public decimal PendingUsed { get; set; } = 0;    // Sum of pending/applied leaves
        public decimal RemainingBalance { get; set; } = 0;

        public DateTime LastCalculatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public virtual School? School { get; set; }
        public virtual LeavePolicy? LeavePolicy { get; set; }
    }
}
