using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// School-configurable leave policy. Each school defines its own leave types, 
    /// accrual rules, gender eligibility, probation rules, carry-forward, and encashment.
    /// Zero hardcoded values — 100% school-driven configuration.
    /// </summary>
    public class LeavePolicy
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }

        // ─── Leave Type Identity ───────────────────────────────────────────────
        public string LeaveTypeCode { get; set; } = "CL";  // CL, SL, EL, ML, PL, CO, LWP, WFH, OD, COMP, MTERNITY, PTERNITY
        public string LeaveTypeName { get; set; } = "Casual Leave";
        public string? Description { get; set; }
        public string ColorHex { get; set; } = "#3B82F6"; // UI badge color

        // ─── Entitlement ───────────────────────────────────────────────────────
        public decimal AnnualAllotment { get; set; } = 12.0m;  // Total days per year
        public string AccrualFrequency { get; set; } = "Annual"; // Annual | Monthly | Quarterly | None
        // If Monthly: 1 day/month = 12/yr; if Quarterly: 3/quarter = 12/yr
        public decimal AccrualUnitsPerPeriod { get; set; } = 1.0m; // e.g. 1.0 for 1 day/month

        // ─── Joining / Cutoff Rule ─────────────────────────────────────────────
        public string JoiningRule { get; set; } = "NextMonth"; // Immediate | CurrentMonth | NextMonth
        // "Immediate" = starts accruing from DOJ regardless
        // "CurrentMonth" = accrues if joined on or before JoiningCutoffDay of the month
        // "NextMonth" = only starts accruing from next month's cycle
        public int JoiningCutoffDay { get; set; } = 15; // For CurrentMonth rule: if joined on/before 15th, count that month

        // ─── Eligibility Rules ─────────────────────────────────────────────────
        public string GenderEligibility { get; set; } = "All"; // All | Male | Female
        public bool ProbationEligible { get; set; } = false;   // Can probation employees take this leave?
        public int MinimumServiceDays { get; set; } = 0;       // 0 = no minimum
        public string StaffTypeEligibilityJson { get; set; } = "[\"Teaching\",\"NonTeaching\",\"Administrative\",\"Support\",\"Transport\",\"Security\"]";
        // JSON array of eligible staff types

        // ─── Behavior ─────────────────────────────────────────────────────────
        public bool IsPaid { get; set; } = true;
        public bool RequiresAttachment { get; set; } = false;  // Medical certificate, etc.
        public int MinAttachmentAfterDays { get; set; } = 0;   // Require attachment if leave > N days
        public bool AllowHalfDay { get; set; } = true;
        public int MaxConsecutiveDays { get; set; } = 0;       // 0 = no limit
        public int MaxApplicationsPerYear { get; set; } = 0;   // 0 = no limit
        public int NoticePeriodDays { get; set; } = 0;         // Advance notice required
        public bool SandwichRuleApplied { get; set; } = false; // Weekends/holidays in between counted

        // ─── Carry Forward & Encashment ────────────────────────────────────────
        public bool CarryForwardAllowed { get; set; } = false;
        public decimal MaxCarryForwardDays { get; set; } = 0m;
        public int CarryForwardExpiryMonths { get; set; } = 12; // How many months carry-forward balance is valid
        public bool EncashmentAllowed { get; set; } = false;
        public decimal MaxEncashmentDays { get; set; } = 0m;

        // ─── Approval Workflow ─────────────────────────────────────────────────
        public string ApprovalSequenceJson { get; set; } = "[\"ReportingManager\",\"Principal\"]";
        // JSON array: e.g. ["ReportingManager","Principal","HRManager"]

        // ─── Status & Lifecycle ────────────────────────────────────────────────
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; } = 0;
        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // ─── Navigation ────────────────────────────────────────────────────────
        public virtual School? School { get; set; }
    }
}
