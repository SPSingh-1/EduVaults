import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import Loader from '../../components/common/Loader';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY, formatDateRangeDDMMYYYY, getTodayStr } from '../../utils/dateUtils';
import DateFilterInput from '../../components/common/DateFilterInput';
import { formatClassLabel, formatGrade } from '../../utils/classUtils';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  CheckSquare, 
  Calendar, 
  Edit, 
  PenTool, 
  MessageSquare, 
  Megaphone, 
  User, 
  DollarSign, 
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Send,
  Plus,
  X,
  Search,
  Filter,
  Trash2,
  Eye,
  Download,
  Upload,
  Check
} from 'lucide-react';

const showToast = (msg, type = 'info') => {
  if (typeof window !== 'undefined' && window.appToast?.[type]) {
    window.appToast[type](msg);
  } else {
    console.log(`[Toast ${type}]:`, msg);
  }
};

export const TeacherNotices = () => {
  const { markAllAsRead } = useNotifications();
  const [noticesList, setNoticesList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [target, setTarget] = useState('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('GENERAL');
  const [loading, setLoading] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'schooladmin', 'teacher'
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

  const filteredNotices = noticesList.filter(n => {
    // Exclude system alerts (superadmin notices) for teachers
    if (n.senderRole === 'superadmin') {
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

  const fetchNotices = async () => {
    try {
      const res = await expressClient.get('/notifications');
      setNoticesList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Notice fetch warning:', err.message);
    }
  };

  useEffect(() => {
    fetchNotices();

    const token = localStorage.getItem('eduvault_token');
    if (token) {
      const expressUrl = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:5005/api';
      const socketUrl = expressUrl.replace(/\/api$/, '');
      const socket = io(socketUrl, {
        auth: { token }
      });
      socket.on('notification', (notif) => {
        setNoticesList(prev => [notif, ...prev]);
      });
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (noticesList.length > 0) {
      markAllAsRead();
    }
  }, [noticesList]);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setLoading(true);
    let whatsAppSent = false;
    try {
      try {
        await expressClient.post('/notifications', {
          recipientId: target,
          title,
          body,
          type
        });
      } catch (inAppErr) {
        console.warn('In-app notification note:', inAppErr.message);
      }

      if (sendWhatsApp) {
        try {
          const waRes = await apiClient.post('/academics/whatsapp/send-broadcast', {
            title,
            body
          });
          if (waRes.data?.success) {
            whatsAppSent = true;
          }
        } catch (waErr) {
          console.error('WhatsApp send error:', waErr);
          showToast('WhatsApp sending error: ' + (waErr.response?.data?.error || waErr.message), 'error');
        }
      }

      setShowNew(false);
      setTitle('');
      setBody('');
      setSendWhatsApp(false);
      fetchNotices();

      if (whatsAppSent) {
        showToast('Notice published and WhatsApp message sent successfully to parents!', 'success');
      } else {
        showToast('Notice published successfully!', 'success');
      }
    } catch (err) {
      console.error('Error publishing notice:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Notices & Announcements" actions={
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Notice</button>
      } />
      
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* Filtering Tabs */}
          <div className="flex border-b border-gray-100 mb-4 gap-4">
            {[
              { id: 'all', label: 'All Announcements', icon: '📢' },
              { id: 'schooladmin', label: 'School Admin Notices', icon: '🏫' },
              { id: 'teacher', label: 'Teacher Notices', icon: '👨‍🏫' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id)}
                className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeFilterTab === tab.id
                    ? 'border-primary text-primary font-black'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {filteredNotices.map((n, i) => (
            <div key={n._id || i} className={`card ${n.type === 'URGENT' ? 'border-l-4 border-red-500 shadow-md' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={n.type === 'URGENT' ? 'badge-danger' : n.type === 'EVENT' ? 'badge-info' : 'badge-gray'}>{n.type}</span>
                  <span className="badge badge-info">Audience: {n.recipientId === 'SCHOOLADMINS' ? 'Admins' : n.recipientId}</span>
                  <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">👤 {n.senderName || 'School System'} ({n.senderRole === 'schooladmin' ? 'Admin' : n.senderRole === 'teacher' ? 'Teacher' : n.senderRole})</span>
              </div>
              <h3 className="font-display font-bold text-primary mb-1">{n.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{n.body}</p>
            </div>
          ))}
          {filteredNotices.length === 0 && (
            <div className="card text-center py-6 text-gray-400 text-sm">No notices posted.</div>
          )}
        </div>

        <div className="card">
          <h3 className="font-display font-semibold text-primary mb-4">⊕ Quick Broadcast</h3>
          <form onSubmit={handlePostNotice} className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">TARGET AUDIENCE</div>
              <select value={target} onChange={e => setTarget(e.target.value)} className="input text-xs">
                <option value="ALL">All Users (ALL)</option>
                <option value="TEACHERS">Teachers Only</option>
                <option value="STUDENTS">Students Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Category</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input text-xs">
                <option value="GENERAL">General Notice</option>
                <option value="URGENT">Urgent Announcement</option>
                <option value="EVENT">School Event</option>
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Title</label><input required placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} className="input" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Message Body</label><textarea required placeholder="Type announcement here..." value={body} onChange={e => setBody(e.target.value)} className="input h-28 resize-none" /></div>
            <div className="flex items-center gap-2 py-1.5">
              <input type="checkbox" id="whatsAppQuick" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer" />
              <label htmlFor="whatsAppQuick" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">Send WhatsApp to Parents</label>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all">
              {loading ? 'Publishing...' : 'Send Now'}
            </button>
          </form>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handlePostNotice} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-primary text-xl">Create New Notice</h3>
                <button type="button" onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 text-lg">✖</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Audience</label>
                  <select value={target} onChange={e => setTarget(e.target.value)} className="input">
                    <option value="ALL">All Users (ALL)</option>
                    <option value="TEACHERS">Teachers Only</option>
                    <option value="STUDENTS">Students Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Category</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="input">
                    <option value="GENERAL">General Notice</option>
                    <option value="URGENT">Urgent Announcement</option>
                    <option value="EVENT">School Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Title</label>
                  <input required placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message Body</label>
                  <textarea required placeholder="Type announcement here..." value={body} onChange={e => setBody(e.target.value)} className="input h-28 resize-none" />
                </div>
                <div className="flex items-center gap-2 py-1">
                  <input type="checkbox" id="whatsAppModal" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer" />
                  <label htmlFor="whatsAppModal" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">Send WhatsApp to Parents</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setShowNew(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const CLIENT_DEFAULT_HOLIDAYS = [
  { _id: 'h1', title: 'Republic Day', date: '2026-01-26', endDate: '2026-01-26', category: 'NATIONAL', description: 'National celebration of Republic Day of India. Flag hoisting ceremony.' },
  { _id: 'h2', title: 'Maha Shivratri', date: '2026-02-15', endDate: '2026-02-15', category: 'FESTIVAL', description: 'School holiday on account of Maha Shivratri.' },
  { _id: 'h3', title: 'Holi Festival', date: '2026-03-04', endDate: '2026-03-05', category: 'FESTIVAL', description: 'School closed for Holi and Dhulandi celebrations.' },
  { _id: 'h4', title: 'Eid-ul-Fitr', date: '2026-03-20', endDate: '2026-03-20', category: 'FESTIVAL', description: 'School holiday for Eid-ul-Fitr observance.' },
  { _id: 'h5', title: 'Good Friday', date: '2026-04-03', endDate: '2026-04-03', category: 'RESTRICTED', description: 'School closed for Good Friday.' },
  { _id: 'h6', title: 'Ambedkar Jayanti', date: '2026-04-14', endDate: '2026-04-14', category: 'NATIONAL', description: 'Commemoration of Dr. B.R. Ambedkar Jayanti.' },
  { _id: 'h7', title: 'Mahavir Jayanti', date: '2026-04-15', endDate: '2026-04-15', category: 'FESTIVAL', description: 'School holiday on account of Mahavir Jayanti.' },
  { _id: 'h8', title: 'Summer Vacation', date: '2026-05-18', endDate: '2026-06-30', category: 'ACADEMIC', description: 'Annual summer vacation for students and faculty.' },
  { _id: 'h9', title: 'Muharram', date: '2026-06-26', endDate: '2026-06-26', category: 'FESTIVAL', description: 'Gazetted school holiday for Muharram.' },
  { _id: 'h10', title: 'Independence Day', date: '2026-08-15', endDate: '2026-08-15', category: 'NATIONAL', description: 'Independence Day celebration. Flag hoisting at 8:00 AM.' },
  { _id: 'h11', title: 'Raksha Bandhan', date: '2026-08-28', endDate: '2026-08-28', category: 'FESTIVAL', description: 'School closed for Raksha Bandhan festival.' },
  { _id: 'h12', title: 'Janmashtami', date: '2026-09-04', endDate: '2026-09-04', category: 'FESTIVAL', description: 'School holiday on Sri Krishna Janmashtami.' },
  { _id: 'h13', title: 'Eid-e-Milad', date: '2026-09-25', endDate: '2026-09-25', category: 'FESTIVAL', description: 'School holiday for Milad-un-Nabi.' },
  { _id: 'h14', title: 'Mahatma Gandhi Jayanti', date: '2026-10-02', endDate: '2026-10-02', category: 'NATIONAL', description: 'National Holiday in honor of Mahatma Gandhi.' },
  { _id: 'h15', title: 'Dussehra Break', date: '2026-10-20', endDate: '2026-10-23', category: 'FESTIVAL', description: 'School closed for Vijayadashami Dussehra festivities.' },
  { _id: 'h16', title: 'Diwali & Chhath Vacation', date: '2026-11-08', endDate: '2026-11-15', category: 'FESTIVAL', description: 'Deepawali, Govardhan Puja, Bhai Dooj and Chhath Puja holidays.' },
  { _id: 'h17', title: 'Guru Nanak Jayanti', date: '2026-11-24', endDate: '2026-11-24', category: 'RESTRICTED', description: 'School holiday on Guru Nanak Gurpurab.' },
  { _id: 'h18', title: 'Winter Vacation & Christmas', date: '2026-12-25', endDate: '2027-01-05', category: 'ACADEMIC', description: 'Winter break and Christmas holidays.' },
  { _id: 'h19', title: 'Republic Day', date: '2027-01-26', endDate: '2027-01-26', category: 'NATIONAL', description: 'National celebration of Republic Day of India.' },
  { _id: 'h20', title: 'Holi Festival', date: '2027-03-23', endDate: '2027-03-24', category: 'FESTIVAL', description: 'Festival of colours holiday.' }
];

// --- Teacher School Holiday Calendar ---
export default TeacherNotices;
