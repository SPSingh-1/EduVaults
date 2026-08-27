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
    [Authorize(Roles = "accountmanager,AccountManager,schooladmin,SchoolAdmin,superadmin")]
    public class HrmController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly EduVaultDbContext _context;
        private readonly IPayrollCalculationService _calculationService;

        public HrmController(IUnitOfWork unitOfWork, EduVaultDbContext context, IPayrollCalculationService calculationService)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _calculationService = calculationService;
        }

        private Guid GetSchoolId()
        {
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
            return Ok(new { success = true, employee });
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
                    PresentDays = workingDays,
                    LwpDays = 0,
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
    }

    // --- DTOs ---

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
}
