# 🏗️ EduVault – Full Implementation Plan
## Deep Bug Fixes + New Features + AI Print Format Studio

> **Author:** EduVault Engineering Audit  
> **Date:** September 2026  
> **Purpose:** Step-by-step build reference for every bug fix, feature upgrade, and the AI Dynamic Print & Format Studio system.

---

## 📑 Quick Navigation

| Phase | Scope | Priority |
| :--- | :--- | :--- |
| **Phase 1** | Critical Bug Fixes (HRM + Auth + Printing) | 🔴 HIGHEST — Fix Before Any New Feature |
| **Phase 2** | Global Print CSS Foundation | 🔴 HIGH — Required by Phase 3 |
| **Phase 3** | AI & Visual Print Format Studio (Core Engine) | 🟠 HIGH — The Flagship Feature |
| **Phase 4** | Super Admin Format Gallery & School Distribution | 🟠 HIGH — Multi-Tenant Control |
| **Phase 5** | Dashboard Upgrades (All 7 Roles) | 🟡 MEDIUM |
| **Phase 6** | 1000x Market Dominator Features | 🟢 PLANNED — Future Sprints |

---

## PHASE 1: Critical Bug Fixes 🔴

### Bug 1 — Super Admin HRM Settings: API Route Double-Prefix Error

#### Problem Description (Deep)
File: [`SchoolHrmSettings.jsx`](file:///d:/vite/AI/EduvaultSep/src/EduVault.Web/src/pages/super-admin/SchoolHrmSettings.jsx)  
Lines: 80–90

The `apiClient.js` already has `baseURL = http://localhost:5265/api`.  
Every other page calls `apiClient.get('/super/schools')` WITHOUT the `/api` prefix.  
But `SchoolHrmSettings.jsx` has **hardcoded `/api/`** prefix in all 9 endpoints:

```javascript
// BROKEN (double /api/api/...):
apiClient.get(`/api/super/schools/${schoolId}/hrm/overview`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/departments`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/designations`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/work-schedule`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/leave-policies`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/salary-components`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/statutory/PF`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/statutory/ESI`)
apiClient.get(`/api/super/schools/${schoolId}/hrm/statutory/PT`)
```

Because `Promise.all()` is used (line 80), even ONE 404 failure causes the entire `loadAllData()` function to throw, and the page shows: `"Failed to load school HRM configuration."` — the Super Admin sees nothing.

#### The Fix
Remove `/api` prefix from all 9 `apiClient` calls in `SchoolHrmSettings.jsx`.  
Also fix all POST/PUT/DELETE handlers in the same file (lines 141, 155, 169, 183, 196, 210, 223, 236, 250, 255).

```javascript
// CORRECT (single /api resolved by apiClient baseURL):
apiClient.get(`/super/schools/${schoolId}/hrm/overview`)
apiClient.get(`/super/schools/${schoolId}/hrm/departments`)
// ... all 9 endpoints
```

#### Files to Edit
- `src/EduVault.Web/src/pages/super-admin/SchoolHrmSettings.jsx` — Remove `/api` prefix from all API calls.

---

### Bug 2 — Super Admin HRM: No Sidebar Navigation Link

#### Problem Description (Deep)
File: [`SuperAdminLayout.jsx`](file:///d:/vite/AI/EduvaultSep/src/EduVault.Web/src/layouts/SuperAdminLayout.jsx)

The `superLinks` array only has 7 entries: Dashboard, Schools, Access Control, Subscriptions, Settings, Support, Notices. **HRM Config has no sidebar entry at all.**

The ONLY way to reach `/super-admin/schools/:schoolId/hrm` is via the tiny `⚙️ HRM Config` button in the Schools table (line 491 in Schools.jsx). If a Super Admin is not on the Schools page, they cannot find HRM config.

Additionally, the route `/super-admin/schools/:schoolId/hrm` requires navigating to a school-specific sub-page. The Super Admin needs a consolidated HRM management hub that either:
1. Has a school-switcher dropdown inline, OR
2. Links back to Schools page with a prompt to select a school.

#### The Fix

**Option A (Recommended): Add HRM to the Super Admin Settings tabs.**  
Inside `Settings.jsx`, add a `Print & HRM Config` tab that includes a school selector at the top, then embeds the HRM configuration panels for the selected school.

**Option B: Sidebar direct link with school-selector modal.**  
Add to `SuperAdminLayout.jsx`:
```javascript
{ icon: Wrench, label: 'HRM & Payroll Config', path: '/super-admin/hrm' }
```
A new page `/super-admin/hrm` shows a school dropdown first, then the HRM settings panels for the selected school.

#### Files to Edit
- `src/EduVault.Web/src/layouts/SuperAdminLayout.jsx` — Add HRM link to `superLinks`.
- `src/EduVault.Web/src/App.jsx` — Add route `/super-admin/hrm` to super admin routes.
- `src/EduVault.Web/src/pages/super-admin/SchoolHrmSettings.jsx` — Add school-selector dropdown at the top of the page (fetch from `/super/schools`, let user pick which school to configure).

---

### Bug 3 — HrmController Backend: Super Admin Token Rejection

#### Problem Description (Deep)
File: [`HrmController.cs`](file:///d:/vite/AI/EduvaultSep/src/EduVault.Api/Controllers/HrmController.cs)  
Lines: 33–38

```csharp
private Guid GetSchoolId()
{
    var schoolIdStr = User.FindFirst("schoolId")?.Value;
    if (string.IsNullOrEmpty(schoolIdStr))
        throw new UnauthorizedAccessException("School ID missing in token"); // CRASHES for Super Admin
    return Guid.Parse(schoolIdStr);
}
```

Super Admin's JWT token has `schoolId = ""` (empty string, because the Super Admin seed code sets `SchoolId = null` on the User entity).  
If Super Admin ever hits `/api/hrm/employees` or any HRM endpoint, the backend throws an unhandled `UnauthorizedAccessException`, resulting in a 500 error.

#### The Fix
Modify `GetSchoolId()` to allow Super Admins to pass `schoolId` as a query parameter or header:

```csharp
private Guid GetSchoolId()
{
    // Super admin can pass schoolId as query param for cross-school operations
    if (User.IsInRole("superadmin"))
    {
        var qSchoolId = HttpContext.Request.Query["schoolId"].FirstOrDefault();
        if (!string.IsNullOrEmpty(qSchoolId) && Guid.TryParse(qSchoolId, out var saSchoolId))
            return saSchoolId;
        throw new UnauthorizedAccessException("Super Admin must provide ?schoolId= query parameter for HRM operations.");
    }
    
    var schoolIdStr = User.FindFirst("schoolId")?.Value;
    if (string.IsNullOrEmpty(schoolIdStr))
        throw new UnauthorizedAccessException("School ID missing in token");
    return Guid.Parse(schoolIdStr);
}
```

#### Files to Edit
- `src/EduVault.Api/Controllers/HrmController.cs` — Update `GetSchoolId()` method.

---

### Bug 4 — Print Pollution: `window.print()` Without Print CSS

#### Problem Description (Deep)
All 13 `window.print()` calls across the project print the **entire browser viewport** including:
- Left sidebar (dark navy blue background, icons, school logo)
- Topbar (breadcrumb, settings icons)
- Modal backdrop (semi-transparent overlay)
- Toast notifications if visible
- All button controls (Pay, Edit, Delete, Cancel buttons)

Only `Reports.jsx` has `@media print` CSS inline (lines 287–360). All other files:
- `Salaries.jsx` line 497: `window.print()` — No print CSS
- `CounterFeeDesk.jsx` line 436: `window.print()` — No print CSS
- `FrontDeskDashboard.jsx` lines 973, 1155: `window.print()` — No print CSS
- `StudentPages.jsx` lines 321, 1399: `window.print()` — No print CSS
- `GatePassDesk.jsx` line 397: `window.print()` — No print CSS
- `VisitorRegister.jsx` line 417: `window.print()` — No print CSS
- `AdmissionForm.jsx` line 944: `window.print()` — No print CSS
- `Subscriptions.jsx` line 486: `window.print()` — No print CSS

#### The Fix (Phase 2 — Global CSS Foundation)
See Phase 2 below.

---

### Bug 5 — Fee Counter: No Isolated Printable Receipt Area

#### Problem Description (Deep)
File: [`CounterFeeDesk.jsx`](file:///d:/vite/AI/EduvaultSep/src/EduVault.Web/src/pages/receptionist/CounterFeeDesk.jsx)

The fee success screen shows a simple div with transaction amount and a "Print Thermal Slip" button at line 436. But:
1. There is no dedicated printable area with receipt format.
2. `window.print()` will print the entire page including the student search bar, fee summary table, and the modal.
3. The receipt has no: School Name, School Logo, Receipt Number, Date, Fee Head Breakdown, Cashier Name, Mode of Payment, QR Code.

#### The Fix
Add a hidden `<div id="receipt-print-zone">` that only becomes visible during print, containing all receipt fields. Style it with Thermal 80mm width and proper receipt format. See Phase 3 for the full Format Studio integration.

---

### Bug 6 — Salary Payslip: Direct `window.print()` on Full Page

#### Problem Description (Deep)
File: [`Salaries.jsx`](file:///d:/vite/AI/EduvaultSep/src/EduVault.Web/src/pages/account/Salaries.jsx) Line 497

The "Print Payslip" button triggers `window.print()` which prints the entire HRM Payroll page (including month selector, search bar, employee salary table) PLUS the payslip modal on top.

The payslip modal itself has clean data (Basic Earned, Allowances, Deductions, Net Salary) but:
1. It has no School Name / Logo header.
2. It has no Employee ID / PAN Number.
3. It prints with modal shadow, rounded corners, and the main page behind it.
4. `Amount in Words` is missing from the payslip.

---

## PHASE 2: Global Print CSS Foundation 🔴

### Goal
Before building the AI Format Studio, establish a rock-solid global print CSS baseline so that NO sidebar, NO navbar, NO button, NO dark background ever reaches a printed page.

### 2.1 New File: `src/EduVault.Web/src/styles/print.css`

```css
/* ================================================
   EDUVAULT GLOBAL PRINT STYLESHEET
   Loaded globally — applies to ALL pages on print.
   ================================================ */

@media print {
  /* ── 1. HARD HIDE: Sidebar, Topbar, Buttons, Inputs ── */
  aside,
  .sidebar,
  [class*="sidebar"],
  nav,
  .topbar,
  [class*="topbar"],
  button:not(.printable-keep),
  input,
  select,
  textarea,
  .no-print,
  [data-no-print],
  .toast,
  .modal-backdrop,
  .backdrop,
  footer,
  .recharts-wrapper,       /* Recharts charts — never in print */
  .recharts-surface {
    display: none !important;
    visibility: hidden !important;
  }

  /* ── 2. RESET: Clean white paper body ── */
  html, body {
    background: #ffffff !important;
    color: #000000 !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: 11pt !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* ── 3. MAIN CONTENT: Remove padding/margins ── */
  main,
  .main-content,
  [class*="main-content"] {
    margin: 0 !important;
    padding: 0 !important;
    min-height: unset !important;
    max-width: 100% !important;
    box-shadow: none !important;
  }

  /* ── 4. TABLE: Prevent row splits across pages ── */
  table {
    page-break-inside: auto;
    width: 100%;
    border-collapse: collapse;
  }
  tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }
  thead {
    display: table-header-group; /* Repeat header on each page */
  }
  tfoot {
    display: table-footer-group;
  }

  /* ── 5. PRINTABLE ZONES: Only these show ── */
  .print-only {
    display: block !important;
    visibility: visible !important;
  }
  .print-hidden {
    display: none !important;
  }

  /* ── 6. PAGE SIZE PRESETS ── */
  @page { margin: 8mm 10mm; size: A4 portrait; }
  @page.thermal-80mm { margin: 2mm; size: 80mm auto; }
  @page.a5 { margin: 8mm; size: A5 portrait; }
  @page.id-card { margin: 0; size: 85.6mm 54mm landscape; }

  /* ── 7. PAPER FORMAT CLASSES ── */
  .print-zone-thermal {
    width: 72mm !important;
    max-width: 76mm !important;
    font-size: 9pt !important;
    font-family: 'Courier New', Courier, monospace !important;
    margin: 0 auto !important;
  }
  .print-zone-a4 {
    width: 190mm !important;
    font-size: 10pt !important;
    margin: 0 auto !important;
  }
  .print-zone-a5 {
    width: 140mm !important;
    font-size: 9pt !important;
    margin: 0 auto !important;
  }
  .print-zone-twin-copy {
    width: 190mm !important;
    font-size: 10pt !important;
  }
  .print-zone-id-card {
    width: 85.6mm !important;
    height: 54mm !important;
    overflow: hidden !important;
  }

  /* ── 8. TWIN-COPY SEPARATOR LINE ── */
  .print-scissor-line {
    border-top: 1px dashed #999;
    text-align: center;
    margin: 4mm 0;
    color: #888;
    font-size: 8pt;
  }

  /* ── 9. REMOVE BOX SHADOWS & ROUNDED CORNERS ON PRINT ── */
  * {
    box-shadow: none !important;
    text-shadow: none !important;
    border-radius: 0 !important;
  }

  /* ── 10. PRESERVE COLORS FOR LOGO & STAMPS ── */
  .print-color-preserve {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
```

### 2.2 Import in `src/EduVault.Web/src/main.jsx` or `index.css`
```javascript
// main.jsx
import './styles/print.css';
```

### 2.3 Add `no-print` Class to All Layout Elements
- `Sidebar.jsx` — Add `className="sidebar no-print"` to the `<aside>` element.
- `Topbar.jsx` — Add `className="topbar no-print"` to the topbar `<header>`.

---

## PHASE 3: AI & Visual Print Format Studio (Core Engine) 🟠

### Overview: How It Works End-to-End

```
User Action → Format Studio UI → AI or Visual Editor
     ↓
Template saved to DB (PrintTemplates table)
     ↓
When Print is triggered:
  API: /api/print-templates/render/{documentType}/{recordId}
     ↓
Backend merges real DB data into HTML template
     ↓
Clean HTML injected into hidden iframe
     ↓
iframe.contentWindow.print() → ONLY clean document prints
```

---

### 3.1 Backend — New Entity & Migration

#### New File: `src/EduVault.Core/Entities/PrintTemplate.cs`
```csharp
namespace EduVault.Core.Entities
{
    public class PrintTemplate
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        // Null = Super Admin Master Template (available to all schools)
        // Set = School-specific template (only for that school)
        public Guid? SchoolId { get; set; }
        public School? School { get; set; }

        // Document classification
        // Values: FeeReceipt | ReportCard | SalarySlip | AdmitCard | IdCard | TransferCertificate | GatePass | VisitorPass
        public string DocumentType { get; set; } = "FeeReceipt";

        public string TemplateName { get; set; } = "Default Template";
        public string Description { get; set; } = "";

        // Paper format
        // Values: Thermal80mm | A5Portrait | A5Landscape | A4Single | A4TwinCopy | CR80ID
        public string PaperSize { get; set; } = "A4Single";
        public string Orientation { get; set; } = "Portrait"; // Portrait | Landscape

        // Visual Block Studio configuration stored as JSON
        // Describes which blocks are enabled, their order, font sizes, colors, etc.
        public string LayoutConfigJson { get; set; } = "{}";

        // Final compiled HTML+CSS — This is what gets merged with data and printed
        public string HtmlContent { get; set; } = string.Empty;

        // AI generation metadata
        public bool WasAiGenerated { get; set; } = false;
        public string AiPromptUsed { get; set; } = string.Empty;

        // A Super Admin Master Template can be pushed to schools
        public bool IsSuperAdminMaster { get; set; } = false;

        // If true, this is the active default for its DocumentType in this school
        public bool IsDefault { get; set; } = false;
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
    }
}
```

#### Add to `EduVaultDbContext.cs`:
```csharp
public DbSet<PrintTemplate> PrintTemplates { get; set; }

// In OnModelCreating:
modelBuilder.Entity<PrintTemplate>(entity =>
{
    entity.HasKey(e => e.Id);
    entity.Property(e => e.DocumentType).HasMaxLength(50).IsRequired();
    entity.Property(e => e.PaperSize).HasMaxLength(30).IsRequired();
    entity.Property(e => e.HtmlContent).HasColumnType("text");
    entity.Property(e => e.LayoutConfigJson).HasColumnType("text");
    entity.HasOne(e => e.School).WithMany().HasForeignKey(e => e.SchoolId).IsRequired(false).OnDelete(DeleteBehavior.Cascade);
});
```

---

### 3.2 Backend — API Controller

#### New File: `src/EduVault.Api/Controllers/PrintTemplatesController.cs`

**Endpoints:**

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/print-templates` | Get all templates for school (+ super admin masters) | schooladmin, accountmanager |
| `GET` | `/api/print-templates/{id}` | Get single template by ID | schooladmin, accountmanager |
| `POST` | `/api/print-templates` | Create new template (manual or AI-generated) | schooladmin |
| `PUT` | `/api/print-templates/{id}` | Update template HTML, layout config, name | schooladmin |
| `DELETE` | `/api/print-templates/{id}` | Soft-delete (sets IsActive=false) | schooladmin |
| `POST` | `/api/print-templates/{id}/set-default` | Set as default for document type | schooladmin |
| `POST` | `/api/print-templates/ai-generate` | AI prompt/image → template HTML | schooladmin, superadmin |
| `GET` | `/api/print-templates/render/{documentType}/{recordId}` | Merge real data + return clean print HTML | All roles |
| `GET` | `/api/super/print-templates/masters` | List all Super Admin master templates | superadmin |
| `POST` | `/api/super/print-templates/push` | Push master template to school(s) | superadmin |
| `POST` | `/api/super/print-templates` | Create Super Admin master template | superadmin |

---

### 3.3 Template Scope: Global vs School-Specific

#### Ye Important Question Aapne Poocha: "Specific School Ke Liye Ya Sabke Liye?"

**Answer:** EduVault me **dono ka system** hai. Ek hierarchical 3-tier model:

```
TIER 1: Super Admin Master Templates (SchoolId = NULL)
  ↓  "Push to All Schools" ya "Push to Specific Schools"
TIER 2: School Inherited Template (SchoolId = SET, IsSuperAdminMaster = false)
  ↓  School Admin can edit or override locally
TIER 3: School Custom Template (Created by School Admin from scratch)
```

**Kaise Kaam Karta Hai in Practice:**

1. **Super Admin ek "CBSE Term 1 Marksheet" master template banata hai** (Tier 1).  
   → `SchoolId = null`, `IsSuperAdminMaster = true`

2. **Super Admin ise "Delhi Public School" aur "St. Mary's School" ko push karta hai.**  
   → System `PrintTemplates` table me do NEW rows banata hai, ek DPS ke `SchoolId` ke saath aur ek St. Mary's ke `SchoolId` ke saath. Ye Tier 2 copies hain.  
   → Original Tier 1 master unchanged rehta hai.

3. **DPS ka School Admin apni copy khol ke customize karta hai** (apna logo aur affiliation no. change karta hai).  
   → Sirf DPS ki copy update hoti hai. St. Mary's ki copy ya Super Admin master affect nahi hota.

4. **Naya School Onboard hota hai.**  
   → Super Admin "Push to All Schools" kare ya school ko automatically default templates mile.

5. **School Admin bhi khud se blank template bana sakta hai** (Tier 3), bina kisi master se copy kiye.

---

### 3.4 The AI Generation Flow (In Detail)

#### Frontend: `PrintFormatStudio.jsx` → AI Tab
```
User → Clicks "AI Generate" tab
  → Types prompt OR uploads photo of old paper slip
  → Clicks "Generate Template"
  → Calls POST /api/print-templates/ai-generate
     { documentType: "FeeReceipt", prompt: "...", paperSize: "A4TwinCopy" }
  → Backend sends to Gemini API (already integrated in project via AiPlannerService)
  → Returns { templateName, htmlContent, layoutConfigJson }
  → Frontend shows LIVE PREVIEW in an iframe
  → User clicks "Save as Template" → POST /api/print-templates
```

#### Backend: `AiPlannerService` (already exists) → Extended

The existing `AiPlannerService.cs` (with `HttpClient` already registered in DI via `Program.cs` line 156) will be extended with a `GeneratePrintTemplateAsync` method.

**AI System Prompt:**
```
You are EduVault's Print Template Generator. 
Generate a SINGLE self-contained HTML document optimized for @media print.
Rules:
1. Use only inline CSS or a single <style> block. No external CSS or JS.
2. Paper size class: use .print-zone-a4, .print-zone-thermal, .print-zone-a5, etc.
3. Replace all real data with EduVault merge tags: {{student.name}}, {{fee.receiptNo}}, {{school.logoUrl}}, etc.
4. For twin-copy A4: include a .print-scissor-line div between the two copies.
5. Include a proper school header: logo left, school name center/right.
6. Return ONLY the HTML string, no explanation.

Supported merge tags: (full list here from Table 3.3 in audit doc)
```

---

### 3.5 Frontend — Format Studio UI Architecture

#### New Files Required:
- `src/EduVault.Web/src/pages/school-admin/PrintFormatStudio.jsx` — Main studio page (School Admin access).
- `src/EduVault.Web/src/pages/super-admin/SuperPrintGallery.jsx` — Super Admin master gallery & push interface.
- `src/EduVault.Web/src/components/print/PrintIframe.jsx` — Reusable isolated iframe print component.
- `src/EduVault.Web/src/components/print/TemplatePreview.jsx` — Live HTML preview component.
- `src/EduVault.Web/src/components/print/MergeTagHelper.jsx` — Sidebar showing available `{{tags}}`.

#### `PrintFormatStudio.jsx` UI Tabs:

**Tab 1: "📁 My Templates"**
- Grid of saved templates for the school.
- Each card shows: Template Name, Document Type badge, Paper Size badge, "Default" green badge if active.
- Actions per card: 👁️ Preview, ✏️ Edit, 🖨️ Test Print, ⭐ Set Default, 🗑️ Delete.
- "+ New Template" button → opens Tab 2 (AI Mode) or Tab 3 (Visual Mode).

**Tab 2: "🤖 AI Generator"**
- Text area: "Describe your receipt/report card in detail..."
- "📸 Upload Photo of existing paper" — file input for image-to-template.
- Paper size selector (dropdown): Thermal 80mm / A5 / A4 Single / A4 Twin Copy / CR80 ID Card.
- Document type selector: Fee Receipt / Report Card / Salary Slip / Admit Card / Gate Pass / TC.
- "✨ Generate Template" button → calls API, shows loading spinner, then live preview.
- Live preview in an `<iframe>` with sample/demo data pre-merged.
- "💾 Save Template" button → saves and adds to Tab 1.

**Tab 3: "🎛️ Visual Block Editor"**
- Left panel: Paper canvas with draggable blocks in live preview.
- Right panel: Block palette with toggle switches:
  - **Header Block:** Logo toggle, Logo position [L/C/R], School Name, Tagline, Affiliation No, Address.
  - **Student Info:** Show/hide checkboxes for each field (Name, Roll No, Class, Section, DOB, etc.).
  - **Fee/Marks Table:** Column toggles (S.No, Particular, Max, Obtained, Grade).
  - **Summary Block:** Subtotal, Fine, Discount, Net Total, Amount in Words.
  - **Security Block:** QR Code toggle, Barcode toggle, Watermark toggle.
  - **Signature Block:** Add/remove signature slots (Cashier, Principal, Teacher, Parent).
  - **Footer Block:** Custom terms text input.
- "Preview" button → renders to iframe.
- "Save Template" button.

**Tab 4: "🖨️ Print Settings"**
- School-level defaults table:

| Document Type | Default Template | Paper Size | Action |
| :--- | :--- | :--- | :--- |
| Fee Receipt (Counter) | 80mm Thermal Quick Slip | Thermal 80mm | Change |
| Fee Receipt (Download) | A4 Twin Copy Professional | A4 | Change |
| Exam Report Card | CBSE Standard Marksheet | A4 | Change |
| Salary Payslip | Professional Payroll Slip | A4 | Change |
| Gate Pass | Mini Gate Token | Thermal 80mm | Change |
| Admit Card | Exam Admit Card (2-per-A4) | A4 | Change |

---

### 3.6 The `PrintIframe` Component (Zero-Pollution Print)

```jsx
// src/EduVault.Web/src/components/print/PrintIframe.jsx
import { useRef } from 'react';

const PrintIframe = ({ htmlContent, onReady }) => {
  const iframeRef = useRef(null);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe || !htmlContent) return;

    // Write full HTML document into iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(htmlContent);
    iframe.contentDocument.close();

    // Wait for iframe resources to load then print
    iframe.onload = () => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    };
  };

  return (
    <>
      {/* Hidden iframe — user never sees it */}
      <iframe
        ref={iframeRef}
        title="print-frame"
        style={{ display: 'none', width: 0, height: 0, border: 0 }}
      />
      {/* Return the print trigger function to parent */}
      {onReady && onReady(handlePrint)}
    </>
  );
};

export default PrintIframe;
```

**Usage in `CounterFeeDesk.jsx`:**
```jsx
// Instead of: onClick={() => window.print()}
// Do:
const [printHtml, setPrintHtml] = useState('');

const handlePrintReceipt = async () => {
  const res = await apiClient.get(
    `/print-templates/render/FeeReceipt/${paymentSuccessReceipt.transactionId}`
  );
  setPrintHtml(res.data.html);
  // PrintIframe triggers automatically when printHtml changes
};

// In JSX:
<PrintIframe htmlContent={printHtml} onReady={(triggerPrint) => {
  if (printHtml) triggerPrint(); // auto-trigger on html load
}} />
<button onClick={handlePrintReceipt}>Print Thermal Slip</button>
```

---

### 3.7 Backend: `/api/print-templates/render/{documentType}/{recordId}`

This is the **most critical endpoint**. It:
1. Fetches the school's active default `PrintTemplate` for the given `documentType`.
2. Fetches the actual database record (fee transaction, exam marks, salary record, etc.) by `recordId`.
3. Replaces all `{{merge.tags}}` in `HtmlContent` with real values.
4. Returns the merged HTML string.

```csharp
[HttpGet("render/{documentType}/{recordId}")]
[Authorize]
public async Task<IActionResult> RenderTemplate(string documentType, Guid recordId)
{
    var schoolId = GetSchoolId(); // Gets from token or query param for super admin

    // 1. Find school's default template for this document type
    var template = await _context.PrintTemplates
        .AsNoTracking()
        .Where(t => t.SchoolId == schoolId && t.DocumentType == documentType && t.IsDefault && t.IsActive)
        .OrderByDescending(t => t.CreatedAt)
        .FirstOrDefaultAsync();

    // Fallback: find any active template for this document type
    if (template == null)
        template = await _context.PrintTemplates
            .AsNoTracking()
            .Where(t => t.SchoolId == schoolId && t.DocumentType == documentType && t.IsActive)
            .FirstOrDefaultAsync();

    if (template == null)
        return NotFound(new { error = $"No print template configured for {documentType}. Please set up a template in Print Settings." });

    // 2. Load merge data based on document type
    var mergeData = await BuildMergeData(documentType, recordId, schoolId);

    // 3. Apply merge tags
    var html = ApplyMergeTags(template.HtmlContent, mergeData);

    return Ok(new { html, templateName = template.TemplateName, paperSize = template.PaperSize });
}
```

---

## PHASE 4: Super Admin Format Gallery & School Distribution 🟠

### 4.1 New Page: `SuperPrintGallery.jsx`

**Location:** `/super-admin/print-gallery`
**Add to:** `SuperAdminLayout.jsx` sidebar + `App.jsx` routes.

**Page Structure:**

```
┌─────────────────────────────────────────────────────┐
│  Super Admin Print & Format Gallery                  │
│  ─────────────────────────────────────────────────── │
│                                                     │
│  [Tab: My Master Templates] [Tab: Push to Schools]  │
│                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │ CBSE Report │ │ 80mm Thermal│ │ A4 Fee Slip │   │
│  │ Card 2026   │ │ Counter Rec.│ │ Twin Copy   │   │
│  │ [Push] [Edit]│ │ [Push] [Edit]│ │ [Push] [Edit]│  │
│  └─────────────┘ └─────────────┘ └─────────────┘   │
│                                                     │
│  [+ Create New Master Template]  [AI Generate]      │
└─────────────────────────────────────────────────────┘
```

### 4.2 Push Logic

When Super Admin clicks "Push Template to Schools":

**Option A: "Push to All Schools"**
```
POST /api/super/print-templates/push
Body: { templateId: "...", targetSchoolIds: null, setAsDefault: true }
```
→ Backend iterates ALL active schools, creates a `PrintTemplate` copy for each school's `SchoolId`.

**Option B: "Push to Specific Schools"**
```
POST /api/super/print-templates/push
Body: { templateId: "...", targetSchoolIds: ["id1", "id2", ...], setAsDefault: true }
```
→ Multi-select school picker (searchable dropdown) → push only to selected schools.

**Option C: "Push on New School Registration"**
→ When Super Admin creates a new school in `Schools.jsx`, if Super Admin has marked any master templates as `AutoAssignToNewSchools = true`, they are automatically copied to the new school.

---

## PHASE 5: Dashboard Upgrades (All 7 Portals) 🟡

### 5.1 Super Admin Dashboard
**Current Issues Found in Code:**
- `SuperAdminDashboard.jsx` shows schools list and revenue stats.
- No system health widget (no DB connection count, no disk usage, no WhatsApp API quota).
- No live support ticket badge.

**New Features to Add:**
1. **System Health Bar (Top of Dashboard):**
   - Database: `Healthy / Warning / Critical`
   - WhatsApp API Messages Used This Month (progress bar)
   - Total Cloud Storage Used / Limit
   - Pending Support Tickets (clickable badge → navigates to `/super-admin/support`)
2. **One-Click Impersonation Button** (in Schools table):
   - `👤 Login as Admin` button per school row.
   - Backend endpoint: `POST /api/super/impersonate-school` → Returns a short-lived token scoped to that school's admin.
   - Super Admin can test anything from that school admin's perspective without needing the school's password.
3. **Revenue Analytics Chart:** Monthly subscription revenue by school (stacked bar chart).

---

### 5.2 School Admin Dashboard
**Current Issues Found in Code (`Dashboard.jsx`):**
- Chart shows enrollment/attendance trends. Good.
- Missing: Defaulter widget, Teacher absenteeism widget, Birthday of the day.

**New Features:**
1. **"Principal Morning Briefing" Card** (Auto-fetches on page load):
   - **Query 1:** How many teachers are on approved leave today?
   - **Query 2:** How many students marked absent today so far?
   - **Query 3:** Students/staff with birthdays today.
   - **Query 4:** Unpaid fee from last month (count + total amount).
   - *All in one compact, scrollable widget at the top of the dashboard.*
2. **Quick Action Floating Bar:** 4 icon buttons (fixed bottom-right):
   - 📢 Broadcast Notice
   - 💬 Send WhatsApp to All Parents
   - 🎉 Declare Holiday
   - 📊 Download Today's Report

---

### 5.3 Teacher Portal
**Current Issues Found in Code (`TeacherPages.jsx`):**
- `TeacherPages.jsx` is 4,726 lines — single file for 12+ teacher features.
- No substitute teacher assignment feature.
- Homework module has no file attachment upload.

**Restructure Plan:**
```
src/pages/teacher/
├── TeacherDashboard.jsx     (currently in TeacherPages.jsx)
├── TeacherAttendance.jsx    (currently in TeacherPages.jsx)
├── TeacherMarks.jsx         (currently in TeacherPages.jsx)
├── TeacherHomework.jsx      (currently in TeacherPages.jsx)
├── TeacherSchedule.jsx      (currently in TeacherPages.jsx)
├── TeacherRoster.jsx        (currently in TeacherPages.jsx)
├── TeacherLeave.jsx         (currently in TeacherPages.jsx)
├── TeacherProfile.jsx       (currently in TeacherPages.jsx)
└── TeacherPages.jsx         (index only — re-exports all above)
```

**New Feature: 15-Second Mobile Roll Call**
- Mobile-optimized fullscreen attendance view.
- Student cards displayed one at a time (current + next visible).
- ✅ Present (tap right side / swipe right) / ❌ Absent (tap left / swipe left).
- Late option via long-press.
- Teacher can complete 40-student class attendance in under 60 seconds.

---

### 5.4 Student/Parent Portal
**Current Issues:**
- `StudentPages.jsx` is 3,891 lines.
- No multi-child (sibling) switcher for parents.

**New Feature: Multi-Sibling Switcher**
- Parent registers both children with same phone/email.
- After login, a small switcher appears at the top: `Viewing: Rohan (Class 5A)` [Switch → Priya (Class 8B)].
- Backend: `GET /api/academics/student/siblings` → returns linked student accounts by parent phone.

---

### 5.5 Account & Finance Manager
**Current Issues Found in Code (`Salaries.jsx`, `SchoolBilling.jsx`):**
- No Day-Book / Counter Closing module.
- No Tally export button.
- Payslip print triggers `window.print()` without print template.

**New Features:**
1. **Daily Cash Counter Closing:**
   - Cashier fills: Opening Cash Balance, Total Cash Collected Today, Closing Cash.
   - System auto-calculates: Total Online/UPI collected, Total Cash on hand.
   - Manager approves or flags discrepancy.
2. **Tally TallyPrime XML Export:**
   - Button: "Export Month to Tally"
   - Backend generates `.xml` in TallyPrime-compatible voucher format.
   - School's accountant imports this XML → Tally auto-posts all receipts.
3. **Salary Payslip via Format Studio:**
   - Replace direct `window.print()` in `Salaries.jsx` with `PrintIframe` component.
   - Uses school's active `SalarySlip` template from the Format Studio.

---

### 5.6 Librarian Portal
**New Features:**
1. **Continuous Barcode Scan Mode:**
   - A "Scan Mode" toggle at the top.
   - When ON: barcode input is always focused, enter auto-submits.
   - 1 scanner gun → 10 books returned in 5 seconds.
2. **Auto Overdue WhatsApp Reminder:**
   - Daily cron job: check all overdue books → send WhatsApp reminder to parent/student.

---

### 5.7 Receptionist / Front Desk
**New Features:**
1. **Webcam Visitor Photo Capture:**
   - "📷 Take Photo" button on Visitor Register form.
   - Uses `getUserMedia()` browser API → instant snapshot.
   - Visitor photo stored and printed on gate pass.
2. **Thermal Gate Pass Format:**
   - Visitor gate pass uses 80mm thermal template from Format Studio.
   - Gate guard gets a clean printed slip instead of handwritten register.

---

## PHASE 6: 1000x Market Features (Future Sprints) 🟢

### 6.1 2-Way WhatsApp Conversational Bot
- School gets a dedicated WhatsApp Business number.
- Parent sends "Fee" → bot replies with outstanding balance + payment link.
- Parent sends "Attendance" → bot replies with last 30 days attendance %.
- Parent sends "Result" → bot replies with latest exam marks.
- **Tech:** Meta WhatsApp Business API (already partially set up in the project via `WhatsAppService.cs` and `MetaAccessToken` in Settings).

### 6.2 AI Question Paper & Worksheet Generator
- Teacher selects: Class, Subject, Chapter, Difficulty, Marks.
- Gemini AI generates: Question paper with sections (MCQ, Short, Long) + Answer Key.
- Output: Printable A4 PDF using Format Studio template.
- **Tech:** Extend existing `AiPlannerService.cs`.

### 6.3 Smart School Bus Geofence Tracker
- Driver app (PWA / React Native) with GPS location.
- Backend: `POST /api/transport/location` updates bus position.
- Parents subscribed to bus route get WhatsApp notification when bus is within 500m.
- **Tech:** Google Maps Geofence API + WhatsApp Business API.

### 6.4 Intelligent Fee Recovery Bot (Automated 3-Tier Reminder)
- **Day -3:** "Dear Parent, your ward's fee of ₹X is due on [date]. Pay now: [link]"
- **Day 0:** "Fee due today. Avoid late fine. Pay: [link]"
- **Day +5:** "Late fee of ₹Y has been added. Total outstanding: ₹Z. [link]"
- **Tech:** `FeeAlertBackgroundService.cs` (already exists) → extend with 3-tier logic.

### 6.5 AI Conflict-Free Timetable Generator
- Input: Teachers, subjects they teach, available periods, lab bookings, PT/Art schedule.
- AI generates 100% conflict-free weekly timetable in < 10 seconds.
- Output: Direct save to DB + printable timetable via Format Studio.
- **Tech:** Google OR-Tools or constraint satisfaction via Gemini.

### 6.6 Tally/Busy XML Export
- Monthly fee & expense vouchers exported as Tally-compatible XML.
- School accountant imports directly into TallyPrime → zero double entry.
- **Backend:** New `TallyExportController.cs` → generates XML using `System.Xml` builder.

---

## Summary Implementation Checklist

| # | Task | File(s) | Phase | Status |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Fix `/api` double prefix in SchoolHrmSettings | `SchoolHrmSettings.jsx` | 1 | ✅ |
| 2 | Add HRM sidebar link + school-switcher | `SuperAdminLayout.jsx`, `App.jsx`, `SchoolHrmSettings.jsx` | 1 | ✅ |
| 3 | Fix `GetSchoolId()` for Super Admin | `HrmController.cs` | 1 | ✅ |
| 4 | Create `print.css` global stylesheet | New `print.css` | 2 | ✅ |
| 5 | Add `no-print` to Sidebar & Topbar | `Sidebar.jsx`, `Topbar.jsx` | 2 | ✅ |
| 6 | Create `PrintTemplate.cs` entity | New entity file | 3 | ✅ |
| 7 | Add `PrintTemplates` to `DbContext` | `EduVaultDbContext.cs` | 3 | ✅ |
| 8 | Add `PrintTemplates` to `UnitOfWork` | `UnitOfWork.cs`, `IUnitOfWork.cs` | 3 | ✅ |
| 9 | Create `PrintTemplatesController.cs` | New controller | 3 | ✅ |
| 10 | Add AI generate endpoint + AiService extension | `AiPlannerService.cs`, controller | 3 | ✅ |
| 11 | Create `PrintIframe.jsx` component | New component | 3 | ✅ |
| 12 | Create `PrintFormatStudio.jsx` page | New page + route | 3 | ✅ |
| 13 | Replace `window.print()` with PrintIframe/rendered print | `CounterFeeDesk.jsx`, `Salaries.jsx`, `print.css` | 3 | ✅ |
| 14 | Create `SuperPrintGallery.jsx` page | New page + route | 4 | ✅ |
| 15 | Implement push-to-schools API endpoint | `SuperAdminController.cs`, `PrintTemplatesController.cs` | 4 | ✅ |
| 16 | Principal Morning Briefing widget | `Dashboard.jsx` | 5 | ✅ |
| 17 | 15-second mobile roll call UI | `TeacherAttendance.jsx` / `TeacherPages.jsx` | 5 | ✅ |
| 18 | Multi-sibling switcher for parents | `StudentPages.jsx` + backend | 5 | ✅ |
| 19 | Payslip via Format Studio (not window.print) | `Salaries.jsx` | 5 | ✅ |
| 20 | Barcode continuous scan mode for Librarian | `IssueReturn.jsx` | 5 | ✅ |
| 21 | Tally XML Export | `TallyExportController.cs`, `Salaries.jsx` | 6 | ✅ |
| 22 | WhatsApp Conversational Bot | `WhatsAppWebhookController.cs`, `FeeAlertBackgroundService.cs` | 6 | ✅ |
| 23 | AI Question Paper Generator | `AiPlannerService.cs`, `SchoolPlanController.cs`, `TeacherPages.jsx` | 6 | ✅ |

---
*EduVault Full Implementation Plan — Confidential Engineering Reference Document*
