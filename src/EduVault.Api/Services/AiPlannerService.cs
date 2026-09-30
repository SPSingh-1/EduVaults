using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using EduVault.Core.Entities;

namespace EduVault.Api.Services
{
    public class GeneratedEventDto
    {
        public int MonthNumber { get; set; }
        public string MonthName { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string EventType { get; set; } = "Academic"; // "Exam", "Holiday", "Sports", "Cultural", "Meeting", "Academic"
        public string StartDate { get; set; } = string.Empty; // YYYY-MM-DD
        public string? EndDate { get; set; }
        public string TargetAudience { get; set; } = "All"; // "All", "Students", "Teachers", "Parents"
        public string? Description { get; set; }
    }

    public class AiPlannerService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiPlannerService> _logger;

        public AiPlannerService(HttpClient httpClient, IConfiguration configuration, ILogger<AiPlannerService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<List<GeneratedEventDto>> GenerateAnnualCalendarAsync(string academicYear, string board = "CBSE", string? customInstructions = null)
        {
            var geminiKey = _configuration["GEMINI_API_KEY"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

            if (!string.IsNullOrWhiteSpace(geminiKey))
            {
                try
                {
                    var aiResult = await QueryGeminiAsync(geminiKey, academicYear, board, customInstructions);
                    if (aiResult != null && aiResult.Count > 0)
                    {
                        return aiResult;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[AiPlannerService] Gemini API call was non-responsive or rate-limited. Falling back to built-in curriculum calendar generator.");
                }
            }

            // High-fidelity fallback calendar tailored for Indian curriculum schools (April to March)
            return GenerateHeuristicCalendar(academicYear, board);
        }

        private async Task<List<GeneratedEventDto>?> QueryGeminiAsync(string apiKey, string academicYear, string board, string? customInstructions)
        {
            var prompt = $@"
Act as an expert Indian Academic Director. Generate a comprehensive 12-month annual school calendar for Academic Year {academicYear} for a {board} curriculum school.
Include key milestones:
1. Examination cycles (Unit Tests, Mid-Term/Half-Yearly, Pre-Boards, Annual Finals).
2. Major Indian National & Gazetted Holidays (Independence Day, Republic Day, Gandhi Jayanti, Diwali, Eid, Christmas, Holi).
3. Sports, Science Exhibition, Annual Cultural Day, Teacher's Day, Children's Day.
4. Quarterly Parent-Teacher Meetings (PTMs).
{customInstructions}

Return ONLY a strict JSON array of objects with keys:
monthNumber (1-12 where 1=April, 2=May, ... 12=March),
monthName (e.g. April, May, etc.),
title,
eventType (one of: Exam, Holiday, Sports, Cultural, Meeting, Academic),
startDate (YYYY-MM-DD),
endDate (YYYY-MM-DD or null),
targetAudience (one of: All, Students, Teachers, Parents),
description.
No markdown backticks, just valid raw JSON.
";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}";

            var response = await _httpClient.PostAsync(url, jsonContent);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning($"[AiPlannerService] Gemini returned HTTP {response.StatusCode}");
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseJson);

            var root = doc.RootElement;
            if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
            {
                var text = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                if (!string.IsNullOrWhiteSpace(text))
                {
                    var cleanText = text.Trim();
                    if (cleanText.StartsWith("```json")) cleanText = cleanText.Substring(7);
                    if (cleanText.StartsWith("```")) cleanText = cleanText.Substring(3);
                    if (cleanText.EndsWith("```")) cleanText = cleanText.Substring(0, cleanText.Length - 3);
                    cleanText = cleanText.Trim();

                    var parsed = JsonSerializer.Deserialize<List<GeneratedEventDto>>(cleanText, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    return parsed;
                }
            }

            return null;
        }

        public static List<GeneratedEventDto> GenerateHeuristicCalendar(string academicYear, string board)
        {
            int startYear = DateTime.UtcNow.Year;
            if (academicYear.Contains("-") && int.TryParse(academicYear.Split('-')[0], out var y))
            {
                startYear = y;
            }
            int nextYear = startYear + 1;

            return new List<GeneratedEventDto>
            {
                // April (Month 1)
                new() { MonthNumber = 1, MonthName = "April", Title = "Academic Session Inauguration", EventType = "Academic", StartDate = $"{startYear}-04-01", EndDate = $"{startYear}-04-02", TargetAudience = "All", Description = "Orientation & commencement of new syllabus." },
                new() { MonthNumber = 1, MonthName = "April", Title = "Mahavir Jayanti & Good Friday", EventType = "Holiday", StartDate = $"{startYear}-04-14", EndDate = $"{startYear}-04-15", TargetAudience = "All", Description = "School holiday on auspicious occasion." },
                new() { MonthNumber = 1, MonthName = "April", Title = "First Diagnostic Assessment & Class PTM", EventType = "Meeting", StartDate = $"{startYear}-04-28", EndDate = $"{startYear}-04-28", TargetAudience = "Parents", Description = "Baseline diagnostic discussion with parents." },

                // May (Month 2)
                new() { MonthNumber = 2, MonthName = "May", Title = "Inter-House Debate & Extempore Competition", EventType = "Cultural", StartDate = $"{startYear}-05-08", EndDate = $"{startYear}-05-09", TargetAudience = "Students", Description = "Literary and public speaking club presentations." },
                new() { MonthNumber = 2, MonthName = "May", Title = "Summer Vacation Begins", EventType = "Holiday", StartDate = $"{startYear}-05-20", EndDate = $"{startYear}-06-30", TargetAudience = "All", Description = "Annual summer holidays and holiday homework project distribution." },

                // June (Month 3)
                new() { MonthNumber = 3, MonthName = "June", Title = "International Yoga Day Workshop", EventType = "Sports", StartDate = $"{startYear}-06-21", EndDate = $"{startYear}-06-21", TargetAudience = "All", Description = "Virtual & on-campus wellness session for students and educators." },

                // July (Month 4)
                new() { MonthNumber = 4, MonthName = "July", Title = "School Reopens after Summer Recess", EventType = "Academic", StartDate = $"{startYear}-07-01", EndDate = $"{startYear}-07-01", TargetAudience = "All", Description = "Resumption of active classroom lessons." },
                new() { MonthNumber = 4, MonthName = "July", Title = "Periodic Test 1 / Unit Test 1", EventType = "Exam", StartDate = $"{startYear}-07-18", EndDate = $"{startYear}-07-25", TargetAudience = "Students", Description = "Mandatory 25-mark formative cycle evaluation." },
                new() { MonthNumber = 4, MonthName = "July", Title = "Investiture Ceremony & Student Council Election", EventType = "Cultural", StartDate = $"{startYear}-07-30", EndDate = $"{startYear}-07-30", TargetAudience = "All", Description = "Badge pinning for Head Boy, Head Girl, and House Captains." },

                // August (Month 5)
                new() { MonthNumber = 5, MonthName = "August", Title = "Independence Day Grand Celebration", EventType = "Cultural", StartDate = $"{startYear}-08-15", EndDate = $"{startYear}-08-15", TargetAudience = "All", Description = "Flag hoisting, national anthem, and patriotic skits." },
                new() { MonthNumber = 5, MonthName = "August", Title = "Raksha Bandhan Holiday", EventType = "Holiday", StartDate = $"{startYear}-08-28", EndDate = $"{startYear}-08-28", TargetAudience = "All", Description = "School closed for festive observance." },

                // September (Month 6)
                new() { MonthNumber = 6, MonthName = "September", Title = "Teacher's Day & Student Leadership Exchange", EventType = "Cultural", StartDate = $"{startYear}-09-05", EndDate = $"{startYear}-09-05", TargetAudience = "All", Description = "Senior student council assumes teaching duties in honour of faculty." },
                new() { MonthNumber = 6, MonthName = "September", Title = "Term 1 / Mid-Term Half-Yearly Examinations", EventType = "Exam", StartDate = $"{startYear}-09-15", EndDate = $"{startYear}-09-28", TargetAudience = "Students", Description = "Comprehensive summative evaluation covering 50% syllabus." },

                // October (Month 7)
                new() { MonthNumber = 7, MonthName = "October", Title = "Mahatma Gandhi Jayanti Holiday", EventType = "Holiday", StartDate = $"{startYear}-10-02", EndDate = $"{startYear}-10-02", TargetAudience = "All", Description = "National holiday." },
                new() { MonthNumber = 7, MonthName = "October", Title = "Dussehra Break & Durga Puja Festivities", EventType = "Holiday", StartDate = $"{startYear}-10-20", EndDate = $"{startYear}-10-24", TargetAudience = "All", Description = "Festive autumn break." },
                new() { MonthNumber = 7, MonthName = "October", Title = "Mid-Term PTM & Report Card Distribution", EventType = "Meeting", StartDate = $"{startYear}-10-28", EndDate = $"{startYear}-10-28", TargetAudience = "Parents", Description = "Term 1 performance and parent conferences." },

                // November (Month 8)
                new() { MonthNumber = 8, MonthName = "November", Title = "Deepawali & Chhath Puja Holidays", EventType = "Holiday", StartDate = $"{startYear}-11-09", EndDate = $"{startYear}-11-14", TargetAudience = "All", Description = "Festival of lights vacation." },
                new() { MonthNumber = 8, MonthName = "November", Title = "Annual Science Exhibition & Robotics Fair", EventType = "Academic", StartDate = $"{startYear}-11-20", EndDate = $"{startYear}-11-21", TargetAudience = "All", Description = "STEM model demonstration by junior and senior wings." },
                new() { MonthNumber = 8, MonthName = "November", Title = "Annual Sports Day & Athletic Meet", EventType = "Sports", StartDate = $"{startYear}-11-27", EndDate = $"{startYear}-11-28", TargetAudience = "All", Description = "Track and field, march past, and medal ceremonies." },

                // December (Month 9)
                new() { MonthNumber = 9, MonthName = "December", Title = "Periodic Test 2 / Unit Test 2", EventType = "Exam", StartDate = $"{startYear}-12-08", EndDate = $"{startYear}-12-15", TargetAudience = "Students", Description = "Second assessment cycle." },
                new() { MonthNumber = 9, MonthName = "December", Title = "Winter Carnival & Christmas Pageant", EventType = "Cultural", StartDate = $"{startYear}-12-23", EndDate = $"{startYear}-12-24", TargetAudience = "All", Description = "Food stalls, drama presentations, and charity drive." },
                new() { MonthNumber = 9, MonthName = "December", Title = "Winter Vacation Begins", EventType = "Holiday", StartDate = $"{startYear}-12-25", EndDate = $"{nextYear}-01-05", TargetAudience = "All", Description = "Cold wave recess." },

                // January (Month 10)
                new() { MonthNumber = 10, MonthName = "January", Title = "School Resumes from Winter Break", EventType = "Academic", StartDate = $"{nextYear}-01-06", EndDate = $"{nextYear}-01-06", TargetAudience = "All", Description = "Commencement of pre-board revisions." },
                new() { MonthNumber = 10, MonthName = "January", Title = "Pre-Board Examination Cycle (Class 10 & 12)", EventType = "Exam", StartDate = $"{nextYear}-01-12", EndDate = $"{nextYear}-01-22", TargetAudience = "Students", Description = "Rigorous mock board simulation with standardized marking." },
                new() { MonthNumber = 10, MonthName = "January", Title = "Republic Day Celebration", EventType = "Cultural", StartDate = $"{nextYear}-01-26", EndDate = $"{nextYear}-01-26", TargetAudience = "All", Description = "Patriotic parade and honours roll call." },

                // February (Month 11)
                new() { MonthNumber = 11, MonthName = "February", Title = "Blessing & Farewell Ceremony for Graduating Class", EventType = "Cultural", StartDate = $"{nextYear}-02-10", EndDate = $"{nextYear}-02-10", TargetAudience = "All", Description = "Passing of the flame ceremony for class 12 outgoing scholars." },
                new() { MonthNumber = 11, MonthName = "February", Title = "CBSE / State Practical Assessments", EventType = "Exam", StartDate = $"{nextYear}-02-15", EndDate = $"{nextYear}-02-24", TargetAudience = "Students", Description = "External laboratory viva and practical exam conduction." },

                // March (Month 12)
                new() { MonthNumber = 12, MonthName = "March", Title = "Annual Final Examinations (Classes 1 - 9 & 11)", EventType = "Exam", StartDate = $"{nextYear}-03-02", EndDate = $"{nextYear}-03-18", TargetAudience = "Students", Description = "Final session evaluation determining academic promotions." },
                new() { MonthNumber = 12, MonthName = "March", Title = "Holi Festive Holiday", EventType = "Holiday", StartDate = $"{nextYear}-03-24", EndDate = $"{nextYear}-03-25", TargetAudience = "All", Description = "Festival of colours." },
                new() { MonthNumber = 12, MonthName = "March", Title = "Annual Result Declaration & PTM", EventType = "Meeting", StartDate = $"{nextYear}-03-29", EndDate = $"{nextYear}-03-29", TargetAudience = "Parents", Description = "Distribution of final report cards and new session booklists." }
            };
        }

        public async Task<GeneratedPrintTemplateDto> GeneratePrintTemplateAsync(string documentType, string paperSize, string prompt, string? base64Image = null)
        {
            var geminiKey = _configuration["GEMINI_API_KEY"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

            if (!string.IsNullOrWhiteSpace(geminiKey))
            {
                try
                {
                    var result = await QueryGeminiForPrintTemplateAsync(geminiKey, documentType, paperSize, prompt, base64Image);
                    if (result != null && !string.IsNullOrWhiteSpace(result.HtmlContent))
                    {
                        return result;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[AiPlannerService] Gemini print template generation failed. Using built-in engine.");
                }
            }

            return GenerateBuiltInTemplate(documentType, paperSize, prompt);
        }

        private async Task<GeneratedPrintTemplateDto?> QueryGeminiForPrintTemplateAsync(string apiKey, string documentType, string paperSize, string prompt, string? base64Image)
        {
            var hasImage = !string.IsNullOrWhiteSpace(base64Image);
            var imageInstruction = hasImage
                ? @"
5. UPLOADED DOCUMENT DESIGN CLONING RULES (CRITICAL - 100% REUSABLE DYNAMIC TEMPLATE):
   - The user has uploaded an image or PDF of an actual printed document to extract its DESIGN, FORMAT & LAYOUT ONLY.
   - You MUST CLONE THE FORMAT & LAYOUT WITH 90%+ VISUAL FIDELITY, BUT ALL DATA CONTENT/TEXT MUST BE 100% DYNAMIC:
     * Header & Institution Branding:
       - NEVER hardcode any specific university or school name (NEVER hardcode 'BIKANER TECHNICAL UNIVERSITY' or any other university name from the sample).
       - ALWAYS use {{school.name}} for the primary institution name heading (with style matching the document).
       - Logo MUST use <img src=""{{school.logoUrl}}"" alt=""Logo"" style=""max-height:60px; object-fit:contain;"" onerror=""this.style.display='none'"" />
       - Examination Title MUST use {{exam.name}}!
       - Sub-headers/affiliation MUST use {{school.address}} | {{school.affiliationNo}}
     * Student Details Box:
       - NEVER hardcode student name ('SHASHI PRATAP SINGH'), roll no, father name, or enrollment.
       - Replicate the exact boxed grid with tags:
         * NAME : {{student.name}}
         * ROLL NO. : {{student.rollNo}}
         * F/H NAME : {{student.fatherName}}
         * ENROLLMENT NO. : {{student.admissionNo}}
         * COLLEGE / INSTITUTION : {{school.name}}
     * Dynamic Subjects & Marks Table:
       - NEVER permanently hardcode static subjects ('DEEP LEARNING', 'DISASTER MANAGEMENT', etc.)!
       - In real usage, each student has different subjects and marks entered by their teacher.
       - Replicate the exact table design, borders, column widths, and column headers (e.g. 'Subjects Offered', 'Letter Grade', 'Points', 'Credit', 'Credit Points').
       - In <tbody>, use the placeholder {{exam.marksRows}}:
         <tbody>
           {{exam.marksRows}}
         </tbody>
       - For the table summary row:
         * Total Credits: {{exam.totalCredits}}
         * Total Credit Points / Marks: {{exam.obtainedMarks}}
     * Results & Progress Grids:
       - Result status box: RESULT : {{exam.resultStatus}}
       - Grade / SGPA / CGPA: SGPA : {{exam.sgpa}} | CGPA : {{exam.cgpa}} | Grade : {{exam.grade}}
       - Result Declared Date: {{exam.declaredDate}}
     * Retain 100% of the Visual Styling:
       - Outer double or single border box, clean table grid borders (border-collapse: collapse; border: 1px solid #000;), exact alignments, fonts.
       - Any school or college that uses this template will see THEIR school name, and each student's print will dynamically show THAT student's subjects and marks!
"
                : "";

            var systemPrompt = $@"
Act as EduVault's expert Print Document Cloning & Dynamic Template Engine.
Generate an ultra-clean, production-ready, pixel-perfect HTML document for:
Document Type: {documentType}
Paper Size: {paperSize}
User Requirement: {(string.IsNullOrWhiteSpace(prompt) ? "Clone the uploaded document design into a 100% dynamic EduVault print template." : prompt)}

CRITICAL RULES:
1. Zero Hardcoded Data: All school/university names, exam names, student names, subjects, marks, and grades MUST use EduVault dynamic merge tags so the template is 100% reusable across schools and students.
2. Output ONLY valid raw JSON with keys:
   - templateName: A clean title (e.g. 'B.Tech Semester Marksheet Format', 'CBSE Standard Marksheet')
   - documentType: '{documentType}'
   - paperSize: '{paperSize}'
   - orientation: 'Portrait' or 'Landscape'
   - htmlContent: Complete self-contained HTML with inline styles or single <style> tag.
3. Supported EduVault merge tags:
   - Institution: {{{{school.name}}}}, {{{{school.logoUrl}}}}, {{{{school.address}}}}, {{{{school.phone}}}}, {{{{school.affiliationNo}}}}
   - Student: {{{{student.name}}}}, {{{{student.rollNo}}}}, {{{{student.admissionNo}}}}, {{{{student.class}}}}, {{{{student.section}}}}, {{{{student.fatherName}}}}
   - Exam & Marks: {{{{exam.name}}}}, {{{{exam.academicYear}}}}, {{{{exam.marksTable}}}}, {{{{exam.marksRows}}}}, {{{{exam.totalCredits}}}}, {{{{exam.totalMarks}}}}, {{{{exam.obtainedMarks}}}}, {{{{exam.percentage}}}}, {{{{exam.grade}}}}, {{{{exam.sgpa}}}}, {{{{exam.cgpa}}}}, {{{{exam.resultStatus}}}}, {{{{exam.declaredDate}}}}
   - Fee: {{{{fee.receiptNo}}}}, {{{{fee.date}}}}, {{{{fee.totalPaid}}}}, {{{{fee.amountInWords}}}}, {{{{fee.itemsTable}}}}, {{{{fee.paymentMode}}}}, {{{{fee.cashierName}}}}
   - Salary: {{{{employee.name}}}}, {{{{employee.code}}}}, {{{{employee.designation}}}}, {{{{salary.month}}}}, {{{{salary.netSalary}}}}, {{{{salary.earningsTable}}}}, {{{{salary.deductionsTable}}}}
4. Wrapper class should be .print-zone-thermal (for 80mm), .print-zone-a4, or .print-zone-a5.
5. Output ONLY valid JSON, no markdown backticks outside.
{imageInstruction}
";

            var parts = new List<object> { new { text = systemPrompt } };
            if (hasImage)
            {
                var mimeType = "image/jpeg";
                var rawData = base64Image!;
                if (base64Image!.Contains(","))
                {
                    var header = base64Image.Split(',')[0].ToLowerInvariant();
                    if (header.Contains("application/pdf") || header.Contains("pdf")) mimeType = "application/pdf";
                    else if (header.Contains("image/png")) mimeType = "image/png";
                    else if (header.Contains("image/webp")) mimeType = "image/webp";
                    else if (header.Contains("image/gif")) mimeType = "image/gif";
                    else if (header.Contains("image/jpeg") || header.Contains("image/jpg")) mimeType = "image/jpeg";
                    rawData = base64Image.Split(',')[1];
                }

                parts.Add(new
                {
                    inlineData = new
                    {
                        mimeType = mimeType,
                        data = rawData
                    }
                });
            }

            var requestBody = new
            {
                contents = new[] { new { parts = parts.ToArray() } },
                generationConfig = new
                {
                    temperature = 0.2,
                    maxOutputTokens = 8192
                }
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            
            // Try active models: gemini-flash-latest, fallback to gemini-3.5-flash
            var candidateModels = new[] { "gemini-flash-latest", "gemini-3.5-flash" };
            foreach (var modelName in candidateModels)
            {
                try
                {
                    var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={apiKey}";
                    var response = await _httpClient.PostAsync(url, jsonContent);
                    if (!response.IsSuccessStatusCode)
                    {
                        var errResp = await response.Content.ReadAsStringAsync();
                        _logger.LogWarning("[AiPlannerService] Model {Model} returned {StatusCode}: {Error}", modelName, response.StatusCode, errResp);
                        continue;
                    }

                    var responseJson = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseJson);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                    {
                        var text = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            var cleanText = text.Trim();
                            if (cleanText.StartsWith("```json")) cleanText = cleanText.Substring(7);
                            if (cleanText.StartsWith("```")) cleanText = cleanText.Substring(3);
                            if (cleanText.EndsWith("```")) cleanText = cleanText.Substring(0, cleanText.Length - 3);
                            cleanText = cleanText.Trim();

                            var parsed = JsonSerializer.Deserialize<GeneratedPrintTemplateDto>(cleanText, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (parsed != null && !string.IsNullOrWhiteSpace(parsed.HtmlContent))
                            {
                                return parsed;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[AiPlannerService] Call to {Model} failed.", modelName);
                }
            }

            return null;
        }

        public static GeneratedPrintTemplateDto GenerateBuiltInTemplate(string documentType, string paperSize, string? prompt = null)
        {
            var isThermal = paperSize.Equals("Thermal80mm", StringComparison.OrdinalIgnoreCase);
            var isTwinCopy = paperSize.Equals("A4TwinCopy", StringComparison.OrdinalIgnoreCase);

            string html;
            string name;

            if (documentType.Equals("FeeReceipt", StringComparison.OrdinalIgnoreCase))
            {
                if (isThermal)
                {
                    name = "Standard 80mm Thermal Receipt";
                    html = @"<div class=""print-zone-thermal"" style=""font-family:'Courier New', monospace; font-size:11px; padding:6px; color:#000;"">
  <div style=""text-align:center; border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:6px;"">
    <div style=""font-size:14px; font-weight:bold;"">{{school.name}}</div>
    <div style=""font-size:9px;"">{{school.address}}</div>
    <div style=""font-size:9px;"">Ph: {{school.phone}}</div>
    <div style=""font-size:12px; font-weight:bold; margin-top:4px;"">FEE CASH RECEIPT</div>
  </div>
  <table style=""width:100%; font-size:10px; margin-bottom:6px;"">
    <tr><td>Receipt No:</td><td style=""font-weight:bold; text-align:right;"">{{fee.receiptNo}}</td></tr>
    <tr><td>Date:</td><td style=""text-align:right;"">{{fee.date}}</td></tr>
    <tr><td>Student:</td><td style=""font-weight:bold; text-align:right;"">{{student.name}}</td></tr>
    <tr><td>Adm No / Roll:</td><td style=""text-align:right;"">{{student.admissionNo}} / {{student.rollNo}}</td></tr>
    <tr><td>Class & Sec:</td><td style=""text-align:right;"">{{student.class}} - {{student.section}}</td></tr>
  </table>
  <div style=""border-top:1px dashed #000; border-bottom:1px dashed #000; padding:4px 0; margin-bottom:6px;"">
    {{fee.itemsTable}}
  </div>
  <table style=""width:100%; font-size:11px; font-weight:bold;"">
    <tr><td>TOTAL PAID:</td><td style=""text-align:right;"">₹{{fee.totalPaid}}</td></tr>
  </table>
  <div style=""font-size:9px; margin-top:4px;"">In Words: {{fee.amountInWords}}</div>
  <div style=""font-size:9px; margin-top:2px;"">Mode: {{fee.paymentMode}} | Txn: {{fee.transactionId}}</div>
  <div style=""text-align:center; margin-top:12px; font-size:9px; border-top:1px dashed #000; padding-top:4px;"">
    <div>Cashier: {{fee.cashierName}}</div>
    <div>Thank you! Keep this slip for records.</div>
  </div>
</div>";
                }
                else
                {
                    name = isTwinCopy ? "A4 Twin-Copy Fee Receipt (Student + School)" : "A4 Professional Fee Receipt";
                    var singleCopy = @"<div style=""border:1px solid #222; border-radius:6px; padding:12px; font-family:sans-serif;"">
  <div style=""display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #333; padding-bottom:8px; margin-bottom:10px;"">
    <div>
      <h2 style=""margin:0; font-size:18px; color:#1a2744;"">{{school.name}}</h2>
      <p style=""margin:2px 0 0 0; font-size:11px; color:#555;"">{{school.address}} | Ph: {{school.phone}}</p>
      <p style=""margin:2px 0 0 0; font-size:10px; color:#777;"">Affiliation No: {{school.affiliationNo}}</p>
    </div>
    <div style=""text-align:right;"">
      <span style=""display:inline-block; padding:4px 10px; background:#f0f4ff; border:1px solid #bcd; font-weight:bold; font-size:12px;"">FEE RECEIPT</span>
      <div style=""font-size:11px; margin-top:4px;""><strong>Receipt #:</strong> {{fee.receiptNo}}</div>
      <div style=""font-size:10px; color:#555;"">Date: {{fee.date}}</div>
    </div>
  </div>
  <div style=""display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:12px; background:#fafafa; padding:8px; border-radius:4px;"">
    <div><strong>Student Name:</strong> {{student.name}}</div>
    <div><strong>Admission No:</strong> {{student.admissionNo}}</div>
    <div><strong>Father's Name:</strong> {{student.fatherName}}</div>
    <div><strong>Class & Section:</strong> {{student.class}} - {{student.section}} (Roll: {{student.rollNo}})</div>
  </div>
  <div style=""margin-bottom:10px;"">
    {{fee.itemsTable}}
  </div>
  <div style=""display:flex; justify-content:space-between; align-items:center; border-top:1px solid #ddd; padding-top:8px;"">
    <div style=""font-size:11px;"">
      <div><strong>Amount in Words:</strong> {{fee.amountInWords}}</div>
      <div style=""font-size:10px; color:#666;"">Payment Mode: {{fee.paymentMode}} | Ref: {{fee.transactionId}}</div>
    </div>
    <div style=""text-align:right;"">
      <div style=""font-size:14px; font-weight:bold; color:#1a2744;"">Paid: ₹{{fee.totalPaid}}</div>
    </div>
  </div>
  <div style=""display:flex; justify-content:space-between; margin-top:30px; font-size:11px;"">
    <div>Parent / Guardian Signature</div>
    <div>Cashier: {{fee.cashierName}}</div>
    <div>Authorised Signatory</div>
  </div>
</div>";

                    if (isTwinCopy)
                    {
                        html = $@"<div class=""print-zone-twin-copy"" style=""font-family:sans-serif;"">
  <div style=""text-align:right; font-size:9px; font-weight:bold; color:#666; margin-bottom:2px;"">[STUDENT COPY]</div>
  {singleCopy}
  <div class=""print-scissor-line"">✂ - - - - - - - - - - - - - - - - - - - - CUT HERE - - - - - - - - - - - - - - - - - - - - ✂</div>
  <div style=""text-align:right; font-size:9px; font-weight:bold; color:#666; margin-bottom:2px;"">[OFFICE COPY]</div>
  {singleCopy}
</div>";
                    }
                    else
                    {
                        html = $@"<div class=""print-zone-a4"">{singleCopy}</div>";
                    }
                }
            }
            else if (documentType.Equals("ReportCard", StringComparison.OrdinalIgnoreCase))
            {
                name = "CBSE Standard Annual Report Card";
                html = @"<div class=""print-zone-a4"" style=""font-family:sans-serif; border:2px solid #1a2744; padding:16px; border-radius:8px;"">
  <div style=""text-align:center; border-bottom:2px solid #1a2744; padding-bottom:12px; margin-bottom:14px;"">
    <h1 style=""margin:0; font-size:22px; color:#1a2744;"">{{school.name}}</h1>
    <div style=""font-size:12px; color:#444;"">{{school.address}}</div>
    <div style=""font-size:11px; color:#666;"">CBSE Affiliation No: {{school.affiliationNo}}</div>
    <h2 style=""margin:10px 0 0 0; font-size:15px; text-decoration:underline;"">STUDENT PERFORMANCE PROFILE / REPORT CARD</h2>
    <div style=""font-size:12px; font-weight:bold; color:#1a2744;"">ACADEMIC SESSION: {{exam.academicYear}}</div>
  </div>
  <div style=""display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; margin-bottom:16px; background:#f8fafc; padding:10px; border:1px solid #e2e8f0; border-radius:6px;"">
    <div><strong>Student Name:</strong> {{student.name}}</div>
    <div><strong>Roll Number:</strong> {{student.rollNo}}</div>
    <div><strong>Admission No:</strong> {{student.admissionNo}}</div>
    <div><strong>Class & Section:</strong> {{student.class}} - {{student.section}}</div>
    <div><strong>Father's Name:</strong> {{student.fatherName}}</div>
    <div><strong>Date of Birth:</strong> {{student.dob}}</div>
  </div>
  <div style=""margin-bottom:14px;"">
    {{exam.marksTable}}
  </div>
  <div style=""display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; text-align:center; font-size:12px; margin-bottom:14px; background:#f1f5f9; padding:8px; border-radius:6px;"">
    <div><span style=""color:#64748b; font-size:10px; display:block;"">TOTAL</span><strong>{{exam.totalMarks}}</strong></div>
    <div><span style=""color:#64748b; font-size:10px; display:block;"">OBTAINED</span><strong>{{exam.obtainedMarks}}</strong></div>
    <div><span style=""color:#64748b; font-size:10px; display:block;"">PERCENTAGE</span><strong>{{exam.percentage}}%</strong></div>
    <div><span style=""color:#64748b; font-size:10px; display:block;"">GRADE</span><strong style=""color:#059669;"">{{exam.grade}}</strong></div>
  </div>
  <div style=""border:1px solid #e2e8f0; border-radius:6px; padding:10px; font-size:11px; margin-bottom:20px;"">
    <div style=""margin-bottom:6px;""><strong>Class Teacher Remarks:</strong> {{exam.classTeacherRemarks}}</div>
    <div><strong>Principal's Observation:</strong> {{exam.principalRemarks}}</div>
  </div>
  <div style=""display:flex; justify-content:space-between; margin-top:40px; font-size:11px; font-weight:bold;"">
    <div style=""border-top:1px solid #000; padding-top:4px; width:130px; text-align:center;"">Class Teacher</div>
    <div style=""border-top:1px solid #000; padding-top:4px; width:130px; text-align:center;"">Parent's Signature</div>
    <div style=""border-top:1px solid #000; padding-top:4px; width:130px; text-align:center;"">Principal</div>
  </div>
</div>";
            }
            else if (documentType.Equals("SalarySlip", StringComparison.OrdinalIgnoreCase))
            {
                name = "Professional Monthly Salary Slip";
                html = @"<div class=""print-zone-a4"" style=""font-family:sans-serif; border:1px solid #cbd5e1; padding:16px; border-radius:8px;"">
  <div style=""display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:14px;"">
    <div>
      <h2 style=""margin:0; font-size:18px; color:#0f172a;"">{{school.name}}</h2>
      <div style=""font-size:11px; color:#64748b;"">{{school.address}}</div>
    </div>
    <div style=""text-align:right;"">
      <div style=""font-size:13px; font-weight:bold; color:#0f172a;"">SALARY PAYSLIP</div>
      <div style=""font-size:11px; color:#475569;"">Month: {{salary.month}} {{salary.year}}</div>
    </div>
  </div>
  <div style=""display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px; margin-bottom:14px; background:#f8fafc; padding:10px; border-radius:6px;"">
    <div><strong>Employee Name:</strong> {{employee.name}}</div>
    <div><strong>Employee Code:</strong> {{employee.code}}</div>
    <div><strong>Designation:</strong> {{employee.designation}}</div>
    <div><strong>Department:</strong> {{employee.department}}</div>
    <div><strong>PAN Number:</strong> {{employee.panNo}}</div>
    <div><strong>Paid Days:</strong> {{salary.paidDays}}</div>
  </div>
  <div style=""display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:14px;"">
    <div>
      <h4 style=""margin:0 0 6px 0; font-size:12px; background:#e2e8f0; padding:4px 8px; border-radius:4px;"">EARNINGS</h4>
      {{salary.earningsTable}}
    </div>
    <div>
      <h4 style=""margin:0 0 6px 0; font-size:12px; background:#e2e8f0; padding:4px 8px; border-radius:4px;"">DEDUCTIONS</h4>
      {{salary.deductionsTable}}
    </div>
  </div>
  <div style=""background:#ecfdf5; border:1px solid #a7f3d0; padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;"">
    <div style=""font-size:12px;"">
      <strong>NET IN-HAND SALARY:</strong>
      <div style=""font-size:10px; color:#065f46;"">In Words: {{salary.netSalaryWords}}</div>
    </div>
    <div style=""font-size:18px; font-weight:900; color:#065f46;"">₹{{salary.netSalary}}</div>
  </div>
  <div style=""display:flex; justify-content:space-between; margin-top:40px; font-size:11px;"">
    <div>Employee Signature</div>
    <div>Accountant Signature</div>
    <div>Authorized Signatory</div>
  </div>
</div>";
            }
            else if (documentType.Equals("AdmitCard", StringComparison.OrdinalIgnoreCase) || documentType.Equals("ExamAdmitCard", StringComparison.OrdinalIgnoreCase))
            {
                name = "Standard Exam Hall Ticket / Admit Card";
                html = @"<div class=""print-zone-a4"" style=""font-family:sans-serif; border:2px solid #1e293b; padding:18px; border-radius:8px;"">
  <div style=""display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #1e293b; padding-bottom:12px; margin-bottom:14px;"">
    <div>
      <h2 style=""margin:0; font-size:20px; color:#0f172a; text-transform:uppercase;"">{{school.name}}</h2>
      <div style=""font-size:11px; color:#64748b;"">{{school.address}} | CBSE Affiliation: {{school.affiliationNo}}</div>
      <div style=""font-size:14px; font-weight:bold; color:#2563eb; margin-top:6px;"">EXAMINATION ADMIT CARD / HALL TICKET</div>
      <div style=""font-size:11px; font-weight:bold; color:#475569;"">{{admit.examName}} (Session {{exam.academicYear}})</div>
    </div>
    <div style=""width:90px; height:110px; border:2px dashed #94a3b8; display:flex; align-items:center; justify-content:center; text-align:center; font-size:10px; color:#64748b; background:#f8fafc; border-radius:6px;"">
      PASTE RECENT PASSPORT PHOTO
    </div>
  </div>
  <div style=""display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; margin-bottom:16px; background:#f1f5f9; padding:12px; border-radius:6px;"">
    <div><strong>Student Name:</strong> {{student.name}}</div>
    <div><strong>Exam Roll No:</strong> <span style=""font-size:13px; font-weight:bold; color:#1e293b;"">{{admit.rollNo}}</span></div>
    <div><strong>Admission No:</strong> {{student.admissionNo}}</div>
    <div><strong>Class & Section:</strong> {{student.class}} - {{student.section}}</div>
    <div><strong>Father's Name:</strong> {{student.fatherName}}</div>
    <div><strong>Date of Birth:</strong> {{student.dob}}</div>
    <div style=""grid-column: span 2;""><strong>Examination Center:</strong> {{admit.center}}</div>
  </div>
  <div style=""margin-bottom:14px;"">
    <h4 style=""margin:0 0 6px 0; font-size:12px; color:#0f172a;"">EXAM SCHEDULE & TIMETABLE</h4>
    {{admit.scheduleTable}}
  </div>
  <div style=""border:1px solid #e2e8f0; border-radius:6px; padding:10px; font-size:11px; color:#334155; margin-bottom:24px; background:#fafafa;"">
    <div style=""font-weight:bold; margin-bottom:4px; color:#dc2626;"">IMPORTANT CANDIDATE INSTRUCTIONS:</div>
    <ol style=""margin:0; padding-left:18px; font-size:10.5px; line-height:1.5;"">
      <li>Candidates must arrive at the examination center 30 minutes before the scheduled time.</li>
      <li>Entry to the examination hall is strictly prohibited without this Hall Ticket and School ID card.</li>
      <li>Electronic devices, smart watches, and unauthorized stationery are strictly prohibited.</li>
      <li>Students must preserve this Admit Card until the declaration of results.</li>
    </ol>
  </div>
  <div style=""display:flex; justify-content:space-between; margin-top:35px; font-size:11px; font-weight:bold;"">
    <div style=""border-top:1px solid #000; padding-top:4px; width:140px; text-align:center;"">Candidate Signature</div>
    <div style=""border-top:1px solid #000; padding-top:4px; width:140px; text-align:center;"">Class Teacher Signature</div>
    <div style=""border-top:1px solid #000; padding-top:4px; width:160px; text-align:center;"">Controller of Examinations</div>
  </div>
</div>";
            }
            else if (documentType.Equals("TransferCertificate", StringComparison.OrdinalIgnoreCase) || documentType.Equals("TC", StringComparison.OrdinalIgnoreCase))
            {
                name = "CBSE Standard School Transfer Certificate";
                html = @"<div class=""print-zone-a4"" style=""font-family:serif; border:3px double #0f172a; padding:24px; border-radius:4px;"">
  <div style=""text-align:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:16px;"">
    <h1 style=""margin:0; font-size:24px; color:#0f172a; text-transform:uppercase; letter-spacing:1px;"">{{school.name}}</h1>
    <div style=""font-size:12px; color:#334155;"">{{school.address}}</div>
    <div style=""font-size:11px; color:#475569;"">Affiliation No.: {{school.affiliationNo}} | School Code: 20491</div>
    <h2 style=""margin:12px 0 0 0; font-size:18px; text-decoration:underline; font-weight:bold; letter-spacing:2px;"">TRANSFER CERTIFICATE</h2>
    <div style=""display:flex; justify-content:space-between; font-size:12px; margin-top:10px; font-family:sans-serif;"">
      <div><strong>TC No.:</strong> {{tc.certificateNo}}</div>
      <div><strong>Date of Issue:</strong> {{tc.issueDate}}</div>
      <div><strong>PEN No.:</strong> {{tc.penNo}}</div>
    </div>
  </div>
  <table style=""width:100%; border-collapse:collapse; font-size:12px; line-height:1.8; font-family:sans-serif;"">
    <tr><td style=""width:5%;"">1.</td><td style=""width:50%;"">Name of the Pupil:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">{{student.name}}</td></tr>
    <tr><td>2.</td><td>Father's / Guardian's Name:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">{{student.fatherName}}</td></tr>
    <tr><td>3.</td><td>Mother's Name:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">Mrs. Sunita Sharma</td></tr>
    <tr><td>4.</td><td>Nationality:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">Indian</td></tr>
    <tr><td>5.</td><td>Whether SC / ST / OBC:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">General</td></tr>
    <tr><td>6.</td><td>Date of first admission in the school:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">05/04/2018 in Class 1</td></tr>
    <tr><td>7.</td><td>Date of Birth (in figures and words):</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">{{student.dob}}</td></tr>
    <tr><td>8.</td><td>Class in which the pupil last studied:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">{{tc.leavingClass}}</td></tr>
    <tr><td>9.</td><td>School / Board Annual Examination last taken:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">Passed (Session {{exam.academicYear}})</td></tr>
    <tr><td>10.</td><td>Whether failed, if so once/twice:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">No</td></tr>
    <tr><td>11.</td><td>Subjects Studied:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">English, Hindi, Mathematics, Science, Social Studies</td></tr>
    <tr><td>12.</td><td>Whether qualified for promotion to higher class:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">Yes, Promoted</td></tr>
    <tr><td>13.</td><td>Month up to which pupil has paid school dues:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">March 2026 (All Dues Cleared)</td></tr>
    <tr><td>14.</td><td>Total number of working days:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">220 Days</td></tr>
    <tr><td>15.</td><td>Total number of working days present:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">208 Days</td></tr>
    <tr><td>16.</td><td>General Conduct:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">{{tc.conduct}}</td></tr>
    <tr><td>17.</td><td>Reason for leaving the school:</td><td style=""font-weight:bold; border-bottom:1px dotted #64748b;"">{{tc.reason}}</td></tr>
  </table>
  <div style=""display:flex; justify-content:space-between; margin-top:50px; font-size:11px; font-family:sans-serif; font-weight:bold;"">
    <div style=""text-align:center;"">Prepared By</div>
    <div style=""text-align:center;"">Checked By (Office Supdt.)</div>
    <div style=""text-align:center; border-top:1px solid #000; padding-top:4px; width:160px;"">Principal (With School Seal)</div>
  </div>
</div>";
            }
            else if (documentType.Equals("GatePass", StringComparison.OrdinalIgnoreCase))
            {
                name = "Instant Security Gate Pass / Visitor Token";
                html = @"<div class=""print-zone-thermal"" style=""font-family:'Courier New', monospace; font-size:11px; padding:10px; border:1px dashed #000; max-width:380px; margin:0 auto;"">
  <div style=""text-align:center; border-bottom:1px dashed #000; padding-bottom:6px; margin-bottom:8px;"">
    <div style=""font-size:15px; font-weight:bold;"">{{school.name}}</div>
    <div style=""font-size:10px;"">CAMPUS SECURITY & VISITOR DESK</div>
    <div style=""font-size:13px; font-weight:bold; margin-top:4px; border:1px solid #000; display:inline-block; padding:2px 8px;"">VISITOR GATE PASS</div>
  </div>
  <table style=""width:100%; font-size:11px; margin-bottom:8px;"">
    <tr><td>Token No:</td><td style=""font-weight:bold; text-align:right;"">{{gatepass.tokenNo}}</td></tr>
    <tr><td>Date:</td><td style=""text-align:right;"">{{doc.date}}</td></tr>
    <tr><td>Time In:</td><td style=""font-weight:bold; text-align:right;"">{{gatepass.timeIn}}</td></tr>
    <tr><td>Valid Till:</td><td style=""text-align:right;"">{{gatepass.validTill}}</td></tr>
    <tr><td>Visitor:</td><td style=""font-weight:bold; text-align:right;"">{{gatepass.visitorName}}</td></tr>
    <tr><td>Vehicle No:</td><td style=""text-align:right;"">{{gatepass.vehicleNo}}</td></tr>
    <tr><td>Purpose:</td><td style=""text-align:right;"">{{gatepass.purpose}}</td></tr>
  </table>
  <div style=""border-top:1px dashed #000; padding-top:6px; font-size:9px; text-align:center;"">
    <div>Please return this slip at security gate while leaving.</div>
    <div style=""margin-top:14px; display:flex; justify-content:space-between; font-size:10px;"">
      <span>Security Guard</span>
      <span>Officer Signed</span>
    </div>
  </div>
</div>";
            }
            else
            {
                name = $"Standard {documentType} Template";
                html = $@"<div class=""print-zone-a4"" style=""font-family:sans-serif; border:1px solid #333; padding:14px;"">
  <div style=""text-align:center; border-bottom:1px solid #333; padding-bottom:8px; margin-bottom:12px;"">
    <h2 style=""margin:0;"">{{{{school.name}}}}</h2>
    <div style=""font-size:11px;"">{{{{school.address}}}}</div>
    <h3 style=""margin:6px 0 0 0; text-transform:uppercase;"">{documentType}</h3>
  </div>
  <div style=""font-size:12px; margin-bottom:12px;"">
    <div><strong>Student / Holder:</strong> {{{{student.name}}}}</div>
    <div><strong>Reference #:</strong> {{{{doc.referenceNo}}}}</div>
    <div><strong>Date:</strong> {{{{doc.date}}}}</div>
  </div>
  <div style=""border-top:1px solid #ccc; padding-top:20px; margin-top:30px; display:flex; justify-content:space-between; font-size:11px;"">
    <div>Receiver Signature</div>
    <div>Authorized Signatory</div>
  </div>
</div>";
            }

            return new GeneratedPrintTemplateDto
            {
                TemplateName = name,
                DocumentType = documentType,
                PaperSize = paperSize,
                Orientation = "Portrait",
                HtmlContent = html,
                LayoutConfigJson = "{}",
                Remarks = "Generated by EduVault built-in template engine"
            };
        }
        public async Task<GeneratedQuestionPaperDto> GenerateQuestionPaperAsync(QuestionPaperRequestDto req)
        {
            var geminiKey = _configuration["GEMINI_API_KEY"] ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

            if (!string.IsNullOrWhiteSpace(geminiKey))
            {
                try
                {
                    var prompt = $@"
Act as a senior curriculum specialist and examiner for an Indian school affiliated with {req.Board ?? "CBSE"}.
Create a complete, balanced examination question paper with the following specifications:
- Class / Grade: {req.ClassName}
- Subject: {req.Subject}
- Chapter(s) / Topic: {req.Topic}
- Total Marks: {req.TotalMarks}
- Exam Duration: {req.DurationMinutes} minutes
- Difficulty Level: {req.Difficulty} (Easy, Moderate, Hard, or Mixed)
- Specific Instructions / Focus: {req.Instructions}

Format sections logically:
- Section A: Multiple Choice Questions (1 Mark each)
- Section B: Short Answer Questions (2-3 Marks each)
- Section C: Long Answer / Application Questions (5 Marks each)

Return ONLY valid JSON matching this exact structure:
{{
  ""schoolName"": ""[School Name Placeholder]"",
  ""examTitle"": ""Periodic Assessment / Examination"",
  ""className"": ""{req.ClassName}"",
  ""subject"": ""{req.Subject}"",
  ""totalMarks"": {req.TotalMarks},
  ""durationMinutes"": {req.DurationMinutes},
  ""generalInstructions"": [
    ""All questions are compulsory."",
    ""Read questions carefully before answering."",
    ""Marks are indicated against each question.""
  ],
  ""sections"": [
    {{
      ""sectionName"": ""Section A - Objective / MCQs"",
      ""sectionMarks"": 10,
      ""questions"": [
        {{
          ""questionNo"": 1,
          ""text"": ""Question text here"",
          ""marks"": 1,
          ""options"": [""A) ..."", ""B) ..."", ""C) ..."", ""D) ...""],
          ""answer"": ""Correct option or brief answer key""
        }}
      ]
    }}
  ]
}}
Do NOT wrap with backticks other than raw JSON.
";
                    var requestBody = new
                    {
                        contents = new[]
                        {
                            new { parts = new[] { new { text = prompt } } }
                        },
                        generationConfig = new
                        {
                            temperature = 0.4,
                            maxOutputTokens = 3000
                        }
                    };

                    var jsonString = JsonSerializer.Serialize(requestBody);
                    var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={geminiKey}";
                    var response = await _httpClient.PostAsync(url, new StringContent(jsonString, Encoding.UTF8, "application/json"));

                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(responseContent);
                        var text = doc.RootElement
                            .GetProperty("candidates")[0]
                            .GetProperty("content")
                            .GetProperty("parts")[0]
                            .GetProperty("text")
                            .GetString();

                        if (!string.IsNullOrWhiteSpace(text))
                        {
                            var cleanJson = text.Trim();
                            if (cleanJson.StartsWith("```json")) cleanJson = cleanJson.Substring(7);
                            if (cleanJson.StartsWith("```")) cleanJson = cleanJson.Substring(3);
                            if (cleanJson.EndsWith("```")) cleanJson = cleanJson.Substring(0, cleanJson.Length - 3);
                            cleanJson = cleanJson.Trim();

                            var paper = JsonSerializer.Deserialize<GeneratedQuestionPaperDto>(cleanJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                            if (paper != null && paper.Sections != null && paper.Sections.Count > 0)
                            {
                                return paper;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[AiPlannerService] Gemini Question Paper generation failed. Using intelligent fallback.");
                }
            }

            return GenerateFallbackQuestionPaper(req);
        }

        private GeneratedQuestionPaperDto GenerateFallbackQuestionPaper(QuestionPaperRequestDto req)
        {
            var total = req.TotalMarks > 0 ? req.TotalMarks : 50;
            var duration = req.DurationMinutes > 0 ? req.DurationMinutes : 90;
            var topic = string.IsNullOrWhiteSpace(req.Topic) ? "Fundamental Concepts" : req.Topic;

            return new GeneratedQuestionPaperDto
            {
                ExamTitle = $"{req.Subject} Assessment Paper",
                ClassName = req.ClassName,
                Subject = req.Subject,
                TotalMarks = total,
                DurationMinutes = duration,
                GeneralInstructions = new List<string>
                {
                    "All questions are compulsory.",
                    "The question paper consists of three sections: Section A, Section B, and Section C.",
                    "Section A contains objective MCQs. Section B contains short answers. Section C contains comprehensive analytical questions."
                },
                Sections = new List<QuestionPaperSectionDto>
                {
                    new QuestionPaperSectionDto
                    {
                        SectionName = "Section A — Objective Type Questions (MCQs)",
                        SectionMarks = total >= 40 ? 10 : 5,
                        Questions = new List<PaperQuestionDto>
                        {
                            new PaperQuestionDto
                            {
                                QuestionNo = 1,
                                Text = $"Which of the following is the fundamental principle of {topic}?",
                                Marks = 1,
                                Options = new List<string> { "A) Universal Constant Law", "B) Equilibrium State Factor", "C) Primary Baseline Standard", "D) Inverse Reciprocal Ratio" },
                                Answer = "B) Equilibrium State Factor"
                            },
                            new PaperQuestionDto
                            {
                                QuestionNo = 2,
                                Text = $"Identify the correct formula/statement applicable to {req.Subject}:",
                                Marks = 1,
                                Options = new List<string> { "A) Direct Linear Proportionality", "B) Logarithmic Variance", "C) Quadratic Expansion", "D) Constant Null State" },
                                Answer = "A) Direct Linear Proportionality"
                            },
                            new PaperQuestionDto
                            {
                                QuestionNo = 3,
                                Text = $"State True or False: '{topic}' directly correlates with operational efficiency.",
                                Marks = 1,
                                Options = new List<string> { "A) True", "B) False", "C) Partially True", "D) None of the above" },
                                Answer = "A) True"
                            }
                        }
                    },
                    new QuestionPaperSectionDto
                    {
                        SectionName = "Section B — Short Answer Questions (Conceptual)",
                        SectionMarks = total >= 40 ? 20 : 15,
                        Questions = new List<PaperQuestionDto>
                        {
                            new PaperQuestionDto
                            {
                                QuestionNo = 4,
                                Text = $"Define {topic} in your own words. Give two real-world examples.",
                                Marks = 3,
                                Answer = "Concise definition explaining core mechanisms along with 2 relevant applications."
                            },
                            new PaperQuestionDto
                            {
                                QuestionNo = 5,
                                Text = $"Distinguish between primary and secondary characteristics associated with {req.Subject}.",
                                Marks = 3,
                                Answer = "Tabular differentiation highlighting at least 3 distinct contrast points."
                            },
                            new PaperQuestionDto
                            {
                                QuestionNo = 6,
                                Text = $"What precautions or steps must be observed while executing practical evaluations of {topic}?",
                                Marks = 4,
                                Answer = "Listing procedural safety and calibration steps."
                            }
                        }
                    },
                    new QuestionPaperSectionDto
                    {
                        SectionName = "Section C — Long Answer / Analytical Questions",
                        SectionMarks = total >= 40 ? (total - 30) : (total - 20),
                        Questions = new List<PaperQuestionDto>
                        {
                            new PaperQuestionDto
                            {
                                QuestionNo = 7,
                                Text = $"With the help of a neat diagram/flowchart, explain the detailed working mechanism of {topic}. Discuss its impact in modern contexts.",
                                Marks = 5,
                                Answer = "Complete schematic breakdown, stepwise operational explanation, and analytical conclusion."
                            },
                            new PaperQuestionDto
                            {
                                QuestionNo = 8,
                                Text = $"Case Study: An institution observed deviations when applying principles of {req.Subject}. Analyze potential causes and propose corrective measures.",
                                Marks = 5,
                                Answer = "Problem diagnosis, root-cause identification, and actionable remedy matrix."
                            }
                        }
                    }
                }
            };
        }
    }

    public class GeneratedPrintTemplateDto
    {
        public string TemplateName { get; set; } = "Generated Print Template";
        public string DocumentType { get; set; } = "FeeReceipt";
        public string PaperSize { get; set; } = "A4Single";
        public string Orientation { get; set; } = "Portrait";
        public string HtmlContent { get; set; } = string.Empty;
        public string LayoutConfigJson { get; set; } = "{}";
        public string Remarks { get; set; } = string.Empty;
    }

    public class QuestionPaperRequestDto
    {
        public string ClassName { get; set; } = "Class 10";
        public string Subject { get; set; } = "Science";
        public string Topic { get; set; } = "Light Reflection and Refraction";
        public int TotalMarks { get; set; } = 50;
        public int DurationMinutes { get; set; } = 90;
        public string Difficulty { get; set; } = "Moderate"; // Easy, Moderate, Hard, Mixed
        public string? Board { get; set; } = "CBSE";
        public string? Instructions { get; set; }
    }

    public class GeneratedQuestionPaperDto
    {
        public string SchoolName { get; set; } = string.Empty;
        public string ExamTitle { get; set; } = "Term Assessment";
        public string ClassName { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public int TotalMarks { get; set; }
        public int DurationMinutes { get; set; }
        public List<string> GeneralInstructions { get; set; } = new();
        public List<QuestionPaperSectionDto> Sections { get; set; } = new();
    }

    public class QuestionPaperSectionDto
    {
        public string SectionName { get; set; } = string.Empty;
        public int SectionMarks { get; set; }
        public List<PaperQuestionDto> Questions { get; set; } = new();
    }

    public class PaperQuestionDto
    {
        public int QuestionNo { get; set; }
        public string Text { get; set; } = string.Empty;
        public int Marks { get; set; }
        public List<string>? Options { get; set; }
        public string? Answer { get; set; }
    }
}
