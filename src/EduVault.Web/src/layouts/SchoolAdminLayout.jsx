import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  UserPlus, 
  Users, 
  UserCheck, 
  Building, 
  Receipt, 
  ClipboardList, 
  BarChart3, 
  BarChart2,
  Megaphone, 
  HelpCircle,
  Settings,
  DollarSign,
  BookOpen,
  UploadCloud,
  CalendarDays,
  Printer,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

const SchoolAdminLayout = () => {
  const { user } = useAuth();

  const baseLinks = [
    { pageKey: 'schooladmin.dashboard', icon: LayoutDashboard, label: 'Overview', path: '/school-admin/dashboard' },
    { pageKey: 'schooladmin.admission', icon: UserPlus, label: 'Admission', path: '/school-admin/admission' },
    { pageKey: 'schooladmin.student_dossier', icon: ShieldCheck, label: 'Student 360° Archive', path: '/school-admin/student-dossier' },
    { pageKey: 'schooladmin.data_import', icon: UploadCloud, label: 'Data Import Hub', path: '/school-admin/data-import' },
    { pageKey: 'schooladmin.ai_planner', icon: CalendarDays, label: 'AI School Planner', path: '/school-admin/ai-planner' },
    { pageKey: 'schooladmin.format_studio', icon: Printer, label: 'Print Format Studio', path: '/school-admin/format-studio' },
    { pageKey: 'schooladmin.students', icon: Users, label: 'Students', path: '/school-admin/students' },
    { pageKey: 'schooladmin.teachers', icon: UserCheck, label: 'Teachers', path: '/school-admin/teachers' },
    { pageKey: 'schooladmin.classes', icon: Building, label: 'Classes', path: '/school-admin/classes' },
    { pageKey: 'schooladmin.fees', icon: Receipt, label: 'Fees Overview', path: '/school-admin/fees' },
    { pageKey: 'schooladmin.payment_reports', icon: BarChart2, label: 'Payment Reports', path: '/school-admin/payment-reports' },
    { pageKey: 'schooladmin.exams', icon: ClipboardList, label: 'Exams', path: '/school-admin/exams' },
    { pageKey: 'schooladmin.reports', icon: BarChart3, label: 'Reports', path: '/school-admin/reports' },
    { pageKey: 'schooladmin.notices', icon: Megaphone, label: 'Notices', path: '/school-admin/notices' },
    { pageKey: 'schooladmin.tickets', icon: HelpCircle, label: 'Support & Tickets', path: '/school-admin/tickets' },
    { pageKey: 'schooladmin.staff_desk', icon: UserCheck, label: 'Staff Attendance & Leave Desk', path: '/school-admin/staff-desk' },
    { pageKey: 'schooladmin.hrm', icon: Briefcase, label: '🏢 HRM Studio', path: '/school-admin/hrm' },
    { pageKey: 'schooladmin.setup', icon: Settings, label: 'Setup', path: '/school-admin/setup' },
  ];

  // Conditional modules (granted by Super Admin)
  if (Boolean(user?.hasAccountModule) && user?.hasAccountModule !== 'false') {
    baseLinks.splice(4, 0, {
      pageKey: 'schooladmin.account_managers',
      icon: DollarSign,
      label: 'Account Managers',
      path: '/school-admin/account-managers'
    });
  }

  if (Boolean(user?.hasLibraryModule) && user?.hasLibraryModule !== 'false') {
    baseLinks.splice(5, 0, {
      pageKey: 'schooladmin.librarians',
      icon: BookOpen,
      label: 'Librarians',
      path: '/school-admin/librarians'
    });
  }

  // Receptionist / Front Desk Portal link for school admin
  if (Boolean(user?.hasReceptionistModule) && user?.hasReceptionistModule !== 'false') {
    baseLinks.splice(6, 0, {
      pageKey: 'schooladmin.receptionists',
      icon: Users,
      label: 'Receptionists',
      path: '/school-admin/receptionists'
    });
  }

  // Dynamic menus from Database RBAC permissions (strictly controlled by Super Admin)
  const hasDynamicPerms = user?.permissions && user.permissions.filter(p => p.canView && (p.route?.startsWith('/school-admin') || p.pageKey?.startsWith('schooladmin'))).length > 0;

  const finalLinks = hasDynamicPerms
    ? user.permissions
        .filter(p => p.canView && (p.route?.startsWith('/school-admin') || p.pageKey?.startsWith('schooladmin')))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(p => ({
          pageKey: p.pageKey,
          icon: p.icon || 'Layers',
          label: p.pageName,
          path: p.route
        }))
    : baseLinks;

  return (
    <div className="flex">
      <Sidebar links={finalLinks} role="schooladmin" />
      <main className="main-content flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default SchoolAdminLayout;
