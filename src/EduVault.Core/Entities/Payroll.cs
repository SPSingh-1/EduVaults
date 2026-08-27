using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class Payroll
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public int PeriodMonth { get; set; }
        public int PeriodYear { get; set; }
        public DateTime PeriodStartDate { get; set; }
        public DateTime PeriodEndDate { get; set; }

        public int TotalEmployeesProcessed { get; set; } = 0;
        public decimal TotalGrossPay { get; set; } = 0m;
        public decimal TotalDeductions { get; set; } = 0m;
        public decimal TotalNetPay { get; set; } = 0m;

        public string Status { get; set; } = "Draft"; // Draft, Calculated, Reviewed, Approved, Finalized, Paid
        public DateTime? ReviewedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime? FinalizedAt { get; set; }
        public DateTime? PaidAt { get; set; }
        public string? BankBatchRef { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual ICollection<PayrollItem> Items { get; set; } = new List<PayrollItem>();
        public virtual PayrollSnapshot? Snapshot { get; set; }
    }
}
