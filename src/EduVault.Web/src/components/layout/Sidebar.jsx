import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import EduFlowLogo from '../common/Logo';

const NavLink = ({ icon: Icon, label, path, onClick }) => {
  const location = useLocation();
  const active = location.pathname === path || location.pathname.startsWith(path + '/');
  return (
    <div className={`sidebar-link group ${active ? 'active' : ''}`} onClick={onClick || (() => {})}>
      {/* Left indicator line */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-accent rounded-r-full shadow-[0_0_12px_rgba(212,160,23,0.5)]" />
      )}
      <span className={`flex items-center justify-center transition-all duration-300 ease-out shrink-0 ${active ? 'scale-115 text-accent' : 'text-blue-300/85 group-hover:scale-110 group-hover:text-white'}`}>
        {typeof Icon === 'function' || (Icon && typeof Icon === 'object') ? (
          <Icon className="w-4 h-4 stroke-[2]" />
        ) : (
          <span className="text-base">{Icon}</span>
        )}
      </span>
      <span className="transition-all duration-300 ease-out">{label}</span>
    </div>
  );
};

const Sidebar = ({ links, role }) => {
  const { user, logout } = useAuth(); 
  const { isOpen, closeSidebar } = useSidebar();
  const navigate = useNavigate();

  const roleLabels = {
    superadmin: 'Super Admin',
    schooladmin: 'School Admin',
    teacher: 'Teacher Portal',
    student: 'Student Portal',
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';

  const handleProfileClick = () => {
    if (!user) return;
    if (role === 'superadmin') {
      navigate('/super-admin/settings');
    } else if (role === 'schooladmin') {
      navigate('/school-admin/profile');
    } else if (role === 'teacher') {
      navigate('/teacher/profile');
    } else if (role === 'student') {
      navigate('/student/profile');
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="px-4 py-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <EduFlowLogo size={38} />
            <button 
              onClick={closeSidebar} 
              className="lg:hidden text-blue-300 hover:text-white font-semibold text-lg p-1"
              title="Close Menu"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 text-xs text-blue-300 font-medium px-1">{roleLabels[role]}</div>
        </div>
        <nav className="flex-1 py-4 space-y-0.5">
          {links.map((l) => (
            <NavLink key={l.path} {...l} onClick={() => navigate(l.path)} />
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div 
              onClick={handleProfileClick}
              className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-200"
              title="View Profile"
            >
              {user?.avatar || '?'}
            </div>
            <div 
              onClick={handleProfileClick}
              className="flex-1 min-w-0 cursor-pointer group"
              title="View Profile"
            >
              <div className="text-sm font-semibold text-white truncate group-hover:text-blue-200 transition-colors">{displayName}</div>
              <div className="text-xs text-blue-300 truncate group-hover:text-blue-100 transition-colors">{user?.email}</div>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="text-blue-300 hover:text-white text-lg font-bold" title="Logout">⇥</button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
