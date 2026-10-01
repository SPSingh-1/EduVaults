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

export const StudentLibrary = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await apiClient.get('/academics/my-library-books');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load library books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLibrary();
  }, []);

  return (
    <div className="space-y-6 text-left">
      <Topbar title="My Library Books" subtitle="Track Borrowed Textbooks, Due Dates & Overdue Fines" />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-400 shrink-0" />
            My Borrowed Books
          </h1>
          <p className="text-sm text-cyan-200/90 max-w-xl">
            Keep track of returned books, active borrowings, return due dates, and fine policies established by the school librarian.
          </p>
        </div>

        {data && (
          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center shrink-0">
            <span className="text-3xs font-black uppercase tracking-widest text-cyan-300 block">Library Overdue Fine Policy</span>
            <div className="text-xl font-black text-white font-mono mt-0.5">₹{data.finePerDay || 2} <span className="text-xs font-normal">/ day</span></div>
          </div>
        )}
      </div>

      {/* Books Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900">
            Issued Books & Return History ({data?.books?.length || 0})
          </h2>
        </div>

        {loading ? (
          <div className="py-20 text-center"><Loader /></div>
        ) : !data || data.books?.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No Books Currently Borrowed</p>
            <p className="text-xs text-slate-400">Visit the school library to borrow books and study materials.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3.5 px-6">BOOK TITLE & AUTHOR</th>
                  <th className="py-3.5 px-4">CATEGORY</th>
                  <th className="py-3.5 px-4">ISSUE DATE</th>
                  <th className="py-3.5 px-4">DUE DATE</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4">FINE STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {(data?.books || []).map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{b.bookTitle}</div>
                      <div className="text-xs text-slate-500">by {b.author}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-2xs font-bold">
                        {b.category}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600">
                      {new Date(b.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4 text-xs font-bold text-slate-800">
                      {new Date(b.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-3xs font-black uppercase tracking-wider border ${
                        b.status === 'Returned'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : b.status === 'Overdue'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                          : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                      }`}>
                        {b.status} {b.overdueDays > 0 && `(${b.overdueDays}d overdue)`}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono">
                      {b.fineAmount > 0 ? (
                        <span className={`font-bold text-xs ${b.finePaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ₹{b.fineAmount} {b.finePaid ? '(Paid)' : '(Unpaid Fine)'}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">No Fine</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};





export default StudentLibrary;
