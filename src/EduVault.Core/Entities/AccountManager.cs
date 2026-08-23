using System;

namespace EduVault.Core.Entities
{
    public class AccountManager
    {
        public Guid UserId { get; set; }                             // PK + FK → User (1-to-1)
        public Guid SchoolId { get; set; }
        public string EmployeeId { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;     // e.g. "Finance Head"
        public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual User? User { get; set; }
        public virtual School? School { get; set; }
    }
}
