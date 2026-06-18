using System;

namespace EduVault.Core.Entities
{
    public class PlatformSetting
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string OrgName { get; set; } = "SuperAdmin Global";
        public string? LogoUrl { get; set; }
        public string? PrimaryColor { get; set; }
        public bool MaintenanceMode { get; set; } = false;
        public string? MaintenanceMessage { get; set; }
        public string? BackupFrequency { get; set; } = "Daily";
        public string? BackupTime { get; set; } = "02:00 AM";
        public string? BackupTarget { get; set; } = "Amazon S3: production-vault-01";
    }
}
