# 🧭 EduVault — Master Navigation Matrix

> **Generated:** September 2026  
> **Traceability:** Mapped from React Router (`App.jsx`), Layout Sidebars, Button Handlers & Navigation Calls.

---

## 📑 Complete Navigation Matrix

| From Page | Role | User Action | Destination Page | Target Route | Condition / Guard | Permission / Token Required | Blocker | Unblocker |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Landing Page** | Public | Click "Sign In" | Login | `/login` | None | None | Network failure | Refresh page |
| **Landing Page** | Public | Click "Start Free Trial" | School Registration | `/signup` | None | None | Network failure | Refresh page |
| **Landing Page** | Public | Click "Interactive Demo" | Demo Portal | `/demo` | None | None | Network failure | Refresh page |
| **Login** | Anonymous | Enter SuperAdmin Credentials & Submit | Super Admin Dashboard | `/super-admin/dashboard` | Role == `superadmin` | Valid JWT (`superadmin`) | Bad password, invalid env credentials | Enter valid superadmin password |
| **Login** | Anonymous | Enter SchoolAdmin Credentials & Submit | School Admin Dashboard | `/school-admin/dashboard` | Role == `schooladmin` | Valid JWT (`schooladmin`), `IsActive == true` | Account deactivated, Maintenance on | Reactivate account, turn off maintenance |
| **Login** | Anonymous | Enter Teacher Credentials & Submit | Teacher Dashboard | `/teacher/dashboard` | Role == `teacher` | Valid JWT (`teacher`), `IsActive == true` | Account deactivated, Maintenance on | Reactivate account, turn off maintenance |
| **Login** | Anonymous | Enter Student Credentials & Submit | Student Dashboard | `/student/dashboard` | Role == `student` | Valid JWT (`student`), `IsActive == true` | Account deactivated, Maintenance on | Reactivate account, turn off maintenance |
| **Login** | Anonymous | Enter Account Manager Credentials & Submit | Account Dashboard | `/account/dashboard` | Role == `accountmanager` | Valid JWT (`accountmanager`) | Deactivated | Reactivate account |
| **Login** | Anonymous | Enter Librarian Credentials & Submit | Library Dashboard | `/library/dashboard` | Role == `librarian` | Valid JWT (`librarian`) | Deactivated | Reactivate account |
| **Login** | Anonymous | Enter Receptionist Credentials & Submit | Front Desk Dashboard | `/receptionist/dashboard` | Role == `receptionist` | Valid JWT (`receptionist`) | Deactivated | Reactivate account |
| **Login** | Anonymous | Click "Forgot Password" | Forgot Password | `/forgot-password` | None | None | None | N/A |
| **Super Admin Dashboard** | Super Admin | Click Sidebar "Schools" | School Directory | `/super-admin/schools` | Authenticated Super Admin | `superadmin` | Session expired (401) | Relogin |
| **Super Admin Schools** | Super Admin | Click "⚙️ HRM Config" | School HRM Configuration | `/super-admin/schools/:schoolId/hrm` | School Exists | `superadmin` | Invalid School ID | Pick valid school |
| **Super Admin Schools** | Super Admin | Click "Impersonate" | School Admin Dashboard | `/school-admin/dashboard` | School Status == Active | `superadmin` | School Suspended | Activate school first |
| **Super Admin Dashboard** | Super Admin | Click Sidebar "Print Format Studio" | Master Print Gallery | `/super-admin/format-studio` | Authenticated Super Admin | `superadmin` | Session expired | Relogin |
| **Super Admin Dashboard** | Super Admin | Click Sidebar "Access Control (RBAC)" | RBAC Permission Studio | `/super-admin/access-control` | Authenticated Super Admin | `superadmin` | Session expired | Relogin |
| **Super Admin Dashboard** | Super Admin | Click Sidebar "Subscriptions" | Subscriptions & Plans | `/super-admin/subscriptions` | Authenticated Super Admin | `superadmin` | Session expired | Relogin |
| **Super Admin Dashboard** | Super Admin | Click Sidebar "Platform Settings" | Settings & Integrations | `/super-admin/settings` | Authenticated Super Admin | `superadmin` | Session expired | Relogin |
| **Super Admin Dashboard** | Super Admin | Click Sidebar "Support & Help Desk" | Support Tickets Hub | `/super-admin/support` | Authenticated Super Admin | `superadmin` | Session expired | Relogin |
| **Super Admin Dashboard** | Super Admin | Click Sidebar "Notices & Alerts" | Platform Notices | `/super-admin/notices` | Express (:5005) online | `superadmin` | Express API 500 | Start Express service |
| **School Admin Dashboard** | School Admin | Click Sidebar "Admission" | Admission Leads | `/school-admin/admission` | School Active | `schooladmin.admission` | School Suspended | Renew subscription |
| **School Admin Admission** | School Admin | Click "Enroll Student" | Admission Leads (Modal) | N/A | Form Validated | `schooladmin.admission` | Class not selected | Choose Class & Section |
| **School Admin Dashboard** | School Admin | Click Sidebar "Student 360° Archive" | Student Dossier | `/school-admin/student-dossier` | School Active | `schooladmin.student_dossier` | No session years | Run master setup |
| **School Admin Dashboard** | School Admin | Click Sidebar "Data Import Hub" | Data Import Hub | `/school-admin/data-import` | School Active | `schooladmin.data_import` | Wrong CSV header format | Download demo template |
| **School Admin Dashboard** | School Admin | Click Sidebar "AI School Planner" | AI School Planner | `/school-admin/ai-planner` | School Active | `schooladmin.ai_planner` | Missing academic session | Generate calendar |
| **School Admin Dashboard** | School Admin | Click Sidebar "Print Format Studio" | School Print Studio | `/school-admin/format-studio` | School Active | `schooladmin.format_studio` | Missing SchoolId | Ensure valid tenant session |
| **School Admin Dashboard** | School Admin | Click Sidebar "Students" | Student List | `/school-admin/students` | School Active | `schooladmin.students` | Database 500 | Ensure backend online |
| **School Admin Students** | School Admin | Click "Generate TC" | Student List (TC Modal) | N/A | Clearance Check PASS | `schooladmin.students` | Fee Dues / Library Books | Pay fee / return book |
| **School Admin Dashboard** | School Admin | Click Sidebar "Teachers" | Teacher Directory | `/school-admin/teachers` | School Active | `schooladmin.teachers` | Duplicate email | Use unique email |
| **School Admin Dashboard** | School Admin | Click Sidebar "Classes" | Classes & Sections | `/school-admin/classes` | School Active | `schooladmin.classes` | Missing subjects | Setup subjects first |
| **School Admin Dashboard** | School Admin | Click Sidebar "Fees Overview" | Fees Management | `/school-admin/fees` | School Active | `schooladmin.fees` | Structure assigned to paid bills | Deactivate instead of delete |
| **School Admin Dashboard** | School Admin | Click Sidebar "Exams" | Exam Operations | `/school-admin/exams` | School Active | `schooladmin.exams` | Unsubmitted marks | Prompt teacher for submission |
| **School Admin Dashboard** | School Admin | Click Sidebar "Reports" | Reports & Analytics | `/school-admin/reports` | School Active | `schooladmin.reports` | Empty data | Input initial student data |
| **School Admin Dashboard** | School Admin | Click Sidebar "Notices" | School Notices | `/school-admin/notices` | Express online | `schooladmin.notices` | Express down | Restart Express server |
| **School Admin Dashboard** | School Admin | Click Sidebar "Support & Tickets" | School Tickets | `/school-admin/tickets` | School Active | `schooladmin.tickets` | Empty message | Enter ticket description |
| **School Admin Dashboard** | School Admin | Click Sidebar "Setup" | Master Setup Wizard | `/school-admin/setup` | School Active | `schooladmin.setup` | Class has active enrollments | Clear dependencies |
| **School Admin Dashboard** | School Admin | Click Sidebar "Account Managers" | Account Manager Reg | `/school-admin/account-managers` | `hasAccountModule == true` | `schooladmin` | Module not enabled | Super Admin enables module |
| **School Admin Dashboard** | School Admin | Click Sidebar "Librarians" | Librarian Reg | `/school-admin/librarians` | `hasLibraryModule == true` | `schooladmin` | Module not enabled | Super Admin enables module |
| **School Admin Dashboard** | School Admin | Click Sidebar "Receptionists" | Receptionist Reg | `/school-admin/receptionists` | `hasReceptionistModule == true` | `schooladmin` | Module not enabled | Super Admin enables module |
| **School Admin Dashboard** | School Admin | Click Topbar Profile Avatar | School Admin Profile | `/school-admin/profile` | Authenticated | `schooladmin` | Validation error | Fix input fields |
| **Account Dashboard** | Account Manager | Click Sidebar "Staff & Employees" | Employee Directory | `/account/employees` | Authenticated | `account.employees` | Unauthorized role | Switch to Account role |
| **Account Dashboard** | Account Manager | Click Sidebar "Fee & Financial Rules" | Fee Rules | `/account/fee-rules` | Authenticated | `account.fee_rules` | Invalid rate | Fix percentage format |
| **Account Dashboard** | Account Manager | Click Sidebar "School Billing & Fees" | School Billing Desk | `/account/billing` | Authenticated | `account.billing` | Student invoice not found | Verify admission number |
| **Account Dashboard** | Account Manager | Click Sidebar "Salaries & Payroll" | Salaries Desk | `/account/salaries` | Authenticated | `account.salaries` | Unfinalized month | Run payroll calculation |
| **Account Dashboard** | Account Manager | Click Sidebar "Salary Rules" | Salary Rules | `/account/salary-rules` | Authenticated | `account.salary_rules` | Formula syntax error | Validate rule condition |
| **Account Dashboard** | Account Manager | Click Sidebar "Leave Requests" | Leave Requests | `/account/leaves` | Authenticated | `account.leaves` | Exceeded quota | Apply LWP (Leave Without Pay) |
| **Account Dashboard** | Account Manager | Click Sidebar "Leave Quotas" | Leave Quotas | `/account/quotas` | Authenticated | `account.quotas` | Negative quota | Enter positive integer |
| **Account Dashboard** | Account Manager | Click Sidebar "Expenses & Vouchers" | Expenses | `/account/expenses` | Authenticated | `account.expenses` | Negative amount | Enter valid positive amount |
| **Librarian Dashboard** | Librarian | Click Sidebar "Book Catalog" | Book Catalog | `/library/catalog` | Authenticated | `library.catalog` | Duplicate ISBN/Accession No | Use unique accession code |
| **Librarian Dashboard** | Librarian | Click Sidebar "Issue & Return" | Circulation Desk | `/library/issue-return` | Authenticated | `library.issue_return` | Member has overdue fine / max books reached | Clear fine / return existing book |
| **Librarian Dashboard** | Librarian | Click Sidebar "Loans & History" | Transaction History | `/library/transactions` | Authenticated | `library.transactions` | None | N/A |
| **Librarian Dashboard** | Librarian | Click Sidebar "Fine & Loan Rules" | Library Settings | `/library/settings` | Authenticated | `library.settings` | Fine rate < 0 | Enter non-negative rate |
| **Receptionist Dashboard** | Receptionist | Click Sidebar "Visitor Register" | Visitor Register | `/receptionist/visitors` | Authenticated | `receptionist.visitors` | Visitor already checked out | Add new entry |
| **Receptionist Dashboard** | Receptionist | Click Sidebar "Counter Fee Desk" | Spot Fee Desk | `/receptionist/fees` | Authenticated | `receptionist.fees` | Student not found | Type valid search query |
| **Receptionist Dashboard** | Receptionist | Click Sidebar "Gate Pass Desk" | Gate Pass Desk | `/receptionist/gatepass` | Authenticated | `receptionist.gatepass` | Student absent on date | Verify student attendance |
| **Receptionist Dashboard** | Receptionist | Click Sidebar "Admission Leads" | Admission Leads | `/receptionist/inquiries` | Authenticated | `receptionist.inquiries` | Missing parent phone | Fill mobile number |
| **Teacher Dashboard** | Teacher | Click Sidebar "My Classes" | Assigned Classes | `/teacher/classes` | Authenticated Teacher | `teacher.classes` | No classes assigned | School admin assigns class |
| **Teacher Dashboard** | Teacher | Click Sidebar "Attendance" | Daily Attendance | `/teacher/attendance` | Assigned to Class | `teacher.attendance` | Attendance already submitted | Admin unlock permission |
| **Teacher Dashboard** | Teacher | Click Sidebar "My Attendance" | Self Attendance | `/teacher/self-attendance` | Authenticated | `teacher.self_attendance` | Outside campus geofence/time | Punch in within working hours |
| **Teacher Dashboard** | Teacher | Click Sidebar "My Leaves" | Apply Leave | `/teacher/leaves` | Authenticated | `teacher.leaves` | Zero balance | Select Loss of Pay (LWP) |
| **Teacher Dashboard** | Teacher | Click Sidebar "Marks Entry" | Marks Entry | `/teacher/marks` | Exam Published | `teacher.marks` | Marks exceed Max Marks | Enter marks between 0 & Max |
| **Teacher Dashboard** | Teacher | Click Sidebar "Homework" | Homework Desk | `/teacher/homework` | Assigned Class | `teacher.homework` | Express service offline | Verify Express service |
| **Teacher Dashboard** | Teacher | Click Sidebar "Remarks" | Student Remarks | `/teacher/remarks` | Assigned Class | `teacher.remarks` | Empty remark text | Type feedback text |
| **Student Dashboard** | Student | Click Sidebar "Daily Schedule" | Timetable View | `/student/schedule` | Enrolled in Class | `student.schedule` | Timetable not published | School admin publishes timetable |
| **Student Dashboard** | Student | Click Sidebar "Attendance" | Attendance Stats | `/student/attendance` | Authenticated | `student.attendance` | None | N/A |
| **Student Dashboard** | Student | Click Sidebar "Fees" | Fee Payment Gateway | `/student/fees` | Authenticated | `student.fees` | Payment gateway API key missing | School admin configures gateway |
| **Student Dashboard** | Student | Click Sidebar "Exam Timetable" | Exam Schedule | `/student/exams` | Published Exams | `student.exams` | No upcoming exams | N/A |
| **Student Dashboard** | Student | Click Sidebar "Results" | Report Cards | `/student/results` | Results Approved | `student.results` | Unapproved marks | Admin approves results |
| **Any Layout** | Any Role | Click Topbar / Sidebar "Logout" | Public Landing / Login | `/login` | Authenticated | None | None | LocalStorage & SessionStorage cleared |
