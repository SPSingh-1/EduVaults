using System;

namespace EduVault.Core.Entities
{
    public class PageDefinition
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string PageKey { get; set; } = string.Empty;    // e.g. "school_admin.fees"
        public string PageName { get; set; } = string.Empty;   // e.g. "Fee Management"
        public string Module { get; set; } = string.Empty;     // "school_admin","teacher","student","account","library"
        public string Icon { get; set; } = string.Empty;       // lucide icon name
        public string Route { get; set; } = string.Empty;      // e.g. "/school-admin/fees"
        public int SortOrder { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
