import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  UserCheck, 
  FileText, 
  DollarSign, 
  UserPlus,
  PhoneCall
} from 'lucide-react';

const receptionistLinks = [
  { pageKey: 'receptionist.dashboard', icon: LayoutDashboard, label: 'Front Desk Hub', path: '/receptionist/dashboard' },
  { pageKey: 'receptionist.visitors', icon: UserCheck, label: 'Visitor Register', path: '/receptionist/visitors' },
  { pageKey: 'receptionist.fees', icon: DollarSign, label: 'Counter Fee Desk', path: '/receptionist/fees' },
  { pageKey: 'receptionist.gatepass', icon: FileText, label: 'Gate Pass Desk', path: '/receptionist/gatepass' },
  { pageKey: 'receptionist.inquiries', icon: UserPlus, label: 'Admission Leads', path: '/receptionist/inquiries' },
];

const ReceptionistLayout = () => {
  const { user } = useAuth();

  const hasDynamicPerms = user?.permissions && user.permissions.filter(p => p.canView && (p.route?.startsWith('/receptionist') || p.pageKey?.startsWith('receptionist'))).length > 0;

  const finalLinks = hasDynamicPerms
    ? user.permissions
        .filter(p => p.canView && (p.route?.startsWith('/receptionist') || p.pageKey?.startsWith('receptionist')))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(p => ({
          pageKey: p.pageKey,
          icon: p.icon || 'Layers',
          label: p.pageName,
          path: p.route
        }))
    : receptionistLinks;

  return (
    <div className="flex">
      <Sidebar links={finalLinks} role="receptionist" />
      <main className="main-content flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default ReceptionistLayout;
