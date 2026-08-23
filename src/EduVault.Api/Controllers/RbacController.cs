using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using EduVault.Core.Entities;
using EduVault.Core.Interfaces;

namespace EduVault.Api.Controllers
{
    [ApiController]
    [Route("api/rbac")]
    [Authorize(Roles = "superadmin")]
    public class RbacController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public RbacController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        // All page definitions (the master list of all pages in the system)
        [HttpGet("pages")]
        public async Task<IActionResult> GetPages()
        {
            var pages = await _unitOfWork.PageDefinitions.GetAllAsync();
            return Ok(pages.OrderBy(p => p.Module).ThenBy(p => p.SortOrder));
        }

        // Add a new page definition (for future custom pages)
        [HttpPost("pages")]
        public async Task<IActionResult> AddPage([FromBody] PageDefinitionInput input)
        {
            var existing = (await _unitOfWork.PageDefinitions.FindAsync(p => p.PageKey == input.PageKey)).FirstOrDefault();
            if (existing != null)
                return BadRequest(new { error = "Page key already exists" });

            var page = new PageDefinition
            {
                PageKey = input.PageKey,
                PageName = input.PageName,
                Module = input.Module,
                Icon = input.Icon,
                Route = input.Route,
                SortOrder = input.SortOrder,
                IsActive = true
            };
            await _unitOfWork.PageDefinitions.AddAsync(page);
            await _unitOfWork.CompleteAsync();
            return Ok(page);
        }

        // Get all permissions for a specific school
        [HttpGet("permissions/{schoolId}")]
        public async Task<IActionResult> GetSchoolPermissions(Guid schoolId)
        {
            var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);
            if (school == null) return NotFound(new { error = "School not found" });

            var allPages = (await _unitOfWork.PageDefinitions.GetAllAsync()).Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToList();
            var savedPerms = (await _unitOfWork.SchoolRolePermissions.FindAsync(p => p.SchoolId == schoolId)).ToList();

            var roles = new[] { "schooladmin", "teacher", "student", "accountmanager", "librarian" };
            var result = new System.Collections.Generic.Dictionary<string, object>();

            foreach (var role in roles)
            {
                var rolePages = allPages.Select(page =>
                {
                    var saved = savedPerms.FirstOrDefault(p => p.RoleName == role && p.PageDefinitionId == page.Id);
                    // Default: page is visible if its module matches the role
                    bool defaultView = IsDefaultVisible(role, page.Module);
                    return new
                    {
                        pageId = page.Id,
                        pageKey = page.PageKey,
                        pageName = page.PageName,
                        module = page.Module,
                        icon = page.Icon,
                        route = page.Route,
                        sortOrder = page.SortOrder,
                        canView   = saved?.CanView   ?? defaultView,
                        canCreate = saved?.CanCreate ?? defaultView,
                        canEdit   = saved?.CanEdit   ?? defaultView,
                        canDelete = saved?.CanDelete ?? defaultView,
                        isCustomized = saved != null
                    };
                }).ToList();
                result[role] = rolePages;
            }

            return Ok(new { schoolId, schoolName = school.Name, permissions = result });
        }

        // Get permissions for a specific school + role
        [HttpGet("permissions/{schoolId}/{role}")]
        public async Task<IActionResult> GetRolePermissions(Guid schoolId, string role)
        {
            var allPages = (await _unitOfWork.PageDefinitions.GetAllAsync()).Where(p => p.IsActive).OrderBy(p => p.SortOrder).ToList();
            var savedPerms = (await _unitOfWork.SchoolRolePermissions.FindAsync(p => p.SchoolId == schoolId && p.RoleName == role)).ToList();

            var result = allPages.Select(page =>
            {
                var saved = savedPerms.FirstOrDefault(p => p.PageDefinitionId == page.Id);
                bool defaultView = IsDefaultVisible(role, page.Module);
                return new
                {
                    pageId = page.Id,
                    pageKey = page.PageKey,
                    pageName = page.PageName,
                    module = page.Module,
                    icon = page.Icon,
                    route = page.Route,
                    canView   = saved?.CanView   ?? defaultView,
                    canCreate = saved?.CanCreate ?? defaultView,
                    canEdit   = saved?.CanEdit   ?? defaultView,
                    canDelete = saved?.CanDelete ?? defaultView
                };
            });

            return Ok(result);
        }

        // Save (upsert) permissions for a school + role — bulk
        [HttpPut("permissions/{schoolId}/{role}")]
        public async Task<IActionResult> SavePermissions(Guid schoolId, string role, [FromBody] List<PermissionInput> inputs)
        {
            var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);
            if (school == null) return NotFound(new { error = "School not found" });

            var existingPerms = (await _unitOfWork.SchoolRolePermissions.FindAsync(
                p => p.SchoolId == schoolId && p.RoleName == role)).ToList();

            foreach (var input in inputs)
            {
                var existing = existingPerms.FirstOrDefault(p => p.PageDefinitionId == input.PageId);
                if (existing != null)
                {
                    existing.CanView   = input.CanView;
                    existing.CanCreate = input.CanCreate;
                    existing.CanEdit   = input.CanEdit;
                    existing.CanDelete = input.CanDelete;
                    _unitOfWork.SchoolRolePermissions.Update(existing);
                }
                else
                {
                    var perm = new SchoolRolePermission
                    {
                        SchoolId         = schoolId,
                        RoleName         = role,
                        PageDefinitionId = input.PageId,
                        CanView          = input.CanView,
                        CanCreate        = input.CanCreate,
                        CanEdit          = input.CanEdit,
                        CanDelete        = input.CanDelete
                    };
                    await _unitOfWork.SchoolRolePermissions.AddAsync(perm);
                }
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, message = "Permissions saved. Changes take effect on next login." });
        }

        // Reset school permissions to defaults (delete all custom overrides)
        [HttpDelete("permissions/{schoolId}")]
        public async Task<IActionResult> ResetPermissions(Guid schoolId)
        {
            var perms = (await _unitOfWork.SchoolRolePermissions.FindAsync(p => p.SchoolId == schoolId)).ToList();
            foreach (var p in perms)
                _unitOfWork.SchoolRolePermissions.Remove(p);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, message = "Permissions reset to defaults." });
        }

        // Helper: default visibility by role+module
        private static bool IsDefaultVisible(string role, string module)
        {
            return (role == "schooladmin"    && module == "school_admin") ||
                   (role == "teacher"        && module == "teacher")      ||
                   (role == "student"        && module == "student")      ||
                   (role == "accountmanager" && module == "account")      ||
                   (role == "librarian"      && module == "library");
        }
    }

    public class PageDefinitionInput
    {
        public string PageKey { get; set; } = string.Empty;
        public string PageName { get; set; } = string.Empty;
        public string Module { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string Route { get; set; } = string.Empty;
        public int SortOrder { get; set; }
    }

    public class PermissionInput
    {
        public Guid PageId { get; set; }
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanDelete { get; set; }
    }
}
