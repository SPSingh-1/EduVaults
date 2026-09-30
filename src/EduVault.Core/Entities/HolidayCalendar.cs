using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// School-defined public holidays and optional days.
    /// Used to auto-exclude holidays from leave counts (if SandwichRule is OFF).
    /// </summary>
    public class HolidayCalendar
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;      // e.g. "Diwali", "Republic Day"
        public DateTime Date { get; set; }
        public string HolidayType { get; set; } = "National"; // National | Regional | School | Optional
        public bool IsOptional { get; set; } = false;         // Optional holiday (employee may work)
        public string? Description { get; set; }
        public bool IsRecurringYearly { get; set; } = false;   // Auto-generate next year
        public int AcademicYear { get; set; }                  // e.g. 2026
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual School? School { get; set; }
    }
}
