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
    [Route("api/exams")]
    [Authorize]
    public class ExamsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly EduVault.Infrastructure.Data.EduVaultDbContext _context;
        private readonly Services.WhatsAppService _whatsAppService;

        public ExamsController(IUnitOfWork unitOfWork, EduVault.Infrastructure.Data.EduVaultDbContext context, Services.WhatsAppService whatsAppService)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _whatsAppService = whatsAppService;
        }

        private Guid GetSchoolId()
        {
            var schoolIdStr = User.FindFirst("schoolId")?.Value;
            if (!string.IsNullOrEmpty(schoolIdStr) && Guid.TryParse(schoolIdStr, out var parsed))
            {
                return parsed;
            }

            if (User.IsInRole("superadmin"))
            {
                if (Request.Headers.TryGetValue("X-School-Id", out var headerVal) && Guid.TryParse(headerVal, out var headerSchoolId))
                {
                    return headerSchoolId;
                }

                var firstSchool = _context.Schools.Select(s => s.Id).FirstOrDefault();
                if (firstSchool != Guid.Empty) return firstSchool;
            }

            throw new UnauthorizedAccessException("School ID missing in token");
        }

        private Guid GetUserId()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) throw new UnauthorizedAccessException("User ID missing in token");
            return Guid.Parse(userIdStr);
        }

        [HttpGet("")]
        [HttpGet("schedule")]
        public async Task<IActionResult> GetExams()
        {
            var schoolId = GetSchoolId();
            var classes = (await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId)).ToList();
            var classIds = classes.Select(c => c.Id).ToList();

            var exams = (await _unitOfWork.Exams.FindAsync(e => classIds.Contains(e.ClassId))).ToList();

            // Auto-transition status to Completed when assessment date has passed
            var todayUtc = DateTime.UtcNow.Date;
            bool hasAutoUpdates = false;
            foreach (var exam in exams)
            {
                if (exam.Date.Date < todayUtc && exam.Status != "Completed" && exam.Status != "COMPLETED")
                {
                    exam.Status = "Completed";
                    _unitOfWork.Exams.Update(exam);
                    hasAutoUpdates = true;
                }
            }
            if (hasAutoUpdates)
            {
                await _unitOfWork.CompleteAsync();
            }

            var subjects = await _unitOfWork.Subjects.FindAsync(s => s.SchoolId == schoolId);
            var teachers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher");

            var result = exams.Select(e => {
                var classObj = classes.FirstOrDefault(c => c.Id == e.ClassId);
                var subject = subjects.FirstOrDefault(s => s.Id == e.SubjectId);
                var proctor = teachers.FirstOrDefault(t => t.Id == e.ProctorId);

                // Guarantee status reflects Completed if date has elapsed
                var effectiveStatus = (e.Date.Date < todayUtc) ? "Completed" : e.Status;

                // 3-Day Submission Deadline Rule:
                // Exam paper must be submitted AT LEAST 3 days before Exam Date.
                var deadlineDate = e.Date.Date.AddDays(-3);
                var daysUntilExam = (e.Date.Date - todayUtc).TotalDays;
                var isUploaded = !string.IsNullOrWhiteSpace(e.QuestionPaperUrl);
                var isDeadlinePassed = todayUtc > deadlineDate && !isUploaded;

                string paperStatus;
                if (isUploaded)
                {
                    paperStatus = "Submitted";
                }
                else if (isDeadlinePassed)
                {
                    paperStatus = "DeadlineMissed";
                }
                else
                {
                    paperStatus = "Pending";
                }

                return new {
                    e.Id,
                    e.ClassId,
                    e.SubjectId,
                    e.ProctorId,
                    Subject = subject?.Name ?? "Unknown Subject",
                    SubjectCode = subject?.Code ?? string.Empty,
                    Grade = classObj != null ? $"Grade {classObj.Grade}" : "Unknown",
                    Section = classObj?.Section ?? string.Empty,
                    Date = e.Date.ToString("MMM dd, yyyy"),
                    RawDate = e.Date,
                    Time = e.Time ?? string.Empty,
                    ExamType = e.ExamType,
                    Proctor = proctor != null ? $"{proctor.FirstName} {proctor.LastName}" : "Unassigned",
                    Status = effectiveStatus,
                    // Question Paper submission details
                    QuestionPaperUrl = e.QuestionPaperUrl,
                    QuestionPaperUploadedAt = e.QuestionPaperUploadedAt,
                    QuestionPaperNotes = e.QuestionPaperNotes,
                    DeadlineDate = deadlineDate.ToString("MMM dd, yyyy"),
                    RawDeadlineDate = deadlineDate,
                    DaysUntilExam = (int)daysUntilExam,
                    PaperStatus = paperStatus,
                    CanUpload = !isDeadlinePassed || User.IsInRole("schooladmin") || User.IsInRole("superadmin")
                };
            });

            return Ok(result);
        }

        [HttpGet("summary-stats")]
        public async Task<IActionResult> GetExamSummaryStats()
        {
            var schoolId = GetSchoolId();
            var classes = (await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId)).ToList();
            var classIds = classes.Select(c => c.Id).ToList();

            var exams = (await _unitOfWork.Exams.FindAsync(e => classIds.Contains(e.ClassId))).ToList();

            var todayUtc = DateTime.UtcNow.Date;
            bool hasAutoUpdates = false;
            foreach (var exam in exams)
            {
                if (exam.Date.Date < todayUtc && exam.Status != "Completed" && exam.Status != "COMPLETED")
                {
                    exam.Status = "Completed";
                    _unitOfWork.Exams.Update(exam);
                    hasAutoUpdates = true;
                }
            }
            if (hasAutoUpdates)
            {
                await _unitOfWork.CompleteAsync();
            }

            var examIds = exams.Select(e => e.Id).ToList();
            var allResults = (await _unitOfWork.ExamResults.FindAsync(r => examIds.Contains(r.ExamId))).ToList();

            int upcoming = exams.Count(e => (e.Status == "SCHEDULED" || e.Status == "Draft" || e.Status == "Scheduled") && e.Date.Date >= todayUtc);
            int ongoing = exams.Count(e => (e.Status == "ONGOING" || e.Status == "Ongoing") && e.Date.Date >= todayUtc);
            int completed = exams.Count(e => e.Status == "Completed" || e.Status == "COMPLETED" || e.Date.Date < todayUtc);
            int pendingApprovals = exams.Count(e => e.Status != "Completed" && allResults.Any(r => r.ExamId == e.Id && r.IsSubmitted));

            var totalStudents = (await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student")).Count();

            return Ok(new
            {
                upcomingExams = upcoming,
                ongoingExams = ongoing,
                completedExams = completed,
                pendingApprovals,
                totalAssessments = exams.Count,
                readyForReportCards = totalStudents
            });
        }

        [HttpGet("classes/{classId}/students")]
        public async Task<IActionResult> GetClassExamStudents(Guid classId, [FromQuery] string? examType = null)
        {
            var schoolId = GetSchoolId();
            var classObj = await _unitOfWork.Classes.GetByIdAsync(classId);
            if (classObj == null || classObj.SchoolId != schoolId)
            {
                return NotFound(new { error = "Class not found" });
            }

            var enrollments = await _unitOfWork.Enrollments.FindAsync(e => e.ClassId == classId && e.Status == "ACTIVE");
            var studentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();

            var users = await _unitOfWork.Users.FindAsync(u => studentIds.Contains(u.Id));
            var students = await _unitOfWork.Students.FindAsync(s => studentIds.Contains(s.UserId));

            // Exams for this class (and filtered by cycle/examType if provided)
            var classExams = (await _unitOfWork.Exams.FindAsync(e => e.ClassId == classId)).ToList();
            if (!string.IsNullOrWhiteSpace(examType) && !string.Equals(examType, "ALL", StringComparison.OrdinalIgnoreCase))
            {
                classExams = classExams.Where(e => string.Equals(e.ExamType, examType, StringComparison.OrdinalIgnoreCase)).ToList();
            }
            var examIds = classExams.Select(e => e.Id).ToList();

            var results = (await _unitOfWork.ExamResults.FindAsync(r => studentIds.Contains(r.StudentId) && examIds.Contains(r.ExamId))).ToList();

            var list = studentIds.Select(id =>
            {
                var user = users.FirstOrDefault(u => u.Id == id);
                var student = students.FirstOrDefault(s => s.UserId == id);
                var studentResults = results.Where(r => r.StudentId == id).ToList();

                decimal? totalObtained = studentResults.Any(r => r.MarksObtained.HasValue)
                    ? studentResults.Where(r => r.MarksObtained.HasValue).Sum(r => r.MarksObtained!.Value)
                    : null;
                decimal? totalMaxMarks = classExams.Any() ? classExams.Count * 100m : null;

                var evalStatus = "Pending Evaluation";
                if (studentResults.Any())
                {
                    evalStatus = studentResults.Count >= classExams.Count ? "Completed" : "Partially Evaluated";
                }

                return new
                {
                    StudentId = id,
                    AdmissionNumber = student?.AdmissionNumber ?? (student?.StudentId ?? "-"),
                    Name = user != null ? $"{user.FirstName} {user.LastName}".Trim() : "Student",
                    Email = user?.Email ?? "",
                    GuardianName = !string.IsNullOrWhiteSpace(student?.FatherName) ? student.FatherName : (student?.GuardianName ?? "-"),
                    GuardianPhone = !string.IsNullOrWhiteSpace(student?.FatherPhone) ? student.FatherPhone : (student?.GuardianPhone ?? "-"),
                    TotalExams = classExams.Count,
                    GradedExams = studentResults.Count(r => r.MarksObtained.HasValue),
                    TotalMarksObtained = totalObtained,
                    TotalMaxMarks = totalMaxMarks,
                    Percentage = (totalObtained.HasValue && totalMaxMarks.HasValue && totalMaxMarks.Value > 0)
                        ? Math.Round((totalObtained.Value / totalMaxMarks.Value) * 100m, 1)
                        : (decimal?)null,
                    EvaluationStatus = evalStatus
                };
            }).OrderBy(s => s.Name).ToList();

            return Ok(new
            {
                ClassId = classId,
                Grade = classObj.Grade,
                Section = classObj.Section,
                ClassName = $"Grade {classObj.Grade} ({classObj.Section})",
                ExamType = examType ?? "All Cycles",
                TotalExams = classExams.Count,
                TotalStudents = list.Count,
                Students = list
            });
        }

        [HttpGet("submissions/pending")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,superadmin,SuperAdmin")]
        public async Task<IActionResult> GetPendingSubmissions()
        {
            var schoolId = GetSchoolId();
            var classes = (await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId)).ToList();
            var classIds = classes.Select(c => c.Id).ToList();

            var exams = (await _unitOfWork.Exams.FindAsync(e => classIds.Contains(e.ClassId) && e.Status != "Completed")).ToList();
            var subjects = (await _unitOfWork.Subjects.FindAsync(s => s.SchoolId == schoolId)).ToList();
            var teachers = (await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "teacher")).ToList();

            var list = new System.Collections.Generic.List<object>();
            foreach (var exam in exams)
            {
                var results = (await _unitOfWork.ExamResults.FindAsync(r => r.ExamId == exam.Id && r.IsSubmitted)).ToList();
                if (results.Any())
                {
                    var subj = subjects.FirstOrDefault(s => s.Id == exam.SubjectId);
                    var cls = classes.FirstOrDefault(c => c.Id == exam.ClassId);
                    var teacher = teachers.FirstOrDefault(t => t.Id == exam.ProctorId);

                    list.Add(new
                    {
                        ExamId = exam.Id,
                        SubjectName = subj?.Name ?? "Subject",
                        Grade = cls != null ? $"Grade {cls.Grade}-{cls.Section}" : "Class",
                        SubmittedBy = teacher != null ? $"{teacher.FirstName} {teacher.LastName}" : "Assigned Teacher",
                        StudentCount = results.Count,
                        ExamType = exam.ExamType,
                        Date = exam.Date.ToString("MMM dd, yyyy")
                    });
                }
            }

            return Ok(list);
        }

        [HttpPost("schedule")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateExam([FromBody] Exam exam)
        {
            // Normalize incoming date to UTC — Postgres 'timestamp with time zone' rejects
            // DateTimes with Unspecified/Local Kind (would otherwise surface as a 500).
            exam.Date = DateTime.SpecifyKind(exam.Date, DateTimeKind.Utc);

            // 1. Same subject validation check (same class, subject, and exam cycle/type)
            var subjectConflict = (await _unitOfWork.Exams.FindAsync(e => 
                e.ClassId == exam.ClassId && 
                e.SubjectId == exam.SubjectId && 
                e.ExamType == exam.ExamType
            )).Any();

            if (subjectConflict)
            {
                return BadRequest(new { error = $"An exam for this subject has already been scheduled for this class in the {exam.ExamType} cycle." });
            }

            // 2. Date/Time conflict check
            var targetDate = exam.Date.Date;
            var sameDayExams = await _unitOfWork.Exams.FindAsync(e => 
                e.ClassId == exam.ClassId && 
                e.Date.Date == targetDate
            );

            var timeNorm = exam.Time?.Trim().ToLower() ?? string.Empty;
            var conflict = sameDayExams.Any(e => 
                (e.Time?.Trim().ToLower() ?? string.Empty) == timeNorm
            );

            if (conflict)
            {
                return BadRequest(new { error = "An exam is already scheduled for this class/section on this date at the specified time." });
            }

            await _unitOfWork.Exams.AddAsync(exam);
            await _unitOfWork.CompleteAsync();

            // Send WhatsApp exam schedule notice to class parents
            try
            {
                var schoolId = GetSchoolId();
                var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);
                var classObj = await _unitOfWork.Classes.GetByIdAsync(exam.ClassId);
                var subject = await _unitOfWork.Subjects.GetByIdAsync(exam.SubjectId);

                var enrollments = await _unitOfWork.Enrollments.FindAsync(e => e.ClassId == exam.ClassId && e.Status == "ACTIVE");
                var studentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();

                foreach (var sId in studentIds)
                {
                    var student = await _unitOfWork.Students.GetByIdAsync(sId);
                    if (student != null && !string.IsNullOrWhiteSpace(student.GuardianPhone))
                    {
                        string msg = $"📝 *EXAM SCHEDULE NOTICE*\n\nDear Parent,\nAn examination has been scheduled:\n\n• *Subject:* {subject?.Name ?? "General"}\n• *Class:* {classObj?.Grade} - {classObj?.Section}\n• *Exam Type:* {exam.ExamType}\n• *Date:* {exam.Date:dd MMM yyyy}\n• *Time:* {exam.Time ?? "As per schedule"}\n\n- *{school?.Name ?? "School Administration"}*";
                        _ = _whatsAppService.SendEventNotificationAsync(schoolId, "EXAM_NOTICE", student.GuardianPhone, msg);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP NOTICE] Error broadcasting exam notice: {ex.Message}");
            }

            return Ok(new { success = true, examId = exam.Id });
        }

        [HttpPut("schedule/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> UpdateExam(Guid id, [FromBody] Exam exam)
        {
            var existing = await _unitOfWork.Exams.GetByIdAsync(id);
            if (existing == null) return NotFound(new { error = "Exam not found" });

            // Normalize incoming date to UTC (see CreateExam).
            exam.Date = DateTime.SpecifyKind(exam.Date, DateTimeKind.Utc);

            // 1. Same subject validation check (ignoring this exam)
            var subjectConflict = (await _unitOfWork.Exams.FindAsync(e => 
                e.ClassId == exam.ClassId && 
                e.SubjectId == exam.SubjectId && 
                e.ExamType == exam.ExamType && 
                e.Id != id
            )).Any();

            if (subjectConflict)
            {
                return BadRequest(new { error = $"An exam for this subject has already been scheduled for this class in the {exam.ExamType} cycle." });
            }

            // 2. Date/Time conflict check (ignoring this exam)
            var targetDate = exam.Date.Date;
            var sameDayExams = await _unitOfWork.Exams.FindAsync(e => 
                e.ClassId == exam.ClassId && 
                e.Date.Date == targetDate && 
                e.Id != id
            );

            var timeNorm = exam.Time?.Trim().ToLower() ?? string.Empty;
            var conflict = sameDayExams.Any(e => 
                (e.Time?.Trim().ToLower() ?? string.Empty) == timeNorm
            );

            if (conflict)
            {
                return BadRequest(new { error = "An exam is already scheduled for this class/section on this date at the specified time." });
            }

            existing.ClassId = exam.ClassId;
            existing.SubjectId = exam.SubjectId;
            existing.ProctorId = exam.ProctorId;
            existing.Date = exam.Date;
            existing.Time = exam.Time;
            existing.ExamType = exam.ExamType;
            existing.Status = exam.Status;

            _unitOfWork.Exams.Update(existing);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpDelete("schedule/{id}")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> DeleteExam(Guid id)
        {
            var exam = await _unitOfWork.Exams.GetByIdAsync(id);
            if (exam == null) return NotFound(new { error = "Exam not found" });

            var results = await _unitOfWork.ExamResults.FindAsync(r => r.ExamId == id);
            foreach (var result in results)
            {
                _unitOfWork.ExamResults.Remove(result);
            }

            _unitOfWork.Exams.Remove(exam);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        [HttpPost("schedule/publish")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> PublishSchedule([FromBody] PublishScheduleRequest request)
        {
            var schoolId = GetSchoolId();
            var classObj = await _unitOfWork.Classes.GetByIdAsync(request.ClassId);
            if (classObj == null || classObj.SchoolId != schoolId)
            {
                return NotFound(new { error = "Class not found" });
            }

            var recipientIds = new List<Guid>();

            // 1. Add Class Teacher if assigned
            if (classObj.ClassTeacherId.HasValue)
            {
                recipientIds.Add(classObj.ClassTeacherId.Value);
            }

            // 2. Add all active students enrolled in this class
            var enrollments = await _unitOfWork.Enrollments.FindAsync(e => 
                e.ClassId == request.ClassId && 
                e.Status == "ACTIVE"
            );
            
            foreach (var enrollment in enrollments)
            {
                recipientIds.Add(enrollment.StudentId);
            }

            return Ok(new {
                className = $"Class {classObj.Grade} - {classObj.Section}",
                recipients = recipientIds.Distinct().Select(id => id.ToString()).ToList()
            });
        }

        [HttpPost("results/enter-marks")]
        [Authorize(Roles = "teacher")]
        public async Task<IActionResult> EnterMarks([FromBody] EnterMarksRequest request)
        {
            var exam = await _unitOfWork.Exams.GetByIdAsync(request.ExamId);
            if (exam == null) return NotFound(new { error = "Exam not found" });

            // Check if teacher is allowed to grade this exam
            var userId = GetUserId();
            if (exam.ProctorId != userId)
            {
                // Verify if teacher is mapped to teach this subject
                var mapping = (await _unitOfWork.ClassSubjects.FindAsync(cs => cs.ClassId == exam.ClassId && cs.SubjectId == exam.SubjectId && cs.TeacherId == userId)).FirstOrDefault();
                if (mapping == null)
                {
                    return Forbid("Unauthorized to enter marks for this exam/class");
                }
            }

            foreach (var resultDto in request.Results)
            {
                var existingResult = (await _unitOfWork.ExamResults.FindAsync(r => r.ExamId == request.ExamId && r.StudentId == resultDto.StudentId)).FirstOrDefault();

                // Grade calculation
                string grade = CalculateGrade(resultDto.MarksObtained);

                if (existingResult != null)
                {
                    if (existingResult.IsSubmitted) continue; // Skip locked records
                    existingResult.MarksObtained = resultDto.MarksObtained;
                    existingResult.Grade = grade;
                    existingResult.Remarks = resultDto.Remarks;
                    _unitOfWork.ExamResults.Update(existingResult);
                }
                else
                {
                    var newResult = new ExamResult
                    {
                        ExamId = request.ExamId,
                        StudentId = resultDto.StudentId,
                        MarksObtained = resultDto.MarksObtained,
                        Grade = grade,
                        Remarks = resultDto.Remarks,
                        IsSubmitted = false
                    };
                    await _unitOfWork.ExamResults.AddAsync(newResult);
                }
            }

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        [HttpPost("results/submit-to-admin")]
        [Authorize(Roles = "teacher")]
        public async Task<IActionResult> SubmitToAdmin([FromBody] Guid examId)
        {
            var results = await _unitOfWork.ExamResults.FindAsync(r => r.ExamId == examId);
            if (!results.Any()) return BadRequest(new { error = "No marks entered to submit" });

            foreach (var result in results)
            {
                result.IsSubmitted = true;
                _unitOfWork.ExamResults.Update(result);
            }

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        [HttpPost("results/approve")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> ApproveResults([FromBody] Guid examId)
        {
            var exam = await _unitOfWork.Exams.GetByIdAsync(examId);
            if (exam == null) return NotFound(new { error = "Exam not found" });

            exam.Status = "Completed";
            _unitOfWork.Exams.Update(exam);
            await _unitOfWork.CompleteAsync();

            var schoolId = GetSchoolId();
            var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);
            var subject = await _unitOfWork.Subjects.GetByIdAsync(exam.SubjectId);
            var results = await _unitOfWork.ExamResults.FindAsync(r => r.ExamId == examId);
            foreach (var result in results)
            {
                // Send WhatsApp result announcement to student parent
                try
                {
                    var student = await _unitOfWork.Students.GetByIdAsync(result.StudentId);
                    var studentUser = await _unitOfWork.Users.GetByIdAsync(result.StudentId);
                    if (student != null && !string.IsNullOrWhiteSpace(student.GuardianPhone))
                    {
                        string msg = $"📊 *EXAM RESULT DECLARED*\n\nDear Parent of *{studentUser?.FirstName} {studentUser?.LastName}*,\nThe exam result has been declared:\n\n• *Subject:* {subject?.Name ?? "Subject"}\n• *Cycle:* {exam.ExamType}\n• *Marks:* {result.MarksObtained}\n• *Grade:* {result.Grade}\n\n- *{school?.Name ?? "School Administration"}*";
                        _ = _whatsAppService.SendEventNotificationAsync(schoolId, "EXAM_RESULT", student.GuardianPhone, msg);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[WHATSAPP NOTICE] Error notifying parent on exam result: {ex.Message}");
                }
            }

            return Ok(new { success = true });
        }

        [HttpGet("student/performance")]
        [Authorize(Roles = "student,schooladmin")]
        public async Task<IActionResult> GetStudentPerformance([FromQuery] Guid? studentId, [FromQuery] string? examType)
        {
            var userId = GetUserId();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            Guid targetStudentId = userId;

            if (role == "schooladmin")
            {
                if (!studentId.HasValue)
                {
                    return BadRequest(new { error = "Student ID is required for school admin" });
                }
                targetStudentId = studentId.Value;
            }
            else
            {
                targetStudentId = userId;
            }

            var schoolId = GetSchoolId();
            string targetExamType = string.IsNullOrEmpty(examType) ? "Semester Examination" : examType;

            // Check if published for student role
            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == targetStudentId && e.Status == "ACTIVE")).FirstOrDefault();
            if (enrollment != null)
            {
                var classObj = await _unitOfWork.Classes.GetByIdAsync(enrollment.ClassId);
                if (classObj != null && role == "student")
                {
                    if (!classObj.IsExamTypeLocked(targetExamType))
                    {
                        return Ok(new {
                            areMarksPublished = false,
                            message = "Report cards for your class section have not been officially published by the administration yet."
                        });
                    }

                    var approval = _context.ReportApprovals
                        .FirstOrDefault(ra => ra.ClassId == enrollment.ClassId && ra.StudentId == targetStudentId && ra.ExamType == targetExamType);
                    if (approval == null || !approval.IsApproved)
                    {
                        return Ok(new {
                            areMarksPublished = false,
                            message = "Your report card has not been approved by the administration yet."
                        });
                    }
                }
            }

            var examResults = await _unitOfWork.ExamResults.FindAsync(er => er.StudentId == targetStudentId);
            var exams = await _unitOfWork.Exams.GetAllAsync();
            var subjects = await _unitOfWork.Subjects.FindAsync(s => s.SchoolId == schoolId);

            // Filter exams to match targetExamType and student's current active class
            var filteredExams = exams.Where(e => 
                (enrollment == null || e.ClassId == enrollment.ClassId) && 
                e.ExamType.Equals(targetExamType, StringComparison.OrdinalIgnoreCase)).ToList();
            var filteredExamIds = filteredExams.Select(e => e.Id).ToList();

            // Filter results to only match those exams
            var studentFilteredResults = examResults.Where(r => filteredExamIds.Contains(r.ExamId)).ToList();

            var detailedResults = studentFilteredResults.Select(r => {
                var exam = filteredExams.FirstOrDefault(e => e.Id == r.ExamId);
                var subject = exam != null ? subjects.FirstOrDefault(s => s.Id == exam.SubjectId) : null;
                return new {
                    Subject = subject?.Name ?? "Unknown Subject",
                    Internal = r.PracticalMarks ?? 0, // Out of 30
                    Exam = r.TheoryMarks ?? 0, // Out of 70
                    Total = r.MarksObtained ?? 0, // Out of 100
                    Grade = r.Grade,
                    Status = (r.MarksObtained ?? 0) >= 40m ? "Pass" : "Fail"
                };
            }).ToList();

            // Calculate actual GPA
            decimal totalGradePoints = 0;
            int countedSubjects = 0;
            foreach (var r in studentFilteredResults)
            {
                if (r.MarksObtained.HasValue)
                {
                    totalGradePoints += ConvertGradeToPoints(r.Grade);
                    countedSubjects++;
                }
            }

            decimal gpa = countedSubjects > 0 ? Math.Round(totalGradePoints / countedSubjects, 2) : 0m;
            decimal cumulativeGpa = gpa > 0 ? Math.Round(gpa - 0.1m, 2) : 0m;

            // Calculate dynamic Class Rank
            string classRank = "1st / 1";
            decimal classAverage = 76.5m;
            decimal classHighest = 92.0m;

            if (enrollment != null)
            {
                var classId = enrollment.ClassId;
                // Get all active enrollments in the same class
                var classEnrollments = await _unitOfWork.Enrollments.FindAsync(e => e.ClassId == classId && e.Status == "ACTIVE");
                var classStudentIds = classEnrollments.Select(e => e.StudentId).ToList();

                // Get exam results for all students in this class
                var classResults = await _unitOfWork.ExamResults.FindAsync(r => classStudentIds.Contains(r.StudentId));

                // Filter class exams and results by targetExamType
                var classExams = filteredExams.Where(e => e.ClassId == classId).Select(e => e.Id).ToList();
                var filteredClassResults = classResults.Where(r => classExams.Contains(r.ExamId)).ToList();

                // Calculate average marks for each student using filteredClassResults
                var studentAverages = filteredClassResults
                    .GroupBy(r => r.StudentId)
                    .Select(g => new {
                        StudentId = g.Key,
                        AverageMarks = g.Average(r => r.MarksObtained ?? 0)
                    })
                    .OrderByDescending(x => x.AverageMarks)
                    .ToList();

                var rankIndex = studentAverages.FindIndex(x => x.StudentId == targetStudentId);
                int totalClassStudents = classStudentIds.Count;
                int rank = rankIndex >= 0 ? rankIndex + 1 : 1;

                string ordinal = rank switch
                {
                    1 => "st",
                    2 => "nd",
                    3 => "rd",
                    _ => "th"
                };
                classRank = $"{rank}{ordinal} / {totalClassStudents}";

                if (studentAverages.Any())
                {
                    classAverage = Math.Round(studentAverages.Average(x => x.AverageMarks), 1);
                    classHighest = Math.Round(studentAverages.Max(x => x.AverageMarks), 1);
                }
            }

            // Calculate actual attendance percentage from DB
            var attendances = await _unitOfWork.Attendances.FindAsync(a => a.StudentId == targetStudentId);
            string attendance = "100.0%";
            if (attendances.Any())
            {
                var totalAttendanceDays = attendances.Count();
                var presentOrLateDays = attendances.Count(a => a.Status == "Present" || a.Status == "Late");
                decimal actualAttendancePercent = ((decimal)presentOrLateDays / totalAttendanceDays) * 100m;
                attendance = $"{actualAttendancePercent:F1}%";
            }

            return Ok(new {
                areMarksPublished = true,
                semesterGpa = gpa > 0 ? gpa.ToString("F2") : "0.00",
                cumulativeGpa = cumulativeGpa > 0 ? cumulativeGpa.ToString("F2") : "0.00",
                classRank,
                attendance,
                classAverage,
                classHighest,
                subjectsBreakdown = detailedResults
            });
        }

        [HttpGet("student/{studentId}/subjects")]
        [Authorize(Roles = "teacher,schooladmin")]
        public async Task<IActionResult> GetStudentSubjects(Guid studentId, [FromQuery] string examType = "Semester Examination")
        {
            var schoolId = GetSchoolId();
            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == studentId && e.Status == "ACTIVE")).FirstOrDefault();
            if (enrollment == null) return BadRequest(new { error = "Student enrollment not found" });

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role == "teacher")
            {
                var userId = GetUserId();
                var classObj = await _unitOfWork.Classes.GetByIdAsync(enrollment.ClassId);
                if (classObj == null || classObj.ClassTeacherId != userId)
                {
                    return StatusCode(403, new { error = "Access Denied: Only the assigned Class Teacher can view subjects for this student." });
                }
            }

            var classSubjects = await _unitOfWork.ClassSubjects.FindAsync(cs => cs.ClassId == enrollment.ClassId);
            var subjectIds = classSubjects.Select(cs => cs.SubjectId).ToList();
            var subjects = await _unitOfWork.Subjects.FindAsync(s => subjectIds.Contains(s.Id));

            // Load existing exam results for these subjects if they exist, filtering by examType
            var exams = await _unitOfWork.Exams.FindAsync(e => e.ClassId == enrollment.ClassId && e.ExamType == examType);
            var examIds = exams.Select(e => e.Id).ToList();
            var results = await _unitOfWork.ExamResults.FindAsync(r => r.StudentId == studentId && examIds.Contains(r.ExamId));

            var result = subjects.Select(s => {
                var exam = exams.FirstOrDefault(e => e.SubjectId == s.Id);
                var examResult = exam != null ? results.FirstOrDefault(r => r.ExamId == exam.Id) : null;
                return new {
                    SubjectId = s.Id,
                    SubjectName = s.Name,
                    SubjectCode = s.Code,
                    ExamId = exam?.Id,
                    TheoryMarks = examResult?.TheoryMarks,
                    PracticalMarks = examResult?.PracticalMarks,
                    Remarks = examResult?.Remarks ?? string.Empty
                };
            });

            return Ok(result);
        }

        [HttpPost("results/student-marks")]
        [Authorize(Roles = "teacher")]
        public async Task<IActionResult> EnterStudentMarks([FromBody] EnterStudentMarksRequest request)
        {
            var schoolId = GetSchoolId();
            var studentId = request.StudentId;

            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == studentId && e.Status == "ACTIVE")).FirstOrDefault();
            if (enrollment == null) return NotFound(new { error = "Student enrollment not found" });

            var classId = enrollment.ClassId;

            // Check if requesting teacher is the class teacher
            var userId = GetUserId();
            var classObj = await _unitOfWork.Classes.GetByIdAsync(classId);
            if (classObj == null || classObj.ClassTeacherId != userId)
            {
                return StatusCode(403, new { error = "Access Denied: Only the assigned Class Teacher can enter marks." });
            }

            // Check if class marks for the requested exam type are already published
            if (classObj.IsExamTypeLocked(request.ExamType))
            {
                return BadRequest(new { error = $"Access Denied: '{request.ExamType}' reports are already approved/published by administration and cannot be modified." });
            }

            foreach (var subMark in request.Subjects)
            {
                // Find or create Exam for this class & subject and examType
                var exam = (await _unitOfWork.Exams.FindAsync(e => e.ClassId == classId && e.SubjectId == subMark.SubjectId && e.ExamType == request.ExamType)).FirstOrDefault();
                if (exam == null)
                {
                    exam = new Exam
                    {
                        Id = Guid.NewGuid(),
                        ClassId = classId,
                        SubjectId = subMark.SubjectId,
                        ExamType = request.ExamType,
                        Date = DateTime.UtcNow,
                        Status = "Completed"
                    };
                    await _unitOfWork.Exams.AddAsync(exam);
                    await _unitOfWork.CompleteAsync();
                }

                // Find or create ExamResult
                var examResult = (await _unitOfWork.ExamResults.FindAsync(r => r.ExamId == exam.Id && r.StudentId == studentId)).FirstOrDefault();
                var totalMarks = (subMark.TheoryMarks ?? 0) + (subMark.PracticalMarks ?? 0);
                var grade = CalculateGrade(totalMarks);

                if (examResult == null)
                {
                    examResult = new ExamResult
                    {
                        Id = Guid.NewGuid(),
                        ExamId = exam.Id,
                        StudentId = studentId,
                        TheoryMarks = subMark.TheoryMarks,
                        PracticalMarks = subMark.PracticalMarks,
                        MarksObtained = totalMarks,
                        Grade = grade,
                        Remarks = subMark.Remarks,
                        IsSubmitted = false
                    };
                    await _unitOfWork.ExamResults.AddAsync(examResult);
                }
                else
                {
                    examResult.TheoryMarks = subMark.TheoryMarks;
                    examResult.PracticalMarks = subMark.PracticalMarks;
                    examResult.MarksObtained = totalMarks;
                    examResult.Grade = grade;
                    examResult.Remarks = subMark.Remarks;
                    _unitOfWork.ExamResults.Update(examResult);
                }
            }

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        private string CalculateGrade(decimal marks)
        {
            if (marks >= 90) return "A+";
            if (marks >= 80) return "A";
            if (marks >= 70) return "B+";
            if (marks >= 60) return "B";
            if (marks >= 50) return "C";
            return "D";
        }

        private decimal ConvertGradeToPoints(string grade)
        {
            return grade switch
            {
                "A+" => 4.0m,
                "A" => 3.7m,
                "B+" => 3.3m,
                "B" => 3.0m,
                "C" => 2.0m,
                _ => 1.0m,
            };
        }

        private async Task CheckAndAutoPromoteStudent(Guid studentId, Guid schoolId)
        {
            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == studentId && e.Status == "ACTIVE")).FirstOrDefault();
            if (enrollment == null) return;

            var currentClass = await _unitOfWork.Classes.GetByIdAsync(enrollment.ClassId);
            if (currentClass == null || currentClass.SchoolId != schoolId) return;

            // Find all exams scheduled for this class with type "Final Examination" or "Semester Examination"
            var exams = await _unitOfWork.Exams.FindAsync(e => e.ClassId == currentClass.Id && (e.ExamType == "Final Examination" || e.ExamType == "Semester Examination"));
            if (!exams.Any()) return;

            var examIds = exams.Select(e => e.Id).ToList();
            var results = await _unitOfWork.ExamResults.FindAsync(r => r.StudentId == studentId && examIds.Contains(r.ExamId));

            // Must have taken all scheduled exams
            if (results.Count() < exams.Count()) return;

            int failedCount = results.Count(r => !r.MarksObtained.HasValue || r.MarksObtained.Value < 40);
            enrollment.FailedSubjectsCount = failedCount;
            bool hasFail = failedCount > 0;

            if (hasFail)
            {
                if (failedCount >= 3)
                {
                    enrollment.AcademicOutcomeRemark = $"Failed in {failedCount} subjects. Critical Fail - Retained for repeat academic year.";
                }
                else
                {
                    enrollment.AcademicOutcomeRemark = $"Failed in {failedCount} subject(s). Eligible for Compartment / Supplementary re-examination.";
                }
                _unitOfWork.Enrollments.Update(enrollment);
                await _unitOfWork.CompleteAsync();
                return;
            }

            // All exams passed: Record academic outcome on current enrollment for year-end promotion
            enrollment.AcademicOutcomeRemark = "Passed all subjects successfully. Eligible for Next Grade Promotion.";
            _unitOfWork.Enrollments.Update(enrollment);
            await _unitOfWork.CompleteAsync();
        }

        [HttpGet("student/academic-history")]
        [Authorize(Roles = "student,schooladmin,teacher,receptionist")]
        public async Task<IActionResult> GetStudentAcademicHistory([FromQuery] Guid? studentId)
        {
            var userId = GetUserId();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            Guid targetStudentId = (role == "schooladmin" || role == "teacher" || role == "receptionist") && studentId.HasValue ? studentId.Value : userId;
            var schoolId = GetSchoolId();

            var enrollments = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == targetStudentId))
                .OrderByDescending(e => e.EnrollDate)
                .ToList();
            var currentEnrollment = enrollments.FirstOrDefault();
            Guid? currentClassId = currentEnrollment?.ClassId;

            var examResults = await _unitOfWork.ExamResults.FindAsync(er => er.StudentId == targetStudentId);
            if (!examResults.Any())
            {
                return Ok(new List<object>());
            }

            var exams = await _unitOfWork.Exams.GetAllAsync();
            var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var subjects = await _unitOfWork.Subjects.FindAsync(s => s.SchoolId == schoolId);

            // Filter out current class exam results if the student is actively enrolled in that class
            var pastResults = examResults
                .Select(r => new { Result = r, Exam = exams.FirstOrDefault(e => e.Id == r.ExamId) })
                .Where(x => x.Exam != null && (currentClassId == null || x.Exam.ClassId != currentClassId))
                .ToList();

            if (!pastResults.Any())
            {
                return Ok(new List<object>());
            }

            var historyGrouped = pastResults
                .GroupBy(x => x.Exam.ClassId)
                .Select(g => {
                    var classObj = classes.FirstOrDefault(c => c.Id == g.Key);
                    var className = classObj != null ? $"Class {classObj.Grade} - {classObj.Section}" : "Previous Grade";

                    var pastEnrollment = enrollments.FirstOrDefault(e => e.ClassId == g.Key);

                    var finalExamIds = exams.Where(e => e.ClassId == g.Key && (e.ExamType == "Final Examination" || e.ExamType == "Semester Examination")).Select(e => e.Id).ToList();
                    var finalResultsForClass = g.Where(x => finalExamIds.Contains(x.Result.ExamId)).ToList();
                    if (!finalResultsForClass.Any())
                    {
                        finalResultsForClass = g.ToList();
                    }

                    decimal gpa = 0;
                    string finalResult = pastEnrollment?.Status switch
                    {
                        "PROMOTED" => "Pass (Promoted)",
                        "ADMIN_PROMOTED" => "Pass (Admin Discretion)",
                        "RETAINED_REPEAT" => "Fail (Retained)",
                        "COMPARTMENT" => "Compartment",
                        _ => "Evaluated"
                    };

                    if (finalResultsForClass.Any())
                    {
                        decimal totalPoints = 0;
                        int count = 0;
                        bool hasFail = false;
                        foreach (var x in finalResultsForClass)
                        {
                            if (x.Result.MarksObtained.HasValue)
                            {
                                totalPoints += x.Result.Grade switch
                                {
                                    "A+" => 4.0m,
                                    "A" => 3.7m,
                                    "B+" => 3.3m,
                                    "B" => 3.0m,
                                    "C" => 2.0m,
                                    _ => 1.0m
                                };
                                count++;
                                if (x.Result.MarksObtained.Value < 40)
                                {
                                    hasFail = true;
                                }
                            }
                        }
                        gpa = count > 0 ? Math.Round(totalPoints / count, 2) : 0;
                        if (pastEnrollment == null || pastEnrollment.Status == "ACTIVE")
                        {
                            finalResult = hasFail ? "Fail" : (count > 0 ? "Pass" : "No Exam Records");
                        }
                    }

                    var subjectDetails = g.Select(x => {
                        var subject = subjects.FirstOrDefault(s => s.Id == x.Exam.SubjectId);
                        return new {
                            SubjectName = subject?.Name ?? "General Subject",
                            ExamType = x.Exam.ExamType ?? "Semester Examination",
                            InternalMarks = x.Result.PracticalMarks ?? 0,
                            TheoryMarks = x.Result.TheoryMarks ?? 0,
                            TotalMarks = x.Result.MarksObtained ?? 0,
                            Grade = x.Result.Grade ?? ((x.Result.MarksObtained ?? 0) >= 40 ? "Pass" : "F"),
                            Status = (x.Result.MarksObtained ?? 0) >= 40 ? "Pass" : "Fail"
                        };
                    }).ToList();

                    return new {
                        ClassId = g.Key,
                        ClassName = className,
                        AcademicYear = pastEnrollment?.AcademicYear ?? "Past Session",
                        EnrollmentStatus = pastEnrollment?.Status ?? "Archived",
                        AcademicRemark = pastEnrollment?.AcademicOutcomeRemark ?? (finalResult.Contains("Fail") ? "Academic Retention" : "Promoted to Next Grade"),
                        Gpa = gpa,
                        FinalResult = finalResult,
                        Subjects = subjectDetails
                    };
                })
                .ToList();

            return Ok(historyGrouped);
        }
        // POST: /api/exams/{id}/upload-question-paper
        [HttpPost("{id}/upload-question-paper")]
        public async Task<IActionResult> UploadQuestionPaper(Guid id, [FromBody] UploadQuestionPaperRequest req)
        {
            var exam = await _unitOfWork.Exams.GetByIdAsync(id);
            if (exam == null) return NotFound(new { error = "Exam schedule not found." });

            var todayUtc = DateTime.UtcNow.Date;
            var deadlineDate = exam.Date.Date.AddDays(-3);

            // Check 3-Day Rule: Teacher must upload at least 3 days before the exam date
            // (School Admin / Super Admin can override if an emergency arises)
            var isTeacher = User.IsInRole("teacher");
            if (isTeacher && todayUtc > deadlineDate)
            {
                var daysRemaining = (exam.Date.Date - todayUtc).TotalDays;
                return BadRequest(new
                {
                    error = $"Submission Deadline Passed! Question papers must be uploaded at least 3 days before the exam ({deadlineDate:dd MMM yyyy}). Only {daysRemaining} day(s) remain until the exam date ({exam.Date:dd MMM yyyy}). Please contact School Administration to request an emergency override."
                });
            }

            if (string.IsNullOrWhiteSpace(req.FileUrl) && string.IsNullOrWhiteSpace(req.PaperContent))
            {
                return BadRequest(new { error = "Please provide a valid question paper document or formatted paper content." });
            }

            var userId = GetUserId();
            exam.QuestionPaperUrl = req.FileUrl ?? req.PaperContent;
            exam.QuestionPaperUploadedAt = DateTime.UtcNow;
            exam.QuestionPaperUploadedByTeacherId = userId;
            exam.QuestionPaperNotes = req.Notes;

            _unitOfWork.Exams.Update(exam);
            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                message = "Question paper submitted successfully! School Administration has been notified.",
                examId = exam.Id,
                submittedAt = exam.QuestionPaperUploadedAt,
                deadlineMet = todayUtc <= deadlineDate
            });
        }

        [HttpPost("send-pending-paper-alerts")]
        [Authorize(Roles = "schooladmin,superadmin,teacher")]
        public async Task<IActionResult> SendPendingPaperAlerts()
        {
            var schoolId = GetSchoolId();
            var todayUtc = DateTime.UtcNow.Date;
            var exams = await _unitOfWork.Exams.GetAllAsync();

            var pendingExams = exams
                .Where(e => string.IsNullOrWhiteSpace(e.QuestionPaperUrl))
                .Where(e => {
                    var days = (e.Date.Date - todayUtc).TotalDays;
                    return days <= 5 && days >= 0;
                })
                .ToList();

            int alertsSent = 0;
            var report = new List<object>();

            foreach (var exam in pendingExams)
            {
                var daysLeft = (int)Math.Ceiling((exam.Date.Date - todayUtc).TotalDays);
                var deadlineDate = exam.Date.Date.AddDays(-3);

                var subject = await _unitOfWork.Subjects.GetByIdAsync(exam.SubjectId);
                var cls = await _unitOfWork.Classes.GetByIdAsync(exam.ClassId);
                var subjectName = subject?.Name ?? "Subject";
                var className = cls != null ? $"{cls.Grade} - {cls.Section}" : "Class";

                var classSubjects = await _unitOfWork.ClassSubjects.FindAsync(cs => cs.ClassId == exam.ClassId && cs.SubjectId == exam.SubjectId);
                var assigned = classSubjects.FirstOrDefault(cs => cs.TeacherId.HasValue);

                User? teacherUser = null;
                if (assigned?.TeacherId != null)
                {
                    teacherUser = await _unitOfWork.Users.GetByIdAsync(assigned.TeacherId.Value);
                }
                else if (cls?.ClassTeacherId != null)
                {
                    teacherUser = await _unitOfWork.Users.GetByIdAsync(cls.ClassTeacherId.Value);
                }

                if (teacherUser != null)
                {
                    var teacherName = $"{teacherUser.FirstName} {teacherUser.LastName}".Trim();
                    var emps = await _unitOfWork.Employees.FindAsync(e => e.UserId == teacherUser.Id);
                    var teacherPhone = emps.FirstOrDefault()?.Phone;

                    if (!string.IsNullOrWhiteSpace(teacherPhone))
                    {
                        var whatsappMsg = $"📋 *EXAM QUESTION PAPER PENDING REMINDER*\n" +
                            $"Dear {teacherName},\n" +
                            $"• *Exam:* {subjectName} ({className})\n" +
                            $"• *Exam Date:* {exam.Date:dd/MM/yyyy}\n" +
                            $"• *Days Remaining:* {daysLeft} Days\n" +
                            $"• *Submission Deadline:* {deadlineDate:dd/MM/yyyy} (Strictly 3 days prior)\n\n" +
                            $"⚠️ Submissions lock automatically 3 days prior to the exam. Please upload immediately via your EduVault Teacher Portal.";

                        try
                        {
                            await _whatsAppService.SendMessageAsync(teacherPhone, whatsappMsg, cls?.SchoolId ?? schoolId);
                            alertsSent++;
                        }
                        catch { }
                    }

                    report.Add(new
                    {
                        examId = exam.Id,
                        subject = subjectName,
                        className = className,
                        examDate = exam.Date.ToString("yyyy-MM-dd"),
                        deadlineDate = deadlineDate.ToString("yyyy-MM-dd"),
                        teacher = teacherName,
                        daysLeft = daysLeft
                    });
                }
            }

            return Ok(new
            {
                message = $"5-day countdown check executed. Sent {alertsSent} alerts for {pendingExams.Count} pending exams.",
                alertsSent,
                pendingCount = pendingExams.Count,
                exams = report
            });
        }
    }

    public class UploadQuestionPaperRequest
    {
        public string? FileUrl { get; set; }
        public string? PaperContent { get; set; }
        public string? Notes { get; set; }
    }

    public class EnterStudentMarksRequest
    {
        public Guid StudentId { get; set; }
        public string ExamType { get; set; } = "Semester Examination";
        public List<SubjectMarkDto> Subjects { get; set; } = new List<SubjectMarkDto>();
    }

    public class SubjectMarkDto
    {
        public Guid SubjectId { get; set; }
        public decimal? TheoryMarks { get; set; }
        public decimal? PracticalMarks { get; set; }
        public string Remarks { get; set; } = string.Empty;
    }

    public class PublishScheduleRequest
    {
        public Guid ClassId { get; set; }
        public string ExamType { get; set; } = string.Empty;
    }
}
