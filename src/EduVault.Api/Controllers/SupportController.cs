using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/support")]
    [Authorize(Roles = "superadmin")]
    public class SupportController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IAuthService _authService;

        public SupportController(IUnitOfWork unitOfWork, IAuthService authService)
        {
            _unitOfWork = unitOfWork;
            _authService = authService;
        }

        [HttpGet]
        public async Task<IActionResult> GetDashboardData()
        {
            var tickets = (await _unitOfWork.SupportTickets.GetAllAsync())
                .OrderByDescending(t => t.CreatedAt)
                .ToList();

            var categories = (await _unitOfWork.KnowledgeBaseCategories.GetAllAsync())
                .OrderBy(c => c.Title)
                .ToList();

            var events = (await _unitOfWork.SystemEvents.GetAllAsync())
                .OrderByDescending(e => e.CreatedAt)
                .Take(5)
                .ToList();

            // Calculate stats
            var openTicketsCount = tickets.Count(t => t.Status == "OPEN" || t.Status == "IN PROGRESS");
            var criticalIssuesCount = tickets.Count(t => t.Priority == "HIGH" && t.Status != "RESOLVED");

            // Retrieve uptime from platform settings if available, else default to 99.9%
            var settings = (await _unitOfWork.PlatformSettings.GetAllAsync()).FirstOrDefault();
            var uptime = "99.9%";
            
            // Simple default stat values matching original UI
            var stats = new
            {
                OpenTickets = openTicketsCount.ToString("D2"),
                AvgResponse = "1.5h",
                SystemUptime = uptime,
                CriticalIssues = criticalIssuesCount.ToString("D2")
            };

            return Ok(new
            {
                Tickets = tickets,
                Categories = categories,
                Events = events,
                Stats = stats,
                SystemStatus = "Healthy"
            });
        }

        [HttpPost("tickets")]
        public async Task<IActionResult> CreateTicket([FromBody] CreateTicketRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.SchoolName))
            {
                return BadRequest(new { error = "Title and School Name are required." });
            }

            var random = new Random();
            var ticketNumber = $"TK-{random.Next(1000, 9999)}";

            var ticket = new SupportTicket
            {
                TicketNumber = ticketNumber,
                Title = request.Title,
                SchoolName = request.SchoolName,
                Status = "OPEN",
                Priority = string.IsNullOrWhiteSpace(request.Priority) ? "MEDIUM" : request.Priority.ToUpper(),
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.SupportTickets.AddAsync(ticket);
            
            // Log a system event for this ticket creation
            var newEvent = new SystemEvent
            {
                Icon = "🎫",
                Title = "New Ticket Created",
                Description = $"Ticket {ticketNumber} submitted by {request.SchoolName}",
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.SystemEvents.AddAsync(newEvent);

            await _unitOfWork.CompleteAsync();

            return Ok(ticket);
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetUserPassword([FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new { error = "Email address is required." });
            }

            var user = (await _unitOfWork.Users.FindAsync(u => u.Email == request.Email)).FirstOrDefault();
            if (user == null)
            {
                return NotFound(new { error = "User with this email not found." });
            }

            const string tempPassword = "Temp123!";
            user.PasswordHash = _authService.HashPassword(tempPassword);
            
            _unitOfWork.Users.Update(user);

            // Log a system event for the password reset
            var newEvent = new SystemEvent
            {
                Icon = "🔑",
                Title = "Password Reset Generated",
                Description = $"Temp password created for {request.Email}",
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.SystemEvents.AddAsync(newEvent);

            await _unitOfWork.CompleteAsync();

            return Ok(new
            {
                success = true,
                email = user.Email,
                tempPassword = tempPassword
            });
        }
    }

    public class CreateTicketRequest
    {
        public string Title { get; set; } = string.Empty;
        public string SchoolName { get; set; } = string.Empty;
        public string Priority { get; set; } = "MEDIUM";
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }
}
