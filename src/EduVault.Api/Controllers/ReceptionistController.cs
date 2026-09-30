using System;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Collections.Concurrent;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;
using EduVault.Api.Services;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/receptionist")]
    [Authorize(Roles = "receptionist,Receptionist,schooladmin,SchoolAdmin,superadmin,SuperAdmin")]
    public class ReceptionistController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly EduVaultDbContext _context;
        private readonly Services.WhatsAppService _whatsAppService;
        private readonly IAuthService _authService;

        public ReceptionistController(IUnitOfWork unitOfWork, EduVaultDbContext context, Services.WhatsAppService whatsAppService, IAuthService authService)
        {
            _unitOfWork = unitOfWork;
            _context = context;
            _whatsAppService = whatsAppService;
            _authService = authService;
        }

        private Guid GetSchoolId()
        {
            if (User.IsInRole("superadmin") || User.IsInRole("SuperAdmin"))
            {
                var qSchoolId = HttpContext.Request.Query["schoolId"].FirstOrDefault();
                if (!string.IsNullOrEmpty(qSchoolId) && Guid.TryParse(qSchoolId, out var saSchoolId))
                    return saSchoolId;

                var hSchoolId = HttpContext.Request.Headers["X-School-Id"].FirstOrDefault();
                if (!string.IsNullOrEmpty(hSchoolId) && Guid.TryParse(hSchoolId, out var headerSchoolId))
                    return headerSchoolId;

                var firstSchool = _context.Schools.Select(s => s.Id).FirstOrDefault();
                if (firstSchool != Guid.Empty) return firstSchool;

                throw new UnauthorizedAccessException("Super Admin must provide schoolId via query parameter (?schoolId=...) or X-School-Id header.");
            }

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

        // ==========================================
        // 1. Universal Fast Search (Student 360)
        // ==========================================
        [HttpGet("search-student")]
        public async Task<IActionResult> SearchStudent([FromQuery] string? q)
        {
            var schoolId = GetSchoolId();
            if (string.IsNullOrWhiteSpace(q))
            {
                return Ok(new List<object>());
            }

            var query = q.Trim().ToLower();

            var studentUsers = await _context.Users.AsNoTracking()
                .Where(u => u.SchoolId == schoolId && (u.Role == "student" || u.Role == "Student") && u.IsActive)
                .ToListAsync();

            if (!studentUsers.Any())
            {
                return Ok(new List<object>());
            }

            var userIds = studentUsers.Select(u => u.Id).ToList();

            var studentProfiles = await _context.Students.AsNoTracking()
                .Where(s => userIds.Contains(s.UserId))
                .ToListAsync();

            var enrollments = await _context.Enrollments.AsNoTracking()
                .Where(e => userIds.Contains(e.StudentId) && e.Status == "ACTIVE")
                .Include(e => e.Class)
                .ToListAsync();

            var filtered = studentUsers.Where(u =>
            {
                var profile = studentProfiles.FirstOrDefault(s => s.UserId == u.Id);
                var enroll = enrollments.FirstOrDefault(e => e.StudentId == u.Id);
                var fullName = $"{u.FirstName} {u.LastName}".ToLower();
                var studentCode = (profile?.StudentId ?? "").ToLower();
                var phone = (profile?.GuardianPhone ?? "").ToLower();
                var guardianName = (profile?.GuardianName ?? "").ToLower();
                var className = enroll?.Class != null ? $"class {enroll.Class.Grade} {enroll.Class.Section}".ToLower() : "";

                return fullName.Contains(query) ||
                       studentCode.Contains(query) ||
                       phone.Contains(query) ||
                       guardianName.Contains(query) ||
                       className.Contains(query) ||
                       (u.Email ?? "").ToLower().Contains(query);
            }).Take(15).ToList();

            var result = filtered.Select(u =>
            {
                var profile = studentProfiles.FirstOrDefault(s => s.UserId == u.Id);
                var enroll = enrollments.FirstOrDefault(e => e.StudentId == u.Id);
                return new
                {
                    id = u.Id,
                    name = $"{u.FirstName} {u.LastName}",
                    email = u.Email,
                    studentId = profile?.StudentId ?? "N/A",
                    className = enroll?.Class != null ? $"Class {enroll.Class.Grade}-{enroll.Class.Section}" : "Not Assigned",
                    grade = enroll?.Class?.Grade ?? "",
                    section = enroll?.Class?.Section ?? "",
                    room = enroll?.Class?.Room ?? "N/A",
                    classId = enroll?.ClassId,
                    guardianName = profile?.GuardianName ?? "N/A",
                    guardianPhone = profile?.GuardianPhone ?? "N/A",
                    guardianRelationship = profile?.GuardianRelationship ?? "Guardian",
                    address = profile?.Address ?? ""
                };
            });

            return Ok(result);
        }

        // ==========================================
        // 2. Student Live Period & Location Finder
        // ==========================================
        [HttpGet("student-live-status/{studentId}")]
        public async Task<IActionResult> GetStudentLiveStatus(Guid studentId)
        {
            var schoolId = GetSchoolId();

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == studentId && u.SchoolId == schoolId && u.Role == "student");
            if (user == null) return NotFound(new { error = "Student not found in this school" });

            var profile = await _context.Students.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == studentId);
            var enrollment = await _context.Enrollments.AsNoTracking()
                .Include(e => e.Class)
                .FirstOrDefaultAsync(e => e.StudentId == studentId && e.Status == "ACTIVE");

            // Today's Attendance
            var todayUtc = DateTime.UtcNow.Date;
            var attendanceRecord = await _context.Attendances.AsNoTracking()
                .FirstOrDefaultAsync(a => a.StudentId == studentId && a.Date.Date == todayUtc);

            string attendanceStatus = attendanceRecord?.Status ?? "Not Marked";

            // Live Timetable Period Tracking
            var nowTime = DateTime.UtcNow.ToString("HH:mm");
            var dayOfWeek = DateTime.UtcNow.DayOfWeek.ToString();

            var periods = await _context.TimetablePeriods.AsNoTracking()
                .Where(p => p.SchoolId == schoolId)
                .OrderBy(p => p.PeriodNumber)
                .ToListAsync();

            TimetablePeriod? activePeriod = null;
            int remainingMinutes = 0;

            foreach (var p in periods)
            {
                if (string.Compare(nowTime, p.StartTime, StringComparison.Ordinal) >= 0 &&
                    string.Compare(nowTime, p.EndTime, StringComparison.Ordinal) <= 0)
                {
                    activePeriod = p;
                    if (TimeSpan.TryParse(p.EndTime, out var endTs) && TimeSpan.TryParse(nowTime, out var nowTs))
                    {
                        remainingMinutes = Math.Max(0, (int)(endTs - nowTs).TotalMinutes);
                    }
                    break;
                }
            }

            // Timetable Item for current class and day
            TimetableItem? currentItem = null;
            string subjectName = "Free / Study Period";
            string teacherName = "Class Teacher / Supervised";
            string roomNumber = enrollment?.Class?.Room ?? "Room 101";

            if (enrollment?.ClassId != null && activePeriod != null)
            {
                currentItem = await _context.TimetableItems.AsNoTracking()
                    .Include(t => t.Subject)
                    .Include(t => t.Teacher).ThenInclude(t => t!.User)
                    .FirstOrDefaultAsync(t => t.SchoolId == schoolId &&
                                              t.ClassId == enrollment.ClassId &&
                                              t.PeriodNumber == activePeriod.PeriodNumber &&
                                              t.DayOfWeek.ToLower() == dayOfWeek.ToLower());

                if (currentItem != null)
                {
                    subjectName = !string.IsNullOrEmpty(currentItem.CustomSubjectName) ? currentItem.CustomSubjectName : (currentItem.Subject?.Name ?? "General");
                    if (currentItem.Teacher?.User != null)
                    {
                        teacherName = $"{currentItem.Teacher.User.FirstName} {currentItem.Teacher.User.LastName}";
                    }
                }
            }

            // Next period preview
            string nextPeriodInfo = "End of schedule";
            if (activePeriod != null)
            {
                var nextP = periods.FirstOrDefault(p => p.PeriodNumber == activePeriod.PeriodNumber + 1);
                if (nextP != null)
                {
                    nextPeriodInfo = $"Period {nextP.PeriodNumber} ({nextP.StartTime} - {nextP.EndTime})";
                }
            }

            return Ok(new
            {
                student = new
                {
                    id = user.Id,
                    name = $"{user.FirstName} {user.LastName}",
                    email = user.Email,
                    studentId = profile?.StudentId ?? "N/A",
                    className = enrollment?.Class != null ? $"Class {enrollment.Class.Grade}-{enrollment.Class.Section}" : "Unassigned",
                    room = roomNumber,
                    guardianName = profile?.GuardianName ?? "N/A",
                    guardianPhone = profile?.GuardianPhone ?? "N/A",
                    guardianRelationship = profile?.GuardianRelationship ?? "Guardian",
                    address = profile?.Address ?? "N/A"
                },
                liveStatus = new
                {
                    todayAttendance = attendanceStatus,
                    currentPeriodNumber = activePeriod?.PeriodNumber ?? 0,
                    periodTiming = activePeriod != null ? $"{activePeriod.StartTime} - {activePeriod.EndTime}" : "Outside School Hours",
                    remainingMinutes,
                    currentSubject = subjectName,
                    currentTeacher = teacherName,
                    roomNumber,
                    nextPeriod = nextPeriodInfo,
                    isSchoolInSession = activePeriod != null
                }
            });
        }

        // ==========================================
        // 3. Fast Counter Fee Desk (Summary & Dues)
        // ==========================================
        [HttpGet("student-fee-summary/{studentId}")]
        public async Task<IActionResult> GetStudentFeeSummary(Guid studentId)
        {
            var schoolId = GetSchoolId();

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == studentId && u.SchoolId == schoolId && u.Role == "student");
            if (user == null) return NotFound(new { error = "Student not found in this school" });

            var invoices = await _context.Invoices.AsNoTracking()
                .Where(i => i.StudentId == studentId)
                .Include(i => i.FeeStructure)
                .OrderByDescending(i => i.DueDate)
                .ToListAsync();

            decimal totalFees = invoices.Sum(i => i.Amount);
            decimal totalPaid = invoices.Where(i => i.Status == "Paid").Sum(i => i.Amount);
            decimal totalDue = invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled").Sum(i => i.Amount);

            var invoiceList = invoices.Select(i => new
            {
                id = i.Id,
                title = i.FeeStructure?.Name ?? "School Fee Invoice",
                frequency = i.FeeStructure?.Frequency ?? "One-Time",
                amount = i.Amount,
                dueDate = i.DueDate.ToString("dd MMM yyyy"),
                issueDate = i.IssueDate.ToString("dd MMM yyyy"),
                status = i.Status,
                isOverdue = i.Status != "Paid" && i.DueDate.Date < DateTime.UtcNow.Date
            }).ToList();

            var transactions = await _context.Transactions.AsNoTracking()
                .Where(t => invoices.Select(i => i.Id).Contains(t.InvoiceId) && t.Status.ToLower() == "success")
                .OrderByDescending(t => t.TransactionDate)
                .Select(t => new
                {
                    id = t.Id,
                    referenceNumber = t.ReferenceNumber,
                    amount = t.Amount,
                    paymentMethod = t.PaymentMethod,
                    date = t.TransactionDate.ToString("dd MMM yyyy, hh:mm tt")
                })
                .ToListAsync();

            return Ok(new
            {
                studentId,
                studentName = $"{user.FirstName} {user.LastName}",
                totalFees,
                totalPaid,
                totalDue,
                hasOutstandingDues = totalDue > 0,
                invoices = invoiceList,
                recentPayments = transactions
            });
        }

        // ==========================================
        // 2b. Unified Student Details (Info, Live & Fee)
        // ==========================================
        [HttpGet("student-details/{studentId}")]
        public async Task<IActionResult> GetStudentDetails(Guid studentId)
        {
            var schoolId = GetSchoolId();

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == studentId && u.SchoolId == schoolId && u.Role == "student");
            if (user == null) return NotFound(new { error = "Student not found in this school" });

            var profile = await _context.Students.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == studentId);
            var enrollment = await _context.Enrollments.AsNoTracking()
                .Include(e => e.Class)
                .FirstOrDefaultAsync(e => e.StudentId == studentId && e.Status == "ACTIVE");

            // Live Timetable Period Tracking
            var nowTime = DateTime.UtcNow.ToString("HH:mm");
            var dayOfWeek = DateTime.UtcNow.DayOfWeek.ToString();

            var periods = await _context.TimetablePeriods.AsNoTracking()
                .Where(p => p.SchoolId == schoolId)
                .OrderBy(p => p.PeriodNumber)
                .ToListAsync();

            TimetablePeriod? activePeriod = null;
            int remainingMinutes = 0;

            foreach (var p in periods)
            {
                if (string.Compare(nowTime, p.StartTime, StringComparison.Ordinal) >= 0 &&
                    string.Compare(nowTime, p.EndTime, StringComparison.Ordinal) <= 0)
                {
                    activePeriod = p;
                    if (TimeSpan.TryParse(p.EndTime, out var endTs) && TimeSpan.TryParse(nowTime, out var nowTs))
                    {
                        remainingMinutes = Math.Max(0, (int)(endTs - nowTs).TotalMinutes);
                    }
                    break;
                }
            }

            TimetableItem? currentItem = null;
            string subjectName = "Free / Study Period";
            string teacherName = "Class Teacher / Supervised";
            string roomNumber = enrollment?.Class?.Room ?? "Room 101";

            if (enrollment?.ClassId != null && activePeriod != null)
            {
                currentItem = await _context.TimetableItems.AsNoTracking()
                    .Include(t => t.Subject)
                    .Include(t => t.Teacher).ThenInclude(t => t!.User)
                    .FirstOrDefaultAsync(t => t.SchoolId == schoolId &&
                                              t.ClassId == enrollment.ClassId &&
                                              t.PeriodNumber == activePeriod.PeriodNumber &&
                                              t.DayOfWeek.ToLower() == dayOfWeek.ToLower());

                if (currentItem != null)
                {
                    subjectName = !string.IsNullOrEmpty(currentItem.CustomSubjectName) ? currentItem.CustomSubjectName : (currentItem.Subject?.Name ?? "General");
                    if (currentItem.Teacher?.User != null)
                    {
                        teacherName = $"{currentItem.Teacher.User.FirstName} {currentItem.Teacher.User.LastName}";
                    }
                }
            }

            var invoices = await _context.Invoices.AsNoTracking()
                .Where(i => i.StudentId == studentId)
                .Include(i => i.FeeStructure)
                .OrderByDescending(i => i.DueDate)
                .ToListAsync();

            decimal totalFees = invoices.Sum(i => i.Amount);
            decimal totalPaid = invoices.Where(i => i.Status == "Paid").Sum(i => i.Amount);
            decimal totalDue = invoices.Where(i => i.Status != "Paid" && i.Status != "Cancelled").Sum(i => i.Amount);

            var invoiceList = invoices.Select(i => new
            {
                id = i.Id,
                title = i.FeeStructure?.Name ?? "School Fee Invoice",
                frequency = i.FeeStructure?.Frequency ?? "One-Time",
                amount = i.Amount,
                balance = i.Status == "Paid" ? 0 : i.Amount,
                dueDate = i.DueDate.ToString("yyyy-MM-dd"),
                issueDate = i.IssueDate.ToString("yyyy-MM-dd"),
                status = i.Status,
                isOverdue = i.Status != "Paid" && i.DueDate.Date < DateTime.UtcNow.Date
            }).ToList();

            return Ok(new
            {
                student = new
                {
                    id = user.Id,
                    name = $"{user.FirstName} {user.LastName}",
                    email = user.Email,
                    studentId = profile?.StudentId ?? "N/A",
                    className = enrollment?.Class != null ? $"Class {enrollment.Class.Grade}-{enrollment.Class.Section}" : "Unassigned",
                    room = roomNumber,
                    guardianName = profile?.GuardianName ?? "N/A",
                    guardianPhone = profile?.GuardianPhone ?? "N/A",
                    guardianRelationship = profile?.GuardianRelationship ?? "Guardian",
                    address = profile?.Address ?? "N/A"
                },
                liveStatus = new
                {
                    currentPeriod = activePeriod?.PeriodNumber ?? 0,
                    periodTiming = activePeriod != null ? $"{activePeriod.StartTime} - {activePeriod.EndTime}" : "Outside School Hours",
                    remainingMinutes,
                    subject = subjectName,
                    teacher = teacherName,
                    room = roomNumber,
                    isSchoolInSession = activePeriod != null
                },
                feeSummary = new
                {
                    totalFees,
                    totalPaid,
                    totalDue,
                    hasOutstandingDues = totalDue > 0,
                    invoices = invoiceList
                }
            });
        }

        // ==========================================
        // 4. Counter Spot Fee Collection
        // ==========================================
        [HttpPost("collect-spot-fee")]
        public async Task<IActionResult> CollectSpotFee([FromBody] CollectFeeRequest request)
        {
            return await CollectFee(request);
        }

        [HttpPost("collect-fee")]
        public async Task<IActionResult> CollectFee([FromBody] CollectFeeRequest request)
        {
            var schoolId = GetSchoolId();

            var invoice = await _context.Invoices
                .Include(i => i.FeeStructure)
                .FirstOrDefaultAsync(i => i.Id == request.InvoiceId && i.StudentId == request.StudentId);

            if (invoice == null) return NotFound(new { error = "Invoice not found for this student" });
            if (invoice.Status == "Paid") return BadRequest(new { error = "Invoice is already marked as Paid." });

            var studentUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == request.StudentId && u.SchoolId == schoolId);
            if (studentUser == null) return Forbid();

            decimal totalPayable = invoice.Amount + invoice.LateFineAmount;

            var allPaidTxns = await _context.Transactions
                .Where(t => t.InvoiceId == invoice.Id && (t.Status == "success" || t.Status == "SUCCESS" || t.Status == "Paid"))
                .SumAsync(t => t.Amount);

            decimal realPaid = Math.Max(invoice.PaidAmount, allPaidTxns);
            decimal remainingBalance = Math.Max(0, totalPayable - realPaid);

            if (remainingBalance <= 0 || invoice.Status == "Paid")
            {
                invoice.Status = "Paid";
                invoice.PaidAmount = totalPayable;
                _context.Invoices.Update(invoice);
                await _context.SaveChangesAsync();
                return BadRequest(new { error = "Invoice is already fully marked as Paid. No further payment required." });
            }

            if (request.Amount > remainingBalance)
            {
                return BadRequest(new { error = $"Payment amount (₹{request.Amount:N2}) cannot exceed the remaining balance of ₹{remainingBalance:N2}." });
            }

            decimal payAmount = request.Amount > 0 ? request.Amount : remainingBalance;
            if (payAmount <= 0)
            {
                return BadRequest(new { error = "Payment amount must be greater than zero." });
            }

            var referenceNo = $"COUNTER-{DateTime.UtcNow.Year}-{RandomNumberGenerator.GetInt32(100000, 999999)}";
            var transaction = new PaymentTransaction
            {
                InvoiceId = invoice.Id,
                ReferenceNumber = referenceNo,
                Amount = payAmount,
                PaymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod,
                TransactionDate = DateTime.UtcNow,
                Status = "success"
            };

            var strategy = _context.Database.CreateExecutionStrategy();
            try
            {
                await strategy.ExecuteAsync(async () =>
                {
                    using var dbTransaction = await _context.Database.BeginTransactionAsync();
                    await _context.Transactions.AddAsync(transaction);

                    invoice.PaidAmount += payAmount;
                    invoice.Status = (invoice.PaidAmount >= totalPayable) ? "Paid" : "Partially Paid";
                    _context.Invoices.Update(invoice);

                    await _context.SaveChangesAsync();
                    await dbTransaction.CommitAsync();
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Payment processing failed: " + ex.Message });
            }

            decimal newRemainingBalance = Math.Max(0, totalPayable - invoice.PaidAmount);

            // Dispatch WhatsApp Fee Receipt notification
            try
            {
                var studentProfile = await _context.Students.AsNoTracking().FirstOrDefaultAsync(s => s.UserId == request.StudentId);
                if (!string.IsNullOrWhiteSpace(studentProfile?.GuardianPhone))
                {
                    var msg = $"Dear Parent, Fee Payment of ₹{transaction.Amount:N2} for {studentUser.FirstName} {studentUser.LastName} ({invoice.FeeStructure?.Name ?? "School Fee"}) has been successfully received at the School Counter.\n" +
                              $"Receipt No: {referenceNo} | Paid Today: ₹{payAmount:N2} | Remaining Dues: ₹{newRemainingBalance:N2}.\n" +
                              $"---\n" +
                              $"प्रिय अभिभावक, {studentUser.FirstName} {studentUser.LastName} का ₹{payAmount:N2} का शुल्क काउंटर पर प्राप्त हुआ। रसीद: {referenceNo} | शेष बाकी: ₹{newRemainingBalance:N2}.";
                    _ = _whatsAppService.SendEventNotificationAsync(schoolId, "FEE_RECEIPT", studentProfile.GuardianPhone, msg);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WhatsApp Fee Receipt trigger error: {ex.Message}");
            }

            return Ok(new
            {
                success = true,
                transactionId = transaction.Id,
                referenceNumber = referenceNo,
                amountPaid = payAmount,
                totalBilled = totalPayable,
                remainingBalance = newRemainingBalance,
                invoiceStatus = invoice.Status,
                paymentMethod = transaction.PaymentMethod,
                paidAt = transaction.TransactionDate.ToString("dd MMM yyyy, hh:mm tt"),
                studentName = $"{studentUser.FirstName} {studentUser.LastName}",
                feeTitle = invoice.FeeStructure?.Name ?? "School Fee"
            });
        }

        // ==========================================
        // 5. Visitor Log (Walk-in Parent Register)
        // ==========================================
        [HttpGet("visitors")]
        public async Task<IActionResult> GetVisitors()
        {
            var schoolId = GetSchoolId();
            var list = await _context.Visitors
                .AsNoTracking()
                .Where(v => v.SchoolId == schoolId)
                .OrderByDescending(v => v.CheckInTime)
                .Take(100)
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost("visitors")]
        public async Task<IActionResult> AddVisitor([FromBody] AddVisitorRequest request)
        {
            var schoolId = GetSchoolId();
            var entry = new VisitorEntry
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                VisitorName = request.VisitorName,
                Phone = request.Phone,
                Purpose = request.Purpose,
                StudentName = request.StudentName ?? "N/A",
                ClassSection = request.ClassSection ?? "N/A",
                WhomToMeet = request.WhomToMeet ?? "Front Desk",
                CheckInTime = DateTime.UtcNow,
                Status = "Active"
            };

            await _context.Visitors.AddAsync(entry);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, visitor = entry });
        }

        [HttpPost("visitors/{id}/checkout")]
        public async Task<IActionResult> CheckoutVisitor(Guid id)
        {
            var schoolId = GetSchoolId();
            var entry = await _context.Visitors.FirstOrDefaultAsync(v => v.Id == id && v.SchoolId == schoolId);
            if (entry == null) return NotFound(new { error = "Visitor record not found." });

            entry.CheckOutTime = DateTime.UtcNow;
            entry.Status = "Checked Out";
            _context.Visitors.Update(entry);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        // ==========================================
        // 6. Early Student Gate Pass (Exit Token)
        // ==========================================
        [HttpGet("gate-passes")]
        public async Task<IActionResult> GetGatePasses()
        {
            var schoolId = GetSchoolId();
            var list = await _context.GatePasses
                .AsNoTracking()
                .Where(g => g.SchoolId == schoolId)
                .OrderByDescending(g => g.IssuedAt)
                .Take(100)
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost("gate-pass")]
        public async Task<IActionResult> IssueGatePass([FromBody] IssueGatePassRequest request)
        {
            var schoolId = GetSchoolId();
            var passNo = $"GP-{DateTime.UtcNow:yyMMdd}-{RandomNumberGenerator.GetInt32(1000, 9999)}";
            var entry = new GatePassEntry
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                PassNumber = passNo,
                StudentId = request.StudentId,
                StudentName = request.StudentName,
                ClassSection = request.ClassSection,
                ParentName = request.ParentName,
                ParentPhone = request.ParentPhone,
                Reason = request.Reason,
                IssuedAt = DateTime.UtcNow,
                Status = "Issued"
            };

            await _context.GatePasses.AddAsync(entry);
            await _context.SaveChangesAsync();

            // Dispatch WhatsApp Gate Pass notification
            if (!string.IsNullOrWhiteSpace(request.ParentPhone))
            {
                var msg = $"[SECURITY GATE PASS] Early Exit Pass #{passNo} has been authorized for {request.StudentName} ({request.ClassSection}). Guardian: {request.ParentName}. Reason: {request.Reason}. Valid today only.";
                _ = _whatsAppService.SendEventNotificationAsync(schoolId, "GATE_PASS", request.ParentPhone, msg);
            }

            return Ok(new { success = true, gatePass = entry });
        }

        // ==========================================
        // 7. Admission Inquiries (Walk-in Leads)
        // ==========================================
        [HttpGet("inquiries")]
        public async Task<IActionResult> GetInquiries()
        {
            var schoolId = GetSchoolId();
            var list = await _context.AdmissionInquiries
                .AsNoTracking()
                .Where(i => i.SchoolId == schoolId)
                .OrderByDescending(i => i.CreatedAt)
                .Take(100)
                .ToListAsync();
            return Ok(list);
        }

        [HttpPost("inquiries")]
        public async Task<IActionResult> AddInquiry([FromBody] AddInquiryRequest request)
        {
            var schoolId = GetSchoolId();
            var entry = new AdmissionInquiryEntry
            {
                Id = Guid.NewGuid(),
                SchoolId = schoolId,
                ChildName = request.ChildName,
                TargetClass = request.TargetClass,
                ParentName = request.ParentName,
                Phone = request.Phone,
                Address = request.Address ?? "",
                Notes = request.Notes ?? "",
                Status = string.IsNullOrWhiteSpace(request.Status) ? "Inquiry" : request.Status,
                CreatedAt = DateTime.UtcNow
            };

            await _context.AdmissionInquiries.AddAsync(entry);
            await _context.SaveChangesAsync();

            // Dispatch WhatsApp Admission Inquiry Welcome
            if (!string.IsNullOrWhiteSpace(request.Phone))
            {
                var msg = $"Dear {request.ParentName}, thank you for your visit regarding admission for {request.ChildName} ({request.TargetClass}). We are delighted by your interest in our institution. Our admissions team will connect with you shortly!";
                _ = _whatsAppService.SendEventNotificationAsync(schoolId, "ADMISSION_INQUIRY", request.Phone, msg);
            }

            return Ok(new { success = true, inquiry = entry });
        }

        [HttpPut("inquiries/{id}/status")]
        public async Task<IActionResult> UpdateInquiryStatus(Guid id, [FromBody] UpdateInquiryStatusRequest request)
        {
            var schoolId = GetSchoolId();
            var entry = await _context.AdmissionInquiries.FirstOrDefaultAsync(i => i.Id == id && i.SchoolId == schoolId);
            if (entry == null) return NotFound(new { error = "Inquiry record not found." });

            entry.Status = request.Status;
            _context.AdmissionInquiries.Update(entry);
            await _context.SaveChangesAsync();

            return Ok(new { success = true });
        }

        [HttpPost("inquiries/{id}/enroll")]
        public async Task<IActionResult> EnrollInquiry(Guid id, [FromBody] EnrollInquiryRequest request)
        {
            var schoolId = GetSchoolId();
            var inquiry = await _context.AdmissionInquiries.FirstOrDefaultAsync(i => i.Id == id && i.SchoolId == schoolId);
            if (inquiry == null) return NotFound(new { error = "Inquiry record not found." });

            if (inquiry.Status == "Enrolled")
            {
                return BadRequest(new { error = "This applicant is already enrolled." });
            }

            var cleanEmail = request.Email?.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(cleanEmail))
            {
                return BadRequest(new { error = "Valid student login email is required." });
            }

            var existingUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email.ToLower() == cleanEmail);
            if (existingUser != null)
            {
                return BadRequest(new { error = "Email address is already registered to another user." });
            }

            var targetGrade = string.IsNullOrWhiteSpace(request.Grade) ? inquiry.TargetClass : request.Grade.Trim();
            var targetSection = string.IsNullOrWhiteSpace(request.Section) ? "Section A" : request.Section.Trim();

            var classObj = await _context.Classes.FirstOrDefaultAsync(c => c.SchoolId == schoolId && c.Grade.ToLower() == targetGrade.ToLower() && c.Section.ToLower() == targetSection.ToLower());
            if (classObj == null)
            {
                classObj = new Class
                {
                    SchoolId = schoolId,
                    Grade = targetGrade,
                    Section = targetSection,
                    Level = int.TryParse(targetGrade.Replace("Class ", "").Trim(), out int gNum) && gNum >= 9 ? "Secondary Education" : "Primary Education",
                    Room = $"Room {targetGrade}",
                    Capacity = 40
                };
                await _context.Classes.AddAsync(classObj);
                await _context.SaveChangesAsync();
            }

            var firstName = inquiry.ChildFirstName ?? (inquiry.ChildName.Split(' ').FirstOrDefault() ?? "Student");
            var lastName = inquiry.ChildLastName ?? (inquiry.ChildName.Split(' ').Length > 1 ? string.Join(" ", inquiry.ChildName.Split(' ').Skip(1)) : "Scholar");

            var school = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schoolId);
            var schoolName = school?.Name ?? "School";

            var finalPassword = request.Password?.Trim();
            if (string.IsNullOrWhiteSpace(finalPassword))
            {
                finalPassword = PasswordRuleHelper.GeneratePassword(
                    school?.StudentPasswordPattern,
                    "student",
                    firstName,
                    lastName,
                    inquiry.DateOfBirth,
                    schoolName);
            }

            var user = new User
            {
                SchoolId = schoolId,
                Email = cleanEmail,
                PasswordHash = _authService.HashPassword(finalPassword),
                Role = "student",
                FirstName = firstName,
                LastName = lastName,
                IsActive = true
            };
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            var studentCode = request.AdmissionNumber;
            if (string.IsNullOrWhiteSpace(studentCode))
            {
                studentCode = $"STU-{DateTime.UtcNow.Year}-{RandomNumberGenerator.GetInt32(1000, 9999)}";
            }

            var student = new Student
            {
                UserId = user.Id,
                StudentId = studentCode,
                AdmissionNumber = studentCode,
                AdmissionDate = DateTime.UtcNow,
                AdmissionSource = inquiry.Source ?? "qr_form",
                BloodGroup = inquiry.BloodGroup ?? string.Empty,
                DateOfBirth = inquiry.DateOfBirth ?? string.Empty,
                Address = inquiry.Address ?? string.Empty,
                MiddleName = inquiry.ChildMiddleName,
                Gender = inquiry.Gender,
                Religion = inquiry.Religion,
                Category = inquiry.Category,
                Nationality = inquiry.Nationality ?? "Indian",
                MotherTongue = inquiry.MotherTongue,
                PlaceOfBirth = inquiry.PlaceOfBirth,
                AadhaarNumber = inquiry.AadhaarEncrypted,

                FatherName = inquiry.FatherName,
                FatherPhone = inquiry.FatherPhone,
                FatherOccupation = inquiry.FatherOccupation,
                FatherQualification = inquiry.FatherQualification,
                FatherEmail = inquiry.GuardianEmail,
                MotherName = inquiry.MotherName,
                MotherPhone = inquiry.MotherPhone,
                MotherOccupation = inquiry.MotherOccupation,
                AnnualFamilyIncome = inquiry.AnnualFamilyIncome,
                GuardianName = inquiry.FatherName ?? inquiry.ParentName,
                GuardianPhone = inquiry.FatherPhone ?? inquiry.Phone,
                GuardianRelationship = "Father",

                FeeCategory = request.FeeCategory ?? "General",
                BusRoute = request.BusRoute,
                HostelRequired = request.HostelRequired,

                HouseNo = inquiry.HouseNo,
                Village = inquiry.StreetOrVillage,
                City = inquiry.City,
                District = inquiry.District,
                State = inquiry.State,
                Pincode = inquiry.Pincode,

                PreviousSchoolName = inquiry.PreviousSchoolName,
                PreviousSchoolBoard = inquiry.PreviousBoard,
                PreviousClassStudied = inquiry.PreviousClassStudied,
                PreviousTcNumber = inquiry.PreviousTcNumber,
                PreviousTcDate = inquiry.PreviousTcDate,
                LastExamPercentage = inquiry.LastExamPercentage,
                ReasonForLeaving = inquiry.ReasonForLeaving,

                HeightCm = inquiry.HeightCm,
                WeightKg = inquiry.WeightKg,
                HasDisability = inquiry.HasDisability,
                DisabilityType = inquiry.DisabilityType,
                ChronicIllness = inquiry.ChronicIllness,
                CurrentMedication = inquiry.CurrentMedication,
                EmergencyContactName = inquiry.EmergencyContactName,
                EmergencyContactPhone = inquiry.EmergencyContactPhone,
                EmergencyContactRelation = inquiry.EmergencyContactRelation
            };
            await _context.Students.AddAsync(student);

            var enrollment = new Enrollment
            {
                StudentId = user.Id,
                ClassId = classObj.Id,
                AcademicYear = $"{DateTime.UtcNow.Year}-{((DateTime.UtcNow.Year + 1) % 100):D2}",
                Status = "ACTIVE",
                EnrollDate = DateTime.UtcNow
            };
            await _context.Enrollments.AddAsync(enrollment);

            inquiry.Status = "Enrolled";
            inquiry.ApprovedAt = DateTime.UtcNow;
            inquiry.ApprovedBy = User.FindFirst("firstName")?.Value ?? "School Admin";
            _context.AdmissionInquiries.Update(inquiry);

            await _context.SaveChangesAsync();

            if (request.SendWhatsAppCredentials && !string.IsNullOrWhiteSpace(inquiry.Phone))
            {
                var msg = $"🎉 Congratulations!\n\nDear {inquiry.ParentName},\n{inquiry.ChildName}'s admission to {schoolName} is confirmed.\n\n📋 Student Login Credentials:\nEmail: {cleanEmail}\nPassword: {finalPassword}\nClass: {targetGrade} - {targetSection}\nStudent ID: {studentCode}\n\n🔗 Login Portal: {Request.Scheme}://{Request.Host}/login\n\n— {schoolName} Administration";
                _ = _whatsAppService.SendEventNotificationAsync(schoolId, "ADMISSION_INQUIRY", inquiry.Phone, msg);
            }

            return Ok(new
            {
                success = true,
                message = $"{inquiry.ChildName} has been enrolled successfully into {targetGrade} - {targetSection}!",
                studentId = student.StudentId,
                userId = user.Id,
                email = cleanEmail
            });
        }

        [HttpDelete("inquiries/{id}")]
        public async Task<IActionResult> DeleteInquiry(Guid id)
        {
            var schoolId = GetSchoolId();
            var entry = await _context.AdmissionInquiries.FirstOrDefaultAsync(i => i.Id == id && i.SchoolId == schoolId);
            if (entry == null) return NotFound(new { error = "Inquiry not found." });

            _context.AdmissionInquiries.Remove(entry);
            await _context.SaveChangesAsync();
            return Ok(new { success = true, message = "Inquiry record deleted." });
        }

        [HttpDelete("inquiries/flagged-bots")]
        public async Task<IActionResult> PurgeFlaggedBots()
        {
            var schoolId = GetSchoolId();
            var deletedCount = await _context.AdmissionInquiries
                .Where(i => i.SchoolId == schoolId && i.IsHoneypotFlagged)
                .ExecuteDeleteAsync();

            return Ok(new { success = true, deletedCount, message = $"Purged {deletedCount} suspected bot submission(s)." });
        }

        // ==========================================
        // 8. Front Desk Dashboard Snapshot Stats
        // ==========================================
        [HttpGet("dashboard-stats")]
        public async Task<IActionResult> GetDashboardStats()
        {
            var schoolId = GetSchoolId();
            var todayUtc = DateTime.UtcNow.Date;

            var totalStudents = await _context.Users.AsNoTracking().CountAsync(u => u.SchoolId == schoolId && u.Role == "student" && u.IsActive);
            var totalClasses = await _context.Classes.AsNoTracking().CountAsync(c => c.SchoolId == schoolId);

            var todayPresent = await _context.Attendances.AsNoTracking()
                .CountAsync(a => a.SchoolId == schoolId && a.Date.Date == todayUtc && (a.Status == "Present" || a.Status == "Late"));

            var todayVisitors = await _context.Visitors.AsNoTracking()
                .CountAsync(v => v.SchoolId == schoolId && v.CheckInTime.Date == todayUtc);
            var activeVisitors = await _context.Visitors.AsNoTracking()
                .CountAsync(v => v.SchoolId == schoolId && v.Status == "Active");

            var todayGatePasses = await _context.GatePasses.AsNoTracking()
                .CountAsync(g => g.SchoolId == schoolId && g.IssuedAt.Date == todayUtc);

            var totalInquiries = await _context.AdmissionInquiries.AsNoTracking()
                .CountAsync(i => i.SchoolId == schoolId);

            return Ok(new
            {
                totalStudents,
                totalClasses,
                todayPresent,
                todayVisitors,
                activeVisitors,
                todayGatePasses,
                totalInquiries,
                currentTime = DateTime.UtcNow.ToString("hh:mm tt"),
                currentDate = DateTime.UtcNow.ToString("dddd, dd MMMM yyyy")
            });
        }
    }

    // --- Request & Data Transfer Objects ---

    public class CollectFeeRequest
    {
        public Guid StudentId { get; set; }
        public Guid InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public string PaymentMethod { get; set; } = "Cash";
        public string? Notes { get; set; }
    }

    public class AddVisitorRequest
    {
        public string VisitorName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty;
        public string? StudentName { get; set; }
        public string? ClassSection { get; set; }
        public string? WhomToMeet { get; set; }
    }

    public class IssueGatePassRequest
    {
        public Guid StudentId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string ClassSection { get; set; } = string.Empty;
        public string ParentName { get; set; } = string.Empty;
        public string ParentPhone { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }

    public class AddInquiryRequest
    {
        public string ChildName { get; set; } = string.Empty;
        public string TargetClass { get; set; } = string.Empty;
        public string ParentName { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? Notes { get; set; }
        public string? Status { get; set; }
    }

    public class UpdateInquiryStatusRequest
    {
        public string Status { get; set; } = "Inquiry";
    }

    public class EnrollInquiryRequest
    {
        public string Grade { get; set; } = string.Empty;
        public string Section { get; set; } = "Section A";
        public string? RollNumber { get; set; }
        public string? AdmissionNumber { get; set; }
        public string? FeeCategory { get; set; } = "General";
        public string? BusRoute { get; set; }
        public bool HostelRequired { get; set; } = false;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public bool SendWhatsAppCredentials { get; set; } = true;
    }
}
