using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Api.Services;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    public class WhatsAppWebhookController : ControllerBase
    {
        private readonly EduVaultDbContext _context;
        private readonly WhatsAppService _whatsAppService;

        public WhatsAppWebhookController(EduVaultDbContext context, WhatsAppService whatsAppService)
        {
            _context = context;
            _whatsAppService = whatsAppService;
        }

        // GET: /api/whatsappwebhook/webhook (Meta verification handshake)
        [HttpGet("webhook")]
        public IActionResult VerifyWebhook(
            [FromQuery(Name = "hub.mode")] string? mode,
            [FromQuery(Name = "hub.verify_token")] string? token,
            [FromQuery(Name = "hub.challenge")] string? challenge)
        {
            const string verifyToken = "eduvault_whatsapp_verify_token_2026";
            if (mode == "subscribe" && token == verifyToken)
            {
                return Ok(challenge);
            }
            return Forbid();
        }

        // POST: /api/whatsappwebhook/incoming (Twilio / Meta incoming message webhook)
        [HttpPost("incoming")]
        [Consumes("application/x-www-form-urlencoded", "application/json")]
        public async Task<IActionResult> HandleIncomingMessage()
        {
            string from = string.Empty;
            string body = string.Empty;

            if (Request.HasFormContentType)
            {
                var form = await Request.ReadFormAsync();
                from = form["From"].ToString();
                body = form["Body"].ToString();
            }
            else
            {
                using var reader = new StreamReader(Request.Body, Encoding.UTF8);
                var raw = await reader.ReadToEndAsync();
                if (!string.IsNullOrWhiteSpace(raw))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(raw);
                        var root = doc.RootElement;
                        // Handle standard Meta cloud API JSON payload
                        if (root.TryGetProperty("entry", out var entry) && entry.GetArrayLength() > 0)
                        {
                            var changes = entry[0].GetProperty("changes");
                            if (changes.GetArrayLength() > 0)
                            {
                                var val = changes[0].GetProperty("value");
                                if (val.TryGetProperty("messages", out var msgs) && msgs.GetArrayLength() > 0)
                                {
                                    from = msgs[0].GetProperty("from").GetString() ?? "";
                                    body = msgs[0].GetProperty("text").GetProperty("body").GetString() ?? "";
                                }
                            }
                        }
                    }
                    catch
                    {
                        // Ignore parse error
                    }
                }
            }

            var cleanPhone = CleanPhoneNumber(from);
            if (string.IsNullOrWhiteSpace(cleanPhone) || string.IsNullOrWhiteSpace(body))
            {
                return Ok(new { status = "ignored", reason = "empty payload" });
            }

            var reply = await ProcessConversationalCommand(cleanPhone, body.Trim());

            // Reply back via WhatsAppService
            if (!string.IsNullOrWhiteSpace(reply))
            {
                _ = _whatsAppService.SendMessageAsync(cleanPhone, reply);
            }

            // Twilio MessagingResponse XML format
            var twilioXml = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>{System.Security.SecurityElement.Escape(reply)}</Message></Response>";
            return Content(twilioXml, "application/xml", Encoding.UTF8);
        }

        // POST: /api/whatsappwebhook/simulate (For in-app testing in frontend without actual Twilio/Meta phone)
        [HttpPost("simulate")]
        public async Task<IActionResult> SimulateMessage([FromBody] SimulateBotRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Phone) || string.IsNullOrWhiteSpace(req.Message))
            {
                return BadRequest(new { error = "Phone and Message are required." });
            }

            var cleanPhone = CleanPhoneNumber(req.Phone);
            var reply = await ProcessConversationalCommand(cleanPhone, req.Message.Trim());
            return Ok(new { phone = cleanPhone, query = req.Message, reply });
        }

        private async Task<string> ProcessConversationalCommand(string cleanPhone, string text)
        {
            var command = text.ToLowerInvariant();

            // Find matching student(s) by GuardianPhone or FatherPhone
            var students = await _context.Students
                .Include(s => s.User)
                .Include(s => s.Enrollments)
                    .ThenInclude(e => e.Class)
                .Where(s => s.GuardianPhone.EndsWith(cleanPhone) || 
                            s.FatherPhone.EndsWith(cleanPhone))
                .ToListAsync();

            if (students.Count == 0)
            {
                return "👋 Welcome to EduVault School Assistant!\nWe could not find any active student profile associated with your phone number. Please contact the school reception desk to register your mobile number.";
            }

            var student = students.First();
            var studentName = student.User != null ? $"{student.User.FirstName} {student.User.LastName}".Trim() : "Student";
            var currentEnrollment = student.Enrollments?.OrderByDescending(e => e.EnrollDate).FirstOrDefault();
            var className = currentEnrollment?.Class != null ? $"Class {currentEnrollment.Class.Grade}-{currentEnrollment.Class.Section}".Trim() : "Class";

            // 1. Fee Inquiry
            if (command.Contains("fee") || command.Contains("due") || command.Contains("balance") || command.Contains("invoice"))
            {
                var unpaidInvoices = await _context.Invoices
                    .Where(i => i.StudentId == student.UserId && i.Status != "Paid" && i.Status != "Cancelled")
                    .OrderBy(i => i.DueDate)
                    .ToListAsync();

                if (unpaidInvoices.Count == 0)
                {
                    return $"✅ *Fee Status: All Clear!*\nDear Parent, there are currently NO outstanding fee dues for {studentName} ({className}). All previous invoices have been settled in full. Thank you for your timely payments!";
                }

                var totalDue = unpaidInvoices.Sum(i => i.Amount);
                var invoiceList = string.Join("\n", unpaidInvoices.Take(3).Select(i => $"• Inv #{i.Id.ToString()[..8].ToUpper()}: ₹{i.Amount:N0} (Due: {i.DueDate:dd/MM/yyyy})"));

                return $"💳 *EduVault Fee Details*\nStudent: *{studentName}* ({className})\nTotal Outstanding: *₹{totalDue:N0}*\n\nPending Invoices:\n{invoiceList}\n\n👉 Pay online seamlessly or visit the school accounts counter.\nReply 'PAY' to get direct payment gateway link.";
            }

            // 2. Attendance Inquiry
            if (command.Contains("attendance") || command.Contains("present") || command.Contains("absent"))
            {
                var thirtyDaysAgo = DateTime.UtcNow.Date.AddDays(-30);
                var records = await _context.Attendances
                    .Where(a => a.StudentId == student.UserId && a.Date >= thirtyDaysAgo)
                    .ToListAsync();

                var totalDays = records.Count;
                var presentDays = records.Count(r => r.Status == "Present");
                var absentDays = records.Count(r => r.Status == "Absent");
                var lateDays = records.Count(r => r.Status == "Late");
                var percentage = totalDays > 0 ? (presentDays * 100.0 / totalDays) : 100.0;

                return $"📊 *Attendance Summary (Last 30 Days)*\nStudent: *{studentName}* ({className})\n• Attendance: *{percentage:F1}%*\n• Total Working Days: {totalDays}\n• Present: ✅ {presentDays} days\n• Absent: ❌ {absentDays} days\n• Late: ⏱️ {lateDays} days\n\nDaily attendance is recorded by the class teacher during morning roll call.";
            }

            // 3. Exam / Marks Result Inquiry
            if (command.Contains("result") || command.Contains("marks") || command.Contains("grade") || command.Contains("exam"))
            {
                var marksList = await _context.ExamResults
                    .Include(m => m.Exam)
                        .ThenInclude(e => e.Subject)
                    .Where(m => m.StudentId == student.UserId)
                    .Take(5)
                    .ToListAsync();

                if (marksList.Count == 0)
                {
                    return $"📝 *Exam Results*\nStudent: *{studentName}* ({className})\nNo recent exam marks have been published yet for the current term. Please check back after term assessments.";
                }

                var breakdown = string.Join("\n", marksList.Select(m => $"• {m.Exam?.Subject?.Name ?? "Subject"}: {m.MarksObtained ?? 0} ({m.Grade})"));

                return $"🏆 *Recent Exam Performance*\nStudent: *{studentName}* ({className})\n\n{breakdown}\n\nDetailed printable CBSE/State report cards are available on the EduVault Student Portal.";
            }

            // 4. Payment Link Inquiry
            if (command.Contains("pay") || command.Contains("upi") || command.Contains("qr") || command.Contains("link"))
            {
                var schoolId = student.User?.SchoolId;
                var school = schoolId.HasValue ? await _context.Schools.FindAsync(schoolId.Value) : null;
                var upi = !string.IsNullOrWhiteSpace(school?.SchoolUpiId) ? school.SchoolUpiId : "schooladmin@upi";

                return $"📲 *Instant Fee Payment Link*\nStudent: *{studentName}*\nSchool UPI VPA: `{upi}`\n\nOr click here to access the secure payment portal:\nhttps://eduvault.in/student/fees\n\nAfter payment, a digitally generated thermal fee receipt will be sent directly to your WhatsApp!";
            }

            // 5. Help / Default Menu
            return $"🤖 *EduVault 2-Way School Assistant*\nHello! How can we assist you regarding *{studentName}* ({className})?\n\nReply with any keyword:\n1️⃣ *FEE* — View balance & pending invoices\n2️⃣ *ATTENDANCE* — Check 30-day attendance record\n3️⃣ *RESULT* — View recent exam marks & grades\n4️⃣ *PAY* — Get instant online payment link\n5️⃣ *HELP* — Show this menu";
        }

        private static string CleanPhoneNumber(string phone)
        {
            if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
            var digits = new string(phone.Where(char.IsDigit).ToArray());
            if (digits.Length > 10)
            {
                digits = digits[^10..]; // Take last 10 digits for Indian standard phone comparison
            }
            return digits;
        }
    }

    public class SimulateBotRequest
    {
        public string Phone { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
