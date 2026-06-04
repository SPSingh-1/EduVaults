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
            var schoolList = schools.Select(s => new
            {
                s.Id,
                s.Name,
                s.SchoolCode,
                s.Status,
                s.CreatedAt,
                s.Website,
                // Count of students
                StudentsCount = _unitOfWork.Users.FindAsync(u => u.SchoolId == s.Id && u.Role == "student").Result.Count()
            });

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

            var schoolCode = $"SCH-{DateTime.UtcNow.Year}-{new Random().Next(1000, 9999)}";
            var school = new School
            {
                Name = request.SchoolName,
                Address = request.Address,
                City = request.City,
                Website = request.Website,
                SchoolCode = schoolCode,
                Status = "Active"
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
                Amount = 499.00m,
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
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
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
    }
}
