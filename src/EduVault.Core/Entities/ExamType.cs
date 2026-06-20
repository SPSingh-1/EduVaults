using System;

namespace EduVault.Core.Entities
{
    public class ExamType
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. Semester Examination, Mid-term assessment

        // Navigation property
        public virtual School? School { get; set; }
    }
}
