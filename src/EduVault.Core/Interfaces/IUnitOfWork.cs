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
        IRepository<SchoolPlanConfiguration> SchoolPlanConfigurations { get; }
        IRepository<UpgradeRequest> UpgradeRequests { get; }

        // RBAC
        IRepository<PageDefinition> PageDefinitions { get; }
        IRepository<SchoolRolePermission> SchoolRolePermissions { get; }

        // HRM / Account Module & Unified HRM Engine
        IRepository<AccountManager> AccountManagers { get; }
        IRepository<SalaryRule> SalaryRules { get; }
        IRepository<LeaveQuota> LeaveQuotas { get; }
        IRepository<LeaveRequest> LeaveRequests { get; }
        IRepository<SalaryRecord> SalaryRecords { get; }
        IRepository<Expense> Expenses { get; }
        IRepository<Employee> Employees { get; }
        IRepository<TeacherProfile> TeacherProfiles { get; }
        IRepository<Designation> Designations { get; }
        IRepository<EmploymentType> EmploymentTypes { get; }
        IRepository<WorkSchedule> WorkSchedules { get; }
        IRepository<LeavePolicy> LeavePolicies { get; }
        IRepository<SalaryComponent> SalaryComponents { get; }
        IRepository<SalaryStructure> SalaryStructures { get; }
        IRepository<SalaryStructureComponent> SalaryStructureComponents { get; }
        IRepository<StatutoryConfiguration> StatutoryConfigurations { get; }
        IRepository<Payroll> Payrolls { get; }
        IRepository<PayrollItem> PayrollItems { get; }
        IRepository<PayrollSnapshot> PayrollSnapshots { get; }
        IRepository<EmployeeDocument> EmployeeDocuments { get; }

        // Library Module
        IRepository<Book> Books { get; }
        IRepository<LibrarySettings> LibrarySettings { get; }
        IRepository<LibraryTransaction> LibraryTransactions { get; }

        // Front Desk / Receptionist Module
        IRepository<VisitorEntry> Visitors { get; }
        IRepository<GatePassEntry> GatePasses { get; }
        IRepository<AdmissionInquiryEntry> AdmissionInquiries { get; }

        // Dynamic Dashboard Widgets
        IRepository<DashboardWidgetDefinition> DashboardWidgetDefinitions { get; }
        IRepository<SchoolDashboardWidget> SchoolDashboardWidgets { get; }

        // Security & Auth
        IRepository<PasswordResetToken> PasswordResetTokens { get; }

        // Print Format Templates
        IRepository<PrintTemplate> PrintTemplates { get; }

        Task<int> CompleteAsync();
    }
}
