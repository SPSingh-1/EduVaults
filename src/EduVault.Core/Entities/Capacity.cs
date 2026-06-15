using System;

namespace EduVault.Core.Entities
{
    public class Capacity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public int Value { get; set; }

        // Navigation property
        public virtual School? School { get; set; }
    }
}
