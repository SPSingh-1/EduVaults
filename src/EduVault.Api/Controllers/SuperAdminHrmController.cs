using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/super/schools/{schoolId}/hrm")]
    [Authorize(Roles = "superadmin")]
    public class SuperAdminHrmController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly EduVaultDbContext _context;
        private readonly Services.IPayrollCalculationService _calculationService;

        public SuperAdminHrmController(IUnitOfWork unitOfWork, EduVaultDbContext context, Services.IPayrollCalculationService calculationService)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _calculationService = calculationService;
        }

        // ==========================================
        // 1. Overview & Health Status
        // ==========================================
        [HttpGet("overview")]
        public async Task<IActionResult> GetOverview(Guid schoolId)
        {
            var school = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schoolId);
            if (school == null) return NotFound(new { error = "School not found" });

            var totalEmployees = await _context.Employees.AsNoTracking().CountAsync(e => e.SchoolId == schoolId);
            var activeEmployees = await _context.Employees.AsNoTracking().CountAsync(e => e.SchoolId == schoolId && e.EmploymentStatus == "Active");
            var deptsCount = await _context.Departments.AsNoTracking().CountAsync(d => d.SchoolId == schoolId);
            var desigsCount = await _context.Designations.AsNoTracking().CountAsync(d => d.SchoolId == schoolId);
            var leavePoliciesCount = await _context.LeavePolicies.AsNoTracking().CountAsync(l => l.SchoolId == schoolId && l.IsActive);
            var salaryCompCount = await _context.SalaryComponents.AsNoTracking().CountAsync(c => c.SchoolId == schoolId && c.IsActive);
            var workSchedule = await _context.WorkSchedules.AsNoTracking().FirstOrDefaultAsync(w => w.SchoolId == schoolId && w.IsActive);

            var pfConfig = await _context.StatutoryConfigurations.AsNoTracking().FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.StatutoryType == "PF" && c.EffectiveTo == null);
            var esiConfig = await _context.StatutoryConfigurations.AsNoTracking().FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.StatutoryType == "ESI" && c.EffectiveTo == null);
            var ptConfig = await _context.StatutoryConfigurations.AsNoTracking().FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.StatutoryType == "PT" && c.EffectiveTo == null);
            var tdsConfig = await _context.StatutoryConfigurations.AsNoTracking().FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.StatutoryType == "TDS" && c.EffectiveTo == null);

            // Calculate Configuration Warnings
            var warnings = new List<string>();
            if (deptsCount == 0) warnings.Add("No Departments configured for this school.");
            if (desigsCount == 0) warnings.Add("No Designations configured for this school.");
            if (workSchedule == null) warnings.Add("Work Schedule and Shift Timings are not configured.");
            if (leavePoliciesCount == 0) warnings.Add("Leave types and annual quotas are missing.");
            if (salaryCompCount == 0) warnings.Add("Salary Components (Basic, HRA, etc.) are missing.");

            return Ok(new
            {
                school = new { school.Id, school.Name, school.SchoolCode, school.HasAccountModule },
                metrics = new
                {
                    totalEmployees,
                    activeEmployees,
                    departments = deptsCount,
                    designations = desigsCount,
                    leavePolicies = leavePoliciesCount,
                    salaryComponents = salaryCompCount,
                    hasWorkSchedule = workSchedule != null,
                    isPfEnabled = pfConfig?.IsEnabled ?? false,
                    isEsiEnabled = esiConfig?.IsEnabled ?? false,
                    isPtEnabled = ptConfig?.IsEnabled ?? false,
                    isTdsEnabled = tdsConfig?.IsEnabled ?? false
                },
                warnings
            });
        }

        // ==========================================
        // 2. Departments & Designations Masters
        // ==========================================
        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments(Guid schoolId)
        {
            var list = await _context.Departments
                .AsNoTracking()
                .Where(d => d.SchoolId == schoolId)
                .OrderBy(d => d.Name)
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost("departments")]
        public async Task<IActionResult> CreateDepartment(Guid schoolId, [FromBody] DepartmentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { error = "Department name is required" });

            var exists = await _context.Departments.AnyAsync(d => d.SchoolId == schoolId && d.Name.ToLower() == dto.Name.Trim().ToLower());
            if (exists) return BadRequest(new { error = "Department with this name already exists in this school." });

            var dept = new Department
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Name = dto.Name.Trim()
            };

            await _context.Departments.AddAsync(dept);
            await _context.SaveChangesAsync();
            return Ok(dept);
        }

        [HttpDelete("departments/{id}")]
        public async Task<IActionResult> DeleteDepartment(Guid schoolId, Guid id)
        {
            var dept = await _context.Departments.FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId);
            if (dept == null) return NotFound();

            _context.Departments.Remove(dept);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("designations")]
        public async Task<IActionResult> GetDesignations(Guid schoolId)
        {
            var list = await _context.Designations
                .AsNoTracking()
                .Where(d => d.SchoolId == schoolId)
                .OrderBy(d => d.Name)
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost("designations")]
        public async Task<IActionResult> CreateDesignation(Guid schoolId, [FromBody] DesignationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest(new { error = "Designation name is required" });

            var desig = new Designation
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                DepartmentId = dto.DepartmentId,
                Name = dto.Name.Trim(),
                Code = string.IsNullOrWhiteSpace(dto.Code) ? dto.Name.ToUpper().Replace(" ", "_") : dto.Code.Trim(),
                Description = dto.Description ?? "",
                IsActive = true
            };

            await _context.Designations.AddAsync(desig);
            await _context.SaveChangesAsync();
            return Ok(desig);
        }

        [HttpDelete("designations/{id}")]
        public async Task<IActionResult> DeleteDesignation(Guid schoolId, Guid id)
        {
            var desig = await _context.Designations.FirstOrDefaultAsync(d => d.Id == id && d.SchoolId == schoolId);
            if (desig == null) return NotFound();

            _context.Designations.Remove(desig);
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ==========================================
        // 3. Work Schedule & Shift Settings
        // ==========================================
        [HttpGet("work-schedule")]
        public async Task<IActionResult> GetWorkSchedule(Guid schoolId)
        {
            var schedule = await _context.WorkSchedules
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.SchoolId == schoolId && w.IsActive);

            if (schedule == null)
            {
                // Return default recommended configuration
                return Ok(new WorkSchedule
                {
                    SchoolId = schoolId,
                    ShiftName = "Standard Morning Shift",
                    StartTime = "08:00",
                    EndTime = "14:30",
                    GraceMinutes = 15,
                    LateCountThresholdForHalfDay = 3,
                    HalfDayMinutesThreshold = 240,
                    WorkingDaysMask = "1111100",
                    SaturdayRule = "FullWorking",
                    IsOvertimeEnabled = false
                });
            }

            return Ok(schedule);
        }

        [HttpPut("work-schedule")]
        public async Task<IActionResult> SaveWorkSchedule(Guid schoolId, [FromBody] WorkScheduleDto dto)
        {
            var existing = await _context.WorkSchedules
                .FirstOrDefaultAsync(w => w.SchoolId == schoolId && w.IsActive);

            if (existing != null)
            {
                existing.ShiftName = dto.ShiftName;
                existing.StartTime = dto.StartTime;
                existing.EndTime = dto.EndTime;
                existing.GraceMinutes = dto.GraceMinutes;
                existing.LateCountThresholdForHalfDay = dto.LateCountThresholdForHalfDay;
                existing.HalfDayMinutesThreshold = dto.HalfDayMinutesThreshold;
                existing.WorkingDaysMask = dto.WorkingDaysMask;
                existing.SaturdayRule = dto.SaturdayRule;
                existing.IsOvertimeEnabled = dto.IsOvertimeEnabled;
                existing.OvertimeRateMultiplier = dto.OvertimeRateMultiplier;
                _context.WorkSchedules.Update(existing);
            }
            else
            {
                var newSchedule = new WorkSchedule
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    ShiftName = dto.ShiftName,
                    StartTime = dto.StartTime,
                    EndTime = dto.EndTime,
                    GraceMinutes = dto.GraceMinutes,
                    LateCountThresholdForHalfDay = dto.LateCountThresholdForHalfDay,
                    HalfDayMinutesThreshold = dto.HalfDayMinutesThreshold,
                    WorkingDaysMask = dto.WorkingDaysMask,
                    SaturdayRule = dto.SaturdayRule,
                    IsOvertimeEnabled = dto.IsOvertimeEnabled,
                    OvertimeRateMultiplier = dto.OvertimeRateMultiplier,
                    EffectiveFrom = DateTime.UtcNow,
                    IsActive = true
                };
                await _context.WorkSchedules.AddAsync(newSchedule);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        // ==========================================
        // 4. Leave Policies (Configurable Leave Types)
        // ==========================================
        [HttpGet("leave-policies")]
        public async Task<IActionResult> GetLeavePolicies(Guid schoolId)
        {
            var list = await _context.LeavePolicies
                .AsNoTracking()
                .Where(l => l.SchoolId == schoolId && l.IsActive)
                .OrderBy(l => l.LeaveTypeCode)
                .ToListAsync();

            return Ok(list);
        }

        [HttpPost("leave-policies")]
        public async Task<IActionResult> SaveLeavePolicy(Guid schoolId, [FromBody] LeavePolicyDto dto)
        {
            var existing = await _context.LeavePolicies
                .FirstOrDefaultAsync(l => l.SchoolId == schoolId && l.LeaveTypeCode == dto.LeaveTypeCode && l.IsActive);

            if (existing != null)
            {
                existing.LeaveTypeName = dto.LeaveTypeName;
                existing.AnnualAllotment = dto.AnnualAllotment;
                existing.CarryForwardAllowed = dto.CarryForwardAllowed;
                existing.MaxCarryForwardDays = dto.MaxCarryForwardDays;
                existing.EncashmentAllowed = dto.EncashmentAllowed;
                existing.IsPaid = dto.IsPaid;
                existing.RequiresAttachment = dto.RequiresAttachment;
                existing.ApprovalSequenceJson = dto.ApprovalSequenceJson ?? "[\"ReportingManager\", \"Principal\"]";
                _context.LeavePolicies.Update(existing);
            }
            else
            {
                var policy = new LeavePolicy
                {
                    Id = Guid.NewGuid(),
                    SchoolId = schoolId,
                    LeaveTypeCode = dto.LeaveTypeCode.ToUpper().Trim(),
                    LeaveTypeName = dto.LeaveTypeName.Trim(),
                    AnnualAllotment = dto.AnnualAllotment,
                    CarryForwardAllowed = dto.CarryForwardAllowed,
                    MaxCarryForwardDays = dto.MaxCarryForwardDays,
                    EncashmentAllowed = dto.EncashmentAllowed,
                    IsPaid = dto.IsPaid,
                    RequiresAttachment = dto.RequiresAttachment,
                    ApprovalSequenceJson = dto.ApprovalSequenceJson ?? "[\"ReportingManager\", \"Principal\"]",
                    EffectiveFrom = DateTime.UtcNow,
                    IsActive = true
                };
                await _context.LeavePolicies.AddAsync(policy);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("leave-policies/{id}")]
        public async Task<IActionResult> DeleteLeavePolicy(Guid schoolId, Guid id)
        {
            var policy = await _context.LeavePolicies.FirstOrDefaultAsync(l => l.Id == id && l.SchoolId == schoolId);
            if (policy == null) return NotFound();

            policy.IsActive = false;
            policy.EffectiveTo = DateTime.UtcNow;
            _context.LeavePolicies.Update(policy);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // ==========================================
        // 5. Salary Components Master
        // ==========================================
        [HttpGet("salary-components")]
        public async Task<IActionResult> GetSalaryComponents(Guid schoolId)
        {
            var list = await _context.SalaryComponents
                .AsNoTracking()
                .Where(c => c.SchoolId == schoolId && c.IsActive)
                .OrderBy(c => c.Type)
                .ThenBy(c => c.Code)
                .ToListAsync();

            return Ok(list);
        }

        [HttpPost("salary-components")]
        public async Task<IActionResult> SaveSalaryComponent(Guid schoolId, [FromBody] SalaryComponentDto dto)
        {
            var comp = new SalaryComponent
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Code = dto.Code.ToUpper().Trim(),
                Name = dto.Name.Trim(),
                Type = dto.Type, // Earning, Deduction, EmployerContribution
                CalculationType = dto.CalculationType, // Fixed, PercentageOfBasic, PercentageOfGross, Formula
                DefaultValue = dto.DefaultValue,
                FormulaExpression = dto.FormulaExpression ?? "",
                IsTaxable = dto.IsTaxable,
                IsPfApplicable = dto.IsPfApplicable,
                IsEsiApplicable = dto.IsEsiApplicable,
                IsPtApplicable = dto.IsPtApplicable,
                IsTdsApplicable = dto.IsTdsApplicable,
                IsStatutory = dto.IsStatutory,
                EffectiveFrom = DateTime.UtcNow,
                IsActive = true
            };

            await _context.SalaryComponents.AddAsync(comp);
            await _context.SaveChangesAsync();
            return Ok(comp);
        }

        [HttpDelete("salary-components/{id}")]
        public async Task<IActionResult> DeleteSalaryComponent(Guid schoolId, Guid id)
        {
            var comp = await _context.SalaryComponents.FirstOrDefaultAsync(c => c.Id == id && c.SchoolId == schoolId);
            if (comp == null) return NotFound();

            comp.IsActive = false;
            comp.EffectiveTo = DateTime.UtcNow;
            _context.SalaryComponents.Update(comp);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // ==========================================
        // 6. Versioned Statutory Configurations (PF / ESI / PT / TDS)
        // ==========================================
        [HttpGet("statutory/{type}")]
        public async Task<IActionResult> GetStatutoryConfig(Guid schoolId, string type)
        {
            var active = await _context.StatutoryConfigurations
                .AsNoTracking()
                .Where(s => s.SchoolId == schoolId && s.StatutoryType == type.ToUpper() && s.EffectiveTo == null)
                .OrderByDescending(s => s.VersionNumber)
                .FirstOrDefaultAsync();

            if (active == null)
            {
                // Return recommended defaults for instant display
                string defaultJson = type.ToUpper() switch
                {
                    "PF" => JsonSerializer.Serialize(new { employeeRate = 12.0, employerRate = 12.0, wageCeiling = 15000 }),
                    "ESI" => JsonSerializer.Serialize(new { employeeRate = 0.75, employerRate = 3.25, wageThreshold = 21000 }),
                    "PT" => JsonSerializer.Serialize(new
                    {
                        state = "Maharashtra",
                        slabs = new[]
                        {
                            new { min = 0, max = 7500, amount = 0 },
                            new { min = 7501, max = 10000, amount = 175 },
                            new { min = 10001, max = 999999, amount = 200 }
                        }
                    }),
                    "TDS" => JsonSerializer.Serialize(new { financialYear = "2026-2027", mode = "NewTaxRegime" }),
                    _ => "{}"
                };

                return Ok(new
                {
                    statutoryType = type.ToUpper(),
                    isEnabled = false,
                    configurationJson = defaultJson,
                    versionNumber = 1
                });
            }

            return Ok(active);
        }

        [HttpPost("statutory/{type}")]
        public async Task<IActionResult> SaveStatutoryConfig(Guid schoolId, string type, [FromBody] StatutorySaveDto dto)
        {
            var statutoryType = type.ToUpper();
            var now = DateTime.UtcNow;

            // Close existing active version
            var existingActive = await _context.StatutoryConfigurations
                .Where(s => s.SchoolId == schoolId && s.StatutoryType == statutoryType && s.EffectiveTo == null)
                .ToListAsync();

            int nextVersion = 1;
            foreach (var active in existingActive)
            {
                active.EffectiveTo = now;
                nextVersion = Math.Max(nextVersion, active.VersionNumber + 1);
            }

            var newConfig = new StatutoryConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StatutoryType = statutoryType,
                IsEnabled = dto.IsEnabled,
                ConfigurationJson = dto.ConfigurationJson,
                VersionNumber = nextVersion,
                Remarks = dto.Remarks ?? $"Updated by Super Admin on {now:yyyy-MM-dd HH:mm}",
                EffectiveFrom = now,
                CreatedAt = now
            };

            await _context.StatutoryConfigurations.AddAsync(newConfig);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, version = nextVersion, newConfig });
        }

        // ==========================================
        // 7. Safe Calculation Preview (Zero DB Writes)
        // ==========================================
        [HttpPost("preview-calculation")]
        public async Task<IActionResult> PreviewCalculation(Guid schoolId, [FromBody] PreviewCalculationRequest request)
        {
            var gross = request.GrossSalary > 0 ? request.GrossSalary : 45000m;
            var workingDays = request.TotalWorkingDays > 0 ? request.TotalWorkingDays : 30;
            var presentDays = request.PresentDays >= 0 ? request.PresentDays : 28m;
            var lwpDays = request.LwpDays >= 0 ? request.LwpDays : 2m;

            var calcResult = await _calculationService.CalculateAsync(new Services.CalculationInput
            {
                SchoolId = schoolId,
                BaseGrossSalary = gross,
                TotalWorkingDays = workingDays,
                PresentDays = presentDays,
                LwpDays = lwpDays,
                PfApplicable = true,
                EsiApplicable = true,
                PtApplicable = true,
                TargetPeriodDate = DateTime.UtcNow
            });

            return Ok(new
            {
                mode = "PREVIEW_SIMULATION (Zero database writes - Unified Calculation Engine)",
                inputs = new { gross, workingDays, presentDays, lwpDays },
                computedEarnings = new
                {
                    baseGross = calcResult.BaseGross,
                    earnedGross = calcResult.EarnedGross,
                    basicPay = calcResult.BasicEarned,
                    hra = calcResult.Earnings.FirstOrDefault(e => e.Code == "HRA")?.Amount ?? 0,
                    specialAllowance = calcResult.Earnings.FirstOrDefault(e => e.Code == "SPECIAL_ALW")?.Amount ?? 0
                },
                computedDeductions = new
                {
                    lwpDeduction = calcResult.LwpDeduction,
                    pfEmployee = calcResult.PfEmployee,
                    esiEmployee = calcResult.EsiEmployee,
                    professionalTax = calcResult.ProfessionalTax,
                    totalDeductions = calcResult.StatutoryDeductions + calcResult.LwpDeduction
                },
                netSalary = calcResult.NetSalary,
                statutoryTrace = calcResult.StatutoryVersionTraceJson
            });
        }
    }

    // --- DTOs ---

    public class DepartmentDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class DesignationDto
    {
        public Guid? DepartmentId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Code { get; set; }
        public string? Description { get; set; }
    }

    public class WorkScheduleDto
    {
        public string ShiftName { get; set; } = "General Shift";
        public string StartTime { get; set; } = "08:00";
        public string EndTime { get; set; } = "14:30";
        public int GraceMinutes { get; set; } = 15;
        public int LateCountThresholdForHalfDay { get; set; } = 3;
        public int HalfDayMinutesThreshold { get; set; } = 240;
        public string WorkingDaysMask { get; set; } = "1111100";
        public string SaturdayRule { get; set; } = "FullWorking";
        public bool IsOvertimeEnabled { get; set; } = false;
        public decimal OvertimeRateMultiplier { get; set; } = 1.0m;
    }

    public class LeavePolicyDto
    {
        public string LeaveTypeCode { get; set; } = "CL";
        public string LeaveTypeName { get; set; } = "Casual Leave";
        public decimal AnnualAllotment { get; set; } = 12.0m;
        public bool CarryForwardAllowed { get; set; } = false;
        public decimal MaxCarryForwardDays { get; set; } = 0m;
        public bool EncashmentAllowed { get; set; } = false;
        public bool IsPaid { get; set; } = true;
        public bool RequiresAttachment { get; set; } = false;
        public string? ApprovalSequenceJson { get; set; }
    }

    public class SalaryComponentDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Type { get; set; } = "Earning";
        public string CalculationType { get; set; } = "Fixed";
        public decimal DefaultValue { get; set; }
        public string? FormulaExpression { get; set; }
        public bool IsTaxable { get; set; } = true;
        public bool IsPfApplicable { get; set; } = true;
        public bool IsEsiApplicable { get; set; } = true;
        public bool IsPtApplicable { get; set; } = true;
        public bool IsTdsApplicable { get; set; } = false;
        public bool IsStatutory { get; set; } = false;
    }

    public class StatutorySaveDto
    {
        public bool IsEnabled { get; set; } = true;
        public string ConfigurationJson { get; set; } = "{}";
        public string? Remarks { get; set; }
    }

    public class PreviewCalculationRequest
    {
        public decimal GrossSalary { get; set; } = 45000;
        public int TotalWorkingDays { get; set; } = 30;
        public decimal PresentDays { get; set; } = 28;
        public decimal LwpDays { get; set; } = 2;
    }
}
