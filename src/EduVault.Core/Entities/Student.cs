using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class Student
    {
        public Guid UserId { get; set; } // PK and FK to User
        public string StudentId { get; set; } = string.Empty; // Unique code STU-XXX
        public string BloodGroup { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianPhone { get; set; } = string.Empty;
        public string GuardianRelationship { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;

        // Navigation properties
        public virtual User? User { get; set; }
        public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
        public virtual ICollection<ExamResult> ExamResults { get; set; } = new List<ExamResult>();
        public virtual ICollection<StudentInvoice> Invoices { get; set; } = new List<StudentInvoice>();
    }
}
