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

export const StudentLayout = () => {
  const { user } = useAuth();

  const baseLinks = [
    { pageKey: 'student.dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
    { pageKey: 'student.schedule', icon: Calendar, label: 'Daily Schedule', path: '/student/schedule' },
    { pageKey: 'student.attendance', icon: CheckSquare, label: 'Attendance', path: '/student/attendance' },
    { pageKey: 'student.homework', icon: PenTool, label: 'Homework', path: '/student/homework' },
    { pageKey: 'student.syllabus', icon: BookOpen, label: 'Syllabus', path: '/student/syllabus' },
    { pageKey: 'student.holidays', icon: CalendarDays, label: 'Holiday Calendar', path: '/student/holidays' },
    { pageKey: 'student.fees', icon: Wallet, label: 'Fees', path: '/student/fees' },
    { pageKey: 'student.exams', icon: ClipboardList, label: 'Exam Timetable', path: '/student/exams' },
    { pageKey: 'student.results', icon: Trophy, label: 'Results', path: '/student/results' },
    { pageKey: 'student.notices', icon: Megaphone, label: 'Notices', path: '/student/notices' },
    { pageKey: 'student.profile', icon: User, label: 'Profile', path: '/student/profile' },
  ];

  if (user?.hasLibraryModule) {
    baseLinks.splice(5, 0, {
      pageKey: 'student.books',
      icon: BookOpen,
      label: 'My Library Books',
      path: '/student/my-books'
    });
  }

  const hasDynamicPerms = user?.permissions && user.permissions.filter(p => p.canView && (p.route?.startsWith('/student') || p.pageKey?.startsWith('student'))).length > 0;

  const finalLinks = hasDynamicPerms
    ? user.permissions
        .filter(p => p.canView && (p.route?.startsWith('/student') || p.pageKey?.startsWith('student')))
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
      <Sidebar links={finalLinks} role="student" />
      <main className="main-content flex-1"><Outlet /></main>
    </div>
  );
};

// --- Student Dashboard ---
export default StudentLayout;
