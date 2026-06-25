import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useSidebar } from '../../contexts/SidebarContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';

const Topbar = ({ title, subtitle, actions }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { openSidebar } = useSidebar();
  const navigate = useNavigate();

  const handleBellClick = () => {
    if (!user) return;
    if (user.role === 'superadmin') {
      navigate('/super-admin/notices');
    } else if (user.role === 'schooladmin') {
      navigate('/school-admin/notices');
    } else if (user.role === 'teacher') {
      navigate('/teacher/notices');
    } else if (user.role === 'student') {
      navigate('/student/notices');
    }
  };

  const handleProfileClick = () => {
    if (!user) return;
    if (user.role === 'superadmin') {
      navigate('/super-admin/settings');
    } else if (user.role === 'schooladmin') {
      navigate('/school-admin/profile');
    } else if (user.role === 'teacher') {
      navigate('/teacher/profile');
    } else if (user.role === 'student') {
      navigate('/student/profile');
    }
  };

  return (
    <div className="sticky top-0 lg:top-0 z-40 bg-[#f4f6fb]/90 backdrop-blur-md -mx-4 px-4 lg:-mx-6 lg:px-6 py-4 -mt-4 lg:-mt-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-gray-100/30 shadow-2xs">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={openSidebar}
          className="lg:hidden p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-primary active:scale-95 transition-all select-none cursor-pointer shrink-0"
          title="Open Menu"
        >
          <Menu className="w-5.5 h-5.5 stroke-[2]" />
        </button>
        <div className="min-w-0">
          {subtitle && <div className="text-[10px] sm:text-xs text-gray-400 font-medium mb-0.5 truncate">{subtitle}</div>}
          {typeof title === 'string' ? (
            <h1 className="page-title truncate text-lg sm:text-2xl">{title}</h1>
          ) : (
            <div className="page-title text-lg sm:text-2xl">{title}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
        {actions && <div className="flex items-center gap-1.5 sm:gap-2">{actions}</div>}
        <button
          onClick={handleBellClick}
          className="relative w-9 h-9 flex items-center justify-center bg-white rounded-full border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 hover:shadow-2xs active:scale-95 transition-all duration-200 cursor-pointer select-none group shrink-0"
          title="View Notifications"
        >
          <Bell className={`w-4.5 h-4.5 transition-colors duration-200 ${unreadCount > 0 ? 'text-amber-500 fill-amber-500/20' : 'text-gray-500 group-hover:text-primary'}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-3.5 px-1 bg-red-500 text-white text-[8px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-[0_2px_6px_rgba(239,68,68,0.3)]">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={handleProfileClick}
          className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm select-none shrink-0 cursor-pointer hover:brightness-110 active:scale-95 transition-all duration-200 border border-primary-light/10 shadow-2xs"
          title="View Profile"
        >
          {user?.avatar || '?'}
        </button>
      </div>
    </div>
  );
};

export default Topbar;
