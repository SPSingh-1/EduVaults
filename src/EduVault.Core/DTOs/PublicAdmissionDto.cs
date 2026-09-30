using System;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.DTOs
{
    public class PublicAdmissionDto
    {
        // ── Anti-bot Honeypot & Privacy Consent ──
        public string? WebsiteUrl { get; set; } // Invisible honeypot
        public bool PrivacyConsent { get; set; } = true;

        // ── Target Grade ──
        [Required]
        public string TargetClass { get; set; } = string.Empty;

        // ── Student Basic Details ──
        [Required]
        public string ChildFirstName { get; set; } = string.Empty;
        public string? ChildMiddleName { get; set; }
        [Required]
        public string ChildLastName { get; set; } = string.Empty;

        [Required]
        public string DateOfBirth { get; set; } = string.Empty;

        [Required]
        public string Gender { get; set; } = string.Empty;

        public string? Category { get; set; } = "GEN"; // GEN, OBC, SC, ST, EWS
        public string? BloodGroup { get; set; }
        public string? Religion { get; set; }
        public string? MotherTongue { get; set; }
        public string? Nationality { get; set; } = "Indian";
        public string? PlaceOfBirth { get; set; }

        // Optional Aadhaar (compliance: if available)
        public string? AadhaarNumber { get; set; }

        // ── Parents & Guardian ──
        [Required]
        public string FatherName { get; set; } = string.Empty;

        [Required]
        public string FatherPhone { get; set; } = string.Empty;

        public string? FatherOccupation { get; set; }
        public string? FatherQualification { get; set; }
        public string? FatherEmail { get; set; }

        public string? MotherName { get; set; }
        public string? MotherPhone { get; set; }
        public string? MotherOccupation { get; set; }
        public string? AnnualFamilyIncome { get; set; }

        // ── Address ──
        public string? HouseNo { get; set; }
        public string? StreetOrVillage { get; set; }
        [Required]
        public string City { get; set; } = string.Empty;
        public string? District { get; set; }
        [Required]
        public string State { get; set; } = string.Empty;
        [Required]
        public string Pincode { get; set; } = string.Empty;

        // ── Previous School Info ──
        public string? PreviousSchoolName { get; set; }
        public string? PreviousBoard { get; set; }
        public string? PreviousClassStudied { get; set; }
        public string? PreviousTcNumber { get; set; }
        public string? PreviousTcDate { get; set; }
        public string? LastPercentage { get; set; }
        public string? LastExamPercentage { get; set; }
        public string? ReasonForLeaving { get; set; }

        // ── Medical & Emergency Contact ──
        public float? HeightCm { get; set; }
        public float? WeightKg { get; set; }
        public bool HasDisability { get; set; } = false;
        public string? DisabilityType { get; set; }
        public string? ChronicIllness { get; set; }
        public string? CurrentMedication { get; set; }

        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? EmergencyContactRelation { get; set; }
    }
}
