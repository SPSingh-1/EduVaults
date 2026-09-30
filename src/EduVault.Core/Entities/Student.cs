using System;
using System.Collections.Generic;

namespace EduVault.Core.Entities
{
    public class Student
    {
        public Guid UserId { get; set; } // PK and FK to User
        public string StudentId { get; set; } = string.Empty; // Unique code STU-XXX
        public string BloodGroup { get; set; } = string.Empty;
        public string GuardianName { get; set; } = string.Empty;
        public string GuardianPhone { get; set; } = string.Empty;
        public string GuardianRelationship { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string DateOfBirth { get; set; } = string.Empty;

        // ── Tab 1: Student Demographics & Identification ──
        public string? MiddleName { get; set; }
        public string? Gender { get; set; }
        public string? Religion { get; set; }
        public string? Category { get; set; }           // GEN, OBC, SC, ST, EWS
        public string? SubCaste { get; set; }
        public string? Nationality { get; set; } = "Indian";
        public string? MotherTongue { get; set; }
        public string? AadhaarNumber { get; set; }      // Optional / Encrypted storage
        public string? PlaceOfBirth { get; set; }
        public string? PhotoUrl { get; set; }
        public string? AdmissionNumber { get; set; }    // School official enrollment number
        public DateTime? AdmissionDate { get; set; }
        public string? AdmissionSource { get; set; }    // "qr_form", "csv_import", "manual"

        // ── Tab 2: Parent & Family Details ──
        public string? FatherName { get; set; }
        public string? FatherPhone { get; set; }
        public string? FatherEmail { get; set; }
        public string? FatherOccupation { get; set; }
        public string? FatherQualification { get; set; }
        public string? FatherAadhaar { get; set; }
        public string? MotherName { get; set; }
        public string? MotherPhone { get; set; }
        public string? MotherOccupation { get; set; }
        public string? AnnualFamilyIncome { get; set; }
        public bool IsBplFamily { get; set; } = false;
        public int? SiblingsCount { get; set; }
        public string? SiblingInSchool { get; set; }

        // ── Tab 3: Academic Preferences & Logistics ──
        public string? HouseGroup { get; set; }         // Red, Blue, Green, Yellow
        public string? MediumOfInstruction { get; set; }
        public string? FeeCategory { get; set; }
        public string? BusRoute { get; set; }
        public string? BusStop { get; set; }
        public bool HostelRequired { get; set; } = false;

        // ── Tab 4: Address Details ──
        public string? HouseNo { get; set; }
        public string? Village { get; set; }
        public string? City { get; set; }
        public string? District { get; set; }
        public string? State { get; set; }
        public string? Pincode { get; set; }

        // ── Tab 5: Previous School & Inward TC ──
        public string? PreviousSchoolName { get; set; }
        public string? PreviousSchoolBoard { get; set; }
        public string? PreviousClassStudied { get; set; }
        public string? PreviousTcNumber { get; set; }
        public string? PreviousTcDate { get; set; }
        public string? PreviousTcDocumentUrl { get; set; }
        public string? LastExamPercentage { get; set; }
        public string? ReasonForLeaving { get; set; }
        public string? MigrationCertNo { get; set; }

        // ── Tab 6: Medical & Physical ──
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

        // ── Outward TC (Student leaving school & TC issued) ──
        public string? OutwardTcNumber { get; set; }
        public DateTime? OutwardTcIssuedDate { get; set; }
        public string? TcReason { get; set; }
        public string? TcConductRemark { get; set; }
        public string? LeavingClass { get; set; }

        // ── Lifelong Legal & Board Verification Credentials (20-Year Dossier) ──
        public string? IdentificationMark { get; set; }         // Visible identification mark for TC & Govt jobs
        public string? BirthCertificateNumber { get; set; }      // Official DoB proof
        public string? CasteCertificateNumber { get; set; }      // Reserved category proof
        public string? BoardRegistrationNumber { get; set; }      // CBSE / State Board Roll / Reg No
        public string? InitialAdmissionClass { get; set; }        // Grade / Class first admitted into

        // Navigation properties
        public virtual User? User { get; set; }
        public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
        public virtual ICollection<ExamResult> ExamResults { get; set; } = new List<ExamResult>();
        public virtual ICollection<StudentInvoice> Invoices { get; set; } = new List<StudentInvoice>();
    }
}
