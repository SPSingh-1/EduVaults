using System;

namespace EduVault.Core.Entities
{
    public class LeavePolicy
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string LeaveTypeCode { get; set; } = "CL"; // CL, SL, EL, ML, LWP, CO
        public string LeaveTypeName { get; set; } = "Casual Leave";
        public decimal AnnualAllotment { get; set; } = 12.0m;
        public bool CarryForwardAllowed { get; set; } = false;
        public decimal MaxCarryForwardDays { get; set; } = 0m;
        public bool EncashmentAllowed { get; set; } = false;
        public bool IsPaid { get; set; } = true;
        public bool RequiresAttachment { get; set; } = false;
        public string ApprovalSequenceJson { get; set; } = "[\"ReportingManager\", \"Principal\"]";
        public bool IsActive { get; set; } = true;

        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }

        // Navigation property
        public virtual School? School { get; set; }
    }
}
