using System;

namespace EduVault.Core.Entities
{
    public class DashboardWidgetDefinition
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string WidgetKey { get; set; } = string.Empty;       // e.g. "card.students_today_attendance", "card.weekly_attendance_avg"
        public string DefaultTitle { get; set; } = string.Empty;    // e.g. "Today's Attendance", "Weekly Attendance Average"
        public string MetricSource { get; set; } = string.Empty;    // "StudentAttendance", "TeacherAttendance", "FeeCollection", "SalaryDisbursed", "LibraryLoans", "ClassEnrollment", "PendingReviews", "ExpenseTotal", "CustomCount"
        public string DefaultTimeRange { get; set; } = "Daily";     // "Daily", "Weekly", "Monthly", "Yearly"
        public string ChartType { get; set; } = "None";             // "None", "AreaChart", "BarChart", "PieChart"
        public string ColorTheme { get; set; } = "blue";            // "blue", "emerald", "amber", "purple", "rose", "cyan", "indigo"
        public string IconName { get; set; } = "Users";             // Lucide icon name e.g. "Users", "DollarSign", "BookOpen", "TrendingUp"
        public string TargetRole { get; set; } = string.Empty;      // "schooladmin", "teacher", "student", "accountmanager", "librarian"
        public bool IsCustom { get; set; } = false;                 // true if created dynamically by Super Admin
        public int DisplayOrder { get; set; } = 1;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
