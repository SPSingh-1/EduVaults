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
  Megaphone, 
  HelpCircle,
  Settings,
  DollarSign,
  BookOpen
} from 'lucide-react';

const SchoolAdminLayout = () => {
  const { user } = useAuth();

  const baseLinks = [
    { pageKey: 'schooladmin.dashboard', icon: LayoutDashboard, label: 'Overview', path: '/school-admin/dashboard' },
    { pageKey: 'schooladmin.admission', icon: UserPlus, label: 'Admission', path: '/school-admin/admission' },
    { pageKey: 'schooladmin.students', icon: Users, label: 'Students', path: '/school-admin/students' },
    { pageKey: 'schooladmin.teachers', icon: UserCheck, label: 'Teachers', path: '/school-admin/teachers' },
    { pageKey: 'schooladmin.classes', icon: Building, label: 'Classes', path: '/school-admin/classes' },
    { pageKey: 'schooladmin.fees', icon: Receipt, label: 'Fees Overview', path: '/school-admin/fees' },
    { pageKey: 'schooladmin.exams', icon: ClipboardList, label: 'Exams', path: '/school-admin/exams' },
    { pageKey: 'schooladmin.reports', icon: BarChart3, label: 'Reports', path: '/school-admin/reports' },
    { pageKey: 'schooladmin.notices', icon: Megaphone, label: 'Notices', path: '/school-admin/notices' },
    { pageKey: 'schooladmin.tickets', icon: HelpCircle, label: 'Support & Tickets', path: '/school-admin/tickets' },
    { pageKey: 'schooladmin.setup', icon: Settings, label: 'Setup', path: '/school-admin/setup' },
  ];

  // Conditional modules (granted by Super Admin)
  if (user?.hasAccountModule) {
    baseLinks.splice(4, 0, {
      pageKey: 'schooladmin.account_managers',
      icon: DollarSign,
      label: 'Account Managers',
      path: '/school-admin/account-managers'
    });
  }

  if (user?.hasLibraryModule) {
    baseLinks.splice(5, 0, {
      pageKey: 'schooladmin.librarians',
      icon: BookOpen,
      label: 'Librarians',
      path: '/school-admin/librarians'
    });
  }

  // Dynamic menus from Database RBAC permissions
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
