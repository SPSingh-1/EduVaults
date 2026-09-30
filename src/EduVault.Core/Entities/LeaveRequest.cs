using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Employee leave request. Supports full-day, half-day, multi-day, and WFH/OD leaves.
    /// Linked to LeavePolicy for eligibility validation; audit trail in LeaveTransaction.
    /// </summary>
    public class LeaveRequest
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }

        // ─── Employee Reference ────────────────────────────────────────────────
        public Guid? EmployeeId { get; set; }          // Preferred: HRM Employee Id
        public Guid TeacherUserId { get; set; }        // Legacy: Auth User Id (backward compat)
        public string EmployeeCode { get; set; } = string.Empty;  // Denormalized
        public string EmployeeName { get; set; } = string.Empty;  // Denormalized for approval views

        // ─── Leave Type ────────────────────────────────────────────────────────
        public Guid? LeavePolicyId { get; set; }       // Linked LeavePolicy (new architecture)
        public string LeaveType { get; set; } = string.Empty;     // "CL","SL","EL","ML","PL","CO","LWP","WFH","OD"
        public string LeaveTypeName { get; set; } = string.Empty; // Denormalized display name

        // ─── Duration ─────────────────────────────────────────────────────────
        public string DayType { get; set; } = "FullDay"; // FullDay | HalfDay | WorkFromHome | OutdoorDuty
        public string? HalfDaySession { get; set; }    // Morning | Afternoon
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public decimal TotalDays { get; set; }          // 0.5 for HalfDay; calculated working days
        public int TotalCalendarDays { get; set; }      // Raw calendar days before holiday exclusion

        // ─── Details ──────────────────────────────────────────────────────────
        public string Reason { get; set; } = string.Empty;
        public string? AttachmentUrl { get; set; }     // Medical cert, etc.
        public string? ContactDuringLeave { get; set; } // Mobile number reachable during leave
        public string? HandoverTo { get; set; }         // Who is handling work during absence
        public string? HandoverNotes { get; set; }

        // ─── Approval Workflow ─────────────────────────────────────────────────
        public string Status { get; set; } = "Pending"; // Pending | Approved | Rejected | Cancelled | Revoked
        public int CurrentApprovalLevel { get; set; } = 1;
        public string? ApproverOneId { get; set; }    // UserId of Level-1 approver (e.g. Reporting Manager)
        public DateTime? ApproverOneActionAt { get; set; }
        public string? ApproverOneAction { get; set; } // Approved | Rejected
        public string? ApproverOneNote { get; set; }
        public string? ApproverTwoId { get; set; }    // UserId of Level-2 approver (e.g. Principal)
        public DateTime? ApproverTwoActionAt { get; set; }
        public string? ApproverTwoAction { get; set; }
        public string? ApproverTwoNote { get; set; }
        public string? FinalApprovedById { get; set; }
        public string? RejectionNote { get; set; }

        // ─── Forward Workflow (School Admin -> Accounts) ───────────────────────
        public string? ForwardedById { get; set; }
        public string? ForwardedByName { get; set; }
        public DateTime? ForwardedAt { get; set; }
        public string? ForwardNote { get; set; }

        // ─── Timestamps ───────────────────────────────────────────────────────
        public DateTime AppliedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ApprovedAt { get; set; }
        public DateTime? CancelledAt { get; set; }
        public string? CancellationReason { get; set; }

        // ─── Navigation ───────────────────────────────────────────────────────
        public virtual School? School { get; set; }
        public virtual LeavePolicy? LeavePolicy { get; set; }
    }
}
