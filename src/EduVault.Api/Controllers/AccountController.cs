using System;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/account")]
    [Authorize(Roles = "accountmanager,AccountManager,schooladmin,SchoolAdmin")]
    public class AccountController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly EduVaultDbContext _context;
        private readonly Services.WhatsAppService _whatsAppService;

        public AccountController(IUnitOfWork unitOfWork, EduVaultDbContext context, Services.WhatsAppService whatsAppService)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _whatsAppService = whatsAppService;
        }

        private Guid GetSchoolId()
        {
            var schoolIdStr = User.FindFirst("schoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdStr)) throw new UnauthorizedAccessException("School ID missing in token");
            return Guid.Parse(schoolIdStr);
        }

        private Guid GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) throw new UnauthorizedAccessException("User ID missing in token");
            return Guid.Parse(userIdStr);
        }

        // ==========================================
        // Dashboard Stats
        // ==========================================
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboardStats([FromQuery] int? month, [FromQuery] int? year)
        {
            var schoolId = GetSchoolId();
            int m = month ?? DateTime.UtcNow.Month;
            int y = year ?? DateTime.UtcNow.Year;
            var sixMonthsAgo = DateTime.UtcNow.AddMonths(-5).Date;

            // === CORE KPIs — awaited sequentially: a single scoped DbContext cannot run
            // multiple queries concurrently (Task.WhenAll here throws "A second operation
            // was started on this context instance"). ===
            var salaryForMonth = await _context.SalaryRecords.AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.Month == m && s.Year == y)
                .Select(s => new { s.NetPay, s.Status }).ToListAsync();
            int pendingLeavesCount = await _context.LeaveRequests.AsNoTracking()
                .CountAsync(l => l.SchoolId == schoolId && l.Status == "Pending");
            var expenses = await _context.Expenses.AsNoTracking()
                .Where(e => e.SchoolId == schoolId && e.Date.Month == m && e.Date.Year == y)
                .Select(e => new { e.Category, e.Amount })
                .ToListAsync();

            decimal totalSalaryPaid = salaryForMonth.Where(s => s.Status == "Paid").Sum(s => s.NetPay);
            decimal pendingSalary = salaryForMonth.Where(s => s.Status != "Paid").Sum(s => s.NetPay);
            decimal totalExpenses = expenses.Sum(e => (decimal)e.Amount);

            // Fee collections for selected month
            var studentIds = await _context.Users.AsNoTracking()
                .Where(u => u.SchoolId == schoolId && u.Role == "student").Select(u => u.Id).ToListAsync();

            decimal totalFeeCollectedThisMonth = studentIds.Any()
                ? await _context.Transactions.AsNoTracking()
                    .Where(t => t.Status.ToLower() == "success" && t.TransactionDate.Month == m && t.TransactionDate.Year == y
                        && t.Invoice != null && studentIds.Contains(t.Invoice.StudentId))
                    .SumAsync(t => (decimal?)t.Amount) ?? 0m
                : 0m;

            // === 6-MONTH TREND DATA: load full window once — no per-month loop queries ===
            var allSalary6Mo = await _context.SalaryRecords.AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.Status == "Paid" && s.GeneratedAt >= sixMonthsAgo)
                .Select(s => new { s.Month, s.Year, s.NetPay }).ToListAsync();

            var allFees6Mo = studentIds.Any()
                ? await _context.Transactions.AsNoTracking()
                    .Where(t => t.Status.ToLower() == "success" && t.TransactionDate >= sixMonthsAgo
                        && t.Invoice != null && studentIds.Contains(t.Invoice.StudentId))
                    .Select(t => new { t.TransactionDate.Month, t.TransactionDate.Year, t.Amount }).ToListAsync()
                : new List<dynamic>() as dynamic;

            var allExp6Mo = await _context.Expenses.AsNoTracking()
                .Where(e => e.SchoolId == schoolId && e.Date >= sixMonthsAgo)
                .Select(e => new { e.Date.Month, e.Date.Year, e.Amount }).ToListAsync();

            var monthlySalaryTrend = new List<object>();
            var monthlyFeeTrend = new List<object>();
            var monthlyExpenseTrend = new List<object>();

            for (int i = 5; i >= 0; i--)
            {
                var dt = DateTime.UtcNow.AddMonths(-i);
                var label = dt.ToString("MMM yyyy");

                monthlySalaryTrend.Add(new { month = label, amount = allSalary6Mo.Where(s => s.Month == dt.Month && s.Year == dt.Year).Sum(s => s.NetPay) });
                monthlyFeeTrend.Add(new { month = label, amount = allFees6Mo != null ? ((IEnumerable<dynamic>)allFees6Mo).Where(t => t.Month == dt.Month && t.Year == dt.Year).Sum(t => (decimal)t.Amount) : 0m });
                monthlyExpenseTrend.Add(new { month = label, amount = allExp6Mo.Where(e => e.Month == dt.Month && e.Year == dt.Year).Sum(e => e.Amount) });
            }

            // Expense categories breakdown
            var expenseCategories = expenses
                .GroupBy(e => string.IsNullOrWhiteSpace(e.Category) ? "Other" : e.Category)
                .Select(g => new { name = g.Key, value = g.Sum(x => x.Amount) })
                .ToList();

            // Configured Widgets & Graph Driver
            var allDefinitions = (await _unitOfWork.DashboardWidgetDefinitions.GetAllAsync())
                .Where(w => w.IsActive && (w.TargetRole == "accountmanager" || w.TargetRole == "all"))
                .OrderBy(w => w.DisplayOrder)
                .ToList();

            var schoolWidgets = (await _unitOfWork.SchoolDashboardWidgets.FindAsync(
                sw => sw.SchoolId == schoolId && sw.Role == "accountmanager")).ToList();

            var configuredWidgets = allDefinitions.Select(d =>
            {
                var custom = schoolWidgets.FirstOrDefault(sw => sw.WidgetKey == d.WidgetKey);
                return new
                {
                    widgetKey = d.WidgetKey,
                    title = custom?.CustomTitle ?? d.DefaultTitle,
                    metricSource = d.MetricSource,
                    timeRange = custom?.TimeRange ?? d.DefaultTimeRange,
                    chartType = !string.IsNullOrEmpty(custom?.ChartType) ? custom.ChartType : d.ChartType,
                    colorTheme = d.ColorTheme,
                    iconName = d.IconName,
                    isEnabled = custom?.IsEnabled ?? true,
                    displayOrder = custom?.DisplayOrder ?? d.DisplayOrder
                };
            }).OrderBy(w => w.displayOrder).ToList();

            return Ok(new
            {
                totalSalaryPaid,
                pendingSalary,
                pendingLeavesCount,
                totalExpenses,
                totalFeeCollectedThisMonth,
                monthlySalaryTrend,
                monthlyFeeTrend,
                monthlyExpenseTrend,
                expenseCategories,
                configuredWidgets
            });
        }

        // ==========================================
        // Teachers Directory for HRM
        // ==========================================
        [HttpGet("teachers")]
        public async Task<IActionResult> GetTeachers()
        {
            var schoolId = GetSchoolId();
            var teacherUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");
            var teacherProfiles = await _unitOfWork.Teachers.GetAllAsync();
            int currentYear = DateTime.UtcNow.Year;
            var quotas = await _unitOfWork.LeaveQuotas.FindAsync(q => q.SchoolId == schoolId && q.AcademicYear == currentYear);

            var list = teacherUsers.Select(u =>
            {
                var prof = teacherProfiles.FirstOrDefault(t => t.UserId == u.Id);
                var q = quotas.FirstOrDefault(lq => lq.TeacherUserId == u.Id);
                return new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    u.Email,
                    u.IsActive,
                    EmployeeId = prof?.EmployeeId ?? "N/A",
                    Department = prof?.Department ?? "General",
                    Salary = prof?.Salary ?? 0,
                    Qualifications = prof?.Qualifications ?? "",
                    Specialization = prof?.Specialization ?? "",
                    LeaveQuota = q != null ? new
                    {
                        clRemaining = q.CasualLeaveAllotted - q.CasualLeaveUsed,
                        slRemaining = q.SickLeaveAllotted - q.SickLeaveUsed,
                        elRemaining = q.EarnedLeaveAllotted - q.EarnedLeaveUsed,
                        mlRemaining = q.MaternityLeaveAllotted - q.MaternityLeaveUsed
                    } : null
                };
            });

            return Ok(list);
        }

        // ==========================================
        // Leave Requests Management
        // ==========================================
        [HttpGet("leave-requests")]
        public async Task<IActionResult> GetLeaveRequests([FromQuery] string? status, [FromQuery] string? leaveType)
        {
            var schoolId = GetSchoolId();
            var leaves = await _unitOfWork.LeaveRequests.FindAsync(l => l.SchoolId == schoolId);
            var teachers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");

            var query = leaves.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(l => l.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
            }
            if (!string.IsNullOrWhiteSpace(leaveType) && leaveType != "ALL")
            {
                query = query.Where(l => l.LeaveType.Equals(leaveType, StringComparison.OrdinalIgnoreCase));
            }

            var list = query.OrderByDescending(l => l.AppliedAt).Select(l =>
            {
                var teacher = teachers.FirstOrDefault(t => t.Id == l.TeacherUserId);
                return new
                {
                    l.Id,
                    l.TeacherUserId,
                    TeacherName = teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : "Unknown Teacher",
                    TeacherEmail = teacher?.Email ?? "",
                    l.LeaveType,
                    l.DayType,
                    l.HalfDaySession,
                    l.FromDate,
                    l.ToDate,
                    l.TotalDays,
                    l.Reason,
                    l.Status,
                    l.AppliedAt,
                    l.RejectionNote
                };
            }).ToList();

            return Ok(list);
        }

        [HttpPut("leave-requests/{id}")]
        public async Task<IActionResult> UpdateLeaveStatus(Guid id, [FromBody] UpdateLeaveStatusRequest request)
        {
            var schoolId = GetSchoolId();
            var leave = await _unitOfWork.LeaveRequests.GetByIdAsync(id);
            if (leave == null || leave.SchoolId != schoolId)
            {
                return NotFound(new { error = "Leave request not found" });
            }

            string previousStatus = leave.Status;
            leave.Status = request.Status; // "Approved" or "Rejected"
            leave.RejectionNote = request.RejectionNote;
            _unitOfWork.LeaveRequests.Update(leave);

            // If newly approved, update quota used
            if (request.Status == "Approved" && previousStatus != "Approved")
            {
                int year = leave.FromDate.Year;
                var quota = (await _unitOfWork.LeaveQuotas.FindAsync(q => q.SchoolId == schoolId && q.TeacherUserId == leave.TeacherUserId && q.AcademicYear == year)).FirstOrDefault();
                if (quota != null)
                {
                    switch (leave.LeaveType.ToUpper())
                    {
                        case "CL":
                            quota.CasualLeaveUsed += leave.TotalDays;
                            break;
                        case "SL":
                            quota.SickLeaveUsed += leave.TotalDays;
                            break;
                        case "EL":
                        case "PL":
                            quota.EarnedLeaveUsed += leave.TotalDays;
                            break;
                        case "ML":
                            quota.MaternityLeaveUsed += leave.TotalDays;
                            break;
                    }
                    _unitOfWork.LeaveQuotas.Update(quota);
                }
            }
            // If reverting from approved to rejected/pending, revert quota
            else if (previousStatus == "Approved" && request.Status != "Approved")
            {
                int year = leave.FromDate.Year;
                var quota = (await _unitOfWork.LeaveQuotas.FindAsync(q => q.SchoolId == schoolId && q.TeacherUserId == leave.TeacherUserId && q.AcademicYear == year)).FirstOrDefault();
                if (quota != null)
                {
                    switch (leave.LeaveType.ToUpper())
                    {
                        case "CL":
                            quota.CasualLeaveUsed = Math.Max(0, quota.CasualLeaveUsed - leave.TotalDays);
                            break;
                        case "SL":
                            quota.SickLeaveUsed = Math.Max(0, quota.SickLeaveUsed - leave.TotalDays);
                            break;
                        case "EL":
                        case "PL":
                            quota.EarnedLeaveUsed = Math.Max(0, quota.EarnedLeaveUsed - leave.TotalDays);
                            break;
                        case "ML":
                            quota.MaternityLeaveUsed = Math.Max(0, quota.MaternityLeaveUsed - leave.TotalDays);
                            break;
                    }
                    _unitOfWork.LeaveQuotas.Update(quota);
                }
            }

            await _unitOfWork.CompleteAsync();

            // Send WhatsApp alert to teacher
            try
            {
                var teacherUser = await _unitOfWork.Users.GetByIdAsync(leave.TeacherUserId);
                var emp = (await _unitOfWork.Employees.FindAsync(e => e.UserId == leave.TeacherUserId || (teacherUser != null && e.Email == teacherUser.Email))).FirstOrDefault();
                var schoolObj = await _unitOfWork.Schools.GetByIdAsync(schoolId);
                var phone = emp?.Phone ?? emp?.EmergencyContactPhone;
                if (!string.IsNullOrWhiteSpace(phone))
                {
                    string statusBadge = request.Status == "Approved" ? "✅ APPROVED" : "❌ REJECTED";
                    string note = !string.IsNullOrWhiteSpace(request.RejectionNote) ? $"\n• *Remarks:* {request.RejectionNote}" : "";
                    string msg = $"📌 *LEAVE REQUEST UPDATE*\n\nDear {teacherUser?.FirstName ?? "Staff"},\nYour *{leave.LeaveType}* leave request ({leave.FromDate:dd MMM yyyy} to {leave.ToDate:dd MMM yyyy}, {leave.TotalDays} day(s)) has been *{statusBadge}* by School Administration.{note}\n\n- *{schoolObj?.Name ?? "School Administration"}*";
                    _ = _whatsAppService.SendEventNotificationAsync(schoolId, "LEAVE_STATUS", phone, msg);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP NOTICE] Error notifying teacher on leave status: {ex.Message}");
            }

            return Ok(new { success = true, status = leave.Status });
        }

        // ==========================================
        // Leave Quotas (Allotments per Teacher)
        // ==========================================
        [HttpGet("quotas")]
        public async Task<IActionResult> GetQuotas([FromQuery] int? academicYear)
        {
            var schoolId = GetSchoolId();
            int year = academicYear ?? DateTime.UtcNow.Year;
            var quotas = await _unitOfWork.LeaveQuotas.FindAsync(q => q.SchoolId == schoolId && q.AcademicYear == year);
            var teachers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");

            var list = teachers.Select(t =>
            {
                var q = quotas.FirstOrDefault(x => x.TeacherUserId == t.Id);
                return new
                {
                    quotaId = q?.Id,
                    teacherId = t.Id,
                    teacherName = $"{t.FirstName} {t.LastName}",
                    teacherEmail = t.Email,
                    academicYear = year,
                    clAllotted = q?.CasualLeaveAllotted ?? 12,
                    clUsed = q?.CasualLeaveUsed ?? 0,
                    slAllotted = q?.SickLeaveAllotted ?? 10,
                    slUsed = q?.SickLeaveUsed ?? 0,
                    elAllotted = q?.EarnedLeaveAllotted ?? 15,
                    elUsed = q?.EarnedLeaveUsed ?? 0,
                    mlAllotted = q?.MaternityLeaveAllotted ?? 90,
                    mlUsed = q?.MaternityLeaveUsed ?? 0
                };
            });

            return Ok(list);
        }

        [HttpPut("quotas/{teacherUserId}")]
        public async Task<IActionResult> UpdateQuota(Guid teacherUserId, [FromBody] UpdateQuotaRequest request)
        {
            var schoolId = GetSchoolId();
            int year = request.AcademicYear > 0 ? request.AcademicYear : DateTime.UtcNow.Year;

            var quota = (await _unitOfWork.LeaveQuotas.FindAsync(q => q.SchoolId == schoolId && q.TeacherUserId == teacherUserId && q.AcademicYear == year)).FirstOrDefault();
            if (quota == null)
            {
                quota = new LeaveQuota
                {
                    SchoolId = schoolId,
                    TeacherUserId = teacherUserId,
                    AcademicYear = year,
                    CasualLeaveAllotted = request.CasualLeaveAllotted,
                    SickLeaveAllotted = request.SickLeaveAllotted,
                    EarnedLeaveAllotted = request.EarnedLeaveAllotted,
                    MaternityLeaveAllotted = request.MaternityLeaveAllotted
                };
                await _unitOfWork.LeaveQuotas.AddAsync(quota);
            }
            else
            {
                quota.CasualLeaveAllotted = request.CasualLeaveAllotted;
                quota.SickLeaveAllotted = request.SickLeaveAllotted;
                quota.EarnedLeaveAllotted = request.EarnedLeaveAllotted;
                quota.MaternityLeaveAllotted = request.MaternityLeaveAllotted;
                _unitOfWork.LeaveQuotas.Update(quota);
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, quota });
        }

        // ==========================================
        // Salary Rules Engine (HRA, PF, TDS, etc.)
        // ==========================================
        [HttpGet("salary-rules")]
        public async Task<IActionResult> GetSalaryRules()
        {
            var schoolId = GetSchoolId();
            var rules = await _unitOfWork.SalaryRules.FindAsync(r => r.SchoolId == schoolId);
            return Ok(rules.OrderBy(r => r.Type).ThenBy(r => r.Name));
        }

        [HttpPost("salary-rules")]
        public async Task<IActionResult> CreateSalaryRule([FromBody] CreateSalaryRuleRequest request)
        {
            var schoolId = GetSchoolId();
            var rule = new SalaryRule
            {
                SchoolId = schoolId,
                Name = request.Name,
                Type = request.Type, // "Allowance" or "Deduction"
                CalculationMode = request.CalculationMode, // "Fixed" or "Percentage"
                Value = request.Value,
                IsDefault = request.IsDefault,
                IsActive = true
            };
            await _unitOfWork.SalaryRules.AddAsync(rule);
            await _unitOfWork.CompleteAsync();
            return Ok(rule);
        }

        [HttpPut("salary-rules/{id}")]
        public async Task<IActionResult> UpdateSalaryRule(Guid id, [FromBody] CreateSalaryRuleRequest request)
        {
            var schoolId = GetSchoolId();
            var rule = await _unitOfWork.SalaryRules.GetByIdAsync(id);
            if (rule == null || rule.SchoolId != schoolId)
            {
                return NotFound(new { error = "Salary rule not found" });
            }

            rule.Name = request.Name;
            rule.Type = request.Type;
            rule.CalculationMode = request.CalculationMode;
            rule.Value = request.Value;
            rule.IsDefault = request.IsDefault;
            _unitOfWork.SalaryRules.Update(rule);
            await _unitOfWork.CompleteAsync();
            return Ok(rule);
        }

        [HttpDelete("salary-rules/{id}")]
        public async Task<IActionResult> DeleteSalaryRule(Guid id)
        {
            var schoolId = GetSchoolId();
            var rule = await _unitOfWork.SalaryRules.GetByIdAsync(id);
            if (rule == null || rule.SchoolId != schoolId)
            {
                return NotFound(new { error = "Salary rule not found" });
            }

            _unitOfWork.SalaryRules.Remove(rule);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        // ==========================================
        // Salary Calculation & Disbursement
        // ==========================================
        [HttpPost("salary/generate")]
        public async Task<IActionResult> GenerateSalary([FromBody] GenerateSalaryRequest request)
        {
            var schoolId = GetSchoolId();
            int month = request.Month;
            int year = request.Year;
            int totalWorkingDays = request.TotalWorkingDays > 0 ? request.TotalWorkingDays : 26; // standard 26 days

            var teacherUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher" && u.IsActive);
            var teacherProfiles = await _unitOfWork.Teachers.GetAllAsync();
            var activeRules = (await _unitOfWork.SalaryRules.FindAsync(r => r.SchoolId == schoolId && r.IsActive && r.IsDefault)).ToList();
            var approvedLeaves = (await _unitOfWork.LeaveRequests.FindAsync(l => l.SchoolId == schoolId && l.Status == "Approved" && l.FromDate.Month == month && l.FromDate.Year == year)).ToList();
            var quotas = (await _unitOfWork.LeaveQuotas.FindAsync(q => q.SchoolId == schoolId && q.AcademicYear == year)).ToList();

            var existingSalaries = (await _unitOfWork.SalaryRecords.FindAsync(s => s.SchoolId == schoolId && s.Month == month && s.Year == year)).ToList();
            var results = new List<object>();

            foreach (var teacher in teacherUsers)
            {
                if (request.TeacherUserId.HasValue && teacher.Id != request.TeacherUserId.Value)
                {
                    continue;
                }

                var profile = teacherProfiles.FirstOrDefault(p => p.UserId == teacher.Id);
                decimal grossSalary = profile?.Salary ?? 30000.00m; // Default monthly salary if unset

                // Approved leaves this month for this teacher
                var teacherLeaves = approvedLeaves.Where(l => l.TeacherUserId == teacher.Id).ToList();
                decimal totalLeaveDays = teacherLeaves.Sum(l => l.TotalDays);
                decimal halfDayCount = teacherLeaves.Count(l => l.DayType == "HalfDay");

                // Check quota remaining for LWP calculation
                var quota = quotas.FirstOrDefault(q => q.TeacherUserId == teacher.Id);
                decimal totalRemainingQuota = quota != null
                    ? (quota.CasualLeaveAllotted - quota.CasualLeaveUsed) + (quota.SickLeaveAllotted - quota.SickLeaveUsed) + (quota.EarnedLeaveAllotted - quota.EarnedLeaveUsed)
                    : 10;

                decimal lwpDays = Math.Max(0, totalLeaveDays - Math.Max(0, totalRemainingQuota));
                decimal paidLeaveDays = totalLeaveDays - lwpDays;

                decimal presentDays = Math.Max(0, totalWorkingDays - totalLeaveDays);
                decimal perDayRate = totalWorkingDays > 0 ? Math.Round(grossSalary / totalWorkingDays, 2) : 0;
                decimal basicEarned = Math.Round((presentDays + (halfDayCount * 0.5m) + paidLeaveDays) * perDayRate, 2);

                // Apply Salary Rules (Allowances vs Deductions)
                decimal ruleAllowances = 0;
                decimal ruleDeductions = 0;

                foreach (var rule in activeRules)
                {
                    decimal amount = 0;
                    if (rule.CalculationMode == "Percentage")
                    {
                        amount = Math.Round(grossSalary * (rule.Value / 100m), 2);
                    }
                    else
                    {
                        amount = rule.Value;
                    }

                    if (rule.Type == "Allowance")
                    {
                        ruleAllowances += amount;
                    }
                    else if (rule.Type == "Deduction")
                    {
                        ruleDeductions += amount;
                    }
                }

                decimal lwpDeduction = Math.Round(lwpDays * perDayRate, 2);
                decimal netPay = Math.Max(0, basicEarned + ruleAllowances - ruleDeductions - lwpDeduction);

                var existing = existingSalaries.FirstOrDefault(s => s.TeacherUserId == teacher.Id);
                if (existing != null)
                {
                    existing.GrossSalary = grossSalary;
                    existing.TotalWorkingDays = totalWorkingDays;
                    existing.PresentDays = presentDays;
                    existing.HalfDays = halfDayCount;
                    existing.LeaveDaysUsed = totalLeaveDays;
                    existing.LwpDays = lwpDays;
                    existing.PerDayRate = perDayRate;
                    existing.BasicEarned = basicEarned;
                    existing.RuleBasedAllowances = ruleAllowances;
                    existing.RuleBasedDeductions = ruleDeductions;
                    existing.LwpDeduction = lwpDeduction;
                    existing.NetPay = Math.Max(0, basicEarned + ruleAllowances + existing.ManualAllowances - ruleDeductions - existing.ManualDeductions - lwpDeduction);
                    _unitOfWork.SalaryRecords.Update(existing);
                }
                else
                {
                    var record = new SalaryRecord
                    {
                        SchoolId = schoolId,
                        TeacherUserId = teacher.Id,
                        Month = month,
                        Year = year,
                        GrossSalary = grossSalary,
                        TotalWorkingDays = totalWorkingDays,
                        PresentDays = presentDays,
                        HalfDays = halfDayCount,
                        LeaveDaysUsed = totalLeaveDays,
                        LwpDays = lwpDays,
                        PerDayRate = perDayRate,
                        BasicEarned = basicEarned,
                        RuleBasedAllowances = ruleAllowances,
                        RuleBasedDeductions = ruleDeductions,
                        ManualAllowances = 0,
                        ManualDeductions = 0,
                        LwpDeduction = lwpDeduction,
                        NetPay = netPay,
                        Status = "Draft"
                    };
                    await _unitOfWork.SalaryRecords.AddAsync(record);
                }

                results.Add(new
                {
                    teacherId = teacher.Id,
                    teacherName = $"{teacher.FirstName} {teacher.LastName}",
                    grossSalary,
                    totalWorkingDays,
                    presentDays,
                    leaveDays = totalLeaveDays,
                    lwpDays,
                    basicEarned,
                    ruleAllowances,
                    ruleDeductions,
                    netPay
                });
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, generatedCount = results.Count, salaries = results });
        }

        [HttpGet("salary")]
        public async Task<IActionResult> GetSalaryRecords([FromQuery] int? month, [FromQuery] int? year, [FromQuery] string? status)
        {
            var schoolId = GetSchoolId();
            int m = month ?? DateTime.UtcNow.Month;
            int y = year ?? DateTime.UtcNow.Year;

            var records = await _unitOfWork.SalaryRecords.FindAsync(s => s.SchoolId == schoolId && s.Month == m && s.Year == y);
            var teachers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");
            var profiles = await _unitOfWork.Teachers.GetAllAsync();

            var query = records.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(r => r.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
            }

            var list = query.Select(r =>
            {
                var t = teachers.FirstOrDefault(x => x.Id == r.TeacherUserId);
                var prof = profiles.FirstOrDefault(p => p.UserId == r.TeacherUserId);
                return new
                {
                    r.Id,
                    r.TeacherUserId,
                    TeacherName = t != null ? $"{t.FirstName} {t.LastName}" : "Unknown",
                    TeacherEmail = t?.Email ?? "",
                    Department = prof?.Department ?? "General",
                    EmployeeId = prof?.EmployeeId ?? "N/A",
                    r.Month,
                    r.Year,
                    r.GrossSalary,
                    r.TotalWorkingDays,
                    r.PresentDays,
                    r.HalfDays,
                    r.LeaveDaysUsed,
                    r.LwpDays,
                    r.PerDayRate,
                    r.BasicEarned,
                    r.RuleBasedAllowances,
                    r.RuleBasedDeductions,
                    r.ManualAllowances,
                    r.ManualDeductions,
                    r.LwpDeduction,
                    r.NetPay,
                    r.Status,
                    r.PaidOn,
                    r.Remarks,
                    r.GeneratedAt
                };
            }).OrderBy(x => x.TeacherName).ToList();

            return Ok(list);
        }

        [HttpPut("salary/{id}")]
        public async Task<IActionResult> UpdateSalaryRecord(Guid id, [FromBody] UpdateSalaryRecordRequest request)
        {
            var schoolId = GetSchoolId();
            var record = await _unitOfWork.SalaryRecords.GetByIdAsync(id);
            if (record == null || record.SchoolId != schoolId)
            {
                return NotFound(new { error = "Salary record not found" });
            }

            record.ManualAllowances = request.ManualAllowances;
            record.ManualDeductions = request.ManualDeductions;
            record.Remarks = request.Remarks;
            record.NetPay = Math.Max(0, record.BasicEarned + record.RuleBasedAllowances + request.ManualAllowances - record.RuleBasedDeductions - request.ManualDeductions - record.LwpDeduction);

            if (!string.IsNullOrWhiteSpace(request.Status))
            {
                record.Status = request.Status;
                if (request.Status == "Paid")
                {
                    record.PaidOn = DateTime.UtcNow;
                }
            }

            _unitOfWork.SalaryRecords.Update(record);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, record });
        }

        [HttpPut("salary/{id}/mark-paid")]
        public async Task<IActionResult> MarkSalaryPaid(Guid id)
        {
            var schoolId = GetSchoolId();
            var record = await _unitOfWork.SalaryRecords.GetByIdAsync(id);
            if (record == null || record.SchoolId != schoolId)
            {
                return NotFound(new { error = "Salary record not found" });
            }

            record.Status = "Paid";
            record.PaidOn = DateTime.UtcNow;
            _unitOfWork.SalaryRecords.Update(record);
            await _unitOfWork.CompleteAsync();

            // Send WhatsApp salary credit advice to employee
            try
            {
                var teacherUser = await _unitOfWork.Users.GetByIdAsync(record.TeacherUserId);
                var emp = (await _unitOfWork.Employees.FindAsync(e => e.UserId == record.TeacherUserId || (teacherUser != null && e.Email == teacherUser.Email))).FirstOrDefault();
                var schoolObj = await _unitOfWork.Schools.GetByIdAsync(schoolId);
                var phone = emp?.Phone ?? emp?.EmergencyContactPhone;
                if (!string.IsNullOrWhiteSpace(phone))
                {
                    var monthName = new DateTime(record.Year, record.Month, 1).ToString("MMMM yyyy");
                    string msg = $"💰 *SALARY DISBURSAL ADVICE*\n\nDear {teacherUser?.FirstName ?? "Staff"},\nYour salary for *{monthName}* has been disbursed successfully.\n\n• *Net Pay:* ₹{record.NetPay:N2}\n• *Present Days:* {record.PresentDays} days\n• *Credit Date:* {record.PaidOn:dd MMM yyyy}\n\n- *{schoolObj?.Name ?? "Accounts Dept"}*";
                    _ = _whatsAppService.SendEventNotificationAsync(schoolId, "SALARY_CREDIT", phone, msg);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP NOTICE] Error notifying employee on salary credit: {ex.Message}");
            }

            return Ok(new { success = true, paidOn = record.PaidOn });
        }

        // ==========================================
        // Expenses Management
        // ==========================================
        [HttpGet("expenses")]
        public async Task<IActionResult> GetExpenses([FromQuery] string? category, [FromQuery] int? month, [FromQuery] int? year)
        {
            var schoolId = GetSchoolId();
            var expenses = await _unitOfWork.Expenses.FindAsync(e => e.SchoolId == schoolId);

            var query = expenses.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(category) && category != "ALL")
            {
                query = query.Where(e => e.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }
            if (month.HasValue)
            {
                query = query.Where(e => e.Date.Month == month.Value);
            }
            if (year.HasValue)
            {
                query = query.Where(e => e.Date.Year == year.Value);
            }

            return Ok(query.OrderByDescending(e => e.Date).ToList());
        }

        [HttpPost("expenses")]
        public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseRequest request)
        {
            var schoolId = GetSchoolId();
            var expense = new Expense
            {
                SchoolId = schoolId,
                Category = request.Category,
                Title = request.Title,
                Amount = request.Amount,
                Date = request.Date != default ? request.Date : DateTime.UtcNow,
                VoucherNumber = string.IsNullOrWhiteSpace(request.VoucherNumber) ? $"EXP-{DateTime.UtcNow:yyMM}-{RandomNumberGenerator.GetInt32(1000, 9999)}" : request.VoucherNumber,
                Description = request.Description
            };

            await _unitOfWork.Expenses.AddAsync(expense);
            await _unitOfWork.CompleteAsync();
            return Ok(expense);
        }

        [HttpDelete("expenses/{id}")]
        public async Task<IActionResult> DeleteExpense(Guid id)
        {
            var schoolId = GetSchoolId();
            var expense = await _unitOfWork.Expenses.GetByIdAsync(id);
            if (expense == null || expense.SchoolId != schoolId)
            {
                return NotFound(new { error = "Expense record not found" });
            }

            _unitOfWork.Expenses.Remove(expense);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }
    }

    public class UpdateLeaveStatusRequest
    {
        public string Status { get; set; } = "Approved"; // Approved, Rejected
        public string? RejectionNote { get; set; }
    }

    public class UpdateQuotaRequest
    {
        public int AcademicYear { get; set; }
        public int CasualLeaveAllotted { get; set; } = 12;
        public int SickLeaveAllotted { get; set; } = 10;
        public int EarnedLeaveAllotted { get; set; } = 15;
        public int MaternityLeaveAllotted { get; set; } = 90;
    }

    public class CreateSalaryRuleRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "Allowance"; // Allowance, Deduction
        public string CalculationMode { get; set; } = "Fixed"; // Fixed, Percentage
        public decimal Value { get; set; }
        public bool IsDefault { get; set; } = true;
    }

    public class GenerateSalaryRequest
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public int TotalWorkingDays { get; set; } = 26;
        public Guid? TeacherUserId { get; set; }
    }

    public class UpdateSalaryRecordRequest
    {
        public decimal ManualAllowances { get; set; }
        public decimal ManualDeductions { get; set; }
        public string? Status { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateExpenseRequest
    {
        public string Category { get; set; } = "Supplies"; // Salary, Maintenance, Supplies, Utility, Other
        public string Title { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string? VoucherNumber { get; set; }
        public string? Description { get; set; }
    }
}
