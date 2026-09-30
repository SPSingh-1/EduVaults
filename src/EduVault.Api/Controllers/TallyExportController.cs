using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Xml;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TallyExportController : ControllerBase
    {
        private readonly EduVaultDbContext _context;

        public TallyExportController(EduVaultDbContext context)
        {
            _context = context;
        }

        private Guid GetSchoolId()
        {
            var schoolIdClaim = User.FindFirst("SchoolId")?.Value;
            if (Guid.TryParse(schoolIdClaim, out var schoolId))
            {
                return schoolId;
            }

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role == "SuperAdmin")
            {
                if (Request.Query.TryGetValue("schoolId", out var qSchoolId) &&
                    Guid.TryParse(qSchoolId, out var parsedQId))
                {
                    return parsedQId;
                }
            }

            return Guid.Empty;
        }

        // GET: /api/tallyexport/summary?from=2026-04-01&to=2026-04-30
        [HttpGet("summary")]
        public async Task<IActionResult> GetExportSummary([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty) return BadRequest(new { error = "Valid school ID is required" });

            var fromDate = from ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var toDate = to ?? DateTime.UtcNow;

            var transactionsCount = await _context.Transactions
                .Include(pt => pt.Invoice)
                    .ThenInclude(i => i.FeeStructure)
                .Where(pt => pt.Invoice != null && pt.Invoice.FeeStructure != null &&
                             pt.Invoice.FeeStructure.SchoolId == schoolId &&
                             pt.Status == "success" &&
                             pt.TransactionDate >= fromDate && pt.TransactionDate <= toDate)
                .CountAsync();

            var transactionsTotal = await _context.Transactions
                .Include(pt => pt.Invoice)
                    .ThenInclude(i => i.FeeStructure)
                .Where(pt => pt.Invoice != null && pt.Invoice.FeeStructure != null &&
                             pt.Invoice.FeeStructure.SchoolId == schoolId &&
                             pt.Status == "success" &&
                             pt.TransactionDate >= fromDate && pt.TransactionDate <= toDate)
                .SumAsync(pt => (decimal?)pt.Amount) ?? 0m;

            var expensesCount = await _context.Expenses
                .Where(e => e.SchoolId == schoolId && e.Date >= fromDate && e.Date <= toDate)
                .CountAsync();

            var expensesTotal = await _context.Expenses
                .Where(e => e.SchoolId == schoolId && e.Date >= fromDate && e.Date <= toDate)
                .SumAsync(e => (decimal?)e.Amount) ?? 0m;

            return Ok(new
            {
                fromDate = fromDate.ToString("yyyy-MM-dd"),
                toDate = toDate.ToString("yyyy-MM-dd"),
                receiptVouchers = new { count = transactionsCount, totalAmount = transactionsTotal },
                paymentVouchers = new { count = expensesCount, totalAmount = expensesTotal },
                totalVouchers = transactionsCount + expensesCount,
                netBalance = transactionsTotal - expensesTotal
            });
        }

        // GET: /api/tallyexport/download-xml?from=2026-04-01&to=2026-04-30
        [HttpGet("download-xml")]
        public async Task<IActionResult> DownloadTallyXml([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var schoolId = GetSchoolId();
            if (schoolId == Guid.Empty) return BadRequest(new { error = "Valid school ID is required" });

            var school = await _context.Schools.FindAsync(schoolId);
            var schoolName = school?.Name ?? "EduVault Institution";

            var fromDate = from ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var toDate = to ?? DateTime.UtcNow;

            var transactions = await _context.Transactions
                .Include(pt => pt.Invoice)
                    .ThenInclude(i => i.FeeStructure)
                .Include(pt => pt.Invoice)
                    .ThenInclude(i => i.Student)
                        .ThenInclude(s => s.User)
                .Where(pt => pt.Invoice != null && pt.Invoice.FeeStructure != null &&
                             pt.Invoice.FeeStructure.SchoolId == schoolId &&
                             pt.Status == "success" &&
                             pt.TransactionDate >= fromDate && pt.TransactionDate <= toDate)
                .OrderBy(pt => pt.TransactionDate)
                .ToListAsync();

            var expenses = await _context.Expenses
                .Where(e => e.SchoolId == schoolId && e.Date >= fromDate && e.Date <= toDate)
                .OrderBy(e => e.Date)
                .ToListAsync();

            var settings = new XmlWriterSettings
            {
                Encoding = Encoding.UTF8,
                Indent = true,
                OmitXmlDeclaration = false
            };

            using var memoryStream = new MemoryStream();
            using (var writer = XmlWriter.Create(memoryStream, settings))
            {
                writer.WriteStartDocument();
                // <ENVELOPE>
                writer.WriteStartElement("ENVELOPE");

                // <HEADER>
                writer.WriteStartElement("HEADER");
                writer.WriteElementString("TALLYREQUEST", "Import Data");
                writer.WriteEndElement(); // </HEADER>

                // <BODY>
                writer.WriteStartElement("BODY");
                writer.WriteStartElement("IMPORTDATA");
                writer.WriteStartElement("REQUESTDESC");
                writer.WriteElementString("REPORTNAME", "Vouchers");
                writer.WriteStartElement("STATICVARIABLES");
                writer.WriteElementString("SVCURRENTCOMPANY", schoolName);
                writer.WriteEndElement(); // </STATICVARIABLES>
                writer.WriteEndElement(); // </REQUESTDESC>

                writer.WriteStartElement("REQUESTDATA");

                // 1. Write Fee Receipt Vouchers
                foreach (var tx in transactions)
                {
                    var studentName = tx.Invoice?.Student?.User != null 
                        ? $"{tx.Invoice.Student.User.FirstName} {tx.Invoice.Student.User.LastName}".Trim()
                        : "Student";
                    var feeType = tx.Invoice?.FeeStructure?.Name ?? "Tuition Fee";
                    var tallyDate = tx.TransactionDate.ToString("yyyyMMdd");
                    var refNo = string.IsNullOrWhiteSpace(tx.ReferenceNumber) ? tx.Id.ToString()[..8].ToUpper() : tx.ReferenceNumber;

                    writer.WriteStartElement("TALLYMESSAGE");
                    writer.WriteAttributeString("xmlns", "UDF", null, "TallyUDF");

                    writer.WriteStartElement("VOUCHER");
                    writer.WriteAttributeString("VCHTYPE", "Receipt");
                    writer.WriteAttributeString("ACTION", "Create");

                    writer.WriteElementString("DATE", tallyDate);
                    writer.WriteElementString("VOUCHERTYPENAME", "Receipt");
                    writer.WriteElementString("VOUCHERNUMBER", refNo);
                    writer.WriteElementString("PARTYLEDGERNAME", $"Fees - {feeType}");
                    writer.WriteElementString("PERSISTEDVIEW", "Accounting Voucher View");
                    writer.WriteElementString("NARRATION", $"Fee collected from {studentName} ({feeType}) via {tx.PaymentMethod}. Ref: {refNo}");

                    // Debit Ledger Entry (Cash or Bank/UPI)
                    writer.WriteStartElement("ALLLEDGERENTRIES.LIST");
                    var bankOrCash = tx.PaymentMethod?.ToLower().Contains("cash") == true ? "Cash" : "Bank Accounts";
                    writer.WriteElementString("LEDGERNAME", bankOrCash);
                    writer.WriteElementString("ISDEEMEDPOSITIVE", "Yes");
                    writer.WriteElementString("AMOUNT", (-tx.Amount).ToString("0.00")); // Debit in Tally is negative
                    writer.WriteEndElement(); // </ALLLEDGERENTRIES.LIST>

                    // Credit Ledger Entry (Fee Income Head)
                    writer.WriteStartElement("ALLLEDGERENTRIES.LIST");
                    writer.WriteElementString("LEDGERNAME", $"Fees - {feeType}");
                    writer.WriteElementString("ISDEEMEDPOSITIVE", "No");
                    writer.WriteElementString("AMOUNT", tx.Amount.ToString("0.00")); // Credit in Tally is positive
                    writer.WriteEndElement(); // </ALLLEDGERENTRIES.LIST>

                    writer.WriteEndElement(); // </VOUCHER>
                    writer.WriteEndElement(); // </TALLYMESSAGE>
                }

                // 2. Write Expense Payment Vouchers
                foreach (var exp in expenses)
                {
                    var tallyDate = exp.Date.ToString("yyyyMMdd");
                    var voucherNo = string.IsNullOrWhiteSpace(exp.VoucherNumber) ? exp.Id.ToString()[..8].ToUpper() : exp.VoucherNumber;
                    var category = string.IsNullOrWhiteSpace(exp.Category) ? "General Expense" : exp.Category;

                    writer.WriteStartElement("TALLYMESSAGE");
                    writer.WriteAttributeString("xmlns", "UDF", null, "TallyUDF");

                    writer.WriteStartElement("VOUCHER");
                    writer.WriteAttributeString("VCHTYPE", "Payment");
                    writer.WriteAttributeString("ACTION", "Create");

                    writer.WriteElementString("DATE", tallyDate);
                    writer.WriteElementString("VOUCHERTYPENAME", "Payment");
                    writer.WriteElementString("VOUCHERNUMBER", voucherNo);
                    writer.WriteElementString("PARTYLEDGERNAME", $"Expenses - {category}");
                    writer.WriteElementString("PERSISTEDVIEW", "Accounting Voucher View");
                    writer.WriteElementString("NARRATION", $"{exp.Title}: {exp.Description}");

                    // Debit Ledger Entry (Expense Head)
                    writer.WriteStartElement("ALLLEDGERENTRIES.LIST");
                    writer.WriteElementString("LEDGERNAME", $"Expenses - {category}");
                    writer.WriteElementString("ISDEEMEDPOSITIVE", "Yes");
                    writer.WriteElementString("AMOUNT", (-exp.Amount).ToString("0.00"));
                    writer.WriteEndElement();

                    // Credit Ledger Entry (Cash or Bank)
                    writer.WriteStartElement("ALLLEDGERENTRIES.LIST");
                    writer.WriteElementString("LEDGERNAME", "Bank Accounts");
                    writer.WriteElementString("ISDEEMEDPOSITIVE", "No");
                    writer.WriteElementString("AMOUNT", exp.Amount.ToString("0.00"));
                    writer.WriteEndElement();

                    writer.WriteEndElement(); // </VOUCHER>
                    writer.WriteEndElement(); // </TALLYMESSAGE>
                }

                writer.WriteEndElement(); // </REQUESTDATA>
                writer.WriteEndElement(); // </IMPORTDATA>
                writer.WriteEndElement(); // </BODY>
                writer.WriteEndElement(); // </ENVELOPE>
                writer.WriteEndDocument();
            }

            var xmlBytes = memoryStream.ToArray();
            var fileName = $"Tally_Vouchers_{schoolName.Replace(" ", "_")}_{fromDate:yyyyMMdd}_to_{toDate:yyyyMMdd}.xml";

            return File(xmlBytes, "application/xml", fileName);
        }
    }
}
