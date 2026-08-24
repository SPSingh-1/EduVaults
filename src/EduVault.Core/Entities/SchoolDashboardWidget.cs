using System;

namespace EduVault.Core.Entities
{
    public class SchoolDashboardWidget
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string Role { get; set; } = string.Empty;            // "schooladmin", "teacher", "student", "accountmanager", "librarian"
        public string WidgetKey { get; set; } = string.Empty;       // maps to DashboardWidgetDefinition.WidgetKey
        public string? CustomTitle { get; set; }                    // optional school custom rename (e.g. "Weekly Student Count")
        public string TimeRange { get; set; } = "Daily";            // "Daily", "Weekly", "Monthly", "Yearly"
        public string ChartType { get; set; } = "None";             // "None" (KPI Card), "MainGraph" (Primary Dashboard Graph), "AreaChart", "BarChart"
        public bool IsEnabled { get; set; } = true;                 // true to show on dashboard, false to hide
        public int DisplayOrder { get; set; } = 1;                  // visual ordering on dashboard
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Property
        public School? School { get; set; }
    }
}
