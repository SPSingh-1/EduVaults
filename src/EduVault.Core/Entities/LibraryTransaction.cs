using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Library book issue/return transaction.
    /// Fine = MAX(0, (ReturnDate - DueDate).Days) * LibrarySettings.FinePerDay
    /// </summary>
    public class LibraryTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid BookId { get; set; }
        public Guid MemberId { get; set; }                           // FK → User (student or teacher)
        public string MemberType { get; set; } = string.Empty;      // "student", "teacher"
        public string MemberName { get; set; } = string.Empty;      // denormalized for fast display
        public DateTime IssueDate { get; set; }
        public DateTime DueDate { get; set; }
        public DateTime? ReturnDate { get; set; }
        public string Status { get; set; } = "Issued";              // "Issued", "Returned", "Overdue"
        public decimal FineAmount { get; set; } = 0;                // calculated on return
        public bool FinePaid { get; set; } = false;

        // Navigation properties
        public virtual Book? Book { get; set; }
        public virtual School? School { get; set; }
    }
}
