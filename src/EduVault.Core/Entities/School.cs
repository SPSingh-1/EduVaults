using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class School
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Website { get; set; } = string.Empty;
        public string SchoolCode { get; set; } = string.Empty;
        public string Status { get; set; } = "Active"; // Active, Pending, Suspended
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual ICollection<User> Users { get; set; } = new List<User>();
        public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
        public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();
        public virtual ICollection<FeeStructure> FeeStructures { get; set; } = new List<FeeStructure>();
        public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }
}
