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

export const StudentAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const [attRes, profRes] = await Promise.all([
          apiClient.get('/academics/attendance/my'),
          apiClient.get('/academics/student/profile').catch(() => null)
        ]);
        const activeEnrollDate = profRes?.data?.enrollDate;
        const filteredAtt = attRes.data.filter(a => !activeEnrollDate || a.date >= activeEnrollDate.split('T')[0]);
        setAttendanceList(filteredAtt);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const totalDays = attendanceList.length;
  const presentCount = attendanceList.filter(a => a.status === 'Present').length;
  const lateCount = attendanceList.filter(a => a.status === 'Late').length;
  const absentCount = attendanceList.filter(a => a.status === 'Absent').length;
  const attendanceRate = totalDays > 0
    ? ((presentCount + lateCount) / totalDays * 100).toFixed(1) + '%'
    : '0.0%';

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
    setSelectedRecord(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
    setSelectedRecord(null);
  };

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ padding: true, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dateObj = new Date(year, month, day);
    const isSunday = dateObj.getDay() === 0;
    const record = attendanceList.find(a => a.date === dateStr);
    calendarDays.push({
      padding: false,
      day,
      dateStr,
      isSunday,
      record,
      key: `day-${day}`
    });
  }

  const getStatusColor = (status) => {
    return status === 'Present'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100/80 hover:bg-emerald-100/50'
      : status === 'Late'
        ? 'bg-amber-50 text-amber-700 border-amber-100/80 hover:bg-amber-100/50'
        : 'bg-rose-50 text-rose-700 border-rose-100/80 hover:bg-rose-100/50';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return <Loader message="Tracking your classroom presence" />;
  }

  return (
    <div className="h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] flex flex-col min-h-[500px]">
      <Topbar title="Attendance Log" subtitle="Academic Presence Tracker" />

      <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
        {[
          { label: 'Attendance Rate', value: attendanceRate, color: 'text-primary', icon: '📈' },
          { label: 'Present Days', value: presentCount, color: 'text-green-600', icon: '✅' },
          { label: 'Late Days', value: lateCount, color: 'text-amber-500', icon: '⏱️' },
          { label: 'Absent Days', value: absentCount, color: 'text-red-500', icon: '❌' },
        ].map(stat => (
          <div key={stat.label} className="stat-card flex items-center gap-4 py-3 px-4 shadow-3xs">
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center text-xl">{stat.icon}</div>
            <div>
              <div className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xxs text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="card col-span-2 h-full flex flex-col justify-between py-4 px-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h3 className="font-display font-bold text-primary text-base m-0">
              📅 {monthNames[month]} {year}
            </h3>
            <div className="flex gap-1.5">
              <button onClick={handlePrevMonth} className="btn-outline px-2.5 py-1 text-2xs">◀ Prev</button>
              <button onClick={handleNextMonth} className="btn-outline px-2.5 py-1 text-2xs">Next ▶</button>
            </div>
          </div>

          <div className="max-w-[440px] mx-auto w-full flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-7 gap-3 mb-3 text-center text-xs font-bold uppercase tracking-wider font-display shrink-0">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className={`py-1 ${d === 'Sun' ? 'text-rose-500 font-extrabold' : 'text-gray-400'}`}>{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="py-24 text-center text-gray-400 text-sm">Loading attendance logs...</div>
            ) : (
              <div className="grid grid-cols-7 gap-3">
                {calendarDays.map(cd => {
                  if (cd.padding) {
                    return <div key={cd.key} className="aspect-square rounded-full bg-transparent border border-transparent"></div>;
                  }

                  const hasRecord = !!cd.record;
                  const isSelected = selectedRecord && cd.record && selectedRecord.date === cd.record.date;

                  if (cd.isSunday && !hasRecord) {
                    return (
                      <div
                        key={cd.key}
                        title="Sunday - Weekly Off"
                        className="aspect-square rounded-full flex flex-col items-center justify-center border border-rose-200/80 bg-rose-50/40 text-rose-500 text-xs font-semibold cursor-default select-none shadow-3xs"
                      >
                        <span className="text-xs sm:text-sm font-semibold text-rose-600">{cd.day}</span>
                        <span className="text-[7px] uppercase font-black text-rose-400">Off</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={cd.key}
                      onClick={() => cd.record && setSelectedRecord(cd.record)}
                      disabled={!hasRecord}
                      className={`aspect-square rounded-full flex flex-col items-center justify-center border text-xs transition-all duration-200 ${hasRecord
                          ? `${getStatusColor(cd.record.status)} font-semibold cursor-pointer hover:scale-105 active:scale-95 shadow-xs ${
                              isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105 z-10 font-bold' : ''
                            }`
                          : 'border-slate-100/60 text-slate-350 bg-slate-50/20 cursor-not-allowed'
                        }`}
                    >
                      <span className="text-xs sm:text-sm font-semibold">{cd.day}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="card h-full flex flex-col overflow-hidden py-4 px-6">
          <h3 className="font-display font-bold text-primary text-sm mb-4 shrink-0">📝 Attendance Details</h3>
          <div className="flex-1 overflow-y-auto pr-1">
            {selectedRecord ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Date</div>
                  <div className="text-sm font-semibold text-primary">{formatDateDDMMYYYY(selectedRecord.date)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Status</div>
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${selectedRecord.status === 'Present'
                      ? 'bg-green-100 text-green-800'
                      : selectedRecord.status === 'Late'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                      }`}>
                      ● {selectedRecord.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Teacher's Remarks</div>
                  <div className="text-sm font-medium text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-3 leading-relaxed">
                    {selectedRecord.remarks || 'No remarks provided for this date.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-xs">
                Select any highlighted date in the calendar to view status remarks from the teacher.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Student Results ---
export default StudentAttendance;
