using System;

namespace EduVault.Core.Entities
{
    public class SalaryComponent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Code { get; set; } = string.Empty; // BASIC, HRA, DA, SPECIAL_ALW, PF_EE, ESI_EE, PT, TDS
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "Earning"; // Earning, Deduction, EmployerContribution
        public string CalculationType { get; set; } = "Fixed"; // Fixed, PercentageOfBasic, PercentageOfGross, Formula
        public decimal DefaultValue { get; set; } = 0m;
        public string FormulaExpression { get; set; } = string.Empty;
        public bool IsTaxable { get; set; } = true;
        public bool IsPfApplicable { get; set; } = true;
        public bool IsEsiApplicable { get; set; } = true;
        public bool IsPtApplicable { get; set; } = true;
        public bool IsTdsApplicable { get; set; } = false;
        public bool IsStatutory { get; set; } = false;
        public bool IsActive { get; set; } = true;

        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }

        // Navigation property
        public virtual School? School { get; set; }
    }
}
