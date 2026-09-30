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
    public class ExamQuestionPaperAlertBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ExamQuestionPaperAlertBackgroundService> _logger;

        public ExamQuestionPaperAlertBackgroundService(
            IServiceProvider serviceProvider, 
            ILogger<ExamQuestionPaperAlertBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Exam Question Paper 5-Day Alert Service starting.");

            // Wait 10 seconds after startup before initial check
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndSendQuestionPaperAlertsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing exam question paper alerts check.");
                }

                // Run once every 12 hours
                await Task.Delay(TimeSpan.FromHours(12), stoppingToken);
            }
        }

        public async Task<int> CheckAndSendQuestionPaperAlertsAsync()
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var unitOfWork = scope.ServiceProvider.GetRequiredService<IUnitOfWork>();
                var whatsappService = scope.ServiceProvider.GetRequiredService<WhatsAppService>();

                var todayUtc = DateTime.UtcNow.Date;
                var allExams = await unitOfWork.Exams.GetAllAsync();

                // Exams without question paper within 5-day warning window (between 3 to 5 days remaining)
                var pendingExams = allExams
                    .Where(e => string.IsNullOrWhiteSpace(e.QuestionPaperUrl))
                    .Where(e => {
                        var daysLeft = (e.Date.Date - todayUtc).TotalDays;
                        return daysLeft <= 5 && daysLeft >= 3;
                    })
                    .ToList();

                _logger.LogInformation($"[QUESTION PAPER ALERT] Found {pendingExams.Count} upcoming exams within 5-day notice window with pending papers.");

                int alertsSent = 0;

                foreach (var exam in pendingExams)
                {
                    var daysLeft = (int)Math.Ceiling((exam.Date.Date - todayUtc).TotalDays);
                    var deadlineDate = exam.Date.Date.AddDays(-3);

                    // Load Subject & Class info
                    var subject = await unitOfWork.Subjects.GetByIdAsync(exam.SubjectId);
                    var cls = await unitOfWork.Classes.GetByIdAsync(exam.ClassId);
                    var subjectName = subject?.Name ?? "Subject";
                    var className = cls != null ? $"{cls.Grade} - {cls.Section}" : "Assigned Class";

                    // Find assigned subject teacher
                    var classSubjects = await unitOfWork.ClassSubjects.FindAsync(cs => cs.ClassId == exam.ClassId && cs.SubjectId == exam.SubjectId);
                    var assigned = classSubjects.FirstOrDefault(cs => cs.TeacherId.HasValue);

                    User? teacherUser = null;
                    if (assigned != null && assigned.TeacherId.HasValue)
                    {
                        teacherUser = await unitOfWork.Users.GetByIdAsync(assigned.TeacherId.Value);
                    }
                    else if (cls != null && cls.ClassTeacherId.HasValue)
                    {
                        teacherUser = await unitOfWork.Users.GetByIdAsync(cls.ClassTeacherId.Value);
                    }

                    if (teacherUser != null)
                    {
                        var teacherName = $"{teacherUser.FirstName} {teacherUser.LastName}".Trim();

                        // Try finding teacher's phone number from Employee records
                        var empRecords = await unitOfWork.Employees.FindAsync(e => e.UserId == teacherUser.Id);
                        var teacherPhone = empRecords.FirstOrDefault()?.Phone;

                        // 1. WhatsApp Alert
                        if (!string.IsNullOrWhiteSpace(teacherPhone))
                        {
                            var whatsappMsg = $"📋 *EXAM QUESTION PAPER PENDING REMINDER*\n" +
                                $"Dear {teacherName},\n" +
                                $"This is an automated notification from School Administration.\n\n" +
                                $"• *Exam:* {subjectName} ({className})\n" +
                                $"• *Exam Date:* {exam.Date:dd/MM/yyyy}\n" +
                                $"• *Time Remaining:* {daysLeft} Days\n" +
                                $"• *Submission Deadline:* {deadlineDate:dd/MM/yyyy} (Strictly 3 days prior)\n\n" +
                                $"⚠️ *Important:* Submissions will be automatically locked after {deadlineDate:dd/MM/yyyy}. Please log in to your Teacher Portal and upload the question paper immediately.";

                            try
                            {
                                await whatsappService.SendMessageAsync(teacherPhone, whatsappMsg, cls?.SchoolId);
                                _logger.LogInformation($"[QUESTION PAPER ALERT] Sent WhatsApp notice to {teacherName} ({teacherPhone}) for {subjectName}");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning($"[QUESTION PAPER ALERT] WhatsApp dispatch failed for {teacherName}: {ex.Message}");
                            }
                        }

                        // 2. In-App Notification / System Event Audit
                        try
                        {
                            var sysEvent = new SystemEvent
                            {
                                Icon = "AlertCircle",
                                Title = $"Exam Paper Pending: {subjectName}",
                                Description = $"Question paper for {subjectName} ({className}) is due in {daysLeft} days. Deadline: {deadlineDate:dd/MM/yyyy}.",
                                CreatedAt = DateTime.UtcNow
                            };
                            await unitOfWork.SystemEvents.AddAsync(sysEvent);
                            await unitOfWork.CompleteAsync();
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning($"Failed to record in-app event: {ex.Message}");
                        }

                        alertsSent++;
                    }
                }

                return alertsSent;
            }
        }
    }
}
