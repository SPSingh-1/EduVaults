using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class FeeStructure
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. Monthly Tuition Fee
        public string Grade { get; set; } = string.Empty; // Specific grade level, or empty for all
        public decimal Amount { get; set; }
        public string Frequency { get; set; } = string.Empty; // Monthly, Annual, One-time

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual ICollection<StudentInvoice> Invoices { get; set; } = new List<StudentInvoice>();
    }
}
