using System;
using System.Threading.Tasks;
using EduVault.Core.Entities;

namespace EduVault.Core.Interfaces
{
    public interface IUnitOfWork : IDisposable
    {
        IRepository<School> Schools { get; }
        IRepository<Subscription> Subscriptions { get; }
        IRepository<User> Users { get; }
        IRepository<Teacher> Teachers { get; }
        IRepository<Student> Students { get; }
        IRepository<Class> Classes { get; }
        IRepository<EnrollmentClass> EnrollmentClasses { get; }
        IRepository<Enrollment> Enrollments { get; }
        IRepository<Capacity> Capacities { get; }
        IRepository<Department> Departments { get; }
        IRepository<Subject> Subjects { get; }
        IRepository<ClassSubject> ClassSubjects { get; }
        IRepository<Exam> Exams { get; }
        IRepository<ExamResult> ExamResults { get; }
        IRepository<FeeStructure> FeeStructures { get; }
        IRepository<StudentInvoice> Invoices { get; }
        IRepository<PaymentTransaction> Transactions { get; }
        IRepository<Section> Sections { get; }
        IRepository<Room> Rooms { get; }
        IRepository<Attendance> Attendances { get; }
        IRepository<PlatformSetting> PlatformSettings { get; }
        IRepository<SupportTicket> SupportTickets { get; }
        IRepository<KnowledgeBaseCategory> KnowledgeBaseCategories { get; }
        IRepository<SystemEvent> SystemEvents { get; }
        IRepository<PlatformPlan> PlatformPlans { get; }
        Task<int> CompleteAsync();
    }
}
