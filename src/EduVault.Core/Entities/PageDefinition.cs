using System;

namespace EduVault.Core.Entities
{
    public class PageDefinition
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string PageKey { get; set; } = string.Empty;    // e.g. "school_admin.fees", "teacher.marks"
        public string PageName { get; set; } = string.Empty;   // e.g. "Fee Management"
        public string Module { get; set; } = string.Empty;     // "school_admin","teacher","student","account","library","custom"
        public string TargetRole { get; set; } = string.Empty; // "schooladmin", "teacher", "student", "accountmanager", "librarian"
        public string Icon { get; set; } = string.Empty;       // lucide icon name e.g. "LayoutDashboard", "Users"
        public string Route { get; set; } = string.Empty;      // e.g. "/school-admin/fees"
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public bool IsCustom { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
