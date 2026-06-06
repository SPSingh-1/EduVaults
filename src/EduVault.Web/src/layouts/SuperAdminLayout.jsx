import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';

const superLinks = [
  { icon: '📊', label: 'Dashboard', path: '/super-admin/dashboard' },
  { icon: '🏫', label: 'Schools', path: '/super-admin/schools' },
  { icon: '💳', label: 'Subscriptions', path: '/super-admin/subscriptions' },
  { icon: '⚙️', label: 'Platform Settings', path: '/super-admin/settings' },
  { icon: '🎫', label: 'Support & Help Desk', path: '/super-admin/support' },
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
