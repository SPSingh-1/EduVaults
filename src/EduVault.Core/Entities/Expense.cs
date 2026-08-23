using System;

namespace EduVault.Core.Entities
{
    public class Expense
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Category { get; set; } = string.Empty;        // "Salary","Maintenance","Supplies","Utility","Other"
        public string Title { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string? VoucherNumber { get; set; }
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
    }
}
