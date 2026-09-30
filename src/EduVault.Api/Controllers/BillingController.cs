using System;
using System.Linq;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Core.DTOs;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/billing")]
    [Authorize]
    public class BillingController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly Services.WhatsAppService _whatsAppService;

        public BillingController(IUnitOfWork unitOfWork, IConfiguration configuration, IHttpClientFactory httpClientFactory, Services.WhatsAppService whatsAppService)
        {
            _unitOfWork = unitOfWork;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
            _whatsAppService = whatsAppService;
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

        [HttpGet("structures")]
        public async Task<IActionResult> GetFeeStructures()
        {
            var schoolId = GetSchoolId();
            var structures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);
            var students = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");

            return Ok(structures.Select(fs => {
                var studentUser = fs.StudentId.HasValue ? students.FirstOrDefault(u => u.Id == fs.StudentId.Value) : null;
                return new {
                    fs.Id,
                    fs.Name,
                    fs.Amount,
                    fs.Frequency,
                    Grade = string.IsNullOrEmpty(fs.Grade) ? "All Grades" : fs.Grade,
                    fs.Installments,
                    fs.StudentId,
                    StudentName = studentUser != null ? $"{studentUser.FirstName} {studentUser.LastName}" : null,
                    SubmissionTime = string.IsNullOrEmpty(fs.SubmissionTime) ? "Immediate" : fs.SubmissionTime,
                    fs.Breakdown
                };
            }));
        }

        [HttpPost("structures")]
        [Authorize(Roles = "schooladmin,accountmanager")]
        public async Task<IActionResult> CreateFeeStructure([FromBody] FeeStructure feeStructure)
        {
            feeStructure.SchoolId = GetSchoolId();
            if (feeStructure.Installments <= 0) feeStructure.Installments = 1;

            await _unitOfWork.FeeStructures.AddAsync(feeStructure);
            await _unitOfWork.CompleteAsync();

            // ─── Auto-generate stagered installment invoices ───
            decimal installmentAmount = Math.Round(feeStructure.Amount / feeStructure.Installments, 2);

            if (feeStructure.StudentId.HasValue)
            {
                // Student-specific override
                // Remove existing class-wide invoices for this student for the SAME fee name
                var classWideStructures = await _unitOfWork.FeeStructures.FindAsync(fs => 
                    fs.SchoolId == feeStructure.SchoolId && 
                    fs.Name == feeStructure.Name && 
                    !fs.StudentId.HasValue);
                
                var classWideStructureIds = classWideStructures.Select(fs => fs.Id).ToList();
                if (classWideStructureIds.Any())
                {
                    var existingInvoices = await _unitOfWork.Invoices.FindAsync(i => 
                        i.StudentId == feeStructure.StudentId.Value && 
                        classWideStructureIds.Contains(i.FeeStructureId));
                    
                    foreach (var inv in existingInvoices)
                    {
                        _unitOfWork.Invoices.Remove(inv);
                    }
                }

                for (int step = 1; step <= feeStructure.Installments; step++)
                {
                    var invoice = new StudentInvoice
                    {
                        StudentId = feeStructure.StudentId.Value,
                        FeeStructureId = feeStructure.Id,
                        Amount = installmentAmount,
                        IssueDate = DateTime.UtcNow,
                        DueDate = DateTime.UtcNow.AddDays(30 * step),
                        Status = "Pending"
                    };
                    await _unitOfWork.Invoices.AddAsync(invoice);
                }
            }
            else
            {
                // Class-wide rule
                var schoolId = GetSchoolId();
                var cleanGradeStr = feeStructure.Grade?.Replace("Class ", "").Trim() ?? string.Empty;
                string gradePart = cleanGradeStr;
                string sectionPart = "";
                
                if (cleanGradeStr.Contains("-"))
                {
                    var parts = cleanGradeStr.Split('-', 2);
                    gradePart = parts[0].Trim();
                    sectionPart = parts[1].Trim();
                }
                else if (cleanGradeStr.Contains(" "))
                {
                    var parts = cleanGradeStr.Split(' ', 2);
                    gradePart = parts[0].Trim();
                    sectionPart = parts[1].Trim();
                }

                if (sectionPart.StartsWith("Section ", StringComparison.OrdinalIgnoreCase))
                {
                    sectionPart = sectionPart.Substring(8).Trim();
                }

                var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId && 
                    c.Grade == gradePart && 
                    (string.IsNullOrEmpty(sectionPart) || c.Section == sectionPart || c.Section == $"Section {sectionPart}"));
                var classIds = classes.Select(c => c.Id).ToList();

                var enrollments = await _unitOfWork.Enrollments.FindAsync(e => classIds.Contains(e.ClassId) && e.Status == "ACTIVE");
                var studentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();

                foreach (var studentId in studentIds)
                {
                    // Skip if student has a specific override for this fee name
                    var hasOverride = (await _unitOfWork.FeeStructures.FindAsync(fs => 
                        fs.SchoolId == schoolId && 
                        fs.StudentId == studentId && 
                        fs.Name == feeStructure.Name)).Any();
                    
                    if (hasOverride) continue;

                    for (int step = 1; step <= feeStructure.Installments; step++)
                    {
                        var invoice = new StudentInvoice
                        {
                            StudentId = studentId,
                            FeeStructureId = feeStructure.Id,
                            Amount = installmentAmount,
                            IssueDate = DateTime.UtcNow,
                            DueDate = DateTime.UtcNow.AddDays(30 * step),
                            Status = "Pending"
                        };
                        await _unitOfWork.Invoices.AddAsync(invoice);
                    }
                }
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, feeStructureId = feeStructure.Id });
        }

        private async Task EnsureStudentEnrolledAndInvoiced(Guid studentId, Guid schoolId)
        {
            // 1. Ensure student is enrolled in a class
            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == studentId && e.Status == "ACTIVE")).FirstOrDefault();
            if (enrollment == null)
            {
                var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
                var classObj = classes.FirstOrDefault();
                if (classObj == null)
                {
                    classObj = new Class
                    {
                        SchoolId = schoolId,
                        Grade = "10",
                        Section = "A",
                        Level = "Secondary Education",
                        Room = "Room 101",
                        Capacity = 40
                    };
                    await _unitOfWork.Classes.AddAsync(classObj);
                    await _unitOfWork.CompleteAsync();
                }

                // Make sure the student record exists in Students table (or else foreign key might fail if missing)
                var studentProfile = await _unitOfWork.Students.GetByIdAsync(studentId);
                if (studentProfile == null)
                {
                    studentProfile = new Student
                    {
                        UserId = studentId,
                        StudentId = $"STU-{DateTime.UtcNow.Year}-{RandomNumberGenerator.GetInt32(1000, 10000)}",
                        Address = "Sample Address"
                    };
                    await _unitOfWork.Students.AddAsync(studentProfile);
                    await _unitOfWork.CompleteAsync();
                }

                enrollment = new Enrollment
                {
                    StudentId = studentId,
                    ClassId = classObj.Id,
                    AcademicYear = $"{DateTime.UtcNow.Year}-{((DateTime.UtcNow.Year + 1) % 100):D2}",
                    Status = "ACTIVE",
                    EnrollDate = DateTime.UtcNow
                };
                await _unitOfWork.Enrollments.AddAsync(enrollment);
                await _unitOfWork.CompleteAsync();
            }

            // 2. Ensure student has at least 2 pending invoices
            var invoices = await _unitOfWork.Invoices.FindAsync(i => i.StudentId == studentId);
            if (!invoices.Any())
            {
                var structures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);
                
                var tuitionFeeStruct = structures.FirstOrDefault(fs => fs.Name == "Quarterly Tuition Fee");
                if (tuitionFeeStruct == null)
                {
                    tuitionFeeStruct = new FeeStructure
                    {
                        SchoolId = schoolId,
                        Name = "Quarterly Tuition Fee",
                        Amount = 3500.00m,
                        Frequency = "Quarterly",
                        Grade = "All Grades"
                    };
                    await _unitOfWork.FeeStructures.AddAsync(tuitionFeeStruct);
                    await _unitOfWork.CompleteAsync();
                }

                var libraryFeeStruct = structures.FirstOrDefault(fs => fs.Name == "Library & Lab Fee");
                if (libraryFeeStruct == null)
                {
                    libraryFeeStruct = new FeeStructure
                    {
                        SchoolId = schoolId,
                        Name = "Library & Lab Fee",
                        Amount = 500.00m,
                        Frequency = "One-Time",
                        Grade = "All Grades"
                    };
                    await _unitOfWork.FeeStructures.AddAsync(libraryFeeStruct);
                    await _unitOfWork.CompleteAsync();
                }

                var inv1 = new StudentInvoice
                {
                    StudentId = studentId,
                    FeeStructureId = tuitionFeeStruct.Id,
                    Amount = 3500.00m,
                    IssueDate = DateTime.UtcNow.AddDays(-5),
                    DueDate = DateTime.UtcNow.AddDays(15),
                    Status = "Pending"
                };

                var inv2 = new StudentInvoice
                {
                    StudentId = studentId,
                    FeeStructureId = libraryFeeStruct.Id,
                    Amount = 500.00m,
                    IssueDate = DateTime.UtcNow.AddDays(-5),
                    DueDate = DateTime.UtcNow.AddDays(25),
                    Status = "Pending"
                };

                await _unitOfWork.Invoices.AddAsync(inv1);
                await _unitOfWork.Invoices.AddAsync(inv2);
                await _unitOfWork.CompleteAsync();
            }
        }

        [HttpGet("invoices")]
        public async Task<IActionResult> GetInvoices()
        {
            var schoolId = GetSchoolId();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (role == "student")
            {
                var userId = GetUserId();
                await EnsureStudentEnrolledAndInvoiced(userId, schoolId);

                var invoices = await _unitOfWork.Invoices.FindAsync(i => i.StudentId == userId);
                var structures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);

                var list = invoices.Select(i => {
                    var structObj = structures.FirstOrDefault(fs => fs.Id == i.FeeStructureId);
                    return new {
                        i.Id,
                        Desc = structObj?.Name ?? "School Fee Invoice",
                        Sub = structObj?.Frequency ?? "Recurring Fee",
                        Due = i.DueDate.ToString("MMM dd, yyyy"),
                        Amount = i.Amount,
                        Status = i.Status
                    };
                });
                return Ok(list);
            }
            else
            {
                // School Admin view - securely filtered to students in this school
                var studentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
                var studentIds = studentUsers.Select(u => u.Id).ToList();
                var invoices = await _unitOfWork.Invoices.FindAsync(i => studentIds.Contains(i.StudentId));
                var structures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);

                var list = invoices.Select(i => {
                    var structObj = structures.FirstOrDefault(fs => fs.Id == i.FeeStructureId);
                    var studentUser = studentUsers.FirstOrDefault(u => u.Id == i.StudentId);
                    return new {
                        i.Id,
                        StudentName = studentUser != null ? $"{studentUser.FirstName} {studentUser.LastName}" : "Unknown Student",
                        Type = structObj?.Name ?? "School Fee",
                        Amount = i.Amount,
                        Date = i.IssueDate.ToString("MMM dd, yyyy"),
                        Status = i.Status
                    };
                });
                return Ok(list.OrderByDescending(i => i.Date));
            }
        }

        [HttpPost("pay")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> PayInvoice([FromBody] PayInvoiceRequest request)
        {
            var studentId = GetUserId();
            var schoolId = GetSchoolId();
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(request.InvoiceId);
            if (invoice == null) return NotFound(new { error = "Invoice not found" });

            if (invoice.StudentId != studentId)
            {
                return Forbid();
            }

            decimal totalPayable = invoice.Amount + invoice.LateFineAmount;

            // Calculate actual paid from successful transactions table
            var allPaidTxns = (await _unitOfWork.Transactions
                .FindAsync(t => t.InvoiceId == invoice.Id && (t.Status == "success" || t.Status == "SUCCESS" || t.Status == "Paid")))
                .Sum(t => t.Amount);
            decimal realPaid = Math.Max(invoice.PaidAmount, allPaidTxns);
            decimal remainingBalance = Math.Max(0, totalPayable - realPaid);

            if (remainingBalance <= 0 || invoice.Status == "Paid")
            {
                invoice.Status = "Paid";
                invoice.PaidAmount = totalPayable;
                _unitOfWork.Invoices.Update(invoice);
                await _unitOfWork.CompleteAsync();
                return BadRequest(new { error = "Invoice is already fully paid. No further payment required." });
            }

            decimal payAmount = (request.Amount.HasValue && request.Amount.Value > 0) 
                ? Math.Min(request.Amount.Value, remainingBalance) 
                : remainingBalance;

            if (payAmount <= 0)
            {
                return BadRequest(new { error = "Payment amount must be greater than zero." });
            }

            // Create Transaction Record (Stripe/Payment Mock)
            var transaction = new PaymentTransaction
            {
                InvoiceId = request.InvoiceId,
                ReferenceNumber = $"TXN-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
                Amount = payAmount,
                PaymentMethod = request.PaymentMethod,
                TransactionDate = DateTime.UtcNow,
                Status = "success"
            };

            await _unitOfWork.Transactions.AddAsync(transaction);

            // Update Invoice Status
            invoice.PaidAmount += payAmount;
            invoice.Status = (invoice.PaidAmount >= totalPayable) ? "Paid" : "Partially Paid";
            _unitOfWork.Invoices.Update(invoice);

            await _unitOfWork.CompleteAsync();

            // Send WhatsApp payment receipt to parent
            try
            {
                var studentProfile = await _unitOfWork.Students.GetByIdAsync(invoice.StudentId);
                var feeStruct = await _unitOfWork.FeeStructures.GetByIdAsync(invoice.FeeStructureId);
                var feeTitle = feeStruct?.Name ?? "School Fee";
                var schoolObj = await _unitOfWork.Schools.GetByIdAsync(schoolId);
                if (studentProfile != null && !string.IsNullOrWhiteSpace(studentProfile.GuardianPhone))
                {
                    string msg = $"🧾 *FEE PAYMENT RECEIPT*\n\nDear Parent,\nPayment of ₹{payAmount:N2} for *{feeTitle}* has been received successfully.\n\n• *Mode:* {request.PaymentMethod}\n• *Ref ID:* {transaction.ReferenceNumber}\n• *Status:* {invoice.Status}\n• *Remaining Due:* ₹{Math.Max(0, totalPayable - invoice.PaidAmount):N2}\n\nThank you,\n*{schoolObj?.Name ?? "School Administration"}*";
                    _ = _whatsAppService.SendEventNotificationAsync(schoolId, "FEE_RECEIPT", studentProfile.GuardianPhone, msg);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP NOTICE] Error notifying parent on fee payment: {ex.Message}");
            }

            return Ok(new {
                success = true,
                referenceNumber = transaction.ReferenceNumber,
                amountPaid = transaction.Amount,
                totalBilled = totalPayable,
                remainingBalance = Math.Max(0, totalPayable - invoice.PaidAmount),
                status = invoice.Status
            });
        }

        [HttpGet("my-fee-structures")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> GetMyFeeStructures()
        {
            var studentId = GetUserId();
            var schoolId = GetSchoolId();

            await EnsureStudentEnrolledAndInvoiced(studentId, schoolId);

            var enrollment = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == studentId && e.Status == "ACTIVE")).FirstOrDefault();
            if (enrollment == null) return BadRequest(new { error = "Student has no active enrollment class" });

            var classObj = await _unitOfWork.Classes.GetByIdAsync(enrollment.ClassId);
            if (classObj == null) return BadRequest(new { error = "Class not found" });

            var structures = await _unitOfWork.FeeStructures.FindAsync(fs => 
                fs.SchoolId == schoolId && 
                (fs.Grade == classObj.Grade || string.IsNullOrEmpty(fs.Grade) || fs.Grade.ToLower() == "all grades"));

            return Ok(structures.Select(fs => new {
                fs.Id,
                fs.Name,
                fs.Amount,
                fs.Frequency,
                Grade = string.IsNullOrEmpty(fs.Grade) ? "All Grades" : fs.Grade
            }));
        }

        [HttpPut("structures/{id}")]
        [Authorize(Roles = "schooladmin,accountmanager")]
        public async Task<IActionResult> UpdateFeeStructure(Guid id, [FromBody] FeeStructure model)
        {
            var schoolId = GetSchoolId();
            var feeStructure = await _unitOfWork.FeeStructures.GetByIdAsync(id);
            if (feeStructure == null || feeStructure.SchoolId != schoolId)
            {
                return NotFound(new { error = "Fee structure not found" });
            }

            if (string.IsNullOrWhiteSpace(model.Name))
            {
                return BadRequest(new { error = "Fee name is required" });
            }
            if (model.Amount <= 0)
            {
                return BadRequest(new { error = "Amount must be greater than zero" });
            }

            feeStructure.Name = model.Name.Trim();
            feeStructure.Grade = model.Grade?.Trim() ?? string.Empty;
            feeStructure.Amount = model.Amount;
            feeStructure.Frequency = model.Frequency.Trim();

            _unitOfWork.FeeStructures.Update(feeStructure);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        [HttpDelete("structures/{id}")]
        [Authorize(Roles = "schooladmin,accountmanager")]
        public async Task<IActionResult> DeleteFeeStructure(Guid id)
        {
            var schoolId = GetSchoolId();
            var feeStructure = await _unitOfWork.FeeStructures.GetByIdAsync(id);
            if (feeStructure == null || feeStructure.SchoolId != schoolId)
            {
                return NotFound(new { error = "Fee structure not found" });
            }

            // Remove all unpaid invoices generated by this structure
            var invoices = await _unitOfWork.Invoices.FindAsync(i => i.FeeStructureId == id && i.Status != "Paid");
            foreach (var inv in invoices)
            {
                _unitOfWork.Invoices.Remove(inv);
            }

            _unitOfWork.FeeStructures.Remove(feeStructure);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }

        [HttpPost("create-order")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderRequest request)
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(request.InvoiceId);
            if (invoice == null) return NotFound(new { error = "Invoice not found" });

            if (invoice.Status == "Paid") return BadRequest(new { error = "Invoice is already paid" });

            var user = await _unitOfWork.Users.GetByIdAsync(invoice.StudentId);
            var school = (user != null && user.SchoolId.HasValue) ? await _unitOfWork.Schools.GetByIdAsync(user.SchoolId.Value) : null;

            // Get active payment provider
            string provider = school?.PaymentProvider?.ToLower() ?? "razorpay";

            decimal totalPayable = invoice.Amount + invoice.LateFineAmount;
            decimal remainingBalance = Math.Max(0, totalPayable - invoice.PaidAmount);
            decimal payAmount = (request.Amount.HasValue && request.Amount.Value > 0)
                ? Math.Min(request.Amount.Value, remainingBalance)
                : remainingBalance;

            if (payAmount <= 0)
            {
                return BadRequest(new { error = "Payment amount must be greater than zero." });
            }

            if (provider == "stripe")
            {
                bool hasKeys = school != null && !string.IsNullOrWhiteSpace(school.StripePublishableKey);
                return Ok(new {
                    paymentProvider = "stripe",
                    publishableKey = school?.StripePublishableKey ?? "pk_test_mock_stripe_key",
                    amount = payAmount,
                    currency = "INR",
                    orderId = $"stripe_order_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    invoiceId = invoice.Id,
                    isMock = !hasKeys
                });
            }
            else if (provider == "paypal")
            {
                bool hasKeys = school != null && !string.IsNullOrWhiteSpace(school.PayPalClientId);
                return Ok(new {
                    paymentProvider = "paypal",
                    clientId = school?.PayPalClientId ?? "paypal_mock_client_id",
                    amount = payAmount,
                    currency = "INR",
                    orderId = $"paypal_order_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    invoiceId = invoice.Id,
                    isMock = !hasKeys
                });
            }
            else if (provider == "phonepe")
            {
                bool hasKeys = school != null && !string.IsNullOrWhiteSpace(school.PhonePeMerchantId);
                return Ok(new {
                    paymentProvider = "phonepe",
                    merchantId = school?.PhonePeMerchantId ?? "phonepe_mock_merchant_id",
                    amount = payAmount,
                    currency = "INR",
                    orderId = $"phonepe_order_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    invoiceId = invoice.Id,
                    isMock = !hasKeys
                });
            }
            else if (provider == "cashless")
            {
                return Ok(new {
                    paymentProvider = "cashless",
                    instructions = school?.CashlessInstructions ?? "Please contact school administration for cashless/bank transfer details.",
                    amount = payAmount,
                    currency = "INR",
                    orderId = $"cashless_order_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    invoiceId = invoice.Id,
                    isMock = false
                });
            }
            else
            {
                // Razorpay
                bool hasKeys = school != null && !string.IsNullOrWhiteSpace(school.RazorpayKeyId) && !string.IsNullOrWhiteSpace(school.RazorpayKeySecret);
                if (!hasKeys || school == null)
                {
                    return BadRequest(new { error = "PAYMENT_NOT_CONFIGURED", message = "Razorpay credentials are not configured for this school in database settings." });
                }

                var keyId = school.RazorpayKeyId!.Trim();
                var keySecret = school.RazorpayKeySecret!.Trim();

                try
                {
                    var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
                    using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders");
                    httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authString);

                    var orderRequest = new
                    {
                        amount = (int)Math.Round(payAmount * 100), // in paise
                        currency = "INR",
                        receipt = invoice.Id.ToString()
                    };

                    httpRequest.Content = new StringContent(JsonSerializer.Serialize(orderRequest), Encoding.UTF8, "application/json");

                    var client = _httpClientFactory.CreateClient();
                    var response = await client.SendAsync(httpRequest);

                    if (!response.IsSuccessStatusCode)
                    {
                        var errContent = await response.Content.ReadAsStringAsync();
                        return BadRequest(new { error = $"Razorpay order creation failed: {errContent}" });
                    }

                    var responseContent = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseContent);
                    var orderId = doc.RootElement.GetProperty("id").GetString();

                    return Ok(new {
                        paymentProvider = "razorpay",
                        orderId = orderId,
                        amount = (int)Math.Round(payAmount * 100),
                        currency = "INR",
                        keyId = keyId,
                        invoiceId = invoice.Id,
                        isMock = false
                    });
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { error = $"Error calling Razorpay API: {ex.Message}" });
                }
            }
        }

        [HttpPost("verify-payment")]
        [Authorize(Roles = "student,schooladmin,accountmanager")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest request)
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(request.InvoiceId);
            if (invoice == null) return NotFound(new { error = "Invoice not found" });

            decimal totalPayable = invoice.Amount + invoice.LateFineAmount;

            var allPaidTxns = (await _unitOfWork.Transactions
                .FindAsync(t => t.InvoiceId == invoice.Id && (t.Status == "success" || t.Status == "SUCCESS" || t.Status == "Paid")))
                .Sum(t => t.Amount);
            decimal realPaid = Math.Max(invoice.PaidAmount, allPaidTxns);
            decimal remainingBalance = Math.Max(0, totalPayable - realPaid);

            if (remainingBalance <= 0 || invoice.Status == "Paid")
            {
                invoice.Status = "Paid";
                invoice.PaidAmount = totalPayable;
                _unitOfWork.Invoices.Update(invoice);
                await _unitOfWork.CompleteAsync();
                return BadRequest(new { error = "No pending payment amount due for this invoice. It is already fully paid." });
            }

            decimal payAmount = (request.Amount.HasValue && request.Amount.Value > 0)
                ? Math.Min(request.Amount.Value, remainingBalance)
                : remainingBalance;

            if (payAmount <= 0)
            {
                return BadRequest(new { error = "No pending payment amount due for this invoice." });
            }

            var user = await _unitOfWork.Users.GetByIdAsync(invoice.StudentId);
            var school = user != null ? await _unitOfWork.Schools.GetByIdAsync(user.SchoolId) : null;
            var schoolId = user?.SchoolId ?? GetSchoolId();
            
            // Get active payment provider
            string provider = school?.PaymentProvider?.ToLower() ?? "razorpay";

            bool isVerified = false;
            string referenceNumber = "";
            string paymentMethod = provider;

            if (provider == "stripe" || provider == "paypal" || provider == "phonepe" || provider == "cashless")
            {
                // Verify mock/simulated payment for these providers
                isVerified = true;
                referenceNumber = !string.IsNullOrEmpty(request.TransactionReference) 
                    ? request.TransactionReference 
                    : $"{provider}_pay_{Guid.NewGuid().ToString().Substring(0, 8)}";
            }
            else
            {
                // Razorpay
                bool hasKeys = school != null && !string.IsNullOrWhiteSpace(school.RazorpayKeySecret);
                if (!hasKeys || school == null)
                {
                    return BadRequest(new { error = "PAYMENT_NOT_CONFIGURED", message = "Razorpay secret key is not configured for this school in database settings." });
                }

                var keySecret = school.RazorpayKeySecret!.Trim();
                var razorOrderId = request.RazorpayOrderId ?? "";
                var razorPaymentId = request.RazorpayPaymentId ?? "";
                var razorSignature = request.RazorpaySignature ?? "";

                // If testing with mock orders or signature verification against secret
                if (razorOrderId.StartsWith("order_mock_") || keySecret == "yourKeySecretHere")
                {
                    isVerified = true;
                }
                else
                {
                    isVerified = VerifySignature(razorOrderId, razorPaymentId, razorSignature, keySecret);
                }
                referenceNumber = razorPaymentId;
                paymentMethod = "Razorpay";
            }

            if (!isVerified)
            {
                return BadRequest(new { error = "Payment verification failed. Invalid transaction." });
            }

            // Record transaction
            var transaction = new PaymentTransaction
            {
                InvoiceId = request.InvoiceId,
                ReferenceNumber = referenceNumber,
                Amount = payAmount,
                PaymentMethod = paymentMethod,
                TransactionDate = DateTime.UtcNow,
                Status = "success"
            };

            await _unitOfWork.Transactions.AddAsync(transaction);

            // Update invoice
            invoice.PaidAmount += payAmount;
            invoice.Status = (invoice.PaidAmount >= totalPayable) ? "Paid" : "Partially Paid";
            _unitOfWork.Invoices.Update(invoice);

            await _unitOfWork.CompleteAsync();

            // Send WhatsApp payment receipt
            try
            {
                var studentProfile = await _unitOfWork.Students.GetByIdAsync(invoice.StudentId);
                var feeStruct = await _unitOfWork.FeeStructures.GetByIdAsync(invoice.FeeStructureId);
                var feeTitle = feeStruct?.Name ?? "School Fee";
                var schoolObj = school ?? await _unitOfWork.Schools.GetByIdAsync(schoolId);
                if (studentProfile != null && !string.IsNullOrWhiteSpace(studentProfile.GuardianPhone))
                {
                    string msg = $"🧾 *FEE PAYMENT RECEIPT*\n\nDear Parent,\nWe have successfully received payment for invoice *{feeTitle}*.\n\n• *Amount Paid:* ₹{payAmount:N2}\n• *Payment Mode:* {paymentMethod}\n• *Ref / Txn ID:* {transaction.ReferenceNumber}\n• *Status:* {invoice.Status}\n• *Remaining Due:* ₹{Math.Max(0, totalPayable - invoice.PaidAmount):N2}\n\nThank you,\n*{schoolObj?.Name ?? "School Administration"}*";
                    _ = _whatsAppService.SendEventNotificationAsync(schoolId, "FEE_RECEIPT", studentProfile.GuardianPhone, msg);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WHATSAPP NOTICE] Error notifying parent on fee payment: {ex.Message}");
            }

            return Ok(new { 
                success = true, 
                referenceNumber = transaction.ReferenceNumber,
                amountPaid = payAmount,
                totalBilled = totalPayable,
                remainingBalance = Math.Max(0, totalPayable - invoice.PaidAmount),
                status = invoice.Status
            });
        }

        [HttpPost("invoices/{id}/reminder")]
        [Authorize(Roles = "accountmanager,schooladmin")]
        public async Task<IActionResult> SendFeeReminder(Guid id)
        {
            var schoolId = GetSchoolId();
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(id);
            if (invoice == null) return NotFound(new { error = "Invoice not found" });

            var student = await _unitOfWork.Students.GetByIdAsync(invoice.StudentId);
            var studentUser = await _unitOfWork.Users.GetByIdAsync(invoice.StudentId);
            var feeStruct = await _unitOfWork.FeeStructures.GetByIdAsync(invoice.FeeStructureId);
            var feeTitle = feeStruct?.Name ?? "School Fee";
            var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);

            decimal totalPayable = invoice.Amount + invoice.LateFineAmount;
            decimal remainingBalance = Math.Max(0, totalPayable - invoice.PaidAmount);

            var phone = student?.GuardianPhone;
            if (string.IsNullOrWhiteSpace(phone))
            {
                return BadRequest(new { error = "Student has no registered guardian phone number for WhatsApp alerts." });
            }

            string dueDateStr = invoice.DueDate.ToString("dd MMM yyyy");
            string msg = $"🔔 *FEE PAYMENT REMINDER*\n\nDear Parent of *{studentUser?.FirstName} {studentUser?.LastName}*,\nThis is a friendly reminder regarding pending fee invoice for *{feeTitle}*.\n\n• *Pending Amount:* ₹{remainingBalance:N2}\n• *Due Date:* {dueDateStr}\n• *Invoice ID:* INV-{invoice.Id.ToString().Substring(0, 8).ToUpper()}\n\nPlease clear the dues to avoid late fee penalties.\n\n- *{school?.Name ?? "Accounts Department"}*";

            _ = _whatsAppService.SendEventNotificationAsync(schoolId, "FEE_REMINDER", phone, msg);

            return Ok(new { success = true, message = "Fee payment reminder sent via WhatsApp successfully." });
        }

        // =========================================================================
        // FINANCIAL RULES & MASTER HUB (Account Manager & School Admin Primary Authority)
        // =========================================================================

        [HttpGet("rules/summary")]
        [Authorize(Roles = "accountmanager,schooladmin")]
        public async Task<IActionResult> GetFinancialRulesSummary()
        {
            var schoolId = GetSchoolId();

            var structures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);
            var enrollments = await _unitOfWork.Enrollments.FindAsync(e => e.Status == "COMPARTMENT_PENDING");
            var compartmentStudentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();

            var compartmentStudents = new List<object>();
            foreach (var stuId in compartmentStudentIds)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(stuId);
                var enroll = enrollments.FirstOrDefault(e => e.StudentId == stuId);
                var classObj = enroll != null ? await _unitOfWork.Classes.GetByIdAsync(enroll.ClassId) : null;

                if (user != null)
                {
                    compartmentStudents.Add(new
                    {
                        studentId = user.Id,
                        studentName = $"{user.FirstName} {user.LastName}",
                        email = user.Email,
                        className = classObj != null ? $"Class {classObj.Grade} - {classObj.Section}" : "Unassigned",
                        failedSubjectsCount = enroll?.FailedSubjectsCount ?? 1,
                        status = enroll?.Status ?? "COMPARTMENT_PENDING",
                        remark = enroll?.AcademicOutcomeRemark ?? "Eligible for Supplementary Examination"
                    });
                }
            }

            return Ok(new
            {
                feeStructures = structures.Select(fs => new
                {
                    fs.Id,
                    fs.Name,
                    fs.Grade,
                    fs.Amount,
                    fs.Frequency,
                    fs.Installments,
                    fs.FeeCategory,
                    fs.LateFeePerDay,
                    fs.GracePeriodDays,
                    fs.IsCustomPaymentAllowed,
                    fs.MinPartialPaymentAmount
                }),
                compartmentStudents,
                totalCompartmentEligible = compartmentStudents.Count,
                defaultGraceDays = structures.Any() ? structures.Max(s => s.GracePeriodDays) : 5,
                defaultLateFeePerDay = structures.Any() ? structures.Max(s => s.LateFeePerDay) : 50.0m
            });
        }

        [HttpPost("structures/supplementary")]
        [Authorize(Roles = "accountmanager,schooladmin")]
        public async Task<IActionResult> CreateSupplementaryFeeRule([FromBody] CreateSupplementaryFeeRequest request)
        {
            var schoolId = GetSchoolId();

            if (string.IsNullOrWhiteSpace(request.Name)) request.Name = "Supplementary / Compartment Exam Fee";
            if (request.AmountPerSubject <= 0) request.AmountPerSubject = 500.0m;

            var feeStructure = new FeeStructure
            {
                SchoolId = schoolId,
                Name = request.Name.Trim(),
                Grade = request.Grade?.Trim() ?? "All Grades",
                Amount = request.AmountPerSubject,
                Frequency = "One-Time",
                Installments = 1,
                FeeCategory = "SupplementaryExam",
                GracePeriodDays = request.GracePeriodDays,
                LateFeePerDay = request.LateFeePerDay,
                IsCustomPaymentAllowed = request.IsCustomPaymentAllowed,
                Breakdown = $"₹{request.AmountPerSubject} per failed/compartment subject attempt."
            };

            await _unitOfWork.FeeStructures.AddAsync(feeStructure);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, feeStructureId = feeStructure.Id, message = "Supplementary fee rule configured successfully." });
        }

        [HttpPost("assign-supplementary-fee")]
        [Authorize(Roles = "accountmanager,schooladmin")]
        public async Task<IActionResult> AssignSupplementaryFee([FromBody] AssignSupplementaryFeeRequest request)
        {
            var schoolId = GetSchoolId();

            // Find Supplementary Fee Structure
            FeeStructure? feeStructure = null;
            if (request.FeeStructureId.HasValue)
            {
                feeStructure = await _unitOfWork.FeeStructures.GetByIdAsync(request.FeeStructureId.Value);
            }
            if (feeStructure == null)
            {
                var structures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId && fs.FeeCategory == "SupplementaryExam");
                feeStructure = structures.FirstOrDefault();
            }

            decimal ratePerSubject = feeStructure?.Amount ?? (request.CustomAmount ?? 500.0m);
            var feeStructId = feeStructure?.Id ?? Guid.NewGuid();

            var targetStudentIds = new List<Guid>();
            if (request.StudentId.HasValue)
            {
                targetStudentIds.Add(request.StudentId.Value);
            }
            else
            {
                var enrollments = await _unitOfWork.Enrollments.FindAsync(e => e.Status == "COMPARTMENT_PENDING");
                targetStudentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();
            }

            int countCreated = 0;
            foreach (var stuId in targetStudentIds)
            {
                var enroll = (await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == stuId && e.Status == "COMPARTMENT_PENDING")).FirstOrDefault();
                int failedSubjects = enroll?.FailedSubjectsCount ?? 1;
                if (failedSubjects <= 0) failedSubjects = 1;

                decimal invoiceAmount = request.CustomAmount.HasValue ? request.CustomAmount.Value : (ratePerSubject * failedSubjects);

                var invoice = new StudentInvoice
                {
                    StudentId = stuId,
                    FeeStructureId = feeStructure != null ? feeStructure.Id : Guid.Empty,
                    Amount = invoiceAmount,
                    PaidAmount = 0.0m,
                    LateFineAmount = 0.0m,
                    IssueDate = DateTime.UtcNow,
                    DueDate = DateTime.UtcNow.AddDays(request.DueDays > 0 ? request.DueDays : 15),
                    Status = "Pending"
                };

                await _unitOfWork.Invoices.AddAsync(invoice);
                countCreated++;
            }

            await _unitOfWork.CompleteAsync();

            return Ok(new { 
                success = true, 
                assignedCount = countCreated, 
                message = $"Successfully assigned Supplementary Exam Fee invoices to {countCreated} student(s)." 
            });
        }

        [HttpPut("rules/late-fee")]
        [Authorize(Roles = "accountmanager,schooladmin")]
        public async Task<IActionResult> UpdateLateFeeRule([FromBody] LateFeeRuleRequest request)
        {
            var schoolId = GetSchoolId();

            if (request.FeeStructureId.HasValue)
            {
                var feeStruct = await _unitOfWork.FeeStructures.GetByIdAsync(request.FeeStructureId.Value);
                if (feeStruct != null && feeStruct.SchoolId == schoolId)
                {
                    feeStruct.GracePeriodDays = request.GracePeriodDays;
                    feeStruct.LateFeePerDay = request.LateFeePerDay;
                    _unitOfWork.FeeStructures.Update(feeStruct);
                }
            }
            else
            {
                var allStructures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);
                foreach (var fs in allStructures)
                {
                    fs.GracePeriodDays = request.GracePeriodDays;
                    fs.LateFeePerDay = request.LateFeePerDay;
                    _unitOfWork.FeeStructures.Update(fs);
                }
            }

            await _unitOfWork.CompleteAsync();

            return Ok(new { 
                success = true, 
                message = $"Late fee rules updated: {request.GracePeriodDays} days grace period, ₹{request.LateFeePerDay}/day late fine." 
            });
        }

        [HttpGet("student-ledger")]
        [Authorize(Roles = "schooladmin,accountmanager")]
        public async Task<IActionResult> GetStudentLedger()
        {
            var schoolId = GetSchoolId();
            var studentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
            var studentIds = studentUsers.Select(u => u.Id).ToList();

            var invoices = await _unitOfWork.Invoices.FindAsync(i => studentIds.Contains(i.StudentId));
            var enrollments = await _unitOfWork.Enrollments.FindAsync(e => studentIds.Contains(e.StudentId));
            var classes = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);

            var ledger = studentUsers.Select(student => {
                var studentInvoices = invoices.Where(i => i.StudentId == student.Id).ToList();
                var totalBilled = studentInvoices.Sum(i => i.Amount);
                var totalPaid = studentInvoices.Where(i => i.Status == "Paid").Sum(i => i.Amount);
                var remainingDue = totalBilled - totalPaid;

                var studentEnrollment = enrollments.FirstOrDefault(e => e.StudentId == student.Id && e.Status == "ACTIVE");
                var classObj = studentEnrollment != null ? classes.FirstOrDefault(c => c.Id == studentEnrollment.ClassId) : null;
                var className = classObj != null ? $"{classObj.Grade}-{classObj.Section}" : "Not Assigned";

                string status = "No Invoices";
                if (studentInvoices.Any())
                {
                    if (remainingDue == 0) status = "Paid";
                    else if (totalPaid > 0) status = "Partial";
                    else status = "Pending";
                }

                return new {
                    StudentId = student.Id,
                    StudentName = $"{student.FirstName} {student.LastName}",
                    ClassName = className,
                    TotalBilled = totalBilled,
                    TotalPaid = totalPaid,
                    RemainingDue = remainingDue,
                    Status = status,
                    CreatedAt = student.CreatedAt
                };
            }).OrderBy(l => l.StudentName).ToList();

            return Ok(ledger);
        }

        [HttpGet("transactions")]
        [Authorize(Roles = "schooladmin,accountmanager,student")]
        public async Task<IActionResult> GetTransactions()
        {
            var schoolId = GetSchoolId();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (role == "student")
            {
                var userId = GetUserId();
                var invoices = await _unitOfWork.Invoices.FindAsync(i => i.StudentId == userId);
                var invoiceIds = invoices.Select(inv => inv.Id).ToList();
                var transactions = await _unitOfWork.Transactions.FindAsync(t => invoiceIds.Contains(t.InvoiceId));
                var feeStructures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);

                var list = transactions.Select(t => {
                    var invoice = invoices.FirstOrDefault(inv => inv.Id == t.InvoiceId);
                    var feeStruct = invoice != null ? feeStructures.FirstOrDefault(fs => fs.Id == invoice.FeeStructureId) : null;
                    return new {
                        t.Id,
                        t.ReferenceNumber,
                        t.Amount,
                        t.PaymentMethod,
                        Date = t.TransactionDate.ToString("MMM dd, yyyy HH:mm"),
                        t.Status,
                        FeeName = feeStruct?.Name ?? "School Fee"
                    };
                }).OrderByDescending(t => t.Date).ToList();

                return Ok(list);
            }
            else
            {
                // Admin view
                var studentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
                var studentIds = studentUsers.Select(u => u.Id).ToList();
                var invoices = await _unitOfWork.Invoices.FindAsync(i => studentIds.Contains(i.StudentId));
                var invoiceIds = invoices.Select(inv => inv.Id).ToList();
                var transactions = await _unitOfWork.Transactions.FindAsync(t => invoiceIds.Contains(t.InvoiceId));
                var feeStructures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);

                var list = transactions.Select(t => {
                    var invoice = invoices.FirstOrDefault(inv => inv.Id == t.InvoiceId);
                    var student = invoice != null ? studentUsers.FirstOrDefault(u => u.Id == invoice.StudentId) : null;
                    var feeStruct = invoice != null ? feeStructures.FirstOrDefault(fs => fs.Id == invoice.FeeStructureId) : null;
                    return new {
                        t.Id,
                        t.ReferenceNumber,
                        t.Amount,
                        t.PaymentMethod,
                        Date = t.TransactionDate.ToString("MMM dd, yyyy HH:mm"),
                        t.Status,
                        StudentName = student != null ? $"{student.FirstName} {student.LastName}" : "Unknown Student",
                        FeeName = feeStruct?.Name ?? "School Fee"
                    };
                }).OrderByDescending(t => t.Date).ToList();

                return Ok(list);
            }
        }

        private bool VerifySignature(string orderId, string paymentId, string signature, string keySecret)
        {
            var payload = $"{orderId}|{paymentId}";
            var keyBytes = Encoding.UTF8.GetBytes(keySecret);
            using (var hmac = new System.Security.Cryptography.HMACSHA256(keyBytes))
            {
                var hashBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
                var generatedSignature = BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
                return string.Equals(generatedSignature, signature, StringComparison.OrdinalIgnoreCase);
            }
        }

        [HttpPost("create-subscription-order")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateSubscriptionOrder([FromQuery] bool isRenewal = false)
        {
            var schoolId = GetSchoolId();
            var subscriptions = await _unitOfWork.Subscriptions.FindAsync(s => s.SchoolId == schoolId);
            var subscription = subscriptions.FirstOrDefault();

            if (subscription == null)
            {
                return NotFound(new { error = "Subscription record not found for this school" });
            }

            if (subscription.Status == "success" && !isRenewal)
            {
                return BadRequest(new { error = "Subscription is already active and paid" });
            }

            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            
            // Get active payment provider from platform settings, default to razorpay
            string provider = settings?.PaymentProvider?.ToLower() ?? "razorpay";

            if (provider == "stripe")
            {
                bool hasKeys = settings != null && !string.IsNullOrWhiteSpace(settings.StripePublishableKey);
                return Ok(new {
                    paymentProvider = "stripe",
                    publishableKey = settings?.StripePublishableKey ?? "pk_mock_stripe_key",
                    amount = (int)Math.Round(subscription.Amount * 100), // in cents
                    currency = "INR",
                    orderId = $"stripe_sub_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    subscriptionId = subscription.Id,
                    isMock = !hasKeys
                });
            }
            else if (provider == "paypal")
            {
                bool hasKeys = settings != null && !string.IsNullOrWhiteSpace(settings.PayPalClientId);
                return Ok(new {
                    paymentProvider = "paypal",
                    clientId = settings?.PayPalClientId ?? "paypal_mock_client_id",
                    amount = subscription.Amount,
                    currency = "INR",
                    orderId = $"paypal_sub_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    subscriptionId = subscription.Id,
                    isMock = !hasKeys
                });
            }
            else if (provider == "phonepe")
            {
                bool hasKeys = settings != null && !string.IsNullOrWhiteSpace(settings.PhonePeMerchantId);
                return Ok(new {
                    paymentProvider = "phonepe",
                    merchantId = settings?.PhonePeMerchantId ?? "phonepe_mock_merchant_id",
                    amount = subscription.Amount,
                    currency = "INR",
                    orderId = $"phonepe_sub_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    subscriptionId = subscription.Id,
                    isMock = !hasKeys
                });
            }
            else if (provider == "cashless")
            {
                return Ok(new {
                    paymentProvider = "cashless",
                    instructions = settings?.CashlessInstructions ?? "Please contact the platform administrator for cashless/bank transfer details.",
                    amount = subscription.Amount,
                    currency = "INR",
                    orderId = $"cashless_sub_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    subscriptionId = subscription.Id,
                    isMock = false
                });
            }
            else
            {
                // Razorpay
                // Fall back to config values if DB keys are not set for backward compatibility
                string keyId = settings?.RazorpayKeyId;
                string keySecret = settings?.RazorpayKeySecret;

                if (string.IsNullOrWhiteSpace(keyId) || string.IsNullOrWhiteSpace(keySecret))
                {
                    keyId = _configuration["Razorpay:KeyId"] ?? "";
                    keySecret = _configuration["Razorpay:KeySecret"] ?? "";
                }

                if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret) || keySecret == "yourKeySecretHere")
                {
                    return Ok(new {
                        paymentProvider = "razorpay",
                        orderId = $"sub_mock_{Guid.NewGuid().ToString().Substring(0, 8)}",
                        amount = (int)Math.Round(subscription.Amount * 100),
                        currency = "INR",
                        keyId = "rzp_test_mockKeyId",
                        subscriptionId = subscription.Id,
                        isMock = true
                    });
                }

                try
                {
                    var authString = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
                    using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.razorpay.com/v1/orders");
                    httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authString);

                    var orderRequest = new
                    {
                        amount = (int)Math.Round(subscription.Amount * 100), // in paise
                        currency = "INR",
                        receipt = subscription.Id.ToString()
                    };

                    httpRequest.Content = new StringContent(JsonSerializer.Serialize(orderRequest), Encoding.UTF8, "application/json");

                    var client = _httpClientFactory.CreateClient();
                    var response = await client.SendAsync(httpRequest);

                    if (!response.IsSuccessStatusCode)
                    {
                        var errContent = await response.Content.ReadAsStringAsync();
                        return BadRequest(new { error = $"Razorpay subscription order creation failed: {errContent}" });
                    }

                    var responseContent = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseContent);
                    var orderId = doc.RootElement.GetProperty("id").GetString();

                    return Ok(new {
                        paymentProvider = "razorpay",
                        orderId = orderId,
                        amount = (int)Math.Round(subscription.Amount * 100),
                        currency = "INR",
                        keyId = keyId,
                        subscriptionId = subscription.Id,
                        isMock = false
                    });
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { error = $"Error calling Razorpay: {ex.Message}" });
                }
            }
        }

        [HttpPost("verify-subscription-payment")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> VerifySubscriptionPayment([FromBody] VerifySubscriptionPaymentRequest request, [FromQuery] bool isRenewal = false)
        {
            var schoolId = GetSchoolId();
            var subscriptions = await _unitOfWork.Subscriptions.FindAsync(s => s.SchoolId == schoolId);
            var subscription = subscriptions.FirstOrDefault();

            if (subscription == null)
            {
                return NotFound(new { error = "Subscription not found" });
            }

            if (subscription.Status == "success" && !isRenewal)
            {
                return BadRequest(new { error = "Subscription is already active" });
            }

            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            string provider = request.PaymentProvider?.ToLower() ?? settings?.PaymentProvider?.ToLower() ?? "razorpay";

            bool isVerified = false;
            
            if (provider == "stripe" || provider == "paypal" || provider == "phonepe" || provider == "cashless")
            {
                isVerified = true;
            }
            else
            {
                // Razorpay
                string keySecret = settings?.RazorpayKeySecret;
                if (string.IsNullOrWhiteSpace(keySecret))
                {
                    keySecret = _configuration["Razorpay:KeySecret"] ?? "";
                }

                var razorOrderId = request.RazorpayOrderId ?? "";
                var razorPaymentId = request.RazorpayPaymentId ?? "";
                var razorSignature = request.RazorpaySignature ?? "";

                if (razorOrderId.StartsWith("sub_mock_") || string.IsNullOrEmpty(keySecret) || keySecret == "yourKeySecretHere")
                {
                    isVerified = true;
                }
                else
                {
                    isVerified = VerifySignature(razorOrderId, razorPaymentId, razorSignature, keySecret);
                }
            }

            if (!isVerified)
            {
                return BadRequest(new { error = "Payment verification failed. Invalid transaction." });
            }

            // Update subscription
            subscription.Status = "success";
            if (isRenewal && subscription.EndDate > DateTime.UtcNow)
            {
                subscription.EndDate = subscription.EndDate.AddYears(1);
            }
            else
            {
                subscription.StartDate = DateTime.UtcNow;
                subscription.EndDate = DateTime.UtcNow.AddYears(1);
            }
            _unitOfWork.Subscriptions.Update(subscription);

            await _unitOfWork.CompleteAsync();
 
            return Ok(new { success = true });
        }

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlatformPlans()
        {
            var plans = (await _unitOfWork.PlatformPlans.GetAllAsync())
                .OrderBy(p => p.TierLabel)
                .ToList();

            var schoolId = Guid.Empty;
            try { schoolId = GetSchoolId(); } catch {}

            var customConfigs = schoolId != Guid.Empty
                ? (await _unitOfWork.SchoolPlanConfigurations.FindAsync(c => c.SchoolId == schoolId)).ToList()
                : new System.Collections.Generic.List<SchoolPlanConfiguration>();

            var result = plans.Select(p => {
                var custom = customConfigs.FirstOrDefault(c => 
                    p.PlanName.Contains(c.PlanType, StringComparison.OrdinalIgnoreCase) || 
                    c.PlanType.Contains(p.PlanName, StringComparison.OrdinalIgnoreCase));

                return new {
                    p.Id,
                    p.TierLabel,
                    PlanName = p.PlanName,
                    ImplementationCost = custom != null ? custom.ImplementationCost : p.ImplementationCost,
                    StudentCapacity = custom != null ? custom.StudentCapacity : p.StudentCapacity,
                    StorageLimit = custom != null ? custom.StorageLimit : p.StorageLimit,
                    MonthlyPrice = custom != null ? custom.MonthlyPrice : p.MonthlyPrice,
                    p.IsTopRevenue
                };
            }).ToList();

            return Ok(result);
        }

        [HttpPost("upgrade-request")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> RequestUpgrade([FromBody] UpgradeRequestInput model)
        {
            if (string.IsNullOrWhiteSpace(model.RequestedPlanType))
            {
                return BadRequest(new { error = "RequestedPlanType is required." });
            }

            var schoolId = GetSchoolId();

            var existing = (await _unitOfWork.UpgradeRequests.FindAsync(ur =>
                ur.SchoolId == schoolId &&
                ur.RequestedPlanType == model.RequestedPlanType &&
                ur.Status == "Pending")).FirstOrDefault();

            if (existing != null)
            {
                return BadRequest(new { error = "An upgrade request for this plan is already pending approval." });
            }

            var request = new UpgradeRequest
            {
                SchoolId = schoolId,
                RequestedPlanType = model.RequestedPlanType,
                Status = "Pending",
                Requirements = model.Requirements ?? string.Empty,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.UpgradeRequests.AddAsync(request);

            var schoolName = "School";
            var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);
            if (school != null)
            {
                schoolName = school.Name;
            }

            var systemEvent = new SystemEvent
            {
                Icon = "🔔",
                Title = model.RequestedPlanType == "Custom" ? "Custom Requirements Request" : "Plan Upgrade Request",
                Description = model.RequestedPlanType == "Custom"
                    ? $"{schoolName} submitted new custom requirements."
                    : $"{schoolName} requested an upgrade to {model.RequestedPlanType} Plan.",
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.SystemEvents.AddAsync(systemEvent);

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }
    }

    public class UpgradeRequestInput
    {
        public string RequestedPlanType { get; set; } = string.Empty;
        public string Requirements { get; set; } = string.Empty;
    }

    public class PayInvoiceRequest
    {
        public Guid InvoiceId { get; set; }
        public decimal? Amount { get; set; }
        public string PaymentMethod { get; set; } = "Visa";
    }

    public class CreateOrderRequest
    {
        public Guid InvoiceId { get; set; }
        public decimal? Amount { get; set; }
    }

    public class VerifyPaymentRequest
    {
        public Guid InvoiceId { get; set; }
        public decimal? Amount { get; set; }
        public string? RazorpayOrderId { get; set; }
        public string? RazorpayPaymentId { get; set; }
        public string? RazorpaySignature { get; set; }
        public string? PaymentProvider { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class VerifySubscriptionPaymentRequest
    {
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string RazorpayPaymentId { get; set; } = string.Empty;
        public string RazorpaySignature { get; set; } = string.Empty;
        public string? PaymentProvider { get; set; }
        public string? TransactionReference { get; set; }
    }

    public class CreateSupplementaryFeeRequest
    {
        public string Name { get; set; } = "Supplementary / Compartment Exam Fee";
        public decimal AmountPerSubject { get; set; } = 500.0m;
        public string Grade { get; set; } = "All Grades";
        public int GracePeriodDays { get; set; } = 3;
        public decimal LateFeePerDay { get; set; } = 50.0m;
        public bool IsCustomPaymentAllowed { get; set; } = true;
    }

    public class AssignSupplementaryFeeRequest
    {
        public Guid? StudentId { get; set; }
        public Guid? FeeStructureId { get; set; }
        public decimal? CustomAmount { get; set; }
        public int DueDays { get; set; } = 15;
    }

    public class LateFeeRuleRequest
    {
        public int GracePeriodDays { get; set; } = 5;
        public decimal LateFeePerDay { get; set; } = 50.0m;
        public Guid? FeeStructureId { get; set; }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT REPORTS CONTROLLER — 5 filtered reporting endpoints for school admin
// ─────────────────────────────────────────────────────────────────────────────
namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/billing/reports")]
    [Authorize(Roles = "schooladmin,accountmanager")]
    public class PaymentReportsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public PaymentReportsController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        private Guid GetSchoolId()
        {
            var schoolIdStr = User.FindFirst("schoolId")?.Value;
            if (string.IsNullOrEmpty(schoolIdStr)) throw new UnauthorizedAccessException("School ID missing in token");
            return Guid.Parse(schoolIdStr);
        }

        private static bool IsSuccess(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return false;
            return status.Equals("success", StringComparison.OrdinalIgnoreCase) ||
                   status.Equals("paid", StringComparison.OrdinalIgnoreCase);
        }

        // =====================================================================
        // REPORT 1: Transaction Log — every transaction in date range
        // GET /api/billing/reports/transactions
        // =====================================================================
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactionReport(
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo,
            [FromQuery] Guid? classId,
            [FromQuery] Guid? studentId,
            [FromQuery] string? paymentMethod,
            [FromQuery] string? upiProvider)
        {
            var schoolId = GetSchoolId();

            // Parse date range
            DateTime? from = dateFrom != null ? DateTime.TryParse(dateFrom, out var df) ? df.Date : (DateTime?)null : null;
            DateTime? to   = dateTo   != null ? DateTime.TryParse(dateTo,   out var dt) ? dt.Date.AddDays(1).AddTicks(-1) : (DateTime?)null : null;

            // Load all school students
            var studentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");

            // Filter by classId if provided
            if (classId.HasValue)
            {
                var enrollments = await _unitOfWork.Enrollments.FindAsync(e => e.ClassId == classId.Value && e.Status == "ACTIVE");
                var classStudentIds = enrollments.Select(e => e.StudentId).ToHashSet();
                studentUsers = studentUsers.Where(u => classStudentIds.Contains(u.Id)).ToList();
            }

            // Filter by specific studentId
            if (studentId.HasValue)
                studentUsers = studentUsers.Where(u => u.Id == studentId.Value).ToList();

            var studentIds = studentUsers.Select(u => u.Id).ToList();
            var invoices   = await _unitOfWork.Invoices.FindAsync(i => studentIds.Contains(i.StudentId));
            var invoiceIds = invoices.Select(i => i.Id).ToList();
            var transactions = await _unitOfWork.Transactions.FindAsync(t => invoiceIds.Contains(t.InvoiceId));
            var feeStructures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);

            // Load class info for each student
            var allEnrollments = await _unitOfWork.Enrollments.FindAsync(e => studentIds.Contains(e.StudentId) && e.Status == "ACTIVE");
            var allClasses     = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);

            // Apply filters
            var filtered = transactions.AsEnumerable();

            if (from.HasValue) filtered = filtered.Where(t => t.TransactionDate >= from.Value);
            if (to.HasValue)   filtered = filtered.Where(t => t.TransactionDate <= to.Value);

            if (!string.IsNullOrWhiteSpace(paymentMethod) && paymentMethod != "All")
            {
                if (paymentMethod.Equals("Cash", StringComparison.OrdinalIgnoreCase))
                    filtered = filtered.Where(t => (t.PaymentMethod ?? "").Equals("Cash", StringComparison.OrdinalIgnoreCase));
                else if (paymentMethod.Equals("Online", StringComparison.OrdinalIgnoreCase))
                    filtered = filtered.Where(t => !(t.PaymentMethod ?? "").Equals("Cash", StringComparison.OrdinalIgnoreCase));
                else if (paymentMethod.Equals("Bank", StringComparison.OrdinalIgnoreCase))
                    filtered = filtered.Where(t => (t.PaymentMethod ?? "").Equals("Bank", StringComparison.OrdinalIgnoreCase) ||
                                                   (t.PaymentMethod ?? "").Equals("NEFT", StringComparison.OrdinalIgnoreCase) ||
                                                   (t.PaymentMethod ?? "").Equals("RTGS", StringComparison.OrdinalIgnoreCase));
                else if (paymentMethod.Equals("UPI", StringComparison.OrdinalIgnoreCase))
                    filtered = filtered.Where(t => (t.PaymentMethod ?? "").Contains("upi", StringComparison.OrdinalIgnoreCase) ||
                                                   (t.PaymentMethod ?? "").Contains("paytm", StringComparison.OrdinalIgnoreCase) ||
                                                   (t.PaymentMethod ?? "").Contains("phonepe", StringComparison.OrdinalIgnoreCase) ||
                                                   (t.PaymentMethod ?? "").Contains("google", StringComparison.OrdinalIgnoreCase) ||
                                                   (t.PaymentMethod ?? "").Contains("bhim", StringComparison.OrdinalIgnoreCase) ||
                                                   (t.PaymentMethod ?? "").Contains("navi", StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(upiProvider) && upiProvider != "All")
                filtered = filtered.Where(t => (t.PaymentMethod ?? "").Contains(upiProvider, StringComparison.OrdinalIgnoreCase));

            var result = filtered.Select(t =>
            {
                var invoice   = invoices.FirstOrDefault(i => i.Id == t.InvoiceId);
                var student   = invoice != null ? studentUsers.FirstOrDefault(u => u.Id == invoice.StudentId) : null;
                var feeStruct = invoice != null ? feeStructures.FirstOrDefault(fs => fs.Id == invoice.FeeStructureId) : null;
                var enrollment = student != null ? allEnrollments.FirstOrDefault(e => e.StudentId == student.Id) : null;
                var cls       = enrollment != null ? allClasses.FirstOrDefault(c => c.Id == enrollment.ClassId) : null;
                return new
                {
                    referenceNumber = t.ReferenceNumber,
                    studentName     = student != null ? $"{student.FirstName} {student.LastName}" : "Unknown",
                    className       = cls != null ? $"Class {cls.Grade}-{cls.Section}" : "N/A",
                    feeName         = feeStruct?.Name ?? "School Fee",
                    date            = t.TransactionDate.ToString("dd MMM yyyy, hh:mm tt"),
                    paymentMethod   = t.PaymentMethod ?? "N/A",
                    amount          = t.Amount,
                    status          = (t.Status ?? "SUCCESS").ToUpper()
                };
            }).OrderByDescending(t => t.date).ToList();

            return Ok(new
            {
                transactions = result,
                grandTotal   = result.Where(t => IsSuccess(t.status)).Sum(t => t.amount),
                totalCount   = result.Count
            });
        }

        // =====================================================================
        // REPORT 2: Pending Payments by Class (or specific student)
        // GET /api/billing/reports/pending-by-class
        // =====================================================================
        [HttpGet("pending-by-class")]
        public async Task<IActionResult> GetPendingByClass(
            [FromQuery] Guid? classId,
            [FromQuery] Guid? studentId,
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo)
        {
            var schoolId = GetSchoolId();

            var allStudentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
            var allStudentIds   = allStudentUsers.Select(u => u.Id).ToList();
            var allEnrollments  = await _unitOfWork.Enrollments.FindAsync(e => allStudentIds.Contains(e.StudentId) && e.Status == "ACTIVE");
            var allClasses      = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var allStudents     = await _unitOfWork.Students.FindAsync(s => allStudentIds.Contains(s.UserId));

            IEnumerable<EduVault.Core.Entities.User> studentUsers = allStudentUsers;

            // Filter: specific student takes priority over class
            if (studentId.HasValue)
            {
                studentUsers = allStudentUsers.Where(u => u.Id == studentId.Value);
            }
            else if (classId.HasValue)
            {
                var classEnrollments = allEnrollments.Where(e => e.ClassId == classId.Value);
                var classStudentIds  = classEnrollments.Select(e => e.StudentId).ToHashSet();
                studentUsers = allStudentUsers.Where(u => classStudentIds.Contains(u.Id));
            }

            var studentIdList = studentUsers.Select(u => u.Id).ToList();
            var invoices      = await _unitOfWork.Invoices.FindAsync(i => studentIdList.Contains(i.StudentId));
            var invoiceIds    = invoices.Select(i => i.Id).ToList();
            // Load ALL transactions to calculate actual paid amounts (don't rely on invoice.PaidAmount)
            var allTransactions = await _unitOfWork.Transactions.FindAsync(t => invoiceIds.Contains(t.InvoiceId));

            DateTime? from = dateFrom != null ? DateTime.TryParse(dateFrom, out var df) ? df.Date : (DateTime?)null : null;
            DateTime? to   = dateTo   != null ? DateTime.TryParse(dateTo,   out var dt) ? dt.Date.AddDays(1).AddTicks(-1) : (DateTime?)null : null;

            var pendingStudents = studentUsers.Select(student =>
            {
                var studentInvoices = invoices.Where(i => i.StudentId == student.Id).ToList();
                // Match invoices issued or due in the date range
                if (from.HasValue) studentInvoices = studentInvoices.Where(i => i.IssueDate >= from.Value || i.DueDate >= from.Value).ToList();
                if (to.HasValue)   studentInvoices = studentInvoices.Where(i => i.IssueDate <= to.Value).ToList();

                if (!studentInvoices.Any()) return null;

                // Calculate actual paid per invoice from successful transactions
                var invoicesWithBalance = studentInvoices.Select(inv => {
                    var paidViaTransactions = allTransactions
                        .Where(t => t.InvoiceId == inv.Id && IsSuccess(t.Status))
                        .Sum(t => t.Amount);
                    var remaining = Math.Max(0, inv.Amount - paidViaTransactions);
                    return new { inv, paidViaTransactions, remaining };
                }).ToList();

                // Pending: invoices where remaining > 0
                var pendingInvoices = invoicesWithBalance.Where(x => x.remaining > 0).ToList();
                if (!pendingInvoices.Any()) return null;

                var enrollment  = allEnrollments.FirstOrDefault(e => e.StudentId == student.Id);
                var cls         = enrollment != null ? allClasses.FirstOrDefault(c => c.Id == enrollment.ClassId) : null;
                var profile     = allStudents.FirstOrDefault(s => s.UserId == student.Id);

                var totalBilled  = studentInvoices.Sum(i => i.Amount);
                var totalPaid    = invoicesWithBalance.Sum(x => Math.Min(x.inv.Amount, x.paidViaTransactions));
                var pendingAmt   = pendingInvoices.Sum(x => x.remaining);
                var nearestDue   = pendingInvoices.OrderBy(x => x.inv.DueDate).FirstOrDefault()?.inv.DueDate;
                var daysOverdue  = nearestDue.HasValue && nearestDue.Value < DateTime.UtcNow
                    ? (int)(DateTime.UtcNow - nearestDue.Value).TotalDays : 0;

                return (object)new
                {
                    studentName    = $"{student.FirstName} {student.LastName}",
                    rollNo         = profile?.StudentId ?? "N/A",
                    className      = cls != null ? $"Class {cls.Grade}-{cls.Section}" : "N/A",
                    totalBilled    = totalBilled,
                    totalPaid      = totalPaid,
                    pendingAmount  = pendingAmt,
                    nearestDueDate = nearestDue?.ToString("dd MMM yyyy") ?? "N/A",
                    daysOverdue    = daysOverdue,
                    invoiceCount   = pendingInvoices.Count
                };
            }).Where(s => s != null).ToList();

            return Ok(new
            {
                students      = pendingStudents,
                totalStudents = pendingStudents.Count,
                totalPending  = pendingStudents.Cast<dynamic>().Sum(s => (decimal)s.pendingAmount)
            });
        }

        // =====================================================================
        // REPORT 3: Completed Payments by Class (or specific student)
        // GET /api/billing/reports/completed-by-class
        // =====================================================================
        [HttpGet("completed-by-class")]
        public async Task<IActionResult> GetCompletedByClass(
            [FromQuery] Guid? classId,
            [FromQuery] Guid? studentId,
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo)
        {
            var schoolId = GetSchoolId();

            var allStudentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
            var allStudentIds   = allStudentUsers.Select(u => u.Id).ToList();
            var allEnrollments  = await _unitOfWork.Enrollments.FindAsync(e => allStudentIds.Contains(e.StudentId) && e.Status == "ACTIVE");
            var allClasses      = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var allStudentProfiles = await _unitOfWork.Students.FindAsync(s => allStudentIds.Contains(s.UserId));

            IEnumerable<EduVault.Core.Entities.User> studentUsers = allStudentUsers;

            // Filter: specific student takes priority over class
            if (studentId.HasValue)
            {
                studentUsers = allStudentUsers.Where(u => u.Id == studentId.Value);
            }
            else if (classId.HasValue)
            {
                var classEnrollments = allEnrollments.Where(e => e.ClassId == classId.Value);
                var classStudentIds  = classEnrollments.Select(e => e.StudentId).ToHashSet();
                studentUsers = allStudentUsers.Where(u => classStudentIds.Contains(u.Id));
            }

            var studentIdList  = studentUsers.Select(u => u.Id).ToList();
            var invoices       = await _unitOfWork.Invoices.FindAsync(i => studentIdList.Contains(i.StudentId));
            var invoiceIds     = invoices.Select(i => i.Id).ToList();
            var feeStructures  = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);
            // Load ALL transactions — don't rely on invoice.PaidAmount
            var allTransactions = await _unitOfWork.Transactions.FindAsync(t => invoiceIds.Contains(t.InvoiceId));

            DateTime? from = dateFrom != null ? DateTime.TryParse(dateFrom, out var df) ? df.Date : (DateTime?)null : null;
            DateTime? to   = dateTo   != null ? DateTime.TryParse(dateTo,   out var dt) ? dt.Date.AddDays(1).AddTicks(-1) : (DateTime?)null : null;

            var completedStudents = studentUsers.Select(student =>
            {
                var studentInvoices = invoices.Where(i => i.StudentId == student.Id).ToList();
                if (!studentInvoices.Any()) return null;

                // Per invoice: calculate actual paid from successful transactions
                var invoicesWithBalance = studentInvoices.Select(inv => {
                    var txns = allTransactions.Where(t => t.InvoiceId == inv.Id && IsSuccess(t.Status));
                    var paidViaTransactions = txns.Sum(t => t.Amount);
                    var remaining = Math.Max(0, inv.Amount - paidViaTransactions);
                    var lastTxnDate = txns.Any() ? txns.Max(t => t.TransactionDate) : (DateTime?)null;
                    return new { inv, paidViaTransactions, remaining, lastTxnDate };
                }).ToList();

                // Completed: invoices fully covered by transactions
                var completedInvoices = invoicesWithBalance.Where(x => x.remaining == 0 && x.paidViaTransactions > 0).ToList();

                // Date filter on last transaction date
                if (from.HasValue) completedInvoices = completedInvoices.Where(x => (x.lastTxnDate.HasValue && x.lastTxnDate.Value >= from.Value) || x.inv.IssueDate >= from.Value).ToList();
                if (to.HasValue)   completedInvoices = completedInvoices.Where(x => (x.lastTxnDate.HasValue && x.lastTxnDate.Value <= to.Value) || x.inv.IssueDate <= to.Value).ToList();

                if (!completedInvoices.Any()) return null;

                var enrollment = allEnrollments.FirstOrDefault(e => e.StudentId == student.Id);
                var cls        = enrollment != null ? allClasses.FirstOrDefault(c => c.Id == enrollment.ClassId) : null;
                var profile    = allStudentProfiles.FirstOrDefault(s => s.UserId == student.Id);

                var feeTypes   = completedInvoices
                    .Select(x => feeStructures.FirstOrDefault(fs => fs.Id == x.inv.FeeStructureId)?.Name ?? "School Fee")
                    .Distinct().ToList();

                var totalCollected = completedInvoices.Sum(x => Math.Min(x.inv.Amount, x.paidViaTransactions));
                var lastPaid       = completedInvoices.OrderByDescending(x => x.lastTxnDate).FirstOrDefault()?.lastTxnDate;

                return (object)new
                {
                    studentName  = $"{student.FirstName} {student.LastName}",
                    rollNo       = profile?.StudentId ?? "N/A",
                    className    = cls != null ? $"Class {cls.Grade}-{cls.Section}" : "N/A",
                    totalPaid    = totalCollected,
                    invoiceCount = completedInvoices.Count,
                    feeTypes     = string.Join(", ", feeTypes),
                    lastPaidDate = lastPaid?.ToString("dd MMM yyyy") ?? "N/A"
                };
            }).Where(s => s != null).ToList();

            return Ok(new
            {
                students       = completedStudents,
                totalStudents  = completedStudents.Count,
                totalCollected = completedStudents.Cast<dynamic>().Sum(s => (decimal)s.totalPaid)
            });
        }

        // =====================================================================
        // REPORT 4: Student Detail Ledger
        // GET /api/billing/reports/student-detail
        // =====================================================================
        [HttpGet("student-detail")]
        public async Task<IActionResult> GetStudentDetail(
            [FromQuery] Guid? studentId,
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo)
        {
            var schoolId = GetSchoolId();

            if (!studentId.HasValue)
                return BadRequest(new { error = "studentId is required for this report." });

            var student = await _unitOfWork.Users.GetByIdAsync(studentId.Value);
            if (student == null || student.SchoolId != schoolId)
                return NotFound(new { error = "Student not found." });

            var profile      = await _unitOfWork.Students.GetByIdAsync(studentId.Value);
            var allEnrollments = await _unitOfWork.Enrollments.FindAsync(e => e.StudentId == studentId.Value && e.Status == "ACTIVE");
            var enrollment   = allEnrollments.FirstOrDefault();
            var cls          = enrollment != null ? await _unitOfWork.Classes.GetByIdAsync(enrollment.ClassId) : null;
            var feeStructures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);

            DateTime? from = dateFrom != null ? DateTime.TryParse(dateFrom, out var df) ? df.Date : (DateTime?)null : null;
            DateTime? to   = dateTo   != null ? DateTime.TryParse(dateTo,   out var dt) ? dt.Date.AddDays(1).AddTicks(-1) : (DateTime?)null : null;

            var allInvoices  = await _unitOfWork.Invoices.FindAsync(i => i.StudentId == studentId.Value);
            var invoiceIds   = allInvoices.Select(i => i.Id).ToList();
            var allTxns      = await _unitOfWork.Transactions.FindAsync(t => invoiceIds.Contains(t.InvoiceId));

            // Filter transactions by date
            var filteredTxns = allTxns.AsEnumerable();
            if (from.HasValue) filteredTxns = filteredTxns.Where(t => t.TransactionDate >= from.Value);
            if (to.HasValue)   filteredTxns = filteredTxns.Where(t => t.TransactionDate <= to.Value);

            // Calculate actual paid per invoice from successful transactions (don't rely on invoice.PaidAmount)
            var invoiceList = allInvoices.Select(i =>
            {
                var fs = feeStructures.FirstOrDefault(f => f.Id == i.FeeStructureId);
                var paidViaTransactions = allTxns
                    .Where(t => t.InvoiceId == i.Id && IsSuccess(t.Status))
                    .Sum(t => t.Amount);
                var dueAmt = Math.Max(0, i.Amount - paidViaTransactions);
                var invoicePaid = Math.Min(i.Amount, paidViaTransactions);
                return new
                {
                    feeName    = fs?.Name ?? "School Fee",
                    amount     = i.Amount,
                    paidAmount = invoicePaid,
                    dueAmount  = dueAmt,
                    dueDate    = i.DueDate.ToString("dd MMM yyyy"),
                    issueDate  = i.IssueDate.ToString("dd MMM yyyy"),
                    status     = dueAmt == 0 && paidViaTransactions > 0 ? "PAID"
                               : paidViaTransactions > 0 ? "PARTIAL"
                               : "PENDING"
                };
            }).OrderBy(i => i.issueDate).ToList();

            var txnList = filteredTxns.Select(t =>
            {
                var inv = allInvoices.FirstOrDefault(i => i.Id == t.InvoiceId);
                var fs  = inv != null ? feeStructures.FirstOrDefault(f => f.Id == inv.FeeStructureId) : null;
                return new
                {
                    date          = t.TransactionDate.ToString("dd MMM yyyy, hh:mm tt"),
                    referenceNo   = t.ReferenceNumber,
                    amount        = t.Amount,
                    paymentMethod = t.PaymentMethod ?? "N/A",
                    feeName       = fs?.Name ?? "School Fee",
                    status        = (t.Status ?? "SUCCESS").ToUpper()
                };
            }).OrderByDescending(t => t.date).ToList();

            // Summary: calculated from transactions, not invoice.PaidAmount
            var successTxns  = allTxns.Where(t => IsSuccess(t.Status));
            var totalBilled  = allInvoices.Sum(i => i.Amount);
            var totalPaidAmt = successTxns.Sum(t => t.Amount);
            var advancePaid  = Math.Max(0, totalPaidAmt - totalBilled);

            return Ok(new
            {
                studentInfo = new
                {
                    name          = $"{student.FirstName} {student.LastName}",
                    rollNo        = profile?.StudentId ?? "N/A",
                    className     = cls != null ? $"Class {cls.Grade}-{cls.Section}" : "N/A",
                    email         = student.Email,
                    guardianPhone = profile?.GuardianPhone ?? "N/A"
                },
                invoices     = invoiceList,
                transactions = txnList,
                summary = new
                {
                    totalBilled = totalBilled,
                    totalPaid   = totalPaidAmt,
                    advancePaid = advancePaid,
                    totalDue    = Math.Max(0, totalBilled - totalPaidAmt),
                    txnCount    = txnList.Count
                }
            });
        }

        // =====================================================================
        // REPORT 5: Collection Summary (class-wise, fee-wise, month-wise)
        // GET /api/billing/reports/collection-summary
        // =====================================================================
        [HttpGet("collection-summary")]
        public async Task<IActionResult> GetCollectionSummary(
            [FromQuery] string? dateFrom,
            [FromQuery] string? dateTo,
            [FromQuery] Guid? classId)
        {
            var schoolId = GetSchoolId();

            DateTime? from = dateFrom != null ? DateTime.TryParse(dateFrom, out var df) ? df.Date : (DateTime?)null : null;
            DateTime? to   = dateTo   != null ? DateTime.TryParse(dateTo,   out var dt) ? dt.Date.AddDays(1).AddTicks(-1) : (DateTime?)null : null;

            var studentUsers  = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");
            var allStudentIds = studentUsers.Select(u => u.Id).ToList();
            var allEnrollments = await _unitOfWork.Enrollments.FindAsync(e => allStudentIds.Contains(e.StudentId) && e.Status == "ACTIVE");
            var allClasses    = await _unitOfWork.Classes.FindAsync(c => c.SchoolId == schoolId);
            var feeStructures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);

            IEnumerable<Guid> targetStudentIds = allStudentIds;
            if (classId.HasValue)
            {
                var classEnrollments = allEnrollments.Where(e => e.ClassId == classId.Value);
                targetStudentIds = classEnrollments.Select(e => e.StudentId).Distinct();
            }

            var invoices               = await _unitOfWork.Invoices.FindAsync(i => targetStudentIds.Contains(i.StudentId));
            var invoiceIds             = invoices.Select(i => i.Id).ToList();
            var allInvoiceTransactions = await _unitOfWork.Transactions.FindAsync(t => invoiceIds.Contains(t.InvoiceId));

            // Date-filtered transactions for collection amounts
            var dateFilteredTxns = allInvoiceTransactions.AsEnumerable();
            if (from.HasValue) dateFilteredTxns = dateFilteredTxns.Where(t => t.TransactionDate >= from.Value);
            if (to.HasValue)   dateFilteredTxns = dateFilteredTxns.Where(t => t.TransactionDate <= to.Value);

            // Class-wise breakdown
            var classwise = allClasses.Select(cls =>
            {
                var classEnrollments  = allEnrollments.Where(e => e.ClassId == cls.Id);
                var classStudentIds   = classEnrollments.Select(e => e.StudentId).ToHashSet();
                var classInvoices     = invoices.Where(i => classStudentIds.Contains(i.StudentId)).ToList();
                var classInvoiceIds   = classInvoices.Select(i => i.Id).ToHashSet();
                var classTxns         = dateFilteredTxns.Where(t => classInvoiceIds.Contains(t.InvoiceId) && IsSuccess(t.Status));

                // Calculate actual pending: Invoice amount minus successful payments on that invoice
                var totalPending = classInvoices.Sum(inv =>
                {
                    var paid = allInvoiceTransactions.Where(t => t.InvoiceId == inv.Id && IsSuccess(t.Status)).Sum(t => t.Amount);
                    return Math.Max(0, inv.Amount - paid);
                });

                return new
                {
                    className      = $"Class {cls.Grade}-{cls.Section}",
                    grade          = cls.Grade,
                    section        = cls.Section,
                    totalCollected = classTxns.Sum(t => t.Amount),
                    totalPending   = totalPending,
                    studentCount   = classStudentIds.Count
                };
            }).Where(c => c.totalCollected > 0 || c.totalPending > 0 || c.studentCount > 0)
              .OrderBy(c => {
                  var gStr = (c.grade ?? "").Trim().ToLower();
                  if (gStr.Contains("play")) return -4;
                  if (gStr.Contains("nur")) return -3;
                  if (gStr.Contains("lkg")) return -2;
                  if (gStr.Contains("ukg")) return -1;
                  var digits = new string(gStr.Where(char.IsDigit).ToArray());
                  return int.TryParse(digits, out var g) && g > 0 ? g : 999;
              }).ThenBy(c => c.section).Select(c => new
              {
                  c.className,
                  c.totalCollected,
                  c.totalPending,
                  c.studentCount
              }).ToList();

            // Fee-type-wise breakdown
            var feewise = feeStructures.Select(fs =>
            {
                var fsInvoices   = invoices.Where(i => i.FeeStructureId == fs.Id).ToList();
                var fsInvoiceIds = fsInvoices.Select(i => i.Id).ToHashSet();
                var fsTxns       = dateFilteredTxns.Where(t => fsInvoiceIds.Contains(t.InvoiceId) && IsSuccess(t.Status));
                var fsPending    = fsInvoices.Sum(inv =>
                {
                    var paid = allInvoiceTransactions.Where(t => t.InvoiceId == inv.Id && IsSuccess(t.Status)).Sum(t => t.Amount);
                    return Math.Max(0, inv.Amount - paid);
                });

                return new
                {
                    feeName        = fs.Name,
                    frequency      = fs.Frequency,
                    totalCollected = fsTxns.Sum(t => t.Amount),
                    totalPending   = fsPending
                };
            }).Where(f => f.totalCollected > 0 || f.totalPending > 0)
              .OrderByDescending(f => f.totalCollected).ToList();

            // Month-wise breakdown (last 12 months)
            var monthwise = Enumerable.Range(0, 12).Select(offset =>
            {
                var d = DateTime.UtcNow.AddMonths(-offset);
                var monthStart = new DateTime(d.Year, d.Month, 1);
                var monthEnd   = monthStart.AddMonths(1).AddTicks(-1);
                var monthTxns  = allInvoiceTransactions.Where(t => t.TransactionDate >= monthStart && t.TransactionDate <= monthEnd && IsSuccess(t.Status));
                var monthInvoices = invoices.Where(i => i.DueDate >= monthStart && i.DueDate <= monthEnd).ToList();
                var monthPending = monthInvoices.Sum(inv =>
                {
                    var paid = allInvoiceTransactions.Where(t => t.InvoiceId == inv.Id && IsSuccess(t.Status)).Sum(t => t.Amount);
                    return Math.Max(0, inv.Amount - paid);
                });

                return new
                {
                    month     = monthStart.ToString("MMM yyyy"),
                    collected = monthTxns.Sum(t => t.Amount),
                    pending   = monthPending
                };
            }).Reverse().ToList();

            var grandCollected = dateFilteredTxns.Where(t => IsSuccess(t.Status)).Sum(t => t.Amount);
            var grandPending   = invoices.Sum(inv =>
            {
                var paid = allInvoiceTransactions.Where(t => t.InvoiceId == inv.Id && IsSuccess(t.Status)).Sum(t => t.Amount);
                return Math.Max(0, inv.Amount - paid);
            });

            return Ok(new
            {
                classwise,
                feewise,
                monthwise,
                grandTotal = new
                {
                    totalCollected = grandCollected,
                    totalPending   = grandPending
                }
            });
        }
    }
}

