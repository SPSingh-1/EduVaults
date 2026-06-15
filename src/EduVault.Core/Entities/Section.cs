using System;

namespace EduVault.Core.Entities
{
    public class Section
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. Section A, Section B

        // Navigation property
        public virtual School? School { get; set; }
    }
}
