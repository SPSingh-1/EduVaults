using System;

namespace EduVault.Core.Entities
{
    public class Department
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty;

        // Navigation property
        public virtual School? School { get; set; }
    }
}
