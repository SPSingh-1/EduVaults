using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Per-school library configuration. Librarian manages these settings.
    /// FinePerDay is visible to students/teachers on their dashboards.
    /// </summary>
    public class LibrarySettings
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public decimal FinePerDay { get; set; } = 2.00m;            // Librarian sets this
        public int MaxIssueDays { get; set; } = 14;                  // Default loan period
        public int MaxBooksPerMember { get; set; } = 3;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
