using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Core.DTOs;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/academics")]
    [Authorize]
    public class AcademicsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;
        private readonly EduVaultDbContext _context;

        public AcademicsController(IUnitOfWork unitOfWork, IAuthService authService, EduVaultDbContext context)
        {
            _unitOfWork = unitOfWork;
            _authService = authService;
            _context = context;
        }

        private Guid GetSchoolId()
        {
            var schoolIdStr = User.FindFirst("schoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdStr)) throw new UnauthorizedAccessException("School ID missing in token");
            return Guid.Parse(schoolIdStr);
        }


        private Guid GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) throw new UnauthorizedAccessException("User ID missing in token");
            return Guid.Parse(userIdStr);
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
                    Email = teacher?.Email,
                    TeacherId = c.ClassTeacherId,
                    AreMarksPublished = c.AreMarksPublished
                };
            });

            return Ok(result);
        }

        [HttpGet("enrollment-classes")]
        public async Task<IActionResult> GetEnrollmentClasses()
        {
            var schoolId = GetSchoolId();
            var enrollmentClasses = await _unitOfWork.EnrollmentClasses.FindAsync(c => c.SchoolId == schoolId);
            var sorted = enrollmentClasses
                .Select(c => {
                    var parts = c.Name.Split(' ');
                    int num = 0;
                    if (parts.Length > 1 && int.TryParse(parts[1], out int parsed))
                    {
                        num = parsed;
                    }
                    return new { Entity = c, Num = num };
                })
                .OrderBy(x => x.Num)
                .Select(x => new { x.Entity.Id, Name = x.Entity.Name })
                .ToList();

            return Ok(sorted);
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

        [HttpPost("classes/{id}/toggle-marks-publication")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> ToggleMarksPublication(Guid id, [FromBody] bool publish)
        {
            var classObj = await _unitOfWork.Classes.GetByIdAsync(id);
            if (classObj == null) return NotFound(new { error = "Class not found" });

            classObj.AreMarksPublished = publish;
            _unitOfWork.Classes.Update(classObj);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, areMarksPublished = publish });
        }

        [HttpPost("classes/{id}/deny-marks")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DenyMarks(Guid id, [FromBody] DenyMarksRequest request)
        {
            var classObj = await _unitOfWork.Classes.GetByIdAsync(id);
            if (classObj == null) return NotFound(new { error = "Class not found" });

            classObj.AreMarksPublished = false;
            _unitOfWork.Classes.Update(classObj);
            await _unitOfWork.CompleteAsync();

            return Ok(new { 
                success = true, 
                classTeacherId = classObj.ClassTeacherId?.ToString(),
                className = $"Class {classObj.Grade} - {classObj.Section}"
            });
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
                    ClassId = classObj?.Id,
                    Father = studentInfo?.GuardianName ?? string.Empty,
                    GuardianPhone = studentInfo?.GuardianPhone ?? string.Empty,
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

            // Verify Class exists or resolve from EnrollmentClass
            Class? classObj = await _unitOfWork.Classes.GetByIdAsync(request.ClassId);
            if (classObj == null)
            {
                var enrollmentClassObj = await _unitOfWork.EnrollmentClasses.GetByIdAsync(request.ClassId);
                if (enrollmentClassObj != null)
                {
                    var gradeVal = enrollmentClassObj.Name.Replace("Class ", "").Trim();
                    var schoolClasses = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId && c.Grade == gradeVal && c.Section == "Section A");
                    classObj = schoolClasses.FirstOrDefault();

                    if (classObj == null)
                    {
                        classObj = new Class
                        {
                            SchoolId = schoolId,
                            Grade = gradeVal,
                            Section = "Section A",
                            Level = int.TryParse(gradeVal, out int gNum) && gNum >= 9 ? "Secondary Education" : "Primary Education",
                            Room = $"Room {gradeVal}A",
                            Capacity = 30
                        };
                        await _unitOfWork.Classes.AddAsync(classObj);
                        await _unitOfWork.CompleteAsync();
                    }
                }
            }

            if (classObj == null) return BadRequest(new { error = "Selected class not found" });

            // Check student capacity
            var enrolledCount = (await _unitOfWork.Enrollments.FindAsync(e => e.ClassId == classObj.Id && e.Status == "ACTIVE")).Count();
            if (enrolledCount >= classObj.Capacity)
            {
                var otherSections = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId && c.Grade == classObj.Grade && c.Id != classObj.Id);
                var suggestionsList = otherSections
                    .Select(c => {
                        var count = _unitOfWork.Enrollments.FindAsync(e => e.ClassId == c.Id && e.Status == "ACTIVE").Result.Count();
                        return new { c, count };
                    })
                    .Where(x => x.count < x.c.Capacity)
                    .Select(x => $"Class {x.c.Grade} - {x.c.Section} (Room {x.c.Room})")
                    .ToList();

                var suggestionText = suggestionsList.Any() 
                    ? $" Try enrolling in: {string.Join(", ", suggestionsList)}."
                    : " Please set up a new section/room for this grade.";

                return BadRequest(new { error = $"Class {classObj.Grade} - {classObj.Section} (Room {classObj.Room}) is at full capacity ({classObj.Capacity} students).{suggestionText}" });
            }

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
                ClassId = classObj.Id,
                AcademicYear = $"{DateTime.UtcNow.Year}-{((DateTime.UtcNow.Year + 1) % 100):D2}",
                Status = "ACTIVE",
                EnrollDate = DateTime.UtcNow
            };
            await _unitOfWork.Enrollments.AddAsync(enrollment);

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, studentId = student.StudentId, userId = user.Id });
        }

        [HttpGet("students/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> GetStudent(Guid id)
        {
            var schoolId = GetSchoolId();
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.SchoolId != schoolId || user.Role != "student")
            {
                return NotFound(new { error = "Student not found" });
            }

            var student = await _unitOfWork.Students.GetByIdAsync(id);
            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == id)).FirstOrDefault();

            return Ok(new {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                StudentId = student?.StudentId,
                BloodGroup = student?.BloodGroup,
                GuardianName = student?.GuardianName,
                GuardianPhone = student?.GuardianPhone,
                GuardianRelationship = student?.GuardianRelationship,
                Address = student?.Address,
                ClassId = enrollment?.ClassId,
                Status = enrollment?.Status ?? "ACTIVE"
            });
        }

        [HttpPut("students/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> UpdateStudent(Guid id, [FromBody] UpdateStudentRequest request)
        {
            var schoolId = GetSchoolId();
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.SchoolId != schoolId || user.Role != "student")
            {
                return NotFound(new { error = "Student not found" });
            }

            var emailCollision = (await _unitOfWork.Users.FindAsync(u => u.Email == request.Email && u.Id != id)).FirstOrDefault();
            if (emailCollision != null)
            {
                return BadRequest(new { error = "Email is already in use by another user" });
            }

            Class? classObj = await _unitOfWork.Classes.GetByIdAsync(request.ClassId);
            if (classObj == null || classObj.SchoolId != schoolId)
            {
                return BadRequest(new { error = "Selected class not found" });
            }

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.Email = request.Email;
            if (!string.IsNullOrEmpty(request.Password))
            {
                user.PasswordHash = _authService.HashPassword(request.Password);
            }
            _unitOfWork.Users.Update(user);

            var student = await _unitOfWork.Students.GetByIdAsync(id);
            if (student == null)
            {
                student = new Student { UserId = id };
                await _unitOfWork.Students.AddAsync(student);
            }
            student.BloodGroup = request.BloodGroup;
            student.GuardianName = request.GuardianName;
            student.GuardianPhone = request.GuardianPhone;
            student.GuardianRelationship = request.GuardianRelationship;
            student.Address = request.Address;
            _unitOfWork.Students.Update(student);

            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == id)).FirstOrDefault();
            if (enrollment == null)
            {
                enrollment = new Enrollment
                {
                    StudentId = id,
                    ClassId = request.ClassId,
                    AcademicYear = $"{DateTime.UtcNow.Year}-{((DateTime.UtcNow.Year + 1) % 100):D2}",
                    Status = request.Status,
                    EnrollDate = DateTime.UtcNow
                };
                await _unitOfWork.Enrollments.AddAsync(enrollment);
            }
            else
            {
                enrollment.ClassId = request.ClassId;
                enrollment.Status = request.Status;
                _unitOfWork.Enrollments.Update(enrollment);
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("students/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteStudent(Guid id)
        {
            var schoolId = GetSchoolId();
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.SchoolId != schoolId || user.Role != "student")
            {
                return NotFound(new { error = "Student not found" });
            }

            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == id)).FirstOrDefault();
            if (enrollment != null)
            {
                _unitOfWork.Enrollments.Remove(enrollment);
            }

            var student = await _unitOfWork.Students.GetByIdAsync(id);
            if (student != null)
            {
                _unitOfWork.Students.Remove(student);
            }

            _unitOfWork.Users.Remove(user);

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
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
                    Phone = "N/A", // Placeholder for contact
                    Department = teacherInfo?.Department ?? string.Empty,
                    Qualifications = teacherInfo?.Qualifications ?? string.Empty,
                    Specialization = teacherInfo?.Specialization ?? string.Empty,
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
                Qualifications = request.Qualifications,
                Specialization = request.Specialization
            };
            await _unitOfWork.Teachers.AddAsync(teacher);

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, employeeId = teacher.EmployeeId, userId = user.Id });
        }

        [HttpGet("teachers/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> GetTeacher(Guid id)
        {
            var schoolId = GetSchoolId();
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.SchoolId != schoolId || user.Role != "teacher")
            {
                return NotFound(new { error = "Teacher not found" });
            }

            var teacher = await _unitOfWork.Teachers.GetByIdAsync(id);

            return Ok(new {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                EmployeeId = teacher?.EmployeeId,
                Department = teacher?.Department,
                OfficeLocation = teacher?.OfficeLocation,
                Qualifications = teacher?.Qualifications,
                Specialization = teacher?.Specialization,
                IsActive = user.IsActive
            });
        }

        [HttpPut("teachers/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> UpdateTeacher(Guid id, [FromBody] UpdateTeacherRequest request)
        {
            var schoolId = GetSchoolId();
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.SchoolId != schoolId || user.Role != "teacher")
            {
                return NotFound(new { error = "Teacher not found" });
            }

            var emailCollision = (await _unitOfWork.Users.FindAsync(u => u.Email == request.Email && u.Id != id)).FirstOrDefault();
            if (emailCollision != null)
            {
                return BadRequest(new { error = "Email is already in use by another user" });
            }

            user.FirstName = request.FirstName;
            user.LastName = request.LastName;
            user.Email = request.Email;
            user.IsActive = request.IsActive;
            if (!string.IsNullOrEmpty(request.Password))
            {
                user.PasswordHash = _authService.HashPassword(request.Password);
            }
            _unitOfWork.Users.Update(user);

            var teacher = await _unitOfWork.Teachers.GetByIdAsync(id);
            if (teacher == null)
            {
                teacher = new Teacher { UserId = id, EmployeeId = $"T-{new Random().Next(1000, 9999)}" };
                await _unitOfWork.Teachers.AddAsync(teacher);
            }
            teacher.Department = request.Department;
            teacher.OfficeLocation = request.OfficeLocation;
            teacher.Qualifications = request.Qualifications;
            teacher.Specialization = request.Specialization;
            _unitOfWork.Teachers.Update(teacher);

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("teachers/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteTeacher(Guid id)
        {
            var schoolId = GetSchoolId();
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null || user.SchoolId != schoolId || user.Role != "teacher")
            {
                return NotFound(new { error = "Teacher not found" });
            }

            // Remove class advisory assignments
            var advisedClasses = await _unitOfWork.Classes.FindAsync(c => c.ClassTeacherId == id);
            foreach (var c in advisedClasses)
            {
                c.ClassTeacherId = null;
                _unitOfWork.Classes.Update(c);
            }

            // Remove subject teacher assignments
            var classSubjects = await _unitOfWork.ClassSubjects.FindAsync(cs => cs.TeacherId == id);
            foreach (var cs in classSubjects)
            {
                _unitOfWork.ClassSubjects.Remove(cs);
            }

            var teacher = await _unitOfWork.Teachers.GetByIdAsync(id);
            if (teacher != null)
            {
                _unitOfWork.Teachers.Remove(teacher);
            }

            _unitOfWork.Users.Remove(user);

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpGet("stats")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> GetStats()
        {
            var schoolId = GetSchoolId();
            
            var totalStudents = (await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student")).Count();
            var totalTeachers = (await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher")).Count();
            var totalClasses = (await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId)).Count();

            // Fetch pending fees
            var studentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
            var studentIds = studentUsers.Select(u => u.Id).ToList();
            var invoices = await _unitOfWork.Invoices.GetAllAsync();
            var pendingFees = invoices
                .Where(i => studentIds.Contains(i.StudentId) && i.Status != "Paid")
                .Sum(i => i.Amount);

            // Fetch recent admissions
            var recentAdmissions = studentUsers
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .Select(u => new {
                    Name = $"{u.FirstName} {u.LastName}",
                    Email = u.Email,
                    CreatedAt = u.CreatedAt
                });

            return Ok(new
            {
                totalStudents,
                totalTeachers,
                totalClasses,
                pendingFees,
                recentAdmissions
            });
        }

        [HttpGet("teacher/stats")]
        [Authorize(Roles = "teacher")]
        public async Task<IActionResult> GetTeacherStats()
        {
            var userId = GetUserId();
            var schoolId = GetSchoolId();

            var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var classSubjects = await _unitOfWork.ClassSubjects.FindAsync(cs => cs.TeacherId == userId);
            
            var assignedClassIds = classSubjects.Select(cs => cs.ClassId)
                .Concat(classes.Where(c => c.ClassTeacherId == userId).Select(c => c.Id))
                .Distinct()
                .ToList();

            var totalClasses = assignedClassIds.Count;

            var enrollments = await _unitOfWork.Enrollments.GetAllAsync();
            var enrolledStudentIds = enrollments
                .Where(e => assignedClassIds.Contains(e.ClassId) && e.Status == "ACTIVE")
                .Select(e => e.StudentId)
                .Distinct()
                .ToList();

            var totalStudents = enrolledStudentIds.Count;

            var exams = await _unitOfWork.Exams.FindAsync(e => assignedClassIds.Contains(e.ClassId));
            var examIds = exams.Select(e => e.Id).ToList();

            var examResults = await _unitOfWork.ExamResults.GetAllAsync();
            var pendingReviews = examResults
                .Where(r => examIds.Contains(r.ExamId) && !r.IsSubmitted)
                .Select(r => r.ExamId)
                .Distinct()
                .Count();

            var myClassesToday = classes
                .Where(c => assignedClassIds.Contains(c.Id))
                .Select(c => $"Class {c.Grade} - {c.Section}")
                .FirstOrDefault() ?? "No class today";

            // Enrolled students distribution across teacher's classes
            var classEnrollments = new List<object>();
            foreach (var classId in assignedClassIds)
            {
                var c = classes.FirstOrDefault(cl => cl.Id == classId);
                if (c != null)
                {
                    var count = enrollments.Count(e => e.ClassId == classId && e.Status == "ACTIVE");
                    classEnrollments.Add(new { className = $"Class {c.Grade}-{c.Section}", count });
                }
            }

            // Teacher Salary details
            var teacherProfile = await _unitOfWork.Teachers.GetByIdAsync(userId);
            var salary = teacherProfile?.Salary ?? 55000m;

            var salaryHistory = new List<object>();
            for (int i = 5; i >= 0; i--)
            {
                var targetDate = DateTime.UtcNow.AddMonths(-i);
                salaryHistory.Add(new
                {
                    month = targetDate.ToString("MMM"),
                    baseSalary = Math.Round(salary * 0.8m, 2),
                    allowance = Math.Round(salary * 0.15m, 2),
                    deductions = Math.Round(salary * 0.05m, 2),
                    net = salary
                });
            }

            // Schedule: fetch timetable items where this teacher is explicitly assigned
            var dayOrder = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" };
            var myTimetableItems = await _context.TimetableItems
                .Where(t => t.SchoolId == schoolId && t.TeacherId == userId)
                .Include(t => t.Class)
                .Include(t => t.Subject)
                .ToListAsync();

            var scheduleList = myTimetableItems.Select(t => new {
                Id = t.Id,
                ClassId = t.ClassId,
                ClassName = t.Class != null ? $"Class {t.Class.Grade}-{t.Class.Section}" : "Unknown Class",
                SubjectId = (Guid?)t.SubjectId,
                SubjectName = !string.IsNullOrEmpty(t.CustomSubjectName) ? t.CustomSubjectName : (t.Subject != null ? t.Subject.Name : "Free Period"),
                PeriodNumber = t.PeriodNumber,
                DayOfWeek = t.DayOfWeek,
                Remark = t.Remark,
                IsRescheduled = t.IsRescheduled
            }).ToList();

            // Find classes where this teacher is the designated class teacher
            var classTeacherClasses = classes.Where(c => c.ClassTeacherId == userId).ToList();
            if (classTeacherClasses.Any())
            {
                var classTeacherClassIds = classTeacherClasses.Select(c => c.Id).ToList();
                // Find all database timetable items for period 1 of these classes to see if they're overridden
                var periodOneItems = await _context.TimetableItems
                    .Where(t => t.SchoolId == schoolId && t.PeriodNumber == 1 && classTeacherClassIds.Contains(t.ClassId))
                    .ToListAsync();

                foreach (var c in classTeacherClasses)
                {
                    foreach (var day in dayOrder)
                    {
                        var hasPeriodOne = periodOneItems.Any(p => p.ClassId == c.Id && p.DayOfWeek.Equals(day, StringComparison.OrdinalIgnoreCase));
                        if (!hasPeriodOne)
                        {
                            scheduleList.Add(new {
                                Id = Guid.Empty,
                                ClassId = c.Id,
                                ClassName = $"Class {c.Grade}-{c.Section}",
                                SubjectId = (Guid?)null,
                                SubjectName = "Homeroom (Class Teacher)",
                                PeriodNumber = 1,
                                DayOfWeek = day,
                                Remark = (string?)null,
                                IsRescheduled = false
                            });
                        }
                    }
                }
            }

            // Sort schedule by weekday order then period
            var orderedSchedule = scheduleList
                .OrderBy(t => Array.IndexOf(dayOrder, t.DayOfWeek) < 0 ? 99 : Array.IndexOf(dayOrder, t.DayOfWeek))
                .ThenBy(t => t.PeriodNumber)
                .ToList();

            return Ok(new
            {
                totalClasses,
                totalStudents,
                pendingReviews,
                myClassesToday,
                classEnrollments,
                salary,
                salaryHistory,
                schedule = orderedSchedule
            });
        }

        [HttpGet("subjects")]
        public async Task<IActionResult> GetSubjects()
        {
            var schoolId = GetSchoolId();
            var subjects = await _unitOfWork.Subjects.FindAsync(s => s.SchoolId == schoolId);
            return Ok(subjects.Select(s => new { s.Id, s.Code, s.Name, s.Department }));
        }

        [HttpPost("subjects")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateSubject([FromBody] Subject model)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                return BadRequest(new { error = "Subject name is required" });
            }
            if (string.IsNullOrWhiteSpace(model.Code))
            {
                return BadRequest(new { error = "Subject code is required" });
            }

            var existing = await _unitOfWork.Subjects.FindAsync(s => s.SchoolId == schoolId && (s.Name == model.Name.Trim() || s.Code == model.Code.Trim()));
            if (existing.Any())
            {
                return BadRequest(new { error = "Subject name or code already exists" });
            }

            var subject = new Subject
            {
                SchoolId = schoolId,
                Code = model.Code.Trim(),
                Name = model.Name.Trim(),
                Department = model.Department?.Trim() ?? string.Empty
            };

            await _unitOfWork.Subjects.AddAsync(subject);
            await _unitOfWork.CompleteAsync();

            return Ok(subject);
        }

        [HttpDelete("subjects/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteSubject(Guid id)
        {
            var schoolId = GetSchoolId();
            var subject = await _unitOfWork.Subjects.GetByIdAsync(id);
            if (subject == null || subject.SchoolId != schoolId)
            {
                return NotFound(new { error = "Subject not found" });
            }

            _unitOfWork.Subjects.Remove(subject);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        // --- Sections ---

        [HttpGet("sections")]
        public async Task<IActionResult> GetSections()
        {
            var schoolId = GetSchoolId();
            var sections = await _unitOfWork.Sections.FindAsync(s => s.SchoolId == schoolId);
            return Ok(sections.Select(s => new { s.Id, s.Name }).OrderBy(s => s.Name));
        }

        [HttpPost("sections")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateSection([FromBody] Section model)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                return BadRequest(new { error = "Section name is required" });
            }

            var existing = await _unitOfWork.Sections.FindAsync(s => s.SchoolId == schoolId && s.Name == model.Name.Trim());
            if (existing.Any())
            {
                return BadRequest(new { error = "Section already exists" });
            }

            var section = new Section
            {
                SchoolId = schoolId,
                Name = model.Name.Trim()
            };

            await _unitOfWork.Sections.AddAsync(section);
            await _unitOfWork.CompleteAsync();

            return Ok(section);
        }

        // --- Rooms ---

        [HttpGet("rooms")]
        public async Task<IActionResult> GetRooms()
        {
            var schoolId = GetSchoolId();
            var rooms = await _unitOfWork.Rooms.FindAsync(r => r.SchoolId == schoolId);
            return Ok(rooms.Select(r => new { r.Id, r.Name }).OrderBy(r => r.Name));
        }

        [HttpPost("rooms")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateRoom([FromBody] Room model)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                return BadRequest(new { error = "Room name is required" });
            }

            var existing = await _unitOfWork.Rooms.FindAsync(r => r.SchoolId == schoolId && r.Name == model.Name.Trim());
            if (existing.Any())
            {
                return BadRequest(new { error = "Room already exists" });
            }

            var room = new Room
            {
                SchoolId = schoolId,
                Name = model.Name.Trim()
            };

            await _unitOfWork.Rooms.AddAsync(room);
            await _unitOfWork.CompleteAsync();

            return Ok(room);
        }

        [HttpDelete("sections/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteSection(Guid id)
        {
            var schoolId = GetSchoolId();
            var section = await _unitOfWork.Sections.GetByIdAsync(id);
            if (section == null || section.SchoolId != schoolId)
            {
                return NotFound(new { error = "Section not found" });
            }

            _unitOfWork.Sections.Remove(section);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        [HttpDelete("rooms/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteRoom(Guid id)
        {
            var schoolId = GetSchoolId();
            var room = await _unitOfWork.Rooms.GetByIdAsync(id);
            if (room == null || room.SchoolId != schoolId)
            {
                return NotFound(new { error = "Room not found" });
            }

            _unitOfWork.Rooms.Remove(room);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        [HttpPost("enrollment-classes")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateEnrollmentClass([FromBody] EnrollmentClass model)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                return BadRequest(new { error = "Grade level name is required" });
            }

            var existing = await _unitOfWork.EnrollmentClasses.FindAsync(ec => ec.SchoolId == schoolId && ec.Name == model.Name.Trim());
            if (existing.Any())
            {
                return BadRequest(new { error = "Grade level already exists" });
            }

            var enrollmentClass = new EnrollmentClass
            {
                SchoolId = schoolId,
                Name = model.Name.Trim()
            };

            await _unitOfWork.EnrollmentClasses.AddAsync(enrollmentClass);
            await _unitOfWork.CompleteAsync();

            return Ok(enrollmentClass);
        }

        [HttpDelete("enrollment-classes/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteEnrollmentClass(Guid id)
        {
            var schoolId = GetSchoolId();
            var enrollmentClass = await _unitOfWork.EnrollmentClasses.GetByIdAsync(id);
            if (enrollmentClass == null || enrollmentClass.SchoolId != schoolId)
            {
                return NotFound(new { error = "Grade level not found" });
            }

            _unitOfWork.EnrollmentClasses.Remove(enrollmentClass);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        // --- Capacities ---

        [HttpGet("capacities")]
        public async Task<IActionResult> GetCapacities()
        {
            var schoolId = GetSchoolId();
            var capacities = await _unitOfWork.Capacities.FindAsync(c => c.SchoolId == schoolId);
            return Ok(capacities.Select(c => new { c.Id, Value = c.Value }).OrderBy(c => c.Value));
        }

        [HttpPost("capacities")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateCapacity([FromBody] Capacity model)
        {
            var schoolId = GetSchoolId();
            if (model.Value <= 0)
            {
                return BadRequest(new { error = "Capacity must be greater than zero" });
            }

            var existing = await _unitOfWork.Capacities.FindAsync(c => c.SchoolId == schoolId && c.Value == model.Value);
            if (existing.Any())
            {
                return BadRequest(new { error = "Capacity option already exists" });
            }

            var capacity = new Capacity
            {
                SchoolId = schoolId,
                Value = model.Value
            };

            await _unitOfWork.Capacities.AddAsync(capacity);
            await _unitOfWork.CompleteAsync();

            return Ok(capacity);
        }

        [HttpDelete("capacities/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteCapacity(Guid id)
        {
            var schoolId = GetSchoolId();
            var capacity = await _unitOfWork.Capacities.GetByIdAsync(id);
            if (capacity == null || capacity.SchoolId != schoolId)
            {
                return NotFound(new { error = "Capacity option not found" });
            }

            _unitOfWork.Capacities.Remove(capacity);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        // --- Departments ---

        [HttpGet("departments")]
        public async Task<IActionResult> GetDepartments()
        {
            var schoolId = GetSchoolId();
            var departments = await _unitOfWork.Departments.FindAsync(d => d.SchoolId == schoolId);
            var deptList = departments.ToList();
            if (!deptList.Any())
            {
                var defaults = new List<Department>
                {
                    new Department { SchoolId = schoolId, Name = "Science & Mathematics" },
                    new Department { SchoolId = schoolId, Name = "Arts & Humanities" },
                    new Department { SchoolId = schoolId, Name = "Languages" }
                };
                foreach (var dep in defaults)
                {
                    await _unitOfWork.Departments.AddAsync(dep);
                }
                await _unitOfWork.CompleteAsync();
                deptList = defaults;
            }
            return Ok(deptList.Select(d => new { d.Id, d.Name }).OrderBy(d => d.Name));
        }

        [HttpPost("departments")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateDepartment([FromBody] Department model)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                return BadRequest(new { error = "Department name is required" });
            }

            var existing = await _unitOfWork.Departments.FindAsync(d => d.SchoolId == schoolId && d.Name == model.Name.Trim());
            if (existing.Any())
            {
                return BadRequest(new { error = "Department already exists" });
            }

            var department = new Department
            {
                SchoolId = schoolId,
                Name = model.Name.Trim()
            };

            await _unitOfWork.Departments.AddAsync(department);
            await _unitOfWork.CompleteAsync();

            return Ok(department);
        }

        [HttpDelete("departments/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteDepartment(Guid id)
        {
            var schoolId = GetSchoolId();
            var department = await _unitOfWork.Departments.GetByIdAsync(id);
            if (department == null || department.SchoolId != schoolId)
            {
                return NotFound(new { error = "Department not found" });
            }

            _unitOfWork.Departments.Remove(department);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        // --- Timetable & Period Scheduling ---

        [HttpGet("timetable/periods")]
        public async Task<IActionResult> GetTimetablePeriods()
        {
            var schoolId = GetSchoolId();
            var periods = await _context.TimetablePeriods
                .Where(p => p.SchoolId == schoolId)
                .OrderBy(p => p.PeriodNumber)
                .ToListAsync();

            if (!periods.Any())
            {
                // Seed 5 default periods for this school
                var defaultPeriods = new List<TimetablePeriod>
                {
                    new TimetablePeriod { SchoolId = schoolId, PeriodNumber = 1, StartTime = "08:00", EndTime = "08:45", DurationMinutes = 45 },
                    new TimetablePeriod { SchoolId = schoolId, PeriodNumber = 2, StartTime = "08:45", EndTime = "09:30", DurationMinutes = 45 },
                    new TimetablePeriod { SchoolId = schoolId, PeriodNumber = 3, StartTime = "09:30", EndTime = "10:15", DurationMinutes = 45 },
                    new TimetablePeriod { SchoolId = schoolId, PeriodNumber = 4, StartTime = "10:15", EndTime = "11:00", DurationMinutes = 45 },
                    new TimetablePeriod { SchoolId = schoolId, PeriodNumber = 5, StartTime = "11:00", EndTime = "11:45", DurationMinutes = 45 }
                };
                await _context.TimetablePeriods.AddRangeAsync(defaultPeriods);
                await _context.SaveChangesAsync();
                periods = defaultPeriods;
            }

            return Ok(periods);
        }

        [HttpPost("timetable/periods")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> SaveTimetablePeriods([FromBody] List<TimetablePeriod> requestPeriods)
        {
            var schoolId = GetSchoolId();
            
            // Remove existing
            var existing = _context.TimetablePeriods.Where(p => p.SchoolId == schoolId);
            _context.TimetablePeriods.RemoveRange(existing);

            foreach (var p in requestPeriods)
            {
                p.Id = Guid.NewGuid();
                p.SchoolId = schoolId;
            }

            await _context.TimetablePeriods.AddRangeAsync(requestPeriods);
            await _context.SaveChangesAsync();
            return Ok(requestPeriods);
        }

        [HttpGet("timetable/schedule/{classId}")]
        public async Task<IActionResult> GetTimetableSchedule(Guid classId)
        {
            var schoolId = GetSchoolId();
            
            var classObj = await _context.Classes
                .Include(c => c.ClassTeacher)
                .ThenInclude(t => t!.User)
                .FirstOrDefaultAsync(c => c.Id == classId && c.SchoolId == schoolId);

            if (classObj == null)
            {
                return NotFound(new { error = "Class not found." });
            }

            var rawItems = await _context.TimetableItems
                .Where(t => t.SchoolId == schoolId && t.ClassId == classId)
                .Include(t => t.Teacher).ThenInclude(tc => tc!.User)
                .Include(t => t.Subject)
                .ToListAsync();

            var list = rawItems.Select(t => new {
                Id = t.Id,
                ClassId = t.ClassId,
                TeacherId = (Guid?)t.TeacherId,
                TeacherName = (t.Teacher != null && t.Teacher.User != null) ? $"{t.Teacher.User.FirstName} {t.Teacher.User.LastName}" : "Unassigned",
                SubjectId = (Guid?)t.SubjectId,
                SubjectName = !string.IsNullOrEmpty(t.CustomSubjectName) ? t.CustomSubjectName : (t.Subject != null ? t.Subject.Name : "Free Period"),
                PeriodNumber = t.PeriodNumber,
                DayOfWeek = t.DayOfWeek,
                Remark = (string?)t.Remark,
                IsRescheduled = t.IsRescheduled,
                OriginalTeacherId = (Guid?)t.OriginalTeacherId
            }).ToList();

            if (classObj.ClassTeacherId != null && classObj.ClassTeacher != null && classObj.ClassTeacher.User != null)
            {
                var daysOfWeek = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday" };
                foreach (var day in daysOfWeek)
                {
                    if (!list.Any(i => i.PeriodNumber == 1 && i.DayOfWeek.Equals(day, StringComparison.OrdinalIgnoreCase)))
                    {
                        list.Add(new {
                            Id = Guid.Empty,
                            ClassId = classId,
                            TeacherId = (Guid?)classObj.ClassTeacherId.Value,
                            TeacherName = $"{classObj.ClassTeacher.User.FirstName} {classObj.ClassTeacher.User.LastName}",
                            SubjectId = (Guid?)null,
                            SubjectName = "Homeroom (Class Teacher)",
                            PeriodNumber = 1,
                            DayOfWeek = day,
                            Remark = (string?)null,
                            IsRescheduled = false,
                            OriginalTeacherId = (Guid?)null
                        });
                    }
                }
            }

            return Ok(list);
        }

        [HttpPost("timetable/schedule")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> SaveTimetableItem([FromBody] SaveTimetableItemRequest request)
        {
            var schoolId = GetSchoolId();

            // Check if class exists
            var classObj = await _unitOfWork.Classes.GetByIdAsync(request.ClassId);
            if (classObj == null || classObj.SchoolId != schoolId)
            {
                return BadRequest(new { error = "Class not found." });
            }

            // If teacherId is null, OR both subjectId and customSubjectName are empty, we are clearing the slot
            bool hasSubject = request.SubjectId.HasValue || !string.IsNullOrWhiteSpace(request.CustomSubjectName);
            if (request.TeacherId == null || !hasSubject)
            {
                var existingCell = await _context.TimetableItems
                    .FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.ClassId == request.ClassId && 
                                              t.PeriodNumber == request.PeriodNumber && t.DayOfWeek == request.DayOfWeek);
                if (existingCell != null)
                {
                    _context.TimetableItems.Remove(existingCell);
                    await _context.SaveChangesAsync();
                }
                return Ok(new { success = true, message = "Period cleared." });
            }

            // Verify teacher exists
            var teacher = await _unitOfWork.Teachers.GetByIdAsync(request.TeacherId.Value);
            var teacherUser = await _unitOfWork.Users.GetByIdAsync(request.TeacherId.Value);
            if (teacher == null || teacherUser == null || teacherUser.SchoolId != schoolId)
            {
                return BadRequest(new { error = "Teacher not found." });
            }

            // Verify subject if provided (skip when CustomSubjectName is set — department-as-subject mode)
            if (request.SubjectId.HasValue)
            {
                var subject = await _unitOfWork.Subjects.GetByIdAsync(request.SubjectId.Value);
                if (subject == null || subject.SchoolId != schoolId)
                {
                    return BadRequest(new { error = "Subject not found." });
                }
            }

            // Check Teacher Collision: One teacher can't teach two classes at the same time
            var collision = await _context.TimetableItems
                .Where(t => t.SchoolId == schoolId && 
                            t.TeacherId == request.TeacherId.Value && 
                            t.PeriodNumber == request.PeriodNumber && 
                            t.DayOfWeek == request.DayOfWeek && 
                            t.ClassId != request.ClassId)
                .Select(t => new { Grade = t.Class != null ? t.Class.Grade : string.Empty, Section = t.Class != null ? t.Class.Section : string.Empty })
                .FirstOrDefaultAsync();

            if (collision != null)
            {
                return BadRequest(new { error = $"Teacher is already assigned to Class {collision.Grade} - {collision.Section} during Period {request.PeriodNumber} on {request.DayOfWeek}." });
            }

            // Determine clearing condition: no teacher or no subject reference at all
            // (CustomSubjectName alone + teacherId is a valid assignment)

            // Save timetable item (insert or update)
            var item = await _context.TimetableItems
                .FirstOrDefaultAsync(t => t.SchoolId == schoolId && t.ClassId == request.ClassId && 
                                          t.PeriodNumber == request.PeriodNumber && t.DayOfWeek == request.DayOfWeek);

            if (item == null)
            {
                item = new TimetableItem
                {
                    SchoolId = schoolId,
                    ClassId = request.ClassId,
                    TeacherId = request.TeacherId.Value,
                    SubjectId = request.SubjectId,
                    CustomSubjectName = request.CustomSubjectName,
                    PeriodNumber = request.PeriodNumber,
                    DayOfWeek = request.DayOfWeek,
                    IsRescheduled = false
                };
                await _context.TimetableItems.AddAsync(item);
            }
            else
            {
                item.TeacherId = request.TeacherId.Value;
                item.SubjectId = request.SubjectId;
                item.CustomSubjectName = request.CustomSubjectName;
                item.Remark = null;
                item.OriginalTeacherId = null;
                item.IsRescheduled = false;
                _context.TimetableItems.Update(item);
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("timetable/remark/{itemId}")]
        public async Task<IActionResult> AddRemark(Guid itemId, [FromBody] AddRemarkRequest request)
        {
            var schoolId = GetSchoolId();
            var item = await _context.TimetableItems.FirstOrDefaultAsync(t => t.Id == itemId && t.SchoolId == schoolId);
            if (item == null)
            {
                return NotFound(new { error = "Timetable schedule item not found." });
            }

            item.Remark = request.Remark;
            _context.TimetableItems.Update(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpGet("timetable/remarks")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> GetRemarks()
        {
            var schoolId = GetSchoolId();
            var items = await _context.TimetableItems
                .Where(t => t.SchoolId == schoolId && !string.IsNullOrEmpty(t.Remark))
                .Select(t => new {
                    t.Id,
                    t.ClassId,
                    ClassName = t.Class != null ? $"Class {t.Class.Grade} - {t.Class.Section}" : "Unknown Class",
                    t.TeacherId,
                    TeacherName = (t.Teacher != null && t.Teacher.User != null) ? $"{t.Teacher.User.FirstName} {t.Teacher.User.LastName}" : "Unassigned",
                    t.SubjectId,
                    SubjectName = t.Subject != null ? t.Subject.Name : "Free Period",
                    t.PeriodNumber,
                    t.DayOfWeek,
                    t.Remark,
                    t.IsRescheduled
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpGet("timetable/substitutes/{itemId}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> GetSubstitutes(Guid itemId)
        {
            var schoolId = GetSchoolId();
            var item = await _context.TimetableItems.FirstOrDefaultAsync(t => t.Id == itemId && t.SchoolId == schoolId);
            if (item == null)
            {
                return NotFound(new { error = "Timetable item not found." });
            }

            // Get all active teachers in school
            var teacherUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher" && u.IsActive);
            var teacherIds = teacherUsers.Select(u => u.Id).ToList();

            // Get teachers busy during this day and period
            var busyTeacherIds = await _context.TimetableItems
                .Where(t => t.SchoolId == schoolId && t.DayOfWeek == item.DayOfWeek && t.PeriodNumber == item.PeriodNumber && t.TeacherId != null)
                .Select(t => t.TeacherId!.Value)
                .Distinct()
                .ToListAsync();

            // Filter out busy teachers
            var freeTeacherIds = teacherIds.Except(busyTeacherIds).ToList();

            var freeTeachers = teacherUsers
                .Where(u => freeTeacherIds.Contains(u.Id))
                .Select(u => new {
                    u.Id,
                    Name = $"{u.FirstName} {u.LastName}"
                })
                .ToList();

            return Ok(freeTeachers);
        }

        [HttpPost("timetable/reassign/{itemId}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> ReassignTeacher(Guid itemId, [FromBody] ReassignTeacherRequest request)
        {
            var schoolId = GetSchoolId();
            var item = await _context.TimetableItems.FirstOrDefaultAsync(t => t.Id == itemId && t.SchoolId == schoolId);
            if (item == null)
            {
                return NotFound(new { error = "Timetable item not found." });
            }

            // Check if the substitute teacher is busy during this period
            var collision = await _context.TimetableItems
                .AnyAsync(t => t.SchoolId == schoolId && 
                               t.TeacherId == request.TeacherId && 
                               t.PeriodNumber == item.PeriodNumber && 
                               t.DayOfWeek == item.DayOfWeek && 
                               t.Id != itemId);

            if (collision)
            {
                return BadRequest(new { error = "Selected substitute teacher is already busy during this period." });
            }

            // Keep track of original teacher
            if (item.OriginalTeacherId == null)
            {
                item.OriginalTeacherId = item.TeacherId;
            }

            item.TeacherId = request.TeacherId;
            item.IsRescheduled = true;
            item.Remark = null; // Clear the remark once resolved

            _context.TimetableItems.Update(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // --- Attendance & Student Profile API Endpoints ---

        [HttpGet("student/profile")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> GetStudentProfile()
        {
            var studentId = GetUserId();
            var schoolId = GetSchoolId();

            var user = await _unitOfWork.Users.GetByIdAsync(studentId);
            if (user == null || user.SchoolId != schoolId || user.Role != "student")
            {
                return NotFound(new { error = "Student not found" });
            }

            var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);
            var student = await _unitOfWork.Students.GetByIdAsync(studentId);
            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == studentId && e.Status == "ACTIVE")).FirstOrDefault();
            Class? classObj = null;
            if (enrollment != null)
            {
                classObj = await _unitOfWork.Classes.GetByIdAsync(enrollment.ClassId);
            }

            return Ok(new {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                StudentId = student?.StudentId,
                BloodGroup = student?.BloodGroup,
                GuardianName = student?.GuardianName,
                GuardianPhone = student?.GuardianPhone,
                GuardianRelationship = student?.GuardianRelationship,
                Address = student?.Address,
                ClassId = classObj?.Id,
                Class = classObj != null ? $"Class {classObj.Grade}" : "Unassigned",
                Section = classObj?.Section ?? "Unassigned",
                Room = classObj?.Room ?? "Unassigned",
                AcademicYear = enrollment?.AcademicYear ?? "N/A",
                EnrollDate = enrollment?.EnrollDate.ToString("yyyy-MM-dd") ?? "N/A",
                SchoolName = school?.Name ?? string.Empty,
                SchoolWebsite = school?.Website ?? string.Empty,
                SchoolAddress = school?.Address ?? string.Empty,
                SchoolCity = school?.City ?? string.Empty
            });
        }

        [HttpPatch("student/profile")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> UpdateStudentProfile([FromBody] UpdateStudentProfileRequest request)
        {
            var studentId = GetUserId();
            var schoolId = GetSchoolId();

            var user = await _unitOfWork.Users.GetByIdAsync(studentId);
            if (user == null || user.SchoolId != schoolId || user.Role != "student")
                return NotFound(new { error = "Student not found" });

            var student = await _unitOfWork.Students.GetByIdAsync(studentId);
            if (student != null)
            {
                if (request.GuardianPhone != null) student.GuardianPhone = request.GuardianPhone;
                if (request.Address != null) student.Address = request.Address;
                if (request.BloodGroup != null) student.BloodGroup = request.BloodGroup;
                _unitOfWork.Students.Update(student);
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpGet("attendance/my")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> GetMyAttendance()
        {
            var studentId = GetUserId();
            var attendanceList = await _context.Attendances
                .Where(a => a.StudentId == studentId)
                .OrderBy(a => a.Date)
                .Select(a => new {
                    a.Id,
                    Date = a.Date.ToString("yyyy-MM-dd"),
                    a.Status,
                    a.Remarks
                })
                .ToListAsync();

            return Ok(attendanceList);
        }

        [HttpGet("attendance/class/{classId}")]
        [Authorize(Roles = "teacher,schooladmin")]
        public async Task<IActionResult> GetClassAttendance(Guid classId, [FromQuery] string date)
        {
            var schoolId = GetSchoolId();
            if (!DateTime.TryParse(date, out var parsedDate))
            {
                parsedDate = DateTime.UtcNow;
            }

            var targetDate = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc);

            // Get all active enrollments in this class
            var classEnrollments = await _unitOfWork.Enrollments.FindAsync(e => e.ClassId == classId && e.Status == "ACTIVE");
            var studentIds = classEnrollments.Select(e => e.StudentId).ToList();

            // Load attendance records for the target date
            var attendanceRecords = await _context.Attendances
                .Where(a => studentIds.Contains(a.StudentId) && a.Date.Date == targetDate)
                .ToListAsync();

            // Load user details (names) for enrolled students
            var studentUsers = await _unitOfWork.Users.FindAsync(u => studentIds.Contains(u.Id));
            var studentProfiles = await _unitOfWork.Students.FindAsync(s => studentIds.Contains(s.UserId));

            // Return full student info + their attendance record
            var result = studentIds.Select(id => {
                var record = attendanceRecords.FirstOrDefault(a => a.StudentId == id);
                var user = studentUsers.FirstOrDefault(u => u.Id == id);
                var profile = studentProfiles.FirstOrDefault(s => s.UserId == id);
                return new {
                    StudentId = id,
                    Name = user != null ? $"{user.FirstName} {user.LastName}" : "Unknown Student",
                    RollNumber = profile?.StudentId ?? string.Empty,
                    Status = record?.Status ?? "Present",
                    Remarks = record?.Remarks ?? string.Empty
                };
            }).OrderBy(s => s.Name);

            return Ok(result);
        }


        [HttpPost("attendance/submit")]
        [Authorize(Roles = "teacher,schooladmin")]
        public async Task<IActionResult> SubmitAttendance([FromBody] SubmitAttendanceRequest request)
        {
            var schoolId = GetSchoolId();

            foreach (var studentAttendance in request.Students)
            {
                var targetDate = DateTime.SpecifyKind(request.Date.Date, DateTimeKind.Utc);
                var existing = (await _context.Attendances
                    .Where(a => a.StudentId == studentAttendance.StudentId && a.Date.Date == targetDate)
                    .ToListAsync())
                    .FirstOrDefault();

                if (existing != null)
                {
                    existing.Status = studentAttendance.Status;
                    existing.Remarks = studentAttendance.Remarks;
                    _context.Attendances.Update(existing);
                }
                else
                {
                    var attendance = new Attendance
                    {
                        Id = Guid.NewGuid(),
                        StudentId = studentAttendance.StudentId,
                        SchoolId = schoolId,
                        Date = DateTime.SpecifyKind(request.Date.Date, DateTimeKind.Utc),
                        Status = studentAttendance.Status,
                        Remarks = studentAttendance.Remarks
                    };
                    await _context.Attendances.AddAsync(attendance);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpGet("teacher/profile")]
        [Authorize(Roles = "teacher")]
        public async Task<IActionResult> GetTeacherProfile()
        {
            var userId = GetUserId();
            var schoolId = GetSchoolId();

            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null || user.SchoolId != schoolId || user.Role != "teacher")
            {
                return NotFound(new { error = "Teacher not found" });
            }

            var teacher = await _unitOfWork.Teachers.GetByIdAsync(userId);

            return Ok(new {
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                EmployeeId = teacher?.EmployeeId,
                Department = teacher?.Department,
                OfficeLocation = teacher?.OfficeLocation,
                Qualifications = teacher?.Qualifications,
                Salary = teacher?.Salary ?? 55000m,
                Joined = user.CreatedAt.ToString("yyyy-MM-dd"),
                IsActive = user.IsActive
            });
        }

        [HttpPatch("teacher/profile")]
        [Authorize(Roles = "teacher")]
        public async Task<IActionResult> UpdateTeacherProfile([FromBody] UpdateTeacherProfileRequest request)
        {
            var userId = GetUserId();
            var schoolId = GetSchoolId();

            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null || user.SchoolId != schoolId || user.Role != "teacher")
                return NotFound(new { error = "Teacher not found" });

            if (!string.IsNullOrWhiteSpace(request.FirstName)) user.FirstName = request.FirstName;
            if (!string.IsNullOrWhiteSpace(request.LastName)) user.LastName = request.LastName;
            _unitOfWork.Users.Update(user);

            var teacher = await _unitOfWork.Teachers.GetByIdAsync(userId);
            if (teacher != null)
            {
                if (request.Qualifications != null) teacher.Qualifications = request.Qualifications;
                if (request.OfficeLocation != null) teacher.OfficeLocation = request.OfficeLocation;
                _unitOfWork.Teachers.Update(teacher);
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpGet("teacher/classes")]
        [Authorize(Roles = "teacher")]
        public async Task<IActionResult> GetTeacherClasses()
        {
            var userId = GetUserId();
            var schoolId = GetSchoolId();

            var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var classSubjects = await _unitOfWork.ClassSubjects.FindAsync(cs => cs.TeacherId == userId);
            
            var assignedClassIds = classSubjects.Select(cs => cs.ClassId)
                .Concat(classes.Where(c => c.ClassTeacherId == userId).Select(c => c.Id))
                .Distinct()
                .ToList();

            var result = classes
                .Where(c => assignedClassIds.Contains(c.Id))
                .Select(c => {
                    var enrolledCount = _unitOfWork.Enrollments.FindAsync(e => e.ClassId == c.Id && e.Status == "ACTIVE").Result.Count();
                    return new {
                        c.Id,
                        c.Grade,
                        c.Section,
                        c.Level,
                        c.Room,
                        c.Capacity,
                        Enrolled = enrolledCount,
                        IsClassTeacher = c.ClassTeacherId == userId,
                        AreMarksPublished = c.AreMarksPublished
                    };
                });

            return Ok(result);
        }

        [HttpPost("timetable/cancel/{itemId}")]
        [Authorize(Roles = "teacher,schooladmin")]
        public async Task<IActionResult> CancelClass(Guid itemId, [FromBody] CancelClassRequest request)
        {
            var schoolId = GetSchoolId();
            var item = await _context.TimetableItems.FirstOrDefaultAsync(t => t.Id == itemId && t.SchoolId == schoolId);
            if (item == null)
            {
                return NotFound(new { error = "Timetable item not found." });
            }

            item.Remark = $"Cancelled: {request.Reason}";
            item.IsRescheduled = true;
            _context.TimetableItems.Update(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("timetable/restore/{itemId}")]
        [Authorize(Roles = "teacher,schooladmin")]
        public async Task<IActionResult> RestoreClass(Guid itemId)
        {
            var schoolId = GetSchoolId();
            var item = await _context.TimetableItems.FirstOrDefaultAsync(t => t.Id == itemId && t.SchoolId == schoolId);
            if (item == null)
            {
                return NotFound(new { error = "Timetable item not found." });
            }

            item.Remark = null;
            item.IsRescheduled = false;
            _context.TimetableItems.Update(item);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpGet("class-subjects/{classId}")]
        public async Task<IActionResult> GetClassSubjects(Guid classId)
        {
            var schoolId = GetSchoolId();
            var classSubjects = await _unitOfWork.ClassSubjects.FindAsync(cs => cs.ClassId == classId);
            var subjectIds = classSubjects.Select(cs => cs.SubjectId).ToList();
            var subjects = await _unitOfWork.Subjects.FindAsync(s => subjectIds.Contains(s.Id));
            var teachers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");

            var result = classSubjects.Select(cs => {
                var subject = subjects.FirstOrDefault(s => s.Id == cs.SubjectId);
                var teacher = teachers.FirstOrDefault(t => t.Id == cs.TeacherId);
                return new {
                    ClassId = cs.ClassId,
                    SubjectId = cs.SubjectId,
                    SubjectName = subject?.Name ?? "Unknown Subject",
                    SubjectCode = subject?.Code ?? string.Empty,
                    TeacherId = cs.TeacherId,
                    TeacherName = teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : "Unassigned"
                };
            });

            return Ok(result);
        }

        [HttpPost("class-subjects")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateClassSubject([FromBody] ClassSubjectDto model)
        {
            var existing = (await _unitOfWork.ClassSubjects.FindAsync(cs => cs.ClassId == model.ClassId && cs.SubjectId == model.SubjectId)).FirstOrDefault();
            if (existing != null)
            {
                existing.TeacherId = model.TeacherId;
                _unitOfWork.ClassSubjects.Update(existing);
            }
            else
            {
                var cs = new ClassSubject
                {
                    ClassId = model.ClassId,
                    SubjectId = model.SubjectId,
                    TeacherId = model.TeacherId
                };
                await _unitOfWork.ClassSubjects.AddAsync(cs);
            }
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("class-subjects/{classId}/{subjectId}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteClassSubject(Guid classId, Guid subjectId)
        {
            var cs = (await _unitOfWork.ClassSubjects.FindAsync(x => x.ClassId == classId && x.SubjectId == subjectId)).FirstOrDefault();
            if (cs != null)
            {
                _unitOfWork.ClassSubjects.Remove(cs);
                await _unitOfWork.CompleteAsync();
            }
            return Ok(new { success = true });
        }
    }

    public class SubmitAttendanceRequest
    {
        public Guid ClassId { get; set; }
        public DateTime Date { get; set; }
        public List<StudentAttendanceDto> Students { get; set; } = new List<StudentAttendanceDto>();
    }

    public class StudentAttendanceDto
    {
        public Guid StudentId { get; set; }
        public string Status { get; set; } = string.Empty; // Present, Late, Absent
        public string Remarks { get; set; } = string.Empty;
    }

    public class CancelClassRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    public class ClassSubjectDto
    {
        public Guid ClassId { get; set; }
        public Guid SubjectId { get; set; }
        public Guid? TeacherId { get; set; }
    }
}
