using System;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.DTOs;
using EduVault.Core.Entities;
using EduVault.Infrastructure.Data;
using EduVault.Api.Services;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/public")]
    [AllowAnonymous]
    public class PublicController : ControllerBase
    {
        private readonly EduVaultDbContext _context;
        private readonly AadhaarSecurityService _aadhaarService;
        private readonly QrCodeService _qrCodeService;

        public PublicController(
            EduVaultDbContext context,
            AadhaarSecurityService aadhaarService,
            QrCodeService qrCodeService)
        {
            _context = context;
            _aadhaarService = aadhaarService;
            _qrCodeService = qrCodeService;
        }

        // GET: /api/public/school/{schoolCode}
        [HttpGet("school/{schoolCode}")]
        [EnableRateLimiting("public-api")]
        public async Task<IActionResult> GetSchoolInfo(string schoolCode)
        {
            if (string.IsNullOrWhiteSpace(schoolCode))
            {
                return BadRequest(new { error = "School code is required." });
            }

            var normalizedCode = schoolCode.Trim().ToUpperInvariant();
            var school = await _context.Schools
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SchoolCode.ToUpper() == normalizedCode);

            if (school == null)
            {
                return NotFound(new { error = "School not found. Please verify the code or QR link." });
            }

            // Retrieve active classes from EnrollmentClasses (Name) and Classes (Grade)
            var enrollmentClassNames = await _context.EnrollmentClasses
                .AsNoTracking()
                .Where(e => e.SchoolId == school.Id && !string.IsNullOrWhiteSpace(e.Name))
                .Select(e => e.Name.Trim())
                .Distinct()
                .ToListAsync();

            var gradeNames = await _context.Classes
                .AsNoTracking()
                .Where(c => c.SchoolId == school.Id && !string.IsNullOrWhiteSpace(c.Grade))
                .Select(c => c.Grade.Trim())
                .Distinct()
                .ToListAsync();

            var availableClasses = enrollmentClassNames
                .Concat(gradeNames)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!availableClasses.Any())
            {
                // Sensible default grades if classes haven't been defined yet
                availableClasses = new()
                {
                    "Nursery", "LKG", "UKG",
                    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
                    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
                    "Class 11", "Class 12"
                };
            }
            else
            {
                // Sort classes naturally (Nursery, LKG, UKG, Class 1..12 or numeric)
                availableClasses = availableClasses
                    .OrderBy(c => {
                        var m = System.Text.RegularExpressions.Regex.Match(c, @"\d+");
                        return m.Success ? int.Parse(m.Value) : 0;
                    })
                    .ThenBy(c => c)
                    .ToList();
            }

            return Ok(new
            {
                id = school.Id,
                name = school.Name,
                schoolCode = school.SchoolCode,
                logoUrl = school.LogoUrl,
                themeColor = school.ThemeColor ?? "#2563eb",
                city = school.City,
                address = school.Address,
                website = school.Website,
                classes = availableClasses
            });
        }

        // POST: /api/public/admission/{schoolCode}
        [HttpPost("admission/{schoolCode}")]
        [EnableRateLimiting("admission-submit")]
        public async Task<IActionResult> SubmitAdmission(string schoolCode, [FromBody] PublicAdmissionDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var normalizedCode = schoolCode.Trim().ToUpperInvariant();
            var school = await _context.Schools
                .FirstOrDefaultAsync(s => s.SchoolCode.ToUpper() == normalizedCode);

            if (school == null)
            {
                return NotFound(new { error = "Invalid school code." });
            }

            // 1. Silent Honeypot Check (Catches automated submission bots)
            bool isBot = !string.IsNullOrWhiteSpace(dto.WebsiteUrl);

            // 2. Duplicate Detection (Phone + Target Class within last 30 days)
            var cleanPhone = dto.FatherPhone.Trim().Replace(" ", "").Replace("-", "");
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            var existingRecent = await _context.AdmissionInquiries
                .AsNoTracking()
                .Where(a => a.SchoolId == school.Id &&
                            a.FatherPhone == cleanPhone &&
                            a.TargetClass == dto.TargetClass &&
                            a.CreatedAt > thirtyDaysAgo)
                .FirstOrDefaultAsync();

            if (existingRecent != null && !isBot)
            {
                return Conflict(new
                {
                    error = "An application with this contact number has already been registered recently.",
                    applicationId = existingRecent.ApplicationId,
                    submittedAt = existingRecent.CreatedAt,
                    status = existingRecent.Status,
                    message = $"An application ({existingRecent.ApplicationId}) is already under review for {existingRecent.ChildName}."
                });
            }

            // 3. Aadhaar Security (Optional - Encrypted + SHA-256 Hashed + Masked)
            string? aadhaarHash = null;
            string? aadhaarEncrypted = null;
            string? aadhaarLastFour = null;

            if (!string.IsNullOrWhiteSpace(dto.AadhaarNumber))
            {
                aadhaarHash = _aadhaarService.ComputeHash(dto.AadhaarNumber);
                aadhaarEncrypted = _aadhaarService.Encrypt(dto.AadhaarNumber);
                aadhaarLastFour = _aadhaarService.GetLastFour(dto.AadhaarNumber);
            }

            // 4. Generate Memorable Application ID
            var year = DateTime.UtcNow.Year;
            var randNum = RandomNumberGenerator.GetInt32(1000, 9999);
            var appId = $"ADM-{year}-{randNum}";

            // 5. Compile Display Fields
            var fullName = $"{dto.ChildFirstName} {(string.IsNullOrWhiteSpace(dto.ChildMiddleName) ? "" : dto.ChildMiddleName + " ")}{dto.ChildLastName}".Trim();
            var fullAddress = $"{dto.HouseNo} {dto.StreetOrVillage}, {dto.City}, {dto.State} - {dto.Pincode}".Trim();

            // Extract client metadata for audit and abuse tracking
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var ua = HttpContext.Request.Headers["User-Agent"].ToString();

            var entry = new AdmissionInquiryEntry
            {
                SchoolId = school.Id,
                ChildName = fullName,
                TargetClass = dto.TargetClass,
                ParentName = dto.FatherName,
                Phone = cleanPhone,
                Address = fullAddress,
                Notes = $"Self-registered via Mobile QR Code on {DateTime.UtcNow:dd MMM yyyy}.",
                Status = "Inquiry",
                CreatedAt = DateTime.UtcNow,

                // Origin & App Id
                Source = "qr_form",
                ApplicationId = appId,

                // Student Details
                ChildFirstName = dto.ChildFirstName.Trim(),
                ChildMiddleName = dto.ChildMiddleName?.Trim(),
                ChildLastName = dto.ChildLastName.Trim(),
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender,
                Category = dto.Category,
                BloodGroup = dto.BloodGroup,
                Religion = dto.Religion,
                MotherTongue = dto.MotherTongue,
                Nationality = dto.Nationality ?? "Indian",
                PlaceOfBirth = dto.PlaceOfBirth,

                // Aadhaar
                AadhaarHash = aadhaarHash,
                AadhaarEncrypted = aadhaarEncrypted,
                AadhaarLastFour = aadhaarLastFour,

                // Parents
                FatherName = dto.FatherName.Trim(),
                FatherPhone = cleanPhone,
                FatherOccupation = dto.FatherOccupation,
                FatherQualification = dto.FatherQualification,
                MotherName = dto.MotherName,
                MotherPhone = dto.MotherPhone,
                MotherOccupation = dto.MotherOccupation,
                GuardianEmail = dto.FatherEmail,
                AnnualFamilyIncome = dto.AnnualFamilyIncome,

                // Address
                HouseNo = dto.HouseNo,
                StreetOrVillage = dto.StreetOrVillage,
                City = dto.City,
                District = dto.District,
                State = dto.State,
                Pincode = dto.Pincode,

                // Previous School
                PreviousSchoolName = dto.PreviousSchoolName,
                PreviousBoard = dto.PreviousBoard,
                PreviousClassStudied = dto.PreviousClassStudied,
                PreviousTcNumber = dto.PreviousTcNumber,
                PreviousTcDate = dto.PreviousTcDate,
                LastExamPercentage = dto.LastExamPercentage,
                ReasonForLeaving = dto.ReasonForLeaving,

                // Medical
                HeightCm = dto.HeightCm,
                WeightKg = dto.WeightKg,
                HasDisability = dto.HasDisability,
                DisabilityType = dto.DisabilityType,
                ChronicIllness = dto.ChronicIllness,
                CurrentMedication = dto.CurrentMedication,
                EmergencyContactName = dto.EmergencyContactName,
                EmergencyContactPhone = dto.EmergencyContactPhone,
                EmergencyContactRelation = dto.EmergencyContactRelation,

                // Security metadata
                IpAddress = ip,
                UserAgent = ua?.Length > 250 ? ua.Substring(0, 250) : ua,
                IsHoneypotFlagged = isBot
            };

            await _context.AdmissionInquiries.AddAsync(entry);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                applicationId = appId,
                childName = fullName,
                schoolName = school.Name,
                targetClass = entry.TargetClass,
                submittedAt = entry.CreatedAt,
                message = "Application submitted successfully! Please keep your Application ID for reference."
            });
        }

        // GET: /api/public/admission/qr-code/{schoolCode}
        [HttpGet("admission/qr-code/{schoolCode}")]
        [EnableRateLimiting("public-api")]
        public async Task<IActionResult> GetQrCode(string schoolCode)
        {
            if (string.IsNullOrWhiteSpace(schoolCode))
            {
                return BadRequest(new { error = "School code is required." });
            }

            var normalizedCode = schoolCode.Trim().ToUpperInvariant();
            var school = await _context.Schools
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.SchoolCode.ToUpper() == normalizedCode);

            if (school == null)
            {
                return NotFound(new { error = "School not found." });
            }

            // Derive host URL from incoming request or fallback
            var origin = $"{Request.Scheme}://{Request.Host}";
            var applyUrl = $"{origin}/apply/{school.SchoolCode}";

            var qrPngBytes = _qrCodeService.GeneratePng(applyUrl, 12);
            return File(qrPngBytes, "image/png", $"admission-qr-{school.SchoolCode}.png");
        }
    }
}
