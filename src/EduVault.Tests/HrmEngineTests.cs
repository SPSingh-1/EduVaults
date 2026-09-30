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
        private readonly ILeaveBalanceEngine _leaveEngine;
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
            _leaveEngine = new LeaveBalanceEngine(_context);
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

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
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

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
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

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
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

        // ==========================================
        // 11. Female-Only Leave: Male Employee Blocked
        // ==========================================
        [Fact]
        public async Task FemaleOnlyLeave_MaleEmployee_IsBlocked_AtValidationAndBalance()
        {
            var maleEmp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Rajesh",
                LastName = "Kumar",
                Gender = "Male",
                EmploymentStatus = "Confirmed",
                JoiningDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var matPolicy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "ML",
                LeaveTypeName = "Maternity Leave",
                GenderEligibility = "Female",
                AnnualAllotment = 90,
                AccrualFrequency = "None",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = DateTime.UtcNow.AddYears(-1)
            };
            await _context.Employees.AddAsync(maleEmp);
            await _context.LeavePolicies.AddAsync(matPolicy);
            await _context.SaveChangesAsync();

            // 1. Balance filtering must exclude Maternity Leave for Male
            var eligible = await _leaveEngine.GetEligiblePoliciesAsync(_schoolA, maleEmp);
            Assert.DoesNotContain(eligible, p => p.Id == matPolicy.Id);

            // 2. Direct Validation must reject Male employee application
            var (isValid, error) = await _leaveEngine.ValidateLeaveApplicationAsync(
                _schoolA, maleEmp, matPolicy.Id, DateTime.UtcNow.AddDays(5), DateTime.UtcNow.AddDays(10), "FullDay");
            Assert.False(isValid);
            Assert.Contains("restricted to Female", error);
        }

        // ==========================================
        // 12. Female-Only Leave: Female Employee Is Eligible
        // ==========================================
        [Fact]
        public async Task FemaleOnlyLeave_FemaleEmployee_IsEligible()
        {
            var femaleEmp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Sunita",
                LastName = "Sharma",
                Gender = "Female",
                EmploymentStatus = "Confirmed",
                JoiningDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var matPolicy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "ML_FEM",
                LeaveTypeName = "Maternity Leave",
                GenderEligibility = "Female",
                AnnualAllotment = 90,
                AccrualFrequency = "None",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = DateTime.UtcNow.AddYears(-1)
            };
            await _context.Employees.AddAsync(femaleEmp);
            await _context.LeavePolicies.AddAsync(matPolicy);
            await _context.SaveChangesAsync();

            var eligible = await _leaveEngine.GetEligiblePoliciesAsync(_schoolA, femaleEmp);
            Assert.Contains(eligible, p => p.Id == matPolicy.Id);

            var (isValid, error) = await _leaveEngine.ValidateLeaveApplicationAsync(
                _schoolA, femaleEmp, matPolicy.Id, DateTime.UtcNow.AddDays(5), DateTime.UtcNow.AddDays(10), "FullDay");
            Assert.True(isValid);
            Assert.Empty(error);
        }

        // ==========================================
        // 13. DOJ Before Cutoff: Accrual Starts Current Month
        // ==========================================
        [Fact]
        public async Task DOJ_Before_Cutoff_AccrualStartsCurrentMonth()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "CL_CUTOFF",
                LeaveTypeName = "Casual Leave",
                AnnualAllotment = 12,
                AccrualFrequency = "Monthly",
                AccrualUnitsPerPeriod = 1m,
                JoiningRule = "CurrentMonth",
                JoiningCutoffDay = 15,
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Aakash",
                LastName = "Mehta",
                JoiningDate = new DateTime(2026, 9, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };

            // Sept 20: 0 completed months (September ongoing)
            var sepBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 9, 20, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(0m, sepBal);

            // Oct 1: 1 completed month (Sept accrued)
            var octBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(1m, octBal);

            // Nov 1: 2 completed months
            var novBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(2m, novBal);

            // Dec 1: 3 completed months
            var decBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 12, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(3m, decBal);
        }

        // ==========================================
        // 14. DOJ Exactly On Cutoff: Accrual Starts Current Month (Inclusive)
        // ==========================================
        [Fact]
        public async Task DOJ_ExactlyOn_Cutoff_AccrualStartsCurrentMonth()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "CL_ONCUTOFF",
                LeaveTypeName = "Casual Leave",
                AnnualAllotment = 12,
                AccrualFrequency = "Monthly",
                AccrualUnitsPerPeriod = 1m,
                JoiningRule = "CurrentMonth",
                JoiningCutoffDay = 15,
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Bhavna",
                LastName = "Patel",
                JoiningDate = new DateTime(2026, 9, 15, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };

            var octBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(1m, octBal);
        }

        // ==========================================
        // 15. DOJ After Cutoff: Accrual Starts Next Month
        // ==========================================
        [Fact]
        public async Task DOJ_After_Cutoff_AccrualStartsNextMonth()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "CL_AFTERCUTOFF",
                LeaveTypeName = "Casual Leave",
                AnnualAllotment = 12,
                AccrualFrequency = "Monthly",
                AccrualUnitsPerPeriod = 1m,
                JoiningRule = "CurrentMonth",
                JoiningCutoffDay = 15,
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Chetan",
                LastName = "Joshi",
                JoiningDate = new DateTime(2026, 9, 16, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };

            // Oct 1: 0 completed months (accrual starts Oct 1, so no prior month completed)
            var octBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(0m, octBal);

            // Nov 1: 1 completed month (October)
            var novBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(1m, novBal);

            // Dec 1: 2 completed months
            var decBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 12, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(2m, decBal);
        }

        // ==========================================
        // 16. Configurable Cutoff Day = 10
        // ==========================================
        [Fact]
        public async Task Configurable_Cutoff_Day10_GovernsAccrual()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "CL_CUTOFF10",
                LeaveTypeName = "Casual Leave",
                AnnualAllotment = 12,
                AccrualFrequency = "Monthly",
                AccrualUnitsPerPeriod = 1m,
                JoiningRule = "CurrentMonth",
                JoiningCutoffDay = 10, // Cutoff is 10
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Divya",
                LastName = "Rao",
                JoiningDate = new DateTime(2026, 9, 11, 0, 0, 0, DateTimeKind.Utc), // Joined on 11th > 10th
                EmploymentStatus = "Confirmed"
            };

            // Since 11 > 10, accrual starts from next month (Oct 1)
            var octBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 10, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(0m, octBal);

            var novBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(1m, novBal);
        }

        // ==========================================
        // 17. Monthly Accrual Clamped to Annual Allotment
        // ==========================================
        [Fact]
        public async Task MonthlyAccrual_ClampedToAnnualAllotment()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "SL_CLAMP",
                LeaveTypeName = "Sick Leave",
                AnnualAllotment = 5, // Max 5 days
                AccrualFrequency = "Monthly",
                AccrualUnitsPerPeriod = 1m,
                JoiningRule = "Immediate",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Esha",
                LastName = "Gupta",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };

            // In November (10 months passed) -> 10 * 1 = 10, but capped at 5
            var novBal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 11, 1, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(5m, novBal);
        }

        // ==========================================
        // 18. Annual Allocation Granted Fully
        // ==========================================
        [Fact]
        public async Task AnnualAllocation_AllottedImmediately()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "AL_FULL",
                LeaveTypeName = "Annual Leave",
                AnnualAllotment = 20,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Farhan",
                LastName = "Akhtar",
                JoiningDate = new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };

            var bal = await _leaveEngine.CalculateAccruedDaysAsync(policy, emp, 2026, new DateTime(2026, 3, 15, 0, 0, 0, DateTimeKind.Utc));
            Assert.Equal(20m, bal);
        }

        // ==========================================
        // 19. Probation Policy Ineligible Blocks Probationers
        // ==========================================
        [Fact]
        public async Task Probation_PolicyIneligible_BlocksProbationEmployee()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "PL_CONF",
                LeaveTypeName = "Privilege Leave",
                AnnualAllotment = 15,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = false, // Not available in probation
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var probEmp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Girish",
                LastName = "K",
                JoiningDate = DateTime.UtcNow.AddMonths(-1),
                EmploymentStatus = "Probation"
            };
            var confEmp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Harish",
                LastName = "K",
                JoiningDate = DateTime.UtcNow.AddYears(-1),
                EmploymentStatus = "Confirmed"
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddRangeAsync(probEmp, confEmp);
            await _context.SaveChangesAsync();

            var (probValid, probErr) = await _leaveEngine.ValidateLeaveApplicationAsync(
                _schoolA, probEmp, policy.Id, DateTime.UtcNow.AddDays(2), DateTime.UtcNow.AddDays(4), "FullDay");
            Assert.False(probValid);
            Assert.Contains("probation period", probErr);

            var (confValid, confErr) = await _leaveEngine.ValidateLeaveApplicationAsync(
                _schoolA, confEmp, policy.Id, DateTime.UtcNow.AddDays(2), DateTime.UtcNow.AddDays(4), "FullDay");
            Assert.True(confValid);
            Assert.Empty(confErr);
        }

        // ==========================================
        // 20. Insufficient Balance Check on Approval
        // ==========================================
        [Fact]
        public async Task InsufficientBalance_ApproveLeaveRequest_ReturnsBadRequest()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "CL_INSUFF",
                LeaveTypeName = "Casual Leave",
                AnnualAllotment = 2,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Imran",
                LastName = "Khan",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            var req = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                EmployeeId = emp.Id,
                LeavePolicyId = policy.Id,
                LeaveType = policy.LeaveTypeCode,
                LeaveTypeName = policy.LeaveTypeName,
                TotalDays = 5, // Requested 5, but annual allotment is only 2
                Status = "Pending",
                FromDate = new DateTime(2026, 5, 1, 0, 0, 0, DateTimeKind.Utc),
                ToDate = new DateTime(2026, 5, 5, 0, 0, 0, DateTimeKind.Utc)
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddAsync(emp);
            await _context.LeaveRequests.AddAsync(req);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin"),
                        new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
                    }, "mock"))
                }
            };

            var result = await controller.ApproveLeaveRequest(req.Id, new LeaveActionDto { Note = "Approve attempt" });
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var json = JsonSerializer.Serialize(badRequest.Value);
            Assert.Contains("Insufficient balance", json);
        }

        // ==========================================
        // 21. Half-Day Support Validation & Calculation
        // ==========================================
        [Fact]
        public async Task HalfDay_PolicyEnforcement_And_DurationCalculation()
        {
            var noHalfDayPolicy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "NOHALF",
                LeaveTypeName = "No Half Day Policy",
                AllowHalfDay = false,
                AnnualAllotment = 10,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Jaya",
                LastName = "Prada",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            await _context.LeavePolicies.AddAsync(noHalfDayPolicy);
            await _context.Employees.AddAsync(emp);
            await _context.SaveChangesAsync();

            var (isValid, err) = await _leaveEngine.ValidateLeaveApplicationAsync(
                _schoolA, emp, noHalfDayPolicy.Id, DateTime.UtcNow, DateTime.UtcNow, "HalfDay");
            Assert.False(isValid);
            Assert.Contains("does not allow half-day", err);

            var duration = await _leaveEngine.CalculateLeaveDurationAsync(_schoolA, DateTime.UtcNow, DateTime.UtcNow, "HalfDay", false, 2026);
            Assert.Equal(0.5m, duration);
        }

        // ==========================================
        // 22. Leave Approval Deducts Balance and Writes Ledger
        // ==========================================
        [Fact]
        public async Task LeaveApproval_DeductsBalance_And_CreatesLedgerEntry()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "AL_APPR",
                LeaveTypeName = "Annual Leave",
                AnnualAllotment = 15,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Kiran",
                LastName = "Bedi",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            var req = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                EmployeeId = emp.Id,
                LeavePolicyId = policy.Id,
                LeaveType = policy.LeaveTypeCode,
                LeaveTypeName = policy.LeaveTypeName,
                TotalDays = 3,
                Status = "Pending",
                FromDate = new DateTime(2026, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                ToDate = new DateTime(2026, 6, 3, 0, 0, 0, DateTimeKind.Utc)
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddAsync(emp);
            await _context.LeaveRequests.AddAsync(req);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin"),
                        new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
                    }, "mock"))
                }
            };

            var res = await controller.ApproveLeaveRequest(req.Id, new LeaveActionDto { Note = "Approved" });
            Assert.IsType<OkObjectResult>(res);

            var updatedReq = await _context.LeaveRequests.FindAsync(req.Id);
            Assert.Equal("Approved", updatedReq!.Status);

            var ledgerTxn = await _context.LeaveTransactions.FirstOrDefaultAsync(t => t.LeaveRequestId == req.Id);
            Assert.NotNull(ledgerTxn);
            Assert.Equal("LEAVE_APPROVED", ledgerTxn.TransactionType);
            Assert.Equal(-3m, ledgerTxn.Amount);
            Assert.Equal(15m, ledgerTxn.BalanceBefore);
            Assert.Equal(12m, ledgerTxn.BalanceAfter);

            var remaining = await _leaveEngine.GetSingleBalanceAsync(_schoolA, emp.Id, null, policy.Id, 2026);
            Assert.Equal(12m, remaining!.Remaining);
        }

        // ==========================================
        // 23. Leave Rejection Does Not Deduct Balance
        // ==========================================
        [Fact]
        public async Task LeaveRejection_DoesNotDeductBalance()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "SL_REJ",
                LeaveTypeName = "Sick Leave",
                AnnualAllotment = 10,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Lalita",
                LastName = "Pawar",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            var req = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                EmployeeId = emp.Id,
                LeavePolicyId = policy.Id,
                LeaveType = policy.LeaveTypeCode,
                LeaveTypeName = policy.LeaveTypeName,
                TotalDays = 2,
                Status = "Pending",
                FromDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc),
                ToDate = new DateTime(2026, 4, 2, 0, 0, 0, DateTimeKind.Utc)
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddAsync(emp);
            await _context.LeaveRequests.AddAsync(req);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin")
                    }, "mock"))
                }
            };

            var res = await controller.RejectLeaveRequest(req.Id, new LeaveActionDto { Note = "Staff shortage" });
            Assert.IsType<OkObjectResult>(res);

            var updatedReq = await _context.LeaveRequests.FindAsync(req.Id);
            Assert.Equal("Rejected", updatedReq!.Status);
            Assert.Equal("Staff shortage", updatedReq.RejectionNote);

            var bal = await _leaveEngine.GetSingleBalanceAsync(_schoolA, emp.Id, null, policy.Id, 2026);
            Assert.Equal(10m, bal!.Remaining);
        }

        // ==========================================
        // 24. Leave Revocation Restores Balance and Records Ledger
        // ==========================================
        [Fact]
        public async Task LeaveRevocation_RestoresBalance_And_RecordsLedger()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "CL_REV",
                LeaveTypeName = "Casual Leave",
                AnnualAllotment = 10,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Manish",
                LastName = "Tiwari",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            var req = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                EmployeeId = emp.Id,
                LeavePolicyId = policy.Id,
                LeaveType = policy.LeaveTypeCode,
                LeaveTypeName = policy.LeaveTypeName,
                TotalDays = 3,
                Status = "Approved", // Already approved
                FromDate = new DateTime(2026, 7, 1, 0, 0, 0, DateTimeKind.Utc),
                ToDate = new DateTime(2026, 7, 3, 0, 0, 0, DateTimeKind.Utc)
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddAsync(emp);
            await _context.LeaveRequests.AddAsync(req);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin"),
                        new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
                    }, "mock"))
                }
            };

            var res = await controller.RevokeLeaveRequest(req.Id, new LeaveActionDto { Note = "Cancelled upon employee request" });
            Assert.IsType<OkObjectResult>(res);

            var updatedReq = await _context.LeaveRequests.FindAsync(req.Id);
            Assert.Equal("Revoked", updatedReq!.Status);

            var revTxn = await _context.LeaveTransactions.FirstOrDefaultAsync(t => t.LeaveRequestId == req.Id && t.TransactionType == "LEAVE_CANCELLED");
            Assert.NotNull(revTxn);
            Assert.Equal(3m, revTxn.Amount);

            var bal = await _leaveEngine.GetSingleBalanceAsync(_schoolA, emp.Id, null, policy.Id, 2026);
            Assert.Equal(10m, bal!.Remaining);
        }

        // ==========================================
        // 25. Carry Forward Bounded by MaxCarryForwardDays
        // ==========================================
        [Fact]
        public async Task CarryForward_BoundedByMaxLimit_And_PersistedToLedger()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "EL_CARRY",
                LeaveTypeName = "Earned Leave",
                AnnualAllotment = 15,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                CarryForwardAllowed = true,
                MaxCarryForwardDays = 5m, // Only up to 5 days can carry forward
                IsActive = true,
                EffectiveFrom = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Nitin",
                LastName = "Gadkari",
                JoiningDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddAsync(emp);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin"),
                        new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
                    }, "mock"))
                }
            };

            var res = await controller.ProcessCarryForward(new CarryForwardRequestDto { FromYear = 2025, ToYear = 2026 });
            Assert.IsType<OkObjectResult>(res);

            var carryTxn = await _context.LeaveTransactions.FirstOrDefaultAsync(t =>
                t.SchoolId == _schoolA && t.EmployeeId == emp.Id && t.AcademicYear == 2026 && t.TransactionType == "CARRY_FORWARD");
            Assert.NotNull(carryTxn);
            Assert.Equal(5m, carryTxn.Amount); // Capped at MaxCarryForwardDays (5)
        }

        // ==========================================
        // 26. Encashment Policy Settings Stored Correctly
        // ==========================================
        [Fact]
        public async Task Encashment_PolicyConfigurationPersisted()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "ENCASH_TEST",
                LeaveTypeName = "Encashable Leave",
                EncashmentAllowed = true,
                MaxEncashmentDays = 15m,
                AnnualAllotment = 30,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.SaveChangesAsync();

            var fetched = await _context.LeavePolicies.FindAsync(policy.Id);
            Assert.NotNull(fetched);
            Assert.True(fetched.EncashmentAllowed);
            Assert.Equal(15m, fetched.MaxEncashmentDays);
        }

        // ==========================================
        // 27. Manual Leave Adjustment: Credit & Debit
        // ==========================================
        [Fact]
        public async Task ManualAdjustment_CreditAndDebit_RecordedAccurately()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "MANUAL_ADJ_TEST",
                LeaveTypeName = "Special Leave",
                AnnualAllotment = 5,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Omkar",
                LastName = "Shinde",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddAsync(emp);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin"),
                        new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
                    }, "mock"))
                }
            };

            // Credit 2 days
            var resCredit = await controller.ManualLeaveAdjustment(emp.Id, new ManualLeaveAdjustmentDto
            {
                LeavePolicyId = policy.Id,
                Days = 2m,
                Reason = "Special recognition bonus leave",
                AcademicYear = 2026
            });
            Assert.IsType<OkObjectResult>(resCredit);

            // Debit 1 day
            var resDebit = await controller.ManualLeaveAdjustment(emp.Id, new ManualLeaveAdjustmentDto
            {
                LeavePolicyId = policy.Id,
                Days = -1m,
                Reason = "Correction deduction",
                AcademicYear = 2026
            });
            Assert.IsType<OkObjectResult>(resDebit);

            var bal = await _leaveEngine.GetSingleBalanceAsync(_schoolA, emp.Id, null, policy.Id, 2026);
            Assert.Equal(6m, bal!.Remaining); // 5 initial + 2 credit - 1 debit = 6
        }

        // ==========================================
        // 28. Cross-Tenant Isolation: School A Admin Cannot Access School B
        // ==========================================
        [Fact]
        public async Task CrossTenant_SchoolA_AdminCannotAccess_SchoolB_LeaveData()
        {
            var empB = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolB,
                FirstName = "Pooja",
                LastName = "Bhatt",
                JoiningDate = DateTime.UtcNow.AddYears(-1)
            };
            var policyB = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolB,
                LeaveTypeCode = "POLICY_B",
                LeaveTypeName = "School B Only Policy",
                AnnualAllotment = 10,
                IsActive = true
            };
            var reqB = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolB,
                EmployeeId = empB.Id,
                LeaveType = "POLICY_B",
                TotalDays = 2,
                Status = "Pending"
            };
            await _context.Employees.AddAsync(empB);
            await _context.LeavePolicies.AddAsync(policyB);
            await _context.LeaveRequests.AddAsync(reqB);
            await _context.SaveChangesAsync();

            // Admin of School A
            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin"),
                        new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
                    }, "mock"))
                }
            };

            // Attempt to approve School B leave request -> NotFound
            var approveRes = await controller.ApproveLeaveRequest(reqB.Id, new LeaveActionDto { Note = "Malicious cross-tenant attempt" });
            Assert.IsType<NotFoundObjectResult>(approveRes);

            // Attempt to fetch School B employee balance -> NotFound
            var balRes = await controller.GetEmployeeLeaveBalance(empB.Id, 2026);
            Assert.IsType<NotFoundObjectResult>(balRes);

            // Attempt to delete School B policy -> NotFound
            var delRes = await controller.DeleteLeavePolicy(policyB.Id);
            Assert.IsType<NotFoundObjectResult>(delRes);
        }

        // ==========================================
        // 29. Duplicate Approval Blocked
        // ==========================================
        [Fact]
        public async Task DuplicateApproval_DoubleDeductionBlocked()
        {
            var req = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                TotalDays = 2,
                Status = "Approved" // Already approved
            };
            await _context.LeaveRequests.AddAsync(req);
            await _context.SaveChangesAsync();

            var controller = new HrmController(_unitOfWork, _context, _calcService, _leaveEngine);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                    {
                        new Claim("schoolId", _schoolA.ToString()),
                        new Claim(ClaimTypes.Role, "schooladmin")
                    }, "mock"))
                }
            };

            var result = await controller.ApproveLeaveRequest(req.Id, new LeaveActionDto { Note = "Second attempt" });
            var badReq = Assert.IsType<BadRequestObjectResult>(result);
            var json = JsonSerializer.Serialize(badReq.Value);
            Assert.Contains("already approved", json);
        }

        // ==========================================
        // 30. Overlapping Leave Request Validation Blocked
        // ==========================================
        [Fact]
        public async Task OverlappingLeave_ApplicationRejected()
        {
            var policy = new LeavePolicy
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                LeaveTypeCode = "OVERLAP_POL",
                LeaveTypeName = "General Leave",
                AnnualAllotment = 10,
                AccrualFrequency = "Annual",
                GenderEligibility = "All",
                ProbationEligible = true,
                IsActive = true,
                EffectiveFrom = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            };
            var emp = new Employee
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                FirstName = "Qasim",
                LastName = "Ali",
                JoiningDate = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                EmploymentStatus = "Confirmed"
            };
            var existingReq = new LeaveRequest
            {
                Id = Guid.NewGuid(),
                SchoolId = _schoolA,
                EmployeeId = emp.Id,
                LeavePolicyId = policy.Id,
                LeaveType = policy.LeaveTypeCode,
                LeaveTypeName = policy.LeaveTypeName,
                FromDate = new DateTime(2026, 10, 10, 0, 0, 0, DateTimeKind.Utc),
                ToDate = new DateTime(2026, 10, 15, 0, 0, 0, DateTimeKind.Utc),
                Status = "Approved",
                TotalDays = 6
            };
            await _context.LeavePolicies.AddAsync(policy);
            await _context.Employees.AddAsync(emp);
            await _context.LeaveRequests.AddAsync(existingReq);
            await _context.SaveChangesAsync();

            // Attempt to apply for Oct 12 to Oct 18 (overlaps Oct 12-15)
            var (isValid, err) = await _leaveEngine.ValidateLeaveApplicationAsync(
                _schoolA, emp, policy.Id, new DateTime(2026, 10, 12, 0, 0, 0, DateTimeKind.Utc), new DateTime(2026, 10, 18, 0, 0, 0, DateTimeKind.Utc), "FullDay");

            Assert.False(isValid);
            Assert.Contains("overlapping", err);
        }
    }
}
