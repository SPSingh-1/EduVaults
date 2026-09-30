# 🛡️ EduVault — Complete Blocker & Unblocker Matrix

> **Generated:** September 2026  
> **Target:** EduVault Multi-Tenant SaaS Architecture  
> **Source Verification:** ASP.NET Core Middleware, JWT Pipeline, EF Core DbContext, Express 5005, React Router Guards.

---

## 1. Executive Summary & Diagnostic Taxonomy

In an enterprise multi-tenant school management system, user interactions and system transitions are subject to layered gatekeeping. When an operation cannot proceed, it is intercepted by a **Blocker**.

This document maps all blockers identified across the EduVault codebase, categorized into **10 Architectural Layers**:
1. **AUTH**: Authentication & Token Validation
2. **ROLE**: Role-Based Authorization Guarding
3. **TENANT**: School/Tenant Boundary Isolation
4. **STATUS**: School Lifecycle & Maintenance Gates
5. **PERMISSION**: Dynamic Granular RBAC Permissions
6. **SUBSCRIPTION**: Plan Limitations & Feature Flags
7. **VALIDATION**: Request Schema & Input Integrity
8. **API**: HTTP Gateway, Timeouts, Rate Limits & Status Codes
9. **DATABASE**: Relational Integrity, Concurrency & Constraints
10. **BUSINESS**: Domain Rules & State Machine Invariants

Each blocker entry defines:
- **Blocker Key & Name**
- **Trigger Scenario (Why it happens)**
- **User Presentation (What user sees)**
- **System Failure Code**
- **Resolution / Recovery Action**
- **Unblocked Target State & Next Action**

---

## 2. Master Blocker & Unblocker Matrix

| ID | Layer | Blocker Condition | Trigger Scenario | User Presentation / UI State | HTTP / Err Code | Recovery Action | Unblocked State | Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BLK-AUTH-01** | AUTH | Missing JWT Token | User attempts to open protected route without logging in | Redirected to `/login` | Client 401 / Guard | Submit credentials on `/login` | `eduvault_token` saved in localStorage | Navigate to target role dashboard |
| **BLK-AUTH-02** | AUTH | Expired Token (TTL > 7 Days) | JWT token exceeds 7-day expiration window | Axios interceptor clears storage, redirects to `/login` with session notice | 401 Unauthorized | Re-authenticate on `/login` | Fresh JWT generated and stored | Resume application session |
| **BLK-AUTH-03** | AUTH | Corrupted / Tampered JWT | Token signature failed validation against `JWT_SECRET` | 401 Unauthorized; redirected to `/login` | 401 Invalid Signature | Clear local storage and log in again | Valid signed JWT issued | Normal API access restored |
| **BLK-AUTH-04** | AUTH | Deactivated User Account | User `IsActive == false` in database | Login error toast: *"User account is deactivated"* | 403 Forbidden | Contact School Admin or Super Admin to reactivate | `User.IsActive` set to `true` | Login succeeds |
| **BLK-AUTH-05** | AUTH | Rate Limit Exceeded (Brute Force) | >15 failed attempts in 1 min on `/api/auth/*` | Red toast: *"Too many requests. Please wait a moment before trying again."* | 429 Too Many Requests | Wait 60 seconds for rate limit window to expire | Rate limit bucket resets | Re-attempt login |
| **BLK-ROLE-01** | ROLE | Unauthorized Role Access | Teacher or Student tries to access `/super-admin/*` or `/school-admin/*` | `ProtectedRoute` redirects user to their authorized landing page | Client Router Redirect | None (access denied by design) or login with elevated account | User placed in proper role space | Access own role dashboard |
| **BLK-ROLE-02** | ROLE | Cross-Role URL Tampering | Student manually enters `/account/salaries` in browser address bar | `ProtectedRoute` redirects to `/student/dashboard` | Client Redirect | Login as School Admin or Account Manager | Authorized credentials verified | Access payroll module |
| **BLK-ROLE-03** | ROLE | Super Admin Route Impersonation | Super Admin hits `/api/academics/students` without tenant scope | API error: *"School ID missing in token"* | 401 / 500 Unauthorized | Pass `?schoolId=<guid>` query param or view via School Admin portal | Context scoped to target school | Load school student list |
| **BLK-TNT-01** | TENANT | Missing SchoolId Claim | User JWT does not contain `schoolId` claim | 401 Unauthorized: *"School ID missing in token"* | 401 Unauthorized | Ensure user is linked to a valid School in DB | School assigned to user profile | Normal tenant requests pass |
| **BLK-TNT-02** | TENANT | Cross-School Data Access | User from School A queries Entity with `SchoolId == School B` | EF Core query filter returns empty list or 404 Not Found | 404 / 403 | Query only records belonging to authenticated school | Request scoped to current school | Legitimate records returned |
| **BLK-TNT-03** | TENANT | Auxiliary Express Query Leak | Request to Express `/api/holidays` with missing `schoolId` | Unfiltered records returned across schools (Security Gap) | 200 (Leak) | Patch Express endpoint to enforce `req.user.schoolId` | Isolated per-school documents | Isolated school holidays |
| **BLK-STA-01** | STATUS | Platform Maintenance Active | Super Admin enables `PlatformSetting.MaintenanceMode` | Users redirected to `/maintenance` screen | 503 Service Unavailable | Super Admin disables Maintenance Mode in Platform Settings | `MaintenanceMode == false` | Users returned to normal dashboards |
| **BLK-STA-02** | STATUS | School Status Suspended | School `Status == "Suspended"` due to non-payment | Access blocked; warning banner shows *"Account Suspended"* | 403 Forbidden | Contact Super Admin / Renew subscription plan | Super Admin marks school *"Active"* | School unlocked |
| **BLK-STA-03** | STATUS | School Status Inactive | School `Status == "Inactive"` (Pending Verification) | Setup/Verification screen prompted | 403 Forbidden | Complete school verification with Super Admin | School status changed to *"Active"* | Full feature access granted |
| **BLK-PRM-01** | PERMISSION | Dynamic RBAC View Disabled | `SchoolRolePermission.CanView == false` for page key | Navigation item hidden from sidebar; manual URL blocked | 403 Forbidden / Hidden | School Admin opens RBAC Setup and enables `CanView` | `CanView` saved as `true` | Menu item appears in sidebar |
| **BLK-PRM-02** | PERMISSION | Create Action Denied | `SchoolRolePermission.CanCreate == false` | Add button disabled or click shows *"Action not permitted"* | 403 Forbidden | School Admin grants `CanCreate` permission for role | Permission updated | User can add new records |
| **BLK-PRM-03** | PERMISSION | Delete Action Denied | `SchoolRolePermission.CanDelete == false` | Delete button hidden or disabled | 403 Forbidden | School Admin grants `CanDelete` permission for role | Permission updated | User can delete records |
| **BLK-SUB-01** | SUBSCRIPTION | Account & HRM Module Not Enabled | `School.HasAccountModule == false` | Account Managers menu hidden; `/account/*` redirects | Client / 403 | Super Admin enables Account Module toggle for school | `HasAccountModule = true` | HRM & Finance module unlocked |
| **BLK-SUB-02** | SUBSCRIPTION | Library Module Not Enabled | `School.HasLibraryModule == false` | Library menu hidden; `/library/*` redirects | Client / 403 | Super Admin enables Library Module toggle for school | `HasLibraryModule = true` | Library portal unlocked |
| **BLK-SUB-03** | SUBSCRIPTION | Receptionist Module Not Enabled | `School.HasReceptionistModule == false` | Front Desk menu hidden; `/receptionist/*` redirects | Client / 403 | Super Admin enables Receptionist Module toggle | `HasReceptionistModule = true` | Front desk portal unlocked |
| **BLK-SUB-04** | SUBSCRIPTION | Student Capacity Limit Exceeded | Enrolled students exceed `PlatformPlan.MaxStudents` | Error modal: *"Student limit reached for current plan"* | 422 Unprocessable | Super Admin upgrades school subscription tier | `MaxStudents` increased | Additional students onboarded |
| **BLK-VAL-01** | VALIDATION | Duplicate Student Roll / Aadhaar | Onboarding student with duplicate roll number or Aadhaar hash | Form error: *"A student with this roll number or Aadhaar already exists"* | 400 Bad Request | Correct roll number or verify student record | Unique constraint satisfied | Student created successfully |
| **BLK-VAL-02** | VALIDATION | Invalid Email Format in Signup | Non-email string passed to `AdminEmail` | Red validation message under input field | Client / 400 | Enter standard format `name@school.com` | Form validation passes | Submit button enables |
| **BLK-VAL-03** | VALIDATION | CSV Import Column Header Mismatch | Uploaded CSV missing mandatory columns (`Name`, `Class`, etc.) | Error preview table highlighting unmapped columns | Client Error | Use provided CSV template from Data Import Hub | Headers match system parser | Data imported cleanly |
| **BLK-API-01** | API | .NET Backend Unreachable (Port 5265 Down) | C# API server crashed or not started | Screen displays persistent loading spinner or connection error | ERR_CONNECTION_REFUSED | Run `npm run dev:api` or `node dev.js` to start backend | API responds on `:5265` | Application loads data |
| **BLK-API-02** | API | Express Backend Unreachable (Port 5005 Down) | Express service stopped | Notifications, Remarks, or Homework fail silently | ERR_CONNECTION_REFUSED | Run `npm run dev:express` | Express responds on `:5005` | Real-time features sync |
| **BLK-API-03** | API | Public Admission Spammed (>10/hour per IP) | Rate limit triggered on `/api/public/apply` | Alert: *"Too many submissions from this network. Try again later."* | 429 Too Many Requests | Wait 1 hour or submit from distinct IP address | Rate limit window elapses | Application submitted |
| **BLK-DB-01** | DATABASE | PostgreSQL Connection Pool Exhaustion | Database credentials invalid or PostgreSQL service stopped | Generic 500 error: *"An unexpected server error occurred"* | 500 Internal Server Error | Verify `ConnectionStrings__DefaultConnection` in `.env` | DB server connection restored | Queries execute normally |
| **BLK-DB-02** | DATABASE | Foreign Key Deletion Violation | Attempting to delete Class with active Student Enrollments | Modal alert: *"Cannot delete class with active students enrolled"* | 409 Conflict | Reassign or archive students before deleting class | Zero dependent foreign records | Class deleted successfully |
| **BLK-BUS-01** | BUSINESS | Student Financial Clearance Blocked | Generating Transfer Certificate while unpaid invoices exist | Clearance modal shows unpaid fees: *"Pending dues must be settled"* | 400 Bad Request | Pay fee invoices in Counter Fee Desk or Student Portal | Dues balance reaches ₹0 | TC generated with QR code |
| **BLK-BUS-02** | BUSINESS | Attendance Already Submitted for Date | Teacher attempts to submit attendance twice on same day | Warning toast: *"Attendance already locked for this date and section"* | 400 / 409 | Request School Admin unlock or update existing attendance | Attendance unlocked for edit | Updates saved |
| **BLK-BUS-03** | BUSINESS | Marks Entry Locked / Published | Teacher attempts to edit marks after admin published results | Marks input fields rendered read-only; *"Results Published"* badge | UI Disabled / 400 | School Admin toggles `ToggleMarksPublication` to unpublish | Result publication revoked | Marks editable by teacher |
| **BLK-BUS-04** | BUSINESS | Book Copy Out of Stock | Student requests book checkout when `AvailableCopies == 0` | Button disabled: *"All copies currently issued"* | 400 Bad Request | Wait for existing borrower to return book or add copies | `AvailableCopies > 0` | Book issue transaction passes |
| **BLK-BUS-05** | BUSINESS | Gate Pass Student Not On Campus | Front desk issues exit gate pass for student marked absent | Gate pass dialog warning: *"Student is marked ABSENT today"* | Client Warning / 400 | Verify student physical presence or cancel gate pass | Physical presence verified | Exit pass generated |

---

## 3. Layer-Wise Recovery Workflows

### 3.1 Authentication & Session Recovery Flow
```
User Action on Protected Page
       │
       ▼
[Token in LocalStorage?] ─── NO ───► Redirect to /login
       │ YES
       ▼
[Token Expired / Malformed?] ─── YES ───► Clear Storage ───► Redirect to /login
       │ NO
       ▼
[Maintenance Mode Enabled?] ─── YES ───► User is not SuperAdmin/SchoolAdmin? ───► Redirect to /maintenance
       │ NO
       ▼
Render Protected View
```

### 3.2 Tenant Isolation & Scoping Flow
```
Incoming HTTP Request
       │
       ▼
Extract JWT Claims (id, role, schoolId)
       │
       ▼
[Role == "superadmin"?]
  ├── YES ──► Check Query Param "?schoolId="
  │             ├── Found: Scope database queries to target school
  │             └── Not Found: Execute platform-wide query (if permitted)
  └── NO  ──► Is schoolId valid GUID?
                ├── NO  ──► 401 Unauthorized ("School ID missing in token")
                └── YES ──► Inject global EF query filter: e.SchoolId == schoolId
                             │
                             ▼
                    Execute Scoped Query
```

### 3.3 Financial Clearance & TC Generation Flow
```
User clicks "Generate Transfer Certificate"
       │
       ▼
GET /api/academics/students/{id}/clearance
       │
       ├── Has Unpaid Invoices? (Balance > 0)
       │     └── ❌ BLOCK: Show Outstanding Invoices List ──► Collect Fees ──► Retry
       │
       ├── Has Unreturned Library Books?
       │     └── ❌ BLOCK: Show Issued Books List ──► Return Books to Library ──► Retry
       │
       └── All Dues Cleared (Balance == 0 & Zero Books Due)
             └── ✅ UNBLOCK: POST /api/academics/students/{id}/generate-tc
                   └── Success: Download Official TC PDF with Security QR
```
