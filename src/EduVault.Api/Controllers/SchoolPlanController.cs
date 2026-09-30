using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Api.Services;
using EduVault.Core.Entities;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/school-admin/plan")]
    [Authorize(Roles = "schooladmin,superadmin")]
    public class SchoolPlanController : ControllerBase
    {
        private readonly EduVaultDbContext _context;
        private readonly AiPlannerService _aiPlanner;
        private readonly WhatsAppService _whatsAppService;

        public SchoolPlanController(
            EduVaultDbContext context,
            AiPlannerService aiPlanner,
            WhatsAppService whatsAppService)
        {
            _context = context;
            _aiPlanner = aiPlanner;
            _whatsAppService = whatsAppService;
        }

        private Guid GetSchoolId()
        {
            var claim = User.FindFirst("schoolId")?.Value ?? User.FindFirst("SchoolId")?.Value;
            if (Guid.TryParse(claim, out var schoolId)) return schoolId;

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role == "SuperAdmin" || role == "superadmin")
            {
                if (Request.Query.TryGetValue("schoolId", out var qSchoolId) &&
                    Guid.TryParse(qSchoolId, out var parsedQId))
                {
                    return parsedQId;
                }

                var defaultSchool = _context.Schools.OrderBy(s => s.CreatedAt).FirstOrDefault();
                if (defaultSchool != null)
                {
                    return defaultSchool.Id;
                }
            }

            throw new UnauthorizedAccessException("Valid school context is required.");
        }

        // GET: /api/school-admin/plan/{academicYear}
        [HttpGet("{academicYear}")]
        public async Task<IActionResult> GetPlan(string academicYear)
        {
            var schoolId = GetSchoolId();
            var plan = await _context.AnnualSchoolPlans
                .Include(p => p.Events.OrderBy(e => e.StartDate))
                .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.AcademicYear == academicYear);

            if (plan == null)
            {
                return Ok(new
                {
                    hasPlan = false,
                    academicYear,
                    message = "No published or draft annual plan found for this academic year."
                });
            }

            return Ok(new
            {
                hasPlan = true,
                id = plan.Id,
                title = plan.Title,
                academicYear = plan.AcademicYear,
                status = plan.Status,
                createdAt = plan.CreatedAt,
                updatedAt = plan.UpdatedAt,
                totalEvents = plan.Events.Count,
                events = plan.Events.Select(e => new
                {
                    id = e.Id,
                    monthNumber = e.MonthNumber,
                    monthName = e.MonthName,
                    title = e.Title,
                    eventType = e.EventType,
                    startDate = e.StartDate.ToString("yyyy-MM-dd"),
                    endDate = e.EndDate?.ToString("yyyy-MM-dd"),
                    targetAudience = e.TargetAudience,
                    description = e.Description,
                    isWhatsAppNotified = e.IsWhatsAppNotified,
                    whatsAppNotifiedAt = e.WhatsAppNotifiedAt
                })
            });
        }

        // POST: /api/school-admin/plan/generate
        [HttpPost("generate")]
        public async Task<IActionResult> GeneratePlan([FromBody] GeneratePlanRequest request)
        {
            var schoolId = GetSchoolId();
            var yr = string.IsNullOrWhiteSpace(request.AcademicYear) ? $"{DateTime.UtcNow.Year}-{((DateTime.UtcNow.Year + 1) % 100):D2}" : request.AcademicYear.Trim();
            var board = string.IsNullOrWhiteSpace(request.Board) ? "CBSE" : request.Board.Trim();

            // Check if plan already exists
            var existingPlan = await _context.AnnualSchoolPlans
                .Include(p => p.Events)
                .FirstOrDefaultAsync(p => p.SchoolId == schoolId && p.AcademicYear == yr);

            var school = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schoolId);
            var schoolName = school?.Name ?? "School";

            var generatedEvents = await _aiPlanner.GenerateAnnualCalendarAsync(yr, board, request.CustomInstructions);

            if (existingPlan == null)
            {
                existingPlan = new AnnualSchoolPlan
                {
                    SchoolId = schoolId,
                    AcademicYear = yr,
                    Title = $"{schoolName} — Academic Calendar {yr} ({board})",
                    Status = "Published",
                    PromptCustomizations = request.CustomInstructions,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = User.FindFirst("firstName")?.Value ?? "School Admin"
                };
                await _context.AnnualSchoolPlans.AddAsync(existingPlan);
            }
            else
            {
                // Clear existing events for regeneration
                _context.SchoolPlanEvents.RemoveRange(existingPlan.Events);
                existingPlan.Title = $"{schoolName} — Academic Calendar {yr} ({board})";
                existingPlan.PromptCustomizations = request.CustomInstructions;
                existingPlan.UpdatedAt = DateTime.UtcNow;
            }

            foreach (var ev in generatedEvents)
            {
                var planEvent = new SchoolPlanEvent
                {
                    PlanId = existingPlan.Id,
                    SchoolId = schoolId,
                    MonthNumber = ev.MonthNumber,
                    MonthName = ev.MonthName,
                    Title = ev.Title,
                    EventType = ev.EventType,
                    StartDate = ParseUtc(ev.StartDate),
                    EndDate = ParseUtcNullable(ev.EndDate),
                    TargetAudience = ev.TargetAudience,
                    Description = ev.Description
                };
                existingPlan.Events.Add(planEvent);
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                planId = existingPlan.Id,
                academicYear = yr,
                board,
                totalEventsGenerated = generatedEvents.Count,
                message = $"Successfully generated {generatedEvents.Count} calendar milestones for Academic Year {yr}!"
            });
        }

        // POST: /api/school-admin/plan/events
        [HttpPost("events")]
        public async Task<IActionResult> AddEvent([FromBody] AddPlanEventRequest request)
        {
            var schoolId = GetSchoolId();
            var plan = await _context.AnnualSchoolPlans.FirstOrDefaultAsync(p => p.Id == request.PlanId && p.SchoolId == schoolId);
            if (plan == null) return NotFound(new { error = "Annual school plan not found." });

            var startDate = ParseUtc(request.StartDate);
            var planEvent = new SchoolPlanEvent
            {
                PlanId = plan.Id,
                SchoolId = schoolId,
                MonthNumber = startDate.Month >= 4 ? startDate.Month - 3 : startDate.Month + 9, // April = 1
                MonthName = startDate.ToString("MMMM"),
                Title = request.Title,
                EventType = request.EventType ?? "Academic",
                StartDate = startDate,
                EndDate = ParseUtcNullable(request.EndDate),
                TargetAudience = request.TargetAudience ?? "All",
                Description = request.Description
            };

            await _context.SchoolPlanEvents.AddAsync(planEvent);
            plan.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { success = true, eventId = planEvent.Id });
        }

        // DELETE: /api/school-admin/plan/events/{id}
        [HttpDelete("events/{id}")]
        public async Task<IActionResult> DeleteEvent(Guid id)
        {
            var schoolId = GetSchoolId();
            var ev = await _context.SchoolPlanEvents.FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);
            if (ev == null) return NotFound(new { error = "Calendar event not found." });

            _context.SchoolPlanEvents.Remove(ev);
            await _context.SaveChangesAsync();

            return Ok(new { success = true, message = "Event deleted." });
        }

        // POST: /api/school-admin/plan/events/{id}/broadcast-whatsapp
        [HttpPost("events/{id}/broadcast-whatsapp")]
        public async Task<IActionResult> BroadcastWhatsApp(Guid id)
        {
            var schoolId = GetSchoolId();
            var ev = await _context.SchoolPlanEvents.FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);
            if (ev == null) return NotFound(new { error = "Calendar event not found." });

            var school = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schoolId);
            var schoolName = school?.Name ?? "School";

            // Mark event as notified
            ev.IsWhatsAppNotified = true;
            ev.WhatsAppNotifiedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            // Sample parent contact for instant broadcast trigger
            var sampleStudent = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => !string.IsNullOrEmpty(s.GuardianPhone));

            if (sampleStudent != null && !string.IsNullOrEmpty(sampleStudent.GuardianPhone))
            {
                var msg = $"📅 *School Calendar Notification — {schoolName}*\n\nEvent: *{ev.Title}*\nDate: {ev.StartDate:dd MMM yyyy}\nAudience: {ev.TargetAudience}\n\nDetails: {ev.Description ?? "Please mark your calendars."}\n\n— {schoolName} Administration";
                _ = _whatsAppService.SendEventNotificationAsync(schoolId, "CALENDAR_EVENT", sampleStudent.GuardianPhone, msg);
            }

            return Ok(new
            {
                success = true,
                message = $"WhatsApp event broadcast dispatched for '{ev.Title}'."
            });
        }

        // PUT: /api/school-admin/plan/events/{id}
        [HttpPut("events/{id}")]
        public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdatePlanEventRequest request)
        {
            var schoolId = GetSchoolId();
            var ev = await _context.SchoolPlanEvents.FirstOrDefaultAsync(e => e.Id == id && e.SchoolId == schoolId);
            if (ev == null) return NotFound(new { error = "Calendar event not found." });

            var startDate = ParseUtc(request.StartDate);
            ev.Title = request.Title.Trim();
            ev.EventType = request.EventType ?? ev.EventType;
            ev.StartDate = startDate;
            ev.EndDate = ParseUtcNullable(request.EndDate);
            ev.TargetAudience = request.TargetAudience ?? ev.TargetAudience;
            ev.Description = request.Description;

            // Recalculate month number & name (April = 1)
            ev.MonthNumber = startDate.Month >= 4 ? startDate.Month - 3 : startDate.Month + 9;
            ev.MonthName = startDate.ToString("MMMM");

            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Event updated successfully.",
                ev = new
                {
                    id = ev.Id,
                    monthNumber = ev.MonthNumber,
                    monthName = ev.MonthName,
                    title = ev.Title,
                    eventType = ev.EventType,
                    startDate = ev.StartDate.ToString("yyyy-MM-dd"),
                    endDate = ev.EndDate?.ToString("yyyy-MM-dd"),
                    targetAudience = ev.TargetAudience,
                    description = ev.Description,
                    isWhatsAppNotified = ev.IsWhatsAppNotified,
                    whatsAppNotifiedAt = ev.WhatsAppNotifiedAt
                }
            });
        }

        // POST: /api/school-admin/plan/broadcast-month
        [HttpPost("broadcast-month")]
        public async Task<IActionResult> BroadcastMonth([FromBody] BroadcastMonthRequest request)
        {
            var schoolId = GetSchoolId();
            var events = await _context.SchoolPlanEvents
                .Where(e => e.PlanId == request.PlanId && e.SchoolId == schoolId && e.MonthNumber == request.MonthNumber)
                .OrderBy(e => e.StartDate)
                .ToListAsync();

            if (!events.Any())
            {
                return BadRequest(new { error = "No events found in this month to broadcast." });
            }

            var school = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(s => s.Id == schoolId);
            var schoolName = school?.Name ?? "School";
            var monthName = events.First().MonthName;

            // Mark all as notified
            foreach (var ev in events)
            {
                ev.IsWhatsAppNotified = true;
                ev.WhatsAppNotifiedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();

            // Construct consolidated message
            var sb = new System.Text.StringBuilder();
            sb.AppendLine($"📅 *Monthly Academic Calendar — {schoolName}*");
            sb.AppendLine($"📆 *Month: {monthName}*\n");
            sb.AppendLine("Below are the scheduled school milestones & activities for this month:\n");

            int idx = 1;
            foreach (var ev in events)
            {
                var dateRange = ev.EndDate.HasValue && ev.EndDate.Value.Date != ev.StartDate.Date
                    ? $"{ev.StartDate:dd MMM} - {ev.EndDate:dd MMM yyyy}"
                    : $"{ev.StartDate:dd MMM yyyy}";

                sb.AppendLine($"{idx}. *{ev.Title}* ({ev.EventType})");
                sb.AppendLine($"   🗓 Date: {dateRange}");
                sb.AppendLine($"   👥 Audience: {ev.TargetAudience}");
                if (!string.IsNullOrWhiteSpace(ev.Description))
                {
                    sb.AppendLine($"   📝 {ev.Description}");
                }
                sb.AppendLine();
                idx++;
            }
            sb.AppendLine($"— {schoolName} Administration");

            var sampleStudent = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => !string.IsNullOrEmpty(s.GuardianPhone));

            if (sampleStudent != null && !string.IsNullOrEmpty(sampleStudent.GuardianPhone))
            {
                _ = _whatsAppService.SendEventNotificationAsync(schoolId, "CALENDAR_MONTHLY_BROADCAST", sampleStudent.GuardianPhone, sb.ToString());
            }

            return Ok(new
            {
                success = true,
                count = events.Count,
                monthName,
                message = $"Successfully dispatched monthly WhatsApp calendar for {monthName} ({events.Count} events)!"
            });
        }

        private static DateTime ParseUtc(string? dateStr)
        {
            if (DateTime.TryParse(dateStr, out var dt))
            {
                return dt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
                    : dt.ToUniversalTime();
            }
            return DateTime.UtcNow;
        }

        private static DateTime? ParseUtcNullable(string? dateStr)
        {
            if (string.IsNullOrWhiteSpace(dateStr)) return null;
            if (DateTime.TryParse(dateStr, out var dt))
            {
                return dt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
                    : dt.ToUniversalTime();
            }
            return null;
        }

        // POST: /api/school-admin/plan/generate-question-paper
        [HttpPost("generate-question-paper")]
        [Authorize]
        public async Task<IActionResult> GenerateQuestionPaper([FromBody] QuestionPaperRequestDto req)
        {
            try
            {
                var schoolId = GetSchoolId();
                var school = await _context.Schools.FindAsync(schoolId);
                var paper = await _aiPlanner.GenerateQuestionPaperAsync(req);
                if (school != null)
                {
                    paper.SchoolName = school.Name;
                }
                return Ok(paper);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }
    }

    public class GeneratePlanRequest
    {
        public string? AcademicYear { get; set; }
        public string? Board { get; set; } = "CBSE";
        public string? CustomInstructions { get; set; }
    }

    public class AddPlanEventRequest
    {
        public Guid PlanId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? EventType { get; set; } = "Academic";
        public string StartDate { get; set; } = string.Empty;
        public string? EndDate { get; set; }
        public string? TargetAudience { get; set; } = "All";
        public string? Description { get; set; }
    }

    public class UpdatePlanEventRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? EventType { get; set; }
        public string StartDate { get; set; } = string.Empty;
        public string? EndDate { get; set; }
        public string? TargetAudience { get; set; }
        public string? Description { get; set; }
    }

    public class BroadcastMonthRequest
    {
        public Guid PlanId { get; set; }
        public int MonthNumber { get; set; }
    }
}
