using System;

namespace EduVault.Core.Entities
{
    public class SalaryStructureComponent
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SalaryStructureId { get; set; }
        public Guid SalaryComponentId { get; set; }
        public decimal Amount { get; set; } = 0m;
        public decimal Percentage { get; set; } = 0m;

        // Navigation properties
        public virtual SalaryStructure? SalaryStructure { get; set; }
        public virtual SalaryComponent? SalaryComponent { get; set; }
    }
}
