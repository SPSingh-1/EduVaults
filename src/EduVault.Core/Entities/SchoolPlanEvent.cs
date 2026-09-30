using System;

namespace EduVault.Core.Entities
{
    public class SchoolPlanEvent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid PlanId { get; set; }
        public Guid SchoolId { get; set; }
        public int MonthNumber { get; set; } // 1 to 12
        public string MonthName { get; set; } = string.Empty; // "April", "May", ...
        public string Title { get; set; } = string.Empty;
        public string EventType { get; set; } = "Academic"; // "Exam", "Holiday", "Sports", "Cultural", "Meeting", "Academic"
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? TargetAudience { get; set; } // "All", "Teachers", "Students", "Parents"
        public string? Description { get; set; }
        public bool IsWhatsAppNotified { get; set; } = false;
        public DateTime? WhatsAppNotifiedAt { get; set; }

        // Navigation properties
        public virtual AnnualSchoolPlan? Plan { get; set; }
        public virtual School? School { get; set; }
    }
}
