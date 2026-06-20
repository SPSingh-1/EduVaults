using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Core.DTOs;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/super")]
    [Authorize(Roles = "superadmin")]
    public class SuperAdminController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;

        public SuperAdminController(IUnitOfWork unitOfWork, IAuthService authService)
        {
            _unitOfWork = unitOfWork;
            _authService = authService;
        }

        [HttpGet("schools")]
        public async Task<IActionResult> GetSchools()
        {
            var schools = await _unitOfWork.Schools.GetAllAsync();
            var schoolList = new System.Collections.Generic.List<object>();

            foreach (var s in schools)
            {
                var students = await _unitOfWork.Users.FindAsync(u => u.SchoolId == s.Id && u.Role == "student");
                var adminUser = (await _unitOfWork.Users.FindAsync(u => u.SchoolId == s.Id && u.Role == "schooladmin")).FirstOrDefault();
                schoolList.Add(new
                {
                    s.Id,
                    s.Name,
                    s.SchoolCode,
                    s.Status,
                    s.CreatedAt,
                    s.Website,
                    s.LogoUrl,
                    s.EmailDomain,
                    s.ThemeColor,
                    StudentsCount = students.Count(),
                    AdminEmail = adminUser?.Email
                });
            }

            return Ok(schoolList);
        }

        [HttpPost("schools")]
        public async Task<IActionResult> CreateSchool([FromBody] RegisterSchoolRequest request)
        {
            var existingUser = (await _unitOfWork.Users.FindAsync(u => u.Email == request.AdminEmail)).FirstOrDefault();
            if (existingUser != null)
            {
                return BadRequest(new { error = "Email address already exists" });
            }

            var emailDomain = request.EmailDomain;
            if (string.IsNullOrWhiteSpace(emailDomain) && !string.IsNullOrWhiteSpace(request.AdminEmail))
            {
                var parts = request.AdminEmail.Split('@');
                if (parts.Length > 1)
                {
                    emailDomain = parts[parts.Length - 1].Trim();
                }
            }

            var schoolCode = $"SCH-{DateTime.UtcNow.Year}-{new Random().Next(1000, 9999)}";
            var school = new School
            {
                Name = request.SchoolName,
                Address = request.Address,
                City = request.City,
                Website = request.Website,
                SchoolCode = schoolCode,
                Status = "Active",
                LogoUrl = request.LogoUrl,
                EmailDomain = emailDomain,
                ThemeColor = request.ThemeColor
            };

            await _unitOfWork.Schools.AddAsync(school);

            var adminUser = new User
            {
                SchoolId = school.Id,
                Email = request.AdminEmail,
                PasswordHash = _authService.HashPassword(request.AdminPassword),
                Role = "schooladmin",
                FirstName = request.AdminName,
                LastName = "Administrator"
            };

            await _unitOfWork.Users.AddAsync(adminUser);

            var subscription = new Subscription
            {
                SchoolId = school.Id,
                PlanType = "Standard",
                Amount = 49.00m,
                Status = "success",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddYears(1)
            };

            await _unitOfWork.Subscriptions.AddAsync(subscription);

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, schoolId = school.Id, schoolCode = school.SchoolCode });
        }

        [HttpPut("schools/{id}/status")]
        public async Task<IActionResult> UpdateSchoolStatus(Guid id, [FromBody] string status)
        {
            var school = await _unitOfWork.Schools.GetByIdAsync(id);
            if (school == null)
            {
                return NotFound(new { error = "School not found" });
            }

            school.Status = status;
            _unitOfWork.Schools.Update(school);

            // Synchronize subscription status (Active -> success, Suspended -> pending)
            var subscriptions = await _unitOfWork.Subscriptions.FindAsync(s => s.SchoolId == id);
            var subscription = subscriptions.FirstOrDefault();
            if (subscription != null)
            {
                subscription.Status = status == "Active" ? "success" : "pending";
                _unitOfWork.Subscriptions.Update(subscription);
            }

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        [HttpPut("schools/{id}")]
        public async Task<IActionResult> UpdateSchoolBranding(Guid id, [FromBody] UpdateSchoolBrandingRequest request)
        {
            var school = await _unitOfWork.Schools.GetByIdAsync(id);
            if (school == null)
            {
                return NotFound(new { error = "School not found" });
            }

            school.Name = request.Name;
            school.LogoUrl = request.LogoUrl;
            school.EmailDomain = request.EmailDomain;
            school.ThemeColor = request.ThemeColor;

            _unitOfWork.Schools.Update(school);
            await _unitOfWork.CompleteAsync();

            return Ok(school);
        }

        [HttpGet("subscriptions")]
        public async Task<IActionResult> GetSubscriptions()
        {
            var subscriptions = await _unitOfWork.Subscriptions.GetAllAsync();
            var schools = await _unitOfWork.Schools.GetAllAsync();

            var list = subscriptions.Select(sub => {
                var schoolName = schools.FirstOrDefault(s => s.Id == sub.SchoolId)?.Name ?? "Unknown";
                return new {
                    sub.Id,
                    InstitutionName = schoolName,
                    PlanType = sub.PlanType,
                    Amount = sub.Amount,
                    Status = sub.Status,
                    RenewDate = sub.EndDate.ToString("MMM dd, yyyy")
                };
            });

            return Ok(new {
                totalMrr = subscriptions.Where(s => s.Status == "success").Sum(s => s.Amount),
                activeSubscribers = subscriptions.Count(s => s.Status == "success"),
                renewals = list
            });
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var schools = await _unitOfWork.Schools.GetAllAsync();
            var subscriptions = await _unitOfWork.Subscriptions.GetAllAsync();

            var totalSchools = schools.Count();
            var activeSubscriptions = subscriptions.Count(s => s.Status == "success");
            var monthlyRevenue = subscriptions.Where(s => s.Status == "success").Sum(s => s.Amount);

            var recentActivity = schools
                .OrderByDescending(s => s.CreatedAt)
                .Take(5)
                .Select(s => new {
                    Name = s.Name,
                    Status = s.Status,
                    CreatedAt = s.CreatedAt
                });

            // Calculate dynamic Platform Growth (growth from last month)
            var lastMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-1);
            var lastMonthEnd = new DateTime(lastMonthStart.Year, lastMonthStart.Month, DateTime.DaysInMonth(lastMonthStart.Year, lastMonthStart.Month), 23, 59, 59, DateTimeKind.Utc);
            var previousSchoolsCount = schools.Count(s => s.CreatedAt <= lastMonthEnd);
            var growthPct = 0;
            if (previousSchoolsCount > 0)
            {
                growthPct = (int)Math.Round((double)(totalSchools - previousSchoolsCount) / previousSchoolsCount * 100);
            }
            else if (totalSchools > 0)
            {
                growthPct = totalSchools * 100;
            }
            var platformGrowth = growthPct >= 0 ? $"+{growthPct}%" : $"{growthPct}%";

            // Calculate 12-Month Onboarding Trend
            var onboardingTrend = new System.Collections.Generic.List<object>();
            for (int i = 11; i >= 0; i--)
            {
                var targetDate = DateTime.UtcNow.AddMonths(-i);
                var endOfMonth = new DateTime(targetDate.Year, targetDate.Month, DateTime.DaysInMonth(targetDate.Year, targetDate.Month), 23, 59, 59, DateTimeKind.Utc);
                var countAtMonth = schools.Count(s => s.CreatedAt <= endOfMonth);
                onboardingTrend.Add(new
                {
                    month = targetDate.ToString("MMM"),
                    schools = countAtMonth
                });
            }

            return Ok(new
            {
                totalSchools,
                activeSubscriptions,
                monthlyRevenue,
                platformGrowth,
                onboardingTrend,
                recentActivity
            });
        }

        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            if (settings == null)
            {
                settings = new PlatformSetting();
                await _unitOfWork.PlatformSettings.AddAsync(settings);
                await _unitOfWork.CompleteAsync();
            }
            return Ok(settings);
        }

        [HttpPost("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] PlatformSetting request)
        {
            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            if (settings == null)
            {
                settings = new PlatformSetting();
                await _unitOfWork.PlatformSettings.AddAsync(settings);
            }

            settings.OrgName = request.OrgName;
            settings.LogoUrl = request.LogoUrl;
            settings.PrimaryColor = request.PrimaryColor;
            settings.MaintenanceMode = request.MaintenanceMode;
            settings.MaintenanceMessage = request.MaintenanceMessage;
            settings.BackupFrequency = request.BackupFrequency;
            settings.BackupTime = request.BackupTime;
            settings.BackupTarget = request.BackupTarget;

            _unitOfWork.PlatformSettings.Update(settings);
            await _unitOfWork.CompleteAsync();

            return Ok(settings);
        }

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans()
        {
            var plans = (await _unitOfWork.PlatformPlans.GetAllAsync())
                .OrderBy(p => p.TierLabel)
                .ToList();
            return Ok(plans);
        }

        [HttpPut("plans/{id}")]
        public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] PlatformPlan request)
        {
            var plan = await _unitOfWork.PlatformPlans.GetByIdAsync(id);
            if (plan == null)
            {
                return NotFound(new { error = "Plan not found." });
            }

            plan.PlanName = request.PlanName;
            plan.ImplementationCost = request.ImplementationCost;
            plan.StudentCapacity = request.StudentCapacity;
            plan.StorageLimit = request.StorageLimit;
            plan.MonthlyPrice = request.MonthlyPrice;
            plan.IsTopRevenue = request.IsTopRevenue;

            _unitOfWork.PlatformPlans.Update(plan);
            await _unitOfWork.CompleteAsync();

            return Ok(plan);
        }

        [HttpPost("plans")]
        public async Task<IActionResult> CreatePlan([FromBody] PlatformPlan request)
        {
            if (string.IsNullOrWhiteSpace(request.PlanName) || string.IsNullOrWhiteSpace(request.TierLabel))
            {
                return BadRequest(new { error = "Plan Name and Tier Label are required." });
            }

            var plan = new PlatformPlan
            {
                TierLabel = request.TierLabel,
                PlanName = request.PlanName,
                ImplementationCost = request.ImplementationCost,
                StudentCapacity = request.StudentCapacity,
                StorageLimit = request.StorageLimit,
                MonthlyPrice = request.MonthlyPrice,
                IsTopRevenue = request.IsTopRevenue
            };

            await _unitOfWork.PlatformPlans.AddAsync(plan);
            await _unitOfWork.CompleteAsync();

            return Ok(plan);
        }
    }
}
