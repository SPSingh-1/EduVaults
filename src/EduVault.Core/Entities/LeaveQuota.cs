using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Annual leave quota allocated per teacher. Tracks CL/SL/EL/ML allotted and used.
    /// Half-day = 0.5 deduction.
    /// </summary>
    public class LeaveQuota
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid TeacherUserId { get; set; }
        public int AcademicYear { get; set; }                        // e.g. 2025

        // Allocated quota (editable by Account Manager)
        public int CasualLeaveAllotted { get; set; } = 12;
        public int SickLeaveAllotted { get; set; } = 10;
        public int EarnedLeaveAllotted { get; set; } = 15;
        public int MaternityLeaveAllotted { get; set; } = 90;

        // Used quota (auto-updated when leave is approved)
        public decimal CasualLeaveUsed { get; set; } = 0;           // decimal supports 0.5 (half-day)
        public decimal SickLeaveUsed { get; set; } = 0;
        public decimal EarnedLeaveUsed { get; set; } = 0;
        public decimal MaternityLeaveUsed { get; set; } = 0;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
