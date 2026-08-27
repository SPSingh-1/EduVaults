using System;

namespace EduVault.Core.Entities
{
    public class WorkSchedule
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string ShiftName { get; set; } = "General Shift";
        public string StartTime { get; set; } = "08:00";
        public string EndTime { get; set; } = "14:30";
        public int GraceMinutes { get; set; } = 15;
        public int LateCountThresholdForHalfDay { get; set; } = 3; // e.g. 3 late punches = 0.5 CL deduction
        public int HalfDayMinutesThreshold { get; set; } = 240; // 4 hours
        public string WorkingDaysMask { get; set; } = "1111100"; // Mon-Fri (1), Sat-Sun (0 or special)
        public string SaturdayRule { get; set; } = "FullWorking"; // FullWorking, HalfDay, AlternateOff, Holiday
        public bool IsOvertimeEnabled { get; set; } = false;
        public decimal OvertimeRateMultiplier { get; set; } = 1.0m;

        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }
        public bool IsActive { get; set; } = true;

        // Navigation property
        public virtual School? School { get; set; }
    }
}
