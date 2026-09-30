using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Api.Services;
using EduVault.Core.Entities;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/school-admin/import")]
    [Authorize(Roles = "schooladmin,superadmin")]
    public class DataImportController : ControllerBase
    {
        private readonly EduVaultDbContext _context;
        private readonly SmartCsvParserService _csvParser;
        private readonly CsvTemplateService _templateService;
        private readonly AuthService _authService;

        public DataImportController(
            EduVaultDbContext context,
            SmartCsvParserService csvParser,
            CsvTemplateService templateService,
            AuthService authService)
        {
            _context = context;
            _csvParser = csvParser;
            _templateService = templateService;
            _authService = authService;
        }

        private Guid GetSchoolId()
        {
            var claim = User.FindFirst("schoolId")?.Value;
            if (Guid.TryParse(claim, out var schoolId)) return schoolId;
            throw new UnauthorizedAccessException("Valid school context is required.");
        }

        // GET: /api/school-admin/import/templates/{type}
        [HttpGet("templates/{type}")]
        public IActionResult DownloadTemplate(string type)
        {
            var (bytes, fileName) = _templateService.GenerateTemplate(type);
            return File(bytes, "text/csv", fileName);
        }

        // POST: /api/school-admin/import/preview/{type}
        [HttpPost("preview/{type}")]
        public IActionResult PreviewCsv([FromRoute] string type, IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "Please provide a valid CSV file." });
            }

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".csv" && ext != ".txt")
            {
                return BadRequest(new { error = "Only CSV files are supported." });
            }

            using var stream = file.OpenReadStream();
            var result = _csvParser.ParseAndMapCsv(stream, type);

            return Ok(new
            {
                success = true,
                importType = type,
                fileName = file.FileName,
                originalHeaders = result.OriginalHeaders,
                columnMappings = result.ColumnMappings,
                totalRows = result.TotalRows,
                validRows = result.ValidRowCount,
                invalidRows = result.InvalidRowCount,
                errors = result.ValidationErrors.Take(20).ToList(),
                previewRows = result.Rows.Take(25).ToList()
            });
        }

        // POST: /api/school-admin/import/execute/{type}
        [HttpPost("execute/{type}")]
        public async Task<IActionResult> ExecuteImport([FromRoute] string type, [FromBody] ExecuteImportRequest request)
        {
            var schoolId = GetSchoolId();

            if (request.Rows == null || !request.Rows.Any())
            {
                return BadRequest(new { error = "No rows provided for import." });
            }

            int successCount = 0;
            int errorCount = 0;
            var errors = new List<string>();
            var normalizedType = (type ?? "students").Trim().ToLowerInvariant();

            var school = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schoolId);
            var schoolName = school?.Name ?? "School";

            string GetColVal(Dictionary<string, string> row, string targetField)
            {
                var origCol = request.ColumnMappings?.FirstOrDefault(m => m.Value.Equals(targetField, StringComparison.OrdinalIgnoreCase)).Key;
                if (origCol != null && row.TryGetValue(origCol, out var val) && !string.IsNullOrWhiteSpace(val))
                {
                    return val.Trim();
                }
                if (row.TryGetValue(targetField, out var directVal) && !string.IsNullOrWhiteSpace(directVal))
                {
                    return directVal.Trim();
                }
                return string.Empty;
            }

            if (normalizedType is "students" or "student")
            {
                var yr = DateTime.UtcNow.Year;

                for (int i = 0; i < request.Rows.Count; i++)
                {
                    var row = request.Rows[i];
                    var firstName = GetColVal(row, "FirstName");
                    var lastName = GetColVal(row, "LastName");

                    // Handle single name column splitting
                    if (string.IsNullOrWhiteSpace(firstName))
                    {
                        errorCount++;
                        errors.Add($"Row {i + 1}: Missing First Name.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(lastName))
                    {
                        lastName = "Scholar";
                    }

                    var rawGrade = GetColVal(row, "Class");
                    var grade = ClassNormalizationHelper.NormalizeGrade(rawGrade);

                    var rawSection = GetColVal(row, "Section");
                    var section = ClassNormalizationHelper.NormalizeSection(rawSection);

                    var rollNo = GetColVal(row, "RollNumber");
                    var admNo = GetColVal(row, "AdmissionNo");
                    if (string.IsNullOrWhiteSpace(admNo))
                    {
                        admNo = $"STU-{yr}-{RandomNumberGenerator.GetInt32(1000, 9999)}";
                    }

                    // Find or create class with normalization
                    var classEntity = await _context.Classes.FirstOrDefaultAsync(c =>
                        c.SchoolId == schoolId &&
                        (c.Grade.ToLower() == grade.ToLower() || c.Grade.ToLower() == ("class " + grade.ToLower())) &&
                        (c.Section.ToLower() == section.ToLower() || c.Section.ToLower() == ("section " + section.ToLower())));

                    if (classEntity == null)
                    {
                        classEntity = new Class
                        {
                            SchoolId = schoolId,
                            Grade = grade,
                            Section = section,
                            Level = "Primary Education",
                            Room = $"Room {grade}",
                            Capacity = 40
                        };
                        await _context.Classes.AddAsync(classEntity);
                        await _context.SaveChangesAsync();
                    }

                    // DUPLICATE STUDENT CHECK: Check by AdmissionNumber in this school
                    if (!string.IsNullOrWhiteSpace(admNo))
                    {
                        var existingStudent = await _context.Students
                            .Include(s => s.User)
                            .FirstOrDefaultAsync(s => s.User.SchoolId == schoolId && s.AdmissionNumber.ToLower() == admNo.ToLower());

                        if (existingStudent != null)
                        {
                            // Update existing student and active enrollment instead of creating duplicates
                            existingStudent.FatherName = !string.IsNullOrWhiteSpace(GetColVal(row, "FatherName")) ? GetColVal(row, "FatherName") : existingStudent.FatherName;
                            existingStudent.FatherPhone = !string.IsNullOrWhiteSpace(GetColVal(row, "FatherPhone")) ? GetColVal(row, "FatherPhone") : existingStudent.FatherPhone;
                            existingStudent.MotherName = !string.IsNullOrWhiteSpace(GetColVal(row, "MotherName")) ? GetColVal(row, "MotherName") : existingStudent.MotherName;
                            existingStudent.Address = !string.IsNullOrWhiteSpace(GetColVal(row, "Address")) ? GetColVal(row, "Address") : existingStudent.Address;
                            existingStudent.City = !string.IsNullOrWhiteSpace(GetColVal(row, "City")) ? GetColVal(row, "City") : existingStudent.City;
                            existingStudent.Pincode = !string.IsNullOrWhiteSpace(GetColVal(row, "Pincode")) ? GetColVal(row, "Pincode") : existingStudent.Pincode;

                            var existingEnroll = await _context.Enrollments.FirstOrDefaultAsync(e => e.StudentId == existingStudent.UserId && e.Status == "ACTIVE");
                            if (existingEnroll != null)
                            {
                                existingEnroll.ClassId = classEntity.Id;
                            }
                            successCount++;
                            continue;
                        }
                    }

                    var email = GetColVal(row, "Email");
                    if (string.IsNullOrWhiteSpace(email))
                    {
                        var cleanSlug = $"{firstName.ToLowerInvariant().Replace(" ", "")}.{admNo.ToLowerInvariant().Replace("-", "")}";
                        email = $"{cleanSlug}@eduvault.edu";
                    }

                    // Ensure unique email
                    var existingUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower());
                    if (existingUser != null)
                    {
                        email = $"{email.Split('@')[0]}_{RandomNumberGenerator.GetInt32(10, 99)}@{email.Split('@')[1]}";
                    }

                    // Generate dynamic password using school-configured pattern
                    var dobVal = GetColVal(row, "DateOfBirth");
                    var generatedPassword = PasswordRuleHelper.GeneratePassword(
                        school?.StudentPasswordPattern,
                        "student",
                        firstName,
                        lastName,
                        dobVal,
                        schoolName);
                    var userPasswordHash = _authService.HashPassword(generatedPassword);

                    var user = new User
                    {
                        SchoolId = schoolId,
                        Email = email,
                        PasswordHash = userPasswordHash,
                        Role = "student",
                        FirstName = firstName,
                        LastName = lastName,
                        IsActive = true
                    };
                    await _context.Users.AddAsync(user);
                    await _context.SaveChangesAsync();

                    var student = new Student
                    {
                        UserId = user.Id,
                        StudentId = admNo,
                        AdmissionNumber = admNo,
                        AdmissionDate = DateTime.UtcNow,
                        AdmissionSource = request.SourceName ?? "csv_import",
                        DateOfBirth = dobVal,
                        Gender = GetColVal(row, "Gender"),
                        Category = GetColVal(row, "Category"),
                        BloodGroup = GetColVal(row, "BloodGroup"),
                        FatherName = GetColVal(row, "FatherName"),
                        FatherPhone = GetColVal(row, "FatherPhone"),
                        MotherName = GetColVal(row, "MotherName"),
                        GuardianPhone = GetColVal(row, "GuardianPhone"),
                        Address = GetColVal(row, "Address"),
                        City = GetColVal(row, "City"),
                        State = GetColVal(row, "State"),
                        Pincode = GetColVal(row, "Pincode"),
                        AadhaarNumber = GetColVal(row, "AadhaarNumber"),
                        PreviousSchoolName = GetColVal(row, "PreviousSchool"),
                        FeeCategory = GetColVal(row, "FeeCategory")
                    };
                    await _context.Students.AddAsync(student);

                    var enrollment = new Enrollment
                    {
                        StudentId = user.Id,
                        ClassId = classEntity.Id,
                        AcademicYear = $"{yr}-{((yr + 1) % 100):D2}",
                        Status = "ACTIVE",
                        EnrollDate = DateTime.UtcNow
                    };
                    await _context.Enrollments.AddAsync(enrollment);

                    successCount++;
                }

                await _context.SaveChangesAsync();
            }
            else if (normalizedType is "teachers" or "teacher")
            {
                var yr = DateTime.UtcNow.Year;

                for (int i = 0; i < request.Rows.Count; i++)
                {
                    var row = request.Rows[i];
                    var firstName = GetColVal(row, "FirstName");
                    var lastName = GetColVal(row, "LastName");

                    if (string.IsNullOrWhiteSpace(firstName))
                    {
                        errorCount++;
                        errors.Add($"Row {i + 1}: Missing Teacher First Name.");
                        continue;
                    }

                    if (string.IsNullOrWhiteSpace(lastName)) lastName = "Educator";

                    var empCode = GetColVal(row, "EmployeeCode");
                    if (string.IsNullOrWhiteSpace(empCode))
                    {
                        empCode = $"EMP-T-{RandomNumberGenerator.GetInt32(100, 999)}";
                    }

                    var email = GetColVal(row, "Email");
                    if (string.IsNullOrWhiteSpace(email))
                    {
                        email = $"{firstName.ToLowerInvariant()}.{empCode.ToLowerInvariant()}@school.edu";
                    }

                    // DUPLICATE TEACHER CHECK: Check if email already exists
                    var existingTeacherUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.SchoolId == schoolId && u.Email.ToLower() == email.ToLower());
                    if (existingTeacherUser != null)
                    {
                        // Teacher with this email already exists, skip duplicate insertion
                        successCount++;
                        continue;
                    }

                    // Generate dynamic password using school-configured pattern
                    var teacherDob = GetColVal(row, "DateOfBirth");
                    var generatedTeacherPassword = PasswordRuleHelper.GeneratePassword(
                        school?.TeacherPasswordPattern,
                        "teacher",
                        firstName,
                        lastName,
                        teacherDob,
                        schoolName);
                    var teacherPasswordHash = _authService.HashPassword(generatedTeacherPassword);

                    var user = new User
                    {
                        SchoolId = schoolId,
                        Email = email,
                        PasswordHash = teacherPasswordHash,
                        Role = "teacher",
                        FirstName = firstName,
                        LastName = lastName,
                        IsActive = true
                    };
                    await _context.Users.AddAsync(user);
                    await _context.SaveChangesAsync();

                    var teacher = new Teacher
                    {
                        UserId = user.Id,
                        EmployeeId = empCode,
                        Department = GetColVal(row, "Department") ?? "Academics",
                        Qualifications = GetColVal(row, "Qualification") ?? "B.Ed",
                        Specialization = GetColVal(row, "Subjects") ?? "General Studies",
                        OfficeLocation = "Staff Room",
                        Salary = decimal.TryParse(GetColVal(row, "BaseSalary"), out var sal) ? sal : 35000,
                        DateOfBirth = GetColVal(row, "DateOfBirth") ?? ""
                    };
                    await _context.Teachers.AddAsync(teacher);

                    successCount++;
                }

                await _context.SaveChangesAsync();
            }
            else
            {
                return BadRequest(new { error = $"Import type '{type}' is not yet supported for direct ingestion." });
            }

            // Record in audit log
            var log = new DataImportLog
            {
                SchoolId = schoolId,
                ImportType = type,
                SourceName = request.SourceName ?? "CSV Import",
                TotalRecords = request.Rows.Count,
                SuccessCount = successCount,
                ErrorCount = errorCount,
                Status = errorCount == 0 ? "Completed" : (successCount > 0 ? "Partial" : "Failed"),
                ErrorSummary = errors.Any() ? string.Join("; ", errors.Take(5)) : null,
                ImportedAt = DateTime.UtcNow,
                ImportedBy = User.FindFirst("firstName")?.Value ?? "School Admin"
            };
            await _context.DataImportLogs.AddAsync(log);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                importId = log.Id,
                totalProcessed = request.Rows.Count,
                successCount,
                errorCount,
                status = log.Status,
                errors
            });
        }

        // GET: /api/school-admin/import/history
        [HttpGet("history")]
        public async Task<IActionResult> GetImportHistory()
        {
            var schoolId = GetSchoolId();
            var logs = await _context.DataImportLogs
                .AsNoTracking()
                .Where(l => l.SchoolId == schoolId)
                .OrderByDescending(l => l.ImportedAt)
                .Take(50)
                .Select(l => new
                {
                    id = l.Id,
                    importType = l.ImportType,
                    sourceName = l.SourceName,
                    totalRecords = l.TotalRecords,
                    successCount = l.SuccessCount,
                    errorCount = l.ErrorCount,
                    status = l.Status,
                    errorSummary = l.ErrorSummary,
                    importedAt = l.ImportedAt,
                    importedBy = l.ImportedBy
                })
                .ToListAsync();

            return Ok(logs);
        }
    }

    public class ExecuteImportRequest
    {
        public string? SourceName { get; set; } = "CSV File";
        public Dictionary<string, string>? ColumnMappings { get; set; }
        public List<Dictionary<string, string>> Rows { get; set; } = new();
    }
}
