using System;

namespace EduVault.Core.Entities
{
    public class Enrollment
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid StudentId { get; set; }
        public Guid ClassId { get; set; }
        public string AcademicYear { get; set; } = string.Empty; // e.g. 2023-24, 2026-27
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, PROMOTED, ADMIN_PROMOTED, COMPARTMENT_PENDING, RETAINED_REPEAT, WITHDRAWN, SUSPENDED
        public DateTime EnrollDate { get; set; } = DateTime.UtcNow;

        // Academic Outcome & Promotion/Detention Audit Fields
        public int FailedSubjectsCount { get; set; } = 0;
        public string? AcademicOutcomeRemark { get; set; }
        public bool IsAdminOverride { get; set; } = false;
        public string? OverrideReason { get; set; }

        // Navigation properties
        public virtual Student? Student { get; set; }
        public virtual Class? Class { get; set; }
    }
}
