import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar.jsx';

const links = [
  { icon: '📊', label: 'Overview', path: '/school-admin/dashboard' },
  { icon: '📝', label: 'Admission', path: '/school-admin/admission' },
  { icon: '👨‍🎓', label: 'Students', path: '/school-admin/students' },
  { icon: '👩‍🏫', label: 'Teachers', path: '/school-admin/teachers' },
  { icon: '🏛', label: 'Classes', path: '/school-admin/classes' },
  { icon: '💰', label: 'Fees', path: '/school-admin/fees' },
  { icon: '📋', label: 'Exams', path: '/school-admin/exams' },
  { icon: '📢', label: 'Notices', path: '/school-admin/notices' },
  { icon: '⚙️', label: 'Setup', path: '/school-admin/setup' },
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
