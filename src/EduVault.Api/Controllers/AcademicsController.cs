using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Core.DTOs;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/academics")]
    [Authorize]
    public class AcademicsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;

        public AcademicsController(IUnitOfWork unitOfWork, IAuthService authService)
        {
            _unitOfWork = unitOfWork;
            _authService = authService;
        }

        private Guid GetSchoolId()
        {
            var schoolIdStr = User.FindFirst("schoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdStr)) throw new UnauthorizedAccessException("School ID missing in token");
            return Guid.Parse(schoolIdStr);
        }

        // --- Classes & Sections ---

        [HttpGet("classes")]
        public async Task<IActionResult> GetClasses()
        {
            var schoolId = GetSchoolId();
            var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var teachers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");

            var result = classes.Select(c => {
                var teacher = teachers.FirstOrDefault(t => t.Id == c.ClassTeacherId);
                var enrolledCount = _unitOfWork.Enrollments.FindAsync(e => e.ClassId == c.Id && e.Status == "ACTIVE").Result.Count();
                return new {
                    c.Id,
                    c.Grade,
                    c.Section,
                    c.Level,
                    c.Room,
                    c.Capacity,
                    Enrolled = enrolledCount,
                    Pct = c.Capacity > 0 ? (int)Math.Round((double)enrolledCount / c.Capacity * 100) : 0,
                    Teacher = teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : null,
                    Email = teacher?.Email
                };
            });

            return Ok(result);
        }

        [HttpPost("classes")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateClass([FromBody] CreateClassRequest request)
        {
            var schoolId = GetSchoolId();
            var existingClassList = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId && c.Grade == request.Grade && c.Section == request.Section);
            if (existingClassList.Any())
            {
                return BadRequest(new { error = "Class with this grade and section already exists" });
            }

            var newClass = new Class
            {
                SchoolId = schoolId,
                Grade = request.Grade,
                Section = request.Section,
                Level = request.Level,
                Room = request.Room,
                Capacity = request.Capacity
            };

            await _unitOfWork.Classes.AddAsync(newClass);
            await _unitOfWork.CompleteAsync();

            return Ok(newClass);
        }

        [HttpPost("classes/{id}/assign-teacher")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> AssignTeacher(Guid id, [FromBody] Guid teacherId)
        {
            var classObj = await _unitOfWork.Classes.GetByIdAsync(id);
            if (classObj == null) return NotFound(new { error = "Class not found" });

            // Verify teacher exists
            var teacher = await _unitOfWork.Teachers.GetByIdAsync(teacherId);
            if (teacher == null) return BadRequest(new { error = "Teacher not found" });

            classObj.ClassTeacherId = teacherId;
            _unitOfWork.Classes.Update(classObj);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        // --- Students ---

        [HttpGet("students")]
        public async Task<IActionResult> GetStudents()
        {
            var schoolId = GetSchoolId();
            var studentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
            var enrollments = await _unitOfWork.Enrollments.GetAllAsync();
            var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var studentsData = await _unitOfWork.Students.GetAllAsync();

            var result = studentUsers.Select(u => {
                var studentInfo = studentsData.FirstOrDefault(s => s.UserId == u.Id);
                var enrollment = enrollments.FirstOrDefault(e => e.StudentId == u.Id);
                var classObj = enrollment != null ? classes.FirstOrDefault(c => c.Id == enrollment.ClassId) : null;

                return new {
                    u.Id,
                    StudentId = studentInfo?.StudentId ?? string.Empty,
                    Name = $"{u.FirstName} {u.LastName}",
                    Email = u.Email,
                    Class = classObj != null ? $"Class {classObj.Grade}" : "Unassigned",
                    Section = classObj?.Section ?? "Unassigned",
                    Father = studentInfo?.GuardianName ?? string.Empty,
                    Status = enrollment?.Status ?? "ACTIVE"
                };
            });

            return Ok(result);
        }

        [HttpPost("students")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> OnboardStudent([FromBody] OnboardStudentRequest request)
        {
            var schoolId = GetSchoolId();
            var existingUser = (await _unitOfWork.Users.FindAsync(u => u.Email == request.Email)).FirstOrDefault();
            if (existingUser != null)
            {
                return BadRequest(new { error = "Email address already registered" });
            }

            // Verify Class exists
            var classObj = await _unitOfWork.Classes.GetByIdAsync(request.ClassId);
            if (classObj == null) return BadRequest(new { error = "Selected class not found" });

            // Create User Account
            var user = new User
            {
                SchoolId = schoolId,
                Email = request.Email,
                PasswordHash = _authService.HashPassword(request.Password),
                Role = "student",
                FirstName = request.FirstName,
                LastName = request.LastName,
                IsActive = true
            };
            await _unitOfWork.Users.AddAsync(user);

            // Create Student Profile
            var studentIdCode = $"STU-{DateTime.UtcNow.Year}-{new Random().Next(1000, 9999)}";
            var student = new Student
            {
                UserId = user.Id,
                StudentId = studentIdCode,
                BloodGroup = request.BloodGroup,
                GuardianName = request.GuardianName,
                GuardianPhone = request.GuardianPhone,
                GuardianRelationship = request.GuardianRelationship,
                Address = request.Address
            };
            await _unitOfWork.Students.AddAsync(student);

            // Create Enrollment
            var enrollment = new Enrollment
            {
                StudentId = user.Id,
                ClassId = request.ClassId,
                AcademicYear = $"{DateTime.UtcNow.Year}-{((DateTime.UtcNow.Year + 1) % 100):D2}",
                Status = "ACTIVE",
                EnrollDate = DateTime.UtcNow
            };
            await _unitOfWork.Enrollments.AddAsync(enrollment);

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, studentId = student.StudentId, userId = user.Id });
        }

        // --- Teachers ---

        [HttpGet("teachers")]
        public async Task<IActionResult> GetTeachers()
        {
            var schoolId = GetSchoolId();
            var teacherUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");
            var teachersData = await _unitOfWork.Teachers.GetAllAsync();
            var classSubjects = await _unitOfWork.ClassSubjects.GetAllAsync();
            var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);

            var result = teacherUsers.Select(u => {
                var teacherInfo = teachersData.FirstOrDefault(t => t.UserId == u.Id);
                var assignedClasses = classSubjects
                    .Where(cs => cs.TeacherId == u.Id)
                    .Select(cs => classes.FirstOrDefault(c => c.Id == cs.ClassId))
                    .Where(c => c != null)
                    .Select(c => $"{c!.Grade}-{c.Section}")
                    .Distinct();

                return new {
                    u.Id,
                    EmployeeId = teacherInfo?.EmployeeId ?? string.Empty,
                    Name = $"{u.FirstName} {u.LastName}",
                    Email = u.Email,
                    Phone = teacherInfo?.GuardianPhone ?? string.Empty, // Placeholder for contact
                    Department = teacherInfo?.Department ?? string.Empty,
                    Qualifications = teacherInfo?.Qualifications ?? string.Empty,
                    Joined = u.CreatedAt.ToString("MMM yyyy"),
                    Classes = string.Join(", ", assignedClasses),
                    Status = u.IsActive ? "Active" : "On Leave"
                };
            });

            return Ok(result);
        }

        [HttpPost("teachers")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> OnboardTeacher([FromBody] OnboardTeacherRequest request)
        {
            var schoolId = GetSchoolId();
            var existingUser = (await _unitOfWork.Users.FindAsync(u => u.Email == request.Email)).FirstOrDefault();
            if (existingUser != null)
            {
                return BadRequest(new { error = "Email address already registered" });
            }

            // Create User Account
            var user = new User
            {
                SchoolId = schoolId,
                Email = request.Email,
                PasswordHash = _authService.HashPassword(request.Password),
                Role = "teacher",
                FirstName = request.FirstName,
                LastName = request.LastName,
                IsActive = true
            };
            await _unitOfWork.Users.AddAsync(user);

            // Create Teacher Profile
            var employeeIdCode = $"T-{new Random().Next(1000, 9999)}";
            var teacher = new Teacher
            {
                UserId = user.Id,
                EmployeeId = employeeIdCode,
                Department = request.Department,
                OfficeLocation = request.OfficeLocation,
                Qualifications = request.Qualifications
            };
            await _unitOfWork.Teachers.AddAsync(teacher);

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, employeeId = teacher.EmployeeId, userId = user.Id });
        }
    }
}
