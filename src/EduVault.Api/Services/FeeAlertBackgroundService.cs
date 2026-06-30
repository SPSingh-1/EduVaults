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
                var tenDaysFromNow = todayUtc.AddDays(10);
                var oneDayFromNow = todayUtc.AddDays(1);

                var dueInTenDays = invoices.Where(i => i.DueDate.Date == tenDaysFromNow).ToList();
                var dueInOneDay = invoices.Where(i => i.DueDate.Date == oneDayFromNow).ToList();

                _logger.LogInformation($"Found {dueInTenDays.Count} invoices due in 10 days, and {dueInOneDay.Count} due in 1 day.");

                foreach (var inv in dueInTenDays)
                {
                    var student = await unitOfWork.Students.GetByIdAsync(inv.StudentId);
                    var user = student != null ? await unitOfWork.Users.GetByIdAsync(student.UserId) : null;
                    if (student != null && !string.IsNullOrEmpty(student.GuardianPhone))
                    {
                        var studentName = user != null ? $"{user.FirstName} {user.LastName}" : "your child";
                        var msg = $"Dear Parent, this is a reminder that the school fee of Rs. {inv.Amount} for {studentName} is due in 10 days ({inv.DueDate:yyyy-MM-dd}). Please pay on time. Thank you!";
                        await whatsappService.SendMessageAsync(student.GuardianPhone, msg, user?.SchoolId);
                    }
                }

                foreach (var inv in dueInOneDay)
                {
                    var student = await unitOfWork.Students.GetByIdAsync(inv.StudentId);
                    var user = student != null ? await unitOfWork.Users.GetByIdAsync(student.UserId) : null;
                    if (student != null && !string.IsNullOrEmpty(student.GuardianPhone))
                    {
                        var studentName = user != null ? $"{user.FirstName} {user.LastName}" : "your child";
                        var msg = $"Dear Parent, URGENT reminder: the school fee of Rs. {inv.Amount} for {studentName} is due tomorrow ({inv.DueDate:yyyy-MM-dd}). Please submit it to avoid overdue penalties. Thank you!";
                        await whatsappService.SendMessageAsync(student.GuardianPhone, msg, user?.SchoolId);
                    }
                }
            }
        }
    }
}
