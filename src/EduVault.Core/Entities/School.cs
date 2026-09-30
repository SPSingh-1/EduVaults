using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class School
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string Website { get; set; } = string.Empty;
        public string SchoolCode { get; set; } = string.Empty;
        public string Status { get; set; } = "Active"; // Active, Pending, Suspended
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? LogoUrl { get; set; }
        public string? EmailDomain { get; set; }
        public string? ThemeColor { get; set; }

        // Module permissions granted by Super Admin
        public bool HasAccountModule { get; set; } = false;
        public bool HasLibraryModule { get; set; } = false;
        public bool HasReceptionistModule { get; set; } = true;

        public string? RazorpayKeyId { get; set; }
        public string? RazorpayKeySecret { get; set; }
        public string? TwilioAccountSid { get; set; }
        public string? TwilioAuthToken { get; set; }
        public string? TwilioWhatsAppFromNumber { get; set; }
        
        public string? WhatsAppProvider { get; set; } // "twilio", "meta", "custom"
        public bool UseSharedWhatsApp { get; set; } = false; // Super Admin shared WhatsApp gateway fallback
        public string? MetaAccessToken { get; set; }
        public string? MetaPhoneNumberId { get; set; }
        public string? MetaWhatsAppFromNumber { get; set; }
        public string? CustomProviderUrl { get; set; }
        public string? CustomProviderApiKey { get; set; }
        public string? CustomProviderFromNumber { get; set; }

        public string? PaymentProvider { get; set; } // "razorpay", "stripe", "paypal", "phonepe", "cashless"
        public string? SchoolUpiId { get; set; }
        public string? StripePublishableKey { get; set; }
        public string? StripeSecretKey { get; set; }
        public string? PayPalClientId { get; set; }
        public string? PayPalClientSecret { get; set; }
        public string? PhonePeMerchantId { get; set; }
        public string? PhonePeSaltKey { get; set; }
        public string? PhonePeSaltIndex { get; set; }
        public string? CashlessInstructions { get; set; }

        // WhatsApp Notification Event Triggers
        public bool WhatsAppFeeReceiptsEnabled { get; set; } = true;
        public bool WhatsAppFeeRemindersEnabled { get; set; } = true;
        public bool WhatsAppLibraryAlertsEnabled { get; set; } = true;
        public bool WhatsAppGatePassAlertsEnabled { get; set; } = true;
        public bool WhatsAppAdmissionInquiryEnabled { get; set; } = true;
        public bool WhatsAppTcNoticeEnabled { get; set; } = true;

        // Dynamic Role-Based Password Generation Patterns
        public string? StudentPasswordPattern { get; set; } = "stu@currentyear!";
        public string? TeacherPasswordPattern { get; set; } = "tea@currentyear!";
        public string? ReceptionistPasswordPattern { get; set; } = "rec@currentyear!";
        public string? AccountantPasswordPattern { get; set; } = "acc@currentyear!";

        // Academic Session & Batch Promotion Timeline Settings
        public string? CurrentAcademicSession { get; set; } = "2025-26";
        public DateTime? SessionStartDate { get; set; }
        public DateTime? SessionEndDate { get; set; }
        public DateTime? PromotionOpensDate { get; set; }
        public string? NextAcademicSession { get; set; } = "2026-27";

        // Navigation properties
        public virtual ICollection<User> Users { get; set; } = new List<User>();
        public virtual ICollection<Class> Classes { get; set; } = new List<Class>();
        public virtual ICollection<Subject> Subjects { get; set; } = new List<Subject>();
        public virtual ICollection<FeeStructure> FeeStructures { get; set; } = new List<FeeStructure>();
        public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }
}
