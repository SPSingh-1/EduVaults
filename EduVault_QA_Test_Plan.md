# EduVault — Comprehensive End-to-End QA Test Plan
**Role:** Senior QA Engineer  
**Scope:** Full system — all roles, pages, tabs, sub-tabs, modals, events, API integrations  
**Architecture:** React (Vite) Frontend ↔ ASP.NET Core API ↔ Express.js Auxiliary API ↔ MongoDB/SQL DB

---

## 🏗️ System Architecture Overview

```
Browser (React SPA)
    ├─ EduVault.Web   → Vite + React + TailwindCSS (port 5173)
    │
    ├─ EduVault.Api   → ASP.NET Core (port 5265) — Primary REST API
    │       Controllers: Auth, Academics, Billing, Exams, Library, RBAC, SuperAdmin, Support, Account
    │
    ├─ EduVault.Express → Node.js + Socket.IO (port 5005) — Auxiliary API
    │       Routes: /api/logs, /api/notifications, /api/remarks, /api/chat,
    │               /api/homework, /api/syllabus, /api/holidays,
    │               /api/teacher-attendance, /api/documents, /api/school-settings
    │
    └─ Databases: SQL (ASP.NET) + MongoDB (Express)
```

---

## 👥 User Roles & Routes Map

| Role | Portal Route | Accessible Portals |
|------|-------------|-------------------|
| `superadmin` | `/super-admin` | SuperAdmin portal |
| `schooladmin` | `/school-admin` | School Admin + Account (`/account`) + Library (`/library`) |
| `accountmanager` | `/account` | Account/HRM portal |
| `librarian` | `/library` | Library portal |
| `teacher` | `/teacher` | Teacher portal |
| `student` | `/student` | Student portal |

---

## 🔐 MODULE 1 — AUTHENTICATION & ROUTING

### 1.1 Landing Page (`/`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-001 | Landing page loads correctly | Navigate to `/` | Marketing page renders, no JS errors in console |
| TC-002 | CTA buttons redirect | Click "Get Started" / "Login" CTAs | Redirects to `/signup` or `/login` respectively |
| TC-003 | Demo page accessible | Navigate to `/demo` | Demo page renders without auth |
| TC-004 | Unknown route redirects | Navigate to `/invalid-route` | Redirected to `/` (catch-all route) |

### 1.2 Login Flow (`/login`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-005 | Valid SuperAdmin login | Enter valid superadmin credentials → Submit | JWT stored in `localStorage.eduvault_token`, redirected to `/super-admin/dashboard` |
| TC-006 | Valid SchoolAdmin login | Enter valid schooladmin credentials → Submit | Redirected to `/school-admin/dashboard`, `eduvault_user` stored |
| TC-007 | Valid Teacher login | Enter valid teacher credentials | Redirected to `/teacher/dashboard` |
| TC-008 | Valid Student login | Enter valid student credentials | Redirected to `/student/dashboard` |
| TC-009 | Valid AccountManager login | Enter valid AM credentials | Redirected to `/account/dashboard` |
| TC-010 | Valid Librarian login | Enter valid librarian credentials | Redirected to `/library/dashboard` |
| TC-011 | Invalid credentials | Enter wrong email/password → Submit | Error message displayed: "Invalid credentials. Please try again." |
| TC-012 | Empty form submission | Click Login with empty fields | Validation error shown, API not called |
| TC-013 | Rate limiting (429) | Submit login 6+ times rapidly | Error: "Too many requests. Please wait a moment..." |
| TC-014 | Maintenance mode redirect | Login when maintenance active (non-admin role) | `maintenanceActive=true` → redirect to `/maintenance` |
| TC-015 | Brand sync on login | Login as schooladmin | `themeColor` applied to CSS variables `--color-primary` within 5s |
| TC-016 | Forgot password link | Click "Forgot Password" | Navigates to `/forgot-password` |

### 1.3 Signup Flow (`/signup`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-017 | School registration | Fill all required fields → Submit | `POST /auth/register-school` called, success message |
| TC-018 | Required field validation | Submit with missing fields | Validation errors per field |
| TC-019 | Duplicate email check | Register with existing email | API returns error, displayed to user |

### 1.4 Forgot Password (`/forgot-password`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-020 | Submit valid email | Enter registered email → Submit | Success message "Reset link sent" |
| TC-021 | Submit invalid email | Enter non-existent email | Appropriate error shown |

### 1.5 Protected Route Guards
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-022 | Unauthenticated access to protected route | Navigate to `/school-admin/dashboard` without login | Redirected to `/login` |
| TC-023 | Wrong role access | Login as teacher, navigate to `/super-admin/dashboard` | Redirected/Blocked (ProtectedRoute allowedRoles check) |
| TC-024 | SchoolAdmin alias routes work | Navigate to `/school_admin/dashboard` | Redirect to `/school-admin/dashboard` via SchoolAdminRedirect |
| TC-025 | Logout clears session | Click logout → navigate to protected route | localStorage cleared, redirected to `/login` |

### 1.6 Maintenance Mode (`/maintenance`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-026 | Maintenance page renders | Navigate to `/maintenance` | Maintenance page shows (no redirect loop) |

---

## 🛡️ MODULE 2 — SUPER ADMIN PORTAL (`/super-admin`)

### 2.1 Super Admin Dashboard (`/super-admin/dashboard`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-027 | Dashboard stats load | Navigate to dashboard | School count, active subscriptions, MRR stats render |
| TC-028 | Charts render | Wait for dashboard load | Charts/graphs populate with data |
| TC-029 | Navigation sidebar present | Check sidebar | All 7 nav items: Dashboard, Schools, Subscriptions, Settings, Access Control, Support, Notices |

### 2.2 Schools Management (`/super-admin/schools`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-030 | Schools list loads | Navigate to Schools | Table renders with school records |
| TC-031 | Search by school name | Type in search box | Table filters schools in real-time |
| TC-032 | Date range filter | Set dateFrom and dateTo | Schools filtered by registration date |
| TC-033 | Status filter | Select "Active"/"Pending"/"Suspended" | Table filters by status |
| TC-034 | Type filter | Select school type | Schools filtered by type |
| TC-035 | Sort columns | Click column headers (↑↓ arrows) | Table re-sorts correctly |
| TC-036 | Add new school | Click "+ Add School" → Fill form → Submit | `POST /super-admin/schools` called, school added, table refreshes |
| TC-037 | Required fields validation | Submit empty form | Validation errors shown per field |
| TC-038 | Logo URL field | Enter invalid URL | `safeUrl()` function returns `/logo.jpeg` fallback |
| TC-039 | Theme color picker | Select color via color picker | `themeColor` field updates |
| TC-040 | View school details | Click "View" on school row | School detail modal/panel opens with full info |
| TC-041 | Edit school | Click "Edit" on row → Modify → Save | `PUT /super-admin/schools/{id}` called, data updated |
| TC-042 | Suspend school | Click "Suspend" on active school | Status changes to "Suspended" |
| TC-043 | Activate school | Click "Activate" on suspended school | Status changes to "Active" |
| TC-044 | Activity log inline | View school → check activity log | School-specific activity logs shown |

### 2.3 Subscriptions (`/super-admin/subscriptions`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-045 | Stats KPIs load | Navigate to Subscriptions | MRR, Active Subscribers, Growth % cards load |
| TC-046 | Global plans tab | Click "Global" tab | Global pricing plans shown |
| TC-047 | Custom pricing tab | Click "Custom" sub-tab | Custom plans form per school rendered |
| TC-048 | Upgrade requests tab | Click "Requests" sub-tab | Upgrade request list loads |
| TC-049 | Date filter on renewals | Set date range | Renewals filtered |
| TC-050 | Filter by school | Select school from dropdown | Requests filtered to that school |
| TC-051 | View request details | Click request row → View button | Details popup shows request info, requirements text |
| TC-052 | Approve upgrade request | Open request → Click "Approve" → Set pricing → Submit | `POST /billing/approve-upgrade` called, school plan updated |
| TC-053 | Reject upgrade request | Open request → Click "Reject" | Request status updated to Rejected |
| TC-054 | Save custom plan | Select school → Modify custom pricing → Save | `POST /billing/custom-plan` saved |
| TC-055 | Auto-select latest school | Load requests tab | Latest school auto-selected in filter |

### 2.4 Settings (`/super-admin/settings`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-056 | Platform settings load | Navigate to Settings | Current theme color, maintenance mode, payment provider shown |
| TC-057 | Change theme color | Pick new primary color → Save | `PATCH /auth/settings` called, CSS variables update within 5s (polling interval) |
| TC-058 | Toggle maintenance mode ON | Enable maintenance → Save | All non-admin users see maintenance page on next auth check |
| TC-059 | Toggle maintenance mode OFF | Disable maintenance → Save | Platform accessible again |
| TC-060 | Payment provider switch | Change from Razorpay to Stripe/Paytm → Save | Provider setting saved |

### 2.5 Access Control (`/super-admin/access-control`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-061 | Role list loads | Navigate to Access Control | 5 roles shown: School Admin, Teacher, Student, Account Manager, Librarian |
| TC-062 | Select role | Click on "Teacher" role | Role details + permissions panel expands |
| TC-063 | View permissions matrix | Select role → View permissions tab | All pages/modules listed with canView toggle |
| TC-064 | Toggle permission canView OFF | Uncheck canView for "teacher.marks" → Save | `PUT /rbac/permissions` called, teacher cannot see Marks Entry |
| TC-065 | Toggle permission canView ON | Re-enable canView → Save | Teacher sees Marks Entry in sidebar again |
| TC-066 | Sidebar reflects RBAC | Login as teacher with restricted perms | Sidebar only shows pages where `canView=true` |
| TC-067 | Add custom page | Click "+ Add Page" → Enter route/name → Save | New page added to role's permission set |
| TC-068 | Delete permission | Click delete on custom page → Confirm | Permission removed |
| TC-069 | Reset to defaults | Click "Reset to Defaults" → Confirm | Default permissions restored for role |

### 2.6 Support (`/super-admin/support`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-070 | Support tickets load | Navigate to Support | Ticket list renders |
| TC-071 | View ticket | Click on ticket | Ticket details open |
| TC-072 | Respond to ticket | Type response → Submit | Response saved, school admin notified |
| TC-073 | Close ticket | Click "Close Ticket" | Status changes to Closed |

### 2.7 Notices (`/super-admin/notices`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-074 | Create global notice | Click "+ New Notice" → Fill title/body → Select "ALL" recipient → Submit | `POST /api/notifications` (Express) called with recipientId="ALL", WebSocket broadcast |
| TC-075 | Create school-targeted notice | Select specific school → Submit | Notice sent to specific school's users |
| TC-076 | Notice list loads | Check notices list | All sent notices displayed with timestamps |

---

## 🏫 MODULE 3 — SCHOOL ADMIN PORTAL (`/school-admin`)

### 3.1 School Admin Dashboard (`/school-admin/dashboard`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-077 | Dashboard stats load | Navigate to dashboard | Student count, teacher count, fee collection stats render |
| TC-078 | Charts render | Wait for load | Attendance, enrollment, fee trend charts populated |
| TC-079 | Recent activity shown | Check activity section | Latest activity logs from Express API shown |

### 3.2 Students Module (`/school-admin/students`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-080 | Student list loads | Navigate to Students | All students listed in table |
| TC-081 | Search by name | Type name in search | Filtered in real-time |
| TC-082 | Filter by class | Select class from dropdown | Students filtered by class |
| TC-083 | Filter by section | Select section | Students filtered |
| TC-084 | Filter by status | Select ACTIVE / WITHDRAWN / SUSPENDED | Status-based filter |
| TC-085 | Date range filter | Set join date range | Students filtered by admission date |
| TC-086 | Add new student | Click "+ Add Student" → Fill all required fields → Submit | `POST /academics/students` called, student created with default password `Student123!` |
| TC-087 | Required field validation | Submit without name/email/classId | Validation errors shown |
| TC-088 | Capacity warning | Add student to full class | `capacityWarning` message displayed |
| TC-089 | Email suggestions | Type partial email | Autocomplete suggestions appear from `suggestions` state |
| TC-090 | Edit student | Click "Edit" on row → Modify → Save | `PUT /academics/students/{id}` called, record updated |
| TC-091 | View student | Click "View" on row | Student detail modal opens with full profile |
| TC-092 | Promote student | Click "Promote" → Select next class → Submit | `POST /academics/students/{id}/promote` called, class changed |
| TC-093 | Promote without selecting class | Click Promote → Submit without class | `promoteError` shown |
| TC-094 | Change student status | Edit → Change status to SUSPENDED → Save | Student status updated |

### 3.3 Teachers Module (`/school-admin/teachers`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-095 | Teacher list loads | Navigate to Teachers | Directory tab shows teacher list |
| TC-096 | Search teacher | Type name | Real-time filter |
| TC-097 | Filter by department | Select department | Filtered by department |
| TC-098 | Filter by status | Select Active/On Leave | Status filter |
| TC-099 | Date range filter | Set date range | Join date filter |
| TC-100 | Add new teacher | Click "+ Add Teacher" → Fill form → Submit | `POST /academics/teachers` called, teacher created |
| TC-101 | Edit teacher | Click "Edit" → Modify → Save | Teacher record updated |
| TC-102 | View teacher | Click "View" | Full profile modal shown |
| TC-103 | Import teachers (CSV) | Click "Import" → Upload CSV → Submit | Bulk import via `POST /academics/teachers/import`, importResult displayed |
| TC-104 | Import error handling | Upload malformed CSV | `importError` shown |
| TC-105 | **Daily Attendance Tab** | Click "Daily Attendance" tab | Tab switches, date selector shown |
| TC-106 | Load today's attendance | Select date → Load | Express API `GET /teacher-attendance/date/{date}` called |
| TC-107 | Mark attendance | Toggle each teacher P/A/L → Save | Attendance records saved |
| TC-108 | **Teacher Inspection Tab** | Click "Attendance Inspection" sub-tab | Teacher dropdown appears |
| TC-109 | Select teacher for inspection | Choose teacher from dropdown | `GET /teacher-attendance/teacher/{id}` called, history + stats load |
| TC-110 | Navigate inspection months | Click prev/next month | Calendar changes, new data loads |
| TC-111 | Click day in calendar | Click on a day with record | `selectedInspectionDayRecord` set, day details shown |

### 3.4 Classes Module (`/school-admin/classes`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-112 | Classes list loads | Navigate to Classes | All classes in table |
| TC-113 | Create new class | Click "+ Create New Class/Section" → Fill grade, section, room → Submit | `POST /academics/classes` called |
| TC-114 | Required fields check | Submit without grade/section/room | Error: "Please fill in all required fields." |
| TC-115 | Assign class teacher | Click "Assign Teacher" icon → Select teacher → Submit | `POST /academics/classes/{id}/assign-teacher` called |
| TC-116 | View occupancy | Check Occupancy column | Student count vs capacity shown |

### 3.5 Fees Module (`/school-admin/fees`)

**Tabs:** `invoices` | `structures` | `student-ledger` | `transactions`

| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-117 | **Invoices Tab** loads | Navigate to Fees → Invoices tab (default) | Invoice list renders |
| TC-118 | Search invoice | Type student name/invoice# | Filter applied |
| TC-119 | Date range filter | Set date range | Invoices filtered |
| TC-120 | Status filter | Select Paid/Pending/Overdue | Filtered |
| TC-121 | Create new invoice | Click "+ New Invoice" → Fill modal → Submit | `POST /billing/invoices` called |
| TC-122 | Edit invoice | Click "Edit" → Modify → Save | Invoice updated |
| TC-123 | Send invoice reminder | Click "Bell" icon on overdue invoice | Reminder notification sent |
| TC-124 | Download invoice | Click "Download" | PDF/receipt downloaded |
| TC-125 | **Structures Tab** | Click "Structures" tab | Fee structures table renders |
| TC-126 | Create structure | Click "+ New Structure" → Fill → Submit | Fee structure created |
| TC-127 | **Student Ledger Tab** | Click "Student Ledger" tab | Ledger renders |
| TC-128 | **Transactions Tab** | Click "Transactions" tab | Transaction history renders |
| TC-129 | Chart renders | Check fee bar chart | Bar chart shows collected vs outstanding |

### 3.6 Exams Module (`/school-admin/exams`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-130 | Exams page loads | Navigate to Exams | Exam list renders |
| TC-131 | Create exam | Click "+ Create Exam" → Fill details → Submit | Exam created |
| TC-132 | Edit exam | Click "Edit" → Modify → Save | Exam updated |

### 3.7 Notices Module (`/school-admin/notices`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-133 | Notices list loads | Navigate to Notices | List from Express `GET /api/notifications` |
| TC-134 | Create notice | Click "+ New Notice" → Fill title/body/type → Select recipients → Submit | `POST /api/notifications` called, Socket.IO broadcasts |
| TC-135 | Recipient "ALL" | Select "All Users" | `recipientId: "ALL"` → school-wide broadcast |
| TC-136 | Recipient "TEACHERS" | Select "All Teachers" | `recipientId: "TEACHERS"` |
| TC-137 | Notice types | Select URGENT/EVENT/GENERAL/BILLING | Type correctly set in payload |
| TC-138 | Real-time notice delivery | Open teacher portal in separate tab, send notice | Bell icon updates in real-time via Socket.IO |

### 3.8 Setup Module (`/school-admin/setup`)

**Tabs:** `infrastructure` | `timetable` | `substitutions` | `fees` (fee rules) | `promotions` | Subscription

| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-139 | **Infrastructure Tab** (default) | Open Setup page | Infrastructure tab active |
| TC-140 | Add section | Type new section name → Click "Add" | `POST /academics/sections` called |
| TC-141 | Add room | Type room → Click "Add" | `POST /academics/rooms` called |
| TC-142 | Add grade level | Type grade → Click "Add" | `POST /academics/grade-levels` called |
| TC-143 | Add capacity | Type capacity → Click "Add" | `POST /academics/capacities` called |
| TC-144 | Add department | Type department → Click "Add" | `POST /academics/departments` called |
| TC-145 | Add exam type | Type exam type → Click "Add" | `POST /academics/exam-types` called |
| TC-146 | School timing settings | Scroll to GPS Geofence section | School start/end time, grace period fields visible |
| TC-147 | Detect GPS location | Click "Detect My Location" button | Browser geolocation API triggered, lat/long updated |
| TC-148 | GPS browser denied | Deny browser geolocation → Click detect | Error alert: "Failed to detect GPS location" |
| TC-149 | Save school settings | Modify timing → Save | `POST /school-settings` (Express) called successfully |
| TC-150 | **Timetable Tab** | Click "Timetable" tab | Tab switches, class selector shown |
| TC-151 | Select class | Choose class from dropdown | `classSubjectsList` loaded for that class |
| TC-152 | View timetable grid | Class selected | Mon-Fri × Period grid renders |
| TC-153 | Click empty timetable cell | Click cell | `showCellModal=true`, cell modal opens |
| TC-154 | Add schedule entry | Fill department/subject/teacher/remark → Save | `POST /academics/schedule` called |
| TC-155 | Assign subject-teacher mapping | Click "Assign Mapping" → Fill → Submit | Mapping created |
| TC-156 | **Substitutions Tab** | Click "Substitutions" tab | Active alerts list shown |
| TC-157 | View substitution alert | Click alert item | Available substitutes listed |
| TC-158 | Assign substitute teacher | Select substitute → Confirm | Substitution assignment saved |
| TC-159 | **Fee Rules Tab** | Click "Fee Rules" tab | Fee rules list + form shown |
| TC-160 | Create class-type fee rule | Select type="class" → fill class/amount/installments → Submit | Fee rule created |
| TC-161 | Create student-type fee rule | Select type="student" → fill studentId/amount → Submit | Student-specific fee rule created |
| TC-162 | **Student Promotions Tab** | Click "Promotions" tab | Students list with filters |
| TC-163 | Filter promotion students | Filter by class/section/status | Filtered list |
| TC-164 | View student detail | Click "View" | promoViewModal opens |
| TC-165 | Promote student | Click "Promote" → Select next class → Submit | `POST /academics/students/{id}/promote` called |
| TC-166 | **Subscription Section** | Scroll to subscription area | Sub info: status, plan type, start/end date |
| TC-167 | Subscription remaining days | Check remaining days counter | `getRemainingDays()` calculated correctly |
| TC-168 | Request plan upgrade | Click "Request Upgrade" → Fill requirements → Submit | `POST /billing/upgrade-request` called |
| TC-169 | Empty requirements validation | Submit upgrade without text | Alert: "Please specify your project requirements." |
| TC-170 | Pay/Renew subscription | Click "Pay Now"/"Renew" | Razorpay checkout script loaded, payment flow triggered |

### 3.9 Reports Module (`/school-admin/reports`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-171 | Reports page loads | Navigate to Reports | Class + student + exam type dropdowns loaded |
| TC-172 | Select class | Choose class | Students in that class populate |
| TC-173 | Select student | Click on student row | `selectedStudent` set |
| TC-174 | Generate report | Select exam type → Click "Generate Report" | `GET /academics/report/{studentId}?examType=...` called, report details shown |
| TC-175 | Approve student report | Click "Approve" on student | `POST /academics/reports/approve` called |
| TC-176 | Bulk approve all | Click "Approve All" → Confirm | All students in class approved |
| TC-177 | Print report card | Click "Print" | Print dialog triggered (`window.print()`) |
| TC-178 | Share report | Click "Share" / "Publish" | Report published status set |
| TC-179 | Exam type filter | Change exam type dropdown | Report regenerated for new type |

### 3.10 Admission Module (`/school-admin/admission`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-180 | Admissions page loads | Navigate to Admission | Admission enquiries / applications listed |
| TC-181 | Enroll from admission | Select enquiry → Click "Enroll" | Student record created |

### 3.11 Tickets Module (`/school-admin/tickets`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-182 | Tickets list loads | Navigate to Tickets | Support ticket list renders |
| TC-183 | Create support ticket | Click "+ New Ticket" → Fill subject/description → Submit | `POST /support/tickets` called |
| TC-184 | View ticket thread | Click ticket | Thread / replies shown |
| TC-185 | View super admin reply | Check ticket | Response from super admin visible |

### 3.12 Profile (`/school-admin/profile`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-186 | Profile page loads | Navigate to Profile | School admin profile data shown |
| TC-187 | Edit profile | Modify fields → Save | Profile updated |
| TC-188 | Change password | Old password + new password → Submit | Password changed |

### 3.13 Account Manager Registration (`/school-admin/account-managers`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-189 | AM registration list | Navigate to Account Managers | Existing AMs listed |
| TC-190 | Register new AM | Fill form → Submit | `POST /auth/register-account-manager` called |
| TC-191 | Delete AM | Click "Delete" on AM | AM removed |

### 3.14 Librarian Registration (`/school-admin/librarians`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-192 | Librarian list loads | Navigate to Librarians | Librarians listed |
| TC-193 | Register new librarian | Fill form → Submit | Librarian registered |

---

## 💰 MODULE 4 — ACCOUNT MANAGER / HRM PORTAL (`/account`)

### 4.1 Account Dashboard (`/account/dashboard`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-194 | Dashboard stats | Navigate to dashboard | Total salaries, pending leaves, expense totals shown |
| TC-195 | Charts render | Wait for load | Financial trend charts rendered |

### 4.2 School Billing (`/account/billing`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-196 | Billing page loads | Navigate to Billing | Platform billing / subscription invoices listed |
| TC-197 | View invoice | Click invoice | Invoice detail shown |
| TC-198 | Download invoice | Click Download | PDF downloaded |

### 4.3 Salaries (`/account/salaries`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-199 | Salary list loads | Navigate to Salaries | Teacher salary records listed |
| TC-200 | Filter by month | Select month/year | Filtered records |
| TC-201 | Generate salary | Click "Generate Payroll" for month | Salary slips generated per active teacher |
| TC-202 | Mark salary paid | Click "Mark Paid" on record | Status updated to Paid |
| TC-203 | Search teacher | Type name | Filter by teacher name |

### 4.4 Salary Rules (`/account/salary-rules`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-204 | Rules list loads | Navigate to Salary Rules | Allowances/deductions rules listed |
| TC-205 | Create rule | Click "+ New Rule" → Fill → Submit | Salary rule created |
| TC-206 | Edit rule | Click "Edit" → Modify → Save | Rule updated |
| TC-207 | Delete rule | Click "Delete" → Confirm | Rule removed |

### 4.5 Leave Requests (`/account/leaves`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-208 | Leave requests list | Navigate to Leaves | All teacher leave applications listed |
| TC-209 | Filter by status | Select Pending/Approved/Rejected | Filtered |
| TC-210 | Filter by teacher | Select teacher | Single teacher's leaves shown |
| TC-211 | Approve leave | Click "Approve" on pending leave | Status updated, teacher notified via socket |
| TC-212 | Reject leave | Click "Reject" with reason | Status updated to Rejected |
| TC-213 | Deduct quota on approval | Approve leave | Leave quota for that type decremented |

### 4.6 Leave Quotas (`/account/quotas`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-214 | Quotas page loads | Navigate to Quotas | Quota allocations per teacher/leave-type shown |
| TC-215 | Edit quota | Modify allowed days → Save | Quota updated |

### 4.7 Expenses (`/account/expenses`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-216 | Expenses list loads | Navigate to Expenses | Expense records listed |
| TC-217 | Add expense | Click "+ Add" → Fill category/amount/date → Submit | Expense record created |
| TC-218 | Edit expense | Click "Edit" → Modify → Save | Updated |
| TC-219 | Delete expense | Click "Delete" → Confirm | Removed |
| TC-220 | Filter by category | Select category filter | Filtered expenses |

### 4.8 Account Profile (`/account/profile`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-221 | Profile loads | Navigate to Profile | AM profile info shown |
| TC-222 | Edit profile | Modify → Save | Updated |

---

## 📚 MODULE 5 — LIBRARY PORTAL (`/library`)

### 5.1 Library Dashboard (`/library/dashboard`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-223 | Dashboard loads | Navigate to dashboard | Total books, issued, overdue, fines stats shown |
| TC-224 | Recent transactions | Check recent section | Last 5 issue/return transactions listed |

### 5.2 Book Catalog (`/library/catalog`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-225 | Book list loads | Navigate to Catalog | All books displayed |
| TC-226 | Search by title/author | Type in search | Filtered results |
| TC-227 | Filter by category | Select category | Books filtered |
| TC-228 | Add new book | Click "+ Add Book" → Fill title/author/ISBN/copies → Submit | Book record created via `POST /library/books` |
| TC-229 | Edit book | Click "Edit" → Modify → Save | Book updated |
| TC-230 | Delete book | Click "Delete" → Confirm | Book removed (if no active issues) |
| TC-231 | View book details | Click "View" | Detail modal with availability shown |

### 5.3 Issue/Return (`/library/issue-return`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-232 | Issue book to student | Search student → Select book → Set due date → Submit | Book issued, `POST /library/issue` called |
| TC-233 | Issue book to teacher | Search teacher → Select book → Submit | Book issued to teacher |
| TC-234 | Return book | Click "Return" on active issue record | Book returned, `POST /library/return` called |
| TC-235 | Overdue fine calculation | Return overdue book | Fine calculated per library settings |
| TC-236 | Fine waiver | Click "Waive Fine" → Confirm | Fine removed |
| TC-237 | Search book by ISBN | Type ISBN | Book auto-selected |

### 5.4 Transaction History (`/library/transactions`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-238 | Transactions load | Navigate to Transactions | All issue/return transactions listed |
| TC-239 | Filter by date | Set date range | Filtered by transaction date |
| TC-240 | Filter by type | Select Issued/Returned/Overdue | Status filter |

### 5.5 Library Settings (`/library/settings`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-241 | Settings load | Navigate to Settings | Fine per day, max borrow days, max books per user shown |
| TC-242 | Save settings | Modify values → Save | Settings saved, future fine calculations use new values |
| TC-243 | Validation | Enter negative fine → Save | Error shown |

### 5.6 Library Profile (`/library/profile`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-244 | Profile loads | Navigate to Profile | Librarian profile shown |

---

## 👨‍🏫 MODULE 6 — TEACHER PORTAL (`/teacher`)

### Teacher Sidebar RBAC Check
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-245 | Dynamic permissions | Login as teacher with custom RBAC | Sidebar only shows pages where `p.canView=true` from permissions |
| TC-246 | Library module conditional | `hasLibraryModule=true` on user | "My Library Books" appears in sidebar |
| TC-247 | Library module absent | `hasLibraryModule=false` | "My Library Books" hidden |

### 6.1 Teacher Dashboard (`/teacher/dashboard`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-248 | Stats load | Navigate to dashboard | `GET /academics/teacher/stats` called, cards rendered |
| TC-249 | Today's schedule view | Toggle "Today" | Today's timetable slots shown |
| TC-250 | Week schedule view | Toggle "Week" | Weekly timetable shown |
| TC-251 | Chart mode toggle | Toggle Attendance vs Enrollment chart | Chart data switches via `teacherChartMode` state |

### 6.2 My Classes (`/teacher/classes`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-252 | Classes list loads | Navigate to Classes | Teacher's assigned classes shown |
| TC-253 | View class details | Click on class | Class info, subject, students count shown |

### 6.3 Students (`/teacher/students`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-254 | Students list loads | Navigate to Students | Students in teacher's classes |
| TC-255 | Search student | Type name | Real-time filter |

### 6.4 Attendance (`/teacher/attendance`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-256 | Attendance form loads | Navigate to Attendance | Class selector + date picker shown |
| TC-257 | Select class and date | Choose class + date | Student list loads |
| TC-258 | Mark all present | Click "All Present" | All students set to Present |
| TC-259 | Mark individual absent | Click "Absent" on student | Student status set to Absent |
| TC-260 | Submit attendance | Click "Submit" | `POST /academics/attendance` called, success shown |
| TC-261 | View attendance history | Toggle to "History" | Past attendance records shown per class |

### 6.5 My Attendance (Self) (`/teacher/self-attendance`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-262 | Self attendance loads | Navigate to Self Attendance | Own attendance calendar shown (from Express) |
| TC-263 | Check in (GPS) | Click "Check In" | GPS detected, geofence validated against school settings |
| TC-264 | Inside geofence | Device within `geofenceRadiusMeters` | Check-in accepted, `POST /teacher-attendance` saved |
| TC-265 | Outside geofence | Device outside radius | Error: "You are outside the school premises" |
| TC-266 | Late check-in | Check in after `schoolStartTime + gracePeriodMinutes` | Status marked as "Late" |
| TC-267 | Check out | Click "Check Out" | Check-out time recorded |

### 6.6 My Leaves (`/teacher/leaves`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-268 | Leaves list loads | Navigate to Leaves | Teacher's leave applications listed |
| TC-269 | Apply for leave | Click "+ Apply" → Select type/dates/reason → Submit | Leave request submitted to account manager |
| TC-270 | Leave quota check | Check quota display | Remaining leave days per type shown |
| TC-271 | View leave status | Check status column | Pending/Approved/Rejected |
| TC-272 | Cancel pending leave | Click "Cancel" on pending | Leave cancelled |

### 6.7 Marks Entry (`/teacher/marks`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-273 | Marks entry form loads | Navigate to Marks | Class + subject + exam type dropdowns shown |
| TC-274 | Select class/subject/exam | Choose from dropdowns | Students in that class listed |
| TC-275 | Enter marks | Type marks for each student | Input accepts numbers |
| TC-276 | Validate max marks | Enter marks > maxMarks | Validation error shown |
| TC-277 | Save marks | Click "Save Marks" | `POST /academics/marks` called, success message |
| TC-278 | Edit existing marks | Load already-entered marks | Existing values pre-populated |

### 6.8 Homework (`/teacher/homework`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-279 | Homework list loads | Navigate to Homework | `GET /api/homework` (Express) called, homework list shown |
| TC-280 | Create homework | Click "+ New" → Select class/subject/due date/description → Submit | `POST /api/homework` called |
| TC-281 | Edit homework | Click "Edit" → Modify → Save | Homework updated |
| TC-282 | Delete homework | Click "Delete" → Confirm | Homework removed |
| TC-283 | Filter by class | Select class | Homework filtered |

### 6.9 Holiday Calendar (`/teacher/holidays`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-284 | Holidays load | Navigate to Holidays | `GET /api/holidays` (Express) called, calendar shown |
| TC-285 | Add holiday | Click "+ Add Holiday" → Fill name/date → Submit | `POST /api/holidays` called |
| TC-286 | Delete holiday | Click "Delete" → Confirm | Holiday removed |

### 6.10 Remarks (`/teacher/remarks`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-287 | Remarks list loads | Navigate to Remarks | `GET /api/remarks` (Express) called |
| TC-288 | Add remark | Select student → Type remark → Submit | `POST /api/remarks` called, student can view |
| TC-289 | Student filter | Select specific student | Only that student's remarks shown |

### 6.11 Notices (`/teacher/notices`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-290 | Notices load | Navigate to Notices | Notifications from Express API rendered |
| TC-291 | Real-time notification | Send notice from admin portal | Teacher sees bell update in real-time |
| TC-292 | Mark as read | Click notification | `POST /api/notifications/read` called, `isRead=true` |

### 6.12 My Library Books (`/teacher/my-books`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-293 | Issued books load | Navigate to My Books | Teacher's currently issued books listed |
| TC-294 | View due date | Check due date column | Due dates shown correctly |
| TC-295 | Overdue highlight | Past-due book | Row highlighted in red/warning color |

### 6.13 Teacher Profile (`/teacher/profile`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-296 | Profile loads | Navigate to Profile | Teacher's info shown |
| TC-297 | Edit profile | Modify → Save | Profile updated |

---

## 🎓 MODULE 7 — STUDENT PORTAL (`/student`)

### Student Sidebar RBAC
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-298 | Library conditional | `hasLibraryModule=true` | "My Library Books" visible |
| TC-299 | Library hidden | `hasLibraryModule=false` | "My Library Books" not in sidebar |

### 7.1 Student Dashboard (`/student/dashboard`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-300 | Dashboard loads | Navigate to dashboard | Attendance %, pending fees, upcoming exams, notices shown |
| TC-301 | Pie chart renders | Check attendance chart | Recharts PieChart shows present/absent breakdown |
| TC-302 | Bar chart renders | Check results chart | Subject-wise marks bar chart shown |
| TC-303 | Recent homework | Check homework section | Latest 3 homework items listed |
| TC-304 | Recent remarks | Check remarks section | Latest remarks visible |

### 7.2 Schedule (`/student/schedule`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-305 | Schedule loads | Navigate to Schedule | Timetable for student's class shown |
| TC-306 | Day view | Select day | Schedule for that day shown |
| TC-307 | Week view | View full week | 5-day × periods grid shown |

### 7.3 Attendance (`/student/attendance`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-308 | Attendance loads | Navigate to Attendance | Own attendance records from `GET /academics/attendance/student` |
| TC-309 | Calendar view | Check monthly calendar | Present/Absent/Late color-coded |
| TC-310 | Stats shown | Check stats section | Total present, absent, late, % shown |
| TC-311 | Filter by month | Navigate month | Calendar shifts, stats recalculated |

### 7.4 Homework (`/student/homework`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-312 | Homework list loads | Navigate to Homework | `GET /api/homework` scoped to student's class |
| TC-313 | Filter by subject | Select subject | Homework filtered |
| TC-314 | Overdue highlight | Past due date | Overdue items highlighted |
| TC-315 | View homework detail | Click homework | Description + due date + subject shown |

### 7.5 Syllabus (`/student/syllabus`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-316 | Syllabus loads | Navigate to Syllabus | `GET /api/syllabus` (Express) called |
| TC-317 | Subject-wise syllabus | Expand subject | Topics/units listed |

### 7.6 My Library Books (`/student/my-books`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-318 | Issued books loads | Navigate to My Books | Currently issued books + due dates shown |
| TC-319 | Overdue books | Books past due | Warning/red indicator |
| TC-320 | Fine shown | Overdue fine | Fine amount displayed |

### 7.7 Holiday Calendar (`/student/holidays`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-321 | Holidays load | Navigate to Holidays | School holiday list shown |

### 7.8 Fees (`/student/fees`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-322 | Fee invoices load | Navigate to Fees | Own invoices from `GET /billing/student-invoices` |
| TC-323 | Pending invoice shown | Check pending | Amount, due date, status visible |
| TC-324 | Pay fee — Razorpay | Click "Pay Now" on pending invoice | Razorpay script loaded, checkout modal opens |
| TC-325 | Mock payment flow | Complete mock payment | `POST /billing/create-order` → Razorpay handler → `POST /billing/verify-payment` |
| TC-326 | Payment success | After payment | Invoice status changes to "Paid" |
| TC-327 | Payment failure | Cancel payment modal | Invoice remains "Pending" |
| TC-328 | Stripe flow | If provider=stripe | Stripe checkout flow triggered |
| TC-329 | PayTM flow | If provider=paytm | PayTM flow triggered |
| TC-330 | Paid invoice receipt | Click paid invoice | Receipt shown |

### 7.9 Exams (`/student/exams`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-331 | Exam schedule loads | Navigate to Exams | Upcoming exams listed |
| TC-332 | Exam details | Click exam | Subject, date, time, room shown |

### 7.10 Results (`/student/results`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-333 | Results load | Navigate to Results | `GET /academics/student/results` called |
| TC-334 | Select exam type | Choose Semester/Mid Term/Final | Results filtered |
| TC-335 | Subject-wise results | Check results | Marks, grade, total shown per subject |
| TC-336 | Overall grade shown | Check summary | Total % and grade shown |
| TC-337 | Approved only visible | Results approved by school admin | Only approved results visible |
| TC-338 | Print result | Click "Print" | Print dialog opens |

### 7.11 Notices (`/student/notices`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-339 | Notices load | Navigate to Notices | School notices and personal notices listed |
| TC-340 | Real-time notice | Admin sends notice | Student sees it without page refresh |
| TC-341 | Mark read | Click notice | `POST /api/notifications/read` called |

### 7.12 Student Profile (`/student/profile`)
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-342 | Profile loads | Navigate to Profile | Student personal, guardian, class info shown |
| TC-343 | Blood group | Check blood group | Displayed from student record |
| TC-344 | Guardian info | Check guardian section | Name, phone, relationship shown |

---

## 🔔 MODULE 8 — REAL-TIME & CROSS-CUTTING CONCERNS

### 8.1 WebSocket / Socket.IO
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-345 | Socket connection on login | Login as any role | Socket connects to Express server, joins school room (`io.to(schoolId)`) |
| TC-346 | Socket disconnect on logout | Logout | Socket disconnects |
| TC-347 | Notification broadcast | Admin sends notice to "ALL" | All connected users in school receive real-time notification |
| TC-348 | Targeted notification | Admin sends notice to specific user | Only that user's socket receives notification |
| TC-349 | Notification bell counter | Unread notifications exist | Bell icon shows unread count badge |
| TC-350 | Notification panel | Click bell icon | Panel opens with notification list |
| TC-351 | Mark all read | Click "Mark all as read" | All notifications marked read, badge clears |

### 8.2 Activity Logging
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-352 | Login event logged | Login successfully | Activity log entry created in MongoDB |
| TC-353 | Student created log | Admin creates student | Log: `actionType: "STUDENT_CREATED"` |
| TC-354 | Scoped logs | School admin views logs | Only own school's logs (Express filter by `schoolId`) |
| TC-355 | Super admin global logs | Super admin views activity | All schools' logs shown |

### 8.3 Theme / Branding
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-356 | School theme applied | Login as school user | `--color-primary` CSS var set from school's `themeColor` |
| TC-357 | Theme polls for changes | Super admin changes school theme | Within 5s polling interval, all users see new color |
| TC-358 | Contrast text adapts | Dark primary color | Sidebar text white; Light primary → text dark navy |
| TC-359 | Super admin theme | Super admin logs in | Platform's own `primaryColor` from `GET /auth/settings` applied |

### 8.4 Rate Limiting
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-360 | 200 req/15min limit | Send 201 requests to Express | 201st request returns HTTP 429 |
| TC-361 | API rate limit error | Trigger rate limit | Response: `{ error: "Too many requests..." }` |

### 8.5 Document Uploads
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-362 | Upload document | Navigate to upload section → select file | `POST /api/documents/upload` called, file saved to `uploads/` dir |
| TC-363 | View uploaded documents | Navigate to documents list | `GET /api/documents` returns metadata list |

---

## 🔑 MODULE 9 — API SECURITY & VALIDATION

### 9.1 JWT Authentication
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-364 | Missing token | Call API without Authorization header | HTTP 401 `"Access token missing"` |
| TC-365 | Expired/invalid token | Call API with tampered token | HTTP 403 `"Token invalid or expired"` |
| TC-366 | Valid token passes | Call API with valid JWT | Request proceeds |
| TC-367 | Role-based endpoint | Teacher calls SuperAdmin endpoint | HTTP 403 Forbidden |

### 9.2 CORS
| TC-ID | Test Case | Steps | Expected Result |
|-------|-----------|-------|-----------------|
| TC-368 | Allowed origin | Request from `localhost:5173` | Request passes CORS |
| TC-369 | Security headers | Check response headers | `helmet` headers present: X-Frame-Options, etc. |

---

## 📊 MODULE 10 — REGRESSION & EDGE CASES

| TC-ID | Test Case | Expected Result |
|-------|-----------|-----------------|
| TC-370 | All pages render without console errors | Navigate each route | Zero JS errors in browser console |
| TC-371 | Mobile responsive | Resize to 375px width | Sidebar collapses, tables scroll horizontally |
| TC-372 | Overflow scroll on tables | Tables wider than viewport | `overflowX: auto` applied, horizontal scroll works |
| TC-373 | Date filter input focus trick | Click date input | Shows text `dd/mm/yyyy` when blurred, native date picker when focused |
| TC-374 | Empty state display | No records exist | Empty state message shown (not blank page) |
| TC-375 | API failure graceful | Backend down → navigate any page | Error message shown, no crash |
| TC-376 | Long text in fields | Enter 500+ chars in name | Field truncation or max-length enforced |
| TC-377 | Special characters in search | Type `<script>alert(1)</script>` | No XSS, displayed as plain text |
| TC-378 | Concurrent sessions | Login same user in 2 tabs | Both sessions active (JWT stateless) |
| TC-379 | Back button after logout | Logout → click Back | Redirected to `/login` (auth guard) |
| TC-380 | Page refresh retains auth | Login → F5 refresh | `localStorage` restores session, stays on same page |

---

## 🐞 BUG REPORTING TEMPLATE

When a test fails, log it with:
```
Bug ID     : BUG-###
TC-ID      : TC-###
Module     : [Module Name]
Severity   : Critical / High / Medium / Low
Priority   : P1 / P2 / P3 / P4
Title      : [Short description]
Steps      : [Numbered repro steps]
Actual     : [What happened]
Expected   : [What should have happened]
Screenshot : [Attach]
Console    : [Paste any JS/Network errors]
Env        : Browser, Node version, API port
```

---

## ✅ TEST EXECUTION CHECKLIST

### Pre-Test Setup
- [ ] `npm run dev` running in `EduVault.Web` (port 5173)
- [ ] ASP.NET API running (port 5265)
- [ ] Express server running (port 5005)
- [ ] MongoDB connected
- [ ] Test user accounts available for all 6 roles
- [ ] Browser DevTools open (Console + Network tab)

### Execution Order (Dependencies)
1. Auth Module (TC-001 → TC-026)
2. Super Admin → Create test school (TC-027 → TC-076)
3. School Admin Setup → Infrastructure → Sections/Rooms/Depts (TC-139 → TC-148)
4. School Admin → Create Teachers/Classes/Students (TC-080 → TC-116)
5. Teacher Portal tests (TC-245 → TC-296)
6. Student Portal tests (TC-298 → TC-344)
7. Account Manager tests (TC-194 → TC-222)
8. Library tests (TC-223 → TC-244)
9. Real-time tests (TC-345 → TC-355)
10. Security/Edge case tests (TC-360 → TC-380)

### Total Test Cases: **380**

---

*Document generated by QA Engineer | EduVault v1.0 | 2026-08-23*
