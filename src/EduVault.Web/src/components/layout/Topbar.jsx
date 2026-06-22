import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

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
          className="relative p-2.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer select-none"
          title="View Notifications"
        >
          <span className="text-gray-500">🔔</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm select-none">{user?.avatar || '?'}</div>
      </div>
    </div>
  );
};

export default Topbar;
