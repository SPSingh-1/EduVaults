# 🛡️ EduVault — Role-Based Access Control (RBAC) Matrix

> **Legend:**  
> - `✓` = Allowed unconditionally for this role  
> - `✗` = Blocked / Route protected by `ProtectedRoute` or API claims  
> - `P` = Permission dependent (Dynamically toggled by Super Admin in `SchoolRolePermission`)  
> - `S` = Subscription / Module dependent (e.g. `HasAccountModule`, `HasLibraryModule`, `HasReceptionistModule`)

---

## 📑 Access Control Matrix by Page & Feature

| Feature / Page Area | Super Admin | School Admin | Teacher | Student | Account Manager | Librarian | Receptionist |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Public Landing & Demo** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Login & Password Reset** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Super Admin Dashboard** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Manage Multiple Schools** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Impersonate School** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Configure School HRM & Statutory** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Master Print Format Gallery (Global)** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Platform Subscriptions & Plans** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Global Access Control (RBAC Editor)** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Global Platform Settings & Credentials** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Global Support Tickets Resolver** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **School Admin Dashboard** | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Admission Leads & Online Forms** | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ (S) |
| **Student 360° Archive (20-Year Dossier)** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Smart Data Import Hub (CSV)** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **AI School Annual Planner & Calendar** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **School Print Format Studio (Local)** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Student Directory & Clearance / TC** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Teacher Directory & Workload** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Academic Setup (Classes, Subjects, Periods)** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Fees Setup & Invoicing** | ✗ | ✓ (P) | ✗ | ✗ | ✓ (S) | ✗ | ✗ |
| **Spot Counter Fee Collection** | ✗ | ✓ | ✗ | ✗ | ✓ (S) | ✗ | ✓ (S) |
| **Examinations Scheduling & Results Approval** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Marks Entry (Class Teacher / Subject Teacher)**| ✗ | ✓ | ✓ (P) | ✗ | ✗ | ✗ | ✗ |
| **Reports & Analytics** | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **School Circulars & Notices (Publish)** | ✓ | ✓ (P) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **School Notices (Read Only)** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **School Support Tickets (Raise Ticket)** | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **School Profile & Custom Theme / Logo** | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Register Account Managers** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Register Librarians** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Register Receptionists** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Account Manager Dashboard** | ✗ | ✓ (S) | ✗ | ✗ | ✓ | ✗ | ✗ |
| **Staff & Employee Directory (HRM)** | ✗ | ✓ (S) | ✗ | ✗ | ✓ (P) | ✗ | ✗ |
| **Salary Rules & Components** | ✗ | ✓ (S) | ✗ | ✗ | ✓ (P) | ✗ | ✗ |
| **Salaries Generation & Payroll Disbursal** | ✗ | ✓ (S) | ✗ | ✗ | ✓ (P) | ✗ | ✗ |
| **Leave Requests Approvals & Quotas** | ✗ | ✓ (S) | ✗ | ✗ | ✓ (P) | ✗ | ✗ |
| **School Expenses & Cash Vouchers** | ✗ | ✓ (S) | ✗ | ✗ | ✓ (P) | ✗ | ✗ |
| **Tally XML Accounting Export** | ✗ | ✓ (S) | ✗ | ✗ | ✓ | ✗ | ✗ |
| **Librarian Dashboard** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✓ | ✗ |
| **Book Catalog & Inventory Management** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✓ (P) | ✗ |
| **Issue & Return Circulation Desk** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✓ (P) | ✗ |
| **Overdue Fines Collection** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✓ (P) | ✗ |
| **Library Loan Rules & Settings** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✓ (P) | ✗ |
| **Front Desk Reception Dashboard** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✗ | ✓ |
| **Visitor Entry & Badge Pass** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✗ | ✓ (P) |
| **Student Gate Pass Issuance** | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✗ | ✓ (P) |
| **Teacher Dashboard & Stats** | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Teacher My Classes & Students** | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ |
| **Daily Student Attendance Marking** | ✗ | ✓ | ✓ (P) | ✗ | ✗ | ✗ | ✗ |
| **Teacher Self Attendance (Punch In/Out)**| ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ |
| **Teacher Leave Application** | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ |
| **Teacher Homework Publisher** | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ |
| **Teacher Student Conduct Remarks** | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ | ✗ |
| **Teacher Borrowed Library Books** | ✗ | ✗ | ✓ (S) | ✗ | ✗ | ✗ | ✗ |
| **Student Dashboard** | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| **Student Daily Schedule & Timetable** | ✗ | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ |
| **Student Attendance Record** | ✗ | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ |
| **Student Homework & Upload Submission** | ✗ | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ |
| **Student Syllabus Tracker** | ✗ | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ |
| **Student Holiday Calendar** | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Student Online Fee Payment & Receipts**| ✗ | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ |
| **Student Exam Datesheet & Admit Card** | ✗ | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ |
| **Student Report Cards & Results** | ✗ | ✗ | ✗ | ✓ (P) | ✗ | ✗ | ✗ |
| **Student Borrowed Library Books** | ✗ | ✗ | ✗ | ✓ (S) | ✗ | ✗ | ✗ |
| **Student Sibling Switching** | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ |
| **Maintenance Bypass** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
