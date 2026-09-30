# 🗺️ EduVault — Complete Route Inventory (Current Codebase)

> **Generated:** September 2026  
> **System:** EduVault Multi-Tenant SaaS ERP  
> **Scope:** Every client route, layout, role guard, API dependency, data dependency, and blocker/unblocker.

---

## 📑 Route Summary by Role

| Section | Layout / Area | Guard / Allowed Roles | Total Registered Routes |
| :--- | :--- | :--- | :--- |
| **1. Public / Marketing** | None (Root Public) | Anonymous / Public | 7 |
| **2. Super Admin** | `SuperAdminLayout` | `['superadmin']` | 11 |
| **3. School Admin** | `SchoolAdminLayout` | `['schooladmin']` | 19 |
| **4. Account Manager** | `AccountManagerLayout` | `['accountmanager', 'schooladmin']` | 10 |
| **5. Librarian** | `LibrarianLayout` | `['librarian', 'schooladmin']` | 6 |
| **6. Receptionist** | `ReceptionistLayout` | `['receptionist', 'schooladmin']` | 5 |
| **7. Teacher** | `TeacherLayout` | `['teacher']` | 12 |
| **8. Student** | `StudentLayout` | `['student']` | 12 |
| **9. Aliases / Wildcard** | Redirects | Public / Internal | 4 |
| **Total** | | | **86 Routes** |

---

## 1. Public & Auth Routes

### `PAGE-PUB-01` — Landing Page
- **Route:** `/`
- **Role:** Anonymous / Visitor
- **Component:** `Landing.jsx`
- **Entry Point:** Direct URL (`http://localhost:5173/`)
- **Exit Points:** `/login`, `/demo`, `/signup`, `/apply/:schoolCode`
- **APIs:** `GET /api/auth/settings`, `GET /api/auth/public-stats`
- **DB Dependencies:** `PlatformSettings`, `Schools`, `Users`, `Transactions`
- **Blockers:** Network down, backend API 500
- **Unblockers:** Refresh page, ensure .NET backend (:5265) is running

### `PAGE-PUB-02` — Login Page
- **Route:** `/login`
- **Role:** Anonymous
- **Component:** `Login.jsx`
- **Entry Point:** Navbar "Sign In", Session expiry 401 redirect, Direct URL
- **Exit Points:** Role dashboard based on role (`/super-admin/dashboard`, `/school-admin/dashboard`, etc.), `/forgot-password`, `/signup`
- **APIs:** `POST /api/auth/login`, `GET /api/auth/settings`, `GET /api/auth/school-branding?domain=`
- **DB Dependencies:** `Users`, `Schools`, `PlatformSettings`, `SchoolRolePermissions`
- **Blockers:** Invalid credentials, account deactivated (`IsActive = false`), system maintenance mode active
- **Unblockers:** Enter valid credentials, contact administrator, wait for maintenance window to finish

### `PAGE-PUB-03` — School Registration / Signup
- **Route:** `/signup`
- **Role:** Anonymous (Prospective School Owner)
- **Component:** `Signup.jsx`
- **Entry Point:** Landing page "Get Started" / "Start Free Trial"
- **Exit Points:** `/login`
- **APIs:** `POST /api/auth/register-school`
- **DB Dependencies:** `Schools`, `Users`, `Subscriptions`
- **Blockers:** Duplicate admin email, validation failure (empty school name)
- **Unblockers:** Provide unique email, complete required fields

### `PAGE-PUB-04` — Forgot Password
- **Route:** `/forgot-password`
- **Role:** Anonymous
- **Component:** `ForgotPassword.jsx`
- **Entry Point:** Login screen "Forgot password?" link
- **Exit Points:** `/login`
- **APIs:** `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
- **DB Dependencies:** `Users`, `PasswordResetTokens`
- **Blockers:** Empty email, expired reset token (15-minute TTL), token already used
- **Unblockers:** Request new reset link, enter valid token & password within 15 minutes

### `PAGE-PUB-05` — Interactive Demo Portal
- **Route:** `/demo`
- **Role:** Anonymous
- **Component:** `Demo.jsx`
- **Entry Point:** Landing page "Live Interactive Demo" button
- **Exit Points:** Role portals via demo token mock injection, `/login`
- **APIs:** `POST /api/auth/submit-inquiry`
- **DB Dependencies:** `SupportTickets`
- **Blockers:** Network failure
- **Unblockers:** Retry form submission

### `PAGE-PUB-06` — System Maintenance Screen
- **Route:** `/maintenance`
- **Role:** All users except `superadmin` and `schooladmin`
- **Component:** `Maintenance.jsx`
- **Entry Point:** Automatic redirect from `ProtectedRoute` when `PlatformSetting.MaintenanceMode == true`
- **Exit Points:** `/login` (when maintenance turned off)
- **APIs:** `GET /api/auth/settings`
- **DB Dependencies:** `PlatformSettings`
- **Blockers:** Super Admin keeps maintenance mode turned on
- **Unblockers:** Super Admin toggles Maintenance Mode off in Platform Settings

### `PAGE-PUB-07` — Public Online Student Admission Form
- **Route:** `/apply/:schoolCode`
- **Role:** Public Parent / Applicant
- **Component:** `AdmissionForm.jsx`
- **Entry Point:** Shared link from school marketing/SMS/WhatsApp
- **Exit Points:** Submission confirmation screen
- **APIs:** `GET /api/public/school/:schoolCode`, `GET /api/public/classes/:schoolCode`, `POST /api/public/apply`
- **DB Dependencies:** `Schools`, `Classes`, `AdmissionInquiries`
- **Blockers:** Invalid school code, school suspended/inactive
- **Unblockers:** Verify school code with school admin

---

## 2. Super Admin Routes (`allowedRoles: ['superadmin']`)

### `PAGE-SA-01` — Super Admin Overview Dashboard
- **Route:** `/super-admin/dashboard`
- **Role:** `superadmin`
- **Component:** `Dashboard.jsx`
- **Entry Point:** Login with `superadmin` role
- **Exit Points:** All Super Admin pages via sidebar or stat cards
- **APIs:** `GET /api/super/stats`, `GET /api/super/health-stats`, `GET /api/super/schools`, `GET /api/super/subscriptions`
- **DB Dependencies:** `Schools`, `Users`, `Subscriptions`, `Transactions`, `SupportTickets`
- **Blockers:** Missing token, expired JWT, invalid superadmin credentials
- **Unblockers:** Relogin as superadmin

### `PAGE-SA-02` — School Directory & Tenant Management
- **Route:** `/super-admin/schools`
- **Role:** `superadmin`
- **Component:** `Schools.jsx`
- **Entry Point:** Sidebar → "Schools"
- **Actions:** Create School, Edit School, Toggle Status (Active/Suspended/Pending), Configure Modules (Account/Library/Receptionist), Impersonate School Admin
- **APIs:** `GET /api/super/schools`, `POST /api/super/schools`, `PUT /api/super/schools/:id/status`, `PUT /api/super/schools/:id/modules`, `POST /api/super/impersonate-school/:schoolId`
- **DB Dependencies:** `Schools`, `Users`, `Subscriptions`
- **Blockers:** Duplicate school code, missing school name
- **Unblockers:** Provide unique school data

### `PAGE-SA-03` — School HRM & Statutory Configuration Hub
- **Route:** `/super-admin/schools/:schoolId/hrm`
- **Role:** `superadmin`
- **Component:** `SchoolHrmSettings.jsx`
- **Entry Point:** Schools table action button "⚙️ HRM Config"
- **Actions:** Manage Departments, Designations, Work Schedules, Leave Policies, Salary Components, Statutory Rules (PF, ESI, PT), Salary Preview Calculator
- **APIs:** `GET /api/super/schools/:schoolId/hrm/overview`, `POST /api/super/schools/:schoolId/hrm/departments`, `POST /api/super/schools/:schoolId/hrm/designations`, `PUT /api/super/schools/:schoolId/hrm/work-schedule`, `POST /api/super/schools/:schoolId/hrm/leave-policies`, `POST /api/super/schools/:schoolId/hrm/salary-components`, `POST /api/super/schools/:schoolId/hrm/statutory/:type`, `POST /api/super/schools/:schoolId/hrm/preview-calculation`
- **DB Dependencies:** `Schools`, `Departments`, `Designations`, `WorkSchedules`, `LeavePolicies`, `SalaryComponents`, `StatutoryConfigurations`
- **Blockers:** Invalid school ID, missing statutory threshold numbers
- **Unblockers:** Select valid school from switcher, enter numeric rates

### `PAGE-SA-04` — Super Print Master Format Studio & Gallery
- **Route:** `/super-admin/format-studio` (Alias: `/super-admin/print-gallery`)
- **Role:** `superadmin`
- **Component:** `SuperPrintGallery.jsx`
- **Entry Point:** Sidebar → "Print Format Studio"
- **Actions:** View Master Templates, Create Master Template, Delete Master Template, Push Template to Schools
- **APIs:** `GET /api/super/print-templates/masters`, `POST /api/super/print-templates`, `DELETE /api/super/print-templates/:id`, `POST /api/super/print-templates/push`
- **DB Dependencies:** `PrintTemplates`, `Schools`
- **Blockers:** Non-superadmin access
- **Unblockers:** Superadmin authorization

### `PAGE-SA-05` — Platform Subscriptions & Billing Engine
- **Route:** `/super-admin/subscriptions`
- **Role:** `superadmin`
- **Component:** `Subscriptions.jsx`
- **Entry Point:** Sidebar → "Subscriptions"
- **Actions:** Manage Platform Plans, Approve/Reject School Upgrade Requests, Create Custom Pricing
- **APIs:** `GET /api/super/subscriptions`, `GET /api/super/plans`, `POST /api/super/plans`, `PUT /api/super/plans/:id`, `GET /api/super/upgrade-requests`, `POST /api/super/upgrade-requests/:id/approve`, `POST /api/super/upgrade-requests/:id/reject`
- **DB Dependencies:** `Subscriptions`, `PlatformPlans`, `UpgradeRequests`, `Schools`
- **Blockers:** Request already resolved
- **Unblockers:** Refresh list

### `PAGE-SA-06` — Global Platform Settings & Integrations
- **Route:** `/super-admin/settings`
- **Role:** `superadmin`
- **Component:** `Settings.jsx`
- **Entry Point:** Sidebar → "Platform Settings"
- **Actions:** Update Platform Branding, Maintenance Mode Toggle, Configure Razorpay/Twilio/WhatsApp credentials, Trigger settings
- **APIs:** `GET /api/super/settings`, `POST /api/super/settings`, `POST /api/super/schools/:id/credentials/razorpay`, `POST /api/super/schools/:id/credentials/whatsapp`
- **DB Dependencies:** `PlatformSettings`, `Schools`
- **Blockers:** Missing mandatory fields (OrgName, ContactEmail)
- **Unblockers:** Fill mandatory fields

### `PAGE-SA-07` — Granular Access Control (RBAC) Studio
- **Route:** `/super-admin/access-control`
- **Role:** `superadmin`
- **Component:** `AccessControl.jsx`
- **Entry Point:** Sidebar → "Access Control (RBAC)"
- **Actions:** Customize Page Visibility (CanView, CanCreate, CanEdit, CanDelete) and Dashboard Widgets per role per school
- **APIs:** `GET /api/rbac/pages`, `GET /api/rbac/permissions/:schoolId/:role`, `PUT /api/rbac/permissions/:schoolId/:role`, `GET /api/rbac/widgets/:schoolId/:role`, `PUT /api/rbac/widgets/:schoolId/:role`
- **DB Dependencies:** `PageDefinitions`, `SchoolRolePermissions`, `DashboardWidgetDefinitions`, `SchoolDashboardWidgets`
- **Blockers:** School not selected
- **Unblockers:** Select school from top dropdown

### `PAGE-SA-08` — Global Support & Ticket Desk
- **Route:** `/super-admin/support`
- **Role:** `superadmin`
- **Component:** `Support.jsx`
- **Entry Point:** Sidebar → "Support & Help Desk"
- **Actions:** View Tickets, Resolve/Close Tickets, Reset School User Passwords
- **APIs:** `GET /api/support`, `PATCH /api/support/tickets/:id/status`, `POST /api/support/reset-password`
- **DB Dependencies:** `SupportTickets`, `Users`
- **Blockers:** Ticket already closed
- **Unblockers:** Change status filter

### `PAGE-SA-09` — Super Admin Broadcast Notices
- **Route:** `/super-admin/notices`
- **Role:** `superadmin`
- **Component:** `Notices.jsx`
- **Entry Point:** Sidebar → "Notices & Alerts"
- **Actions:** Create Global Broadcast Notice to all schools/roles
- **APIs:** `GET /api/notifications` (Express), `POST /api/notifications` (Express)
- **DB Dependencies:** `Notifications` (MongoDB)
- **Blockers:** Express service (:5005) down
- **Unblockers:** Start Express auxiliary service

---

## 3. School Admin Routes (`allowedRoles: ['schooladmin']`)

### `PAGE-SCA-01` — School Admin Overview Dashboard
- **Route:** `/school-admin/dashboard`
- **Role:** `schooladmin`
- **Component:** `Dashboard.jsx`
- **Entry Point:** Login as school admin
- **Exit Points:** All School Admin modules
- **APIs:** `GET /api/academics/stats`, `GET /api/academics/dashboard/morning-briefing`, `GET /api/academics/dashboard/dynamic-widgets`
- **DB Dependencies:** `Students`, `Teachers`, `Classes`, `Invoices`, `Attendances`, `SchoolDashboardWidgets`
- **Blockers:** School status = "Suspended", token missing
- **Unblockers:** Pay subscription / Super Admin reactivation

### `PAGE-SCA-02` — Admission Inquiries & Lead Pipeline
- **Route:** `/school-admin/admission` (Alias: `/school-admin/admissions`)
- **Role:** `schooladmin`
- **Component:** `Admissions.jsx`
- **Entry Point:** Sidebar → "Admission"
- **Actions:** View Inquiries, Update Lead Status (NEW, CONTACTED, VISITED, ADMITTED, REJECTED), Enroll Applicant into Student record, Export CSV
- **APIs:** `GET /api/receptionist/inquiries`, `PUT /api/receptionist/inquiries/:id/status`, `POST /api/receptionist/inquiries/:id/enroll`, `DELETE /api/receptionist/inquiries/:id`
- **DB Dependencies:** `AdmissionInquiries`, `Students`, `Users`
- **Blockers:** Missing class assignment during enrollment
- **Unblockers:** Assign valid Class and Section before enrollment

### `PAGE-SCA-03` — Student 360° Archive & Dossier
- **Route:** `/school-admin/student-dossier`
- **Role:** `schooladmin`
- **Component:** `StudentDossier.jsx`
- **Entry Point:** Sidebar → "Student 360° Archive"
- **Actions:** 20-year timeline drill-down: Academic Year → Class → Student List → Comprehensive Dossier with attendance, fee invoices, report cards, conduct remarks, library books
- **APIs:** `GET /api/academics/archive/years`, `GET /api/academics/archive/year-classes`, `GET /api/academics/archive/class-students`, `GET /api/academics/student-dossier?studentId=`
- **DB Dependencies:** `Students`, `Classes`, `Attendances`, `Invoices`, `ExamResults`, `LibraryTransactions`
- **Blockers:** No academic years found
- **Unblockers:** Setup academic years in Master Setup

### `PAGE-SCA-04` — Smart Data Import Hub
- **Route:** `/school-admin/data-import`
- **Role:** `schooladmin`
- **Component:** `DataImport.jsx`
- **Entry Point:** Sidebar → "Data Import Hub"
- **Actions:** Bulk import Students, Teachers, Classes, Fee Bills, Timetable Schedules via CSV/Excel with error auto-repair
- **APIs:** `POST /api/school-admin/import/students`, `POST /api/school-admin/import/teachers`, `POST /api/school-admin/import/classes`, `POST /api/school-admin/import/fees`, `POST /api/school-admin/import/timetable`, `GET /api/school-admin/import/history`
- **DB Dependencies:** `DataImportLogs`, `Students`, `Teachers`, `Classes`, `Invoices`, `TimetableItems`
- **Blockers:** Invalid column headers, corrupted CSV format
- **Unblockers:** Download demo template from `/demo-templates/`, fix formatting and re-upload

### `PAGE-SCA-05` — AI School Annual Planner
- **Route:** `/school-admin/ai-planner`
- **Role:** `schooladmin`
- **Component:** `AiPlanner.jsx`
- **Entry Point:** Sidebar → "AI School Planner"
- **Actions:** Generate Academic Calendar, Add School Events/Holidays, Broadcast Monthly Calendar to Parents via WhatsApp, AI Exam Question Paper Generator
- **APIs:** `GET /api/school-admin/plan/:academicYear`, `POST /api/school-admin/plan/generate`, `POST /api/school-admin/plan/events`, `DELETE /api/school-admin/plan/events/:id`, `POST /api/school-admin/plan/broadcast-month`, `POST /api/school-admin/plan/generate-question-paper`
- **DB Dependencies:** `SchoolPlanConfigurations`, `SchoolPlanEvents`, `AnnualSchoolPlans`
- **Blockers:** WhatsApp credentials not configured on school
- **Unblockers:** Super Admin or School Admin configures WhatsApp credentials

### `PAGE-SCA-06` — School Print Format Studio
- **Route:** `/school-admin/format-studio`
- **Role:** `schooladmin`
- **Component:** `PrintFormatStudio.jsx`
- **Entry Point:** Sidebar → "Print Format Studio"
- **Actions:** Customize Fee Receipt, Report Card, Salary Slip, Admit Card, Gate Pass, TC layouts; Switch paper sizes (Thermal 80mm, A4, Twin-Copy); Edit HTML/CSS; AI Template Generator; Set Default Template
- **APIs:** `GET /api/print-templates`, `GET /api/print-templates/:id`, `POST /api/print-templates`, `PUT /api/print-templates/:id`, `DELETE /api/print-templates/:id`, `POST /api/print-templates/:id/set-default`, `POST /api/print-templates/ai-generate`
- **DB Dependencies:** `PrintTemplates`, `Schools`
- **Blockers:** Invalid merge tag syntax
- **Unblockers:** Pick valid tags from sidebar merge tags library

### `PAGE-SCA-07` — Student Directory & Lifecycle Manager
- **Route:** `/school-admin/students`
- **Role:** `schooladmin`
- **Component:** `Students.jsx`
- **Entry Point:** Sidebar → "Students"
- **Actions:** Add Student, Edit Student, View Details, Bulk CSV Import, Academic Clearance Check, Generate Transfer Certificate (TC), Promote Student, Retain Student, Delete Student
- **APIs:** `GET /api/academics/students`, `POST /api/academics/students`, `PUT /api/academics/students/:id`, `GET /api/academics/students/:id/clearance-check`, `POST /api/academics/students/:id/generate-tc`, `POST /api/academics/students/:id/promote`, `POST /api/academics/students/:id/retain`, `DELETE /api/academics/students/:id`
- **DB Dependencies:** `Students`, `Users`, `Classes`, `Invoices`, `LibraryTransactions`
- **Blockers:** Student has unpaid fees or unreturned library books (blocked by clearance check)
- **Unblockers:** Clear fee dues at counter or return books

### `PAGE-SCA-08` — Teacher Directory & Workload Manager
- **Route:** `/school-admin/teachers`
- **Role:** `schooladmin`
- **Component:** `Teachers.jsx`
- **Entry Point:** Sidebar → "Teachers"
- **Actions:** Add Teacher, Edit Teacher, Assign Classes/Subjects, Import Teachers CSV, Delete Teacher
- **APIs:** `GET /api/academics/teachers`, `POST /api/academics/teachers`, `PUT /api/academics/teachers/:id`, `DELETE /api/academics/teachers/:id`, `POST /api/academics/teachers/import`
- **DB Dependencies:** `Teachers`, `Users`, `Classes`, `Subjects`
- **Blockers:** Duplicate email address
- **Unblockers:** Enter unique teacher email

### `PAGE-SCA-09` — Account Managers Portal Registration
- **Route:** `/school-admin/account-managers`
- **Role:** `schooladmin` (conditional: `hasAccountModule = true`)
- **Component:** `AccountManagerRegister.jsx`
- **Entry Point:** Sidebar → "Account Managers"
- **Actions:** Register new Account Manager user, View active Account Managers
- **APIs:** `POST /api/academics/register-account-manager`, `GET /api/academics/account-managers`
- **DB Dependencies:** `Users`, `AccountManagers`
- **Blockers:** Account module not granted by Super Admin
- **Unblockers:** Super Admin grants `hasAccountModule = true` in Schools table

### `PAGE-SCA-10` — Librarians Portal Registration
- **Route:** `/school-admin/librarians`
- **Role:** `schooladmin` (conditional: `hasLibraryModule = true`)
- **Component:** `LibrarianRegister.jsx`
- **Entry Point:** Sidebar → "Librarians"
- **Actions:** Register new Librarian user, View active Librarians
- **APIs:** `POST /api/academics/register-librarian`, `GET /api/academics/librarians`
- **DB Dependencies:** `Users`
- **Blockers:** Library module not enabled by Super Admin
- **Unblockers:** Super Admin grants `hasLibraryModule = true`

### `PAGE-SCA-11` — Receptionists Portal Registration
- **Route:** `/school-admin/receptionists`
- **Role:** `schooladmin` (conditional: `hasReceptionistModule = true`)
- **Component:** `ReceptionistRegister.jsx`
- **Entry Point:** Sidebar → "Receptionists"
- **Actions:** Register Front Desk / Receptionist staff, View active receptionists
- **APIs:** `POST /api/academics/register-receptionist`, `GET /api/academics/receptionists`
- **DB Dependencies:** `Users`
- **Blockers:** Duplicate email
- **Unblockers:** Use valid unique email

### `PAGE-SCA-12` — Academic Classes, Sections & Timetable Hub
- **Route:** `/school-admin/classes`
- **Role:** `schooladmin`
- **Component:** `Classes.jsx`
- **Entry Point:** Sidebar → "Classes"
- **Actions:** Create Class, Assign Class Teacher, Assign Subjects, Manage Weekly Timetable Grid, AI Timetable Auto-Generation, Substitute Teacher Reassignment, Cancel/Restore Period
- **APIs:** `GET /api/academics/classes`, `POST /api/academics/classes`, `POST /api/academics/classes/:id/assign-teacher`, `GET /api/academics/timetable/schedule/:classId`, `POST /api/academics/timetable/schedule`, `POST /api/academics/timetable/generate-ai`, `POST /api/academics/timetable/reassign/:itemId`
- **DB Dependencies:** `Classes`, `Sections`, `Subjects`, `Teachers`, `TimetablePeriods`, `TimetableItems`
- **Blockers:** Teacher clash (teacher assigned to two classes during same period)
- **Unblockers:** AI planner or manual reassignment chooses unassigned teacher

### `PAGE-SCA-13` — Fees Structures & Invoicing Engine
- **Route:** `/school-admin/fees`
- **Role:** `schooladmin`
- **Component:** `Fees.jsx`
- **Entry Point:** Sidebar → "Fees Overview"
- **Actions:** Create Fee Heads (Tuition, Transport, Exam, Annual), Set Class Amounts, Due Dates, Apply Late Fee Rules, Trigger WhatsApp Reminder, View Invoices
- **APIs:** `GET /api/billing/structures`, `POST /api/billing/structures`, `PUT /api/billing/structures/:id`, `DELETE /api/billing/structures/:id`, `GET /api/billing/invoices`, `POST /api/billing/invoices/:id/reminder`
- **DB Dependencies:** `FeeStructures`, `Invoices`, `Transactions`, `Students`
- **Blockers:** Fee structure already assigned to students cannot be deleted if transactions exist
- **Unblockers:** Deactivate structure instead of deleting

### `PAGE-SCA-14` — Examination Schedule, Marks Approval & Report Cards
- **Route:** `/school-admin/exams`
- **Role:** `schooladmin`
- **Component:** `Exams.jsx`
- **Entry Point:** Sidebar → "Exams"
- **Actions:** Schedule Exam, Set Max/Pass Marks, Publish Exam Schedule, Review Pending Teacher Marks Submissions, Approve Marks, Print Report Cards, Upload Question Papers
- **APIs:** `GET /api/exams/schedule`, `POST /api/exams/schedule`, `PUT /api/exams/schedule/:id`, `DELETE /api/exams/schedule/:id`, `POST /api/exams/schedule/publish`, `GET /api/exams/submissions/pending`, `POST /api/exams/results/approve`, `POST /api/exams/:id/upload-question-paper`
- **DB Dependencies:** `Exams`, `ExamResults`, `Classes`, `Subjects`, `Students`
- **Blockers:** Teacher marks not yet submitted
- **Unblockers:** Send alert to teacher to complete marks entry

### `PAGE-SCA-15` — Executive Analytics & Operational Reports
- **Route:** `/school-admin/reports`
- **Role:** `schooladmin`
- **Component:** `Reports.jsx`
- **Entry Point:** Sidebar → "Reports"
- **Actions:** Attendance reports, Fee collection vs outstanding, Exam pass percentage by class, Teacher workload distribution, Export CSV/PDF
- **APIs:** `GET /api/academics/stats`, `GET /api/billing/transactions`, `GET /api/exams/summary-stats`
- **DB Dependencies:** `Attendances`, `Transactions`, `ExamResults`, `Students`
- **Blockers:** None
- **Unblockers:** N/A

### `PAGE-SCA-16` — School Notices & Parent Circulars
- **Route:** `/school-admin/notices`
- **Role:** `schooladmin`
- **Component:** `Notices.jsx`
- **Entry Point:** Sidebar → "Notices"
- **Actions:** Post announcements targetable to All, Teachers, Students, or Specific Classes
- **APIs:** `GET /api/notifications` (Express), `POST /api/notifications` (Express)
- **DB Dependencies:** `Notifications` (MongoDB)
- **Blockers:** Express service offline
- **Unblockers:** Ensure Express (:5005) is active

### `PAGE-SCA-17` — School Support Tickets
- **Route:** `/school-admin/tickets`
- **Role:** `schooladmin`
- **Component:** `Tickets.jsx`
- **Entry Point:** Sidebar → "Support & Tickets"
- **Actions:** Submit ticket to Super Admin, View status of existing requests
- **APIs:** `GET /api/support`, `POST /api/support/tickets`
- **DB Dependencies:** `SupportTickets`
- **Blockers:** Empty ticket details
- **Unblockers:** Provide descriptive message

### `PAGE-SCA-18` — Master School Setup Wizard
- **Route:** `/school-admin/setup`
- **Role:** `schooladmin`
- **Component:** `Setup.jsx`
- **Entry Point:** Sidebar → "Setup"
- **Actions:** Configure Academic Years, Classes, Sections, Subjects, Rooms, Timetable Periods, Exam Types, School Capacity, Password Policies
- **APIs:** `GET /api/academics/subjects`, `POST /api/academics/subjects`, `GET /api/academics/sections`, `POST /api/academics/sections`, `GET /api/academics/rooms`, `POST /api/academics/rooms`, `GET /api/academics/timetable/periods`, `POST /api/academics/timetable/periods`, `GET /api/academics/exam-types`, `POST /api/academics/exam-types`, `GET /api/academics/capacities`, `POST /api/academics/capacities`, `GET /api/academics/settings/password-rules`, `POST /api/academics/settings/password-rules`
- **DB Dependencies:** `Subjects`, `Sections`, `Rooms`, `TimetablePeriods`, `ExamTypes`, `Capacities`, `Schools`
- **Blockers:** Deleting a Subject or Class currently assigned to active students
- **Unblockers:** Remove student assignments first

### `PAGE-SCA-19` — School Profile & Branding Customizer
- **Route:** `/school-admin/profile`
- **Role:** `schooladmin`
- **Component:** `Profile.jsx`
- **Entry Point:** Sidebar User Avatar click → "Profile"
- **Actions:** Update School Name, Contact info, Logo URL, Theme Primary Color, School Domain
- **APIs:** `GET /api/academics/admin/profile`, `PATCH /api/academics/admin/profile`
- **DB Dependencies:** `Schools`, `Users`
- **Blockers:** Invalid hex color or empty school name
- **Unblockers:** Enter valid values

---

## 4. Account Manager Routes (`allowedRoles: ['accountmanager', 'schooladmin']`)

### `PAGE-ACC-01` — Account & Finance Dashboard
- **Route:** `/account/dashboard`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `AccountDashboard.jsx`
- **APIs:** `GET /api/account/dashboard`
- **DB Dependencies:** `SalaryRecords`, `Expenses`, `Invoices`, `Employees`

### `PAGE-ACC-02` — Employee Directory & HRM Roster
- **Route:** `/account/employees`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `EmployeeDirectory.jsx`
- **APIs:** `GET /api/hrm/employees`, `POST /api/hrm/employees`, `PUT /api/hrm/employees/:id`
- **DB Dependencies:** `Employees`, `Departments`, `Designations`, `WorkSchedules`

### `PAGE-ACC-03` — Fee & Financial Rules
- **Route:** `/account/fee-rules`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `FeeRules.jsx`
- **APIs:** `GET /api/billing/rules/summary`, `PUT /api/billing/rules/late-fee`, `POST /api/billing/structures/supplementary`
- **DB Dependencies:** `FeeStructures`

### `PAGE-ACC-04` — School Billing & Fees Collection
- **Route:** `/account/billing`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `SchoolBilling.jsx`
- **APIs:** `GET /api/billing/invoices`, `POST /api/billing/pay`, `GET /api/billing/transactions`, `GET /api/billing/student-ledger?studentId=`
- **DB Dependencies:** `Invoices`, `Transactions`, `Students`

### `PAGE-ACC-05` — Staff Salaries & Payroll Processing
- **Route:** `/account/salaries`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `Salaries.jsx`
- **APIs:** `GET /api/hrm/payroll`, `POST /api/hrm/payroll/calculate`, `PUT /api/hrm/payroll/:id/finalize`, `PUT /api/hrm/payroll/:id/disburse`
- **DB Dependencies:** `Payrolls`, `PayrollItems`, `SalaryRecords`, `Attendances`

### `PAGE-ACC-06` — Salary Rules (Allowances & Deductions)
- **Route:** `/account/salary-rules`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `SalaryRules.jsx`
- **APIs:** `GET /api/account/salary-rules`, `POST /api/account/salary-rules`, `PUT /api/account/salary-rules/:id`, `DELETE /api/account/salary-rules/:id`
- **DB Dependencies:** `SalaryRules`

### `PAGE-ACC-07` — Leave Requests & Approval Desk
- **Route:** `/account/leaves`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `LeaveRequests.jsx`
- **APIs:** `GET /api/account/leave-requests`, `PUT /api/account/leave-requests/:id`
- **DB Dependencies:** `LeaveRequests`, `LeaveQuotas`, `Teachers`

### `PAGE-ACC-08` — Staff Leave Quotas (CL / ML / PL)
- **Route:** `/account/quotas`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `LeaveQuotas.jsx`
- **APIs:** `GET /api/account/quotas`, `PUT /api/account/quotas/:teacherUserId`
- **DB Dependencies:** `LeaveQuotas`, `Teachers`

### `PAGE-ACC-09` — Expenses & Voucher Management
- **Route:** `/account/expenses`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `Expenses.jsx`
- **APIs:** `GET /api/account/expenses`, `POST /api/account/expenses`, `DELETE /api/account/expenses/:id`
- **DB Dependencies:** `Expenses`

### `PAGE-ACC-10` — Account Manager Profile
- **Route:** `/account/profile`
- **Role:** `accountmanager`, `schooladmin`
- **Component:** `AccountProfile.jsx`
- **APIs:** `GET /api/academics/admin/profile`
- **DB Dependencies:** `Users`

---

## 5. Librarian Routes (`allowedRoles: ['librarian', 'schooladmin']`)

### `PAGE-LIB-01` — Library Operations Dashboard
- **Route:** `/library/dashboard`
- **Role:** `librarian`, `schooladmin`
- **Component:** `LibraryDashboard.jsx`
- **APIs:** `GET /api/library/dashboard`
- **DB Dependencies:** `Books`, `LibraryTransactions`, `LibrarySettings`

### `PAGE-LIB-02` — Book Catalog & Inventory
- **Route:** `/library/catalog`
- **Role:** `librarian`, `schooladmin`
- **Component:** `BookCatalog.jsx`
- **APIs:** `GET /api/library/books`, `POST /api/library/books`, `PUT /api/library/books/:id`, `DELETE /api/library/books/:id`, `POST /api/library/books/import`
- **DB Dependencies:** `Books`

### `PAGE-LIB-03` — Issue & Return Circulation Counter
- **Route:** `/library/issue-return`
- **Role:** `librarian`, `schooladmin`
- **Component:** `IssueReturn.jsx`
- **APIs:** `GET /api/library/members`, `GET /api/library/books`, `POST /api/library/transactions/issue`, `PUT /api/library/transactions/:id/return`
- **DB Dependencies:** `LibraryTransactions`, `Books`, `Students`, `Teachers`

### `PAGE-LIB-04` — Loan History & Overdue Fines
- **Route:** `/library/transactions`
- **Role:** `librarian`, `schooladmin`
- **Component:** `TransactionHistory.jsx`
- **APIs:** `GET /api/library/transactions`, `PUT /api/library/transactions/:id/pay-fine`
- **DB Dependencies:** `LibraryTransactions`

### `PAGE-LIB-05` — Library Settings & Loan Policies
- **Route:** `/library/settings`
- **Role:** `librarian`, `schooladmin`
- **Component:** `LibrarySettingsPage.jsx`
- **APIs:** `GET /api/library/settings`, `PUT /api/library/settings`
- **DB Dependencies:** `LibrarySettings`

### `PAGE-LIB-06` — Librarian Profile
- **Route:** `/library/profile`
- **Role:** `librarian`, `schooladmin`
- **Component:** `LibraryProfile.jsx`
- **APIs:** `GET /api/academics/admin/profile`
- **DB Dependencies:** `Users`

---

## 6. Receptionist Routes (`allowedRoles: ['receptionist', 'schooladmin']`)

### `PAGE-REC-01` — Front Desk Reception Hub
- **Route:** `/receptionist/dashboard`
- **Role:** `receptionist`, `schooladmin`
- **Component:** `FrontDeskDashboard.jsx`
- **APIs:** `GET /api/receptionist/dashboard-stats`, `GET /api/receptionist/search-student?q=`, `GET /api/receptionist/student-live-status/:studentId`
- **DB Dependencies:** `Visitors`, `GatePasses`, `AdmissionInquiries`, `Students`, `Attendances`

### `PAGE-REC-02` — Visitor Register & Badge Generation
- **Route:** `/receptionist/visitors`
- **Role:** `receptionist`, `schooladmin`
- **Component:** `VisitorRegister.jsx`
- **APIs:** `GET /api/receptionist/visitors`, `POST /api/receptionist/visitors`, `POST /api/receptionist/visitors/:id/checkout`
- **DB Dependencies:** `Visitors`

### `PAGE-REC-03` — Counter Fee Desk (Spot Cash Collection)
- **Route:** `/receptionist/fees`
- **Role:** `receptionist`, `schooladmin`
- **Component:** `CounterFeeDesk.jsx`
- **APIs:** `GET /api/receptionist/search-student?q=`, `GET /api/receptionist/student-fee-summary/:studentId`, `POST /api/receptionist/collect-spot-fee`
- **DB Dependencies:** `Invoices`, `Transactions`, `Students`

### `PAGE-REC-04` — Student & Staff Gate Pass Desk
- **Route:** `/receptionist/gatepass`
- **Role:** `receptionist`, `schooladmin`
- **Component:** `GatePassDesk.jsx`
- **APIs:** `GET /api/receptionist/gate-passes`, `POST /api/receptionist/gate-pass`
- **DB Dependencies:** `GatePasses`, `Students`

### `PAGE-REC-05` — Admission Leads & Inquiry Pipeline
- **Route:** `/receptionist/inquiries`
- **Role:** `receptionist`, `schooladmin`
- **Component:** `AdmissionLeads.jsx`
- **APIs:** `GET /api/receptionist/inquiries`, `POST /api/receptionist/inquiries`, `PUT /api/receptionist/inquiries/:id/status`, `POST /api/receptionist/inquiries/:id/enroll`
- **DB Dependencies:** `AdmissionInquiries`, `Students`, `Users`

---

## 7. Teacher Routes (`allowedRoles: ['teacher']`)

### `PAGE-TEA-01` — Teacher Dashboard
- **Route:** `/teacher/dashboard`
- **Role:** `teacher`
- **Component:** `TeacherDashboard` (in `TeacherPages.jsx`)
- **APIs:** `GET /api/academics/teacher/stats`
- **DB Dependencies:** `Teachers`, `Classes`, `Attendances`, `Exams`

### `PAGE-TEA-02` — Assigned Classes & Sections
- **Route:** `/teacher/classes`
- **Role:** `teacher`
- **Component:** `TeacherClasses`
- **APIs:** `GET /api/academics/teacher/classes`
- **DB Dependencies:** `Classes`, `Sections`, `Subjects`

### `PAGE-TEA-03` — Student Roster
- **Route:** `/teacher/students`
- **Role:** `teacher`
- **Component:** `TeacherStudents`
- **APIs:** `GET /api/academics/teacher/classes`, `GET /api/academics/students`
- **DB Dependencies:** `Students`, `Classes`

### `PAGE-TEA-04` — Student Daily Attendance Marker
- **Route:** `/teacher/attendance`
- **Role:** `teacher`
- **Component:** `Attendance`
- **APIs:** `GET /api/academics/teacher/classes`, `GET /api/academics/attendance/class/:classId?date=`, `POST /api/academics/attendance/submit`
- **DB Dependencies:** `Attendances`, `Students`

### `PAGE-TEA-05` — Teacher Self Attendance (Punch In/Out)
- **Route:** `/teacher/self-attendance`
- **Role:** `teacher`
- **Component:** `TeacherSelfAttendance`
- **APIs:** `GET /api/teacher-attendance/today`, `POST /api/teacher-attendance/punch-in`, `POST /api/teacher-attendance/punch-out`, `GET /api/teacher-attendance/my-attendance` (Express)
- **DB Dependencies:** `TeacherAttendance` (MongoDB)

### `PAGE-TEA-06` — Teacher Leave Application
- **Route:** `/teacher/leaves`
- **Role:** `teacher`
- **Component:** `TeacherLeaves`
- **APIs:** `GET /api/academics/leave/my-balance`, `GET /api/academics/leave/my-leaves`, `POST /api/academics/leave/apply`
- **DB Dependencies:** `LeaveRequests`, `LeaveQuotas`

### `PAGE-TEA-07` — Teacher Library Borrowed Books
- **Route:** `/teacher/my-books`
- **Role:** `teacher` (conditional: `hasLibraryModule = true`)
- **Component:** `TeacherLibrary`
- **APIs:** `GET /api/academics/my-library-books`
- **DB Dependencies:** `LibraryTransactions`, `Books`

### `PAGE-TEA-08` — Exam Marks Entry & Admin Submission
- **Route:** `/teacher/marks`
- **Role:** `teacher`
- **Component:** `MarksEntry`
- **APIs:** `GET /api/exams/schedule`, `GET /api/exams/classes/:classId/students`, `POST /api/exams/results/enter-marks`, `POST /api/exams/results/submit-to-admin`
- **DB Dependencies:** `Exams`, `ExamResults`, `Students`

### `PAGE-TEA-09` — Homework & Assignments Publisher
- **Route:** `/teacher/homework`
- **Role:** `teacher`
- **Component:** `Homework`
- **APIs:** `GET /api/homework`, `POST /api/homework`, `PUT /api/homework/:id/status`, `DELETE /api/homework/:id` (Express)
- **DB Dependencies:** `Homework` (MongoDB)

### `PAGE-TEA-10` — Academic Holiday Calendar
- **Route:** `/teacher/holidays`
- **Role:** `teacher`
- **Component:** `TeacherHolidays`
- **APIs:** `GET /api/holidays` (Express)
- **DB Dependencies:** `Holidays` (MongoDB)

### `PAGE-TEA-11` — Student Conduct Remarks & Feedback
- **Route:** `/teacher/remarks`
- **Role:** `teacher`
- **Component:** `Remarks`
- **APIs:** `GET /api/remarks`, `POST /api/remarks` (Express)
- **DB Dependencies:** `Remarks` (MongoDB)

### `PAGE-TEA-12` — Teacher Notices & School Bulletin
- **Route:** `/teacher/notices`
- **Role:** `teacher`
- **Component:** `TeacherNotices`
- **APIs:** `GET /api/notifications` (Express)
- **DB Dependencies:** `Notifications` (MongoDB)

### `PAGE-TEA-13` — Teacher Profile
- **Route:** `/teacher/profile`
- **Role:** `teacher`
- **Component:** `TeacherProfile`
- **APIs:** `GET /api/academics/teacher/profile`, `PATCH /api/academics/teacher/profile`
- **DB Dependencies:** `Users`, `Teachers`

---

## 8. Student & Parent Routes (`allowedRoles: ['student']`)

### `PAGE-STU-01` — Student Dashboard
- **Route:** `/student/dashboard`
- **Role:** `student`
- **Component:** `StudentDashboard` (in `StudentPages.jsx`)
- **APIs:** `GET /api/academics/student/profile`, `GET /api/exams/student/performance`, `GET /api/billing/invoices`, `GET /api/academics/student/siblings`, `POST /api/academics/student/switch-sibling/:targetStudentId`
- **DB Dependencies:** `Students`, `Invoices`, `Attendances`, `ExamResults`

### `PAGE-STU-02` — Daily Class Timetable & Schedule
- **Route:** `/student/schedule`
- **Role:** `student`
- **Component:** `StudentSchedule`
- **APIs:** `GET /api/academics/timetable/schedule/:classId`
- **DB Dependencies:** `TimetableItems`, `TimetablePeriods`

### `PAGE-STU-03` — Student Attendance History & Percentage
- **Route:** `/student/attendance`
- **Role:** `student`
- **Component:** `StudentAttendance`
- **APIs:** `GET /api/academics/attendance/my`
- **DB Dependencies:** `Attendances`

### `PAGE-STU-04` — Homework & Assignment Submissions
- **Route:** `/student/homework`
- **Role:** `student`
- **Component:** `StudentHomework`
- **APIs:** `GET /api/homework`, `PUT /api/homework/:id/student-submit`, `POST /api/homework/:id/submit-file` (Express)
- **DB Dependencies:** `Homework` (MongoDB)

### `PAGE-STU-05` — Academic Syllabus Tracker
- **Route:** `/student/syllabus`
- **Role:** `student`
- **Component:** `StudentSyllabus`
- **APIs:** `GET /api/syllabus` (Express)
- **DB Dependencies:** `Syllabus` (MongoDB)

### `PAGE-STU-06` — Student Library Loans
- **Route:** `/student/my-books`
- **Role:** `student` (conditional: `hasLibraryModule = true`)
- **Component:** `StudentLibrary`
- **APIs:** `GET /api/academics/my-library-books`
- **DB Dependencies:** `LibraryTransactions`, `Books`

### `PAGE-STU-07` — School Holidays Calendar
- **Route:** `/student/holidays`
- **Role:** `student`
- **Component:** `StudentHolidays`
- **APIs:** `GET /api/holidays` (Express)
- **DB Dependencies:** `Holidays` (MongoDB)

### `PAGE-STU-08` — Student Fees, Dues & Online Payment Gateway
- **Route:** `/student/fees`
- **Role:** `student`
- **Component:** `StudentFees`
- **APIs:** `GET /api/billing/invoices`, `POST /api/billing/create-order`, `POST /api/billing/verify-payment`
- **DB Dependencies:** `Invoices`, `Transactions`, `Schools` (Payment Gateway credentials)

### `PAGE-STU-09` — Exam Schedules & Hall Tickets
- **Route:** `/student/exams`
- **Role:** `student`
- **Component:** `StudentExams`
- **APIs:** `GET /api/exams/schedule`
- **DB Dependencies:** `Exams`, `Classes`

### `PAGE-STU-10` — Examination Results & Marksheets
- **Route:** `/student/results`
- **Role:** `student`
- **Component:** `StudentResults`
- **APIs:** `GET /api/exams/student/performance`, `GET /api/exams/student/academic-history`
- **DB Dependencies:** `ExamResults`, `Exams`

### `PAGE-STU-11` — Student Notices & Circulars
- **Route:** `/student/notices`
- **Role:** `student`
- **Component:** `StudentNotices`
- **APIs:** `GET /api/notifications` (Express)
- **DB Dependencies:** `Notifications` (MongoDB)

### `PAGE-STU-12` — Student & Parent Profile
- **Route:** `/student/profile`
- **Role:** `student`
- **Component:** `StudentProfile`
- **APIs:** `GET /api/academics/student/profile`, `PATCH /api/academics/student/profile`
- **DB Dependencies:** `Students`, `Users`
