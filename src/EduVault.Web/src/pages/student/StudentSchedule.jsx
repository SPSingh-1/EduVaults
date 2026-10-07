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

export const StudentSchedule = () => {
  const [profile, setProfile] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = dayNames[new Date().getDay()];
  const isWeekend = currentDayName === 'Saturday' || currentDayName === 'Sunday';
  const defaultTab = days.includes(currentDayName) ? currentDayName : 'Monday';

  const [activeDay, setActiveDay] = useState(defaultTab);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profRes = await apiClient.get('/academics/student/profile');
        const prof = profRes.data;
        setProfile(prof);

        const classId = prof.classId || prof.ClassId;
        if (classId) {
          const [periodRes, scheduleRes] = await Promise.all([
            apiClient.get('/academics/timetable/periods'),
            apiClient.get(`/academics/timetable/schedule/${classId}`)
          ]);
          setPeriods(periodRes.data.sort((a, b) => a.periodNumber - b.periodNumber));
          setSchedule(scheduleRes.data);
        } else {
          setError('You are not currently enrolled in any active class section.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load schedule. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <Loader message="Retrieving your class timetable" />;
  }

  if (error) {
    return (
      <div>
        <Topbar title="Daily Class Schedule" subtitle="Your personalized weekly timetable" />
        <div className="card text-center py-12 text-rose-500 text-sm bg-rose-50 border border-rose-100 rounded-xl">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  const activeDaySchedule = schedule.filter(
    item => item.dayOfWeek.toLowerCase() === activeDay.toLowerCase()
  );

  return (
    <div>
      <Topbar title="Daily Class Schedule" subtitle={`Class Timetable for ${profile?.class} - ${profile?.section} | Room ${profile?.room}`} />

      {isWeekend && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 text-sm">
          <span>🎉</span>
          <div>
            <strong className="font-semibold">Weekend Mode!</strong> It's the weekend. Enjoy your break! Showing Monday's timetable configuration by default.
          </div>
        </div>
      )}

      {/* Days Tabs */}
      <div className="flex gap-1.5 bg-slate-100/60 p-1 rounded-2xl w-full sm:w-fit border border-slate-200/30 mb-6 overflow-x-auto scrollbar-none">
        {days.map(d => {
          const isToday = d.toLowerCase() === currentDayName.toLowerCase();
          const isActive = d.toLowerCase() === activeDay.toLowerCase();
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer transition-all duration-200 ease-out select-none active:scale-95 ${isActive
                ? 'bg-white text-primary shadow-xs font-bold border border-slate-200/50 scale-100'
                : 'text-slate-500 hover:text-primary hover:bg-white/40 bg-transparent border border-transparent'
                }`}
            >
              <span>{d}</span>
              {isToday && (
                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold tracking-wider ${isActive ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/60 text-slate-500'}`}>
                  TODAY
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule List */}
      <div className="space-y-3">
        {periods.map(p => {
          const cell = activeDaySchedule.find(c => c.periodNumber === p.periodNumber);
          const hasClass = cell && cell.teacherId;
          const isHomeroom = cell && cell.subjectName === 'Homeroom (Class Teacher)';

          return (
            <div
              key={p.id}
              className={`border-y border-r border-l-4 border-slate-100 bg-white rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ease-out hover:shadow-md hover:translate-x-0.5 ${hasClass
                ? isHomeroom
                  ? 'border-l-amber-500 bg-gradient-to-r from-amber-50/15 via-white to-white hover:border-l-amber-600'
                  : 'border-l-primary bg-gradient-to-r from-blue-50/10 via-white to-white hover:border-l-indigo-600'
                : 'border-l-slate-250 bg-slate-50/30 opacity-75 border-dashed border'
                }`}
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-display shrink-0 transition-all duration-200 ${hasClass
                  ? isHomeroom
                    ? 'bg-amber-100 text-amber-900 border border-amber-200/60 shadow-2xs'
                    : 'bg-blue-50 text-blue-700 border border-blue-100/60 shadow-2xs'
                  : 'bg-slate-100 text-slate-400 border border-slate-200/60'
                  }`}>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400/80 leading-none mb-0.5">PER</span>
                  <span className="text-sm font-black leading-none">{p.periodNumber}</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">TIMING</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{p.startTime} - {p.endTime}</div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {hasClass ? (
                  <div>
                    <h4 className="font-display font-bold text-sm text-primary mb-1">
                      {cell.subjectName}
                    </h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] border border-slate-200/50">
                        {cell.teacherName ? cell.teacherName.charAt(0).toUpperCase() : 'T'}
                      </span>
                      <span className="text-gray-400 font-medium">Teacher:</span>
                      <span className="font-semibold text-slate-700">{cell.teacherName}</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-display font-semibold text-xs text-slate-450 italic">
                      Free Period
                    </h4>
                    <p className="text-[10px] text-slate-400 font-light mt-0.5">No classes scheduled. Enjoy your break or study time!</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end justify-center min-w-0 sm:min-w-[120px] gap-1.5 shrink-0">
                {hasClass && (
                  <>
                    {cell.isRescheduled && (
                      <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-150 text-[10px] py-0.5 font-bold uppercase tracking-wider">
                        ● COVER ASSIGNED
                      </span>
                    )}
                    {cell.remark && (
                      <div className="bg-red-50 text-red-700 text-[10px] px-2.5 py-1.5 rounded-lg font-medium leading-normal w-full md:max-w-[200px] text-left md:text-right border border-red-100/50">
                        <strong>Alert:</strong> "{cell.remark}"
                      </div>
                    )}
                  </>
                )}
                {!hasClass && (
                  <span className="badge bg-slate-100 text-slate-450 border border-slate-200 text-[10px] py-0.5 font-bold uppercase tracking-wider">
                    FREE
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {periods.length === 0 && (
          <div className="card text-center py-8 text-gray-400 text-xs italic">
            No periods defined for this school's timetable.
          </div>
        )}
      </div>
    </div>
  );
};

// --- Student Exam Timetable ---
export default StudentSchedule;
