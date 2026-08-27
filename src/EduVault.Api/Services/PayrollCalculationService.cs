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
    public class CalculationInput
    {
        public Guid SchoolId { get; set; }
        public Guid? EmployeeId { get; set; }
        public Guid? SalaryStructureId { get; set; }
        public decimal BaseGrossSalary { get; set; }
        public int TotalWorkingDays { get; set; } = 30;
        public decimal PresentDays { get; set; } = 30;
        public decimal HalfDays { get; set; } = 0;
        public decimal PaidLeaveDays { get; set; } = 0;
        public decimal LwpDays { get; set; } = 0;
        public bool PfApplicable { get; set; } = true;
        public bool EsiApplicable { get; set; } = true;
        public bool PtApplicable { get; set; } = true;
        public bool TdsApplicable { get; set; } = false;
        public decimal ManualAllowances { get; set; } = 0;
        public decimal ManualDeductions { get; set; } = 0;
        public decimal ManualTdsAmount { get; set; } = 0;
        public DateTime TargetPeriodDate { get; set; } = DateTime.UtcNow;
    }

    public class CalculationResult
    {
        public decimal BaseGross { get; set; }
        public decimal EarnedGross { get; set; }
        public decimal BasicEarned { get; set; }
        public decimal TotalAllowances { get; set; }
        public decimal StatutoryDeductions { get; set; }
        public decimal LwpDeduction { get; set; }
        public decimal ManualAllowances { get; set; }
        public decimal ManualDeductions { get; set; }
        public decimal NetSalary { get; set; }

        public decimal PfEmployee { get; set; }
        public decimal PfEmployer { get; set; }
        public decimal EsiEmployee { get; set; }
        public decimal EsiEmployer { get; set; }
        public decimal ProfessionalTax { get; set; }
        public decimal TdsDeduction { get; set; }

        public List<ItemizedComponent> Earnings { get; set; } = new();
        public List<ItemizedComponent> Deductions { get; set; } = new();
        public string StatutoryVersionTraceJson { get; set; } = "{}";
        public Guid? ResolvedStructureId { get; set; }
    }

    public class ItemizedComponent
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string CalculationType { get; set; } = "Fixed";
    }

    public interface IPayrollCalculationService
    {
        Task<CalculationResult> CalculateAsync(CalculationInput input);
    }

    public class PayrollCalculationService : IPayrollCalculationService
    {
        private readonly EduVaultDbContext _context;

        public PayrollCalculationService(EduVaultDbContext context)
        {
            _context = context;
        }

        public async Task<CalculationResult> CalculateAsync(CalculationInput input)
        {
            var result = new CalculationResult
            {
                BaseGross = input.BaseGrossSalary,
                ManualAllowances = input.ManualAllowances,
                ManualDeductions = input.ManualDeductions,
                TdsDeduction = input.ManualTdsAmount
            };

            int workingDays = input.TotalWorkingDays > 0 ? input.TotalWorkingDays : 30;
            decimal perDayRate = workingDays > 0 ? Math.Round(input.BaseGrossSalary / workingDays, 2) : 0;

            // 1. Calculate Attendance & LWP Impact
            result.LwpDeduction = Math.Round(input.LwpDays * perDayRate, 2);
            result.EarnedGross = Math.Max(0, input.BaseGrossSalary - result.LwpDeduction);

            // 2. Resolve Active Salary Structure (NO 50/30/20 hardcoded fallback!)
            SalaryStructure? structure = null;
            if (input.SalaryStructureId.HasValue)
            {
                structure = await _context.SalaryStructures
                    .Include(s => s.Components)
                    .ThenInclude(c => c.SalaryComponent)
                    .FirstOrDefaultAsync(s => s.Id == input.SalaryStructureId.Value && s.SchoolId == input.SchoolId);
            }
            else if (input.EmployeeId.HasValue)
            {
                var emp = await _context.Employees.AsNoTracking().FirstOrDefaultAsync(e => e.Id == input.EmployeeId.Value && e.SchoolId == input.SchoolId);
                if (emp?.SalaryStructureId != null)
                {
                    structure = await _context.SalaryStructures
                        .Include(s => s.Components)
                        .ThenInclude(c => c.SalaryComponent)
                        .FirstOrDefaultAsync(s => s.Id == emp.SalaryStructureId && s.SchoolId == input.SchoolId);
                }
            }

            // Fallback to School's active default Salary Structure if not assigned on employee
            if (structure == null)
            {
                structure = await _context.SalaryStructures
                    .Include(s => s.Components)
                    .ThenInclude(c => c.SalaryComponent)
                    .FirstOrDefaultAsync(s => s.SchoolId == input.SchoolId && s.IsActive);
            }

            if (structure == null || structure.Components == null || !structure.Components.Any())
            {
                throw new InvalidOperationException(
                    $"Payroll calculation blocked: No active salary structure or salary components configured for school {input.SchoolId}. Please configure a Salary Structure in HRM Settings before calculating payroll.");
            }

            result.ResolvedStructureId = structure.Id;

            // Compute Components Dynamically from Structure
            decimal totalEarnings = 0;
            foreach (var sc in structure.Components)
            {
                var comp = sc.SalaryComponent;
                if (comp == null || !comp.IsActive) continue;

                decimal amount = 0;
                if (sc.Percentage > 0 || comp.CalculationType.Contains("Percentage"))
                {
                    decimal pct = sc.Percentage > 0 ? sc.Percentage : comp.DefaultValue;
                    amount = Math.Round(result.EarnedGross * (pct / 100m), 2);
                }
                else
                {
                    amount = sc.Amount > 0 ? sc.Amount : comp.DefaultValue;
                }

                if (comp.Type == "Earning")
                {
                    result.Earnings.Add(new ItemizedComponent
                    {
                        Code = comp.Code,
                        Name = comp.Name,
                        Amount = amount,
                        CalculationType = sc.Percentage > 0 ? "Percentage" : "Fixed"
                    });
                    totalEarnings += amount;

                    if (comp.Code.Equals("BASIC", StringComparison.OrdinalIgnoreCase))
                    {
                        result.BasicEarned = amount;
                    }
                }
                else if (comp.Type == "Deduction")
                {
                    result.Deductions.Add(new ItemizedComponent
                    {
                        Code = comp.Code,
                        Name = comp.Name,
                        Amount = amount,
                        CalculationType = sc.Percentage > 0 ? "Percentage" : "Fixed"
                    });
                }
            }

            if (result.BasicEarned == 0 && totalEarnings > 0)
            {
                // If BASIC is not explicitly coded, first earning serves as basic base
                result.BasicEarned = result.Earnings.FirstOrDefault()?.Amount ?? result.EarnedGross;
            }

            result.TotalAllowances = totalEarnings - result.BasicEarned + input.ManualAllowances;

            // 3. Resolve School Active Statutory Configurations (Strict Configuration - NO Hidden Fallbacks)
            var targetDate = input.TargetPeriodDate;
            var statutoryConfigs = await _context.StatutoryConfigurations
                .AsNoTracking()
                .Where(s => s.SchoolId == input.SchoolId && s.EffectiveFrom <= targetDate && (s.EffectiveTo == null || s.EffectiveTo >= targetDate))
                .ToListAsync();

            var pfConfig = statutoryConfigs.FirstOrDefault(s => s.StatutoryType == "PF" && s.IsEnabled);
            var esiConfig = statutoryConfigs.FirstOrDefault(s => s.StatutoryType == "ESI" && s.IsEnabled);
            var ptConfig = statutoryConfigs.FirstOrDefault(s => s.StatutoryType == "PT" && s.IsEnabled);

            var versionTrace = new Dictionary<string, object>();

            // 4. Evaluate PF (Configuration-Driven)
            if (input.PfApplicable && pfConfig != null)
            {
                decimal employeeRate = 0;
                decimal employerRate = 0;
                decimal wageCeiling = 0;

                try
                {
                    var doc = JsonDocument.Parse(pfConfig.ConfigurationJson);
                    if (doc.RootElement.TryGetProperty("employeeRate", out var er)) employeeRate = er.GetDecimal();
                    if (doc.RootElement.TryGetProperty("employerRate", out var emr)) employerRate = emr.GetDecimal();
                    if (doc.RootElement.TryGetProperty("wageCeiling", out var wc)) wageCeiling = wc.GetDecimal();
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException($"Invalid PF configuration JSON in School {input.SchoolId}: {ex.Message}");
                }

                if (employeeRate > 0)
                {
                    decimal pfBase = wageCeiling > 0 ? Math.Min(result.BasicEarned, wageCeiling) : result.BasicEarned;
                    result.PfEmployee = Math.Round(pfBase * (employeeRate / 100m), 2);
                    result.PfEmployer = employerRate > 0 ? Math.Round(pfBase * (employerRate / 100m), 2) : result.PfEmployee;

                    result.Deductions.Add(new ItemizedComponent
                    {
                        Code = "PF_EE",
                        Name = $"Employee PF ({employeeRate}%)",
                        Amount = result.PfEmployee,
                        CalculationType = "Statutory Configuration"
                    });

                    versionTrace["PF"] = new { version = pfConfig.VersionNumber, rate = employeeRate, cap = wageCeiling };
                }
            }

            // 5. Evaluate ESI (Configuration-Driven)
            if (input.EsiApplicable && esiConfig != null)
            {
                decimal employeeRate = 0;
                decimal wageThreshold = 0;

                try
                {
                    var doc = JsonDocument.Parse(esiConfig.ConfigurationJson);
                    if (doc.RootElement.TryGetProperty("employeeRate", out var er)) employeeRate = er.GetDecimal();
                    if (doc.RootElement.TryGetProperty("wageThreshold", out var wt)) wageThreshold = wt.GetDecimal();
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException($"Invalid ESI configuration JSON in School {input.SchoolId}: {ex.Message}");
                }

                if (employeeRate > 0 && (wageThreshold == 0 || result.EarnedGross <= wageThreshold))
                {
                    result.EsiEmployee = Math.Round(result.EarnedGross * (employeeRate / 100m), 2);
                    result.EsiEmployer = Math.Round(result.EarnedGross * 0.0325m, 2);

                    result.Deductions.Add(new ItemizedComponent
                    {
                        Code = "ESI_EE",
                        Name = $"Employee ESI ({employeeRate}%)",
                        Amount = result.EsiEmployee,
                        CalculationType = "Statutory Configuration"
                    });

                    versionTrace["ESI"] = new { version = esiConfig.VersionNumber, rate = employeeRate, threshold = wageThreshold };
                }
            }

            // 6. Evaluate Professional Tax (Data-Driven Slabs - NO Hardcoded State If/Else!)
            if (input.PtApplicable && ptConfig != null)
            {
                decimal ptAmount = 0;
                string stateName = "Custom";

                try
                {
                    var doc = JsonDocument.Parse(ptConfig.ConfigurationJson);
                    if (doc.RootElement.TryGetProperty("state", out var st)) stateName = st.GetString() ?? "Custom";

                    // Slabs evaluated purely from JSON configuration
                    if (doc.RootElement.TryGetProperty("slabs", out var slabsElement) && slabsElement.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var slab in slabsElement.EnumerateArray())
                        {
                            decimal min = slab.TryGetProperty("min", out var minEl) ? minEl.GetDecimal() : 0;
                            decimal max = slab.TryGetProperty("max", out var maxEl) ? maxEl.GetDecimal() : decimal.MaxValue;
                            decimal amt = slab.TryGetProperty("amount", out var amtEl) ? amtEl.GetDecimal() : 0;

                            if (result.EarnedGross >= min && result.EarnedGross <= max)
                            {
                                ptAmount = amt;
                                break;
                            }
                        }
                    }
                    else if (doc.RootElement.TryGetProperty("defaultAmount", out var defAmt))
                    {
                        ptAmount = defAmt.GetDecimal();
                    }
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException($"Invalid PT configuration JSON in School {input.SchoolId}: {ex.Message}");
                }

                result.ProfessionalTax = ptAmount;
                if (ptAmount > 0)
                {
                    result.Deductions.Add(new ItemizedComponent
                    {
                        Code = "PT",
                        Name = $"Professional Tax ({stateName})",
                        Amount = result.ProfessionalTax,
                        CalculationType = "Configured Slab"
                    });
                }
                versionTrace["PT"] = new { version = ptConfig.VersionNumber, state = stateName, amount = ptAmount };
            }

            // 7. Total Deductions & Net Calculation
            result.StatutoryDeductions = result.PfEmployee + result.EsiEmployee + result.ProfessionalTax + result.TdsDeduction;
            decimal totalDeductions = result.StatutoryDeductions + input.ManualDeductions;
            result.NetSalary = Math.Max(0, result.EarnedGross + input.ManualAllowances - totalDeductions);
            result.StatutoryVersionTraceJson = JsonSerializer.Serialize(versionTrace);

            return result;
        }
    }
}
