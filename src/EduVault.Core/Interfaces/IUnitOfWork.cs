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
        IRepository<Enrollment> Enrollments { get; }
        IRepository<Subject> Subjects { get; }
        IRepository<ClassSubject> ClassSubjects { get; }
        IRepository<Exam> Exams { get; }
        IRepository<ExamResult> ExamResults { get; }
        IRepository<FeeStructure> FeeStructures { get; }
        IRepository<StudentInvoice> Invoices { get; }
        IRepository<PaymentTransaction> Transactions { get; }
        Task<int> CompleteAsync();
    }
}
