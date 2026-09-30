using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
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
    [Route("api/print-templates")]
    [Authorize]
    public class PrintTemplatesController : ControllerBase
    {
        private readonly EduVaultDbContext _context;
        private readonly IUnitOfWork _unitOfWork;
        private readonly AiPlannerService _aiPlannerService;

        public PrintTemplatesController(EduVaultDbContext context, IUnitOfWork unitOfWork, AiPlannerService aiPlannerService)
        {
            _context = context;
            _unitOfWork = unitOfWork;
            _aiPlannerService = aiPlannerService;
        }

        private Guid? GetSchoolId()
        {
            if (User.IsInRole("superadmin") || User.IsInRole("SuperAdmin"))
            {
                var qSchoolId = HttpContext.Request.Query["schoolId"].FirstOrDefault();
                if (!string.IsNullOrEmpty(qSchoolId) && Guid.TryParse(qSchoolId, out var saSchoolId))
                    return saSchoolId;

                var hSchoolId = HttpContext.Request.Headers["X-School-Id"].FirstOrDefault();
                if (!string.IsNullOrEmpty(hSchoolId) && Guid.TryParse(hSchoolId, out var headerSchoolId))
                    return headerSchoolId;

                return null;
            }

            var schoolIdStr = User.FindFirst("schoolId")?.Value
                ?? User.FindFirst("SchoolId")?.Value
                ?? User.FindFirst("school_id")?.Value;
            if (!string.IsNullOrEmpty(schoolIdStr) && Guid.TryParse(schoolIdStr, out var schoolId))
                return schoolId;

            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("nameid")?.Value
                ?? User.FindFirst("id")?.Value;
            if (!string.IsNullOrEmpty(userIdStr) && Guid.TryParse(userIdStr, out var userId))
            {
                var u = _context.Users.AsNoTracking().FirstOrDefault(x => x.Id == userId);
                if (u?.SchoolId != null) return u.SchoolId;
            }

            return null;
        }

        // ==========================================
        // 1. List Templates for current School
        // ==========================================
        [HttpGet]
        public async Task<IActionResult> GetTemplates(
            [FromQuery] string? documentType,
            [FromQuery] string? paperSize,
            [FromQuery] bool includeMasters = true,
            [FromQuery] Guid? schoolId = null)
        {
            var isSuperAdmin = User.IsInRole("superadmin") || User.IsInRole("SuperAdmin");
            var effectiveSchoolId = isSuperAdmin && schoolId.HasValue ? schoolId : GetSchoolId();

            var query = _context.PrintTemplates.AsNoTracking()
                .Where(t => t.IsActive);

            if (effectiveSchoolId.HasValue)
            {
                if (includeMasters)
                {
                    query = query.Where(t => t.SchoolId == effectiveSchoolId.Value || t.SchoolId == null);
                }
                else
                {
                    query = query.Where(t => t.SchoolId == effectiveSchoolId.Value);
                }
            }
            else if (isSuperAdmin)
            {
                // Super Admin with no specific school gets master templates
                query = query.Where(t => t.SchoolId == null || t.IsSuperAdminMaster);
            }

            if (!string.IsNullOrWhiteSpace(documentType))
            {
                query = query.Where(t => t.DocumentType.ToLower() == documentType.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(paperSize))
            {
                query = query.Where(t => t.PaperSize.ToLower() == paperSize.Trim().ToLower());
            }

            var list = await query
                .OrderByDescending(t => t.IsDefault)
                .ThenByDescending(t => t.CreatedAt)
                .ToListAsync();

            // Auto-seed built-in templates if none exist for school
            if (list.Count == 0 && effectiveSchoolId.HasValue)
            {
                var defaults = SeedDefaultTemplates(effectiveSchoolId.Value);
                await _context.PrintTemplates.AddRangeAsync(defaults);
                await _context.SaveChangesAsync();
                list = defaults;
            }

            return Ok(list);
        }

        // ==========================================
        // 2. Get Single Template
        // ==========================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTemplateById(Guid id)
        {
            var template = await _context.PrintTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { error = "Template not found" });

            var schoolId = GetSchoolId();
            if (schoolId.HasValue && template.SchoolId.HasValue && template.SchoolId.Value != schoolId.Value && !User.IsInRole("superadmin"))
            {
                return Forbid();
            }

            return Ok(template);
        }

        // ==========================================
        // 3. Create Template
        // ==========================================
        [HttpPost]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin,SuperAdmin")]
        public async Task<IActionResult> CreateTemplate([FromBody] CreatePrintTemplateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.TemplateName))
                return BadRequest(new { error = "Template name is required" });

            var schoolId = GetSchoolId();
            var isSuperAdmin = User.IsInRole("superadmin") || User.IsInRole("SuperAdmin");

            var template = new PrintTemplate
            {
                Id = Guid.NewGuid(),
                SchoolId = isSuperAdmin && dto.IsSuperAdminMaster ? null : (dto.SchoolId ?? schoolId),
                DocumentType = dto.DocumentType ?? "FeeReceipt",
                TemplateName = dto.TemplateName.Trim(),
                Description = dto.Description ?? "",
                PaperSize = dto.PaperSize ?? "A4Single",
                Orientation = dto.Orientation ?? "Portrait",
                LayoutConfigJson = dto.LayoutConfigJson ?? "{}",
                HtmlContent = dto.HtmlContent ?? string.Empty,
                WasAiGenerated = dto.WasAiGenerated,
                AiPromptUsed = dto.AiPromptUsed ?? string.Empty,
                IsSuperAdminMaster = isSuperAdmin && dto.IsSuperAdminMaster,
                IsDefault = dto.IsDefault,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            // If set as default, unset other defaults for same doc type
            if (template.IsDefault && template.SchoolId.HasValue)
            {
                var existingDefaults = await _context.PrintTemplates
                    .Where(t => t.SchoolId == template.SchoolId.Value && t.DocumentType == template.DocumentType && t.IsDefault)
                    .ToListAsync();
                foreach (var ex in existingDefaults) ex.IsDefault = false;
            }

            await _context.PrintTemplates.AddAsync(template);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetTemplateById), new { id = template.Id }, template);
        }

        // ==========================================
        // 4. Update Template
        // ==========================================
        [HttpPut("{id}")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin,SuperAdmin")]
        public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpdatePrintTemplateDto dto)
        {
            var template = await _context.PrintTemplates.FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { error = "Template not found" });

            var schoolId = GetSchoolId();
            if (template.SchoolId.HasValue && schoolId.HasValue && template.SchoolId.Value != schoolId.Value && !User.IsInRole("superadmin"))
            {
                return Forbid();
            }

            if (!string.IsNullOrWhiteSpace(dto.TemplateName)) template.TemplateName = dto.TemplateName.Trim();
            if (dto.Description != null) template.Description = dto.Description;
            if (!string.IsNullOrWhiteSpace(dto.PaperSize)) template.PaperSize = dto.PaperSize;
            if (!string.IsNullOrWhiteSpace(dto.Orientation)) template.Orientation = dto.Orientation;
            if (dto.LayoutConfigJson != null) template.LayoutConfigJson = dto.LayoutConfigJson;
            if (dto.HtmlContent != null) template.HtmlContent = dto.HtmlContent;
            if (dto.IsActive.HasValue) template.IsActive = dto.IsActive.Value;

            if (dto.IsDefault.HasValue && dto.IsDefault.Value && template.SchoolId.HasValue)
            {
                var others = await _context.PrintTemplates
                    .Where(t => t.SchoolId == template.SchoolId.Value && t.DocumentType == template.DocumentType && t.Id != template.Id)
                    .ToListAsync();
                foreach (var o in others) o.IsDefault = false;
                template.IsDefault = true;
            }
            else if (dto.IsDefault.HasValue)
            {
                template.IsDefault = dto.IsDefault.Value;
            }

            template.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(template);
        }

        // ==========================================
        // 5. Delete Template (Soft-delete)
        // ==========================================
        [HttpDelete("{id}")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin,SuperAdmin")]
        public async Task<IActionResult> DeleteTemplate(Guid id)
        {
            var template = await _context.PrintTemplates.FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { error = "Template not found" });

            template.IsActive = false;
            template.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Template deactivated successfully" });
        }

        // ==========================================
        // 6. Set As Default / Toggle Default
        // ==========================================
        [HttpPost("{id}/set-default")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin,SuperAdmin")]
        public async Task<IActionResult> SetDefault(Guid id)
        {
            var template = await _context.PrintTemplates.FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { error = "Template not found" });

            var schoolId = template.SchoolId ?? GetSchoolId();

            // Toggle OFF if already default!
            if (template.IsDefault)
            {
                template.IsDefault = false;
                template.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Ok(new { message = $"Default status removed from '{template.TemplateName}'.", template, isDefault = false });
            }

            if (schoolId.HasValue)
            {
                var others = await _context.PrintTemplates
                    .Where(t => t.SchoolId == schoolId.Value && t.DocumentType == template.DocumentType)
                    .ToListAsync();
                foreach (var o in others) o.IsDefault = false;
            }
            else
            {
                // Global masters
                var masters = await _context.PrintTemplates
                    .Where(t => t.SchoolId == null && t.DocumentType == template.DocumentType)
                    .ToListAsync();
                foreach (var m in masters) m.IsDefault = false;
            }

            template.IsDefault = true;
            template.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Template '{template.TemplateName}' is now default for {template.DocumentType}", template, isDefault = true });
        }

        // ==========================================
        // 7. AI Generate Template Preview
        // ==========================================
        [HttpPost("ai-generate")]
        [Authorize(Roles = "schooladmin,SchoolAdmin,accountmanager,AccountManager,superadmin,SuperAdmin")]
        public async Task<IActionResult> AiGenerate([FromBody] AiGenerateRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.DocumentType))
                return BadRequest(new { error = "Document type is required" });

            var result = await _aiPlannerService.GeneratePrintTemplateAsync(
                request.DocumentType,
                request.PaperSize ?? "A4Single",
                request.Prompt ?? $"Generate clean professional {request.DocumentType} for school",
                request.Base64Image
            );

            return Ok(result);
        }

        // ==========================================
        // 8. Render Template with Real Data
        // ==========================================
        [HttpGet("render/{documentType}/{recordId}")]
        public async Task<IActionResult> RenderDocument(
            string documentType, 
            string recordId, 
            [FromQuery] Guid? templateId,
            [FromQuery] Guid? schoolId = null,
            [FromQuery] string? examType = null)
        {
            var isSuperAdmin = User.IsInRole("superadmin") || User.IsInRole("SuperAdmin");
            var effectiveSchoolId = isSuperAdmin && schoolId.HasValue ? schoolId : GetSchoolId();

            // Find matching template
            PrintTemplate? template = null;
            if (templateId.HasValue)
            {
                var candidate = await _context.PrintTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == templateId.Value && t.IsActive);
                if (candidate != null && candidate.DocumentType.Equals(documentType, StringComparison.OrdinalIgnoreCase))
                {
                    template = candidate;
                }
            }

            if (template == null && effectiveSchoolId.HasValue)
            {
                // Priority 1: School default template
                template = await _context.PrintTemplates.AsNoTracking()
                    .Where(t => t.SchoolId == effectiveSchoolId.Value && t.DocumentType.ToLower() == documentType.ToLower() && t.IsActive && t.IsDefault)
                    .FirstOrDefaultAsync();

                // Priority 2: Any school template
                if (template == null)
                {
                    template = await _context.PrintTemplates.AsNoTracking()
                        .Where(t => t.SchoolId == effectiveSchoolId.Value && t.DocumentType.ToLower() == documentType.ToLower() && t.IsActive)
                        .OrderByDescending(t => t.CreatedAt)
                        .FirstOrDefaultAsync();
                }

                // Priority 3: Super Admin Master Template
                if (template == null)
                {
                    template = await _context.PrintTemplates.AsNoTracking()
                        .Where(t => t.SchoolId == null && t.DocumentType.ToLower() == documentType.ToLower() && t.IsActive)
                        .OrderByDescending(t => t.IsDefault)
                        .FirstOrDefaultAsync();
                }
            }

            // Priority 4: Built-in default
            if (template == null)
            {
                var builtIn = AiPlannerService.GenerateBuiltInTemplate(documentType, "A4Single");
                template = new PrintTemplate
                {
                    TemplateName = builtIn.TemplateName,
                    DocumentType = documentType,
                    PaperSize = builtIn.PaperSize,
                    HtmlContent = builtIn.HtmlContent
                };
            }

            // Fetch school details
            School? school = null;
            if (effectiveSchoolId.HasValue)
            {
                school = await _context.Schools.AsNoTracking().FirstOrDefaultAsync(s => s.Id == effectiveSchoolId.Value);
            }

            var mergedHtml = await MergeDocumentDataAsync(documentType, recordId, template.HtmlContent, school, effectiveSchoolId, examType);

            return Ok(new
            {
                success = true,
                templateName = template.TemplateName,
                documentType = template.DocumentType,
                paperSize = template.PaperSize,
                orientation = template.Orientation,
                html = mergedHtml,
                renderedHtml = mergedHtml
            });
        }

        // ==========================================
        // 9. Super Admin: List Master Templates
        // ==========================================
        [HttpGet("/api/super/print-templates/masters")]
        [Authorize(Roles = "superadmin,SuperAdmin")]
        public async Task<IActionResult> GetMasterTemplates()
        {
            var masters = await _context.PrintTemplates.AsNoTracking()
                .Where(t => t.SchoolId == null || t.IsSuperAdminMaster)
                .Where(t => t.IsActive)
                .OrderBy(t => t.DocumentType)
                .ThenByDescending(t => t.IsDefault)
                .ToListAsync();

            return Ok(masters);
        }

        // ==========================================
        // 9b. Super Admin: Create Master Template
        // ==========================================
        [HttpPost("/api/super/print-templates")]
        [Authorize(Roles = "superadmin,SuperAdmin")]
        public async Task<IActionResult> CreateMasterTemplate([FromBody] CreatePrintTemplateDto dto)
        {
            dto.IsSuperAdminMaster = true;
            dto.SchoolId = null;
            return await CreateTemplate(dto);
        }

        // ==========================================
        // 9c. Super Admin: Delete Master Template
        // ==========================================
        [HttpDelete("/api/super/print-templates/{id}")]
        [Authorize(Roles = "superadmin,SuperAdmin")]
        public async Task<IActionResult> DeleteMasterTemplate(Guid id)
        {
            var template = await _context.PrintTemplates.FirstOrDefaultAsync(t => t.Id == id);
            if (template == null) return NotFound(new { error = "Template not found" });

            template.IsActive = false;
            template.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Master template removed successfully" });
        }

        // ==========================================
        // 10. Super Admin: Push Master Template to School(s)
        // ==========================================
        [HttpPost("/api/super/print-templates/push")]
        [Authorize(Roles = "superadmin,SuperAdmin")]
        public async Task<IActionResult> PushMasterTemplate([FromBody] PushTemplateRequestDto dto)
        {
            var master = await _context.PrintTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == dto.MasterTemplateId);
            if (master == null) return NotFound(new { error = "Master template not found" });

            List<Guid> targetSchoolIds;
            if (dto.PushToAllSchools)
            {
                targetSchoolIds = await _context.Schools.AsNoTracking().Select(s => s.Id).ToListAsync();
            }
            else
            {
                targetSchoolIds = dto.SchoolIds ?? new List<Guid>();
            }

            int count = 0;
            foreach (var targetId in targetSchoolIds)
            {
                var clone = new PrintTemplate
                {
                    Id = Guid.NewGuid(),
                    SchoolId = targetId,
                    DocumentType = master.DocumentType,
                    TemplateName = master.TemplateName,
                    Description = master.Description,
                    PaperSize = master.PaperSize,
                    Orientation = master.Orientation,
                    LayoutConfigJson = master.LayoutConfigJson,
                    HtmlContent = master.HtmlContent,
                    WasAiGenerated = master.WasAiGenerated,
                    AiPromptUsed = master.AiPromptUsed,
                    IsSuperAdminMaster = false,
                    IsDefault = dto.SetAsDefault,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                if (dto.SetAsDefault)
                {
                    var existing = await _context.PrintTemplates
                        .Where(t => t.SchoolId == targetId && t.DocumentType == master.DocumentType)
                        .ToListAsync();
                    foreach (var e in existing) e.IsDefault = false;
                }

                await _context.PrintTemplates.AddAsync(clone);
                count++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"Master template '{master.TemplateName}' pushed to {count} school(s) successfully.", count });
        }

        // ==========================================
        // Helper: Data Merge Engine
        // ==========================================
        private async Task<string> MergeDocumentDataAsync(string documentType, string recordId, string htmlTemplate, School? school, Guid? effectiveSchoolId = null, string? examType = null)
        {
            var data = new Dictionary<string, string>();

            // Default School tags
            data["{{school.name}}"] = !string.IsNullOrEmpty(school?.Name) ? school.Name : "EduVault International Academy";
            data["{{school.address}}"] = !string.IsNullOrEmpty(school?.Address) ? (school.Address + (!string.IsNullOrEmpty(school?.City) ? $", {school.City}" : "")) : "Knowledge Park, Education City";
            data["{{school.website}}"] = !string.IsNullOrEmpty(school?.Website) ? school.Website : "https://eduvault.edu";
            data["{{school.phone}}"] = "+91 98765 43210";
            data["{{school.email}}"] = !string.IsNullOrEmpty(school?.EmailDomain) ? $"info@{school.EmailDomain}" : "info@eduvault.edu";
            data["{{school.affiliationNo}}"] = "CBSE/AFF/2026/0921";
            data["{{school.logoUrl}}"] = !string.IsNullOrEmpty(school?.LogoUrl) ? school.LogoUrl : "/logo.jpeg";

            if (documentType.Equals("FeeReceipt", StringComparison.OrdinalIgnoreCase))
            {
                PaymentTransaction? txn = null;

                if (Guid.TryParse(recordId, out var txnId))
                {
                    txn = await _context.Transactions
                        .Include(t => t.Invoice)
                            .ThenInclude(i => i!.Student)
                                .ThenInclude(s => s!.User)
                        .Include(t => t.Invoice)
                            .ThenInclude(i => i!.Student)
                                .ThenInclude(s => s!.Enrollments)
                                    .ThenInclude(e => e.Class)
                        .Include(t => t.Invoice)
                            .ThenInclude(i => i!.FeeStructure)
                        .FirstOrDefaultAsync(t => t.Id == txnId);

                    if (txn == null)
                    {
                        txn = await _context.Transactions
                            .Include(t => t.Invoice)
                                .ThenInclude(i => i!.Student)
                                    .ThenInclude(s => s!.User)
                            .Include(t => t.Invoice)
                                .ThenInclude(i => i!.Student)
                                    .ThenInclude(s => s!.Enrollments)
                                        .ThenInclude(e => e.Class)
                            .Include(t => t.Invoice)
                                .ThenInclude(i => i!.FeeStructure)
                            .OrderByDescending(t => t.TransactionDate)
                            .FirstOrDefaultAsync(t => t.InvoiceId == txnId);
                    }
                }

                if (txn == null && !string.IsNullOrWhiteSpace(recordId))
                {
                    var cleanRef = recordId.Trim();
                    txn = await _context.Transactions
                        .Include(t => t.Invoice)
                            .ThenInclude(i => i!.Student)
                                .ThenInclude(s => s!.User)
                        .Include(t => t.Invoice)
                            .ThenInclude(i => i!.Student)
                                .ThenInclude(s => s!.Enrollments)
                                    .ThenInclude(e => e.Class)
                        .Include(t => t.Invoice)
                            .ThenInclude(i => i!.FeeStructure)
                        .FirstOrDefaultAsync(t => t.ReferenceNumber == cleanRef);
                }

                if (txn != null)
                {
                    var inv = txn.Invoice;
                    var st = inv?.Student;
                    data["{{fee.receiptNo}}"] = !string.IsNullOrEmpty(txn.ReferenceNumber) ? txn.ReferenceNumber : $"REC-{txn.Id.ToString().Substring(0, 8).ToUpper()}";
                    data["{{fee.date}}"] = txn.TransactionDate.ToString("dd/MM/yyyy");
                    data["{{fee.totalPaid}}"] = txn.Amount.ToString("N2");
                    data["{{fee.paymentMode}}"] = txn.PaymentMethod ?? "Cash";
                    data["{{fee.transactionId}}"] = txn.ReferenceNumber ?? txn.Id.ToString();
                    data["{{fee.cashierName}}"] = "Accounts Desk";
                    data["{{fee.amountInWords}}"] = NumberToWords((long)txn.Amount) + " Rupees Only";

                    var feeName = inv?.FeeStructure?.Name ?? "Tuition & Term Fee";
                    data["{{fee.itemsTable}}"] = $@"<table style=""width:100%; border-collapse:collapse; font-size:11px;"">
  <thead><tr style=""background:#f1f5f9; text-align:left;""><th style=""padding:4px;"">Particulars</th><th style=""padding:4px; text-align:right;"">Amount</th></tr></thead>
  <tbody><tr><td style=""padding:4px; border-bottom:1px solid #e2e8f0;"">{feeName}</td><td style=""padding:4px; border-bottom:1px solid #e2e8f0; text-align:right;"">₹{txn.Amount:N2}</td></tr></tbody>
</table>";

                    if (st != null)
                    {
                        var studentUser = st.User;
                        var activeEnrollment = st.Enrollments?.FirstOrDefault(e => e.Status == "ACTIVE") ?? st.Enrollments?.FirstOrDefault();
                        var rawGrade = activeEnrollment?.Class?.Grade;
                        var clsName = !string.IsNullOrWhiteSpace(rawGrade) ? (rawGrade.StartsWith("Class", StringComparison.OrdinalIgnoreCase) ? rawGrade : $"Class {rawGrade}") : "Class 4";
                        var secName = !string.IsNullOrWhiteSpace(activeEnrollment?.Class?.Section) ? activeEnrollment.Class.Section.Replace("Section", "").Trim() : "A";

                        data["{{student.name}}"] = studentUser != null ? $"{studentUser.FirstName} {studentUser.LastName}".Trim() : (st.StudentId ?? "Student");
                        data["{{student.rollNo}}"] = st.StudentId ?? "N/A";
                        data["{{student.admissionNo}}"] = st.AdmissionNumber ?? st.StudentId ?? "N/A";
                        data["{{student.class}}"] = clsName;
                        data["{{student.section}}"] = secName;
                        data["{{student.fatherName}}"] = st.FatherName ?? st.GuardianName ?? "Guardian";
                    }
                }
            }
            else if (documentType.Equals("SalarySlip", StringComparison.OrdinalIgnoreCase) && Guid.TryParse(recordId, out var salId))
            {
                var sal = await _context.SalaryRecords.FirstOrDefaultAsync(s => s.Id == salId);
                if (sal != null)
                {
                    var teacherUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == sal.TeacherUserId);
                    var emp = teacherUser != null ? await _context.Employees.FirstOrDefaultAsync(e => e.UserId == sal.TeacherUserId || e.Email == teacherUser.Email) : null;

                    data["{{salary.month}}"] = new DateTime(sal.Year, sal.Month, 1).ToString("MMMM");
                    data["{{salary.year}}"] = sal.Year.ToString();
                    data["{{salary.paidDays}}"] = sal.PresentDays.ToString();
                    data["{{salary.netSalary}}"] = sal.NetPay.ToString("N2");
                    data["{{salary.netSalaryWords}}"] = NumberToWords((long)sal.NetPay) + " Rupees Only";

                    data["{{employee.name}}"] = teacherUser != null ? $"{teacherUser.FirstName} {teacherUser.LastName}".Trim() : "Staff Member";
                    data["{{employee.code}}"] = emp?.EmployeeCode ?? "EMP-001";
                    data["{{employee.designation}}"] = emp?.DesignationName ?? "Faculty Member";
                    data["{{employee.department}}"] = emp?.DepartmentName ?? "Academic";
                    data["{{employee.panNo}}"] = emp?.PanNumber ?? "AAAAA0000A";

                    data["{{salary.earningsTable}}"] = $@"<table style=""width:100%; font-size:11px; border-collapse:collapse;"">
  <tr><td style=""padding:3px;"">Basic Salary:</td><td style=""text-align:right; font-weight:bold;"">₹{sal.BasicEarned:N2}</td></tr>
  <tr><td style=""padding:3px;"">Allowances:</td><td style=""text-align:right; font-weight:bold;"">₹{sal.RuleBasedAllowances + sal.ManualAllowances:N2}</td></tr>
  <tr style=""border-top:1px solid #ccc; font-weight:bold;""><td style=""padding:3px;"">Gross:</td><td style=""text-align:right;"">₹{sal.GrossSalary:N2}</td></tr>
</table>";

                    data["{{salary.deductionsTable}}"] = $@"<table style=""width:100%; font-size:11px; border-collapse:collapse;"">
  <tr><td style=""padding:3px;"">PF / ESI / PT:</td><td style=""text-align:right; font-weight:bold;"">₹{sal.RuleBasedDeductions:N2}</td></tr>
  <tr><td style=""padding:3px;"">LWP / Other:</td><td style=""text-align:right; font-weight:bold;"">₹{sal.LwpDeduction + sal.ManualDeductions:N2}</td></tr>
  <tr style=""border-top:1px solid #ccc; font-weight:bold;""><td style=""padding:3px;"">Total Deductions:</td><td style=""text-align:right;"">₹{sal.RuleBasedDeductions + sal.LwpDeduction + sal.ManualDeductions:N2}</td></tr>
</table>";
                }
            }
            else if (documentType.Equals("ReportCard", StringComparison.OrdinalIgnoreCase))
            {
                Student? student = null;
                Guid? stUserId = null;

                if (Guid.TryParse(recordId, out var parsedGuid))
                {
                    student = await _context.Students
                        .Include(s => s.User)
                        .Include(s => s.Enrollments)
                            .ThenInclude(e => e.Class)
                        .FirstOrDefaultAsync(s => s.UserId == parsedGuid);
                    if (student != null) stUserId = student.UserId;
                }

                if (student == null && !string.IsNullOrWhiteSpace(recordId) && recordId != "current" && recordId != "sample-demo-record")
                {
                    student = await _context.Students
                        .Include(s => s.User)
                        .Include(s => s.Enrollments)
                            .ThenInclude(e => e.Class)
                        .FirstOrDefaultAsync(s => s.StudentId == recordId.Trim() || s.AdmissionNumber == recordId.Trim());
                    if (student != null) stUserId = student.UserId;
                }

                if (student == null)
                {
                    // Fallback to logged-in user if student
                    var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                        ?? User.FindFirst("nameid")?.Value 
                        ?? User.FindFirst("id")?.Value;
                    if (!string.IsNullOrEmpty(currentUserIdStr) && Guid.TryParse(currentUserIdStr, out var loggedInGuid))
                    {
                        student = await _context.Students
                            .Include(s => s.User)
                            .Include(s => s.Enrollments)
                                .ThenInclude(e => e.Class)
                            .FirstOrDefaultAsync(s => s.UserId == loggedInGuid);
                        if (student != null) stUserId = student.UserId;
                    }
                }

                // If still null (e.g. simulator mode by super admin for a specific school), pick first student of that school
                if (student == null && effectiveSchoolId.HasValue)
                {
                    student = await _context.Students
                        .Include(s => s.User)
                        .Include(s => s.Enrollments)
                            .ThenInclude(e => e.Class)
                        .FirstOrDefaultAsync(s => s.User != null && s.User.SchoolId == effectiveSchoolId.Value);
                    if (student != null) stUserId = student.UserId;
                }

                if (student != null)
                {
                    var studentUser = student.User;
                    data["{{student.name}}"] = studentUser != null ? $"{studentUser.FirstName} {studentUser.LastName}".Trim() : (student.StudentId ?? "Student");
                    data["{{student.rollNo}}"] = !string.IsNullOrEmpty(student.StudentId) ? student.StudentId : "N/A";
                    data["{{student.admissionNo}}"] = student.AdmissionNumber ?? student.StudentId ?? "N/A";

                    var activeEnrollment = student.Enrollments?.FirstOrDefault(e => e.Status == "ACTIVE") ?? student.Enrollments?.FirstOrDefault();
                    var rawGrade = activeEnrollment?.Class?.Grade;
                    var clsName = !string.IsNullOrWhiteSpace(rawGrade) ? (rawGrade.StartsWith("Class", StringComparison.OrdinalIgnoreCase) ? rawGrade : $"Class {rawGrade}") : "Class 1";
                    var secName = !string.IsNullOrWhiteSpace(activeEnrollment?.Class?.Section) ? activeEnrollment.Class.Section.Replace("Section", "").Trim() : "A";

                    data["{{student.class}}"] = clsName;
                    data["{{student.section}}"] = secName;
                    data["{{student.fatherName}}"] = student.FatherName ?? student.GuardianName ?? "Guardian";
                    data["{{student.motherName}}"] = student.MotherName ?? "Mother";
                    data["{{student.dob}}"] = !string.IsNullOrEmpty(student.DateOfBirth) ? student.DateOfBirth : "01/01/2012";
                    data["{{student.phone}}"] = student.GuardianPhone ?? student.FatherPhone ?? "N/A";
                    data["{{student.address}}"] = !string.IsNullOrEmpty(student.Address) ? student.Address : (school?.City ?? "N/A");

                    if (stUserId.HasValue)
                    {
                        var query = _context.ExamResults
                            .Include(r => r.Exam)
                                .ThenInclude(e => e!.Subject)
                            .Where(r => r.StudentId == stUserId.Value);

                        if (!string.IsNullOrWhiteSpace(examType))
                        {
                            var targetExam = examType.Trim().ToLower();
                            query = query.Where(r => r.Exam != null && 
                                (r.Exam.ExamType.ToLower() == targetExam || 
                                 r.Exam.ExamType.ToLower().Contains(targetExam) ||
                                 (targetExam.Contains("annual") && (r.Exam.ExamType.ToLower().Contains("annual") || r.Exam.ExamType.ToLower().Contains("final"))) ||
                                 (targetExam.Contains("final") && (r.Exam.ExamType.ToLower().Contains("final") || r.Exam.ExamType.ToLower().Contains("annual"))) ||
                                 (targetExam.Contains("sem") && r.Exam.ExamType.ToLower().Contains("sem")) ||
                                 (targetExam.Contains("unit") && r.Exam.ExamType.ToLower().Contains("unit")) ||
                                 (targetExam.Contains("quarter") && r.Exam.ExamType.ToLower().Contains("quarter"))));
                        }
                        else if (activeEnrollment != null)
                        {
                            query = query.Where(r => r.Exam == null || r.Exam.ClassId == activeEnrollment.ClassId);
                        }

                        var results = await query.ToListAsync();

                        // Fallback: If no results matched the specific examType filter, group by ExamType and take only that group
                        if (!results.Any())
                        {
                            var allResults = await _context.ExamResults
                                .Include(r => r.Exam)
                                    .ThenInclude(e => e!.Subject)
                                .Where(r => r.StudentId == stUserId.Value)
                                .ToListAsync();

                            if (!string.IsNullOrWhiteSpace(examType))
                            {
                                var matchedGroup = allResults.GroupBy(r => r.Exam?.ExamType)
                                    .FirstOrDefault(g => !string.IsNullOrEmpty(g.Key) && 
                                        (g.Key.ToLower().Contains(examType.ToLower()) || examType.ToLower().Contains(g.Key.ToLower())));
                                if (matchedGroup != null)
                                {
                                    results = matchedGroup.ToList();
                                }
                            }

                            if (!results.Any() && allResults.Any())
                            {
                                // Pick only the single most recent exam type group so it never dumps all exams together!
                                results = allResults.GroupBy(r => r.Exam?.ExamType).Last().ToList();
                            }
                        }

                        var activeExamName = !string.IsNullOrWhiteSpace(examType) 
                            ? examType 
                            : (results.FirstOrDefault()?.Exam?.ExamType ?? "Examination Results");
                        data["{{exam.name}}"] = activeExamName.ToUpper();
                        data["{{exam.session}}"] = activeExamName;

                        if (results.Any())
                        {
                            var totalMarks = results.Sum(r => r.MarksObtained ?? ((r.PracticalMarks ?? 0) + (r.TheoryMarks ?? 0)));
                            var maxMarks = results.Count * 100;
                            var pct = maxMarks > 0 ? (totalMarks / (decimal)maxMarks) * 100 : 0;
                            data["{{exam.totalMarks}}"] = maxMarks.ToString();
                            data["{{exam.obtainedMarks}}"] = totalMarks.ToString("0.##");
                            data["{{exam.percentage}}"] = pct.ToString("0.##");
                            data["{{exam.grade}}"] = pct >= 90 ? "A++" : pct >= 80 ? "A+" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : "D";
                            data["{{exam.resultStatus}}"] = pct >= 40 ? "PASS" : "FAIL";

                            decimal totalPoints = 0;
                            foreach (var res in results)
                            {
                                var tot = res.MarksObtained ?? ((res.PracticalMarks ?? 0) + (res.TheoryMarks ?? 0));
                                totalPoints += tot >= 90 ? 4.0m : tot >= 80 ? 3.5m : tot >= 70 ? 3.0m : tot >= 60 ? 2.5m : 2.0m;
                            }
                            var gpa = results.Count > 0 ? (totalPoints / results.Count) : 0m;
                            data["{{exam.sgpa}}"] = gpa.ToString("0.00");
                            data["{{exam.cgpa}}"] = gpa.ToString("0.00");

                            var rowsHtml = new System.Text.StringBuilder();
                            var tableHtml = new System.Text.StringBuilder();

                            tableHtml.AppendLine(@"<table style=""width:100%; border-collapse:collapse; font-size:11px; border:1px solid #cbd5e1;"">");
                            tableHtml.AppendLine(@"  <thead><tr style=""background:#f1f5f9;""><th style=""padding:6px; border:1px solid #cbd5e1; text-align:left;"">Subject</th><th style=""padding:6px; border:1px solid #cbd5e1; text-align:center;"">Internal (30)</th><th style=""padding:6px; border:1px solid #cbd5e1; text-align:center;"">Exam (70)</th><th style=""padding:6px; border:1px solid #cbd5e1; text-align:center;"">Total (100)</th><th style=""padding:6px; border:1px solid #cbd5e1; text-align:center;"">Grade</th><th style=""padding:6px; border:1px solid #cbd5e1; text-align:center;"">Status</th></tr></thead>");
                            tableHtml.AppendLine(@"  <tbody>");

                            foreach (var res in results)
                            {
                                var subj = res.Exam?.Subject?.Name ?? "Subject";
                                var internalMarks = res.PracticalMarks ?? 0;
                                var theoryMarks = res.TheoryMarks ?? 0;
                                var tot = res.MarksObtained ?? (internalMarks + theoryMarks);
                                var pts = tot.ToString("0.##");
                                var grd = !string.IsNullOrEmpty(res.Grade) ? res.Grade : (tot >= 90 ? "A+" : tot >= 80 ? "A" : tot >= 70 ? "B+" : tot >= 60 ? "B" : "C");
                                var status = tot >= 40 ? "Pass" : "Fail";

                                rowsHtml.AppendLine($@"<tr>
  <td style=""padding:5px 8px; border:1px solid #cbd5e1; text-align:left; font-weight:600;"">{subj}</td>
  <td style=""padding:5px 8px; border:1px solid #cbd5e1; text-align:center;"">{grd}</td>
  <td style=""padding:5px 8px; border:1px solid #cbd5e1; text-align:center;"">{pts}</td>
  <td style=""padding:5px 8px; border:1px solid #cbd5e1; text-align:center;"">3</td>
  <td style=""padding:5px 8px; border:1px solid #cbd5e1; text-align:center;"">{(tot * 0.3m):0.#}</td>
</tr>");

                                tableHtml.AppendLine($@"    <tr><td style=""padding:5px 8px; border:1px solid #cbd5e1; font-weight:600;"">{subj}</td><td style=""padding:5px; text-align:center; border:1px solid #cbd5e1;"">{internalMarks}</td><td style=""padding:5px; text-align:center; border:1px solid #cbd5e1;"">{theoryMarks}</td><td style=""padding:5px; text-align:center; border:1px solid #cbd5e1; font-weight:bold;"">{tot}</td><td style=""padding:5px; text-align:center; border:1px solid #cbd5e1;"">{grd}</td><td style=""padding:5px; text-align:center; border:1px solid #cbd5e1;"">{status}</td></tr>");
                            }

                            tableHtml.AppendLine(@"  </tbody>");
                            tableHtml.AppendLine(@"</table>");

                            data["{{exam.marksRows}}"] = rowsHtml.ToString();
                            data["{{exam.marksTable}}"] = tableHtml.ToString();
                        }
                    }
                }
            }

            // Universal Fallbacks
            if (!data.ContainsKey("{{student.name}}")) data["{{student.name}}"] = "Aarav Sharma";
            if (!data.ContainsKey("{{student.rollNo}}")) data["{{student.rollNo}}"] = "101";
            if (!data.ContainsKey("{{student.admissionNo}}")) data["{{student.admissionNo}}"] = "ADM-2026-084";
            if (!data.ContainsKey("{{student.class}}")) data["{{student.class}}"] = "Class 10";
            if (!data.ContainsKey("{{student.section}}")) data["{{student.section}}"] = "A";
            if (!data.ContainsKey("{{student.fatherName}}")) data["{{student.fatherName}}"] = "Rajesh Sharma";
            if (!data.ContainsKey("{{student.dob}}")) data["{{student.dob}}"] = "14/08/2010";

            if (!data.ContainsKey("{{fee.receiptNo}}")) data["{{fee.receiptNo}}"] = "REC-DEMO-001";
            if (!data.ContainsKey("{{fee.date}}")) data["{{fee.date}}"] = DateTime.UtcNow.ToString("dd/MM/yyyy");
            if (!data.ContainsKey("{{fee.totalPaid}}")) data["{{fee.totalPaid}}"] = "12,500.00";
            if (!data.ContainsKey("{{fee.paymentMode}}")) data["{{fee.paymentMode}}"] = "UPI / Card";
            if (!data.ContainsKey("{{fee.transactionId}}")) data["{{fee.transactionId}}"] = "TXN" + DateTime.UtcNow.Ticks.ToString().Substring(10);
            if (!data.ContainsKey("{{fee.cashierName}}")) data["{{fee.cashierName}}"] = "Accounts Desk";
            if (!data.ContainsKey("{{fee.amountInWords}}")) data["{{fee.amountInWords}}"] = "Twelve Thousand Five Hundred Rupees Only";
            if (!data.ContainsKey("{{fee.itemsTable}}")) data["{{fee.itemsTable}}"] = @"<table style=""width:100%; border-collapse:collapse; font-size:11px;""><tr><td>Tuition & Term Fee</td><td style=""text-align:right;"">₹12,500.00</td></tr></table>";

            if (!data.ContainsKey("{{exam.name}}")) data["{{exam.name}}"] = "B.Tech Semester VII (REGULAR) EXAMINATION 2025-26";
            if (!data.ContainsKey("{{exam.academicYear}}")) data["{{exam.academicYear}}"] = "2025-2026";
            if (!data.ContainsKey("{{exam.totalCredits}}")) data["{{exam.totalCredits}}"] = "15";
            if (!data.ContainsKey("{{exam.totalMarks}}")) data["{{exam.totalMarks}}"] = "140";
            if (!data.ContainsKey("{{exam.obtainedMarks}}")) data["{{exam.obtainedMarks}}"] = "140";
            if (!data.ContainsKey("{{exam.percentage}}")) data["{{exam.percentage}}"] = "93.4";
            if (!data.ContainsKey("{{exam.grade}}")) data["{{exam.grade}}"] = "A++";
            if (!data.ContainsKey("{{exam.sgpa}}")) data["{{exam.sgpa}}"] = "9.34";
            if (!data.ContainsKey("{{exam.cgpa}}")) data["{{exam.cgpa}}"] = "9.09";
            if (!data.ContainsKey("{{exam.resultStatus}}")) data["{{exam.resultStatus}}"] = "PASS";
            if (!data.ContainsKey("{{exam.declaredDate}}")) data["{{exam.declaredDate}}"] = DateTime.UtcNow.ToString("dd-MM-yyyy");
            if (!data.ContainsKey("{{exam.classTeacherRemarks}}")) data["{{exam.classTeacherRemarks}}"] = "Exceptional academic progress and disciplined conduct.";
            if (!data.ContainsKey("{{exam.principalRemarks}}")) data["{{exam.principalRemarks}}"] = "Promoted to next grade with distinction.";
            if (!data.ContainsKey("{{exam.marksRows}}")) data["{{exam.marksRows}}"] = @"<tr>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:left; font-weight:600;"">DEEP LEARNING</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">A++</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">10</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">3</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">30</td>
</tr>
<tr>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:left; font-weight:600;"">DISASTER MANAGEMENT</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">B+</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">8</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">3</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">24</td>
</tr>
<tr>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:left; font-weight:600;"">MOBILE COMPUTING</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">B+</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">8</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">2</td>
  <td style=""padding:5px 8px; border:1px solid #000; text-align:center;"">16</td>
</tr>";
            if (!data.ContainsKey("{{exam.marksTable}}")) data["{{exam.marksTable}}"] = @"<table style=""width:100%; border-collapse:collapse; font-size:11px; border:1px solid #cbd5e1;"">
  <tr style=""background:#f1f5f9;""><th style=""padding:5px; border:1px solid #cbd5e1;"">Subject</th><th style=""padding:5px; border:1px solid #cbd5e1;"">Max</th><th style=""padding:5px; border:1px solid #cbd5e1;"">Obtained</th><th style=""padding:5px; border:1px solid #cbd5e1;"">Grade</th></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">English Core</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">100</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">92</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">A1</td></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">Mathematics</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">100</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">88</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">A2</td></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">Science & Technology</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">100</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">90</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">A1</td></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">Social Science</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">100</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">84</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">A2</td></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">Hindi / Sanskrit</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">100</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">88</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">A2</td></tr>
</table>";

            // Universal Fallbacks - Salary
            if (!data.ContainsKey("{{salary.month}}")) data["{{salary.month}}"] = DateTime.UtcNow.ToString("MMMM");
            if (!data.ContainsKey("{{salary.year}}")) data["{{salary.year}}"] = DateTime.UtcNow.Year.ToString();
            if (!data.ContainsKey("{{salary.paidDays}}")) data["{{salary.paidDays}}"] = "30";
            if (!data.ContainsKey("{{salary.netSalary}}")) data["{{salary.netSalary}}"] = "48,500.00";
            if (!data.ContainsKey("{{salary.netSalaryWords}}")) data["{{salary.netSalaryWords}}"] = "Forty Eight Thousand Five Hundred Rupees Only";
            if (!data.ContainsKey("{{employee.name}}")) data["{{employee.name}}"] = "Dr. Shashi Prakash";
            if (!data.ContainsKey("{{employee.code}}")) data["{{employee.code}}"] = "FAC-2024-019";
            if (!data.ContainsKey("{{employee.designation}}")) data["{{employee.designation}}"] = "Senior Faculty / PGT Mathematics";
            if (!data.ContainsKey("{{employee.department}}")) data["{{employee.department}}"] = "Academics & Science";
            if (!data.ContainsKey("{{employee.panNo}}")) data["{{employee.panNo}}"] = "ABCDE1234F";
            if (!data.ContainsKey("{{salary.earningsTable}}")) data["{{salary.earningsTable}}"] = @"<table style=""width:100%; font-size:11px; border-collapse:collapse;""><tr><td style=""padding:3px;"">Basic Salary:</td><td style=""text-align:right; font-weight:bold;"">₹42,000.00</td></tr><tr><td style=""padding:3px;"">DA + HRA Allowances:</td><td style=""text-align:right; font-weight:bold;"">₹10,500.00</td></tr><tr style=""border-top:1px solid #ccc; font-weight:bold;""><td style=""padding:3px;"">Gross Total:</td><td style=""text-align:right;"">₹52,500.00</td></tr></table>";
            if (!data.ContainsKey("{{salary.deductionsTable}}")) data["{{salary.deductionsTable}}"] = @"<table style=""width:100%; font-size:11px; border-collapse:collapse;""><tr><td style=""padding:3px;"">Provident Fund (EPF):</td><td style=""text-align:right; font-weight:bold;"">₹3,500.00</td></tr><tr><td style=""padding:3px;"">Professional Tax:</td><td style=""text-align:right; font-weight:bold;"">₹500.00</td></tr><tr style=""border-top:1px solid #ccc; font-weight:bold;""><td style=""padding:3px;"">Total Deductions:</td><td style=""text-align:right;"">₹4,000.00</td></tr></table>";

            // Universal Fallbacks - Admit Card
            if (!data.ContainsKey("{{admit.rollNo}}")) data["{{admit.rollNo}}"] = "2610942";
            if (!data.ContainsKey("{{admit.center}}")) data["{{admit.center}}"] = "Center 04 - Block B, Examination Hall 1";
            if (!data.ContainsKey("{{admit.examName}}")) data["{{admit.examName}}"] = "Half Yearly / Mid-Term Assessment 2026";
            if (!data.ContainsKey("{{admit.scheduleTable}}")) data["{{admit.scheduleTable}}"] = @"<table style=""width:100%; border-collapse:collapse; font-size:11px; border:1px solid #cbd5e1;"">
  <tr style=""background:#f1f5f9; text-align:left;""><th style=""padding:5px; border:1px solid #cbd5e1;"">Date</th><th style=""padding:5px; border:1px solid #cbd5e1;"">Time</th><th style=""padding:5px; border:1px solid #cbd5e1;"">Subject</th><th style=""padding:5px; border:1px solid #cbd5e1; text-align:center;"">Room</th><th style=""padding:5px; border:1px solid #cbd5e1; text-align:center;"">Invigilator Sign</th></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">22/09/2026</td><td style=""padding:4px; border:1px solid #cbd5e1;"">09:00 AM - 12:00 PM</td><td style=""padding:4px; border:1px solid #cbd5e1;"">Mathematics</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">104</td><td style=""padding:4px; border:1px solid #cbd5e1;""></td></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">24/09/2026</td><td style=""padding:4px; border:1px solid #cbd5e1;"">09:00 AM - 12:00 PM</td><td style=""padding:4px; border:1px solid #cbd5e1;"">English Core</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">104</td><td style=""padding:4px; border:1px solid #cbd5e1;""></td></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">26/09/2026</td><td style=""padding:4px; border:1px solid #cbd5e1;"">09:00 AM - 12:00 PM</td><td style=""padding:4px; border:1px solid #cbd5e1;"">Science & Tech</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">201</td><td style=""padding:4px; border:1px solid #cbd5e1;""></td></tr>
  <tr><td style=""padding:4px; border:1px solid #cbd5e1;"">28/09/2026</td><td style=""padding:4px; border:1px solid #cbd5e1;"">09:00 AM - 12:00 PM</td><td style=""padding:4px; border:1px solid #cbd5e1;"">Social Science</td><td style=""padding:4px; text-align:center; border:1px solid #cbd5e1;"">201</td><td style=""padding:4px; border:1px solid #cbd5e1;""></td></tr>
</table>";

            // Universal Fallbacks - Transfer Certificate
            if (!data.ContainsKey("{{tc.certificateNo}}")) data["{{tc.certificateNo}}"] = "TC/2026/0892";
            if (!data.ContainsKey("{{tc.issueDate}}")) data["{{tc.issueDate}}"] = DateTime.UtcNow.ToString("dd/MM/yyyy");
            if (!data.ContainsKey("{{tc.penNo}}")) data["{{tc.penNo}}"] = "PEN-9874102";
            if (!data.ContainsKey("{{tc.leavingClass}}")) data["{{tc.leavingClass}}"] = "Class 10 (Passed)";
            if (!data.ContainsKey("{{tc.reason}}")) data["{{tc.reason}}"] = "Parent Relocation / Higher Secondary Admission";
            if (!data.ContainsKey("{{tc.conduct}}")) data["{{tc.conduct}}"] = "Exemplary & Diligent";

            // Universal Fallbacks - Gate Pass
            if (!data.ContainsKey("{{gatepass.tokenNo}}")) data["{{gatepass.tokenNo}}"] = "GP-2026-4401";
            if (!data.ContainsKey("{{gatepass.visitorName}}")) data["{{gatepass.visitorName}}"] = "Vikas Malhotra (Parent)";
            if (!data.ContainsKey("{{gatepass.purpose}}")) data["{{gatepass.purpose}}"] = "Academic Inquiry & PTM";
            if (!data.ContainsKey("{{gatepass.timeIn}}")) data["{{gatepass.timeIn}}"] = "10:30 AM";
            if (!data.ContainsKey("{{gatepass.validTill}}")) data["{{gatepass.validTill}}"] = "12:00 PM";
            if (!data.ContainsKey("{{gatepass.vehicleNo}}")) data["{{gatepass.vehicleNo}}"] = "DL 3C AB 9876";

            // Generic Doc Fallbacks
            if (!data.ContainsKey("{{doc.referenceNo}}")) data["{{doc.referenceNo}}"] = "REF-2026-DEMO";
            if (!data.ContainsKey("{{doc.date}}")) data["{{doc.date}}"] = DateTime.UtcNow.ToString("dd/MM/yyyy");

            var output = htmlTemplate;
            foreach (var kvp in data)
            {
                output = output.Replace(kvp.Key, kvp.Value);
            }

            return output;
        }

        private static List<PrintTemplate> SeedDefaultTemplates(Guid schoolId)
        {
            var feeThermal = AiPlannerService.GenerateBuiltInTemplate("FeeReceipt", "Thermal80mm");
            var feeA4 = AiPlannerService.GenerateBuiltInTemplate("FeeReceipt", "A4TwinCopy");
            var reportCard = AiPlannerService.GenerateBuiltInTemplate("ReportCard", "A4Single");
            var salarySlip = AiPlannerService.GenerateBuiltInTemplate("SalarySlip", "A4Single");

            return new List<PrintTemplate>
            {
                new()
                {
                    SchoolId = schoolId,
                    DocumentType = "FeeReceipt",
                    TemplateName = "Default 80mm Thermal Receipt",
                    Description = "Quick POS receipt for counter payments",
                    PaperSize = "Thermal80mm",
                    Orientation = "Portrait",
                    HtmlContent = feeThermal.HtmlContent,
                    IsDefault = true,
                    IsActive = true
                },
                new()
                {
                    SchoolId = schoolId,
                    DocumentType = "FeeReceipt",
                    TemplateName = "Default A4 Twin-Copy Receipt",
                    Description = "Two identical copies on single A4 sheet (Student + Office copy)",
                    PaperSize = "A4TwinCopy",
                    Orientation = "Portrait",
                    HtmlContent = feeA4.HtmlContent,
                    IsDefault = false,
                    IsActive = true
                },
                new()
                {
                    SchoolId = schoolId,
                    DocumentType = "ReportCard",
                    TemplateName = "Default CBSE Annual Report Card",
                    Description = "Standard evaluation profile for students",
                    PaperSize = "A4Single",
                    Orientation = "Portrait",
                    HtmlContent = reportCard.HtmlContent,
                    IsDefault = true,
                    IsActive = true
                },
                new()
                {
                    SchoolId = schoolId,
                    DocumentType = "SalarySlip",
                    TemplateName = "Default Monthly Salary Slip",
                    Description = "Detailed breakdown of earnings, statutory deductions and in-hand pay",
                    PaperSize = "A4Single",
                    Orientation = "Portrait",
                    HtmlContent = salarySlip.HtmlContent,
                    IsDefault = true,
                    IsActive = true
                }
            };
        }

        private static string NumberToWords(long number)
        {
            if (number == 0) return "Zero";
            if (number < 0) return "Minus " + NumberToWords(Math.Abs(number));

            string words = "";

            if ((number / 10000000) > 0)
            {
                words += NumberToWords(number / 10000000) + " Crore ";
                number %= 10000000;
            }
            if ((number / 100000) > 0)
            {
                words += NumberToWords(number / 100000) + " Lakh ";
                number %= 100000;
            }
            if ((number / 1000) > 0)
            {
                words += NumberToWords(number / 1000) + " Thousand ";
                number %= 1000;
            }
            if ((number / 100) > 0)
            {
                words += NumberToWords(number / 100) + " Hundred ";
                number %= 100;
            }

            if (number > 0)
            {
                var unitsMap = new[] { "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen" };
                var tensMap = new[] { "Zero", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety" };

                if (number < 20)
                    words += unitsMap[number];
                else
                {
                    words += tensMap[number / 10];
                    if ((number % 10) > 0)
                        words += "-" + unitsMap[number % 10];
                }
            }

            return words.Trim();
        }
    }

    public class CreatePrintTemplateDto
    {
        public Guid? SchoolId { get; set; }
        public string? DocumentType { get; set; } = "FeeReceipt";
        public string TemplateName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? PaperSize { get; set; } = "A4Single";
        public string? Orientation { get; set; } = "Portrait";
        public string? LayoutConfigJson { get; set; }
        public string? HtmlContent { get; set; }
        public bool WasAiGenerated { get; set; } = false;
        public string? AiPromptUsed { get; set; }
        public bool IsSuperAdminMaster { get; set; } = false;
        public bool IsDefault { get; set; } = false;
    }

    public class UpdatePrintTemplateDto
    {
        public string? TemplateName { get; set; }
        public string? Description { get; set; }
        public string? PaperSize { get; set; }
        public string? Orientation { get; set; }
        public string? LayoutConfigJson { get; set; }
        public string? HtmlContent { get; set; }
        public bool? IsDefault { get; set; }
        public bool? IsActive { get; set; }
    }

    public class AiGenerateRequestDto
    {
        public string DocumentType { get; set; } = "FeeReceipt";
        public string? PaperSize { get; set; } = "A4Single";
        public string? Prompt { get; set; }
        public string? Base64Image { get; set; }
    }

    public class PushTemplateRequestDto
    {
        public Guid MasterTemplateId { get; set; }
        public bool PushToAllSchools { get; set; } = true;
        public List<Guid>? SchoolIds { get; set; }
        public bool SetAsDefault { get; set; } = true;
    }
}
