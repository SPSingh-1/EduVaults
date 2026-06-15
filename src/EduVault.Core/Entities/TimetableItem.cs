using System;

namespace EduVault.Core.Entities
{
    public class TimetableItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid ClassId { get; set; }
        public Guid? TeacherId { get; set; }
        public Guid? SubjectId { get; set; }
        public string? CustomSubjectName { get; set; }
        public int PeriodNumber { get; set; }
        public string DayOfWeek { get; set; } = string.Empty; // Monday, Tuesday, etc.
        public string? Remark { get; set; }
        public Guid? OriginalTeacherId { get; set; }
        public bool IsRescheduled { get; set; } = false;

        // Navigation properties
        public virtual Class? Class { get; set; }
        public virtual Subject? Subject { get; set; }
        public virtual Teacher? Teacher { get; set; }
    }
}
