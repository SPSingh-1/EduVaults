# 🚨 EduVault — Flow Gaps, Broken Integrations, and Architectural Anomalies

> **Generated:** September 2026  
> **Source Code Audit:** Complete Inspection of .NET Web API, Express Auxiliary Service, React Router & Entity Framework Schemas.

---

## 📑 Summary of Identified Anomalies

| ID | Category | Severity | Status | File Reference | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | **Broken Navigation / Unrouted Link** | 🔴 HIGH | ✅ **RESOLVED** | [`SuperAdminLayout.jsx`](file:///d:/vite/AI/Eduvault/src/EduVault.Web/src/layouts/SuperAdminLayout.jsx) & [`App.jsx`](file:///d:/vite/AI/Eduvault/src/EduVault.Web/src/App.jsx) | Added `/super-admin/hrm` route routing to `SchoolHrmSettings` with multi-school switcher. |
| **GAP-02** | **Role & UI Inconsistency** | 🟡 MEDIUM | ✅ **RESOLVED** | [`Sidebar.jsx`](file:///d:/vite/AI/Eduvault/src/EduVault.Web/src/components/layout/Sidebar.jsx) | Added `receptionist` to `roleLabels` ('Front Desk & Reception') and profile routing to `/receptionist/dashboard`. |
| **GAP-03** | **Backend SuperAdmin Impersonation Rejection** | 🟠 HIGH | ✅ **RESOLVED** | [`AcademicsController.cs`](file:///d:/vite/AI/Eduvault/src/EduVault.Api/Controllers/AcademicsController.cs), [`AccountController.cs`](file:///d:/vite/AI/Eduvault/src/EduVault.Api/Controllers/AccountController.cs), [`ReceptionistController.cs`](file:///d:/vite/AI/Eduvault/src/EduVault.Api/Controllers/ReceptionistController.cs), [`LibraryController.cs`](file:///d:/vite/AI/Eduvault/src/EduVault.Api/Controllers/LibraryController.cs) | Enforced `?schoolId=` query parameter, `X-School-Id` header, and safe tenant fallback for Super Admin. |
| **GAP-04** | **Tenant Isolation Ambiguity in Express Auxiliary Service** | 🟠 HIGH | 🟡 **AUDITED** | [`server.js`](file:///d:/vite/AI/Eduvault/src/EduVault.Express/server.js) | Express service claims normalization in place; core ERP business models migrated to PostgreSQL. |
| **GAP-05** | **Legacy Route Aliases Preserved** | 🔵 LOW | ℹ️ **INTENDED** | [`App.jsx`](file:///d:/vite/AI/Eduvault/src/EduVault.Web/src/App.jsx) | Route aliases for `/school admin/*`, `/school_admin/*`, and `/school%20admin/*` are kept as redirect shims to prevent broken bookmarks. |
| **GAP-06** | **Unimplemented Action Buttons** | 🟡 MEDIUM | ℹ️ **INFO** | [`StudentPages.jsx`](file:///d:/vite/AI/Eduvault/src/EduVault.Web/src/pages/student/StudentPages.jsx) | Non-Razorpay payment gateways run client-side simulation confirms rather than live SDK token handshakes. |

---

## Detailed Gap Analysis & Reproduction Paths

### 1. GAP-01: Broken Route for Super Admin HRM Sidebar
- **Location:** `src/EduVault.Web/src/layouts/SuperAdminLayout.jsx` (Line 19)
- **Code:**
  ```javascript
  { icon: Wrench, label: 'HRM & Payroll Config', path: '/super-admin/hrm' }
  ```
- **The Issue in `App.jsx`:**
  ```javascript
  <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
    <Route path="/super-admin" element={<SuperAdminLayout />}>
      ...
      <Route path="schools" element={<Schools />} />
      <Route path="schools/:schoolId/hrm" element={<SchoolHrmSettings />} />
      {/* ❌ Notice: No route exists for "hrm"! */}
      <Route path="format-studio" element={<SuperPrintGallery />} />
  ```
- **Consequence:** When the Super Admin clicks "HRM & Payroll Config" in the sidebar, React Router attempts to match `/super-admin/hrm`. Because no matching subroute exists, it hits `<Route path="*" element={<Navigate to="/" replace />} />`, unexpectedly booting the Super Admin back to the public landing page.
- **Remedy Required:** Add `<Route path="hrm" element={<SchoolHrmSettings />} />` to `App.jsx` under `/super-admin`.

---

### 2. GAP-02: Missing Receptionist Support in Shared Sidebar
- **Location:** `src/EduVault.Web/src/components/layout/Sidebar.jsx` (Lines 44–70)
- **Code:**
  ```javascript
  const roleLabels = {
    superadmin: 'Super Admin',
    schooladmin: 'School Admin',
    teacher: 'Teacher Portal',
    student: 'Student Portal',
    accountmanager: 'Account & Finance',
    librarian: 'Library Portal'
    // ❌ 'receptionist' is missing!
  };
  ```
- **Consequence:** The receptionist sees `'EduVault'` as their header subtitle instead of `'Front Desk & Reception'`, and clicking the user profile icon triggers no navigation action because there is no branch for `role === 'receptionist'`.
- **Remedy Required:** Add `receptionist: 'Front Desk & Reception'` to `roleLabels` and route `/receptionist/dashboard` or profile modal in `handleProfileClick`.

---

### 3. GAP-03: `GetSchoolId()` Rejection for Super Admin in Academics Controller
- **Location:** `src/EduVault.Api/Controllers/AcademicsController.cs` (Lines 40–45)
- **Code:**
  ```csharp
  private Guid GetSchoolId()
  {
      var schoolIdStr = User.FindFirst("schoolId")?.Value;
      if (string.IsNullOrEmpty(schoolIdStr)) 
          throw new UnauthorizedAccessException("School ID missing in token");
      return Guid.Parse(schoolIdStr);
  }
  ```
- **Contrast with Fixed Controllers (`HrmController.cs` & `PrintTemplatesController.cs`):**
  In `PrintTemplatesController.cs`, the architect added:
  ```csharp
  if (User.IsInRole("superadmin") || User.IsInRole("SuperAdmin"))
  {
      var qSchoolId = HttpContext.Request.Query["schoolId"].FirstOrDefault();
      if (!string.IsNullOrEmpty(qSchoolId) && Guid.TryParse(qSchoolId, out var saSchoolId))
          return saSchoolId;
  }
  ```
- **Consequence:** If Super Admin visits student records or classes of a school directly without full login impersonation, `AcademicsController` throws a 401/500 error.
- **Remedy Required:** Port the `?schoolId=` query parameter and header extraction logic to `AcademicsController.cs`.

---

### 4. GAP-04: Multi-Tenant Query Leaks in Express Auxiliary Backend
- **Location:** `src/EduVault.Express/server.js`
- **Code Trace:**
  In endpoints like `GET /api/holidays`:
  ```javascript
  app.get('/api/holidays', authenticateToken, async (req, res) => {
    const schoolId = req.user?.schoolId;
    const query = schoolId ? { schoolId } : {};
    const holidays = await Holiday.find(query);
    res.json(holidays);
  });
  ```
- **Consequence:** If an authenticated request has a malformed token where `schoolId` evaluates to `undefined`, `Holiday.find({})` queries across **ALL schools** in the database, breaking tenant isolation.
- **Remedy Required:** Explicitly reject requests with missing `schoolId` unless role is explicitly `'superadmin'`.
