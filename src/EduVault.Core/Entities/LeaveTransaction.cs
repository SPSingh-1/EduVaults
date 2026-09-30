using System;

namespace EduVault.Core.Entities
{
    /// <summary>
    /// Immutable audit ledger for all leave balance movements.
    /// Every credit (accrual, carry-forward, manual adjustment) and every debit
    /// (leave approved, leave cancelled reversal) is recorded here.
    /// This is the single source of truth for leave balances.
    /// </summary>
    public class LeaveTransaction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public Guid EmployeeId { get; set; }        // Employee (HRM master) Id
        public Guid? TeacherUserId { get; set; }    // Legacy: auth User Id (for backward compat)
        public Guid LeavePolicyId { get; set; }     // Which leave type this transaction is for
        public string LeaveTypeCode { get; set; } = string.Empty; // Denormalized for fast queries

        // ─── Transaction Type ──────────────────────────────────────────────────
        // OPENING_BALANCE | MONTHLY_ACCRUAL | QUARTERLY_ACCRUAL | ANNUAL_GRANT |
        // CARRY_FORWARD | LEAVE_APPLIED | LEAVE_APPROVED | LEAVE_REJECTED_REVERSAL |
        // LEAVE_CANCELLED | ENCASHMENT | MANUAL_CREDIT | MANUAL_DEBIT
        public string TransactionType { get; set; } = string.Empty;

        // ─── Amount ────────────────────────────────────────────────────────────
        public decimal Amount { get; set; }         // Positive = credit, Negative = debit
        public decimal BalanceBefore { get; set; }
        public decimal BalanceAfter { get; set; }

        // ─── Reference ────────────────────────────────────────────────────────
        public Guid? LeaveRequestId { get; set; }   // Linked leave request if applicable
        public string? Remarks { get; set; }
        public Guid? ProcessedBy { get; set; }      // UserId of who triggered this
        public int AcademicYear { get; set; }       // e.g. 2026
        public int? Month { get; set; }             // 1-12, for monthly accrual records

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // ─── Navigation ────────────────────────────────────────────────────────
        public virtual School? School { get; set; }
        public virtual LeavePolicy? LeavePolicy { get; set; }
    }
}
