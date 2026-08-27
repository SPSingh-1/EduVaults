using System;

namespace EduVault.Core.Entities
{
    public class PayrollItem
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid PayrollId { get; set; }
        public Guid EmployeeId { get; set; }

        public string EmployeeName { get; set; } = string.Empty;
        public string EmployeeCode { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;

        // Attendance Stats
        public int TotalWorkingDays { get; set; } = 30;
        public decimal PresentDays { get; set; } = 0m;
        public decimal HalfDays { get; set; } = 0m;
        public decimal PaidLeaveDays { get; set; } = 0m;
        public decimal LwpDays { get; set; } = 0m;

        // Monetary Totals
        public decimal BaseGross { get; set; } = 0m;
        public decimal BasicEarned { get; set; } = 0m;
        public decimal GrossEarned { get; set; } = 0m;
        public decimal TotalAllowances { get; set; } = 0m;
        public decimal StatutoryDeductions { get; set; } = 0m;
        public decimal LwpDeduction { get; set; } = 0m;
        public decimal ManualAdjustments { get; set; } = 0m;
        public decimal NetSalary { get; set; } = 0m;

        // Itemized breakdowns in JSON format
        public string ItemizedEarningsJson { get; set; } = "[]";
        public string ItemizedDeductionsJson { get; set; } = "[]";
        public string Status { get; set; } = "Draft"; // Draft, Reviewed, Finalized, Paid
        public string? Remarks { get; set; }

        // Navigation properties
        public virtual Payroll? Payroll { get; set; }
        public virtual Employee? Employee { get; set; }
    }
}
