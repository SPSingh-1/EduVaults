using System;

namespace EduVault.Core.Entities
{
    public class StatutoryConfiguration
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string StatutoryType { get; set; } = "PF"; // PF, ESI, PT, TDS
        public bool IsEnabled { get; set; } = true;
        public string ConfigurationJson { get; set; } = "{}"; // Stores rate percentages, wage ceilings, state slabs
        public int VersionNumber { get; set; } = 1;
        public string? Remarks { get; set; }

        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation property
        public virtual School? School { get; set; }
    }
}
