using System;

namespace EduVault.Core.Entities
{
    public class Book
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string ISBN { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Publisher { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public int TotalCopies { get; set; } = 1;
        public int AvailableCopies { get; set; } = 1;
        public string ShelfLocation { get; set; } = string.Empty;
        public DateTime AddedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
