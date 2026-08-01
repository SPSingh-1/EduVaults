using System;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Net.Http;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Core.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [EnableRateLimiting("public-api")]
    public class AuthController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IMemoryCache _cache;

        public AuthController(IUnitOfWork unitOfWork, IAuthService authService, IConfiguration configuration, IHttpClientFactory httpClientFactory, IMemoryCache cache)
        {
            _unitOfWork = unitOfWork;
            _authService = authService;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
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
            var schoolCode = $"SCH-{DateTime.UtcNow.Year}-{RandomNumberGenerator.GetInt32(1000, 10000)}";
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
        [DisableRateLimiting]
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
        [DisableRateLimiting]
        public async Task<IActionResult> GetPublicSettings()
        {
            const string CacheKey = "public_settings";
            if (!_cache.TryGetValue(CacheKey, out object? cachedSettings))
            {
                var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
                if (settings == null)
                {
                    settings = new PlatformSetting();
                    await _unitOfWork.PlatformSettings.AddAsync(settings);
                    await _unitOfWork.CompleteAsync();
                }

                cachedSettings = new
                {
                    settings.OrgName,
                    settings.LogoUrl,
                    settings.PrimaryColor,
                    settings.MaintenanceMode,
                    settings.MaintenanceMessage,
                    settings.ContactEmail,
                    settings.ContactPhone,
                    settings.ContactAddress,
                    settings.ContactHours
                };

                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(10))
                    .SetSlidingExpiration(TimeSpan.FromMinutes(2));

                _cache.Set(CacheKey, cachedSettings, cacheEntryOptions);
            }

            return Ok(cachedSettings);
        }

        [HttpGet("public-stats")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicStats()
        {
            const string CacheKey = "public_stats";
            if (!_cache.TryGetValue(CacheKey, out object? cachedStats))
            {
                var schools = await _unitOfWork.Schools.GetAllAsync();
                var activeSchools = schools != null ? schools.Count(s => s.Status == "Active") : 0;

                var students = await _unitOfWork.Users.FindAsync(u => u.Role == "student");
                var activeStudentsCount = students != null ? students.Count() : 0;

                var teachers = await _unitOfWork.Users.FindAsync(u => u.Role == "teacher");
                var activeTeachersCount = teachers != null ? teachers.Count() : 0;

                var transactions = await _unitOfWork.Transactions.GetAllAsync();
                var totalRevenue = transactions != null ? transactions.Where(t => t.Status.Equals("success", StringComparison.OrdinalIgnoreCase)).Sum(t => t.Amount) : 0;

                cachedStats = new
                {
                    totalSchools = activeSchools,
                    totalStudents = activeStudentsCount,
                    totalTeachers = activeTeachersCount,
                    totalRevenue = totalRevenue
                };

                var cacheEntryOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(10))
                    .SetSlidingExpiration(TimeSpan.FromMinutes(2));

                _cache.Set(CacheKey, cachedStats, cacheEntryOptions);
            }

            return Ok(cachedStats);
        }

        [HttpPost("public-order")]
        [AllowAnonymous]
        public async Task<IActionResult> CreatePublicOrder([FromBody] CreatePublicOrderRequest request)
        {
            decimal amount = request.PlanType == "Yearly" ? 39999.00m : 3999.00m;
            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            string keyId = settings?.RazorpayKeyId;
            string keySecret = settings?.RazorpayKeySecret;

            if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
            {
                keyId = _configuration["Razorpay:KeyId"] ?? "";
                keySecret = _configuration["Razorpay:KeySecret"] ?? "";
            }

            if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret) || keySecret == "yourKeySecretHere")
            {
                return Ok(new {
                    paymentProvider = "razorpay",
                    orderId = $"pub_mock_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    amount = (int)Math.Round(amount * 100),
                    currency = "INR",
                    keyId = "rzp_test_mockKeyId",
                    isMock = true
                });
            }

            try
            {
                var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders");
                httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authString);

                var orderRequest = new
                {
                    amount = (int)Math.Round(amount * 100), // in paise
                    currency = "INR",
                    receipt = $"pub_recpt_{Guid.NewGuid().ToString().Substring(0, 8)}"
                };

                httpRequest.Content = new StringContent(JsonSerializer.Serialize(orderRequest), Encoding.UTF8, "application/json");

                var client = _httpClientFactory.CreateClient();
                var response = await client.SendAsync(httpRequest);

                if (!response.IsSuccessStatusCode)
                {
                    var errContent = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[RAZORPAY ERROR] Failed to create public Razorpay order: {errContent}");
                    return Ok(new {
                        paymentProvider = "razorpay",
                        orderId = $"pub_mock_{Guid.NewGuid().ToString().Substring(0, 8)}",
                        amount = (int)Math.Round(amount * 100),
                        currency = "INR",
                        keyId = keyId,
                        isMock = true
                    });
                }

                var responseContent = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(responseContent);
                var orderId = doc.RootElement.GetProperty("id").GetString();

                return Ok(new {
                    paymentProvider = "razorpay",
                    orderId = orderId,
                    amount = (int)Math.Round(amount * 100),
                    currency = "INR",
                    keyId = keyId,
                    isMock = false
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[RAZORPAY EXCEPTION] {ex.Message}");
                return Ok(new {
                    paymentProvider = "razorpay",
                    orderId = $"pub_mock_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    amount = (int)Math.Round(amount * 100),
                    currency = "INR",
                    keyId = keyId,
                    isMock = true
                });
            }
        }

        [HttpPost("register-purchase")]
        [AllowAnonymous]
        public async Task<IActionResult> RegisterPurchase([FromBody] RegisterPurchaseRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var sanitizedAdminEmail = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.AdminEmail);
            var existingUserList = await _unitOfWork.Users.FindAsync(u => u.Email == sanitizedAdminEmail);
            if (existingUserList.Any())
            {
                return BadRequest(new { error = "Email address is already registered" });
            }

            var sanitizedSchoolName = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.SchoolName);
            var sanitizedAddress = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.Address);
            var sanitizedCity = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.City);
            var sanitizedWebsite = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.Website);
            var sanitizedAdminName = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.AdminName);
            var sanitizedPhone = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.Phone);
            var sanitizedPlanType = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.PlanType);
            var sanitizedPaymentId = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.RazorpayPaymentId);

            var schoolCode = $"SCH-{DateTime.UtcNow.Year}-{RandomNumberGenerator.GetInt32(1000, 10000)}";
            var school = new School
            {
                Name = sanitizedSchoolName,
                Address = sanitizedAddress,
                City = sanitizedCity,
                Website = sanitizedWebsite,
                SchoolCode = schoolCode,
                Status = "Pending"
            };

            await _unitOfWork.Schools.AddAsync(school);

            var adminUser = new User
            {
                SchoolId = school.Id,
                Email = sanitizedAdminEmail,
                PasswordHash = _authService.HashPassword(Guid.NewGuid().ToString()), // Random hash until set by super admin
                Role = "schooladmin",
                FirstName = sanitizedAdminName,
                LastName = sanitizedPhone, // Store phone details in LastName
                IsActive = false
            };

            await _unitOfWork.Users.AddAsync(adminUser);

            decimal amount = sanitizedPlanType == "Yearly" ? 39999.00m : 3999.00m;

            var subscription = new Subscription
            {
                SchoolId = school.Id,
                PlanType = $"{sanitizedPlanType} (Paid: {sanitizedPaymentId})",
                Amount = amount,
                Status = "success",
                StartDate = DateTime.UtcNow,
                EndDate = sanitizedPlanType == "Yearly" ? DateTime.UtcNow.AddYears(1) : DateTime.UtcNow.AddMonths(1)
            };

            await _unitOfWork.Subscriptions.AddAsync(subscription);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                message = "Purchase registered successfully. Super admin will review and activate your credentials in 24 hours.",
                schoolId = school.Id,
                schoolCode = school.SchoolCode
            });
        }
        [HttpPost("submit-inquiry")]
        [AllowAnonymous]
        public async Task<IActionResult> SubmitInquiry([FromBody] SubmitInquiryRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var sanitizedName = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.Name);
            var sanitizedEmail = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.Email);
            var sanitizedMessage = System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.Message);
            var sanitizedPhone = string.IsNullOrEmpty(request.Phone) ? string.Empty : System.Text.Encodings.Web.HtmlEncoder.Default.Encode(request.Phone);

            var ticket = new SupportTicket
            {
                TicketNumber = $"{(request.IsDemoRequest ? "DEM" : "INQ")}-{RandomNumberGenerator.GetInt32(1000, 10000)}",
                Title = request.IsDemoRequest ? "Demo Request" : "Contact Inquiry",
                SchoolName = "Landing Page Client",
                Status = "OPEN",
                Priority = request.IsDemoRequest ? "LOW" : "MEDIUM",
                Details = $"Name: {sanitizedName}\nEmail: {sanitizedEmail}\nMessage: {sanitizedMessage}",
                ContactNumber = sanitizedPhone,
                SchoolId = null
            };

            await _unitOfWork.SupportTickets.AddAsync(ticket);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, message = "Inquiry submitted successfully." });
        }
    }

    public class SubmitInquiryRequest
    {
        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(150)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(1000, MinimumLength = 5)]
        public string Message { get; set; } = string.Empty;

        [StringLength(20)]
        public string? Phone { get; set; }

        public bool IsDemoRequest { get; set; }
    }

    public class CreatePublicOrderRequest
    {
        [Required]
        public string PlanType { get; set; } = "Standard";
    }

    public class RegisterPurchaseRequest
    {
        [Required]
        [StringLength(200, MinimumLength = 3)]
        public string SchoolName { get; set; } = string.Empty;

        [Required]
        [StringLength(300, MinimumLength = 5)]
        public string Address { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string City { get; set; } = string.Empty;

        [StringLength(150)]
        public string Website { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 2)]
        public string AdminName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [StringLength(150)]
        public string AdminEmail { get; set; } = string.Empty;

        [Required]
        [StringLength(20)]
        public string Phone { get; set; } = string.Empty;

        [Required]
        [StringLength(50)]
        public string PlanType { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string RazorpayPaymentId { get; set; } = string.Empty;

        [Required]
        [StringLength(100)]
        public string RazorpayOrderId { get; set; } = string.Empty;

        [Required]
        [StringLength(200)]
        public string RazorpaySignature { get; set; } = string.Empty;
    }
}
