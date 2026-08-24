using Microsoft.EntityFrameworkCore;
using EduVault.Core.Entities;

namespace EduVault.Infrastructure.Data
{
    public class EduVaultDbContext : DbContext
    {
        public EduVaultDbContext(DbContextOptions<EduVaultDbContext> options) : base(options)
        {
        }

        public DbSet<School> Schools { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<EnrollmentClass> EnrollmentClasses { get; set; }
        public DbSet<Enrollment> Enrollments { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<ClassSubject> ClassSubjects { get; set; }
        public DbSet<Exam> Exams { get; set; }
        public DbSet<ExamResult> ExamResults { get; set; }
        public DbSet<FeeStructure> FeeStructures { get; set; }
        public DbSet<StudentInvoice> Invoices { get; set; }
        public DbSet<PaymentTransaction> Transactions { get; set; }
        public DbSet<Section> Sections { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<TimetablePeriod> TimetablePeriods { get; set; }
        public DbSet<TimetableItem> TimetableItems { get; set; }
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<Capacity> Capacities { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<PlatformSetting> PlatformSettings { get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }
        public DbSet<KnowledgeBaseCategory> KnowledgeBaseCategories { get; set; }
        public DbSet<SystemEvent> SystemEvents { get; set; }
        public DbSet<PlatformPlan> PlatformPlans { get; set; }
        public DbSet<ExamType> ExamTypes { get; set; }
        public DbSet<SchoolPlanConfiguration> SchoolPlanConfigurations { get; set; }
        public DbSet<UpgradeRequest> UpgradeRequests { get; set; }
        public DbSet<ReportApproval> ReportApprovals { get; set; }

        // RBAC
        public DbSet<PageDefinition> PageDefinitions { get; set; }
        public DbSet<SchoolRolePermission> SchoolRolePermissions { get; set; }

        // HRM / Account Module
        public DbSet<AccountManager> AccountManagers { get; set; }
        public DbSet<SalaryRule> SalaryRules { get; set; }
        public DbSet<LeaveQuota> LeaveQuotas { get; set; }
        public DbSet<LeaveRequest> LeaveRequests { get; set; }
        public DbSet<SalaryRecord> SalaryRecords { get; set; }
        public DbSet<Expense> Expenses { get; set; }

        // Library Module
        public DbSet<Book> Books { get; set; }
        public DbSet<LibrarySettings> LibrarySettings { get; set; }
        public DbSet<LibraryTransaction> LibraryTransactions { get; set; }

        // Dynamic Dashboard Widgets & Charts
        public DbSet<DashboardWidgetDefinition> DashboardWidgetDefinitions { get; set; }
        public DbSet<SchoolDashboardWidget> SchoolDashboardWidgets { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure Attendance
            modelBuilder.Entity<Attendance>()
                .HasOne(a => a.Student)
                .WithMany()
                .HasForeignKey(a => a.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Section
            modelBuilder.Entity<Section>()
                .HasOne(s => s.School)
                .WithMany()
                .HasForeignKey(s => s.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Room
            modelBuilder.Entity<Room>()
                .HasOne(r => r.School)
                .WithMany()
                .HasForeignKey(r => r.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Capacity
            modelBuilder.Entity<Capacity>()
                .HasOne(c => c.School)
                .WithMany()
                .HasForeignKey(c => c.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure EnrollmentClass
            modelBuilder.Entity<EnrollmentClass>()
                .HasOne(ec => ec.School)
                .WithMany()
                .HasForeignKey(ec => ec.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Department
            modelBuilder.Entity<Department>()
                .HasOne(d => d.School)
                .WithMany()
                .HasForeignKey(d => d.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure ExamType
            modelBuilder.Entity<ExamType>()
                .HasOne(et => et.School)
                .WithMany()
                .HasForeignKey(et => et.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure SchoolPlanConfiguration
            modelBuilder.Entity<SchoolPlanConfiguration>()
                .HasOne(spc => spc.School)
                .WithMany()
                .HasForeignKey(spc => spc.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure UpgradeRequest
            modelBuilder.Entity<UpgradeRequest>()
                .HasOne(ur => ur.School)
                .WithMany()
                .HasForeignKey(ur => ur.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure School
            modelBuilder.Entity<School>()
                .HasIndex(s => s.SchoolCode)
                .IsUnique();

            // Configure Subscription
            modelBuilder.Entity<Subscription>()
                .HasOne(s => s.School)
                .WithMany(sc => sc.Subscriptions)
                .HasForeignKey(s => s.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure User
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasOne(u => u.School)
                .WithMany(s => s.Users)
                .HasForeignKey(u => u.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1-to-1 User <-> Teacher
            modelBuilder.Entity<Teacher>()
                .HasKey(t => t.UserId);

            modelBuilder.Entity<Teacher>()
                .HasOne(t => t.User)
                .WithOne(u => u.Teacher)
                .HasForeignKey<Teacher>(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // 1-to-1 User <-> Student
            modelBuilder.Entity<Student>()
                .HasKey(s => s.UserId);

            modelBuilder.Entity<Student>()
                .HasOne(s => s.User)
                .WithOne(u => u.Student)
                .HasForeignKey<Student>(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure Class
            modelBuilder.Entity<Class>()
                .HasOne(c => c.School)
                .WithMany(s => s.Classes)
                .HasForeignKey(c => c.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Class>()
                .HasOne(c => c.ClassTeacher)
                .WithMany(t => t.AdvisedClasses)
                .HasForeignKey(c => c.ClassTeacherId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Class>()
                .HasIndex(c => new { c.SchoolId, c.Grade, c.Section })
                .IsUnique();

            // Configure Enrollment
            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Student)
                .WithMany(s => s.Enrollments)
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Enrollment>()
                .HasOne(e => e.Class)
                .WithMany(c => c.Enrollments)
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Enrollment>()
                .HasIndex(e => new { e.StudentId, e.AcademicYear })
                .IsUnique();

            // Configure Subject
            modelBuilder.Entity<Subject>()
                .HasOne(s => s.School)
                .WithMany(sc => sc.Subjects)
                .HasForeignKey(s => s.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Subject>()
                .HasIndex(s => new { s.SchoolId, s.Code })
                .IsUnique();

            // Configure ClassSubject
            modelBuilder.Entity<ClassSubject>()
                .HasOne(cs => cs.Class)
                .WithMany(c => c.ClassSubjects)
                .HasForeignKey(cs => cs.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ClassSubject>()
                .HasOne(cs => cs.Subject)
                .WithMany(s => s.ClassSubjects)
                .HasForeignKey(cs => cs.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ClassSubject>()
                .HasOne(cs => cs.Teacher)
                .WithMany(t => t.ClassSubjects)
                .HasForeignKey(cs => cs.TeacherId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<ClassSubject>()
                .HasIndex(cs => new { cs.ClassId, cs.SubjectId })
                .IsUnique();

            // Configure Exam
            modelBuilder.Entity<Exam>()
                .HasOne(e => e.Class)
                .WithMany(c => c.Exams)
                .HasForeignKey(e => e.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Exam>()
                .HasOne(e => e.Subject)
                .WithMany(s => s.Exams)
                .HasForeignKey(e => e.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Exam>()
                .HasOne(e => e.Proctor)
                .WithMany(t => t.ProctoredExams)
                .HasForeignKey(e => e.ProctorId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure ExamResult
            modelBuilder.Entity<ExamResult>()
                .HasOne(er => er.Exam)
                .WithMany(e => e.ExamResults)
                .HasForeignKey(er => er.ExamId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ExamResult>()
                .HasOne(er => er.Student)
                .WithMany(s => s.ExamResults)
                .HasForeignKey(er => er.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ExamResult>()
                .HasIndex(er => new { er.ExamId, er.StudentId })
                .IsUnique();

            // Configure FeeStructure
            modelBuilder.Entity<FeeStructure>()
                .HasOne(fs => fs.School)
                .WithMany(s => s.FeeStructures)
                .HasForeignKey(fs => fs.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure StudentInvoice
            modelBuilder.Entity<StudentInvoice>()
                .HasOne(si => si.Student)
                .WithMany(s => s.Invoices)
                .HasForeignKey(si => si.StudentId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<StudentInvoice>()
                .HasOne(si => si.FeeStructure)
                .WithMany(fs => fs.Invoices)
                .HasForeignKey(si => si.FeeStructureId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure PaymentTransaction
            modelBuilder.Entity<PaymentTransaction>()
                .HasOne(pt => pt.Invoice)
                .WithMany(si => si.Transactions)
                .HasForeignKey(pt => pt.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<PaymentTransaction>()
                .HasIndex(pt => pt.ReferenceNumber)
                .IsUnique();

            // Configure TimetableItem relationships
            modelBuilder.Entity<TimetableItem>()
                .HasOne(ti => ti.Class)
                .WithMany()
                .HasForeignKey(ti => ti.ClassId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TimetableItem>()
                .HasOne(ti => ti.Subject)
                .WithMany()
                .HasForeignKey(ti => ti.SubjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TimetableItem>()
                .HasOne(ti => ti.Teacher)
                .WithMany()
                .HasForeignKey(ti => ti.TeacherId)
                .OnDelete(DeleteBehavior.SetNull);

            // Configure ReportApproval
            modelBuilder.Entity<ReportApproval>()
                .HasIndex(ra => new { ra.ClassId, ra.StudentId, ra.ExamType })
                .IsUnique();

            // RBAC: SchoolRolePermission
            modelBuilder.Entity<SchoolRolePermission>()
                .HasOne(p => p.School)
                .WithMany()
                .HasForeignKey(p => p.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SchoolRolePermission>()
                .HasOne(p => p.PageDefinition)
                .WithMany()
                .HasForeignKey(p => p.PageDefinitionId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SchoolRolePermission>()
                .HasIndex(p => new { p.SchoolId, p.RoleName, p.PageDefinitionId })
                .IsUnique();

            // HRM: AccountManager (1-to-1 with User)
            modelBuilder.Entity<AccountManager>()
                .HasKey(am => am.UserId);

            modelBuilder.Entity<AccountManager>()
                .HasOne(am => am.User)
                .WithMany()
                .HasForeignKey(am => am.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<AccountManager>()
                .HasOne(am => am.School)
                .WithMany()
                .HasForeignKey(am => am.SchoolId)
                .OnDelete(DeleteBehavior.Restrict);

            // HRM: SalaryRule
            modelBuilder.Entity<SalaryRule>()
                .HasOne(sr => sr.School)
                .WithMany()
                .HasForeignKey(sr => sr.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // HRM: LeaveQuota
            modelBuilder.Entity<LeaveQuota>()
                .HasOne(lq => lq.School)
                .WithMany()
                .HasForeignKey(lq => lq.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LeaveQuota>()
                .HasIndex(lq => new { lq.SchoolId, lq.TeacherUserId, lq.AcademicYear })
                .IsUnique();

            // HRM: LeaveRequest
            modelBuilder.Entity<LeaveRequest>()
                .HasOne(lr => lr.School)
                .WithMany()
                .HasForeignKey(lr => lr.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // HRM: SalaryRecord
            modelBuilder.Entity<SalaryRecord>()
                .HasOne(sal => sal.School)
                .WithMany()
                .HasForeignKey(sal => sal.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SalaryRecord>()
                .HasIndex(sal => new { sal.SchoolId, sal.TeacherUserId, sal.Month, sal.Year })
                .IsUnique();

            // HRM: Expense
            modelBuilder.Entity<Expense>()
                .HasOne(e => e.School)
                .WithMany()
                .HasForeignKey(e => e.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Library: Book
            modelBuilder.Entity<Book>()
                .HasOne(b => b.School)
                .WithMany()
                .HasForeignKey(b => b.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Library: LibrarySettings (1-per-school)
            modelBuilder.Entity<LibrarySettings>()
                .HasOne(ls => ls.School)
                .WithMany()
                .HasForeignKey(ls => ls.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<LibrarySettings>()
                .HasIndex(ls => ls.SchoolId)
                .IsUnique();

            // Library: LibraryTransaction
            modelBuilder.Entity<LibraryTransaction>()
                .HasOne(lt => lt.Book)
                .WithMany()
                .HasForeignKey(lt => lt.BookId)
                .OnDelete(DeleteBehavior.Restrict);  // don't cascade delete transactions when book deleted

            modelBuilder.Entity<LibraryTransaction>()
                .HasOne(lt => lt.School)
                .WithMany()
                .HasForeignKey(lt => lt.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            // Dynamic Dashboard Widgets
            modelBuilder.Entity<SchoolDashboardWidget>()
                .HasOne(sdw => sdw.School)
                .WithMany()
                .HasForeignKey(sdw => sdw.SchoolId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SchoolDashboardWidget>()
                .HasIndex(sdw => new { sdw.SchoolId, sdw.Role, sdw.WidgetKey })
                .IsUnique();

            modelBuilder.Entity<DashboardWidgetDefinition>()
                .HasIndex(dwd => dwd.WidgetKey)
                .IsUnique();
        }
    }
}
