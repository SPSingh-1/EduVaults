using System;

namespace EduVault.Core.Entities
{
    public class Room
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. B-204, Room 101

        // Navigation property
        public virtual School? School { get; set; }
    }
}
