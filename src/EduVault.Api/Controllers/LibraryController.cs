using System;
using System.Linq;
using System.IO;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/library")]
    [Authorize(Roles = "librarian,Librarian,schooladmin,SchoolAdmin,superadmin,SuperAdmin")]
    public class LibraryController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly Services.WhatsAppService _whatsAppService;

        public LibraryController(IUnitOfWork unitOfWork, Services.WhatsAppService whatsAppService)
        {
            _unitOfWork = unitOfWork;
            _whatsAppService = whatsAppService;
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
        // Library Dashboard
        // ==========================================
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            var schoolId = GetSchoolId();
            var books = await _unitOfWork.Books.FindAsync(b => b.SchoolId == schoolId);
            var transactions = await _unitOfWork.LibraryTransactions.FindAsync(t => t.SchoolId == schoolId);
            var settings = (await _unitOfWork.LibrarySettings.FindAsync(s => s.SchoolId == schoolId)).FirstOrDefault();
            decimal finePerDay = settings?.FinePerDay ?? 2.00m;

            int totalBooks = books.Sum(b => b.TotalCopies);
            int availableBooks = books.Sum(b => b.AvailableCopies);
            int issuedBooks = transactions.Count(t => t.Status == "Issued");
            
            // Check overdue transactions
            var now = DateTime.UtcNow.Date;
            int overdueBooks = transactions.Count(t => t.Status == "Issued" && t.DueDate.Date < now);
            decimal totalFineCollected = transactions.Where(t => t.FinePaid).Sum(t => t.FineAmount);
            decimal pendingFine = transactions.Where(t => !t.FinePaid && t.FineAmount > 0).Sum(t => t.FineAmount);

            // Category breakdown
            var categoryBreakdown = books
                .GroupBy(b => string.IsNullOrWhiteSpace(b.Category) ? "Uncategorized" : b.Category)
                .Select(g => new { category = g.Key, total = g.Sum(x => x.TotalCopies), available = g.Sum(x => x.AvailableCopies) })
                .ToList();

            // Recent 7 days issuance trend
            var dailyIssuanceTrend = new List<object>();
            for (int i = 6; i >= 0; i--)
            {
                var dt = now.AddDays(-i);
                int count = transactions.Count(t => t.IssueDate.Date == dt);
                dailyIssuanceTrend.Add(new
                {
                    date = dt.ToString("dd MMM"),
                    issued = count
                });
            }

            // Configured Widgets & Graph Driver
            var allDefinitions = (await _unitOfWork.DashboardWidgetDefinitions.GetAllAsync())
                .Where(w => w.IsActive && (w.TargetRole == "librarian" || w.TargetRole == "all"))
                .OrderBy(w => w.DisplayOrder)
                .ToList();

            var schoolWidgets = (await _unitOfWork.SchoolDashboardWidgets.FindAsync(
                sw => sw.SchoolId == schoolId && sw.Role == "librarian")).ToList();

            var configuredWidgets = allDefinitions.Select(d =>
            {
                var custom = schoolWidgets.FirstOrDefault(sw => sw.WidgetKey == d.WidgetKey);
                return new
                {
                    widgetKey = d.WidgetKey,
                    title = custom?.CustomTitle ?? d.DefaultTitle,
                    metricSource = d.MetricSource,
                    timeRange = custom?.TimeRange ?? d.DefaultTimeRange,
                    chartType = !string.IsNullOrEmpty(custom?.ChartType) ? custom.ChartType : d.ChartType,
                    colorTheme = d.ColorTheme,
                    iconName = d.IconName,
                    isEnabled = custom?.IsEnabled ?? true,
                    displayOrder = custom?.DisplayOrder ?? d.DisplayOrder
                };
            }).OrderBy(w => w.displayOrder).ToList();

            return Ok(new
            {
                totalBooks,
                availableBooks,
                issuedBooks,
                overdueBooks,
                totalFineCollected,
                pendingFine,
                finePerDay,
                categoryBreakdown,
                dailyIssuanceTrend,
                configuredWidgets
            });
        }

        // ==========================================
        // Library Settings (Fine Rate, Max Days)
        // ==========================================
        [HttpGet("settings")]
        public async Task<IActionResult> GetSettings()
        {
            var schoolId = GetSchoolId();
            var settings = (await _unitOfWork.LibrarySettings.FindAsync(s => s.SchoolId == schoolId)).FirstOrDefault();
            if (settings == null)
            {
                settings = new LibrarySettings
                {
                    SchoolId = schoolId,
                    FinePerDay = 2.00m,
                    MaxIssueDays = 14,
                    MaxBooksPerMember = 3
                };
                await _unitOfWork.LibrarySettings.AddAsync(settings);
                await _unitOfWork.CompleteAsync();
            }

            return Ok(settings);
        }

        [HttpPut("settings")]
        public async Task<IActionResult> UpdateSettings([FromBody] UpdateLibrarySettingsRequest request)
        {
            var schoolId = GetSchoolId();
            var settings = (await _unitOfWork.LibrarySettings.FindAsync(s => s.SchoolId == schoolId)).FirstOrDefault();
            if (settings == null)
            {
                settings = new LibrarySettings
                {
                    SchoolId = schoolId,
                    FinePerDay = request.FinePerDay,
                    MaxIssueDays = request.MaxIssueDays,
                    MaxBooksPerMember = request.MaxBooksPerMember,
                    UpdatedAt = DateTime.UtcNow
                };
                await _unitOfWork.LibrarySettings.AddAsync(settings);
            }
            else
            {
                settings.FinePerDay = request.FinePerDay;
                settings.MaxIssueDays = request.MaxIssueDays;
                settings.MaxBooksPerMember = request.MaxBooksPerMember;
                settings.UpdatedAt = DateTime.UtcNow;
                _unitOfWork.LibrarySettings.Update(settings);
            }

            await _unitOfWork.CompleteAsync();
            return Ok(settings);
        }

        // ==========================================
        // Book Catalog Management
        // ==========================================
        [HttpGet("books")]
        public async Task<IActionResult> GetBooks([FromQuery] string? search, [FromQuery] string? category)
        {
            var schoolId = GetSchoolId();
            var books = await _unitOfWork.Books.FindAsync(b => b.SchoolId == schoolId);

            var query = books.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(b => b.Title.ToLower().Contains(s) || b.Author.ToLower().Contains(s) || b.ISBN.ToLower().Contains(s));
            }
            if (!string.IsNullOrWhiteSpace(category) && category != "ALL")
            {
                query = query.Where(b => b.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            return Ok(query.OrderBy(b => b.Title));
        }

        [HttpPost("books")]
        public async Task<IActionResult> AddBook([FromBody] AddBookRequest request)
        {
            var schoolId = GetSchoolId();
            int total = request.TotalCopies > 0 ? request.TotalCopies : 1;

            var book = new Book
            {
                SchoolId = schoolId,
                ISBN = request.ISBN,
                Title = request.Title,
                Author = request.Author,
                Publisher = request.Publisher ?? "",
                Category = request.Category ?? "General",
                TotalCopies = total,
                AvailableCopies = total,
                ShelfLocation = request.ShelfLocation ?? "A1",
                AddedAt = DateTime.UtcNow
            };

            await _unitOfWork.Books.AddAsync(book);
            await _unitOfWork.CompleteAsync();
            return Ok(book);
        }

        [HttpPut("books/{id}")]
        public async Task<IActionResult> UpdateBook(Guid id, [FromBody] AddBookRequest request)
        {
            var schoolId = GetSchoolId();
            var book = await _unitOfWork.Books.GetByIdAsync(id);
            if (book == null || book.SchoolId != schoolId)
            {
                return NotFound(new { error = "Book not found" });
            }

            int diff = request.TotalCopies - book.TotalCopies;
            book.ISBN = request.ISBN;
            book.Title = request.Title;
            book.Author = request.Author;
            book.Publisher = request.Publisher ?? "";
            book.Category = request.Category ?? "General";
            book.ShelfLocation = request.ShelfLocation ?? "A1";
            book.TotalCopies = request.TotalCopies;
            book.AvailableCopies = Math.Max(0, book.AvailableCopies + diff);

            _unitOfWork.Books.Update(book);
            await _unitOfWork.CompleteAsync();
            return Ok(book);
        }

        [HttpDelete("books/{id}")]
        public async Task<IActionResult> DeleteBook(Guid id)
        {
            var schoolId = GetSchoolId();
            var book = await _unitOfWork.Books.GetByIdAsync(id);
            if (book == null || book.SchoolId != schoolId)
            {
                return NotFound(new { error = "Book not found" });
            }

            var activeIssues = await _unitOfWork.LibraryTransactions.FindAsync(t => t.BookId == id && t.Status == "Issued");
            if (activeIssues.Any())
            {
                return BadRequest(new { error = "Cannot delete book because copies are currently issued to members." });
            }

            _unitOfWork.Books.Remove(book);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true });
        }

        // ==========================================
        // Bulk CSV Import for Books
        // ==========================================
        [HttpPost("books/import")]
        [Consumes("multipart/form-data")]
        [ApiExplorerSettings(IgnoreApi = true)] // excluded from Swagger: IFormFile [FromForm] breaks doc generation (endpoint still works at runtime)
        public async Task<IActionResult> ImportBooks([FromForm] IFormFile? file)
        {
            var schoolId = GetSchoolId();
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "Please upload a valid .csv file." });
            }

            if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { error = "Only .csv format files are supported." });
            }

            var importedBooks = new List<Book>();
            var errors = new List<string>();
            int rowNum = 1;

            using (var reader = new StreamReader(file.OpenReadStream()))
            {
                string? headerLine = await reader.ReadLineAsync(); // Header line
                string? line;
                while ((line = await reader.ReadLineAsync()) != null)
                {
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    rowNum++;

                    var parts = line.Split(',');
                    if (parts.Length < 3)
                    {
                        errors.Add($"Row {rowNum}: Missing required columns (ISBN, Title, Author).");
                        continue;
                    }

                    string isbn = parts[0].Trim().Trim('"');
                    string title = parts[1].Trim().Trim('"');
                    string author = parts[2].Trim().Trim('"');
                    string publisher = parts.Length > 3 ? parts[3].Trim().Trim('"') : "";
                    string category = parts.Length > 4 ? parts[4].Trim().Trim('"') : "General";
                    
                    int copies = 1;
                    if (parts.Length > 5 && int.TryParse(parts[5].Trim().Trim('"'), out int parsedCopies))
                    {
                        copies = parsedCopies > 0 ? parsedCopies : 1;
                    }
                    string shelf = parts.Length > 6 ? parts[6].Trim().Trim('"') : "A1";

                    if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(author))
                    {
                        errors.Add($"Row {rowNum}: Title and Author cannot be empty.");
                        continue;
                    }

                    var book = new Book
                    {
                        SchoolId = schoolId,
                        ISBN = string.IsNullOrWhiteSpace(isbn) ? $"ISBN-{RandomNumberGenerator.GetInt32(100000, 999999)}" : isbn,
                        Title = title,
                        Author = author,
                        Publisher = publisher,
                        Category = string.IsNullOrWhiteSpace(category) ? "General" : category,
                        TotalCopies = copies,
                        AvailableCopies = copies,
                        ShelfLocation = string.IsNullOrWhiteSpace(shelf) ? "A1" : shelf,
                        AddedAt = DateTime.UtcNow
                    };

                    await _unitOfWork.Books.AddAsync(book);
                    importedBooks.Add(book);
                }
            }

            if (importedBooks.Any())
            {
                await _unitOfWork.CompleteAsync();
            }

            return Ok(new
            {
                success = true,
                importedCount = importedBooks.Count,
                errors = errors
            });
        }

        // ==========================================
        // Members Lookup (Students & Teachers)
        // ==========================================
        [HttpGet("members")]
        public async Task<IActionResult> GetMembers([FromQuery] string? search)
        {
            var schoolId = GetSchoolId();
            var users = await _unitOfWork.Users.FindAsync(u => u.SchoolId == schoolId && (u.Role == "student" || u.Role == "teacher") && u.IsActive);

            var query = users.AsQueryable();
            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(u => u.FirstName.ToLower().Contains(s) || u.LastName.ToLower().Contains(s) || u.Email.ToLower().Contains(s));
            }

            var list = query.Select(u => new
            {
                id = u.Id,
                name = $"{u.FirstName} {u.LastName}",
                email = u.Email,
                role = u.Role
            }).Take(50);

            return Ok(list);
        }

        // ==========================================
        // Book Transactions (Issue & Return)
        // ==========================================
        [HttpGet("transactions")]
        public async Task<IActionResult> GetTransactions([FromQuery] string? status, [FromQuery] string? search)
        {
            var schoolId = GetSchoolId();
            var transactions = await _unitOfWork.LibraryTransactions.FindAsync(t => t.SchoolId == schoolId);
            var books = await _unitOfWork.Books.FindAsync(b => b.SchoolId == schoolId);
            var settings = (await _unitOfWork.LibrarySettings.FindAsync(s => s.SchoolId == schoolId)).FirstOrDefault();
            decimal finePerDay = settings?.FinePerDay ?? 2.00m;

            var query = transactions.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
            {
                query = query.Where(t => t.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
            }

            var now = DateTime.UtcNow.Date;
            var list = query.Select(t =>
            {
                var book = books.FirstOrDefault(b => b.Id == t.BookId);
                int overdueDays = 0;
                if (t.Status == "Issued" && t.DueDate.Date < now)
                {
                    overdueDays = (now - t.DueDate.Date).Days;
                }
                decimal fine = overdueDays > 0 ? overdueDays * finePerDay : t.FineAmount;

                return new
                {
                    t.Id,
                    t.BookId,
                    BookTitle = book?.Title ?? "Unknown",
                    BookISBN = book?.ISBN ?? "",
                    t.MemberId,
                    t.MemberType,
                    t.MemberName,
                    t.IssueDate,
                    t.DueDate,
                    t.ReturnDate,
                    Status = (t.Status == "Issued" && overdueDays > 0) ? "Overdue" : t.Status,
                    OverdueDays = overdueDays,
                    FineAmount = fine,
                    t.FinePaid
                };
            }).OrderByDescending(x => x.IssueDate).ToList();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                return Ok(list.Where(x => x.BookTitle.ToLower().Contains(s) || x.MemberName.ToLower().Contains(s)));
            }

            return Ok(list);
        }

        [HttpPost("transactions/issue")]
        public async Task<IActionResult> IssueBook([FromBody] IssueBookRequest request)
        {
            var schoolId = GetSchoolId();
            var book = await _unitOfWork.Books.GetByIdAsync(request.BookId);
            if (book == null || book.SchoolId != schoolId)
            {
                return NotFound(new { error = "Book not found." });
            }

            if (book.AvailableCopies <= 0)
            {
                return BadRequest(new { error = "No copies available for issue." });
            }

            var member = await _unitOfWork.Users.GetByIdAsync(request.MemberId);
            if (member == null || member.SchoolId != schoolId)
            {
                return NotFound(new { error = "Member not found." });
            }

            var settings = (await _unitOfWork.LibrarySettings.FindAsync(s => s.SchoolId == schoolId)).FirstOrDefault();
            int loanDays = settings?.MaxIssueDays ?? 14;
            int maxBooks = settings?.MaxBooksPerMember ?? 3;

            var activeIssues = await _unitOfWork.LibraryTransactions.FindAsync(t => t.SchoolId == schoolId && t.MemberId == request.MemberId && t.Status == "Issued");
            if (activeIssues.Count() >= maxBooks)
            {
                return BadRequest(new { error = $"Member has already reached maximum allowed active loans ({maxBooks} books)." });
            }

            DateTime issueDate = DateTime.UtcNow;
            DateTime dueDate = request.DueDate != default ? request.DueDate : issueDate.AddDays(loanDays);

            var transaction = new LibraryTransaction
            {
                SchoolId = schoolId,
                BookId = book.Id,
                MemberId = member.Id,
                MemberType = member.Role,
                MemberName = $"{member.FirstName} {member.LastName}",
                IssueDate = issueDate,
                DueDate = dueDate,
                Status = "Issued",
                FineAmount = 0,
                FinePaid = false
            };

            book.AvailableCopies -= 1;
            _unitOfWork.Books.Update(book);

            await _unitOfWork.LibraryTransactions.AddAsync(transaction);
            await _unitOfWork.CompleteAsync();

            // Send WhatsApp Alert
            try
            {
                var studentProfile = await _unitOfWork.Students.GetByIdAsync(member.Id);
                var phone = studentProfile?.GuardianPhone;
                if (!string.IsNullOrWhiteSpace(phone))
                {
                    var msg = $"[LIBRARY ALERT] Book '{book.Title}' (ISBN: {book.ISBN}) has been issued to {member.FirstName} {member.LastName}. Return Due Date: {dueDate:dd MMM yyyy}.";
                    _ = _whatsAppService.SendEventNotificationAsync(schoolId, "LIBRARY_ALERT", phone, msg);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Library issue WhatsApp alert error: {ex.Message}");
            }

            return Ok(new { success = true, transactionId = transaction.Id, dueDate });
        }

        [HttpPut("transactions/{id}/return")]
        public async Task<IActionResult> ReturnBook(Guid id, [FromBody] ReturnBookRequest? request)
        {
            var schoolId = GetSchoolId();
            var transaction = await _unitOfWork.LibraryTransactions.GetByIdAsync(id);
            if (transaction == null || transaction.SchoolId != schoolId)
            {
                return NotFound(new { error = "Transaction not found." });
            }

            if (transaction.Status == "Returned")
            {
                return BadRequest(new { error = "Book has already been returned." });
            }

            var book = await _unitOfWork.Books.GetByIdAsync(transaction.BookId);
            if (book != null)
            {
                book.AvailableCopies = Math.Min(book.TotalCopies, book.AvailableCopies + 1);
                _unitOfWork.Books.Update(book);
            }

            var settings = (await _unitOfWork.LibrarySettings.FindAsync(s => s.SchoolId == schoolId)).FirstOrDefault();
            decimal finePerDay = settings?.FinePerDay ?? 2.00m;

            DateTime returnDate = DateTime.UtcNow;
            int overdueDays = 0;
            if (returnDate.Date > transaction.DueDate.Date)
            {
                overdueDays = (returnDate.Date - transaction.DueDate.Date).Days;
            }

            decimal calculatedFine = overdueDays > 0 ? overdueDays * finePerDay : 0;

            transaction.ReturnDate = returnDate;
            transaction.Status = "Returned";
            transaction.FineAmount = calculatedFine;
            transaction.FinePaid = request?.FinePaid ?? (calculatedFine == 0);

            _unitOfWork.LibraryTransactions.Update(transaction);
            await _unitOfWork.CompleteAsync();

            if (calculatedFine > 0)
            {
                try
                {
                    var studentProfile = await _unitOfWork.Students.GetByIdAsync(transaction.MemberId);
                    var phone = studentProfile?.GuardianPhone;
                    if (!string.IsNullOrWhiteSpace(phone))
                    {
                        var fineStatus = transaction.FinePaid ? "Paid" : $"Due ₹{calculatedFine}";
                        var msg = $"[LIBRARY NOTICE] Book '{book?.Title}' has been returned with {overdueDays} days overdue. Fine status: {fineStatus}.";
                        _ = _whatsAppService.SendEventNotificationAsync(schoolId, "LIBRARY_ALERT", phone, msg);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Library return WhatsApp alert error: {ex.Message}");
                }
            }

            return Ok(new
            {
                success = true,
                returnDate,
                overdueDays,
                fineAmount = calculatedFine,
                finePaid = transaction.FinePaid
            });
        }

        [HttpPut("transactions/{id}/pay-fine")]
        public async Task<IActionResult> PayFine(Guid id)
        {
            var schoolId = GetSchoolId();
            var transaction = await _unitOfWork.LibraryTransactions.GetByIdAsync(id);
            if (transaction == null || transaction.SchoolId != schoolId)
            {
                return NotFound(new { error = "Transaction not found." });
            }

            transaction.FinePaid = true;
            _unitOfWork.LibraryTransactions.Update(transaction);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, finePaid = true });
        }
    }

    public class UpdateLibrarySettingsRequest
    {
        public decimal FinePerDay { get; set; } = 2.00m;
        public int MaxIssueDays { get; set; } = 14;
        public int MaxBooksPerMember { get; set; } = 3;
    }

    public class AddBookRequest
    {
        public string ISBN { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string? Publisher { get; set; }
        public string? Category { get; set; }
        public int TotalCopies { get; set; } = 1;
        public string? ShelfLocation { get; set; }
    }

    public class IssueBookRequest
    {
        public Guid BookId { get; set; }
        public Guid MemberId { get; set; }
        public DateTime DueDate { get; set; }
    }

    public class ReturnBookRequest
    {
        public bool FinePaid { get; set; }
    }
}
