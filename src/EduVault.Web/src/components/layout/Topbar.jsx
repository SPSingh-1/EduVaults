import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Topbar = ({ title, subtitle, actions }) => {
  const { user } = useAuth();
  const [notifs] = useState(3);

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        {subtitle && <div className="text-xs text-gray-400 font-medium mb-0.5">{subtitle}</div>}
        <h1 className="page-title">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <button className="relative p-2.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all">
          <span className="text-gray-500">🔔</span>
          {notifs > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifs}</span>}
        </button>
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">{user?.avatar}</div>
      </div>
    </div>
  );
};

export default Topbar;
