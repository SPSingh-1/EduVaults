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

        // =========================================================================
        // 1. PAGE DEFINITIONS & DYNAMIC MENU MANAGEMENT (CRUD)
        // =========================================================================

        [HttpGet("pages")]
        public async Task<IActionResult> GetPages()
        {
            await EnsureDefaultPagesSeededAsync();
            var pages = await _unitOfWork.PageDefinitions.GetAllAsync();
            return Ok(pages.Where(p => p.IsActive).OrderBy(p => p.Module).ThenBy(p => p.SortOrder));
        }

        [HttpPost("pages")]
        public async Task<IActionResult> AddPage([FromBody] PageDefinitionInput input)
        {
            if (string.IsNullOrWhiteSpace(input.PageName) || string.IsNullOrWhiteSpace(input.Route))
                return BadRequest(new { error = "Page name and route are required." });

            var key = string.IsNullOrWhiteSpace(input.PageKey) 
                ? $"{input.TargetRole}.{input.PageName.ToLower().Replace(" ", "_")}" 
                : input.PageKey;

            var existing = (await _unitOfWork.PageDefinitions.FindAsync(p => p.PageKey == key)).FirstOrDefault();
            if (existing != null)
                return BadRequest(new { error = "A menu page with this key already exists." });

            var page = new PageDefinition
            {
                PageKey = key,
                PageName = input.PageName,
                Module = input.Module ?? "custom",
                TargetRole = input.TargetRole ?? "schooladmin",
                Icon = string.IsNullOrWhiteSpace(input.Icon) ? "Layers" : input.Icon,
                Route = input.Route,
                SortOrder = input.SortOrder,
                IsActive = true,
                IsCustom = true,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.PageDefinitions.AddAsync(page);
            await _unitOfWork.CompleteAsync();
            return Ok(page);
        }

        [HttpPut("pages/{id}")]
        public async Task<IActionResult> UpdatePage(Guid id, [FromBody] PageDefinitionInput input)
        {
            var page = await _unitOfWork.PageDefinitions.GetByIdAsync(id);
            if (page == null) return NotFound(new { error = "Page definition not found." });

            page.PageName = input.PageName ?? page.PageName;
            page.Module = input.Module ?? page.Module;
            page.TargetRole = input.TargetRole ?? page.TargetRole;
            page.Icon = input.Icon ?? page.Icon;
            page.Route = input.Route ?? page.Route;
            page.SortOrder = input.SortOrder;

            _unitOfWork.PageDefinitions.Update(page);
            await _unitOfWork.CompleteAsync();
            return Ok(page);
        }

        [HttpDelete("pages/{id}")]
        public async Task<IActionResult> DeletePage(Guid id)
        {
            var page = await _unitOfWork.PageDefinitions.GetByIdAsync(id);
            if (page == null) return NotFound(new { error = "Page definition not found." });

            // Mark inactive or remove if custom
            if (page.IsCustom)
            {
                _unitOfWork.PageDefinitions.Remove(page);
            }
            else
            {
                page.IsActive = false;
                _unitOfWork.PageDefinitions.Update(page);
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, message = "Menu page removed." });
        }

        // =========================================================================
        // 2. PER-SCHOOL PER-ROLE MENU PERMISSIONS (RBAC)
        // =========================================================================

        [HttpGet("permissions/{schoolId}/{role}")]
        public async Task<IActionResult> GetRolePermissions(Guid schoolId, string role)
        {
            await EnsureDefaultPagesSeededAsync();
            var allPages = (await _unitOfWork.PageDefinitions.GetAllAsync()).ToList();

            // Only show screens belonging to the requested role / module
            var rolePages = allPages
                .Where(p => p.IsActive && (p.TargetRole == role || (string.IsNullOrEmpty(p.TargetRole) && IsDefaultVisible(role, p.Module))))
                .OrderBy(p => p.SortOrder)
                .ToList();

            var savedPerms = (await _unitOfWork.SchoolRolePermissions.FindAsync(p => p.SchoolId == schoolId && p.RoleName == role)).ToList();

            var result = rolePages.Select(page =>
            {
                var saved = savedPerms.FirstOrDefault(p => p.PageDefinitionId == page.Id);
                bool defaultView = savedPerms.Any() ? false : IsDefaultVisible(role, page.Module);
                return new
                {
                    pageId = page.Id,
                    pageKey = page.PageKey,
                    pageName = page.PageName,
                    module = page.Module,
                    targetRole = page.TargetRole ?? role,
                    icon = page.Icon,
                    route = page.Route,
                    isCustom = page.IsCustom,
                    canView   = saved?.CanView   ?? defaultView,
                    canCreate = saved?.CanCreate ?? defaultView,
                    canEdit   = saved?.CanEdit   ?? defaultView,
                    canDelete = saved?.CanDelete ?? defaultView
                };
            });

            return Ok(result);
        }

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
            return Ok(new { success = true, message = "Permissions saved successfully." });
        }

        [HttpDelete("permissions/{schoolId}")]
        public async Task<IActionResult> ResetPermissions(Guid schoolId)
        {
            var perms = (await _unitOfWork.SchoolRolePermissions.FindAsync(p => p.SchoolId == schoolId)).ToList();
            foreach (var p in perms)
                _unitOfWork.SchoolRolePermissions.Remove(p);
            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, message = "Permissions reset to system defaults." });
        }

        // =========================================================================
        // 3. DYNAMIC DASHBOARD CARDS & GRAPH WIDGETS (CRUD)
        // =========================================================================

        [HttpGet("widgets/{schoolId}/{role}")]
        public async Task<IActionResult> GetDashboardWidgets(Guid schoolId, string role)
        {
            await EnsureDefaultWidgetsSeededAsync();
            var allDefinitions = (await _unitOfWork.DashboardWidgetDefinitions.GetAllAsync())
                .Where(w => w.IsActive && (string.IsNullOrEmpty(w.TargetRole) || w.TargetRole == role || w.TargetRole == "all"))
                .OrderBy(w => w.DisplayOrder)
                .ToList();

            var schoolWidgets = (await _unitOfWork.SchoolDashboardWidgets.FindAsync(
                sw => sw.SchoolId == schoolId && sw.Role == role)).ToList();

            var result = allDefinitions.Select(d =>
            {
                var custom = schoolWidgets.FirstOrDefault(sw => sw.WidgetKey == d.WidgetKey);
                return new
                {
                    id = d.Id,
                    widgetKey = d.WidgetKey,
                    title = custom?.CustomTitle ?? d.DefaultTitle,
                    defaultTitle = d.DefaultTitle,
                    metricSource = d.MetricSource,
                    timeRange = custom?.TimeRange ?? d.DefaultTimeRange,
                    chartType = !string.IsNullOrEmpty(custom?.ChartType) ? custom.ChartType : d.ChartType,
                    colorTheme = d.ColorTheme,
                    iconName = d.IconName,
                    targetRole = d.TargetRole,
                    isCustom = d.IsCustom,
                    isEnabled = custom?.IsEnabled ?? true,
                    displayOrder = custom?.DisplayOrder ?? d.DisplayOrder
                };
            }).OrderBy(w => w.displayOrder).ToList();

            return Ok(result);
        }

        [HttpPost("widgets")]
        public async Task<IActionResult> AddWidgetDefinition([FromBody] DashboardWidgetInput input)
        {
            if (string.IsNullOrWhiteSpace(input.Title) || string.IsNullOrWhiteSpace(input.MetricSource))
                return BadRequest(new { error = "Title and Metric Source are required." });

            var key = string.IsNullOrWhiteSpace(input.WidgetKey)
                ? $"custom.{input.TargetRole}.{input.Title.ToLower().Replace(" ", "_")}"
                : input.WidgetKey;

            var existing = (await _unitOfWork.DashboardWidgetDefinitions.FindAsync(w => w.WidgetKey == key)).FirstOrDefault();
            if (existing != null)
                return BadRequest(new { error = "A widget with this key already exists." });

            var widget = new DashboardWidgetDefinition
            {
                WidgetKey = key,
                DefaultTitle = input.Title,
                MetricSource = input.MetricSource,
                DefaultTimeRange = input.TimeRange ?? "Daily",
                ChartType = input.ChartType ?? "None",
                ColorTheme = input.ColorTheme ?? "blue",
                IconName = input.IconName ?? "Users",
                TargetRole = input.TargetRole ?? "schooladmin",
                IsCustom = true,
                DisplayOrder = input.DisplayOrder > 0 ? input.DisplayOrder : 99,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.DashboardWidgetDefinitions.AddAsync(widget);
            await _unitOfWork.CompleteAsync();
            return Ok(widget);
        }

        [HttpPut("widgets/{schoolId}/{role}")]
        public async Task<IActionResult> SaveSchoolWidgets(Guid schoolId, string role, [FromBody] List<SchoolWidgetSaveInput> inputs)
        {
            var school = await _unitOfWork.Schools.GetByIdAsync(schoolId);
            if (school == null) return NotFound(new { error = "School not found." });

            var existing = (await _unitOfWork.SchoolDashboardWidgets.FindAsync(
                sw => sw.SchoolId == schoolId && sw.Role == role)).ToList();

            foreach (var item in inputs)
            {
                var record = existing.FirstOrDefault(e => e.WidgetKey == item.WidgetKey);
                if (record != null)
                {
                    record.CustomTitle = item.CustomTitle;
                    record.TimeRange = item.TimeRange ?? record.TimeRange;
                    record.ChartType = item.ChartType ?? record.ChartType;
                    record.IsEnabled = item.IsEnabled;
                    record.DisplayOrder = item.DisplayOrder;
                    record.UpdatedAt = DateTime.UtcNow;
                    _unitOfWork.SchoolDashboardWidgets.Update(record);
                }
                else
                {
                    var newRecord = new SchoolDashboardWidget
                    {
                        SchoolId = schoolId,
                        Role = role,
                        WidgetKey = item.WidgetKey,
                        CustomTitle = item.CustomTitle,
                        TimeRange = item.TimeRange ?? "Daily",
                        ChartType = item.ChartType ?? "None",
                        IsEnabled = item.IsEnabled,
                        DisplayOrder = item.DisplayOrder,
                        UpdatedAt = DateTime.UtcNow
                    };
                    await _unitOfWork.SchoolDashboardWidgets.AddAsync(newRecord);
                }
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, message = "Dashboard widgets configuration saved." });
        }

        [HttpDelete("widgets/{id}")]
        public async Task<IActionResult> DeleteWidget(Guid id)
        {
            var widget = await _unitOfWork.DashboardWidgetDefinitions.GetByIdAsync(id);
            if (widget == null) return NotFound(new { error = "Widget not found." });

            if (widget.IsCustom)
            {
                _unitOfWork.DashboardWidgetDefinitions.Remove(widget);
            }
            else
            {
                widget.IsActive = false;
                _unitOfWork.DashboardWidgetDefinitions.Update(widget);
            }

            await _unitOfWork.CompleteAsync();
            return Ok(new { success = true, message = "Dashboard widget removed." });
        }

        // =========================================================================
        // 4. AUTOMATIC SEEDERS
        // =========================================================================

        private async Task EnsureDefaultPagesSeededAsync()
        {
            var defaultPages = new List<PageDefinition>
            {
                // School Admin Pages
                new() { PageKey = "schooladmin.dashboard", PageName = "Dashboard", Module = "school_admin", TargetRole = "schooladmin", Icon = "LayoutDashboard", Route = "/school-admin/dashboard", SortOrder = 1 },
                new() { PageKey = "schooladmin.admission", PageName = "Admissions Inquiry", Module = "school_admin", TargetRole = "schooladmin", Icon = "UserCheck", Route = "/school-admin/admission", SortOrder = 2 },
                new() { PageKey = "schooladmin.data_import", PageName = "Data Import Hub", Module = "school_admin", TargetRole = "schooladmin", Icon = "UploadCloud", Route = "/school-admin/data-import", SortOrder = 3 },
                new() { PageKey = "schooladmin.ai_planner", PageName = "AI School Planner", Module = "school_admin", TargetRole = "schooladmin", Icon = "CalendarDays", Route = "/school-admin/ai-planner", SortOrder = 4 },
                new() { PageKey = "schooladmin.format_studio", PageName = "Print Format Studio", Module = "school_admin", TargetRole = "schooladmin", Icon = "Printer", Route = "/school-admin/format-studio", SortOrder = 5 },
                new() { PageKey = "schooladmin.students", PageName = "Students Directory", Module = "school_admin", TargetRole = "schooladmin", Icon = "Users", Route = "/school-admin/students", SortOrder = 6 },
                new() { PageKey = "schooladmin.teachers", PageName = "Teaching Faculty", Module = "school_admin", TargetRole = "schooladmin", Icon = "GraduationCap", Route = "/school-admin/teachers", SortOrder = 4 },
                new() { PageKey = "schooladmin.account_managers", PageName = "Account Managers", Module = "school_admin", TargetRole = "schooladmin", Icon = "DollarSign", Route = "/school-admin/account-managers", SortOrder = 5 },
                new() { PageKey = "schooladmin.librarians", PageName = "School Librarians", Module = "school_admin", TargetRole = "schooladmin", Icon = "BookOpen", Route = "/school-admin/librarians", SortOrder = 6 },
                new() { PageKey = "schooladmin.classes", PageName = "Class Management", Module = "school_admin", TargetRole = "schooladmin", Icon = "Building", Route = "/school-admin/classes", SortOrder = 7 },
                new() { PageKey = "schooladmin.fees", PageName = "Fee Management", Module = "school_admin", TargetRole = "schooladmin", Icon = "DollarSign", Route = "/school-admin/fees", SortOrder = 8 },
                new() { PageKey = "schooladmin.payment_reports", PageName = "Payment Reports", Module = "school_admin", TargetRole = "schooladmin", Icon = "BarChart2", Route = "/school-admin/payment-reports", SortOrder = 9 },
                new() { PageKey = "schooladmin.exams", PageName = "Examinations", Module = "school_admin", TargetRole = "schooladmin", Icon = "ClipboardList", Route = "/school-admin/exams", SortOrder = 10 },
                new() { PageKey = "schooladmin.reports", PageName = "Audit & Reports", Module = "school_admin", TargetRole = "schooladmin", Icon = "TrendingUp", Route = "/school-admin/reports", SortOrder = 10 },
                new() { PageKey = "schooladmin.notices", PageName = "Notice Board", Module = "school_admin", TargetRole = "schooladmin", Icon = "Megaphone", Route = "/school-admin/notices", SortOrder = 11 },
                new() { PageKey = "schooladmin.staff_desk", PageName = "Staff Attendance & Leave Desk", Module = "school_admin", TargetRole = "schooladmin", Icon = "UserCheck", Route = "/school-admin/staff-desk", SortOrder = 12 },
                new() { PageKey = "schooladmin.hrm", PageName = "HRM Studio", Module = "school_admin", TargetRole = "schooladmin", Icon = "Briefcase", Route = "/school-admin/hrm", SortOrder = 13 },
                new() { PageKey = "schooladmin.setup", PageName = "School Settings", Module = "school_admin", TargetRole = "schooladmin", Icon = "Sliders", Route = "/school-admin/setup", SortOrder = 14 },

                // Teacher Pages
                new() { PageKey = "teacher.dashboard", PageName = "Dashboard", Module = "teacher", TargetRole = "teacher", Icon = "LayoutDashboard", Route = "/teacher/dashboard", SortOrder = 1 },
                new() { PageKey = "teacher.classes", PageName = "My Classes", Module = "teacher", TargetRole = "teacher", Icon = "Building", Route = "/teacher/classes", SortOrder = 2 },
                new() { PageKey = "teacher.students", PageName = "Students", Module = "teacher", TargetRole = "teacher", Icon = "Users", Route = "/teacher/students", SortOrder = 3 },
                new() { PageKey = "teacher.attendance", PageName = "Class Attendance", Module = "teacher", TargetRole = "teacher", Icon = "CheckSquare", Route = "/teacher/attendance", SortOrder = 4 },
                new() { PageKey = "teacher.self_attendance", PageName = "My Attendance", Module = "teacher", TargetRole = "teacher", Icon = "Calendar", Route = "/teacher/self-attendance", SortOrder = 5 },
                new() { PageKey = "teacher.leaves", PageName = "My Leaves", Module = "teacher", TargetRole = "teacher", Icon = "CalendarCheck", Route = "/teacher/leaves", SortOrder = 6 },
                new() { PageKey = "teacher.books", PageName = "My Library Books", Module = "teacher", TargetRole = "teacher", Icon = "BookOpen", Route = "/teacher/my-books", SortOrder = 7 },
                new() { PageKey = "teacher.marks", PageName = "Marks Entry", Module = "teacher", TargetRole = "teacher", Icon = "Edit", Route = "/teacher/marks", SortOrder = 8 },
                new() { PageKey = "teacher.homework", PageName = "Homework", Module = "teacher", TargetRole = "teacher", Icon = "PenTool", Route = "/teacher/homework", SortOrder = 9 },
                new() { PageKey = "teacher.holidays", PageName = "Holiday Calendar", Module = "teacher", TargetRole = "teacher", Icon = "CalendarDays", Route = "/teacher/holidays", SortOrder = 10 },
                new() { PageKey = "teacher.notices", PageName = "Notices", Module = "teacher", TargetRole = "teacher", Icon = "Megaphone", Route = "/teacher/notices", SortOrder = 11 },

                // Student Pages
                new() { PageKey = "student.dashboard", PageName = "Dashboard", Module = "student", TargetRole = "student", Icon = "LayoutDashboard", Route = "/student/dashboard", SortOrder = 1 },
                new() { PageKey = "student.schedule", PageName = "Daily Schedule", Module = "student", TargetRole = "student", Icon = "Calendar", Route = "/student/schedule", SortOrder = 2 },
                new() { PageKey = "student.attendance", PageName = "Attendance", Module = "student", TargetRole = "student", Icon = "CheckSquare", Route = "/student/attendance", SortOrder = 3 },
                new() { PageKey = "student.homework", PageName = "Homework", Module = "student", TargetRole = "student", Icon = "PenTool", Route = "/student/homework", SortOrder = 4 },
                new() { PageKey = "student.syllabus", PageName = "Syllabus", Module = "student", TargetRole = "student", Icon = "BookOpen", Route = "/student/syllabus", SortOrder = 5 },
                new() { PageKey = "student.books", PageName = "My Library Books", Module = "student", TargetRole = "student", Icon = "BookOpen", Route = "/student/my-books", SortOrder = 6 },
                new() { PageKey = "student.fees", PageName = "Fees & Invoices", Module = "student", TargetRole = "student", Icon = "DollarSign", Route = "/student/fees", SortOrder = 7 },
                new() { PageKey = "student.exams", PageName = "Exam Timetable", Module = "student", TargetRole = "student", Icon = "ClipboardList", Route = "/student/exams", SortOrder = 8 },
                new() { PageKey = "student.results", PageName = "Exam Results", Module = "student", TargetRole = "student", Icon = "Award", Route = "/student/results", SortOrder = 9 },
                new() { PageKey = "student.notices", PageName = "School Notices", Module = "student", TargetRole = "student", Icon = "Megaphone", Route = "/student/notices", SortOrder = 10 },

                // Account Manager Pages
                new() { PageKey = "account.dashboard", PageName = "Dashboard", Module = "account", TargetRole = "accountmanager", Icon = "LayoutDashboard", Route = "/account/dashboard", SortOrder = 1 },
                new() { PageKey = "account.hrm", PageName = "Enterprise HRM Studio", Module = "account", TargetRole = "accountmanager", Icon = "Briefcase", Route = "/account/hrm", SortOrder = 2 },
                new() { PageKey = "account.employees", PageName = "Staff & Employees", Module = "account", TargetRole = "accountmanager", Icon = "Users", Route = "/account/employees", SortOrder = 3 },
                new() { PageKey = "account.salaries", PageName = "Teacher Payroll & Salaries", Module = "account", TargetRole = "accountmanager", Icon = "DollarSign", Route = "/account/salaries", SortOrder = 4 },
                new() { PageKey = "account.salary_rules", PageName = "Salary Rules (HRA/PF)", Module = "account", TargetRole = "accountmanager", Icon = "Sliders", Route = "/account/salary-rules", SortOrder = 5 },
                new() { PageKey = "account.leaves", PageName = "Teacher Leave Approvals", Module = "account", TargetRole = "accountmanager", Icon = "CalendarCheck", Route = "/account/leaves", SortOrder = 6 },
                new() { PageKey = "account.quotas", PageName = "Annual Leave Quotas", Module = "account", TargetRole = "accountmanager", Icon = "Clock", Route = "/account/quotas", SortOrder = 7 },
                new() { PageKey = "account.fee_rules", PageName = "Fee & Financial Rules", Module = "account", TargetRole = "accountmanager", Icon = "Sliders", Route = "/account/fee-rules", SortOrder = 8 },
                new() { PageKey = "account.billing", PageName = "School Billing & Fees", Module = "account", TargetRole = "accountmanager", Icon = "DollarSign", Route = "/account/billing", SortOrder = 9 },
                new() { PageKey = "account.expenses", PageName = "Expense Vouchers", Module = "account", TargetRole = "accountmanager", Icon = "CreditCard", Route = "/account/expenses", SortOrder = 10 },

                // Librarian Pages
                new() { PageKey = "library.dashboard", PageName = "Dashboard", Module = "library", TargetRole = "librarian", Icon = "LayoutDashboard", Route = "/library/dashboard", SortOrder = 1 },
                new() { PageKey = "library.catalog", PageName = "Book Catalog", Module = "library", TargetRole = "librarian", Icon = "BookOpen", Route = "/library/catalog", SortOrder = 2 },
                new() { PageKey = "library.issue_return", PageName = "Issue & Return", Module = "library", TargetRole = "librarian", Icon = "BookOpen", Route = "/library/issue-return", SortOrder = 3 },
                new() { PageKey = "library.transactions", PageName = "Loan History", Module = "library", TargetRole = "librarian", Icon = "History", Route = "/library/transactions", SortOrder = 4 },
                new() { PageKey = "library.settings", PageName = "Fine & Loan Rules", Module = "library", TargetRole = "librarian", Icon = "Sliders", Route = "/library/settings", SortOrder = 5 },
            };

            var existingPages = (await _unitOfWork.PageDefinitions.GetAllAsync()).ToList();
            bool modified = false;

            foreach (var ep in existingPages)
            {
                if (string.IsNullOrEmpty(ep.TargetRole))
                {
                    if (ep.Module == "school_admin" || ep.PageKey.StartsWith("schooladmin")) ep.TargetRole = "schooladmin";
                    else if (ep.Module == "teacher" || ep.PageKey.StartsWith("teacher")) ep.TargetRole = "teacher";
                    else if (ep.Module == "student" || ep.PageKey.StartsWith("student")) ep.TargetRole = "student";
                    else if (ep.Module == "account" || ep.PageKey.StartsWith("account")) ep.TargetRole = "accountmanager";
                    else if (ep.Module == "library" || ep.PageKey.StartsWith("library")) ep.TargetRole = "librarian";
                    else ep.TargetRole = "schooladmin";
                    _unitOfWork.PageDefinitions.Update(ep);
                    modified = true;
                }

                // Fix any routes created with space instead of hyphen
                if (ep.Route.Contains("school admin") || ep.Route.Contains("school_admin"))
                {
                    ep.Route = ep.Route.Replace("school admin", "school-admin").Replace("school_admin", "school-admin");
                    _unitOfWork.PageDefinitions.Update(ep);
                    modified = true;
                }
            }

            foreach (var p in defaultPages)
            {
                var existing = existingPages.FirstOrDefault(ep => ep.PageKey == p.PageKey);
                if (existing == null)
                {
                    await _unitOfWork.PageDefinitions.AddAsync(p);
                    modified = true;
                }
                else if (!existing.IsActive)
                {
                    existing.IsActive = true;
                    _unitOfWork.PageDefinitions.Update(existing);
                    modified = true;
                }
            }

            if (modified) await _unitOfWork.CompleteAsync();
        }

        private async Task EnsureDefaultWidgetsSeededAsync()
        {
            var defaultWidgets = new List<DashboardWidgetDefinition>
            {
                // School Admin KPI Cards
                new() { WidgetKey = "card.admin.students_attendance", DefaultTitle = "Today's Student Attendance", MetricSource = "StudentAttendance", DefaultTimeRange = "Daily", ColorTheme = "blue", IconName = "Users", TargetRole = "schooladmin", DisplayOrder = 1 },
                new() { WidgetKey = "card.admin.teachers_attendance", DefaultTitle = "Today's Teacher Attendance", MetricSource = "TeacherAttendance", DefaultTimeRange = "Daily", ColorTheme = "emerald", IconName = "GraduationCap", TargetRole = "schooladmin", DisplayOrder = 2 },
                new() { WidgetKey = "card.admin.fees_collection", DefaultTitle = "Monthly Fee Collection", MetricSource = "FeeCollection", DefaultTimeRange = "Monthly", ColorTheme = "amber", IconName = "DollarSign", TargetRole = "schooladmin", DisplayOrder = 3 },
                new() { WidgetKey = "card.admin.total_classes", DefaultTitle = "Total Active Classes", MetricSource = "ClassEnrollment", DefaultTimeRange = "Daily", ColorTheme = "purple", IconName = "Building", TargetRole = "schooladmin", DisplayOrder = 4 },
                new() { WidgetKey = "chart.admin.attendance_trend", DefaultTitle = "Attendance Trend (Weekly)", MetricSource = "StudentAttendance", DefaultTimeRange = "Weekly", ChartType = "AreaChart", ColorTheme = "emerald", IconName = "TrendingUp", TargetRole = "schooladmin", DisplayOrder = 5 },
                new() { WidgetKey = "chart.admin.fee_collection", DefaultTitle = "Fee Collection Trend (6 Months)", MetricSource = "FeeCollection", DefaultTimeRange = "Monthly", ChartType = "BarChart", ColorTheme = "blue", IconName = "DollarSign", TargetRole = "schooladmin", DisplayOrder = 6 },

                // Teacher KPI Cards
                new() { WidgetKey = "card.teacher.class_attendance", DefaultTitle = "Class Attendance Today", MetricSource = "StudentAttendance", DefaultTimeRange = "Daily", ColorTheme = "emerald", IconName = "Users", TargetRole = "teacher", DisplayOrder = 1 },
                new() { WidgetKey = "card.teacher.assigned_classes", DefaultTitle = "My Assigned Classes", MetricSource = "ClassEnrollment", DefaultTimeRange = "Daily", ColorTheme = "blue", IconName = "Building", TargetRole = "teacher", DisplayOrder = 2 },
                new() { WidgetKey = "card.teacher.pending_reviews", DefaultTitle = "Pending Reviews / Homework", MetricSource = "PendingReviews", DefaultTimeRange = "Daily", ColorTheme = "amber", IconName = "ClipboardList", TargetRole = "teacher", DisplayOrder = 3 },
                new() { WidgetKey = "card.teacher.salary_payout", DefaultTitle = "Monthly Base Salary", MetricSource = "SalaryDisbursed", DefaultTimeRange = "Monthly", ColorTheme = "purple", IconName = "DollarSign", TargetRole = "teacher", DisplayOrder = 4 },
                new() { WidgetKey = "chart.teacher.attendance_trend", DefaultTitle = "7-Day Class Attendance Trend", MetricSource = "StudentAttendance", DefaultTimeRange = "Weekly", ChartType = "AreaChart", ColorTheme = "emerald", IconName = "TrendingUp", TargetRole = "teacher", DisplayOrder = 5 },
                new() { WidgetKey = "chart.teacher.salary_history", DefaultTitle = "Monthly Salary History", MetricSource = "SalaryDisbursed", DefaultTimeRange = "Monthly", ChartType = "AreaChart", ColorTheme = "emerald", IconName = "DollarSign", TargetRole = "teacher", DisplayOrder = 6 },

                // Account Manager KPI Cards
                new() { WidgetKey = "card.account.salaries_disbursed", DefaultTitle = "Salaries Disbursed", MetricSource = "SalaryDisbursed", DefaultTimeRange = "Monthly", ColorTheme = "purple", IconName = "DollarSign", TargetRole = "accountmanager", DisplayOrder = 1 },
                new() { WidgetKey = "card.account.fees_collected", DefaultTitle = "Fees Collected", MetricSource = "FeeCollection", DefaultTimeRange = "Monthly", ColorTheme = "emerald", IconName = "DollarSign", TargetRole = "accountmanager", DisplayOrder = 2 },
                new() { WidgetKey = "card.account.expenses_total", DefaultTitle = "School Expenses", MetricSource = "ExpenseTotal", DefaultTimeRange = "Monthly", ColorTheme = "rose", IconName = "DollarSign", TargetRole = "accountmanager", DisplayOrder = 3 },
                new() { WidgetKey = "card.account.pending_leaves", DefaultTitle = "Pending Leave Requests", MetricSource = "PendingReviews", DefaultTimeRange = "Daily", ColorTheme = "amber", IconName = "CalendarCheck", TargetRole = "accountmanager", DisplayOrder = 4 },

                // Librarian KPI Cards
                new() { WidgetKey = "card.library.total_books", DefaultTitle = "Total Book Inventory", MetricSource = "LibraryLoans", DefaultTimeRange = "Daily", ColorTheme = "cyan", IconName = "BookOpen", TargetRole = "librarian", DisplayOrder = 1 },
                new() { WidgetKey = "card.library.active_loans", DefaultTitle = "Active Book Loans", MetricSource = "LibraryLoans", DefaultTimeRange = "Daily", ColorTheme = "blue", IconName = "BookOpen", TargetRole = "librarian", DisplayOrder = 2 },
                new() { WidgetKey = "card.library.overdue_books", DefaultTitle = "Overdue Books", MetricSource = "LibraryLoans", DefaultTimeRange = "Daily", ColorTheme = "amber", IconName = "AlertTriangle", TargetRole = "librarian", DisplayOrder = 3 },
                new() { WidgetKey = "card.library.fines_collected", DefaultTitle = "Fines Collected", MetricSource = "LibraryLoans", DefaultTimeRange = "Monthly", ColorTheme = "emerald", IconName = "DollarSign", TargetRole = "librarian", DisplayOrder = 4 }
            };

            var existing = (await _unitOfWork.DashboardWidgetDefinitions.GetAllAsync()).ToList();
            bool modified = false;

            foreach (var w in defaultWidgets)
            {
                if (!existing.Any(e => e.WidgetKey == w.WidgetKey))
                {
                    await _unitOfWork.DashboardWidgetDefinitions.AddAsync(w);
                    modified = true;
                }
            }

            if (modified) await _unitOfWork.CompleteAsync();
        }

        private static bool IsDefaultVisible(string role, string module)
        {
            if (string.IsNullOrEmpty(role) || string.IsNullOrEmpty(module)) return false;
            var r = role.ToLower().Trim();
            var m = module.ToLower().Trim();
            return (r == "schooladmin"    && (m == "school_admin" || m == "schooladmin")) ||
                   (r == "teacher"        && m == "teacher")                              ||
                   (r == "student"        && m == "student")                              ||
                   (r == "accountmanager" && (m == "account" || m == "hrm"))              ||
                   (r == "librarian"      && (m == "library" || m == "librarian"));
        }
    }

    public class PageDefinitionInput
    {
        public string? PageKey { get; set; }
        public string PageName { get; set; } = string.Empty;
        public string? Module { get; set; }
        public string? TargetRole { get; set; }
        public string? Icon { get; set; }
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

    public class DashboardWidgetInput
    {
        public string? WidgetKey { get; set; }
        public string Title { get; set; } = string.Empty;
        public string MetricSource { get; set; } = string.Empty;
        public string? TimeRange { get; set; }
        public string? ChartType { get; set; }
        public string? ColorTheme { get; set; }
        public string? IconName { get; set; }
        public string? TargetRole { get; set; }
        public int DisplayOrder { get; set; }
    }

    public class SchoolWidgetSaveInput
    {
        public string WidgetKey { get; set; } = string.Empty;
        public string? CustomTitle { get; set; }
        public string? TimeRange { get; set; }
        public string? ChartType { get; set; }
        public bool IsEnabled { get; set; } = true;
        public int DisplayOrder { get; set; } = 1;
    }
}
