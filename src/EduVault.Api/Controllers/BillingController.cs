using System;
using System.Linq;
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

        public BillingController(IUnitOfWork unitOfWork, IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _unitOfWork = unitOfWork;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
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
        [Authorize(Roles = "schooladmin")]
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
                        StudentId = $"STU-{DateTime.UtcNow.Year}-{new Random().Next(1000, 9999)}",
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
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(request.InvoiceId);
            if (invoice == null) return NotFound(new { error = "Invoice not found" });

            if (invoice.Status == "Paid") return BadRequest(new { error = "Invoice is already paid" });

            // Create Transaction Record (Stripe/Payment Mock)
            var transaction = new PaymentTransaction
            {
                InvoiceId = request.InvoiceId,
                ReferenceNumber = $"TXN-{Guid.NewGuid().ToString().Substring(0, 8).ToUpper()}",
                Amount = invoice.Amount,
                PaymentMethod = request.PaymentMethod,
                TransactionDate = DateTime.UtcNow,
                Status = "success"
            };

            await _unitOfWork.Transactions.AddAsync(transaction);

            // Update Invoice Status
            invoice.Status = "Paid";
            _unitOfWork.Invoices.Update(invoice);

            await _unitOfWork.CompleteAsync();

            return Ok(new {
                success = true,
                referenceNumber = transaction.ReferenceNumber,
                amount = transaction.Amount
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
        [Authorize(Roles = "schooladmin")]
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
        [Authorize(Roles = "schooladmin")]
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
            var school = user != null ? await _unitOfWork.Schools.GetByIdAsync(user.SchoolId) : null;

            bool hasSchoolKeys = school != null && !string.IsNullOrWhiteSpace(school.RazorpayKeyId) && !string.IsNullOrWhiteSpace(school.RazorpayKeySecret);

            if (!hasSchoolKeys)
            {
                return BadRequest(new { error = "PAYMENT_NOT_CONFIGURED" });
            }

            var keyId = school.RazorpayKeyId;
            var keySecret = school.RazorpayKeySecret;

            if (keyId.Contains("mock") || keySecret.Contains("mock"))
            {
                // Return a mock order ID if credentials are set to mock values to allow testing
                return Ok(new {
                    orderId = $"order_mock_{Guid.NewGuid().ToString().Substring(0, 8)}",
                    amount = (int)Math.Round(invoice.Amount * 100),
                    currency = "INR",
                    keyId = keyId,
                    invoiceId = invoice.Id,
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
                    amount = (int)Math.Round(invoice.Amount * 100), // in paise
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
                    orderId = orderId,
                    amount = (int)Math.Round(invoice.Amount * 100),
                    currency = "INR",
                    keyId = keyId,
                    invoiceId = invoice.Id,
                    isMock = false
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = $"Error calling Razorpay: {ex.Message}" });
            }
        }

        [HttpPost("verify-payment")]
        [Authorize(Roles = "student")]
        public async Task<IActionResult> VerifyPayment([FromBody] VerifyPaymentRequest request)
        {
            var invoice = await _unitOfWork.Invoices.GetByIdAsync(request.InvoiceId);
            if (invoice == null) return NotFound(new { error = "Invoice not found" });

            if (invoice.Status == "Paid") return BadRequest(new { error = "Invoice is already paid" });

            var user = await _unitOfWork.Users.GetByIdAsync(invoice.StudentId);
            var school = user != null ? await _unitOfWork.Schools.GetByIdAsync(user.SchoolId) : null;
            
            bool hasSchoolKeys = school != null && !string.IsNullOrWhiteSpace(school.RazorpayKeySecret);
            if (!hasSchoolKeys)
            {
                return BadRequest(new { error = "PAYMENT_NOT_CONFIGURED" });
            }

            var keySecret = school.RazorpayKeySecret;

            // If it's a mock checkout or keys are not set, allow instant success
            bool isVerified = false;
            if (request.RazorpayOrderId.StartsWith("order_mock_") || string.IsNullOrEmpty(keySecret) || keySecret == "yourKeySecretHere")
            {
                isVerified = true;
            }
            else
            {
                isVerified = VerifySignature(request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature, keySecret);
            }

            if (!isVerified)
            {
                return BadRequest(new { error = "Payment signature verification failed. Invalid transaction." });
            }

            // Record transaction
            var transaction = new PaymentTransaction
            {
                InvoiceId = request.InvoiceId,
                ReferenceNumber = request.RazorpayPaymentId,
                Amount = invoice.Amount,
                PaymentMethod = "Razorpay",
                TransactionDate = DateTime.UtcNow,
                Status = "success"
            };

            await _unitOfWork.Transactions.AddAsync(transaction);

            // Update invoice
            invoice.Status = "Paid";
            _unitOfWork.Invoices.Update(invoice);

            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true, referenceNumber = transaction.ReferenceNumber });
        }

        [HttpGet("student-ledger")]
        [Authorize(Roles = "schooladmin")]
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
        [Authorize(Roles = "schooladmin,student")]
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

            var keyId = _configuration["Razorpay:KeyId"] ?? "";
            var keySecret = _configuration["Razorpay:KeySecret"] ?? "";

            if (string.IsNullOrEmpty(keyId) || string.IsNullOrEmpty(keySecret) || keySecret == "yourKeySecretHere")
            {
                // Return a mock order ID if credentials are not configured to allow testing
                return Ok(new {
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

            var keySecret = _configuration["Razorpay:KeySecret"] ?? "";

            bool isVerified = false;
            if (request.RazorpayOrderId.StartsWith("sub_mock_") || string.IsNullOrEmpty(keySecret) || keySecret == "yourKeySecretHere")
            {
                isVerified = true;
            }
            else
            {
                isVerified = VerifySignature(request.RazorpayOrderId, request.RazorpayPaymentId, request.RazorpaySignature, keySecret);
            }

            if (!isVerified)
            {
                return BadRequest(new { error = "Payment signature verification failed. Invalid transaction." });
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
        public string PaymentMethod { get; set; } = "Visa";
    }

    public class CreateOrderRequest
    {
        public Guid InvoiceId { get; set; }
    }

    public class VerifyPaymentRequest
    {
        public Guid InvoiceId { get; set; }
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string RazorpayPaymentId { get; set; } = string.Empty;
        public string RazorpaySignature { get; set; } = string.Empty;
    }

    public class VerifySubscriptionPaymentRequest
    {
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string RazorpayPaymentId { get; set; } = string.Empty;
        public string RazorpaySignature { get; set; } = string.Empty;
    }
}
