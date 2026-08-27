using System;

namespace EduVault.Core.Entities
{
    public class EmployeeDocument
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid EmployeeId { get; set; }
        public string DocumentType { get; set; } = string.Empty; // Aadhaar, PAN, Degree, ExperienceCertificate, JoiningLetter
        public string DocumentName { get; set; } = string.Empty;
        public string FileUrl { get; set; } = string.Empty;
        public string VerificationStatus { get; set; } = "Pending"; // Pending, Verified, Rejected
        public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual Employee? Employee { get; set; }
    }
}
