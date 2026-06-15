using System;

namespace EduVault.Core.Entities
{
    public class TimetablePeriod
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public int PeriodNumber { get; set; }
        public string StartTime { get; set; } = string.Empty;
        public string EndTime { get; set; } = string.Empty;
        public int DurationMinutes { get; set; }
    }
}
