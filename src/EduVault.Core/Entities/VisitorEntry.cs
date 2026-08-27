using System;

namespace EduVault.Core.Entities
{
    public class VisitorEntry
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string VisitorName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string? StudentName { get; set; }
        public string? ClassSection { get; set; }
        public string? WhomToMeet { get; set; }
        public DateTime CheckInTime { get; set; } = DateTime.UtcNow;
        public DateTime? CheckOutTime { get; set; }
        public string Status { get; set; } = "Active"; // "Active", "Checked Out"

        // Navigation property
        public virtual School? School { get; set; }
    }
}
