using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class Class
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Grade { get; set; } = string.Empty; // e.g. 10
        public string Section { get; set; } = string.Empty; // e.g. Section A
        public string Level { get; set; } = string.Empty; // e.g. Secondary Education
        public string Room { get; set; } = string.Empty;
        public int Capacity { get; set; } = 30;
        public Guid? ClassTeacherId { get; set; }
        public bool AreMarksPublished { get; set; } = false;

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual Teacher? ClassTeacher { get; set; }
        public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
        public virtual ICollection<ClassSubject> ClassSubjects { get; set; } = new List<ClassSubject>();
        public virtual ICollection<Exam> Exams { get; set; } = new List<Exam>();
    }
}
