import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { expressClient } from '../api/apiClient';
import { io } from 'socket.io-client';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem('eduvault_read_notifs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [toasts, setToasts] = useState([]);
  const welcomeToastsShown = useRef(false);

  // Fetch notifications from the backend
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await expressClient.get('/notifications');
      let data = res.data;
      if (user.role === 'student' || user.role === 'teacher') {
        data = data.filter(n => n.senderRole !== 'superadmin');
      }
      // Do not notify the creator/sender of the notice
      data = data.filter(n => n.senderId !== user.id);
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  // Add a new toast notification
  const addToast = (title, body, type) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, title, body, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Mark all fetched notices as read
  const markAllAsRead = async () => {
    if (notifications.length === 0) return;
    
    const unreadIds = notifications
      .filter(n => !readIds.includes(n._id))
      .map(n => n._id);

    if (unreadIds.length === 0) return;

    // 1. Update localStorage
    const newReadIds = [...readIds, ...unreadIds];
    setReadIds(newReadIds);
    localStorage.setItem('eduvault_read_notifs', JSON.stringify(newReadIds));

    // 2. Call backend endpoint (for any direct notifications scoped to the user)
    try {
      await expressClient.post('/notifications/read', { notificationIds: unreadIds });
    } catch (err) {
      console.warn('Backend mark read failed:', err);
    }
  };

  // Fetch notices when user changes
  useEffect(() => {
    if (user) {
      const loadAndToast = async () => {
        try {
          const res = await expressClient.get('/notifications');
          let data = res.data;
          if (user.role === 'student' || user.role === 'teacher') {
            data = data.filter(n => n.senderRole !== 'superadmin');
          }
          // Do not notify the creator/sender of the notice
          data = data.filter(n => n.senderId !== user.id);
          setNotifications(data);
          
          if (!welcomeToastsShown.current) {
            welcomeToastsShown.current = true;
            const unreads = data.filter(n => !readIds.includes(n._id));
            if (unreads.length > 0) {
              unreads.forEach(n => {
                addToast(n.title, n.body, n.type);
              });
            }
          }
        } catch (err) {
          console.error('Error fetching notifications:', err);
        }
      };
      loadAndToast();
    } else {
      setNotifications([]);
      welcomeToastsShown.current = false;
    }
  }, [user]);

  // Real-time socket integration
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('eduvault_token');
    if (!token) return;

    const expressUrl = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:5005/api';
    const socketUrl = expressUrl.replace(/\/api$/, '');
    
    const socket = io(socketUrl, {
      auth: { token }
    });

    socket.on('notification', (newNotif) => {
      // Do not notify the creator/sender of the notice in real time
      if (newNotif.senderId === user.id) {
        return;
      }
      // Check if this notice targets this user/role
      const isSchoolMatch = newNotif.schoolId === 'ALL' || newNotif.schoolId === user.schoolId;
      const isTargetedToMe = 
        newNotif.recipientId === user.id ||
        newNotif.recipientId === 'ALL' ||
        newNotif.recipientId === user.role.toUpperCase() + 'S';

      const isSuperAdminMatch = user.role === 'superadmin' && newNotif.senderRole === 'superadmin';

      if (isSuperAdminMatch || (isSchoolMatch && isTargetedToMe)) {
        // Exclude system alerts (superadmin notices) for student and teacher roles
        if ((user.role === 'student' || user.role === 'teacher') && newNotif.senderRole === 'superadmin') {
          return;
        }
        // 1. Add toast alert
        addToast(newNotif.title, newNotif.body, newNotif.type);
        // 2. Append to notifications feed
        setNotifications(prev => [newNotif, ...prev]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !readIds.includes(n._id)).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchNotifications, markAllAsRead, addToast }}>
      {children}
      {/* Premium Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div 
            key={toast.id} 
            className="pointer-events-auto bg-white/95 backdrop-blur-md border border-gray-100 shadow-2xl rounded-2xl p-4 flex gap-3.5 transform translate-y-0 transition-all duration-300 animate-slide-in border-l-4 border-l-primary"
            style={{
              borderLeftColor: toast.type === 'URGENT' ? '#ef4444' : toast.type === 'EVENT' ? '#3b82f6' : '#1a2744'
            }}
          >
            <span className="text-xl shrink-0 self-start mt-1">
              {toast.type === 'URGENT' ? '🚨' : toast.type === 'EVENT' ? '📅' : '📢'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full select-none uppercase ${
                  toast.type === 'URGENT' ? 'bg-red-50 text-red-600 border border-red-200' :
                  toast.type === 'EVENT' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                  'bg-slate-50 text-slate-600 border border-slate-200'
                }`}>
                  Priority: {toast.type}
                </span>
                <span className="text-[9px] font-bold text-red-500 bg-red-50/50 px-2 py-0.5 rounded-full animate-pulse">
                  New Notification
                </span>
              </div>
              <div className="text-xs font-bold text-primary leading-tight mb-1">{toast.title}</div>
              <div className="text-[11px] text-gray-500 leading-relaxed mb-2.5">{toast.body}</div>
              <div className="text-[9px] text-primary bg-primary/5 p-2 rounded-lg border border-primary/10 flex items-center gap-1.5 font-medium leading-normal">
                <span>📢</span>
                <span>You have unread notifications. Please see the notices page or click the bell icon to view.</span>
              </div>
            </div>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="text-gray-400 hover:text-gray-600 font-bold shrink-0 self-start text-sm"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
