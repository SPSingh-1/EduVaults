using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class AnnualSchoolPlan
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string AcademicYear { get; set; } = string.Empty; // e.g. "2025-26"
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = "Draft"; // "Draft", "Published", "Archived"
        public string? RawAiResponse { get; set; }
        public string? PromptCustomizations { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public string? CreatedBy { get; set; }

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual ICollection<SchoolPlanEvent> Events { get; set; } = new List<SchoolPlanEvent>();
    }
}
