using System;

namespace EduVault.Core.Entities
{
    public class EnrollmentClass
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. Class 1, Class 2, ..., Class 12

        // Navigation property
        public virtual School? School { get; set; }
    }
}
