using System;

namespace EduVault.Core.Entities
{
    public class SupportTicket
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string TicketNumber { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string SchoolName { get; set; } = string.Empty;
        public string Status { get; set; } = "OPEN"; // OPEN, IN PROGRESS, RESOLVED
        public string Priority { get; set; } = "MEDIUM"; // HIGH, MEDIUM, LOW
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
