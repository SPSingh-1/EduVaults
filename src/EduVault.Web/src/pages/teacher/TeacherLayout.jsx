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

export const TeacherLayout = () => {
  const { user } = useAuth();

  const baseLinks = [
    { pageKey: 'teacher.dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
    { pageKey: 'teacher.classes', icon: Building, label: 'My Classes', path: '/teacher/classes' },
    { pageKey: 'teacher.students', icon: Users, label: 'Students', path: '/teacher/students' },
    { pageKey: 'teacher.attendance', icon: CheckSquare, label: 'Attendance', path: '/teacher/attendance' },
    { pageKey: 'teacher.self_attendance', icon: Calendar, label: 'My Attendance', path: '/teacher/self-attendance' },
    { pageKey: 'teacher.leaves', icon: CalendarCheck, label: 'My Leaves', path: '/teacher/leaves' },
    { pageKey: 'teacher.marks', icon: Edit, label: 'Marks Entry', path: '/teacher/marks' },
    { pageKey: 'teacher.homework', icon: PenTool, label: 'Homework', path: '/teacher/homework' },
    { pageKey: 'teacher.holidays', icon: CalendarDays, label: 'Holiday Calendar', path: '/teacher/holidays' },
    { pageKey: 'teacher.remarks', icon: MessageSquare, label: 'Remarks', path: '/teacher/remarks' },
    { pageKey: 'teacher.notices', icon: Megaphone, label: 'Notices', path: '/teacher/notices' },
    { pageKey: 'teacher.profile', icon: User, label: 'Profile', path: '/teacher/profile' },
  ];

  if (user?.hasLibraryModule) {
    baseLinks.splice(6, 0, {
      pageKey: 'teacher.books',
      icon: BookOpen,
      label: 'My Library Books',
      path: '/teacher/my-books'
    });
  }

  const hasDynamicPerms = user?.permissions && user.permissions.filter(p => p.canView && (p.route?.startsWith('/teacher') || p.pageKey?.startsWith('teacher'))).length > 0;

  const finalLinks = hasDynamicPerms
    ? user.permissions
        .filter(p => p.canView && (p.route?.startsWith('/teacher') || p.pageKey?.startsWith('teacher')))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map(p => ({
          pageKey: p.pageKey,
          icon: p.icon || 'Layers',
          label: p.pageName,
          path: p.route
        }))
    : baseLinks;

  return (
    <div className="flex">
      <Sidebar links={finalLinks} role="teacher" />
      <main className="main-content flex-1"><Outlet /></main>
    </div>
  );
};

const CustomTeacherTooltip = ({ active, payload, label, isSalary }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur text-white px-3 py-2 rounded-xl shadow-lg border border-slate-700/50 text-xs">
        <p className="font-semibold text-slate-200">{label || payload[0]?.payload?.className || payload[0]?.payload?.date || payload[0]?.payload?.month || payload[0]?.name}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} className="font-bold font-mono mt-0.5" style={{ color: entry.color || entry.stroke || '#60a5fa' }}>
            {entry.name}: {isSalary ? `₹${Number(entry.value || 0).toLocaleString()}` : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// --- Teacher Dashboard ---
export default TeacherLayout;
