using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class FeeStructure
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Name { get; set; } = string.Empty; // e.g. Monthly Tuition Fee, Supplementary Exam Fee
        public string Grade { get; set; } = string.Empty; // Specific grade level, or empty for all
        public decimal Amount { get; set; }
        public string Frequency { get; set; } = string.Empty; // Monthly, Annual, One-time
        public int Installments { get; set; } = 1;
        public Guid? StudentId { get; set; }
        public string? SubmissionTime { get; set; } = string.Empty;
        public string? Breakdown { get; set; } = string.Empty;

        // Financial & Late Fee Rules
        public string FeeCategory { get; set; } = "Standard"; // Standard, SupplementaryExam, Arrears, Transport, Fine
        public decimal LateFeePerDay { get; set; } = 0.0m;
        public int GracePeriodDays { get; set; } = 0;
        public bool IsCustomPaymentAllowed { get; set; } = true;
        public decimal MinPartialPaymentAmount { get; set; } = 100.0m;

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual User? Student { get; set; }
        public virtual ICollection<StudentInvoice> Invoices { get; set; } = new List<StudentInvoice>();
    }
}
