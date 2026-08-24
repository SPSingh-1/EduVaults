using System;
using System.Threading.Tasks;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;
using EduVault.Infrastructure.Data;

namespace EduVault.Infrastructure.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly EduVaultDbContext _context;

        public UnitOfWork(EduVaultDbContext context)
        {
            _context = context;
            Schools = new Repository<School>(_context);
            Subscriptions = new Repository<Subscription>(_context);
            Users = new Repository<User>(_context);
            Teachers = new Repository<Teacher>(_context);
            Students = new Repository<Student>(_context);
            Classes = new Repository<Class>(_context);
            EnrollmentClasses = new Repository<EnrollmentClass>(_context);
            Enrollments = new Repository<Enrollment>(_context);
            Capacities = new Repository<Capacity>(_context);
            Departments = new Repository<Department>(_context);
            Subjects = new Repository<Subject>(_context);
            ClassSubjects = new Repository<ClassSubject>(_context);
            Exams = new Repository<Exam>(_context);
            ExamResults = new Repository<ExamResult>(_context);
            FeeStructures = new Repository<FeeStructure>(_context);
            Invoices = new Repository<StudentInvoice>(_context);
            Transactions = new Repository<PaymentTransaction>(_context);
            Sections = new Repository<Section>(_context);
            Rooms = new Repository<Room>(_context);
            Attendances = new Repository<Attendance>(_context);
            PlatformSettings = new Repository<PlatformSetting>(_context);
            SupportTickets = new Repository<SupportTicket>(_context);
            KnowledgeBaseCategories = new Repository<KnowledgeBaseCategory>(_context);
            SystemEvents = new Repository<SystemEvent>(_context);
            PlatformPlans = new Repository<PlatformPlan>(_context);
            SchoolPlanConfigurations = new Repository<SchoolPlanConfiguration>(_context);
            UpgradeRequests = new Repository<UpgradeRequest>(_context);

            // RBAC
            PageDefinitions = new Repository<PageDefinition>(_context);
            SchoolRolePermissions = new Repository<SchoolRolePermission>(_context);

            // HRM / Account Module
            AccountManagers = new Repository<AccountManager>(_context);
            SalaryRules = new Repository<SalaryRule>(_context);
            LeaveQuotas = new Repository<LeaveQuota>(_context);
            LeaveRequests = new Repository<LeaveRequest>(_context);
            SalaryRecords = new Repository<SalaryRecord>(_context);
            Expenses = new Repository<Expense>(_context);

            // Library Module
            Books = new Repository<Book>(_context);
            LibrarySettings = new Repository<LibrarySettings>(_context);
            LibraryTransactions = new Repository<LibraryTransaction>(_context);

            // Dynamic Dashboard Widgets
            DashboardWidgetDefinitions = new Repository<DashboardWidgetDefinition>(_context);
            SchoolDashboardWidgets = new Repository<SchoolDashboardWidget>(_context);
        }

        public IRepository<School> Schools { get; private set; }
        public IRepository<Subscription> Subscriptions { get; private set; }
        public IRepository<User> Users { get; private set; }
        public IRepository<Teacher> Teachers { get; private set; }
        public IRepository<Student> Students { get; private set; }
        public IRepository<Class> Classes { get; private set; }
        public IRepository<EnrollmentClass> EnrollmentClasses { get; private set; }
        public IRepository<Enrollment> Enrollments { get; private set; }
        public IRepository<Capacity> Capacities { get; private set; }
        public IRepository<Department> Departments { get; private set; }
        public IRepository<Subject> Subjects { get; private set; }
        public IRepository<ClassSubject> ClassSubjects { get; private set; }
        public IRepository<Exam> Exams { get; private set; }
        public IRepository<ExamResult> ExamResults { get; private set; }
        public IRepository<FeeStructure> FeeStructures { get; private set; }
        public IRepository<StudentInvoice> Invoices { get; private set; }
        public IRepository<PaymentTransaction> Transactions { get; private set; }
        public IRepository<Section> Sections { get; private set; }
        public IRepository<Room> Rooms { get; private set; }
        public IRepository<Attendance> Attendances { get; private set; }
        public IRepository<PlatformSetting> PlatformSettings { get; private set; }
        public IRepository<SupportTicket> SupportTickets { get; private set; }
        public IRepository<KnowledgeBaseCategory> KnowledgeBaseCategories { get; private set; }
        public IRepository<SystemEvent> SystemEvents { get; private set; }
        public IRepository<PlatformPlan> PlatformPlans { get; private set; }
        public IRepository<SchoolPlanConfiguration> SchoolPlanConfigurations { get; private set; }
        public IRepository<UpgradeRequest> UpgradeRequests { get; private set; }

        // RBAC
        public IRepository<PageDefinition> PageDefinitions { get; private set; }
        public IRepository<SchoolRolePermission> SchoolRolePermissions { get; private set; }

        // HRM / Account Module
        public IRepository<AccountManager> AccountManagers { get; private set; }
        public IRepository<SalaryRule> SalaryRules { get; private set; }
        public IRepository<LeaveQuota> LeaveQuotas { get; private set; }
        public IRepository<LeaveRequest> LeaveRequests { get; private set; }
        public IRepository<SalaryRecord> SalaryRecords { get; private set; }
        public IRepository<Expense> Expenses { get; private set; }

        // Library Module
        public IRepository<Book> Books { get; private set; }
        public IRepository<LibrarySettings> LibrarySettings { get; private set; }
        public IRepository<LibraryTransaction> LibraryTransactions { get; private set; }

        // Dynamic Dashboard Widgets
        public IRepository<DashboardWidgetDefinition> DashboardWidgetDefinitions { get; private set; }
        public IRepository<SchoolDashboardWidget> SchoolDashboardWidgets { get; private set; }

        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
            GC.SuppressFinalize(this);
        }
    }
}
