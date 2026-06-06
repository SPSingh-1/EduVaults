import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import EduFlowLogo from '../common/Logo';

const NavLink = ({ icon, label, path, onClick }) => {
  const location = useLocation();
  const active = location.pathname === path || location.pathname.startsWith(path + '/');
  return (
    <div className={`sidebar-link ${active ? 'active' : ''}`} onClick={onClick || (() => {})}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </div>
  );
};

const Sidebar = ({ links, role }) => {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  const roleLabels = {
    superadmin: 'Super Admin',
    schooladmin: 'School Admin',
    teacher: 'Teacher Portal',
    student: 'Student Portal',
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <aside className="sidebar">
      <div className="px-4 py-5 border-b border-white/10">
        <EduFlowLogo size={38} />
        <div className="mt-2 text-xs text-blue-300 font-medium px-1">{roleLabels[role]}</div>
      </div>
      <nav className="flex-1 py-4 space-y-0.5">
        {links.map((l) => (
          <NavLink key={l.path} {...l} onClick={() => navigate(l.path)} />
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
            {user?.avatar || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{displayName}</div>
            <div className="text-xs text-blue-300 truncate">{user?.email}</div>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} className="text-blue-300 hover:text-white text-lg font-bold" title="Logout">⇥</button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
