using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using EduVault.Api.Controllers;
using EduVault.Api.Services;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;
using EduVault.Infrastructure.Repositories;

namespace EduVault.Tests
{
    public class HrmEngineTests
    {
        private readonly EduVaultDbContext _context;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPayrollCalculationService _calcService;
        private readonly Guid _schoolA = Guid.NewGuid();
        private readonly Guid _schoolB = Guid.NewGuid();

        public HrmEngineTests()
        {
            var options = new DbContextOptionsBuilder<EduVaultDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            _context = new EduVaultDbContext(options);
            _unitOfWork = new UnitOfWork(_context);
            _calcService = new PayrollCalculationService(_context);
        }

        private async Task<SalaryStructure> SetupDefaultStructure(Guid schoolId)
        {
            var basicComp = new SalaryComponent
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Code = "BASIC",
                Name = "Basic Pay",
                Type = "Earning",
                CalculationType = "Percentage",
                DefaultValue = 50,
                IsActive = true
            };
            var hraComp = new SalaryComponent
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Code = "HRA",
                Name = "House Rent Allowance",
                Type = "Earning",
                CalculationType = "Percentage",
                DefaultValue = 30,
                IsActive = true
            };
            var specialComp = new SalaryComponent
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                Code = "SPECIAL",
                Name = "Special Allowance",
                Type = "Earning",
                CalculationType = "Percentage",
                DefaultValue = 20,
                IsActive = true
            };

            await _context.SalaryComponents.AddRangeAsync(basicComp, hraComp, specialComp);

            var structure = new SalaryStructure
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                StructureName = "Standard Teaching Staff Structure",
                IsActive = true,
                Components = new List<SalaryStructureComponent>
                {
                    new SalaryStructureComponent { Id = Guid.NewGuid(), SalaryComponentId = basicComp.Id, SalaryComponent = basicComp, Percentage = 50 },
                    new SalaryStructureComponent { Id = Guid.NewGuid(), SalaryComponentId = hraComp.Id, SalaryComponent = hraComp, Percentage = 30 },
                    new SalaryStructureComponent { Id = Guid.NewGuid(), SalaryComponentId = specialComp.Id, SalaryComponent = specialComp, Percentage = 20 }
                }
            };

            await _context.SalaryStructures.AddAsync(structure);
            await _context.SaveChangesAsync();
            return structure;
        }

        // ==========================================
        // 1. Multi-Tenant Isolation
        // ==========================================
        [Fact]
        public async Task MultiTenant_Isolation_SchoolA_Employees_Hidden_From_SchoolB()
        {
            var empA = new Employee { Id = Guid.NewGuid(), SchoolId = _schoolA, FirstName = "Rohan", LastName = "Verma", EmployeeCode = "EMP-A-001" };
            var empB = new Employee { Id = Guid.NewGuid(), SchoolId = _schoolB, FirstName = "Priya", LastName = "Nair", EmployeeCode = "EMP-B-001" };
            await _context.Employees.AddRangeAsync(empA, empB);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            var result = await controller.GetEmployees(null, null, null, null, 1, 50);

            var okResult = Assert.IsType<OkObjectResult>(result);
            var json = JsonSerializer.Serialize(okResult.Value);
            Assert.Contains("Rohan", json);
            Assert.DoesNotContain("Priya", json);
        }

        // ==========================================
        // 2. Missing Salary Structure Blocks Payroll (NO Silent 50/30/20 Fallback)
        // ==========================================
        [Fact]
        public async Task Missing_SalaryStructure_Throws_Configuration_Error()
        {
            // Calculation with NO SalaryStructure configured for school
            var input = new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 50000m,
                TotalWorkingDays = 30,
                PresentDays = 30m
            };

            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _calcService.CalculateAsync(input));
            Assert.Contains("No active salary structure or salary components configured", ex.Message);
        }

        // ==========================================
        // 3. Attendance -> LWP -> Payroll Flow
        // ==========================================
        [Fact]
        public async Task Attendance_To_Lwp_To_Payroll_Deduction()
        {
            await SetupDefaultStructure(_schoolA);

            var input = new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 60000m,
                TotalWorkingDays = 30,
                PresentDays = 25m,
                HalfDays = 1m,
                LwpDays = 4.5m,
                PfApplicable = false,
                EsiApplicable = false,
                PtApplicable = false
            };

            var calc = await _calcService.CalculateAsync(input);

            Assert.Equal(9000m, calc.LwpDeduction);
            Assert.Equal(51000m, calc.EarnedGross);
            Assert.Equal(51000m, calc.NetSalary);
        }

        // ==========================================
        // 4. Leave Approval -> LWP -> Payroll
        // ==========================================
        [Fact]
        public async Task Leave_Approval_To_Lwp_To_Payroll_Deduction()
        {
            await SetupDefaultStructure(_schoolA);

            var input = new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 30000m,
                TotalWorkingDays = 30,
                PresentDays = 25m,
                PaidLeaveDays = 3m,
                LwpDays = 2m,
                PfApplicable = false,
                EsiApplicable = false,
                PtApplicable = false
            };

            var calc = await _calcService.CalculateAsync(input);

            Assert.Equal(2000m, calc.LwpDeduction);
            Assert.Equal(28000m, calc.EarnedGross);
            Assert.Equal(28000m, calc.NetSalary);
        }

        // ==========================================
        // 5. Statutory PF: Enabled vs Disabled & Eligibility
        // ==========================================
        [Fact]
        public async Task Statutory_PF_Config_Enabled_Disabled_And_Employee_Eligibility()
        {
            await SetupDefaultStructure(_schoolA);

            var pfConfig = new StatutoryConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                StatutoryType = "PF",
                IsEnabled = true,
                ConfigurationJson = JsonSerializer.Serialize(new { employeeRate = 12.0, wageCeiling = 15000.0 }),
                VersionNumber = 1,
                EffectiveFrom = DateTime.UtcNow.AddMonths(-1)
            };
            await _context.StatutoryConfigurations.AddAsync(pfConfig);
            await _context.SaveChangesAsync();

            var calcEligible = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 40000m,
                TotalWorkingDays = 30,
                PresentDays = 30m,
                PfApplicable = true,
                EsiApplicable = false,
                PtApplicable = false
            });
            Assert.Equal(1800m, calcEligible.PfEmployee);

            var calcExempt = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 40000m,
                TotalWorkingDays = 30,
                PresentDays = 30m,
                PfApplicable = false,
                EsiApplicable = false,
                PtApplicable = false
            });
            Assert.Equal(0m, calcExempt.PfEmployee);
        }

        // ==========================================
        // 6. Statutory ESI: Wage Threshold Enforcement
        // ==========================================
        [Fact]
        public async Task Statutory_ESI_Wage_Threshold_Rule()
        {
            await SetupDefaultStructure(_schoolA);

            var esiConfig = new StatutoryConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                StatutoryType = "ESI",
                IsEnabled = true,
                ConfigurationJson = JsonSerializer.Serialize(new { employeeRate = 0.75, wageThreshold = 21000.0 }),
                VersionNumber = 1,
                EffectiveFrom = DateTime.UtcNow.AddMonths(-1)
            };
            await _context.StatutoryConfigurations.AddAsync(esiConfig);
            await _context.SaveChangesAsync();

            var calcBelow = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 20000m,
                TotalWorkingDays = 30,
                PresentDays = 30m,
                PfApplicable = false,
                EsiApplicable = true,
                PtApplicable = false
            });
            Assert.Equal(150m, calcBelow.EsiEmployee);

            var calcAbove = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 25000m,
                TotalWorkingDays = 30,
                PresentDays = 30m,
                PfApplicable = false,
                EsiApplicable = true,
                PtApplicable = false
            });
            Assert.Equal(0m, calcAbove.EsiEmployee);
        }

        // ==========================================
        // 7. Statutory PT: Data-Driven Slabs (NO Hardcoded State Strings)
        // ==========================================
        [Fact]
        public async Task Statutory_PT_Data_Driven_Slabs()
        {
            await SetupDefaultStructure(_schoolA);

            // School A: 3-tier slab configuration in JSON
            var ptSlabsJson = JsonSerializer.Serialize(new
            {
                state = "Maharashtra",
                slabs = new[]
                {
                    new { min = 0.0, max = 7500.0, amount = 0.0 },
                    new { min = 7501.0, max = 10000.0, amount = 175.0 },
                    new { min = 10001.0, max = 999999.0, amount = 200.0 }
                }
            });

            var ptConfig = new StatutoryConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                StatutoryType = "PT",
                IsEnabled = true,
                ConfigurationJson = ptSlabsJson,
                VersionNumber = 1,
                EffectiveFrom = DateTime.UtcNow.AddMonths(-1)
            };
            await _context.StatutoryConfigurations.AddAsync(ptConfig);
            await _context.SaveChangesAsync();

            // Gross = 9,000 -> falls in tier 2 (175)
            var calcTier2 = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 9000m,
                PtApplicable = true,
                PfApplicable = false,
                EsiApplicable = false
            });
            Assert.Equal(175m, calcTier2.ProfessionalTax);

            // Gross = 35,000 -> falls in tier 3 (200)
            var calcTier3 = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 35000m,
                PtApplicable = true,
                PfApplicable = false,
                EsiApplicable = false
            });
            Assert.Equal(200m, calcTier3.ProfessionalTax);
        }

        // ==========================================
        // 8. Idempotent Attendance Synchronization Test
        // ==========================================
        [Fact]
        public async Task Attendance_Sync_Is_Idempotent_Same_Punch_Synced_Twice()
        {
            var emp = new Employee { Id = Guid.NewGuid(), SchoolId = _schoolA, FirstName = "Sanjay", LastName = "Kumar", EmployeeCode = "EMP-A-005" };
            await _context.Employees.AddAsync(emp);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            var syncBatch = new AttendanceSyncBatchDto
            {
                Records = new List<AttendanceSyncItemDto>
                {
                    new AttendanceSyncItemDto
                    {
                        EmployeeId = emp.Id,
                        EmployeeCode = emp.EmployeeCode,
                        SourceRecordId = "MONGO_PUNCH_101",
                        PunchDate = DateTime.UtcNow.Date,
                        CheckInTime = DateTime.UtcNow,
                        Status = "Present"
                    }
                }
            };

            // Act 1: First sync -> Created
            var res1 = await controller.SyncAttendanceBatch(syncBatch);
            var ok1 = Assert.IsType<OkObjectResult>(res1);

            // Act 2: Sync again with same punch -> Duplicates Ignored
            var res2 = await controller.SyncAttendanceBatch(syncBatch);
            var ok2 = Assert.IsType<OkObjectResult>(res2);

            // Assert: Exactly 1 record exists in DB
            var totalRecords = await _context.AttendanceSyncRecords.CountAsync(a => a.SchoolId == _schoolA && a.EmployeeId == emp.Id);
            Assert.Equal(1, totalRecords);
        }

        // ==========================================
        // 9. Statutory Versioning & Immutability
        // ==========================================
        [Fact]
        public async Task Statutory_Versioning_Prevents_Historical_Payroll_Corruption()
        {
            await SetupDefaultStructure(_schoolA);

            var v1Date = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc);
            var v2Date = new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc);

            var pfV1 = new StatutoryConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                StatutoryType = "PF",
                IsEnabled = true,
                ConfigurationJson = JsonSerializer.Serialize(new { employeeRate = 12.0, wageCeiling = 15000.0 }),
                VersionNumber = 1,
                EffectiveFrom = v1Date,
                EffectiveTo = v2Date.AddSeconds(-1)
            };
            var pfV2 = new StatutoryConfiguration
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                StatutoryType = "PF",
                IsEnabled = true,
                ConfigurationJson = JsonSerializer.Serialize(new { employeeRate = 10.0, wageCeiling = 15000.0 }),
                VersionNumber = 2,
                EffectiveFrom = v2Date,
                EffectiveTo = null
            };
            await _context.StatutoryConfigurations.AddRangeAsync(pfV1, pfV2);
            await _context.SaveChangesAsync();

            var calcApril = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 30000m,
                TotalWorkingDays = 30,
                PresentDays = 30m,
                PfApplicable = true,
                TargetPeriodDate = new DateTime(2026, 4, 15, 0, 0, 0, DateTimeKind.Utc)
            });

            var calcOct = await _calcService.CalculateAsync(new CalculationInput
            {
                SchoolId = _schoolA,
                BaseGrossSalary = 30000m,
                TotalWorkingDays = 30,
                PresentDays = 30m,
                PfApplicable = true,
                TargetPeriodDate = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc)
            });

            Assert.Equal(1800m, calcApril.PfEmployee);
            Assert.Equal(1500m, calcOct.PfEmployee);
        }

        // ==========================================
        // 10. Finalized Payroll Immutability
        // ==========================================
        [Fact]
        public async Task Finalized_Payroll_Cannot_Be_Mutated_Or_Recalculated()
        {
            await SetupDefaultStructure(_schoolA);

            var emp = new Employee { Id = Guid.NewGuid(), SchoolId = _schoolA, FirstName = "Anita", LastName = "Roy", EmployeeCode = "EMP-A-002", BaseGrossSalary = 50000 };
            await _context.Employees.AddAsync(emp);

            var payroll = new Payroll
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                PeriodMonth = 5,
                PeriodYear = 2026,
                Status = "Finalized",
                TotalNetPay = 45000
            };
            await _context.Payrolls.AddAsync(payroll);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("schoolId", _schoolA.ToString()) }, "mock"))
                }
            };

            var result = await controller.CalculateMonthlyPayroll(new CalculatePayrollRequest { Month = 5, Year = 2026 });

            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var json = JsonSerializer.Serialize(badRequest.Value);
            Assert.Contains("locked", json);
        }
    }
}
