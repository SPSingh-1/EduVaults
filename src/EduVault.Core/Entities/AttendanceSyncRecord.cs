using System;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Core.Entities
{
    public class AttendanceSyncRecord
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid SchoolId { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [MaxLength(50)]
        public string EmployeeCode { get; set; } = string.Empty;

        [MaxLength(50)]
        public string SourceSystem { get; set; } = "MongoDB";

        [MaxLength(100)]
        public string SourceRecordId { get; set; } = string.Empty;

        public DateTime PunchDate { get; set; }

        public DateTime? CheckInTime { get; set; }

        public DateTime? CheckOutTime { get; set; }

        [MaxLength(20)]
        public string Status { get; set; } = "Present";

        [MaxLength(20)]
        public string SyncStatus { get; set; } = "Synced";

        public DateTime SyncedAt { get; set; } = DateTime.UtcNow;

        public string Remarks { get; set; } = string.Empty;
    }
}
