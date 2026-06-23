import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';

const Topbar = ({ title, subtitle, actions }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
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
    <div className="flex items-center justify-between mb-6">
      <div>
        {subtitle && <div className="text-xs text-gray-400 font-medium mb-0.5">{subtitle}</div>}
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {actions}
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
