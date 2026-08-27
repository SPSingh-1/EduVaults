using System;

namespace EduVault.Core.Entities
{
    public class TeacherProfile
    {
        public Guid EmployeeId { get; set; } // PK + FK -> Employee.Id (1-to-1)
        public string Qualification { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        public int MaxWeeklyPeriods { get; set; } = 30;

        // Navigation property
        public virtual Employee? Employee { get; set; }
    }
}
