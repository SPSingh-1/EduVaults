using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Services
{
    /// <summary>
    /// Enterprise Leave Balance Engine.
    /// 
    /// Computes accurate, dynamic leave balances considering:
    ///   1. Gender eligibility (Male-only, Female-only, or All)
    ///   2. Probation status (policies may block probationers)
    ///   3. Minimum service requirement (minimum days from DOJ)
    ///   4. Staff type eligibility (Teaching, NonTeaching, etc.)
    ///   5. Accrual frequency (Monthly, Quarterly, Annual, None)
    ///   6. Joining cutoff rule (Immediate / CurrentMonth / NextMonth)
    ///   7. Carry-forward from prior year
    ///   8. Manual credits/debits from admin adjustments
    ///   9. Holiday exclusion from leave counts (if sandwich rule is OFF)
    ///  10. Sandwich rule (weekends/holidays in between count as leave days)
    /// </summary>
    public interface ILeaveBalanceEngine
    {
        Task<List<EmployeeLeaveBalanceDto>> GetEmployeeBalancesAsync(Guid schoolId, Guid employeeId, Guid? teacherUserId, int academicYear);
        Task<EmployeeLeaveBalanceDto?> GetSingleBalanceAsync(Guid schoolId, Guid employeeId, Guid? teacherUserId, Guid leavePolicyId, int academicYear);
        Task<List<LeavePolicy>> GetEligiblePoliciesAsync(Guid schoolId, Employee employee);
        Task<decimal> CalculateAccruedDaysAsync(LeavePolicy policy, Employee employee, int academicYear, DateTime asOf);
        Task<(bool IsValid, string Error)> ValidateLeaveApplicationAsync(Guid schoolId, Employee employee, Guid leavePolicyId, DateTime fromDate, DateTime toDate, string dayType);
        Task<decimal> CalculateLeaveDurationAsync(Guid schoolId, DateTime fromDate, DateTime toDate, string dayType, bool sandwichRuleApplied, int academicYear);
        Task RecalculateAndSaveBalancesAsync(Guid schoolId, Guid employeeId, Guid? teacherUserId, int academicYear);
    }

    public class LeaveBalanceEngine : ILeaveBalanceEngine
    {
        private readonly EduVaultDbContext _context;

        public LeaveBalanceEngine(EduVaultDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Returns all eligible leave policies with computed balances for an employee.
        /// </summary>
        public async Task<List<EmployeeLeaveBalanceDto>> GetEmployeeBalancesAsync(Guid schoolId, Guid employeeId, Guid? teacherUserId, int academicYear)
        {
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.SchoolId == schoolId);

            if (employee == null)
            {
                // Fallback: lookup by teacherUserId (legacy flow)
                if (teacherUserId.HasValue)
                {
                    employee = await _context.Employees.AsNoTracking()
                        .FirstOrDefaultAsync(e => (e.UserId == teacherUserId || e.Email != null) && e.SchoolId == schoolId);
                }
                if (employee == null) return new List<EmployeeLeaveBalanceDto>();
            }

            var eligiblePolicies = await GetEligiblePoliciesAsync(schoolId, employee);
            var result = new List<EmployeeLeaveBalanceDto>();
            var asOf = DateTime.UtcNow;

            foreach (var policy in eligiblePolicies)
            {
                var balance = await ComputeBalanceAsync(schoolId, employee, policy, academicYear, asOf, teacherUserId);
                result.Add(balance);
            }

            return result.OrderBy(b => b.SortOrder).ToList();
        }

        public async Task<EmployeeLeaveBalanceDto?> GetSingleBalanceAsync(Guid schoolId, Guid employeeId, Guid? teacherUserId, Guid leavePolicyId, int academicYear)
        {
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.SchoolId == schoolId);

            if (employee == null && teacherUserId.HasValue)
            {
                employee = await _context.Employees.AsNoTracking()
                    .FirstOrDefaultAsync(e => e.UserId == teacherUserId && e.SchoolId == schoolId);
            }
            if (employee == null) return null;

            var policy = await _context.LeavePolicies.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == leavePolicyId && p.SchoolId == schoolId && p.IsActive);
            if (policy == null) return null;

            return await ComputeBalanceAsync(schoolId, employee, policy, academicYear, DateTime.UtcNow, teacherUserId);
        }

        /// <summary>
        /// Filters school leave policies to only those the employee is eligible for.
        /// Checks: gender, probation, staff type, minimum service days, effective date.
        /// </summary>
        public async Task<List<LeavePolicy>> GetEligiblePoliciesAsync(Guid schoolId, Employee employee)
        {
            var policies = await _context.LeavePolicies.AsNoTracking()
                .Where(p => p.SchoolId == schoolId && p.IsActive && p.EffectiveFrom <= DateTime.UtcNow)
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            var today = DateTime.UtcNow.Date;
            var serviceDays = (today - employee.JoiningDate.Date).Days;

            return policies.Where(p =>
            {
                // 1. Effective date check
                if (p.EffectiveTo.HasValue && p.EffectiveTo.Value.Date < today) return false;

                // 2. Gender eligibility
                if (p.GenderEligibility != "All")
                {
                    var empGender = (employee.Gender ?? "Other").Trim();
                    if (!p.GenderEligibility.Equals(empGender, StringComparison.OrdinalIgnoreCase)) return false;
                }

                // 3. Probation eligibility
                if (!p.ProbationEligible)
                {
                    var isProbation = employee.EmploymentStatus.Equals("Probation", StringComparison.OrdinalIgnoreCase);
                    if (isProbation) return false;
                }

                // 4. Minimum service days
                if (p.MinimumServiceDays > 0 && serviceDays < p.MinimumServiceDays) return false;

                // 5. Staff type eligibility
                if (!string.IsNullOrWhiteSpace(p.StaffTypeEligibilityJson))
                {
                    try
                    {
                        var eligibleTypes = JsonSerializer.Deserialize<List<string>>(p.StaffTypeEligibilityJson);
                        if (eligibleTypes != null && eligibleTypes.Count > 0)
                        {
                            bool isEligible = eligibleTypes.Any(t => t.Equals(employee.StaffType, StringComparison.OrdinalIgnoreCase));
                            if (!isEligible) return false;
                        }
                    }
                    catch { /* Malformed JSON — treat as all eligible */ }
                }

                return true;
            }).ToList();
        }

        /// <summary>
        /// Calculates how many days should have accrued for this employee for this policy,
        /// as of today, based on DOJ, accrual frequency, and joining rule.
        /// </summary>
        public async Task<decimal> CalculateAccruedDaysAsync(LeavePolicy policy, Employee employee, int academicYear, DateTime asOf)
        {
            await Task.CompletedTask; // Pure computation

            if (policy.AccrualFrequency == "Annual" || policy.AccrualFrequency == "None")
            {
                // For Annual: full allotment granted at start of year (if employee was already there)
                // "None" policies have a fixed allotment without accrual
                return policy.AnnualAllotment;
            }

            var yearStart = new DateTime(academicYear, 1, 1);
            var effectiveStart = employee.JoiningDate > yearStart ? employee.JoiningDate : yearStart;

            // Apply joining rule to determine accrual start month
            DateTime accrualStartDate = ApplyJoiningRule(policy, employee.JoiningDate, effectiveStart);

            // Clamp to academic year bounds
            if (accrualStartDate.Year > academicYear) return 0;
            if (accrualStartDate < yearStart) accrualStartDate = yearStart;

            decimal totalAccrued = 0;

            if (policy.AccrualFrequency == "Monthly")
            {
                // Count completed months from accrualStartDate to asOf
                int completedMonths = CountCompletedMonths(accrualStartDate, asOf);
                totalAccrued = completedMonths * policy.AccrualUnitsPerPeriod;
            }
            else if (policy.AccrualFrequency == "Quarterly")
            {
                // Count completed quarters
                int completedQuarters = CountCompletedQuarters(accrualStartDate, asOf);
                totalAccrued = completedQuarters * policy.AccrualUnitsPerPeriod;
            }

            // Never exceed the annual allotment
            return Math.Min(totalAccrued, policy.AnnualAllotment);
        }

        /// <summary>
        /// Validates if a leave application is permissible.
        /// Returns true if valid; false with an error message if blocked.
        /// </summary>
        public async Task<(bool IsValid, string Error)> ValidateLeaveApplicationAsync(
            Guid schoolId, Employee employee, Guid leavePolicyId,
            DateTime fromDate, DateTime toDate, string dayType)
        {
            var policy = await _context.LeavePolicies.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == leavePolicyId && p.SchoolId == schoolId && p.IsActive);

            if (policy == null)
                return (false, "The selected leave type does not exist or is inactive.");

            // 0. Date sanity check
            var isHalfDay = dayType.Equals("HalfDay", StringComparison.OrdinalIgnoreCase);
            if (!isHalfDay && fromDate.Date > toDate.Date)
                return (false, "The leave 'From' date cannot be after the 'To' date.");

            // 0.1 Overlapping leave check (Pending or Approved)
            var checkFrom = fromDate.Date;
            var checkTo = isHalfDay ? checkFrom : toDate.Date;
            var hasOverlap = await _context.LeaveRequests.AsNoTracking().AnyAsync(r =>
                r.SchoolId == schoolId
                && (r.EmployeeId == employee.Id || (employee.UserId.HasValue && r.TeacherUserId == employee.UserId))
                && (r.Status == "Pending" || r.Status == "Approved")
                && r.FromDate.Date <= checkTo
                && r.ToDate.Date >= checkFrom);

            if (hasOverlap)
                return (false, "You already have a pending or approved leave request overlapping this date range.");

            // 1. Gender check
            if (policy.GenderEligibility != "All")
            {
                var empGender = (employee.Gender ?? "Other").Trim();
                if (!policy.GenderEligibility.Equals(empGender, StringComparison.OrdinalIgnoreCase))
                    return (false, $"'{policy.LeaveTypeName}' is restricted to {policy.GenderEligibility} employees only.");
            }

            // 2. Probation check
            if (!policy.ProbationEligible)
            {
                if (employee.EmploymentStatus.Equals("Probation", StringComparison.OrdinalIgnoreCase))
                    return (false, $"'{policy.LeaveTypeName}' is not available during the probation period.");
            }

            // 3. Minimum service check
            var serviceDays = (DateTime.UtcNow.Date - employee.JoiningDate.Date).Days;
            if (policy.MinimumServiceDays > 0 && serviceDays < policy.MinimumServiceDays)
                return (false, $"'{policy.LeaveTypeName}' requires at least {policy.MinimumServiceDays} days of service. You have completed {serviceDays} day(s).");

            // 4. Notice period check
            if (policy.NoticePeriodDays > 0)
            {
                var noticeDue = fromDate.Date.AddDays(-policy.NoticePeriodDays);
                if (DateTime.UtcNow.Date > noticeDue)
                    return (false, $"'{policy.LeaveTypeName}' requires {policy.NoticePeriodDays} day(s) advance notice.");
            }

            // 5. Max consecutive days check
            if (policy.MaxConsecutiveDays > 0)
            {
                var duration = dayType.Equals("HalfDay", StringComparison.OrdinalIgnoreCase) ? 0.5m
                    : (decimal)(toDate.Date - fromDate.Date).TotalDays + 1;
                if (duration > policy.MaxConsecutiveDays)
                    return (false, $"'{policy.LeaveTypeName}' allows a maximum of {policy.MaxConsecutiveDays} consecutive day(s).");
            }

            // 6. Half-day eligibility check
            if (dayType.Equals("HalfDay", StringComparison.OrdinalIgnoreCase) && !policy.AllowHalfDay)
                return (false, $"'{policy.LeaveTypeName}' does not allow half-day leave.");

            return (true, string.Empty);
        }

        /// <summary>
        /// Calculates actual working-day duration of a leave period,
        /// optionally excluding public holidays (when sandwich rule is OFF).
        /// </summary>
        public async Task<decimal> CalculateLeaveDurationAsync(
            Guid schoolId, DateTime fromDate, DateTime toDate, string dayType, bool sandwichRuleApplied, int academicYear)
        {
            if (dayType.Equals("HalfDay", StringComparison.OrdinalIgnoreCase)) return 0.5m;

            var from = fromDate.Date;
            var to = toDate.Date;
            if (from > to) return 0;

            decimal calendarDays = (decimal)(to - from).TotalDays + 1;

            if (!sandwichRuleApplied)
            {
                // Exclude Sundays (and optionally public holidays)
                var holidays = await _context.HolidayCalendars.AsNoTracking()
                    .Where(h => h.SchoolId == schoolId && h.AcademicYear == academicYear
                                && h.Date >= from && h.Date <= to && !h.IsOptional)
                    .Select(h => h.Date.Date)
                    .ToListAsync();

                decimal excluded = 0;
                for (var d = from; d <= to; d = d.AddDays(1))
                {
                    if (d.DayOfWeek == DayOfWeek.Sunday) excluded++;
                    else if (holidays.Contains(d)) excluded++;
                }
                calendarDays = Math.Max(0, calendarDays - excluded);
            }

            return calendarDays;
        }

        /// <summary>
        /// Recalculates and persists the leave balance snapshots for an employee.
        /// </summary>
        public async Task RecalculateAndSaveBalancesAsync(Guid schoolId, Guid employeeId, Guid? teacherUserId, int academicYear)
        {
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.SchoolId == schoolId);
            if (employee == null) return;

            var eligiblePolicies = await GetEligiblePoliciesAsync(schoolId, employee);
            var asOf = DateTime.UtcNow;

            foreach (var policy in eligiblePolicies)
            {
                var computed = await ComputeBalanceAsync(schoolId, employee, policy, academicYear, asOf, teacherUserId);

                var existing = await _context.LeaveBalances
                    .FirstOrDefaultAsync(b => b.SchoolId == schoolId && b.EmployeeId == employeeId
                                              && b.LeavePolicyId == policy.Id && b.AcademicYear == academicYear);

                if (existing == null)
                {
                    existing = new LeaveBalance
                    {
                        SchoolId = schoolId,
                        EmployeeId = employeeId,
                        TeacherUserId = teacherUserId,
                        LeavePolicyId = policy.Id,
                        LeaveTypeCode = policy.LeaveTypeCode,
                        AcademicYear = academicYear,
                    };
                    _context.LeaveBalances.Add(existing);
                }

                existing.TotalAccrued = computed.TotalAccrued;
                existing.CarryForward = computed.CarryForward;
                existing.TotalUsed = computed.TotalUsed;
                existing.PendingUsed = computed.PendingUsed;
                existing.TotalAvailable = computed.TotalAvailable;
                existing.RemainingBalance = computed.Remaining;
                existing.LastCalculatedAt = DateTime.UtcNow;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
        }

        // ══════════════════════════════════════════════════════════════════════════
        // PRIVATE HELPERS
        // ══════════════════════════════════════════════════════════════════════════

        private async Task<EmployeeLeaveBalanceDto> ComputeBalanceAsync(
            Guid schoolId, Employee employee, LeavePolicy policy, int academicYear, DateTime asOf, Guid? teacherUserId)
        {
            var accrued = await CalculateAccruedDaysAsync(policy, employee, academicYear, asOf);

            // Carry-forward from last year's ledger (approved carry-forward transaction)
            decimal carryForward = await _context.LeaveTransactions.AsNoTracking()
                .Where(t => t.SchoolId == schoolId && t.EmployeeId == employee.Id
                         && t.LeavePolicyId == policy.Id && t.AcademicYear == academicYear
                         && t.TransactionType == "CARRY_FORWARD")
                .SumAsync(t => t.Amount);

            // Manual adjustments (credits and debits)
            decimal manualAdj = await _context.LeaveTransactions.AsNoTracking()
                .Where(t => t.SchoolId == schoolId && t.EmployeeId == employee.Id
                         && t.LeavePolicyId == policy.Id && t.AcademicYear == academicYear
                         && (t.TransactionType == "MANUAL_CREDIT" || t.TransactionType == "MANUAL_DEBIT"))
                .SumAsync(t => t.Amount);

            // Used (approved)
            decimal used = await GetUsedDaysAsync(schoolId, employee.Id, teacherUserId, policy, academicYear, "Approved");

            // Pending
            decimal pending = await GetUsedDaysAsync(schoolId, employee.Id, teacherUserId, policy, academicYear, "Pending");

            decimal totalAvailable = accrued + carryForward + manualAdj;
            decimal remaining = totalAvailable - used;

            return new EmployeeLeaveBalanceDto
            {
                LeavePolicyId = policy.Id,
                LeaveTypeCode = policy.LeaveTypeCode,
                LeaveTypeName = policy.LeaveTypeName,
                ColorHex = policy.ColorHex,
                SortOrder = policy.SortOrder,
                TotalAccrued = accrued,
                CarryForward = carryForward,
                ManualAdjustments = manualAdj,
                TotalAvailable = totalAvailable,
                TotalUsed = used,
                PendingUsed = pending,
                Remaining = remaining,
                IsPaid = policy.IsPaid,
                AllowHalfDay = policy.AllowHalfDay,
                AccrualFrequency = policy.AccrualFrequency,
                CarryForwardAllowed = policy.CarryForwardAllowed,
                MaxCarryForwardDays = policy.MaxCarryForwardDays,
                EncashmentAllowed = policy.EncashmentAllowed,
                MaxEncashmentDays = policy.MaxEncashmentDays,
                RequiresAttachment = policy.RequiresAttachment,
                MinAttachmentAfterDays = policy.MinAttachmentAfterDays,
                MaxConsecutiveDays = policy.MaxConsecutiveDays,
                NoticePeriodDays = policy.NoticePeriodDays
            };
        }

        private async Task<decimal> GetUsedDaysAsync(Guid schoolId, Guid employeeId, Guid? teacherUserId, LeavePolicy policy, int academicYear, string status)
        {
            var query = _context.LeaveRequests.AsNoTracking()
                .Where(r => r.SchoolId == schoolId
                         && r.LeaveType == policy.LeaveTypeCode
                         && r.Status == status
                         && r.FromDate.Year == academicYear);

            // Try matching by EmployeeId first, fallback to TeacherUserId
            if (employeeId != Guid.Empty)
                query = query.Where(r => r.EmployeeId == employeeId || r.TeacherUserId == teacherUserId);
            else if (teacherUserId.HasValue)
                query = query.Where(r => r.TeacherUserId == teacherUserId);

            return await query.SumAsync(r => (decimal?)r.TotalDays) ?? 0m;
        }

        private DateTime ApplyJoiningRule(LeavePolicy policy, DateTime joiningDate, DateTime effectiveStart)
        {
            switch (policy.JoiningRule)
            {
                case "Immediate":
                    return new DateTime(effectiveStart.Year, effectiveStart.Month, 1);

                case "CurrentMonth":
                    // If joined on or before the cutoff day → accrue from that month
                    // Otherwise → start from next month
                    if (joiningDate.Day <= policy.JoiningCutoffDay)
                        return new DateTime(joiningDate.Year, joiningDate.Month, 1);
                    else
                        return new DateTime(joiningDate.Year, joiningDate.Month, 1).AddMonths(1);

                case "NextMonth":
                default:
                    return new DateTime(joiningDate.Year, joiningDate.Month, 1).AddMonths(1);
            }
        }

        private int CountCompletedMonths(DateTime from, DateTime asOf)
        {
            if (asOf < from) return 0;
            int months = ((asOf.Year - from.Year) * 12) + asOf.Month - from.Month;
            // If asOf hasn't yet reached the day-of-month from "from", subtract one
            if (asOf.Day < from.Day) months--;
            return Math.Max(0, months);
        }

        private int CountCompletedQuarters(DateTime from, DateTime asOf)
        {
            return CountCompletedMonths(from, asOf) / 3;
        }
    }

    /// <summary>Data transfer object returned by the balance engine.</summary>
    public class EmployeeLeaveBalanceDto
    {
        public Guid LeavePolicyId { get; set; }
        public string LeaveTypeCode { get; set; } = string.Empty;
        public string LeaveTypeName { get; set; } = string.Empty;
        public string ColorHex { get; set; } = "#3B82F6";
        public int SortOrder { get; set; }
        public decimal TotalAccrued { get; set; }
        public decimal CarryForward { get; set; }
        public decimal ManualAdjustments { get; set; }
        public decimal TotalAvailable { get; set; }
        public decimal TotalUsed { get; set; }
        public decimal PendingUsed { get; set; }
        public decimal Remaining { get; set; }
        public bool IsPaid { get; set; }
        public bool AllowHalfDay { get; set; }
        public string AccrualFrequency { get; set; } = "Annual";
        public bool CarryForwardAllowed { get; set; }
        public decimal MaxCarryForwardDays { get; set; }
        public bool EncashmentAllowed { get; set; }
        public decimal MaxEncashmentDays { get; set; }
        public bool RequiresAttachment { get; set; }
        public int MinAttachmentAfterDays { get; set; }
        public int MaxConsecutiveDays { get; set; }
        public int NoticePeriodDays { get; set; }
    }
}
