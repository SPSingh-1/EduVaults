using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class Teacher
    {
        public Guid UserId { get; set; } // PK and FK to User
        public string EmployeeId { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string OfficeLocation { get; set; } = string.Empty;
        public string Qualifications { get; set; } = string.Empty;

        // Navigation properties
        public virtual User? User { get; set; }
        public virtual ICollection<Class> AdvisedClasses { get; set; } = new List<Class>();
        public virtual ICollection<ClassSubject> ClassSubjects { get; set; } = new List<ClassSubject>();
        public virtual ICollection<Exam> ProctoredExams { get; set; } = new List<Exam>();
    }
}
