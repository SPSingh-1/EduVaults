using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class SalaryStructure
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string StructureName { get; set; } = string.Empty; // e.g. "Senior Teaching Faculty", "Support Staff"
        public string Description { get; set; } = string.Empty;
        public decimal BasePay { get; set; } = 0m;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual ICollection<SalaryStructureComponent> Components { get; set; } = new List<SalaryStructureComponent>();
    }
}
