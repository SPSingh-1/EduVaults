using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Teacher-initiated leave request. Supports Full Day and Half Day (Morning/Afternoon).
    /// TotalDays = 0.5 for HalfDay, calculated days for multi-day FullDay leaves.
    /// </summary>
    public class LeaveRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid TeacherUserId { get; set; }
        public string LeaveType { get; set; } = string.Empty;        // "CL", "SL", "EL", "ML"
        public string DayType { get; set; } = "FullDay";             // "FullDay", "HalfDay"
        public string? HalfDaySession { get; set; }                  // "Morning", "Afternoon" (only for HalfDay)
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalDays { get; set; }                       // 0.5 for HalfDay, N for FullDay
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";             // "Pending", "Approved", "Rejected"
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
        public string? RejectionNote { get; set; }

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
