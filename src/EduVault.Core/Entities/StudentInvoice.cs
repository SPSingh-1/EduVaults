using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class StudentInvoice
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid StudentId { get; set; }
        public Guid FeeStructureId { get; set; }
        public DateTime IssueDate { get; set; } = DateTime.UtcNow;
        public DateTime DueDate { get; set; }
        public decimal Amount { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Paid, Overdue, Cancelled

        // Navigation properties
        public virtual Student? Student { get; set; }
        public virtual FeeStructure? FeeStructure { get; set; }
        public virtual ICollection<PaymentTransaction> Transactions { get; set; } = new List<PaymentTransaction>();
    }
}
