using System;
using System.Collections.Generic;

namespace EduVault.Core.DTOs
{
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public UserDto User { get; set; } = new UserDto();
    }

    public class UserDto
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Avatar { get; set; } = string.Empty;
        public Guid? SchoolId { get; set; }
        public string SchoolName { get; set; } = string.Empty;
        public string LogoUrl { get; set; } = string.Empty;
        public string EmailDomain { get; set; } = string.Empty;
        public string ThemeColor { get; set; } = string.Empty;

        // Module flags (from School entity)
        public bool HasAccountModule { get; set; }
        public bool HasLibraryModule { get; set; }

        // Per-page RBAC permissions for this user's role + school
        public List<PagePermissionDto> Permissions { get; set; } = new List<PagePermissionDto>();
    }

    public class PagePermissionDto
    {
        public string PageKey { get; set; } = string.Empty;
        public string PageName { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }
}
