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

export const StudentHolidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await expressClient.get('/holidays');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setHolidays(res.data);
      } else {
        setHolidays(CLIENT_DEFAULT_HOLIDAYS);
      }
    } catch (err) {
      console.warn('Failed to fetch holidays, using statutory calendar:', err);
      setHolidays(CLIENT_DEFAULT_HOLIDAYS);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchHolidays();
  }, []);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedHoliday(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedHoliday(null);
  };

  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ padding: true, key: `pad-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const isSunday = dateObj.getDay() === 0;
    const matchedHoliday = holidays.find(h => {
      const hStart = h.date;
      const hEnd = h.endDate || h.date;
      return dateStr >= hStart && dateStr <= hEnd;
    });
    calendarDays.push({
      padding: false,
      day,
      dateStr,
      isSunday,
      holiday: matchedHoliday,
      key: `day-${day}`
    });
  }

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'WEEKLY_OFF':
        return { bg: 'bg-rose-500/10 text-rose-700 border-rose-200', badge: '☀️ Weekly Off', dot: 'bg-rose-500' };
      case 'NATIONAL':
        return { bg: 'bg-orange-500/10 text-orange-700 border-orange-200', badge: '🇮🇳 National Holiday', dot: 'bg-orange-500' };
      case 'FESTIVAL':
        return { bg: 'bg-purple-500/10 text-purple-700 border-purple-200', badge: '🎉 Festival Holiday', dot: 'bg-purple-500' };
      case 'ACADEMIC':
        return { bg: 'bg-blue-500/10 text-blue-700 border-blue-200', badge: '📚 Academic Vacation', dot: 'bg-blue-500' };
      case 'EMERGENCY':
        return { bg: 'bg-rose-500/10 text-rose-700 border-rose-200', badge: '🚨 Emergency Leave', dot: 'bg-rose-500' };
      case 'RESTRICTED':
        return { bg: 'bg-amber-500/10 text-amber-700 border-amber-200', badge: '✝️ Restricted Holiday', dot: 'bg-amber-500' };
      default:
        return { bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200', badge: '🌴 School Holiday', dot: 'bg-emerald-500' };
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const filteredHolidays = holidays.filter(h => {
    const matchesCategory = filterCategory === 'ALL' || h.category === filterCategory;
    const matchesQuery = !searchQuery || h.title.toLowerCase().includes(searchQuery.toLowerCase()) || (h.description && h.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  const nextUpcomingHoliday = holidays.find(h => new Date(h.date) >= new Date(new Date().setHours(0,0,0,0)));

  if (loading) {
    return <Loader message="Accessing official school holiday calendar" />;
  }

  return (
    <div className="space-y-6">
      <Topbar title="School Holiday Calendar" subtitle="View annual school holidays, festival vacations, and declared leave dates" />

      {/* Next Upcoming Holiday Banner */}
      {nextUpcomingHoliday && (
        <div className="card bg-gradient-to-r from-slate-900 via-primary-dark to-slate-900 text-white p-6 shadow-xl rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-amber-300 flex items-center justify-center text-3xl font-bold shadow-lg">
              🎉
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Next School Holiday
                </span>
                <span className="text-xs text-slate-300 font-semibold">{formatDateDDMMYYYY(nextUpcomingHoliday.date)}</span>
              </div>
              <h3 className="text-xl font-extrabold text-white mt-1">{nextUpcomingHoliday.title}</h3>
              <p className="text-xs text-slate-300/80 mt-0.5">{nextUpcomingHoliday.description || 'School will remain closed on this date.'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedHoliday(nextUpcomingHoliday)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all whitespace-nowrap self-start md:self-center cursor-pointer"
          >
            🔍 View Holiday Details
          </button>
        </div>
      )}

      {/* Main Grid: Interactive Calendar & Side Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Calendar View */}
        <div className="lg:col-span-2 card bg-white shadow-sm border border-slate-200/80 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold font-display text-primary">
                {monthNames[month]} {year}
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-50 font-bold text-purple-700 border border-purple-200">
                🎉 {calendarDays.filter(d => !d.padding && d.holiday).length} Declared Holidays
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-50 font-bold text-rose-700 border border-rose-200">
                ☀️ {calendarDays.filter(d => !d.padding && d.isSunday).length} Sundays (Off)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                ◀ Prev Month
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                Next Month ▶
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className={`py-2 ${d === 'Sun' ? 'text-rose-500 font-black' : 'text-slate-400'}`}>{d}</div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell) => {
              if (cell.padding) {
                return <div key={cell.key} className="h-24 bg-slate-50/50 rounded-xl border border-dashed border-slate-100" />;
              }

              const isToday = cell.dateStr === getTodayStr();
              const hasHoliday = !!cell.holiday;
              const isSunday = cell.isSunday;
              const isSelected = selectedHoliday && (
                (cell.holiday && (cell.holiday?._id === selectedHoliday._id || cell.dateStr === selectedHoliday.date)) ||
                (!cell.holiday && isSunday && selectedHoliday.date === cell.dateStr)
              );

              const categoryStyle = hasHoliday
                ? getCategoryBadge(cell.holiday.category)
                : isSunday
                ? getCategoryBadge('WEEKLY_OFF')
                : null;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    if (hasHoliday) {
                      setSelectedHoliday(cell.holiday);
                    } else if (isSunday) {
                      setSelectedHoliday({
                        _id: `sunday-${cell.dateStr}`,
                        title: 'Sunday - Weekly Off',
                        date: cell.dateStr,
                        endDate: cell.dateStr,
                        category: 'WEEKLY_OFF',
                        description: 'Official weekly holiday. Campus, classes, and regular academic operations remain closed.'
                      });
                    }
                  }}
                  className={`h-24 p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 border-primary shadow-md'
                      : hasHoliday
                      ? `${categoryStyle.bg} border-2 hover:scale-[1.02] shadow-2xs cursor-pointer`
                      : isSunday
                      ? 'bg-rose-50/35 border-rose-200/70 hover:bg-rose-50/80 hover:border-rose-300 shadow-3xs cursor-pointer'
                      : isToday
                      ? 'bg-blue-50/40 border-blue-300 hover:bg-blue-50'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center'
                        : isSunday
                        ? 'text-rose-600'
                        : 'text-slate-700'
                    }`}>
                      {cell.day}
                    </span>
                    {hasHoliday ? (
                      <span className={`w-2 h-2 rounded-full ${categoryStyle.dot}`} />
                    ) : isSunday ? (
                      <span className="w-2 h-2 rounded-full bg-rose-400" />
                    ) : null}
                  </div>

                  {hasHoliday ? (
                    <div className="mt-1">
                      <div className="text-[10px] font-black line-clamp-2 leading-tight">
                        {cell.holiday.title}
                      </div>
                      <span className="text-[9px] font-semibold opacity-80 block truncate mt-0.5 text-primary">
                        👉 Click for details
                      </span>
                    </div>
                  ) : isSunday ? (
                    <div className="mt-1">
                      <div className="text-[10px] font-black text-rose-600 leading-tight">
                        Weekly Off
                      </div>
                      <span className="text-[9px] text-rose-500/80 font-semibold block truncate mt-0.5">
                        Sunday Holiday
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-slate-300 font-medium">School Open</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 1 Col: Selected Holiday Details Side Panel */}
        <div className="space-y-6">
          <div className="card bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-display font-bold text-primary text-md flex items-center gap-2">
                <span>📌 Holiday Details</span>
              </h3>
              {selectedHoliday && (
                <button
                  type="button"
                  onClick={() => setSelectedHoliday(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700"
                >
                  Clear ✕
                </button>
              )}
            </div>

            {selectedHoliday ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getCategoryBadge(selectedHoliday.category).bg}`}>
                      {getCategoryBadge(selectedHoliday.category).badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {formatDateRangeDDMMYYYY(selectedHoliday.date, selectedHoliday.endDate)}
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-white font-display pt-1">
                    {selectedHoliday.title}
                  </h4>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Reason / Description</span>
                    <p className="text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                      {selectedHoliday.description || 'Official school holiday declared by administration.'}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Re-opening Note</span>
                    <p className="text-slate-600 font-semibold bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-emerald-900">
                      ✅ Classes and regular school operations will resume on the next working day following this holiday.
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center gap-2 text-[11px] text-blue-800 font-medium">
                    <span>📢 Real-time notification broadcast sent to all students & parents.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <div className="text-4xl mb-2">📅</div>
                <p className="text-xs font-bold text-slate-600">Click on any holiday date in calendar</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Click on any highlighted holiday cell to view details, duration, and official announcements.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Annual Holiday Directory Table */}
      <div className="card bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-display font-bold text-primary text-base">Annual School Holidays Directory</h3>
            <p className="text-xs text-slate-400">Complete list of declared holidays for the academic year</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search holiday name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input text-xs w-48"
            />
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="input text-xs w-36"
            >
              <option value="ALL">All Categories</option>
              <option value="NATIONAL">National Holidays</option>
              <option value="FESTIVAL">Festival Holidays</option>
              <option value="ACADEMIC">Academic Breaks</option>
              <option value="RESTRICTED">Restricted Leave</option>
              <option value="EMERGENCY">Emergency Leave</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Date / Duration</th>
                <th className="py-3 px-4">Holiday Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredHolidays.map((h) => {
                const catStyle = getCategoryBadge(h.category);
                return (
                  <tr key={h._id || h.date} className="hover:bg-slate-50/80 transition-all">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {formatDateRangeDDMMYYYY(h.date, h.endDate)}
                    </td>
                    <td className="py-3 px-4 font-bold text-primary text-sm">{h.title}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${catStyle.bg}`}>
                        {catStyle.badge}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{h.description || 'Official School Holiday'}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedHoliday(h)}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-bold transition-all"
                      >
                        View Details ➔
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredHolidays.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-400 italic text-xs">
                    No holidays match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Student Class Syllabus Component ---
export default StudentHolidays;
