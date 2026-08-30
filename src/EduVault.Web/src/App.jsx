import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { SidebarProvider } from './contexts/SidebarContext';
import { ProtectedRoute } from './router/ProtectedRoute';
import './index.css';

// Marketing
import Landing from './pages/marketing/Landing';
import { Demo } from './pages/marketing/Demo';

// Auth
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import Maintenance from './pages/auth/Maintenance';

// Layouts
import SuperAdminLayout from './layouts/SuperAdminLayout';
import SchoolAdminLayout from './layouts/SchoolAdminLayout';
import AccountManagerLayout from './layouts/AccountManagerLayout';
import LibrarianLayout from './layouts/LibrarianLayout';
import ReceptionistLayout from './layouts/ReceptionistLayout';
import { TeacherLayout } from './pages/teacher/TeacherPages';
import { StudentLayout } from './pages/student/StudentPages';

// Super Admin Pages
import SuperAdminDashboard from './pages/super-admin/Dashboard';
import Schools from './pages/super-admin/Schools';
import Subscriptions from './pages/super-admin/Subscriptions';
import Settings from './pages/super-admin/Settings';
import Support from './pages/super-admin/Support';
import SuperAdminNotices from './pages/super-admin/Notices';
import AccessControl from './pages/super-admin/AccessControl';
import SchoolHrmSettings from './pages/super-admin/SchoolHrmSettings';

// School Admin Pages
import SchoolAdminDashboard from './pages/school-admin/Dashboard';
import Students from './pages/school-admin/Students';
import Teachers from './pages/school-admin/Teachers';
import Fees from './pages/school-admin/Fees';
import Classes from './pages/school-admin/Classes';
import Notices from './pages/school-admin/Notices';
import Exams from './pages/school-admin/Exams';
import Admissions from './pages/school-admin/Admissions';
import Setup from './pages/school-admin/Setup';
import Reports from './pages/school-admin/Reports';
import SchoolAdminProfile from './pages/school-admin/Profile';
import Tickets from './pages/school-admin/Tickets';
import AccountManagerRegister from './pages/school-admin/AccountManagerRegister';
import LibrarianRegister from './pages/school-admin/LibrarianRegister';

// Account Manager Pages (HRM & Financial Management)
import AccountDashboard from './pages/account/AccountDashboard';
import EmployeeDirectory from './pages/account/EmployeeDirectory';
import FeeRules from './pages/account/FeeRules';
import SchoolBilling from './pages/account/SchoolBilling';
import Salaries from './pages/account/Salaries';
import SalaryRules from './pages/account/SalaryRules';
import LeaveRequests from './pages/account/LeaveRequests';
import LeaveQuotas from './pages/account/LeaveQuotas';
import Expenses from './pages/account/Expenses';
import AccountProfile from './pages/account/AccountProfile';

// Library Pages (Librarian Operations)
import LibraryDashboard from './pages/library/LibraryDashboard';
import BookCatalog from './pages/library/BookCatalog';
import IssueReturn from './pages/library/IssueReturn';
import TransactionHistory from './pages/library/TransactionHistory';
import LibrarySettingsPage from './pages/library/LibrarySettingsPage';
import LibraryProfile from './pages/library/LibraryProfile';

// Receptionist & Front Desk Pages
import FrontDeskDashboard from './pages/receptionist/FrontDeskDashboard';
import VisitorRegister from './pages/receptionist/VisitorRegister';
import CounterFeeDesk from './pages/receptionist/CounterFeeDesk';
import GatePassDesk from './pages/receptionist/GatePassDesk';
import AdmissionLeads from './pages/receptionist/AdmissionLeads';
import ReceptionistRegister from './pages/school-admin/ReceptionistRegister';

// Teacher Pages
import {
  TeacherDashboard,
  TeacherClasses,
  TeacherStudents,
  Attendance,
  MarksEntry,
  Homework,
  Remarks,
  TeacherProfile,
  TeacherSelfAttendance,
  TeacherNotices,
  TeacherHolidays,
  TeacherLeaves,
  TeacherLibrary
} from './pages/teacher/TeacherPages';

// Student Pages
import {
  StudentDashboard,
  StudentAttendance,
  StudentResults,
  StudentFees,
  StudentProfile,
  StudentNotices,
  StudentHomework,
  StudentSchedule,
  StudentExams,
  StudentHolidays,
  StudentSyllabus,
  StudentLibrary
} from './pages/student/StudentPages';

const SchoolAdminRedirect = () => {
  const location = useLocation();
  const newPath = location.pathname.replace(/^\/school[\s_%20]+admin/i, '/school-admin');
  return <Navigate to={newPath + location.search} replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <SidebarProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/maintenance" element={<Maintenance />} />

              {/* Super Admin */}
              <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                <Route path="/super-admin" element={<SuperAdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SuperAdminDashboard />} />
                  <Route path="schools" element={<Schools />} />
                  <Route path="schools/:schoolId/hrm" element={<SchoolHrmSettings />} />
                  <Route path="subscriptions" element={<Subscriptions />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="access-control" element={<AccessControl />} />
                  <Route path="support" element={<Support />} />
                  <Route path="notices" element={<SuperAdminNotices />} />
                </Route>
              </Route>

              {/* School Admin */}
              <Route element={<ProtectedRoute allowedRoles={['schooladmin']} />}>
                <Route path="/school-admin" element={<SchoolAdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SchoolAdminDashboard />} />
                  <Route path="admission" element={<Admissions />} />
                  <Route path="admissions" element={<Admissions />} />
                  <Route path="students" element={<Students />} />
                  <Route path="teachers" element={<Teachers />} />
                  <Route path="account-managers" element={<AccountManagerRegister />} />
                  <Route path="librarians" element={<LibrarianRegister />} />
                  <Route path="receptionists" element={<ReceptionistRegister />} />
                  <Route path="classes" element={<Classes />} />
                  <Route path="fees" element={<Fees />} />
                  <Route path="exams" element={<Exams />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="notices" element={<Notices />} />
                  <Route path="tickets" element={<Tickets />} />
                  <Route path="setup" element={<Setup />} />
                  <Route path="profile" element={<SchoolAdminProfile />} />
                </Route>
              </Route>

              {/* Route Aliases for School Admin space variations (preserves subpath) */}
              <Route path="/school admin/*" element={<SchoolAdminRedirect />} />
              <Route path="/school_admin/*" element={<SchoolAdminRedirect />} />
              <Route path="/school%20admin/*" element={<SchoolAdminRedirect />} />

              {/* Account Manager (HRM & Finances) */}
              <Route element={<ProtectedRoute allowedRoles={['accountmanager', 'schooladmin']} />}>
                <Route path="/account" element={<AccountManagerLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AccountDashboard />} />
                  <Route path="employees" element={<EmployeeDirectory />} />
                  <Route path="fee-rules" element={<FeeRules />} />
                  <Route path="billing" element={<SchoolBilling />} />
                  <Route path="salaries" element={<Salaries />} />
                  <Route path="salary-rules" element={<SalaryRules />} />
                  <Route path="leaves" element={<LeaveRequests />} />
                  <Route path="quotas" element={<LeaveQuotas />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="profile" element={<AccountProfile />} />
                </Route>
              </Route>

              {/* Librarian (Book Catalog, Issue/Return, Fines) */}
              <Route element={<ProtectedRoute allowedRoles={['librarian', 'schooladmin']} />}>
                <Route path="/library" element={<LibrarianLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<LibraryDashboard />} />
                  <Route path="catalog" element={<BookCatalog />} />
                  <Route path="issue-return" element={<IssueReturn />} />
                  <Route path="transactions" element={<TransactionHistory />} />
                  <Route path="settings" element={<LibrarySettingsPage />} />
                  <Route path="profile" element={<LibraryProfile />} />
                </Route>
              </Route>

              {/* Receptionist / Front Desk Operations */}
              <Route element={<ProtectedRoute allowedRoles={['receptionist', 'schooladmin']} />}>
                <Route path="/receptionist" element={<ReceptionistLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<FrontDeskDashboard />} />
                  <Route path="visitors" element={<VisitorRegister />} />
                  <Route path="fees" element={<CounterFeeDesk />} />
                  <Route path="gatepass" element={<GatePassDesk />} />
                  <Route path="inquiries" element={<AdmissionLeads />} />
                </Route>
              </Route>

              {/* Teacher */}
              <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                <Route path="/teacher" element={<TeacherLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<TeacherDashboard />} />
                  <Route path="classes" element={<TeacherClasses />} />
                  <Route path="students" element={<TeacherStudents />} />
                  <Route path="attendance" element={<Attendance />} />
                  <Route path="self-attendance" element={<TeacherSelfAttendance />} />
                  <Route path="leaves" element={<TeacherLeaves />} />
                  <Route path="my-books" element={<TeacherLibrary />} />
                  <Route path="marks" element={<MarksEntry />} />
                  <Route path="homework" element={<Homework />} />
                  <Route path="holidays" element={<TeacherHolidays />} />
                  <Route path="remarks" element={<Remarks />} />
                  <Route path="notices" element={<TeacherNotices />} />
                  <Route path="profile" element={<TeacherProfile />} />
                </Route>
              </Route>

              {/* Student */}
              <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                <Route path="/student" element={<StudentLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<StudentDashboard />} />
                  <Route path="schedule" element={<StudentSchedule />} />
                  <Route path="attendance" element={<StudentAttendance />} />
                  <Route path="homework" element={<StudentHomework />} />
                  <Route path="syllabus" element={<StudentSyllabus />} />
                  <Route path="my-books" element={<StudentLibrary />} />
                  <Route path="holidays" element={<StudentHolidays />} />
                  <Route path="fees" element={<StudentFees />} />
                  <Route path="exams" element={<StudentExams />} />
                  <Route path="results" element={<StudentResults />} />
                  <Route path="notices" element={<StudentNotices />} />
                  <Route path="profile" element={<StudentProfile />} />
                </Route>
              </Route>

              {/* Catch All */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SidebarProvider>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
