import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
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
  Settings 
} from 'lucide-react';

const links = [
  { icon: LayoutDashboard, label: 'Overview', path: '/school-admin/dashboard' },
  { icon: UserPlus, label: 'Admission', path: '/school-admin/admission' },
  { icon: Users, label: 'Students', path: '/school-admin/students' },
  { icon: UserCheck, label: 'Teachers', path: '/school-admin/teachers' },
  { icon: Building, label: 'Classes', path: '/school-admin/classes' },
  { icon: Receipt, label: 'Fees', path: '/school-admin/fees' },
  { icon: ClipboardList, label: 'Exams', path: '/school-admin/exams' },
  { icon: BarChart3, label: 'Reports', path: '/school-admin/reports' },
  { icon: Megaphone, label: 'Notices', path: '/school-admin/notices' },
  { icon: Settings, label: 'Setup', path: '/school-admin/setup' },
];

const SchoolAdminLayout = () => (
  <div className="flex">
    <Sidebar links={links} role="schooladmin" />
    <main className="main-content flex-1">
      <Outlet />
    </main>
  </div>
);

export default SchoolAdminLayout;
