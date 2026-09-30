using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using EduVault.Infrastructure.Data;

namespace EduVault.Api.Services
{
    public class AdmissionCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AdmissionCleanupService> _logger;

        public AdmissionCleanupService(IServiceProvider serviceProvider, ILogger<AdmissionCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[AdmissionCleanupService] Background cleanup worker initialized.");

            // Run once on startup after 30 seconds delay, then every 24 hours
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<EduVaultDbContext>();

                    var honeypotCutoff = DateTime.UtcNow.AddDays(-1); // Delete bots older than 24h
                    var staleCutoff = DateTime.UtcNow.AddDays(-90);   // Delete unhandled leads older than 90d

                    var honeypotDeleted = await db.AdmissionInquiries
                        .Where(a => a.IsHoneypotFlagged && a.CreatedAt < honeypotCutoff)
                        .ExecuteDeleteAsync(stoppingToken);

                    var staleDeleted = await db.AdmissionInquiries
                        .Where(a => a.Status == "Lost" && a.CreatedAt < staleCutoff)
                        .ExecuteDeleteAsync(stoppingToken);

                    if (honeypotDeleted > 0 || staleDeleted > 0)
                    {
                        _logger.LogInformation($"[AdmissionCleanupService] Purged {honeypotDeleted} bot/honeypot entries and {staleDeleted} stale lost inquiries.");
                    }
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "[AdmissionCleanupService] Error executing periodic cleanup.");
                }

                // Wait 24 hours
                await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
            }
        }
    }
}
