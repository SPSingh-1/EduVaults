using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class Subject
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Code { get; set; } = string.Empty; // e.g. PHY101
        public string Name { get; set; } = string.Empty; // e.g. Theoretical Physics

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual ICollection<ClassSubject> ClassSubjects { get; set; } = new List<ClassSubject>();
        public virtual ICollection<Exam> Exams { get; set; } = new List<Exam>();
    }
}
