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
    [Route("api/billing")]
    [Authorize]
    public class BillingController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public BillingController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
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
            return Ok(structures.Select(fs => new {
                fs.Id,
                fs.Name,
                fs.Amount,
                fs.Frequency,
                Grade = string.IsNullOrEmpty(fs.Grade) ? "All Grades" : fs.Grade
            }));
        }

        [HttpPost("structures")]
        [Authorize(Roles = "schooladmin")]
        public async Task<IActionResult> CreateFeeStructure([FromBody] FeeStructure feeStructure)
        {
            feeStructure.SchoolId = GetSchoolId();
            await _unitOfWork.FeeStructures.AddAsync(feeStructure);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, feeStructureId = feeStructure.Id });
        }

        [HttpGet("invoices")]
        public async Task<IActionResult> GetInvoices()
        {
            var schoolId = GetSchoolId();
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            if (role == "student")
            {
                var userId = GetUserId();
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
                // School Admin view
                var invoices = await _unitOfWork.Invoices.GetAllAsync();
                var structures = await _unitOfWork.FeeStructures.FindAsync(fs => fs.SchoolId == schoolId);
                var studentUsers = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && u.Role == "student");

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
                return Ok(list);
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

            _unitOfWork.FeeStructures.Remove(feeStructure);
            await _unitOfWork.CompleteAsync();

            return Ok(new { success = true });
        }
    }

    public class PayInvoiceRequest
    {
        public Guid InvoiceId { get; set; }
        public string PaymentMethod { get; set; } = "Visa";
    }
}
