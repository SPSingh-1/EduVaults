using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Core.DTOs;

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

            if (!user.IsActive)
            {
                return Forbid("User account is deactivated");
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
                    SchoolId = user.SchoolId
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
                Status = "success",
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
    }
}
