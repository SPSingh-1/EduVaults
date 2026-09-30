using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using EduVault.Core.Interfaces;
using EduVault.Core.Entities;

namespace EduVault.Api.Services
{
    public class FeeAlertBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<FeeAlertBackgroundService> _logger;

        public FeeAlertBackgroundService(IServiceProvider serviceProvider, ILogger<FeeAlertBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Fee Alert Background Service starting.");

            // Run once initially, then periodically
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndSendFeeAlertsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing fee alerts check.");
                }

                // Run once every 24 hours
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }

        private async Task CheckAndSendFeeAlertsAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                var whatsappService = scope.ServiceProvider.GetRequiredService<WhatsAppService>();

                _logger.LogInformation("Checking outstanding invoices for fee reminders...");

                var invoices = await unitOfWork.Invoices.FindAsync(i => i.Status != "Paid" && i.Status != "Cancelled");
                var todayUtc = DateTime.UtcNow.Date;
                var threeDaysFromNow = todayUtc.AddDays(3);
                var dueToday = todayUtc;
                var fiveDaysOverdue = todayUtc.AddDays(-5);

                var dueInThreeDays = invoices.Where(i => i.DueDate.Date == threeDaysFromNow).ToList();
                var dueTodayInvoices = invoices.Where(i => i.DueDate.Date == dueToday).ToList();
                var overdueByFiveDays = invoices.Where(i => i.DueDate.Date == fiveDaysOverdue).ToList();

                _logger.LogInformation($"[FEE RECOVERY BOT] Found {dueInThreeDays.Count} due in 3 days, {dueTodayInvoices.Count} due today, and {overdueByFiveDays.Count} 5-days overdue.");

                // Tier 1: Day -3 Friendly advance notification
                foreach (var inv in dueInThreeDays)
                {
                    var student = await unitOfWork.Students.GetByIdAsync(inv.StudentId);
                    var user = student != null ? await unitOfWork.Users.GetByIdAsync(student.UserId) : null;
                    if (student != null && !string.IsNullOrEmpty(student.GuardianPhone))
                    {
                        var studentName = user != null ? $"{user.FirstName} {user.LastName}" : "your child";
                        var invRef = inv.Id.ToString()[..8].ToUpper();
                        var msg = $"🔔 *Fee Reminder (Due in 3 Days)*\nDear Parent, kindly note that the school fee invoice #{invRef} of Rs. {inv.Amount} for {studentName} is due on {inv.DueDate:dd/MM/yyyy}. Please ensure timely settlement to avoid late fee charges.\nThank you!";
                        await whatsappService.SendMessageAsync(student.GuardianPhone, msg, user?.SchoolId);
                    }
                }

                // Tier 2: Day 0 Due Today urgency notice
                foreach (var inv in dueTodayInvoices)
                {
                    var student = await unitOfWork.Students.GetByIdAsync(inv.StudentId);
                    var user = student != null ? await unitOfWork.Users.GetByIdAsync(student.UserId) : null;
                    if (student != null && !string.IsNullOrEmpty(student.GuardianPhone))
                    {
                        var studentName = user != null ? $"{user.FirstName} {user.LastName}" : "your child";
                        var invRef = inv.Id.ToString()[..8].ToUpper();
                        var msg = $"⚠️ *URGENT: Fee Due Today*\nDear Parent, today ({inv.DueDate:dd/MM/yyyy}) is the due date for {studentName}'s fee of Rs. {inv.Amount} (Invoice #{invRef}). Please pay online or at the school accounts desk today to avoid late fine.\nThank you!";
                        await whatsappService.SendMessageAsync(student.GuardianPhone, msg, user?.SchoolId);
                    }
                }

                // Tier 3: Day +5 Overdue Recovery Notice
                foreach (var inv in overdueByFiveDays)
                {
                    var student = await unitOfWork.Students.GetByIdAsync(inv.StudentId);
                    var user = student != null ? await unitOfWork.Users.GetByIdAsync(student.UserId) : null;
                    if (student != null && !string.IsNullOrEmpty(student.GuardianPhone))
                    {
                        var studentName = user != null ? $"{user.FirstName} {user.LastName}" : "your child";
                        var invRef = inv.Id.ToString()[..8].ToUpper();
                        var msg = $"🚨 *Fee Overdue Notice*\nDear Parent, {studentName}'s fee invoice #{invRef} of Rs. {inv.Amount} was due on {inv.DueDate:dd/MM/yyyy} and is now overdue. Applicable late fines may be added. Please settle the dues immediately at the accounts counter or online.\nThank you!";
                        await whatsappService.SendMessageAsync(student.GuardianPhone, msg, user?.SchoolId);
                    }
                }
            }
        }
    }
}
