using System;

namespace EduVault.Core.Entities
{
    public class Attendance
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid StudentId { get; set; } // FK to Student (which maps 1-1 with User)
        public Guid SchoolId { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = string.Empty; // Present, Late, Absent
        public string? Remarks { get; set; }

        // Navigation properties
        public virtual Student? Student { get; set; }
    }
}
