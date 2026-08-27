using System;

namespace EduVault.Core.Entities
{
    public class Employee
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid? UserId { get; set; } // Optional 1-to-1 if user has system login credentials
        public string EmployeeCode { get; set; } = string.Empty; // e.g. EMP-2026-001
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Gender { get; set; } = "Other"; // Male, Female, Other
        public DateTime? DateOfBirth { get; set; }
        public string Address { get; set; } = string.Empty;
        public string EmergencyContactName { get; set; } = string.Empty;
        public string EmergencyContactPhone { get; set; } = string.Empty;

        // Organizational Mapping
        public string StaffType { get; set; } = "Teaching"; // Teaching, NonTeaching, Administrative, Support, Transport, Security
        public Guid? DepartmentId { get; set; }
        public Guid? DesignationId { get; set; }
        public string DesignationName { get; set; } = string.Empty; // Denormalized for display
        public string DepartmentName { get; set; } = string.Empty;  // Denormalized for display
        public Guid? EmploymentTypeId { get; set; }
        public string EmploymentStatus { get; set; } = "Active"; // Applicant, Probation, Confirmed, Active, OnLeave, Suspended, Resigned, Terminated, Archived
        public DateTime JoiningDate { get; set; } = DateTime.UtcNow;
        public DateTime? ConfirmationDate { get; set; }
        public DateTime? ExitDate { get; set; }

        // Financial & Statutory
        public decimal BaseGrossSalary { get; set; } = 30000;
        public Guid? SalaryStructureId { get; set; }
        public bool PfApplicable { get; set; } = true;
        public bool EsiApplicable { get; set; } = true;
        public bool PtApplicable { get; set; } = true;
        public bool TdsApplicable { get; set; } = false;

        // Banking & Tax
        public string BankName { get; set; } = string.Empty;
        public string BankAccountNumber { get; set; } = string.Empty;
        public string BankIfscCode { get; set; } = string.Empty;
        public string PanNumber { get; set; } = string.Empty;
        public string AadhaarLast4 { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public virtual School? School { get; set; }
        public virtual User? User { get; set; }
        public virtual Department? Department { get; set; }
        public virtual TeacherProfile? TeacherProfile { get; set; }
    }
}
