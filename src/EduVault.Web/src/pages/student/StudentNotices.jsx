import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import Loader from '../../components/common/Loader';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY, formatDateRangeDDMMYYYY, getTodayStr } from '../../utils/dateUtils';
import DateFilterInput from '../../components/common/DateFilterInput';
import { loadScript } from '../../utils/scriptLoader';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Trophy,
  Award,
  ClipboardList,
  PenTool,
  Wallet,
  Megaphone,
  User,
  CreditCard,
  Lock,
  MessageSquare,
  Printer,
  Building,
  GraduationCap,
  Mail,
  Fingerprint,
  MapPin,
  HeartPulse,
  BookOpen,
  ChevronDown,
  CalendarDays,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';
import { printRenderedDocument } from '../../components/print/PrintIframe';
import { CustomStudentTooltip, executePaymentFlow } from './studentUtils';

export const StudentNotices = () => {
  const { markAllAsRead } = useNotifications();
  const [notices, setNotices] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'schooladmin', 'teacher'
  const [enrollDate, setEnrollDate] = useState(null);

  const filteredNotices = notices.filter(n => {
    // Exclude system alerts (superadmin notices) for students
    if (n.senderRole === 'superadmin') {
      return false;
    }
    // Exclude old notices posted before promotion date
    if (enrollDate && new Date(n.createdAt) < new Date(enrollDate)) {
      return false;
    }
    if (activeFilterTab === 'schooladmin') {
      return n.senderRole === 'schooladmin';
    }
    if (activeFilterTab === 'teacher') {
      return n.senderRole === 'teacher';
    }
    return true; // 'all'
  });

  useEffect(() => {
    const fetchEnrollDate = async () => {
      try {
        const res = await apiClient.get('/academics/student/profile');
        if (res.data && res.data.enrollDate) {
          setEnrollDate(res.data.enrollDate);
        }
      } catch (err) {
        console.error("Error fetching student profile for notices:", err);
      }
    };
    fetchEnrollDate();

    const fetchNotices = async () => {
      try {
        const res = await expressClient.get('/notifications');
        setNotices(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotices();

    const token = localStorage.getItem('eduvault_token');
    if (token) {
      const expressUrl = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:5005/api';
      const socketUrl = expressUrl.replace(/\/api$/, '');
      const socket = io(socketUrl, {
        auth: { token }
      });
      socket.on('notification', (notif) => {
        setNotices(prev => [notif, ...prev]);
      });
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (notices.length > 0) {
      markAllAsRead();
    }
  }, [notices]);
  return (
    <div>
      <Topbar title="Notices & Announcements" />

      {/* Filtering Tabs */}
      <div className="flex gap-1.5 bg-slate-100/60 p-1.5 rounded-2xl w-fit border border-slate-200/30 mb-6 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'All Announcements', Icon: Megaphone },
          { id: 'schooladmin', label: 'School Admin Notices', Icon: Building },
          { id: 'teacher', label: 'Teacher Notices', Icon: GraduationCap }
        ].map(tab => {
          const isActive = activeFilterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterTab(tab.id)}
              className={`px-4.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0 cursor-pointer transition-all duration-200 ease-out select-none active:scale-95 ${isActive
                ? 'bg-white text-primary shadow-xs font-bold border border-slate-200/50 scale-100'
                : 'text-slate-500 hover:text-primary hover:bg-white/40 bg-transparent border border-transparent'
                }`}
            >
              <tab.Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredNotices.map((n, i) => {
          const isUrgent = n.type === 'URGENT';
          const isEvent = n.type === 'EVENT';

          return (
            <div
              key={n._id || i}
              className={`border border-slate-100/80 rounded-2xl p-5 hover:shadow-md hover:translate-x-0.5 transition-all duration-300 ease-out ${isUrgent
                ? 'border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50/10 via-white to-white'
                : isEvent
                  ? 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-white to-white'
                  : 'border-l-4 border-l-slate-350 bg-gradient-to-r from-slate-50/10 via-white to-white'
                }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100/80 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`badge ${isUrgent
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : isEvent
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-slate-100 text-slate-655 border border-slate-200'
                    } text-[10px] py-0.5 uppercase font-bold tracking-wider rounded-lg`}>
                    {n.type}
                  </span>
                  <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>

                {n.senderRole === 'superadmin' ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-150 uppercase tracking-wider">
                    🛡️ Platform Announcement
                  </span>
                ) : (
                  n.senderName && (
                    <div className="flex items-center gap-1.5 text-2xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg select-none">
                      <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold text-[8px] uppercase ${n.senderRole === 'schooladmin'
                        ? 'bg-amber-100 text-amber-955 border border-amber-200/50'
                        : 'bg-blue-50 text-blue-955 border border-blue-100/50'
                        }`}>
                        {n.senderName.substring(0, 2).toUpperCase()}
                      </span>
                      <span>
                        Sent by: <span className="font-semibold text-slate-700">{n.senderName}</span> <span className="text-slate-400">({n.senderRole === 'schooladmin' ? 'Admin' : 'Teacher'})</span>
                      </span>
                    </div>
                  )
                )}
              </div>

              <h3 className="font-display font-extrabold text-slate-800 text-sm md:text-base mb-1.5">{n.title}</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">{n.body}</p>
            </div>
          );
        })}
        {filteredNotices.length === 0 && (
          <div className="card text-center py-8 text-gray-400 text-xs italic">
            No notices posted for this filter tab.
          </div>
        )}
      </div>
    </div>
  );
};

// --- Student Profile ---
export default StudentNotices;
