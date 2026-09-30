using System;

namespace EduVault.Core.Entities
{
    public class AdmissionInquiryEntry
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string ChildName { get; set; } = string.Empty;
        public string TargetClass { get; set; } = string.Empty;
        public string ParentName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "Inquiry"; // "Inquiry", "FollowUp", "Registered", "Enrolled", "Lost"
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Origin tracking & Application identifier
        public string Source { get; set; } = "manual"; // "manual", "qr_form", "csv_import"
        public string? ApplicationId { get; set; }     // e.g. "ADM-2026-4821"

        // Student Specifics
        public string? ChildFirstName { get; set; }
        public string? ChildMiddleName { get; set; }
        public string? ChildLastName { get; set; }
        public string? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? Category { get; set; }          // GEN, OBC, SC, ST, EWS
        public string? BloodGroup { get; set; }
        public string? Religion { get; set; }
        public string? MotherTongue { get; set; }
        public string? Nationality { get; set; } = "Indian";
        public string? PlaceOfBirth { get; set; }

        // Aadhaar (Optional - sensitive data compliance)
        public string? AadhaarHash { get; set; }       // SHA-256 for duplicate check
        public string? AadhaarEncrypted { get; set; }  // AES-256 encrypted for administrative view
        public string? AadhaarLastFour { get; set; }   // Visible to admin without decryption

        // Parents / Guardian
        public string? FatherName { get; set; }
        public string? FatherPhone { get; set; }
        public string? FatherOccupation { get; set; }
        public string? FatherQualification { get; set; }
        public string? MotherName { get; set; }
        public string? MotherPhone { get; set; }
        public string? MotherOccupation { get; set; }
        public string? GuardianEmail { get; set; }
        public string? AnnualFamilyIncome { get; set; }

        // Address components
        public string? HouseNo { get; set; }
        public string? StreetOrVillage { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }

        // Previous School / Transfer Certificate
        public string? PreviousSchoolName { get; set; }
        public string? PreviousBoard { get; set; }
        public string? PreviousClassStudied { get; set; }
        public string? PreviousTcNumber { get; set; }
        public string? PreviousTcDate { get; set; }
        public string? LastExamPercentage { get; set; }
        public string? ReasonForLeaving { get; set; }

        // Medical & Physical
        public float? HeightCm { get; set; }
        public float? WeightKg { get; set; }
        public bool HasDisability { get; set; } = false;
        public string? DisabilityType { get; set; }
        public string? DisabilityCertNo { get; set; }
        public string? ChronicIllness { get; set; }
        public string? CurrentMedication { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? EmergencyContactRelation { get; set; }

        // Document paths (Local / Cloudinary)
        public string? PhotoPath { get; set; }
        public string? BirthCertPath { get; set; }
        public string? TcDocPath { get; set; }

        // Security & Anti-abuse Metadata
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public bool IsHoneypotFlagged { get; set; } = false;
        public DateTime? ApprovedAt { get; set; }
        public string? ApprovedBy { get; set; }

        // Navigation property
        public virtual School? School { get; set; }
    }
}
