using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Core.DTOs;
using Microsoft.AspNetCore.Authorization;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;

        public AuthController(IUnitOfWork unitOfWork, IAuthService authService)
        {
            _unitOfWork = unitOfWork;
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var userList = await _unitOfWork.Users.FindAsync(u => u.Email == request.Email);
            var user = userList.FirstOrDefault();

            if (user == null || !_authService.VerifyPassword(request.Password, user.PasswordHash))
            {
                return Unauthorized(new { error = "Invalid email or password" });
            }

            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            if (settings != null && settings.MaintenanceMode && user.Role != "superadmin" && user.Role != "schooladmin")
            {
                return StatusCode(503, new { error = settings.MaintenanceMessage ?? "System is currently undergoing maintenance. Please try again later." });
            }

            if (!user.IsActive)
            {
                return StatusCode(403, new { error = "User account is deactivated" });
            }

            string schoolName = string.Empty;
            string logoUrl = string.Empty;
            string emailDomain = string.Empty;
            string themeColor = string.Empty;
            if (user.SchoolId.HasValue)
            {
                var school = await _unitOfWork.Schools.GetByIdAsync(user.SchoolId.Value);
                schoolName = school?.Name ?? string.Empty;
                logoUrl = school?.LogoUrl ?? string.Empty;
                emailDomain = school?.EmailDomain ?? string.Empty;
                themeColor = school?.ThemeColor ?? string.Empty;
            }

            var token = _authService.GenerateToken(user);

            var response = new LoginResponse
            {
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email,
                    Role = user.Role,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Avatar = $"{user.FirstName[0]}{user.LastName[0]}",
                    SchoolId = user.SchoolId,
                    SchoolName = schoolName,
                    LogoUrl = logoUrl,
                    EmailDomain = emailDomain,
                    ThemeColor = themeColor
                }
            };

            return Ok(response);
        }

        [HttpPost("register-school")]
        public async Task<IActionResult> RegisterSchool([FromBody] RegisterSchoolRequest request)
        {
            var existingUserList = await _unitOfWork.Users.FindAsync(u => u.Email == request.AdminEmail);
            if (existingUserList.Any())
            {
                return BadRequest(new { error = "Email address is already registered" });
            }

            // Create school
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

            // Create admin user
            var adminUser = new User
            {
                SchoolId = school.Id,
                Email = request.AdminEmail,
                PasswordHash = _authService.HashPassword(request.AdminPassword),
                Role = "schooladmin",
                FirstName = request.AdminName,
                LastName = "Administrator",
                IsActive = true
            };

            await _unitOfWork.Users.AddAsync(adminUser);

            // Create subscription (Standard plan for new registration)
            var subscription = new Subscription
            {
                SchoolId = school.Id,
                PlanType = "Standard",
                Amount = 499.00m,
                Status = "pending",
                StartDate = DateTime.UtcNow,
                EndDate = DateTime.UtcNow.AddYears(1)
            };

            await _unitOfWork.Subscriptions.AddAsync(subscription);

            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                schoolId = school.Id,
                schoolCode = school.SchoolCode
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var userList = await _unitOfWork.Users.FindAsync(u => u.Email == request.Email);
            var user = userList.FirstOrDefault();

            if (user == null)
            {
                return NotFound(new { error = "No account found with this email address." });
            }

            user.PasswordHash = _authService.HashPassword(request.NewPassword);
            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Password updated successfully."
            });
        }

        [HttpGet("school-branding")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSchoolBranding([FromQuery] string domain)
        {
            if (string.IsNullOrWhiteSpace(domain))
            {
                return BadRequest(new { error = "Domain parameter is required." });
            }

            var schoolList = await _unitOfWork.Schools.FindAsync(s => s.EmailDomain != null && s.EmailDomain.ToLower() == domain.ToLower());
            var school = schoolList.FirstOrDefault();
            if (school == null)
            {
                return NotFound(new { error = "No branding found for this domain." });
            }

            return Ok(new
            {
                school.Name,
                school.LogoUrl,
                school.ThemeColor
            });
        }

        [HttpGet("settings")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicSettings()
        {
            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            if (settings == null)
            {
                settings = new PlatformSetting();
                await _unitOfWork.PlatformSettings.AddAsync(settings);
                await _unitOfWork.CompleteAsync();
            }
            return Ok(new
            {
                settings.OrgName,
                settings.LogoUrl,
                settings.PrimaryColor,
                settings.MaintenanceMode,
                settings.MaintenanceMessage
            });
        }
    }
}
