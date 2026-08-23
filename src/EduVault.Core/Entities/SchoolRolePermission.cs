using System;

namespace EduVault.Core.Entities
{
    public class SchoolRolePermission
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid SchoolId { get; set; }
        public string RoleName { get; set; } = string.Empty;        // "schooladmin","teacher","student","accountmanager","librarian"
        public Guid PageDefinitionId { get; set; }
        public bool CanView { get; set; } = true;                    // shows in sidebar
        public bool CanCreate { get; set; } = true;
        public bool CanEdit { get; set; } = true;
        public bool CanDelete { get; set; } = true;

        // Navigation properties
        public virtual School? School { get; set; }
        public virtual PageDefinition? PageDefinition { get; set; }
    }
}
