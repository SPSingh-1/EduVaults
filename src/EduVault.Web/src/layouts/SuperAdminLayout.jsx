import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import { 
  LayoutDashboard, 
  School, 
  CreditCard, 
  Settings, 
  LifeBuoy, 
  Megaphone,
  ShieldCheck,
  Wrench,
  Printer,
  CalendarDays,
  Layers
} from 'lucide-react';

const superLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/super-admin/dashboard' },
  { icon: School, label: 'Schools', path: '/super-admin/schools' },
  { icon: CalendarDays, label: 'AI Academic Planner', path: '/super-admin/ai-planner' },
  { icon: Printer, label: 'Print Format Studio', path: '/super-admin/format-studio' },
  { icon: Wrench, label: 'HRM & Payroll Config', path: '/super-admin/hrm' },
  { icon: ShieldCheck, label: 'Access Control (RBAC)', path: '/super-admin/access-control' },
  { icon: CreditCard, label: 'Subscriptions', path: '/super-admin/subscriptions' },
  { icon: Settings, label: 'Platform Settings', path: '/super-admin/settings' },
  { icon: LifeBuoy, label: 'Support & Help Desk', path: '/super-admin/support' },
  { icon: Megaphone, label: 'Notices & Alerts', path: '/super-admin/notices' },
];

const SuperAdminLayout = () => (
  <div className="flex">
    <Sidebar links={superLinks} role="superadmin" />
    <main className="main-content flex-1">
      <Outlet />
    </main>
  </div>
);

export default SuperAdminLayout;
