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

        // Global platform payment integration settings
        public string? PaymentProvider { get; set; } = "razorpay";
        public string? RazorpayKeyId { get; set; }
        public string? RazorpayKeySecret { get; set; }
        public string? StripePublishableKey { get; set; }
        public string? StripeSecretKey { get; set; }
        public string? PayPalClientId { get; set; }
        public string? PayPalClientSecret { get; set; }
        public string? PhonePeMerchantId { get; set; }
        public string? PhonePeSaltKey { get; set; }
        public string? PhonePeSaltIndex { get; set; }
        public string? CashlessInstructions { get; set; }
    }
}
