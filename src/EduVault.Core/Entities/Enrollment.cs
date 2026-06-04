using System;

namespace EduVault.Core.Entities
{
    public class Enrollment
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid StudentId { get; set; }
        public Guid ClassId { get; set; }
        public string AcademicYear { get; set; } = string.Empty; // e.g. 2023-24
        public string Status { get; set; } = "ACTIVE"; // ACTIVE, WITHDRAWN, SUSPENDED
        public DateTime EnrollDate { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual Student? Student { get; set; }
        public virtual Class? Class { get; set; }
    }
}
