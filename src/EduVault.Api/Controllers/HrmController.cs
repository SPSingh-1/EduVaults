using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;
using EduVault.Api.Services;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/hrm")]
    [Authorize(Roles = "accountmanager,AccountManager,schooladmin,SchoolAdmin,superadmin,teacher,Teacher,employee,Employee")]
    public class HrmController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly EduVaultDbContext _context;
        private readonly IPayrollCalculationService _calculationService;
        private readonly ILeaveBalanceEngine _leaveEngine;

        public HrmController(IUnitOfWork unitOfWork, EduVaultDbContext context, IPayrollCalculationService calculationService, ILeaveBalanceEngine leaveEngine)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _calculationService = calculationService;
            _leaveEngine = leaveEngine;
        }

        private Guid GetSchoolId()
        {
            if (User.IsInRole("superadmin") || User.IsInRole("SuperAdmin"))
            {
                var qSchoolId = HttpContext.Request.Query["schoolId"].FirstOrDefault();
                if (!string.IsNullOrEmpty(qSchoolId) && Guid.TryParse(qSchoolId, out var saSchoolId))
                    return saSchoolId;

                var hSchoolId = HttpContext.Request.Headers["X-School-Id"].FirstOrDefault();
                if (!string.IsNullOrEmpty(hSchoolId) && Guid.TryParse(hSchoolId, out var headerSchoolId))
                    return headerSchoolId;

                throw new UnauthorizedAccessException("Super Admin must provide schoolId via query parameter (?schoolId=...) or X-School-Id header for HRM operations.");
            }

            var schoolIdStr = User.FindFirst("schoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdStr)) throw new UnauthorizedAccessException("School ID missing in token");
            return Guid.Parse(schoolIdStr);
        }

        // ==========================================
        // 1. Employee Management Directory & CRUD
        // ==========================================
        [HttpGet("employees")]
        public async Task<IActionResult> GetEmployees(
            [FromQuery] string? search,
            [FromQuery] string? staffType,
            [FromQuery] Guid? departmentId,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = GetSchoolId();
            var query = _context.Employees.AsNoTracking()
                .Where(e => e.SchoolId == schoolId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(e => e.FirstName.ToLower().Contains(s) || e.LastName.ToLower().Contains(s) || e.EmployeeCode.ToLower().Contains(s) || e.Email.ToLower().Contains(s));
            }

            if (!string.IsNullOrWhiteSpace(staffType) && staffType != "ALL")
            {
                query = query.Where(e => e.StaffType.ToLower() == staffType.Trim().ToLower());
            }

            if (departmentId.HasValue)
            {
                query = query.Where(e => e.DepartmentId == departmentId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(e => e.EmploymentStatus.ToLower() == status.Trim().ToLower());
            }

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderBy(e => e.EmployeeCode)
                .ThenBy(e => e.FirstName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new
                {
                    e.Id,
                    e.EmployeeCode,
                    FullName = $"{e.FirstName} {e.LastName}",
                    e.FirstName,
                    e.LastName,
                    e.Email,
                    e.Phone,
                    e.StaffType,
                    e.DepartmentName,
                    e.DesignationName,
                    e.EmploymentStatus,
                    e.JoiningDate,
                    e.BaseGrossSalary,
                    e.PfApplicable,
                    e.EsiApplicable,
                    e.PtApplicable,
                    e.TdsApplicable
                })
                .ToListAsync();

            return Ok(new
            {
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize),
                employees = items
            });
        }

        [HttpPost("employees")]
        public async Task<IActionResult> CreateEmployee([FromBody] CreateEmployeeDto dto)
        {
            var schoolId = GetSchoolId();

            if (string.IsNullOrWhiteSpace(dto.FirstName) || string.IsNullOrWhiteSpace(dto.LastName))
            {
                return BadRequest(new { error = "First name and Last name are required." });
            }

            // Generate unique employee code if not provided
            var empCode = dto.EmployeeCode;
            if (string.IsNullOrWhiteSpace(empCode))
            {
                var count = await _context.Employees.CountAsync(e => e.SchoolId == schoolId) + 1;
                empCode = $"EMP-{DateTime.UtcNow.Year}-{count:D3}";
            }

            var deptName = "";
            if (dto.DepartmentId.HasValue)
            {
                var dept = await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == dto.DepartmentId.Value && d.SchoolId == schoolId);
                deptName = dept?.Name ?? "";
            }

            var desigName = "";
            if (dto.DesignationId.HasValue)
            {
                var desig = await _context.Designations.AsNoTracking().FirstOrDefaultAsync(d => d.Id == dto.DesignationId.Value && d.SchoolId == schoolId);
                desigName = desig?.Name ?? "";
            }

            var employee = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                EmployeeCode = empCode,
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Email = dto.Email?.Trim() ?? "",
                Phone = dto.Phone?.Trim() ?? "",
                Gender = dto.Gender ?? "Other",
                DateOfBirth = dto.DateOfBirth,
                Address = dto.Address ?? "",
                StaffType = dto.StaffType ?? "Teaching",
                DepartmentId = dto.DepartmentId,
                DesignationId = dto.DesignationId,
                DepartmentName = deptName,
                DesignationName = desigName,
                EmploymentStatus = "Active",
                JoiningDate = dto.JoiningDate ?? DateTime.UtcNow,
                BaseGrossSalary = dto.BaseGrossSalary > 0 ? dto.BaseGrossSalary : 35000m,
                SalaryStructureId = dto.SalaryStructureId,
                PfApplicable = dto.PfApplicable,
                EsiApplicable = dto.EsiApplicable,
                PtApplicable = dto.PtApplicable,
                TdsApplicable = dto.TdsApplicable,
                BankName = dto.BankName ?? "",
                BankAccountNumber = dto.BankAccountNumber ?? "",
                BankIfscCode = dto.BankIfscCode ?? "",
                PanNumber = dto.PanNumber ?? "",
                AadhaarLast4 = dto.AadhaarLast4 ?? ""
            };

            await _context.Employees.AddAsync(employee);

            // If staff type is Teaching, also create academic TeacherProfile
            if (employee.StaffType == "Teaching")
            {
                var teacherProfile = new TeacherProfile
                {
                    EmployeeId = employee.Id,
                    Qualification = dto.Qualification ?? "B.Ed / M.Sc",
                    Specialization = dto.Specialization ?? "General Academic",
                    MaxWeeklyPeriods = 30
                };
                await _context.TeacherProfiles.AddAsync(teacherProfile);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, id = employee.Id, employeeCode = employee.EmployeeCode });
        }

        [HttpGet("employees/{id}")]
        public async Task<IActionResult> GetEmployeeDetails(Guid id)
        {
            var schoolId = GetSchoolId();
            var emp = await _context.Employees
                .AsNoTracking()
                .Include(e => e.TeacherProfile)
                .FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);

            if (emp == null) return NotFound(new { error = "Employee profile not found" });

            // Retrieve recent documents
            var docs = await _context.EmployeeDocuments
                .AsNoTracking()
                .Where(d => d.EmployeeId == id)
                .ToListAsync();

            // Mask bank account number for security: "XXXX-XXXX-1234"
            string maskedBank = "N/A";
            if (!string.IsNullOrWhiteSpace(emp.BankAccountNumber))
            {
                var last4 = emp.BankAccountNumber.Length > 4 ? emp.BankAccountNumber[^4..] : emp.BankAccountNumber;
                maskedBank = $"XXXX-XXXX-{last4}";
            }

            return Ok(new
            {
                employee = new
                {
                    emp.Id,
                    emp.EmployeeCode,
                    emp.FirstName,
                    emp.LastName,
                    FullName = $"{emp.FirstName} {emp.LastName}",
                    emp.Email,
                    emp.Phone,
                    emp.Gender,
                    emp.DateOfBirth,
                    emp.Address,
                    emp.StaffType,
                    emp.DepartmentId,
                    emp.DepartmentName,
                    emp.DesignationId,
                    emp.DesignationName,
                    emp.EmploymentStatus,
                    emp.JoiningDate,
                    emp.ConfirmationDate,
                    emp.BaseGrossSalary,
                    emp.PfApplicable,
                    emp.EsiApplicable,
                    emp.PtApplicable,
                    emp.TdsApplicable,
                    BankName = emp.BankName,
                    BankAccountNumberMasked = maskedBank,
                    BankIfscCode = emp.BankIfscCode,
                    PanNumber = emp.PanNumber,
                    TeacherProfile = emp.TeacherProfile != null ? new
                    {
                        emp.TeacherProfile.Qualification,
                        emp.TeacherProfile.Specialization,
                        emp.TeacherProfile.MaxWeeklyPeriods
                    } : null
                },
                documents = docs
            });
        }

        [HttpPut("employees/{id}")]
        public async Task<IActionResult> UpdateEmployee(Guid id, [FromBody] UpdateEmployeeDto dto)
        {
            var schoolId = GetSchoolId();
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);
            if (emp == null) return NotFound(new { error = "Employee not found." });

            emp.FirstName = dto.FirstName.Trim();
            emp.LastName = dto.LastName.Trim();
            emp.Phone = dto.Phone ?? emp.Phone;
            emp.Email = dto.Email ?? emp.Email;
            emp.Address = dto.Address ?? emp.Address;
            emp.StaffType = dto.StaffType ?? emp.StaffType;
            emp.EmploymentStatus = dto.EmploymentStatus ?? emp.EmploymentStatus;
            emp.BaseGrossSalary = dto.BaseGrossSalary > 0 ? dto.BaseGrossSalary : emp.BaseGrossSalary;
            emp.PfApplicable = dto.PfApplicable;
            emp.EsiApplicable = dto.EsiApplicable;
            emp.PtApplicable = dto.PtApplicable;
            emp.TdsApplicable = dto.TdsApplicable;
            emp.BankName = dto.BankName ?? emp.BankName;
            emp.BankAccountNumber = dto.BankAccountNumber ?? emp.BankAccountNumber;
            emp.BankIfscCode = dto.BankIfscCode ?? emp.BankIfscCode;
            emp.PanNumber = dto.PanNumber ?? emp.PanNumber;
            emp.UpdatedAt = DateTime.UtcNow;

            if (dto.DepartmentId.HasValue && dto.DepartmentId != emp.DepartmentId)
            {
                emp.DepartmentId = dto.DepartmentId;
                var dept = await _context.Departments.AsNoTracking().FirstOrDefaultAsync(d => d.Id == dto.DepartmentId.Value && d.SchoolId == schoolId);
                emp.DepartmentName = dept?.Name ?? "";
            }

            if (dto.DesignationId.HasValue && dto.DesignationId != emp.DesignationId)
            {
                emp.DesignationId = dto.DesignationId;
                var desig = await _context.Designations.AsNoTracking().FirstOrDefaultAsync(d => d.Id == dto.DesignationId.Value && d.SchoolId == schoolId);
                emp.DesignationName = desig?.Name ?? "";
            }

            _context.Employees.Update(emp);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, employee = emp });
        }

        // ==========================================
        // 2. HRM Configuration Health Check
        // ==========================================
        [HttpGet("health")]
        public async Task<IActionResult> GetHrmHealth()
        {
            var schoolId = GetSchoolId();
            var issues = new List<object>();

            var totalEmployees = await _context.Employees.CountAsync(e => e.SchoolId == schoolId && (e.EmploymentStatus == "Active" || e.EmploymentStatus == "Confirmed"));
            var structures = await _context.SalaryStructures.Include(s => s.Components).Where(s => s.SchoolId == schoolId && s.IsActive).ToListAsync();
            var unassignedEmps = await _context.Employees.CountAsync(e => e.SchoolId == schoolId && e.SalaryStructureId == null);

            if (!structures.Any())
            {
                issues.Add(new { severity = "CRITICAL", module = "SalaryStructure", reason = "No active Salary Structure configured for the school. Payroll calculation is blocked.", action = "Configure a Salary Structure in HRM Settings." });
            }
            else if (unassignedEmps > 0 && !structures.Any(s => s.IsActive))
            {
                issues.Add(new { severity = "WARNING", module = "SalaryStructure", reason = $"{unassignedEmps} employee(s) have no specific salary structure assigned.", action = "Assign salary structures to employees or ensure a school default is active." });
            }

            var workSchedule = await _context.WorkSchedules.FirstOrDefaultAsync(w => w.SchoolId == schoolId && w.IsActive);
            if (workSchedule == null)
            {
                issues.Add(new { severity = "WARNING", module = "WorkSchedule", reason = "No active Work Schedule configured. Standard 30 working days baseline will be used.", action = "Define shift timings and grace periods in Work & Shifts." });
            }

            var pfConfig = await _context.StatutoryConfigurations.FirstOrDefaultAsync(s => s.SchoolId == schoolId && s.StatutoryType == "PF" && s.EffectiveTo == null);
            if (pfConfig != null && pfConfig.IsEnabled && string.IsNullOrWhiteSpace(pfConfig.ConfigurationJson))
            {
                issues.Add(new { severity = "CRITICAL", module = "Statutory_PF", reason = "PF is enabled but configuration JSON rate is missing.", action = "Save PF contribution rules in Statutory Settings." });
            }

            var lastSync = await _context.AttendanceSyncRecords
                .Where(a => a.SchoolId == schoolId)
                .OrderByDescending(a => a.SyncedAt)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                healthy = !issues.Any(i => (string)i.GetType().GetProperty("severity")?.GetValue(i) == "CRITICAL"),
                totalActiveEmployees = totalEmployees,
                lastAttendanceSync = lastSync?.SyncedAt,
                issues
            });
        }

        // ==========================================
        // 3. Idempotent Attendance Synchronization
        // ==========================================
        [HttpPost("attendance/sync")]
        public async Task<IActionResult> SyncAttendanceBatch([FromBody] AttendanceSyncBatchDto batch)
        {
            var schoolId = GetSchoolId();
            if (batch.Records == null || !batch.Records.Any())
            {
                return BadRequest(new { error = "No attendance records provided for synchronization." });
            }

            int processed = 0;
            int created = 0;
            int duplicatesIgnored = 0;
            int failed = 0;

            foreach (var rec in batch.Records)
            {
                processed++;
                try
                {
                    var emp = await _context.Employees.FirstOrDefaultAsync(e => e.SchoolId == schoolId && (e.Id == rec.EmployeeId || e.EmployeeCode == rec.EmployeeCode));
                    if (emp == null)
                    {
                        failed++;
                        continue;
                    }

                    var punchDate = DateTime.SpecifyKind(rec.PunchDate.Date, DateTimeKind.Utc);
                    var existing = await _context.AttendanceSyncRecords
                        .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.EmployeeId == emp.Id && a.PunchDate.Date == punchDate);

                    if (existing != null)
                    {
                        // Idempotent: Update existing punch times if new or skip
                        existing.CheckInTime = rec.CheckInTime ?? existing.CheckInTime;
                        existing.CheckOutTime = rec.CheckOutTime ?? existing.CheckOutTime;
                        existing.Status = rec.Status ?? existing.Status;
                        existing.SyncStatus = "DuplicateIgnored";
                        existing.SyncedAt = DateTime.UtcNow;
                        duplicatesIgnored++;
                    }
                    else
                    {
                        var newRecord = new AttendanceSyncRecord
                        {
                            Id = Guid.NewGuid(),
                            SchoolId = schoolId,
                            EmployeeId = emp.Id,
                            EmployeeCode = emp.EmployeeCode,
                            SourceSystem = rec.SourceSystem ?? "MongoDB",
                            SourceRecordId = rec.SourceRecordId ?? Guid.NewGuid().ToString(),
                            PunchDate = punchDate,
                            CheckInTime = rec.CheckInTime,
                            CheckOutTime = rec.CheckOutTime,
                            Status = rec.Status ?? "Present",
                            SyncStatus = "Synced",
                            SyncedAt = DateTime.UtcNow
                        };
                        await _context.AttendanceSyncRecords.AddAsync(newRecord);
                        created++;
                    }
                }
                catch
                {
                    failed++;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                summary = new
                {
                    recordsProcessed = processed,
                    recordsCreated = created,
                    duplicatesIgnored,
                    failedRecords = failed,
                    syncedAt = DateTime.UtcNow
                }
            });
        }

        [HttpGet("attendance/sync-status")]
        public async Task<IActionResult> GetAttendanceSyncStatus()
        {
            var schoolId = GetSchoolId();
            var totalSynced = await _context.AttendanceSyncRecords.CountAsync(a => a.SchoolId == schoolId);
            var lastSync = await _context.AttendanceSyncRecords
                .Where(a => a.SchoolId == schoolId)
                .OrderByDescending(a => a.SyncedAt)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                totalRecordsSynced = totalSynced,
                lastSyncTime = lastSync?.SyncedAt,
                lastSource = lastSync?.SourceSystem ?? "N/A"
            });
        }

        // ==========================================
        // 4. End-to-End Dynamic Payroll Engine
        // ==========================================
        [HttpPost("payroll/calculate")]
        public async Task<IActionResult> CalculateMonthlyPayroll([FromBody] CalculatePayrollRequest request)
        {
            var schoolId = GetSchoolId();
            int month = request.Month > 0 ? request.Month : DateTime.UtcNow.Month;
            int year = request.Year > 0 ? request.Year : DateTime.UtcNow.Year;
            int workingDays = request.TotalWorkingDays > 0 ? request.TotalWorkingDays : 30;

            var employees = await _context.Employees
                .AsNoTracking()
                .Where(e => e.SchoolId == schoolId && (e.EmploymentStatus == "Active" || e.EmploymentStatus == "Confirmed" || e.EmploymentStatus == "Probation"))
                .ToListAsync();

            if (!employees.Any())
            {
                return BadRequest(new { error = "No active employees found to generate payroll for." });
            }

            // Precondition Validation: Ensure Salary Structures exist
            var hasActiveStructure = await _context.SalaryStructures
                .AnyAsync(s => s.SchoolId == schoolId && s.IsActive);

            if (!hasActiveStructure)
            {
                return BadRequest(new
                {
                    error = "Payroll Precondition Failed: No active Salary Structure is configured for this school. Please configure Salary Structures in HRM Settings before running payroll."
                });
            }

            // Retrieve or Create Master Payroll Record
            var masterPayroll = await _context.Payrolls
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.PeriodMonth == month && p.PeriodYear == year);

            if (masterPayroll != null && (masterPayroll.Status == "Finalized" || masterPayroll.Status == "Paid"))
            {
                return BadRequest(new { error = $"Payroll for {month}/{year} is already {masterPayroll.Status} and locked against modification." });
            }

            if (masterPayroll == null)
            {
                masterPayroll = new Payroll
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    PeriodMonth = month,
                    PeriodYear = year,
                    PeriodStartDate = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc),
                    PeriodEndDate = new DateTime(year, month, DateTime.DaysInMonth(year, month), 23, 59, 59, DateTimeKind.Utc),
                    Status = "Calculated"
                };
                await _context.Payrolls.AddAsync(masterPayroll);
            }
            else
            {
                masterPayroll.Status = "Calculated";
                _context.PayrollItems.RemoveRange(masterPayroll.Items);
            }

            decimal totalGross = 0;
            decimal totalDeductions = 0;
            decimal totalNet = 0;

            foreach (var emp in employees)
            {
                // Query actual synced attendance LWP and Present counts for this employee
                var targetMonthStart = new DateTime(year, month, 1, 0, 0, 0, DateTimeKind.Utc);
                var targetMonthEnd = new DateTime(year, month, DateTime.DaysInMonth(year, month), 23, 59, 59, DateTimeKind.Utc);

                var syncRecords = await _context.AttendanceSyncRecords
                    .AsNoTracking()
                    .Where(a => a.SchoolId == schoolId && a.EmployeeId == emp.Id && a.PunchDate >= targetMonthStart && a.PunchDate <= targetMonthEnd)
                    .ToListAsync();

                decimal lwpDays = syncRecords.Count(a => a.Status == "LWP" || a.Status == "Absent");
                decimal presentDays = syncRecords.Any() ? syncRecords.Count(a => a.Status == "Present") : workingDays - lwpDays;

                // Also check approved LWP leave requests if attendance records don't exist yet
                if (!syncRecords.Any())
                {
                    var approvedLwpLeaves = await _context.LeaveRequests
                        .AsNoTracking()
                        .Where(l => l.SchoolId == schoolId && (l.EmployeeId == emp.Id || (emp.UserId != null && l.TeacherUserId == emp.UserId))
                            && l.Status == "Approved" 
                            && l.FromDate <= targetMonthEnd && l.ToDate >= targetMonthStart)
                        .Include(l => l.LeavePolicy)
                        .ToListAsync();

                    decimal approvedLwpDays = approvedLwpLeaves
                        .Where(l => l.LeaveType == "LWP" || (l.LeavePolicy != null && !l.LeavePolicy.IsPaid))
                        .Sum(l => l.TotalDays);

                    if (approvedLwpDays > 0)
                    {
                        lwpDays = approvedLwpDays;
                        presentDays = Math.Max(0, workingDays - lwpDays);
                    }
                }

                var calcResult = await _calculationService.CalculateAsync(new CalculationInput
                {
                    SchoolId = schoolId,
                    EmployeeId = emp.Id,
                    SalaryStructureId = emp.SalaryStructureId,
                    BaseGrossSalary = emp.BaseGrossSalary,
                    TotalWorkingDays = workingDays,
                    PresentDays = presentDays,
                    LwpDays = lwpDays,
                    PfApplicable = emp.PfApplicable,
                    EsiApplicable = emp.EsiApplicable,
                    PtApplicable = emp.PtApplicable,
                    TdsApplicable = emp.TdsApplicable,
                    TargetPeriodDate = targetMonthStart
                });

                var item = new PayrollItem
                {
                    Id = Guid.NewGuid(),
                    PayrollId = masterPayroll.Id,
                    EmployeeId = emp.Id,
                    EmployeeName = $"{emp.FirstName} {emp.LastName}",
                    EmployeeCode = emp.EmployeeCode,
                    Designation = emp.DesignationName,
                    Department = emp.DepartmentName,
                    TotalWorkingDays = workingDays,
                    PresentDays = presentDays,
                    LwpDays = lwpDays,
                    BaseGross = calcResult.BaseGross,
                    BasicEarned = calcResult.BasicEarned,
                    GrossEarned = calcResult.EarnedGross,
                    TotalAllowances = calcResult.TotalAllowances,
                    StatutoryDeductions = calcResult.StatutoryDeductions,
                    LwpDeduction = calcResult.LwpDeduction,
                    NetSalary = calcResult.NetSalary,
                    ItemizedEarningsJson = JsonSerializer.Serialize(calcResult.Earnings),
                    ItemizedDeductionsJson = JsonSerializer.Serialize(calcResult.Deductions),
                    Status = "Calculated"
                };

                totalGross += item.GrossEarned;
                totalDeductions += item.StatutoryDeductions;
                totalNet += item.NetSalary;

                await _context.PayrollItems.AddAsync(item);
            }

            masterPayroll.TotalEmployeesProcessed = employees.Count;
            masterPayroll.TotalGrossPay = totalGross;
            masterPayroll.TotalDeductions = totalDeductions;
            masterPayroll.TotalNetPay = totalNet;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                payrollId = masterPayroll.Id,
                status = masterPayroll.Status,
                totalEmployees = employees.Count,
                totalGrossPay = totalGross,
                totalDeductions = totalDeductions,
                totalNetPay = totalNet
            });
        }

        [HttpGet("payroll")]
        public async Task<IActionResult> GetPayrollSummary([FromQuery] int? month, [FromQuery] int? year)
        {
            var schoolId = GetSchoolId();
            int m = month ?? DateTime.UtcNow.Month;
            int y = year ?? DateTime.UtcNow.Year;

            var masterPayroll = await _context.Payrolls
                .AsNoTracking()
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.PeriodMonth == m && p.PeriodYear == y);

            if (masterPayroll == null)
            {
                return Ok(new { hasPayroll = false, message = "No payroll generated for this month yet." });
            }

            return Ok(new
            {
                hasPayroll = true,
                payrollId = masterPayroll.Id,
                month = masterPayroll.PeriodMonth,
                year = masterPayroll.PeriodYear,
                status = masterPayroll.Status,
                totalEmployees = masterPayroll.TotalEmployeesProcessed,
                totalGross = masterPayroll.TotalGrossPay,
                totalDeductions = masterPayroll.TotalDeductions,
                totalNet = masterPayroll.TotalNetPay,
                finalizedAt = masterPayroll.FinalizedAt,
                paidAt = masterPayroll.PaidAt,
                items = masterPayroll.Items.Select(i => new
                {
                    i.Id,
                    i.EmployeeId,
                    i.EmployeeName,
                    i.EmployeeCode,
                    i.Department,
                    i.Designation,
                    i.GrossEarned,
                    i.BasicEarned,
                    i.TotalAllowances,
                    i.StatutoryDeductions,
                    i.NetSalary,
                    i.Status
                })
            });
        }

        [HttpPut("payroll/{id}/finalize")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,superadmin")]
        public async Task<IActionResult> FinalizePayroll(Guid id)
        {
            var schoolId = GetSchoolId();
            var payroll = await _context.Payrolls
                .Include(p => p.Items)
                .FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId);

            if (payroll == null) return NotFound(new { error = "Payroll record not found." });
            if (payroll.Status == "Finalized" || payroll.Status == "Paid")
            {
                return BadRequest(new { error = "Payroll is already finalized." });
            }

            using var tx = await _context.Database.BeginTransactionAsync();
            try
            {
                payroll.Status = "Finalized";
                payroll.FinalizedAt = DateTime.UtcNow;

                // Create Immutable Historical Snapshot
                var snapshot = new PayrollSnapshot
                {
                    Id = Guid.NewGuid(),
                    PayrollId = payroll.Id,
                    SnapshotTakenAt = DateTime.UtcNow,
                    CompleteEngineSnapshotJson = JsonSerializer.Serialize(new
                    {
                        payrollId = payroll.Id,
                        schoolId = payroll.SchoolId,
                        period = $"{payroll.PeriodMonth}/{payroll.PeriodYear}",
                        totalGross = payroll.TotalGrossPay,
                        totalNet = payroll.TotalNetPay,
                        items = payroll.Items
                    })
                };

                await _context.PayrollSnapshots.AddAsync(snapshot);
                _context.Payrolls.Update(payroll);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return Ok(new { success = true, status = "Finalized", snapshotId = snapshot.Id });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                return StatusCode(500, new { error = "Finalization failed: " + ex.Message });
            }
        }

        [HttpPut("payroll/{id}/disburse")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> DisbursePayroll(Guid id, [FromBody] DisbursePayrollRequest request)
        {
            var schoolId = GetSchoolId();
            var payroll = await _context.Payrolls.FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId);
            if (payroll == null) return NotFound(new { error = "Payroll record not found." });

            payroll.Status = "Paid";
            payroll.PaidAt = DateTime.UtcNow;
            payroll.BankBatchRef = request.BankBatchRef ?? $"NEFT-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(1000, 9999)}";

            _context.Payrolls.Update(payroll);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, status = "Paid", bankBatchRef = payroll.BankBatchRef });
        }

        // ==========================================
        // ENTERPRISE LEAVE MANAGEMENT MODULE
        // ==========================================

        // ─── Leave Policy CRUD ─────────────────────────────────────────────────

        /// <summary>Get all leave policies for this school (with optional filters)</summary>
        [HttpGet("leave-policies")]
        public async Task<IActionResult> GetLeavePolicies([FromQuery] bool? activeOnly = true)
        {
            var schoolId = GetSchoolId();
            var query = _context.LeavePolicies.AsNoTracking().Where(p => p.SchoolId == schoolId);
            if (activeOnly == true) query = query.Where(p => p.IsActive);
            var list = await query.OrderBy(p => p.SortOrder).ThenBy(p => p.LeaveTypeName).ToListAsync();
            return Ok(list);
        }

        /// <summary>Create a new leave policy for this school</summary>
        [HttpPost("leave-policies")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,superadmin")]
        public async Task<IActionResult> CreateLeavePolicy([FromBody] CreateLeavePolicyDto dto)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(dto.LeaveTypeCode) || string.IsNullOrWhiteSpace(dto.LeaveTypeName))
                return BadRequest(new { error = "LeaveTypeCode and LeaveTypeName are required." });

            // Validate gender eligibility value
            var validGenders = new[] { "All", "Male", "Female" };
            if (!validGenders.Contains(dto.GenderEligibility ?? "All"))
                return BadRequest(new { error = "GenderEligibility must be 'All', 'Male', or 'Female'." });

            // Validate accrual frequency
            var validFreqs = new[] { "Annual", "Monthly", "Quarterly", "None" };
            if (!validFreqs.Contains(dto.AccrualFrequency ?? "Annual"))
                return BadRequest(new { error = "AccrualFrequency must be 'Annual', 'Monthly', 'Quarterly', or 'None'." });

            // Prevent duplicate leave type code for same school
            var exists = await _context.LeavePolicies.AnyAsync(p => p.SchoolId == schoolId && p.LeaveTypeCode == dto.LeaveTypeCode.ToUpper() && p.IsActive);
            if (exists) return Conflict(new { error = $"An active leave policy with code '{dto.LeaveTypeCode.ToUpper()}' already exists for this school." });

            var policy = new LeavePolicy
            {
                SchoolId = schoolId,
                LeaveTypeCode = dto.LeaveTypeCode.ToUpper().Trim(),
                LeaveTypeName = dto.LeaveTypeName.Trim(),
                Description = dto.Description,
                ColorHex = dto.ColorHex ?? "#3B82F6",
                AnnualAllotment = dto.AnnualAllotment > 0 ? dto.AnnualAllotment : 0,
                AccrualFrequency = dto.AccrualFrequency ?? "Annual",
                AccrualUnitsPerPeriod = dto.AccrualUnitsPerPeriod > 0 ? dto.AccrualUnitsPerPeriod : 1m,
                JoiningRule = dto.JoiningRule ?? "NextMonth",
                JoiningCutoffDay = dto.JoiningCutoffDay is >= 1 and <= 31 ? dto.JoiningCutoffDay : 15,
                GenderEligibility = dto.GenderEligibility ?? "All",
                ProbationEligible = dto.ProbationEligible,
                MinimumServiceDays = dto.MinimumServiceDays >= 0 ? dto.MinimumServiceDays : 0,
                StaffTypeEligibilityJson = dto.StaffTypeEligibilityJson ?? "[\"Teaching\",\"NonTeaching\",\"Administrative\",\"Support\",\"Transport\",\"Security\"]",
                IsPaid = dto.IsPaid,
                RequiresAttachment = dto.RequiresAttachment,
                MinAttachmentAfterDays = dto.MinAttachmentAfterDays,
                AllowHalfDay = dto.AllowHalfDay,
                MaxConsecutiveDays = dto.MaxConsecutiveDays,
                MaxApplicationsPerYear = dto.MaxApplicationsPerYear,
                NoticePeriodDays = dto.NoticePeriodDays,
                SandwichRuleApplied = dto.SandwichRuleApplied,
                CarryForwardAllowed = dto.CarryForwardAllowed,
                MaxCarryForwardDays = dto.MaxCarryForwardDays,
                CarryForwardExpiryMonths = dto.CarryForwardExpiryMonths,
                EncashmentAllowed = dto.EncashmentAllowed,
                MaxEncashmentDays = dto.MaxEncashmentDays,
                ApprovalSequenceJson = dto.ApprovalSequenceJson ?? "[\"Principal\"]",
                IsActive = true,
                SortOrder = dto.SortOrder,
                EffectiveFrom = dto.EffectiveFrom?.ToUniversalTime() ?? DateTime.UtcNow,
                EffectiveTo = dto.EffectiveTo?.ToUniversalTime()
            };

            _context.LeavePolicies.Add(policy);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, policy });
        }

        /// <summary>Update an existing leave policy</summary>
        [HttpPut("leave-policies/{id}")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,superadmin")]
        public async Task<IActionResult> UpdateLeavePolicy(Guid id, [FromBody] CreateLeavePolicyDto dto)
        {
            var schoolId = GetSchoolId();
            var policy = await _context.LeavePolicies.FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId);
            if (policy == null) return NotFound(new { error = "Leave policy not found." });

            policy.LeaveTypeName = dto.LeaveTypeName?.Trim() ?? policy.LeaveTypeName;
            policy.Description = dto.Description ?? policy.Description;
            policy.ColorHex = dto.ColorHex ?? policy.ColorHex;
            policy.AnnualAllotment = dto.AnnualAllotment > 0 ? dto.AnnualAllotment : policy.AnnualAllotment;
            policy.AccrualFrequency = dto.AccrualFrequency ?? policy.AccrualFrequency;
            policy.AccrualUnitsPerPeriod = dto.AccrualUnitsPerPeriod > 0 ? dto.AccrualUnitsPerPeriod : policy.AccrualUnitsPerPeriod;
            policy.JoiningRule = dto.JoiningRule ?? policy.JoiningRule;
            policy.JoiningCutoffDay = dto.JoiningCutoffDay is >= 1 and <= 31 ? dto.JoiningCutoffDay : policy.JoiningCutoffDay;
            policy.GenderEligibility = dto.GenderEligibility ?? policy.GenderEligibility;
            policy.ProbationEligible = dto.ProbationEligible;
            policy.MinimumServiceDays = dto.MinimumServiceDays >= 0 ? dto.MinimumServiceDays : policy.MinimumServiceDays;
            policy.StaffTypeEligibilityJson = dto.StaffTypeEligibilityJson ?? policy.StaffTypeEligibilityJson;
            policy.IsPaid = dto.IsPaid;
            policy.RequiresAttachment = dto.RequiresAttachment;
            policy.MinAttachmentAfterDays = dto.MinAttachmentAfterDays;
            policy.AllowHalfDay = dto.AllowHalfDay;
            policy.MaxConsecutiveDays = dto.MaxConsecutiveDays;
            policy.MaxApplicationsPerYear = dto.MaxApplicationsPerYear;
            policy.NoticePeriodDays = dto.NoticePeriodDays;
            policy.SandwichRuleApplied = dto.SandwichRuleApplied;
            policy.CarryForwardAllowed = dto.CarryForwardAllowed;
            policy.MaxCarryForwardDays = dto.MaxCarryForwardDays;
            policy.CarryForwardExpiryMonths = dto.CarryForwardExpiryMonths;
            policy.EncashmentAllowed = dto.EncashmentAllowed;
            policy.MaxEncashmentDays = dto.MaxEncashmentDays;
            policy.ApprovalSequenceJson = dto.ApprovalSequenceJson ?? policy.ApprovalSequenceJson;
            policy.SortOrder = dto.SortOrder;
            policy.EffectiveTo = dto.EffectiveTo?.ToUniversalTime();
            policy.UpdatedAt = DateTime.UtcNow;

            _context.LeavePolicies.Update(policy);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, policy });
        }

        /// <summary>Soft-delete (deactivate) a leave policy</summary>
        [HttpDelete("leave-policies/{id}")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,superadmin")]
        public async Task<IActionResult> DeleteLeavePolicy(Guid id)
        {
            var schoolId = GetSchoolId();
            var policy = await _context.LeavePolicies.FirstOrDefaultAsync(p => p.Id == id && p.SchoolId == schoolId);
            if (policy == null) return NotFound(new { error = "Leave policy not found." });
            policy.IsActive = false;
            policy.EffectiveTo = DateTime.UtcNow;
            policy.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Leave policy deactivated." });
        }

        // ─── Leave Balance Queries ─────────────────────────────────────────────

        /// <summary>Get computed leave balances for a specific employee (Admin view)</summary>
        [HttpGet("employees/{employeeId}/leave-balance")]
        public async Task<IActionResult> GetEmployeeLeaveBalance(Guid employeeId, [FromQuery] int? year = null)
        {
            var schoolId = GetSchoolId();
            int academicYear = year ?? DateTime.UtcNow.Year;

            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.SchoolId == schoolId);
            if (employee == null) return NotFound(new { error = "Employee not found." });

            var balances = await _leaveEngine.GetEmployeeBalancesAsync(schoolId, employeeId, employee.UserId, academicYear);
            return Ok(new
            {
                employeeId,
                employeeName = $"{employee.FirstName} {employee.LastName}",
                employeeCode = employee.EmployeeCode,
                academicYear,
                gender = employee.Gender,
                status = employee.EmploymentStatus,
                balances
            });
        }

        /// <summary>Get leave balance summary for all employees of this school (paginated)</summary>
        [HttpGet("leave-balance/summary")]
        public async Task<IActionResult> GetAllEmployeesLeaveBalanceSummary(
            [FromQuery] int? year = null,
            [FromQuery] string? staffType = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = GetSchoolId();
            int academicYear = year ?? DateTime.UtcNow.Year;

            var query = _context.Employees.AsNoTracking().Where(e => e.SchoolId == schoolId);
            if (!string.IsNullOrWhiteSpace(staffType) && staffType != "ALL")
                query = query.Where(e => e.StaffType == staffType);

            var total = await query.CountAsync();
            var employees = await query
                .OrderBy(e => e.EmployeeCode)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync();

            var results = new List<object>();
            foreach (var emp in employees)
            {
                var balances = await _leaveEngine.GetEmployeeBalancesAsync(schoolId, emp.Id, emp.UserId, academicYear);
                results.Add(new
                {
                    employeeId = emp.Id,
                    employeeCode = emp.EmployeeCode,
                    employeeName = $"{emp.FirstName} {emp.LastName}",
                    gender = emp.Gender,
                    staffType = emp.StaffType,
                    status = emp.EmploymentStatus,
                    balances
                });
            }

            return Ok(new { totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize), employees = results });
        }

        // ─── Leave Request Management (Admin/AccountManager) ─────────────────

        /// <summary>Get all leave requests for this school (with filters)</summary>
        [HttpGet("leave-requests")]
        public async Task<IActionResult> GetLeaveRequests(
            [FromQuery] string? status = null,
            [FromQuery] Guid? employeeId = null,
            [FromQuery] string? leaveType = null,
            [FromQuery] int? month = null,
            [FromQuery] int? year = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 50)
        {
            var schoolId = GetSchoolId();
            int targetYear = year ?? DateTime.UtcNow.Year;

            var query = _context.LeaveRequests.AsNoTracking()
                .Where(r => r.SchoolId == schoolId && r.FromDate.Year == targetYear);

            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
                query = query.Where(r => r.Status == status);
            if (employeeId.HasValue)
                query = query.Where(r => r.EmployeeId == employeeId);
            if (!string.IsNullOrWhiteSpace(leaveType) && leaveType != "ALL")
                query = query.Where(r => r.LeaveType == leaveType.ToUpper());
            if (month.HasValue)
                query = query.Where(r => r.FromDate.Month == month.Value);

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(r => r.AppliedAt)
                .Skip((page - 1) * pageSize).Take(pageSize)
                .ToListAsync();

            return Ok(new { totalCount = total, page, pageSize, totalPages = (int)Math.Ceiling((double)total / pageSize), requests = items });
        }

        /// <summary>Approve a leave request (updates balance ledger)</summary>
        [HttpPost("leave-requests/{id}/approve")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> ApproveLeaveRequest(Guid id, [FromBody] LeaveActionDto dto)
        {
            var schoolId = GetSchoolId();
            var req = await _context.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);
            if (req == null) return NotFound(new { error = "Leave request not found." });
            if (req.Status == "Approved") return BadRequest(new { error = "This leave is already approved." });
            if (req.Status == "Rejected") return BadRequest(new { error = "Cannot approve a rejected leave request." });

            decimal balBefore = 0;
            decimal balAfter = 0;

            // If policy-linked, validate balance is sufficient
            if (req.LeavePolicyId.HasValue && req.EmployeeId.HasValue)
            {
                var employee = await _context.Employees.AsNoTracking()
                    .FirstOrDefaultAsync(e => e.Id == req.EmployeeId && e.SchoolId == schoolId);
                if (employee != null)
                {
                    var balance = await _leaveEngine.GetSingleBalanceAsync(schoolId, employee.Id, employee.UserId, req.LeavePolicyId.Value, req.FromDate.Year);
                    if (balance != null)
                    {
                        if (balance.Remaining < req.TotalDays)
                        {
                            return BadRequest(new { error = $"Insufficient balance. Employee has {balance.Remaining} day(s) remaining for '{req.LeaveTypeName}', but {req.TotalDays} day(s) requested." });
                        }
                        balBefore = balance.Remaining;
                        balAfter = balBefore - req.TotalDays;
                    }
                }
            }

            req.Status = "Approved";
            req.ApprovedAt = DateTime.UtcNow;
            req.FinalApprovedById = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            _context.LeaveRequests.Update(req);

            // Record in audit ledger
            if (req.LeavePolicyId.HasValue && req.EmployeeId.HasValue)
            {
                var transaction = new LeaveTransaction
                {
                    SchoolId = schoolId,
                    EmployeeId = req.EmployeeId.Value,
                    TeacherUserId = req.TeacherUserId != Guid.Empty ? req.TeacherUserId : null,
                    LeavePolicyId = req.LeavePolicyId.Value,
                    LeaveTypeCode = req.LeaveType,
                    TransactionType = "LEAVE_APPROVED",
                    Amount = -req.TotalDays, // Debit
                    BalanceBefore = balBefore,
                    BalanceAfter = balAfter,
                    LeaveRequestId = req.Id,
                    Remarks = $"Leave approved: {req.FromDate:dd MMM} to {req.ToDate:dd MMM yyyy} ({req.TotalDays} day(s))",
                    ProcessedBy = Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var adminId) ? adminId : null,
                    AcademicYear = req.FromDate.Year,
                    Month = req.FromDate.Month
                };
                _context.LeaveTransactions.Add(transaction);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Leave request approved successfully." });
        }

        /// <summary>Forward a leave request to Accounts department (School Admin recommendation)</summary>
        [HttpPost("leave-requests/{id}/forward")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,superadmin,accountmanager,AccountManager")]
        public async Task<IActionResult> ForwardLeaveRequest(Guid id, [FromBody] LeaveActionDto dto)
        {
            var schoolId = GetSchoolId();
            var req = await _context.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);
            if (req == null) return NotFound(new { error = "Leave request not found." });
            if (req.Status == "Approved") return BadRequest(new { error = "Cannot forward an already approved leave." });
            if (req.Status == "Rejected") return BadRequest(new { error = "Cannot forward a rejected leave." });

            req.Status = "ForwardedToAccounts";
            req.ForwardedById = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            req.ForwardedByName = User.FindFirst(ClaimTypes.Name)?.Value ?? "School Admin";
            req.ForwardedAt = DateTime.UtcNow;
            req.ForwardNote = dto?.Note ?? "Forwarded with recommendation to Accounts department for financial approval.";

            _context.LeaveRequests.Update(req);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Leave request forwarded to Accounts department.", status = req.Status });
        }

        /// <summary>Reject a leave request</summary>
        [HttpPost("leave-requests/{id}/reject")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> RejectLeaveRequest(Guid id, [FromBody] LeaveActionDto dto)
        {
            var schoolId = GetSchoolId();
            var req = await _context.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);
            if (req == null) return NotFound(new { error = "Leave request not found." });
            if (req.Status == "Approved") return BadRequest(new { error = "Cannot reject an already approved leave. Use Revoke instead." });

            req.Status = "Rejected";
            req.RejectionNote = dto.Note;
            _context.LeaveRequests.Update(req);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Leave request rejected." });
        }

        /// <summary>Revoke a previously approved leave (reverses the balance deduction)</summary>
        [HttpPost("leave-requests/{id}/revoke")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> RevokeLeaveRequest(Guid id, [FromBody] LeaveActionDto dto)
        {
            var schoolId = GetSchoolId();
            var req = await _context.LeaveRequests.FirstOrDefaultAsync(r => r.Id == id && r.SchoolId == schoolId);
            if (req == null) return NotFound(new { error = "Leave request not found." });
            if (req.Status != "Approved") return BadRequest(new { error = "Only approved leaves can be revoked." });

            req.Status = "Revoked";
            req.CancellationReason = dto.Note ?? "Revoked by admin";
            req.CancelledAt = DateTime.UtcNow;
            _context.LeaveRequests.Update(req);

            // Reverse the ledger entry
            if (req.LeavePolicyId.HasValue && req.EmployeeId.HasValue)
            {
                var currentBal = await _leaveEngine.GetSingleBalanceAsync(schoolId, req.EmployeeId.Value, req.TeacherUserId, req.LeavePolicyId.Value, req.FromDate.Year);
                var balBefore = currentBal?.Remaining ?? 0;
                var balAfter = balBefore + req.TotalDays;

                var reversal = new LeaveTransaction
                {
                    SchoolId = schoolId,
                    EmployeeId = req.EmployeeId.Value,
                    LeavePolicyId = req.LeavePolicyId.Value,
                    LeaveTypeCode = req.LeaveType,
                    TransactionType = "LEAVE_CANCELLED",
                    Amount = req.TotalDays, // Credit back
                    BalanceBefore = balBefore,
                    BalanceAfter = balAfter,
                    LeaveRequestId = req.Id,
                    Remarks = dto.Note ?? "Leave revoked by admin",
                    ProcessedBy = Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var adminId) ? adminId : null,
                    AcademicYear = req.FromDate.Year,
                    Month = req.FromDate.Month
                };
                _context.LeaveTransactions.Add(reversal);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Leave revoked and balance restored." });
        }

        // ─── Manual Leave Adjustment ───────────────────────────────────────────

        /// <summary>Manually credit or debit leave balance for an employee</summary>
        [HttpPost("employees/{employeeId}/leave-adjustment")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> ManualLeaveAdjustment(Guid employeeId, [FromBody] ManualLeaveAdjustmentDto dto)
        {
            var schoolId = GetSchoolId();
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.SchoolId == schoolId);
            if (employee == null) return NotFound(new { error = "Employee not found." });

            var policy = await _context.LeavePolicies.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == dto.LeavePolicyId && p.SchoolId == schoolId);
            if (policy == null) return NotFound(new { error = "Leave policy not found." });

            if (dto.Days == 0) return BadRequest(new { error = "Adjustment days cannot be zero." });

            var currentBal = await _leaveEngine.GetSingleBalanceAsync(schoolId, employeeId, employee.UserId, dto.LeavePolicyId, dto.AcademicYear ?? DateTime.UtcNow.Year);
            var balBefore = currentBal?.Remaining ?? 0;
            var balAfter = balBefore + dto.Days;

            var txnType = dto.Days > 0 ? "MANUAL_CREDIT" : "MANUAL_DEBIT";
            var transaction = new LeaveTransaction
            {
                SchoolId = schoolId,
                EmployeeId = employeeId,
                TeacherUserId = employee.UserId,
                LeavePolicyId = dto.LeavePolicyId,
                LeaveTypeCode = policy.LeaveTypeCode,
                TransactionType = txnType,
                Amount = dto.Days,
                BalanceBefore = balBefore,
                BalanceAfter = balAfter,
                Remarks = dto.Reason ?? $"Manual {(dto.Days > 0 ? "credit" : "debit")} by admin",
                ProcessedBy = Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var adminId) ? adminId : null,
                AcademicYear = dto.AcademicYear ?? DateTime.UtcNow.Year,
                Month = DateTime.UtcNow.Month
            };
            _context.LeaveTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = $"{Math.Abs(dto.Days)} day(s) {txnType.Replace("_", " ").ToLower()} recorded for {policy.LeaveTypeName}." });
        }

        /// <summary>Process carry-forward for all employees at year-end</summary>
        [HttpPost("leave/carry-forward")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,superadmin")]
        public async Task<IActionResult> ProcessCarryForward([FromBody] CarryForwardRequestDto dto)
        {
            var schoolId = GetSchoolId();
            int fromYear = dto.FromYear;
            int toYear = dto.ToYear;

            if (toYear <= fromYear) return BadRequest(new { error = "ToYear must be greater than FromYear." });

            var carryPolicies = await _context.LeavePolicies.AsNoTracking()
                .Where(p => p.SchoolId == schoolId && p.IsActive && p.CarryForwardAllowed)
                .ToListAsync();

            if (!carryPolicies.Any()) return Ok(new { message = "No policies have carry-forward enabled.", count = 0 });

            var employees = await _context.Employees.AsNoTracking()
                .Where(e => e.SchoolId == schoolId)
                .ToListAsync();

            int count = 0;
            foreach (var emp in employees)
            {
                foreach (var policy in carryPolicies)
                {
                    var balances = await _leaveEngine.GetEmployeeBalancesAsync(schoolId, emp.Id, emp.UserId, fromYear);
                    var bal = balances.FirstOrDefault(b => b.LeavePolicyId == policy.Id);
                    if (bal == null) continue;

                    decimal carryAmount = Math.Min(bal.Remaining, policy.MaxCarryForwardDays);
                    if (carryAmount <= 0) continue;

                    _context.LeaveTransactions.Add(new LeaveTransaction
                    {
                        SchoolId = schoolId,
                        EmployeeId = emp.Id,
                        TeacherUserId = emp.UserId,
                        LeavePolicyId = policy.Id,
                        LeaveTypeCode = policy.LeaveTypeCode,
                        TransactionType = "CARRY_FORWARD",
                        Amount = carryAmount,
                        BalanceBefore = 0,
                        BalanceAfter = carryAmount,
                        Remarks = $"Carry forward from {fromYear} to {toYear}. Max allowed: {policy.MaxCarryForwardDays} days.",
                        ProcessedBy = Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var adminId) ? adminId : null,
                        AcademicYear = toYear,
                        Month = 1
                    });
                    count++;
                }
            }

            if (count > 0) await _context.SaveChangesAsync();
            return Ok(new { success = true, message = $"Carry-forward processed for {count} employee-policy combination(s).", count });
        }

        /// <summary>Get leave transaction audit ledger for an employee</summary>
        [HttpGet("employees/{employeeId}/leave-ledger")]
        public async Task<IActionResult> GetLeaveLedger(Guid employeeId, [FromQuery] int? year = null, [FromQuery] string? leaveType = null)
        {
            var schoolId = GetSchoolId();
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == employeeId && e.SchoolId == schoolId);
            if (employee == null) return NotFound(new { error = "Employee not found." });

            int academicYear = year ?? DateTime.UtcNow.Year;
            var query = _context.LeaveTransactions.AsNoTracking()
                .Where(t => t.SchoolId == schoolId && t.EmployeeId == employeeId && t.AcademicYear == academicYear);

            if (!string.IsNullOrWhiteSpace(leaveType) && leaveType != "ALL")
                query = query.Where(t => t.LeaveTypeCode == leaveType.ToUpper());

            var ledger = await query.OrderByDescending(t => t.CreatedAt).ToListAsync();
            return Ok(new
            {
                employeeId,
                employeeName = $"{employee.FirstName} {employee.LastName}",
                academicYear,
                totalTransactions = ledger.Count,
                ledger
            });
        }

        // ─── Holiday Calendar ──────────────────────────────────────────────────

        /// <summary>Get holiday calendar for a school and year</summary>
        [HttpGet("holidays")]
        public async Task<IActionResult> GetHolidays([FromQuery] int? year = null)
        {
            var schoolId = GetSchoolId();
            int targetYear = year ?? DateTime.UtcNow.Year;
            var holidays = await _context.HolidayCalendars.AsNoTracking()
                .Where(h => h.SchoolId == schoolId && h.AcademicYear == targetYear)
                .OrderBy(h => h.Date)
                .ToListAsync();
            return Ok(new { year = targetYear, count = holidays.Count, holidays });
        }

        /// <summary>Create a new holiday</summary>
        [HttpPost("holidays")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> CreateHoliday([FromBody] CreateHolidayDto dto)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { error = "Holiday name is required." });

            var holidayDate = DateTime.SpecifyKind(dto.Date.Date, DateTimeKind.Utc);
            var exists = await _context.HolidayCalendars.AnyAsync(h => h.SchoolId == schoolId && h.Date == holidayDate);
            if (exists) return Conflict(new { error = $"A holiday on {holidayDate:dd MMM yyyy} already exists." });

            var holiday = new HolidayCalendar
            {
                SchoolId = schoolId,
                Name = dto.Name.Trim(),
                Date = holidayDate,
                HolidayType = dto.HolidayType ?? "School",
                IsOptional = dto.IsOptional,
                Description = dto.Description,
                IsRecurringYearly = dto.IsRecurringYearly,
                AcademicYear = dto.Date.Year
            };

            _context.HolidayCalendars.Add(holiday);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, holiday });
        }

        /// <summary>Bulk import holidays (e.g. from government list)</summary>
        [HttpPost("holidays/bulk")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> BulkCreateHolidays([FromBody] List<CreateHolidayDto> dtos)
        {
            var schoolId = GetSchoolId();
            if (dtos == null || !dtos.Any()) return BadRequest(new { error = "No holidays provided." });

            var existingDates = await _context.HolidayCalendars.AsNoTracking()
                .Where(h => h.SchoolId == schoolId)
                .Select(h => h.Date.Date)
                .ToListAsync();

            var holidays = dtos
                .Where(dto => !existingDates.Contains(dto.Date.Date))
                .Select(dto => new HolidayCalendar
                {
                    SchoolId = schoolId,
                    Name = dto.Name.Trim(),
                    Date = DateTime.SpecifyKind(dto.Date.Date, DateTimeKind.Utc),
                    HolidayType = dto.HolidayType ?? "School",
                    IsOptional = dto.IsOptional,
                    Description = dto.Description,
                    IsRecurringYearly = dto.IsRecurringYearly,
                    AcademicYear = dto.Date.Year
                }).ToList();

            if (holidays.Any())
            {
                _context.HolidayCalendars.AddRange(holidays);
                await _context.SaveChangesAsync();
            }

            return Ok(new { success = true, count = holidays.Count, message = $"{holidays.Count} new holiday(s) imported (duplicates skipped)." });
        }

        /// <summary>Delete a holiday</summary>
        [HttpDelete("holidays/{id}")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> DeleteHoliday(Guid id)
        {
            var schoolId = GetSchoolId();
            var holiday = await _context.HolidayCalendars.FirstOrDefaultAsync(h => h.Id == id && h.SchoolId == schoolId);
            if (holiday == null) return NotFound(new { error = "Holiday not found." });
            _context.HolidayCalendars.Remove(holiday);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Holiday deleted." });
        }

        // ─── Leave Analytics & Reports ─────────────────────────────────────────

        /// <summary>Leave analytics dashboard — summary stats for admin</summary>
        [HttpGet("leave/analytics")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> GetLeaveAnalytics([FromQuery] int? year = null, [FromQuery] int? month = null)
        {
            var schoolId = GetSchoolId();
            int targetYear = year ?? DateTime.UtcNow.Year;

            var query = _context.LeaveRequests.AsNoTracking()
                .Where(r => r.SchoolId == schoolId && r.FromDate.Year == targetYear);

            if (month.HasValue)
                query = query.Where(r => r.FromDate.Month == month.Value);

            var requests = await query.ToListAsync();

            var statusBreakdown = requests
                .GroupBy(r => r.Status)
                .Select(g => new { status = g.Key, count = g.Count(), totalDays = g.Sum(r => r.TotalDays) })
                .ToList();

            var typeBreakdown = requests
                .Where(r => r.Status == "Approved")
                .GroupBy(r => r.LeaveType)
                .Select(g => new { leaveType = g.Key, count = g.Count(), totalDays = g.Sum(r => r.TotalDays) })
                .OrderByDescending(g => g.totalDays)
                .ToList();

            var monthlyTrend = requests
                .Where(r => r.Status == "Approved")
                .GroupBy(r => r.FromDate.Month)
                .Select(g => new { month = g.Key, count = g.Count(), totalDays = g.Sum(r => r.TotalDays) })
                .OrderBy(g => g.month)
                .ToList();

            var topAbsentees = requests
                .Where(r => r.Status == "Approved")
                .GroupBy(r => new { r.EmployeeId, r.EmployeeName, r.EmployeeCode })
                .Select(g => new { employeeId = g.Key.EmployeeId, name = g.Key.EmployeeName, code = g.Key.EmployeeCode, totalDays = g.Sum(r => r.TotalDays), count = g.Count() })
                .OrderByDescending(g => g.totalDays)
                .Take(10)
                .ToList();

            var activePolicies = await _context.LeavePolicies.AsNoTracking()
                .CountAsync(p => p.SchoolId == schoolId && p.IsActive);

            var totalHolidays = await _context.HolidayCalendars.AsNoTracking()
                .CountAsync(h => h.SchoolId == schoolId && h.AcademicYear == targetYear);

            return Ok(new
            {
                year = targetYear,
                totalRequests = requests.Count,
                activePolicies,
                totalHolidays,
                statusBreakdown,
                typeBreakdown,
                monthlyTrend,
                topAbsentees
            });
        }

        // ─── Employee Self-Apply Leave (for employees NOT in teacher role) ─────

        /// <summary>Apply leave as an employee (AccountManager or SchoolAdmin)</summary>
        [HttpPost("leave/apply")]
        public async Task<IActionResult> ApplyLeaveAsEmployee([FromBody] EmployeeApplyLeaveDto dto)
        {
            var schoolId = GetSchoolId();
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            // Find employee record
            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.UserId == userId && e.SchoolId == schoolId);
            if (employee == null)
                return BadRequest(new { error = "No employee profile found for your account. Contact your School Admin." });

            var policy = await _context.LeavePolicies.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Id == dto.LeavePolicyId && p.SchoolId == schoolId && p.IsActive);
            if (policy == null) return NotFound(new { error = "Selected leave policy not found or inactive." });

            // Run full validation
            var (isValid, validErr) = await _leaveEngine.ValidateLeaveApplicationAsync(
                schoolId, employee, dto.LeavePolicyId, dto.FromDate, dto.ToDate, dto.DayType);
            if (!isValid) return BadRequest(new { error = validErr });

            // Check balance
            var balance = await _leaveEngine.GetSingleBalanceAsync(schoolId, employee.Id, employee.UserId, dto.LeavePolicyId, dto.FromDate.Year);
            decimal duration = await _leaveEngine.CalculateLeaveDurationAsync(
                schoolId, dto.FromDate, dto.ToDate, dto.DayType, policy.SandwichRuleApplied, dto.FromDate.Year);

            if (balance != null && balance.Remaining < duration)
                return BadRequest(new { error = $"Insufficient balance. Available: {balance.Remaining} day(s), Requested: {duration} day(s)." });

            // Check attachment requirement
            if (policy.RequiresAttachment && policy.MinAttachmentAfterDays > 0 && duration > policy.MinAttachmentAfterDays)
            {
                if (string.IsNullOrWhiteSpace(dto.AttachmentUrl))
                    return BadRequest(new { error = $"A supporting document is required for '{policy.LeaveTypeName}' exceeding {policy.MinAttachmentAfterDays} day(s)." });
            }

            var req = new LeaveRequest
            {
                SchoolId = schoolId,
                EmployeeId = employee.Id,
                TeacherUserId = userId,
                EmployeeCode = employee.EmployeeCode,
                EmployeeName = $"{employee.FirstName} {employee.LastName}",
                LeavePolicyId = policy.Id,
                LeaveType = policy.LeaveTypeCode,
                LeaveTypeName = policy.LeaveTypeName,
                DayType = dto.DayType,
                HalfDaySession = dto.DayType.Equals("HalfDay", StringComparison.OrdinalIgnoreCase) ? dto.HalfDaySession : null,
                FromDate = DateTime.SpecifyKind(dto.FromDate.Date, DateTimeKind.Utc),
                ToDate = dto.DayType.Equals("HalfDay", StringComparison.OrdinalIgnoreCase)
                    ? DateTime.SpecifyKind(dto.FromDate.Date, DateTimeKind.Utc)
                    : DateTime.SpecifyKind(dto.ToDate.Date, DateTimeKind.Utc),
                TotalDays = duration,
                TotalCalendarDays = (int)((dto.ToDate.Date - dto.FromDate.Date).TotalDays + 1),
                Reason = dto.Reason ?? "",
                AttachmentUrl = dto.AttachmentUrl,
                ContactDuringLeave = dto.ContactDuringLeave,
                HandoverTo = dto.HandoverTo,
                HandoverNotes = dto.HandoverNotes,
                Status = "Pending",
                AppliedAt = DateTime.UtcNow
            };

            _context.LeaveRequests.Add(req);

            // Record LEAVE_APPLIED transaction in ledger
            _context.LeaveTransactions.Add(new LeaveTransaction
            {
                SchoolId = schoolId,
                EmployeeId = employee.Id,
                TeacherUserId = userId,
                LeavePolicyId = policy.Id,
                LeaveTypeCode = policy.LeaveTypeCode,
                TransactionType = "LEAVE_APPLIED",
                Amount = -duration,
                BalanceBefore = balance?.Remaining ?? 0,
                BalanceAfter = (balance?.Remaining ?? 0) - duration,
                LeaveRequestId = req.Id,
                Remarks = $"Leave applied: {dto.FromDate:dd MMM} to {dto.ToDate:dd MMM yyyy}",
                ProcessedBy = userId,
                AcademicYear = dto.FromDate.Year,
                Month = dto.FromDate.Month
            });

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Leave request submitted successfully.", leaveRequestId = req.Id });
        }

        /// <summary>Get own leave requests (for any employee role)</summary>
        [HttpGet("leave/my-requests")]
        public async Task<IActionResult> GetMyLeaveRequests([FromQuery] int? year = null)
        {
            var schoolId = GetSchoolId();
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            int targetYear = year ?? DateTime.UtcNow.Year;

            var requests = await _context.LeaveRequests.AsNoTracking()
                .Where(r => r.SchoolId == schoolId && r.TeacherUserId == userId && r.FromDate.Year == targetYear)
                .OrderByDescending(r => r.AppliedAt)
                .ToListAsync();

            return Ok(requests);
        }

        /// <summary>Get own leave balances for all eligible policies</summary>
        [HttpGet("leave/my-balance")]
        public async Task<IActionResult> GetMyLeaveBalance([FromQuery] int? year = null)
        {
            var schoolId = GetSchoolId();
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            int academicYear = year ?? DateTime.UtcNow.Year;

            var employee = await _context.Employees.AsNoTracking()
                .FirstOrDefaultAsync(e => e.UserId == userId && e.SchoolId == schoolId);
            if (employee == null)
                return Ok(new { hasEmployeeProfile = false, balances = new List<object>() });

            var balances = await _leaveEngine.GetEmployeeBalancesAsync(schoolId, employee.Id, userId, academicYear);
            return Ok(new
            {
                hasEmployeeProfile = true,
                employeeId = employee.Id,
                employeeCode = employee.EmployeeCode,
                employeeName = $"{employee.FirstName} {employee.LastName}",
                gender = employee.Gender,
                status = employee.EmploymentStatus,
                academicYear,
                balances
            });
        }

        /// <summary>Cancel own pending leave request</summary>
        [HttpPost("leave/{id}/cancel")]
        public async Task<IActionResult> CancelMyLeave(Guid id, [FromBody] LeaveActionDto dto)
        {
            var schoolId = GetSchoolId();
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var employee = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.UserId == userId && e.SchoolId == schoolId);

            var req = await _context.LeaveRequests.FirstOrDefaultAsync(
                r => r.Id == id && r.SchoolId == schoolId && (r.TeacherUserId == userId || (employee != null && r.EmployeeId == employee.Id)));
            if (req == null) return NotFound(new { error = "Leave request not found." });
            if (req.Status == "Approved")
                return BadRequest(new { error = "Cannot self-cancel an approved leave. Contact your admin." });
            if (req.Status == "Cancelled" || req.Status == "Revoked")
                return BadRequest(new { error = "Leave is already cancelled." });

            req.Status = "Cancelled";
            req.CancelledAt = DateTime.UtcNow;
            req.CancellationReason = dto.Note ?? "Cancelled by employee";
            _context.LeaveRequests.Update(req);

            // Record cancellation in ledger
            if (req.LeavePolicyId.HasValue && req.EmployeeId.HasValue)
            {
                var currentBal = await _leaveEngine.GetSingleBalanceAsync(schoolId, req.EmployeeId.Value, req.TeacherUserId, req.LeavePolicyId.Value, req.FromDate.Year);
                var balBefore = currentBal?.Remaining ?? 0;
                var balAfter = balBefore + req.TotalDays;
                _context.LeaveTransactions.Add(new LeaveTransaction
                {
                    SchoolId = schoolId,
                    EmployeeId = req.EmployeeId.Value,
                    TeacherUserId = userId,
                    LeavePolicyId = req.LeavePolicyId.Value,
                    LeaveTypeCode = req.LeaveType,
                    TransactionType = "LEAVE_CANCELLED",
                    Amount = req.TotalDays,
                    BalanceBefore = balBefore,
                    BalanceAfter = balAfter,
                    LeaveRequestId = req.Id,
                    Remarks = dto.Note ?? "Pending leave cancelled by employee",
                    ProcessedBy = userId,
                    AcademicYear = req.FromDate.Year,
                    Month = req.FromDate.Month
                });
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Leave request cancelled." });
        }

        // ─── Daily Staff Attendance Desk ───────────────────────────────────────

        /// <summary>Get daily attendance roll call for all staff members</summary>
        [HttpGet("attendance/daily")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> GetDailyStaffAttendance(
            [FromQuery] DateTime? date = null,
            [FromQuery] string? department = null,
            [FromQuery] string? search = null)
        {
            var schoolId = GetSchoolId();
            var targetDate = (date ?? DateTime.UtcNow).Date;
            var startOfDay = DateTime.SpecifyKind(targetDate, DateTimeKind.Utc);
            var endOfDay = DateTime.SpecifyKind(targetDate.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

            var empQuery = _context.Employees.AsNoTracking()
                .Where(e => e.SchoolId == schoolId && (e.EmploymentStatus == "Active" || e.EmploymentStatus == "Confirmed" || e.EmploymentStatus == "Probation"));

            if (!string.IsNullOrWhiteSpace(department) && department != "ALL")
            {
                empQuery = empQuery.Where(e => e.DepartmentName == department);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                empQuery = empQuery.Where(e =>
                    e.FirstName.ToLower().Contains(s) ||
                    e.LastName.ToLower().Contains(s) ||
                    e.EmployeeCode.ToLower().Contains(s));
            }

            var employees = await empQuery
                .OrderBy(e => e.DepartmentName).ThenBy(e => e.FirstName)
                .ToListAsync();

            var syncRecords = await _context.AttendanceSyncRecords.AsNoTracking()
                .Where(a => a.SchoolId == schoolId && a.PunchDate >= startOfDay && a.PunchDate <= endOfDay)
                .ToListAsync();

            var approvedLeaves = await _context.LeaveRequests.AsNoTracking()
                .Where(l => l.SchoolId == schoolId && l.Status == "Approved" && l.FromDate.Date <= targetDate && l.ToDate.Date >= targetDate)
                .ToListAsync();

            var items = employees.Select(emp =>
            {
                var punch = syncRecords.FirstOrDefault(a => a.EmployeeId == emp.Id);
                var leave = approvedLeaves.FirstOrDefault(l => l.EmployeeId == emp.Id || (emp.UserId != null && l.TeacherUserId == emp.UserId));

                string status = "Present";
                string? checkIn = null;
                string? checkOut = null;
                string source = "System";
                string remarks = "";

                if (leave != null)
                {
                    status = "OnLeave";
                    remarks = $"{leave.LeaveTypeName} ({leave.Reason})";
                    source = "LeaveModule";
                }
                else if (punch != null)
                {
                    status = punch.Status;
                    checkIn = punch.CheckInTime?.ToString("HH:mm");
                    checkOut = punch.CheckOutTime?.ToString("HH:mm");
                    source = punch.SourceSystem;
                    remarks = punch.Remarks;
                }
                else
                {
                    bool isSunday = targetDate.DayOfWeek == DayOfWeek.Sunday;
                    status = isSunday ? "Holiday" : "Present";
                    source = "Default";
                }

                return new
                {
                    employeeId = emp.Id,
                    employeeCode = emp.EmployeeCode,
                    name = $"{emp.FirstName} {emp.LastName}",
                    department = emp.DepartmentName,
                    designation = emp.DesignationName,
                    staffType = emp.StaffType,
                    status,
                    checkIn,
                    checkOut,
                    source,
                    remarks
                };
            }).ToList();

            var summary = new
            {
                date = targetDate.ToString("yyyy-MM-dd"),
                totalStaff = employees.Count,
                presentCount = items.Count(i => i.status == "Present"),
                absentCount = items.Count(i => i.status == "Absent"),
                onLeaveCount = items.Count(i => i.status == "OnLeave"),
                lateCount = items.Count(i => i.status == "Late"),
                attendanceRate = employees.Count > 0 ? Math.Round((decimal)items.Count(i => i.status == "Present" || i.status == "Late") / employees.Count * 100, 1) : 0
            };

            return Ok(new { summary, records = items });
        }

        /// <summary>Mark or manually correct daily attendance for an employee</summary>
        [HttpPost("attendance/mark")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin")]
        public async Task<IActionResult> MarkStaffAttendance([FromBody] MarkAttendanceDto dto)
        {
            var schoolId = GetSchoolId();
            var emp = await _context.Employees.FirstOrDefaultAsync(e => e.Id == dto.EmployeeId && e.SchoolId == schoolId);
            if (emp == null) return NotFound(new { error = "Employee not found." });

            var targetDate = dto.Date.Date;
            var startOfDay = DateTime.SpecifyKind(targetDate, DateTimeKind.Utc);
            var endOfDay = DateTime.SpecifyKind(targetDate.AddDays(1).AddTicks(-1), DateTimeKind.Utc);

            var existing = await _context.AttendanceSyncRecords
                .FirstOrDefaultAsync(a => a.SchoolId == schoolId && a.EmployeeId == emp.Id && a.PunchDate >= startOfDay && a.PunchDate <= endOfDay);

            DateTime? checkIn = null;
            DateTime? checkOut = null;

            if (!string.IsNullOrWhiteSpace(dto.CheckInTime) && TimeSpan.TryParse(dto.CheckInTime, out var inTs))
            {
                checkIn = DateTime.SpecifyKind(targetDate.Add(inTs), DateTimeKind.Utc);
            }

            if (!string.IsNullOrWhiteSpace(dto.CheckOutTime) && TimeSpan.TryParse(dto.CheckOutTime, out var outTs))
            {
                checkOut = DateTime.SpecifyKind(targetDate.Add(outTs), DateTimeKind.Utc);
            }

            if (existing != null)
            {
                existing.Status = dto.Status ?? "Present";
                if (checkIn.HasValue) existing.CheckInTime = checkIn;
                if (checkOut.HasValue) existing.CheckOutTime = checkOut;
                existing.Remarks = dto.Remarks ?? existing.Remarks;
                existing.SyncedAt = DateTime.UtcNow;
                existing.SourceSystem = "AdminDesk";
                _context.AttendanceSyncRecords.Update(existing);
            }
            else
            {
                var record = new AttendanceSyncRecord
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    EmployeeId = emp.Id,
                    EmployeeCode = emp.EmployeeCode,
                    PunchDate = DateTime.SpecifyKind(targetDate, DateTimeKind.Utc),
                    CheckInTime = checkIn,
                    CheckOutTime = checkOut,
                    Status = dto.Status ?? "Present",
                    SyncStatus = "Synced",
                    SyncedAt = DateTime.UtcNow,
                    SourceSystem = "AdminDesk",
                    Remarks = dto.Remarks ?? ""
                };
                await _context.AttendanceSyncRecords.AddAsync(record);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = $"Attendance marked as '{dto.Status}' for {emp.FirstName} {emp.LastName}." });
        }
    }

    // --- DTOs ---

    public class MarkAttendanceDto
    {
        public Guid EmployeeId { get; set; }
        public DateTime Date { get; set; }
        public string Status { get; set; } = "Present";
        public string? CheckInTime { get; set; }
        public string? CheckOutTime { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateEmployeeDto
    {
        public string? EmployeeCode { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Gender { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Address { get; set; }
        public string? StaffType { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? DesignationId { get; set; }
        public DateTime? JoiningDate { get; set; }
        public decimal BaseGrossSalary { get; set; } = 35000;
        public Guid? SalaryStructureId { get; set; }
        public bool PfApplicable { get; set; } = true;
        public bool EsiApplicable { get; set; } = true;
        public bool PtApplicable { get; set; } = true;
        public bool TdsApplicable { get; set; } = false;
        public string? BankName { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? BankIfscCode { get; set; }
        public string? PanNumber { get; set; }
        public string? AadhaarLast4 { get; set; }
        public string? Qualification { get; set; }
        public string? Specialization { get; set; }
    }

    public class UpdateEmployeeDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? StaffType { get; set; }
        public string? EmploymentStatus { get; set; }
        public Guid? DepartmentId { get; set; }
        public Guid? DesignationId { get; set; }
        public decimal BaseGrossSalary { get; set; }
        public bool PfApplicable { get; set; }
        public bool EsiApplicable { get; set; }
        public bool PtApplicable { get; set; }
        public bool TdsApplicable { get; set; }
        public string? BankName { get; set; }
        public string? BankAccountNumber { get; set; }
        public string? BankIfscCode { get; set; }
        public string? PanNumber { get; set; }
    }

    public class CalculatePayrollRequest
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public int TotalWorkingDays { get; set; } = 30;
    }

    public class DisbursePayrollRequest
    {
        public string? BankBatchRef { get; set; }
    }

    public class AttendanceSyncBatchDto
    {
        public List<AttendanceSyncItemDto> Records { get; set; } = new();
    }

    public class AttendanceSyncItemDto
    {
        public Guid? EmployeeId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? SourceSystem { get; set; } = "MongoDB";
        public string? SourceRecordId { get; set; }
        public DateTime PunchDate { get; set; }
        public DateTime? CheckInTime { get; set; }
        public DateTime? CheckOutTime { get; set; }
        public string? Status { get; set; } = "Present";
    }

    // ─── New Enterprise Leave DTOs ───────────────────────────────────────────────

    public class CreateLeavePolicyDto
    {
        public string LeaveTypeCode { get; set; } = string.Empty;
        public string LeaveTypeName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? ColorHex { get; set; }
        public decimal AnnualAllotment { get; set; } = 12;
        public string? AccrualFrequency { get; set; } = "Annual";
        public decimal AccrualUnitsPerPeriod { get; set; } = 1;
        public string? JoiningRule { get; set; } = "NextMonth";
        public int JoiningCutoffDay { get; set; } = 15;
        public string? GenderEligibility { get; set; } = "All";
        public bool ProbationEligible { get; set; } = false;
        public int MinimumServiceDays { get; set; } = 0;
        public string? StaffTypeEligibilityJson { get; set; }
        public bool IsPaid { get; set; } = true;
        public bool RequiresAttachment { get; set; } = false;
        public int MinAttachmentAfterDays { get; set; } = 0;
        public bool AllowHalfDay { get; set; } = true;
        public int MaxConsecutiveDays { get; set; } = 0;
        public int MaxApplicationsPerYear { get; set; } = 0;
        public int NoticePeriodDays { get; set; } = 0;
        public bool SandwichRuleApplied { get; set; } = false;
        public bool CarryForwardAllowed { get; set; } = false;
        public decimal MaxCarryForwardDays { get; set; } = 0;
        public int CarryForwardExpiryMonths { get; set; } = 12;
        public bool EncashmentAllowed { get; set; } = false;
        public decimal MaxEncashmentDays { get; set; } = 0;
        public string? ApprovalSequenceJson { get; set; }
        public int SortOrder { get; set; } = 0;
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class EmployeeApplyLeaveDto
    {
        public Guid LeavePolicyId { get; set; }
        public string DayType { get; set; } = "FullDay";  // FullDay | HalfDay | WorkFromHome | OutdoorDuty
        public string? HalfDaySession { get; set; }       // Morning | Afternoon
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set; }
        public string? Reason { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? ContactDuringLeave { get; set; }
        public string? HandoverTo { get; set; }
        public string? HandoverNotes { get; set; }
    }

    public class LeaveActionDto
    {
        public string? Note { get; set; }
    }

    public class ManualLeaveAdjustmentDto
    {
        public Guid LeavePolicyId { get; set; }
        public decimal Days { get; set; }         // Positive = credit, negative = debit
        public string? Reason { get; set; }
        public int? AcademicYear { get; set; }
    }

    public class CarryForwardRequestDto
    {
        public int FromYear { get; set; }
        public int ToYear { get; set; }
    }

    public class CreateHolidayDto
    {
        public string Name { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string? HolidayType { get; set; } = "School"; // National | Regional | School | Optional
        public bool IsOptional { get; set; } = false;
        public string? Description { get; set; }
        public bool IsRecurringYearly { get; set; } = false;
    }
}

