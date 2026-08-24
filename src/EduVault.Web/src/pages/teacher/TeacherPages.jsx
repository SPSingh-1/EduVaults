import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import Loader from '../../components/common/Loader';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY, formatDateRangeDDMMYYYY } from '../../utils/dateUtils';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
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
  Send,
  Plus
} from 'lucide-react';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

// --- Teacher Dashboard ---
export const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleView, setScheduleView] = useState('today');
  const [teacherChartMode, setTeacherChartMode] = useState('attendance'); // 'attendance', 'enrollment'

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/academics/teacher/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching teacher stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <Loader message="Assembling classroom stats & analytics" />;
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[new Date().getDay()];
  const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';
  const todaySchedule = stats?.schedule?.filter(
    item => item.dayOfWeek.toLowerCase() === todayName.toLowerCase()
  ) || [];

  const classAttendancePct = stats?.totalStudents > 0
    ? Math.round(((stats?.todayClassStudentsPresent ?? 0) / stats.totalStudents) * 100)
    : 0;

  const configuredWidgets = stats?.configuredWidgets || [];
  const getWidgetInfo = (key, defaultTitle) => {
    const found = configuredWidgets.find(w => w.widgetKey === key);
    return {
      isVisible: found ? found.isEnabled : true,
      title: found?.title || defaultTitle,
      timeRange: found?.timeRange || 'Daily'
    };
  };

  const classesWidget = getWidgetInfo('card.teacher.assigned_classes', 'My Assigned Classes');
  const attendanceWidget = getWidgetInfo('card.teacher.class_attendance', "Today's Student Attendance");
  const reviewsWidget = getWidgetInfo('card.teacher.pending_reviews', 'Pending Reviews / Homework');
  const salaryWidget = getWidgetInfo('card.teacher.salary_payout', 'Monthly Base Salary');

  return (
    <div className="space-y-6">
      <Topbar title="Teacher Dashboard" subtitle="Academic Year 2023-24 - Live Overview" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { key: 'classes', isVisible: classesWidget.isVisible, label: classesWidget.title, value: stats?.totalClasses ?? '0', sub: stats?.myClassesToday || 'No classes today', icon: Building, color: 'text-blue-500', bgColor: 'bg-blue-50/50', timeRange: classesWidget.timeRange },
          { key: 'attendance', isVisible: attendanceWidget.isVisible, label: attendanceWidget.title, value: `${stats?.todayClassStudentsPresent ?? 0} / ${stats?.totalStudents ?? 0}`, sub: `${classAttendancePct}% Present Rate Today (${stats?.todayClassStudentsAbsent ?? 0} Absent)`, icon: Users, color: 'text-emerald-500', bgColor: 'bg-emerald-50/50', timeRange: attendanceWidget.timeRange },
          { key: 'reviews', isVisible: reviewsWidget.isVisible, label: reviewsWidget.title, value: stats?.pendingReviews ?? '0', sub: 'Requires submission', icon: ClipboardList, color: 'text-amber-500', bgColor: 'bg-amber-50/50', timeRange: reviewsWidget.timeRange },
          { key: 'salary', isVisible: salaryWidget.isVisible, label: salaryWidget.title, value: stats?.salary ? `Rs. ${stats.salary.toLocaleString()}` : 'Rs. 55,000', sub: 'Direct deposit', icon: DollarSign, color: 'text-violet-500', bgColor: 'bg-violet-50/50', timeRange: salaryWidget.timeRange },
        ].filter(s => s.isVisible).map(s => (
          <div key={s.key} className="stat-card flex items-center justify-between p-5 hover:shadow-md transition-all">
            <div className="space-y-1">
              <div className="font-display text-xl font-bold text-primary">{s.value}</div>
              <div className="text-xs font-semibold text-gray-450">{s.label}</div>
              <div className="text-2xs font-semibold text-blue-500 flex items-center gap-1.5">
                <span>{s.sub}</span>
                <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-500">{s.timeRange}</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bgColor}`}>
              <s.icon className={`w-6 h-6 ${s.color} stroke-[1.75]`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Class Attendance & Enrollment Trend */}
        <div className="card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-display font-semibold text-primary text-sm m-0">
                {teacherChartMode === 'attendance' ? '7-Day Class Attendance Trend' : 'Student Enrollment by Class'}
              </h3>
              <p className="text-2xs text-gray-400">
                {teacherChartMode === 'attendance' ? 'Daily present/absent counts in assigned classes' : 'Class roster size distributions'}
              </p>
            </div>
            <select
              value={teacherChartMode}
              onChange={e => setTeacherChartMode(e.target.value)}
              className="border border-gray-200 text-xs px-2 py-1 rounded-lg text-gray-600 outline-none bg-white cursor-pointer"
            >
              <option value="attendance">🗓️ 7-Day Class Attendance</option>
              <option value="enrollment">📊 Class Roster Sizes</option>
            </select>
          </div>
          <div className="h-64 w-full">
            {teacherChartMode === 'attendance' ? (
              stats?.weeklyClassAttendanceTrend && stats.weeklyClassAttendanceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.weeklyClassAttendanceTrend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="teacherPresentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="teacherAbsentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTeacherTooltip isSalary={false} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} transitionDuration={180} />
                    <Area type="monotone" name="Present Students" dataKey="present" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#teacherPresentGrad)" dot={{ fill: '#10b981', stroke: '#fff', strokeWidth: 1.5, r: 4 }} activeDot={{ fill: '#10b981', stroke: '#fff', strokeWidth: 2, r: 6 }} />
                    <Area type="monotone" name="Absent Students" dataKey="absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#teacherAbsentGrad)" dot={{ fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5, r: 3 }} activeDot={{ fill: '#ef4444', stroke: '#fff', strokeWidth: 2, r: 5 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">No attendance trend logged.</div>
              )
            ) : (
              stats?.classEnrollments && stats.classEnrollments.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.classEnrollments} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="teacherClassSizeGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.55}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="className" stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTeacherTooltip isSalary={false} />} cursor={{ fill: '#f8fafc', opacity: 0.55 }} transitionDuration={180} />
                    <Bar 
                      dataKey="count" 
                      name="Enrolled Students" 
                      fill="url(#teacherClassSizeGrad)" 
                      radius={[4, 4, 0, 0]} 
                      barSize={28} 
                      activeBar={{ filter: 'brightness(1.08)', stroke: '#fff', strokeWidth: 1.5 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs">No class rosters assigned.</div>
              )
            )}
          </div>
        </div>

        {/* Graph 2: Salary Payout Breakdown */}
        <div className="card flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-primary text-sm m-0">Monthly Salary History</h3>
            <p className="text-2xs text-gray-400">Salary trends and historical payouts</p>
          </div>
          <div className="h-64 w-full">
            {stats?.salaryHistory ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.salaryHistory} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="netSalaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.24}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="baseSalaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.16}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTeacherTooltip isSalary={true} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} transitionDuration={180} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="net" name="Net Payout" stroke="#10b981" strokeWidth={2.5} fill="url(#netSalaryGrad)" dot={{ fill: '#10b981', stroke: '#fff', strokeWidth: 1.5, r: 3 }} activeDot={{ fill: '#10b981', stroke: '#fff', strokeWidth: 2, r: 5 }} />
                  <Area type="monotone" dataKey="baseSalary" name="Base Salary" stroke="#3b82f6" strokeWidth={1.5} fill="url(#baseSalaryGrad)" dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5, r: 3 }} activeDot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No salary records loaded.</div>
            )}
          </div>
        </div>
      </div>

      {/* Today's / Weekly Schedule Timeline */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-4">
          <h3 className="font-display font-bold text-primary text-sm flex items-center gap-1.5 m-0">
            🗓️ Assigned Timetable Schedule
          </h3>
          <div className="flex gap-1 bg-slate-100/60 p-1 rounded-xl w-fit border border-slate-200/30">
            <button
              onClick={() => setScheduleView('today')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg select-none active:scale-95 transition-all duration-250 cursor-pointer ${
                scheduleView === 'today'
                  ? 'bg-white text-primary shadow-2xs font-bold border border-slate-200/40'
                  : 'text-slate-500 hover:text-primary hover:bg-white/30 bg-transparent border border-transparent'
              }`}
            >
              Today's Schedule
            </button>
            <button
              onClick={() => setScheduleView('weekly')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg select-none active:scale-95 transition-all duration-250 cursor-pointer ${
                scheduleView === 'weekly'
                  ? 'bg-white text-primary shadow-2xs font-bold border border-slate-200/40'
                  : 'text-slate-500 hover:text-primary hover:bg-white/30 bg-transparent border border-transparent'
              }`}
            >
              Weekly Timetable
            </button>
          </div>
        </div>

        {scheduleView === 'today' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th text-left">Day of Week</th>
                  <th className="table-th text-center">Period</th>
                  <th className="table-th text-center">Class Room</th>
                  <th className="table-th text-left">Subject</th>
                  <th className="table-th text-left">Status / Remark</th>
                </tr>
              </thead>
              <tbody>
                {todaySchedule.length > 0 ? (
                  todaySchedule.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="table-td font-semibold text-sm text-primary">{item.dayOfWeek}</td>
                      <td className="table-td text-center text-sm font-medium">Period {item.periodNumber}</td>
                      <td className="table-td text-center text-sm text-gray-600">{item.className}</td>
                      <td className="table-td text-center text-sm font-semibold text-blue-600">{item.subjectName}</td>
                      <td className="table-td text-center">
                        {item.isRescheduled ? (
                          <span
                            title={item.remark}
                            className="badge badge-danger text-2xs font-semibold cursor-help"
                          >
                            {item.remark && item.remark.length > 30 ? item.remark.slice(0, 30) + '...' : item.remark}
                          </span>
                        ) : (
                          <span
                            title={item.remark || 'Regular Class'}
                            className="text-xs text-gray-400 cursor-help"
                          >
                            {item.remark ? (item.remark.length > 30 ? item.remark.slice(0, 30) + '...' : item.remark) : 'Regular Class'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-400 text-sm font-medium">
                      {isWeekend ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-2xl">🎉</span>
                          <span className="text-gray-500 font-semibold">It's the weekend!</span>
                          <span className="text-xs text-gray-400 font-normal">No classes scheduled for today.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span className="text-2xl">☕</span>
                          <span className="text-gray-500 font-semibold">No classes scheduled today</span>
                          <span className="text-xs text-gray-400 font-normal">You have a free day today!</span>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-6">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
              const dayItems = (stats?.schedule || []).filter(
                item => item.dayOfWeek.toLowerCase() === day.toLowerCase()
              );
              return (
                <div key={day} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <h4 className="font-display font-bold text-primary text-xs uppercase tracking-wider mb-3 flex items-center justify-between select-none">
                    <span>{day}</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded-lg normal-case">
                      {dayItems.length} {dayItems.length === 1 ? 'class' : 'classes'}
                    </span>
                  </h4>
                  {dayItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dayItems.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-3.5 bg-white border border-slate-100 hover:border-blue-200/80 rounded-xl flex items-center justify-between hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer shadow-3xs group"
                        >
                          <div className="space-y-0.5">
                            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider group-hover:text-blue-700 transition-colors">
                              Period {item.periodNumber}
                            </div>
                            <div className="text-xs font-bold text-slate-800 group-hover:text-primary transition-colors">
                              {item.subjectName}
                            </div>
                            <div className="text-[10px] font-medium text-slate-400 mt-0.5">
                              🚪 Room: {item.className}
                            </div>
                          </div>
                          <div className="shrink-0">
                            {item.isRescheduled ? (
                              <span
                                className="badge badge-danger text-[9px] py-0.5 font-bold uppercase tracking-wider cursor-help"
                                title={item.remark}
                              >
                                {item.remark && item.remark.length > 15 ? item.remark.slice(0, 15) + '...' : item.remark || 'Rescheduled'}
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/55 px-2.5 py-0.5 rounded-lg uppercase tracking-wider">
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-2xs text-gray-400 italic py-1 pl-1">No classes scheduled.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Dedicated Teacher Classes ---
export const TeacherClasses = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  const [remarkText, setRemarkText] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const loadTeacherClasses = async () => {
    try {
      const res = await apiClient.get('/academics/teacher/classes');
      setClasses(res.data);
      if (res.data.length > 0) {
        setSelectedClass(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadTimetable = async () => {
    if (!selectedClass) return;
    try {
      const res = await apiClient.get(`/academics/timetable/schedule/${selectedClass.id}`);
      setSchedule(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadTeacherClasses();
  }, []);

  useEffect(() => {
    loadTimetable();
  }, [selectedClass]);

  const handleSaveRemark = async (e) => {
    e.preventDefault();
    if (!activeItem || !remarkText.trim()) return;
    try {
      const isCancelled = activeItem.isRescheduled && activeItem.remark?.startsWith('Cancelled');
      const finalRemark = isCancelled
        ? (remarkText.startsWith('Cancelled:') ? remarkText : `Cancelled: ${remarkText}`)
        : remarkText;

      await apiClient.post(`/academics/timetable/remark/${activeItem.id}`, { remark: finalRemark });
      setShowRemarkModal(false);
      setRemarkText('');
      loadTimetable();
    } catch (err) {
      console.error(err);
      alert('Failed to save remark.');
    }
  };

  const handleCancelClass = async (e) => {
    e.preventDefault();
    if (!activeItem || !cancelReason) return;
    try {
      await apiClient.post(`/academics/timetable/cancel/${activeItem.id}`, { reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
      loadTimetable();
    } catch (err) {
      console.error(err);
      alert('Failed to cancel class.');
    }
  };

  const handleRestoreClass = async (item) => {
    if (!item) return;
    try {
      await apiClient.post(`/academics/timetable/restore/${item.id}`);
      loadTimetable();
    } catch (err) {
      console.error(err);
      alert('Failed to restore class.');
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [1, 2, 3, 4, 5];

  if (loading) {
    return <Loader message="Accessing class schedules & mappings" />;
  }

  return (
    <div>
      <Topbar title="My Assigned Classes" subtitle="Manage schedules, remarks, and cancellations" />
      <div className="grid grid-cols-4 gap-6">
          {/* Class List Selector */}
          <div className="space-y-3">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-2">Class Sections Taught</h3>
            {classes.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c)}
                className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-102 ${selectedClass?.id === c.id ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-100 hover:bg-gray-50'}`}
              >
                <div className="font-bold text-sm text-primary">Class {c.grade} - {c.section}</div>
                <div className="text-xs text-gray-400 mt-1">Room {c.room} · {c.enrolled} Students</div>
                {c.isClassTeacher && <span className="inline-block mt-2 px-2 py-0.5 rounded bg-green-100 text-green-800 text-2xs font-extrabold">🏫 Advisory Class</span>}
              </button>
            ))}
          </div>

          {/* Timetable Grid Schedule */}
          <div className="col-span-3 card">
            <h3 className="font-display font-semibold text-primary text-base mb-4">
              📅 Timetable Schedule: Class {selectedClass?.grade} - {selectedClass?.section}
            </h3>

            <div className="overflow-x-auto">
              <div className="min-w-[700px] md:min-w-0">
                <div className="grid grid-cols-6 gap-2 mb-2 text-center text-xs font-bold text-gray-400">
                  <div className="py-2 border border-transparent">Time</div>
                  {days.map(d => <div key={d} className="py-2 border border-transparent">{d}</div>)}
                </div>

                {periods.map(period => (
                  <div key={period} className="grid grid-cols-6 gap-2 mb-2 text-center">
                    <div className="flex flex-col items-center justify-center p-2 bg-gray-50 border border-gray-100 rounded-lg text-2xs font-bold text-gray-500">
                      <span>Period {period}</span>
                    </div>

                    {days.map(day => {
                      const cell = schedule.find(s => s.periodNumber === period && s.dayOfWeek === day);
                      const isCancelled = cell?.isRescheduled && cell?.remark?.startsWith('Cancelled');
                      return (
                        <div
                          key={day}
                          className={`p-3 border rounded-xl flex flex-col justify-between min-h-[90px] text-left relative ${isCancelled
                              ? 'border-red-200 bg-red-50/50'
                              : cell
                                ? 'border-blue-200 bg-blue-50/30'
                                : 'border-dashed border-gray-200 bg-gray-50/20'
                            }`}
                        >
                          {cell ? (
                            <>
                              <div>
                                <div className="text-xs font-bold text-primary leading-tight">{cell.subjectName}</div>
                                <div className="text-[10px] text-gray-400 mt-0.5">{cell.teacherName}</div>
                                {cell.remark && (
                                  <div
                                    title={cell.remark}
                                    className={`text-[10px] leading-snug font-medium mt-1.5 p-1 px-2 rounded-md border cursor-help transition-all ${isCancelled
                                        ? 'text-red-700 bg-red-50 border-red-100'
                                        : 'text-blue-700 bg-blue-50 border-blue-100'
                                      }`}
                                  >
                                    💬 {cell.remark.length > 30 ? cell.remark.slice(0, 30) + '...' : cell.remark}
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2 mt-3 border-t border-gray-100 pt-2 no-print">
                                <button
                                  onClick={() => {
                                    setActiveItem(cell);
                                    const isCancelledClass = cell.isRescheduled && cell.remark?.startsWith('Cancelled');
                                    setRemarkText(isCancelledClass ? cell.remark.replace(/^Cancelled:\s*/, '') : cell.remark || '');
                                    setShowRemarkModal(true);
                                  }}
                                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                >
                                  Remark
                                </button>
                                {isCancelled ? (
                                  <button
                                    onClick={() => handleRestoreClass(cell)}
                                    className="text-[11px] font-semibold text-green-600 hover:text-green-800 hover:underline transition-colors ml-auto"
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { setActiveItem(cell); setCancelReason(''); setShowCancelModal(true); }}
                                    className="text-[11px] font-semibold text-red-500 hover:text-red-700 hover:underline transition-colors ml-auto"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-2xs text-gray-300 font-medium italic m-auto">Free Period</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      {/* Remark Modal */}
      {showRemarkModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveRemark} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-display font-bold text-primary text-base mb-3">Add Schedule Remark</h3>
            <textarea
              required
              value={remarkText}
              onChange={e => setRemarkText(e.target.value)}
              placeholder="e.g. Read Chapter 4 / Homework discussion..."
              className="input h-24 resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowRemarkModal(false)} className="btn-outline text-xs">Cancel</button>
              <button type="submit" className="btn-primary text-xs">Save Remark</button>
            </div>
          </form>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCancelClass} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-display font-bold text-primary text-base mb-2">Cancel Timetable Class</h3>
            <p className="text-xs text-gray-400 mb-3">State the cancellation reason which will be visible to students.</p>
            <input
              required
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Teacher Medical Leave / Holiday"
              className="input mb-4"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowCancelModal(false)} className="btn-outline text-xs">Cancel</button>
              <button type="submit" className="btn-primary text-xs bg-red-600 hover:bg-red-700">Cancel Class</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const DateFilterInput = ({ label, value, onChange, className = '', style = {} }) => {
  const [focused, setFocused] = useState(false);
  const formatDisplay = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
  };
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {label && <span className="text-xs font-semibold whitespace-nowrap">{label}</span>}
      <input
        type={focused ? 'date' : 'text'}
        value={focused ? value : formatDisplay(value)}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="dd/mm/yyyy"
        className={className}
        style={style}
      />
    </div>
  );
};

// --- Dedicated Teacher Taught Students ---
export const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('roster'); // 'roster', 'contacts'

  const [showViewModal, setShowViewModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [viewStudent, setViewStudent] = useState(null);

  const [remarkText, setRemarkText] = useState('');
  const [tag, setTag] = useState('NEUTRAL');
  const [savingRemark, setSavingRemark] = useState(false);

  const fetchRoster = async () => {
    try {
      const clsRes = await apiClient.get('/academics/teacher/classes');
      setClasses(clsRes.data);

      const studRes = await apiClient.get('/academics/students');

      // Filter roster to show students matching classes taught by the teacher
      const taughtClassIds = clsRes.data.map(c => c.id);
      const taughtStudents = studRes.data.filter(s => taughtClassIds.includes(s.classId));
      setStudents(taughtStudents);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  const handleSaveRemark = async (e) => {
    e.preventDefault();
    if (!viewStudent || !remarkText) return;
    setSavingRemark(true);
    try {
      await expressClient.post('/remarks', {
        studentId: viewStudent.id,
        studentName: viewStudent.name,
        classInfo: `${viewStudent.class} - ${viewStudent.section}`,
        remarkText,
        tag
      });
      setShowRemarkModal(false);
      setRemarkText('');
      alert('Feedback remark saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to log remark.');
    } finally {
      setSavingRemark(false);
    }
  };

  const filtered = students.filter(s => {
    const nameStr = s.name || '';
    const fatherStr = s.father || '';
    const matchesSearch = !search || 
      nameStr.toLowerCase().includes(search.toLowerCase()) ||
      fatherStr.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !selectedClass || s.classId === selectedClass;
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(s.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(s.createdAt) > to) return false;
    }
    
    return matchesSearch && matchesClass;
  });

  return (
    <div>
      <Topbar 
        title={activeTab === 'roster' ? "Students Roster" : "Parent Contact Directory"} 
        subtitle={activeTab === 'roster' ? "Directory of students enrolled in your class sections" : "Parent contact numbers and details for students in your classes"} 
      />

      {/* Tabs */}
      <div className="flex border-b border-gray-100 mb-6 gap-4">
        {[
          { id: 'roster', label: 'Students Roster', icon: '👨‍🎓' },
          { id: 'contacts', label: 'Parent Contacts', icon: '📞' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'border-primary text-primary font-black'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <input 
              placeholder={activeTab === 'roster' ? "Search students by name..." : "Search parents by student or guardian name..."} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="input pl-9 text-sm" 
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '130px' }} />
            <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '130px' }} />
            {(dateFrom || dateTo || search || selectedClass) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setSelectedClass(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
            )}
          </div>

          <select className="input w-48 text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">All My Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>Class {c.grade} - {c.section}</option>
            ))}
          </select>
        </div>

        {activeTab === 'roster' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th text-left min-w-[150px]">Student Name</th>
                  <th className="table-th min-w-[120px]">Student ID</th>
                  <th className="table-th min-w-[80px]">Class</th>
                  <th className="table-th min-w-[80px]">Section</th>
                  <th className="table-th min-w-[120px]">Father's Name</th>
                  <th className="table-th min-w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {s.name ? s.name[0] : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-primary text-sm">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-xs font-mono text-gray-500">{s.studentId}</td>
                    <td className="table-td text-sm">{s.class}</td>
                    <td className="table-td text-sm">{s.section}</td>
                    <td className="table-td text-sm">{s.father}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setViewStudent(s); setShowViewModal(true); }}
                          className="px-2.5 py-1 text-2xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded hover:bg-indigo-100 transition-all"
                        >
                          👤 Details
                        </button>
                        <button
                          onClick={() => { setViewStudent(s); setTag('NEUTRAL'); setRemarkText(''); setShowRemarkModal(true); }}
                          className="px-2.5 py-1 text-2xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-all"
                        >
                          💬 Add Remark
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No students matched.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th text-left min-w-[150px]">Student Info</th>
                  <th className="table-th min-w-[80px]">Class</th>
                  <th className="table-th min-w-[80px]">Section</th>
                  <th className="table-th min-w-[150px]">Parent/Guardian Name</th>
                  <th className="table-th min-w-[120px]">Guardian Contact No.</th>
                  <th className="table-th min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {s.name ? s.name[0] : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-primary text-sm">{s.name}</div>
                          <div className="text-xs text-gray-400">ID: {s.studentId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-sm">{s.class}</td>
                    <td className="table-td text-sm">{s.section}</td>
                    <td className="table-td font-semibold text-gray-700 text-sm">{s.father || 'N/A'}</td>
                    <td className="table-td font-mono text-sm text-gray-600">{s.guardianPhone || 'N/A'}</td>
                    <td className="table-td">
                      {s.guardianPhone ? (
                        <a
                          href={`tel:${s.guardianPhone}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-2xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all"
                        >
                          📞 Call Parent
                        </a>
                      ) : (
                        <span className="text-2xs text-gray-400">No Phone</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No parent contact details found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {showViewModal && viewStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden text-sm">
            <div className="bg-primary p-5 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-base">{viewStudent.name}</h4>
                <p className="text-blue-200 text-2xs">Student ID: {viewStudent.studentId}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-white hover:text-blue-100 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-400 uppercase font-semibold">Class section</span>
                <span className="font-bold text-primary">{viewStudent.class} - {viewStudent.section}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-400 uppercase font-semibold">Email address</span>
                <span className="font-medium text-gray-600">{viewStudent.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-xs text-gray-400 uppercase font-semibold">Guardian name</span>
                <span className="font-medium text-gray-700">{viewStudent.father}</span>
              </div>
              {viewStudent.guardianPhone && (
                <div className="flex justify-between py-1.5 border-b border-gray-50">
                  <span className="text-xs text-gray-400 uppercase font-semibold">Guardian phone</span>
                  <a href={`tel:${viewStudent.guardianPhone}`} className="font-medium text-blue-600 hover:underline">📞 {viewStudent.guardianPhone}</a>
                </div>
              )}
            </div>
            <div className="flex justify-end p-5 bg-gray-50 border-t border-gray-100">
              <button onClick={() => setShowViewModal(false)} className="btn-primary text-xs py-1.5 px-4">Close Roster</button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Remark Modal */}
      {showRemarkModal && viewStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveRemark} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-display font-bold text-primary text-lg">Add Feedback for {viewStudent.name}</h3>
              <button type="button" onClick={() => setShowRemarkModal(false)} className="text-gray-400 hover:text-primary">✖</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Feedback Tone Tag</label>
                <div className="grid grid-cols-3 gap-2">
                  {['POSITIVE', 'NEGATIVE', 'URGENT'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTag(t)}
                      className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${tag === t
                          ? t === 'POSITIVE'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : t === 'NEGATIVE'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-200 text-gray-400'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Remarks / Feedback Text *</label>
                <textarea
                  required
                  value={remarkText}
                  onChange={e => setRemarkText(e.target.value)}
                  placeholder="Enter positive or constructive remarks..."
                  className="input h-28 resize-none text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button type="button" onClick={() => setShowRemarkModal(false)} className="btn-outline text-xs">Cancel</button>
              <button type="submit" disabled={savingRemark} className="btn-primary text-xs">
                {savingRemark ? 'Saving feedback...' : 'Save Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Attendance Page ---
export const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // default to today (empty caused a 400 on first load)
  const [students, setStudents] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load teacher's own classes for the dropdown
  const fetchClasses = async () => {
    try {
      const res = await apiClient.get('/academics/teacher/classes');
      setClasses(res.data);
      // Auto-select the class where teacher is class teacher
      const classTeacherClass = res.data.find(c => c.isClassTeacher);
      if (classTeacherClass) {
        setSelectedClassId(classTeacherClass.id);
      } else if (res.data.length > 0) {
        setSelectedClassId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Load attendance when class or date changes
  const loadAttendance = async () => {
    if (!selectedClassId) return;
    setLoading(true);
    try {
      // This endpoint now returns full student info + attendance status
      const res = await apiClient.get(`/academics/attendance/class/${selectedClassId}?date=${selectedDate}`);
      const records = res.data;

      // Map API records directly to student state (names come from API)
      const mapped = records.map(r => {
        let lateMins = '';
        let cleanRemark;
        if (r.status === 'Late' && r.remarks) {
          const match = r.remarks.match(/^Late by (\d+) mins\.?\s*(.*)/);
          if (match) { lateMins = match[1]; cleanRemark = match[2]; }
          else { cleanRemark = r.remarks; }
        } else {
          cleanRemark = r.remarks || '';
        }
        return {
          id: r.studentId,
          name: r.name,
          studentId: r.rollNumber,
          status: r.status || 'Present',
          lateMinutes: lateMins,
          remark: cleanRemark
        };
      });

      setStudents(mapped);
      const isSaved = records.length > 0 && records.every(r => r.status !== null && r.status !== undefined && r.status !== '');
      setAttendanceSaved(isSaved);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setAttendanceSaved(false);
    setIsEditing(false);
    loadAttendance();
  }, [selectedClassId, selectedDate]);

  const setStatus = (id, status) => {
    setStudents(s => s.map(st => st.id === id ? { ...st, status, lateMinutes: status === 'Late' ? (st.lateMinutes || '5') : '' } : st));
  };

  const setLateMinutes = (id, lateMinutes) => {
    setStudents(s => s.map(st => st.id === id ? { ...st, lateMinutes } : st));
  };

  const setRemark = (id, remark) => {
    setStudents(s => s.map(st => st.id === id ? { ...st, remark } : st));
  };

  const markAll = (status) => {
    setStudents(s => s.map(st => ({ ...st, status, lateMinutes: status === 'Late' ? (st.lateMinutes || '5') : '' })));
  };

  const handleSubmit = async () => {
    if (!selectedClassId || students.length === 0) return;
    setSubmitting(true);
    try {
      const payload = {
        classId: selectedClassId,
        date: selectedDate,
        students: students.map(s => {
          let dbRemarks = s.remark || '';
          if (s.status === 'Late') {
            dbRemarks = `Late by ${s.lateMinutes || 0} mins. ${s.remark || ''}`.trim();
          }
          return { studentId: s.id, status: s.status, remarks: dbRemarks };
        })
      };
      await apiClient.post('/academics/attendance/submit', payload);
      setSubmitted(true);
      setAttendanceSaved(true);
      setIsEditing(false);
      setTimeout(() => setSubmitted(false), 4000);
      loadAttendance();
    } catch (err) {
      console.error(err);
      alert('Failed to submit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAttendance = () => {
    setAttendanceSaved(false);
    setIsEditing(true);
  };

  const presentCount = students.filter(s => s.status === 'Present').length;
  const lateCount = students.filter(s => s.status === 'Late').length;
  const absentCount = students.filter(s => s.status === 'Absent').length;
  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div>
      <Topbar title="Mark Attendance" subtitle="Select a class and date to mark daily attendance" />

      {submitted && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700 flex items-center gap-2">
          ✅ Attendance saved successfully for {selectedClass ? `Class ${selectedClass.grade} - ${selectedClass.section}` : 'this class'}!
        </div>
      )}

      {/* Filters */}
      <div className="card mb-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Class Section</label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="input text-sm"
            >
              <option value="">— Select a Class —</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>Class {c.grade} - {c.section} ({c.room})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
            <input
              type="date"
              min={getTodayStr()}
              value={selectedDate}
              onChange={e => {
                const val = e.target.value;
                if (val && val < getTodayStr()) {
                  alert("Past dates (aaj se pehle ki dates) select nahi ki ja sakti hain.");
                  setSelectedDate(getTodayStr());
                } else {
                  setSelectedDate(val);
                }
              }}
              className="input text-sm"
            />
          </div>
          {students.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <button
                disabled={attendanceSaved && !isEditing}
                onClick={() => markAll('Present')}
                className={`px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all ${attendanceSaved && !isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ✓ All Present
              </button>
              <button
                disabled={attendanceSaved && !isEditing}
                onClick={() => markAll('Absent')}
                className={`px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all ${attendanceSaved && !isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                ✗ All Absent
              </button>
            </div>
          )}
        </div>

        {/* Summary bar */}
        {students.length > 0 && (
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
              {presentCount} Present
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              {lateCount} Late
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              {absentCount} Absent
            </div>
            <span className="ml-auto text-xs text-gray-400">{students.length} students total</span>
          </div>
        )}
      </div>

      {/* Student List */}
      {!selectedClassId ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="text-sm font-medium">Select a class above to start marking attendance</div>
        </div>
      ) : loading ? (
        <div className="card text-center py-16 text-gray-400 text-sm">
          <div className="animate-spin text-2xl mb-3">⏳</div>
          Loading student roster...
        </div>
      ) : students.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">👤</div>
          <div className="text-sm">No students enrolled in this class section.</div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {students.map((s, idx) => (
              <div
                key={s.id}
                className={`bg-white rounded-xl border shadow-sm px-5 py-4 flex flex-wrap items-center gap-4 transition-all ${s.status === 'Absent' ? 'border-red-100 bg-red-50/30'
                    : s.status === 'Late' ? 'border-amber-100 bg-amber-50/30'
                      : 'border-gray-100'
                  } ${attendanceSaved && !isEditing ? 'opacity-80' : ''}`}
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${s.status === 'Absent' ? 'bg-red-100 text-red-600'
                      : s.status === 'Late' ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                    {s.name ? s.name[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-primary">{s.name}</div>
                    <div className="text-xs text-gray-400">{s.studentId || 'ID N/A'}</div>
                  </div>
                </div>

                {/* Status Buttons */}
                <div className="flex gap-2">
                  {[
                    { key: 'Present', activeClass: 'bg-green-500 text-white border-green-500', inactiveClass: 'bg-white text-gray-400 border-gray-200 hover:border-green-300 hover:text-green-600' },
                    { key: 'Late', activeClass: 'bg-amber-500 text-white border-amber-500', inactiveClass: 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600' },
                    { key: 'Absent', activeClass: 'bg-red-500 text-white border-red-500', inactiveClass: 'bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-500' },
                  ].map(({ key, activeClass, inactiveClass }) => (
                    <button
                      key={key}
                      type="button"
                      disabled={attendanceSaved && !isEditing}
                      onClick={() => setStatus(s.id, key)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all min-w-[72px] ${s.status === key ? activeClass : inactiveClass
                        } ${attendanceSaved && !isEditing ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      {key}
                    </button>
                  ))}
                </div>

                {/* Late Minutes (only shown when Late) */}
                {s.status === 'Late' && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-amber-700 font-semibold whitespace-nowrap">Mins late:</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      disabled={attendanceSaved && !isEditing}
                      value={s.lateMinutes || ''}
                      onChange={e => setLateMinutes(s.id, e.target.value)}
                      placeholder="e.g. 10"
                      className="w-20 border border-amber-200 bg-amber-50 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Remark */}
                <div className="flex-1 min-w-[160px]">
                  <input
                    disabled={attendanceSaved && !isEditing}
                    value={s.remark || ''}
                    onChange={e => setRemark(s.id, e.target.value)}
                    placeholder="Remark (optional)"
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary/30 bg-gray-50 placeholder-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Submit / Edit / Update */}
          <div className="flex justify-end gap-3 mt-5">
            {attendanceSaved && !isEditing ? (
              <button
                onClick={handleEditAttendance}
                className="px-8 py-3 rounded-xl font-bold text-sm border-2 border-primary text-primary bg-white hover:bg-primary/5 transition-all flex items-center gap-2"
              >
                ✏️ Edit Attendance
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary text-sm px-8 py-3 rounded-xl font-bold"
              >
                {submitting ? '⏳ Saving...' : isEditing ? '🔄 Update Attendance' : '✔ Save Attendance'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};


// --- Student Marks Entry ---
export const MarksEntry = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState(true);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('Semester Examination');

  // States for marks entry popup
  const [showMarksPopup, setShowMarksPopup] = useState(false);
  const [popupForm, setPopupForm] = useState({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
  const [globalSubjects, setGlobalSubjects] = useState([]);
  const [studentClassSubjects, setStudentClassSubjects] = useState([]);

  const fetchRosterData = async () => {
    try {
      const classesRes = await apiClient.get('/academics/teacher/classes');
      const classesData = Array.isArray(classesRes.data) ? classesRes.data : [];
      setTeacherClasses(classesData);
      const classTeacherClasses = classesData.filter(c => c.isClassTeacher || c.IsClassTeacher);
      setIsClassTeacher(classTeacherClasses.length > 0);

      const classTeacherClassIds = classTeacherClasses.map(c => c.id);

      const res = await apiClient.get('/academics/students');
      const studentsData = Array.isArray(res.data) ? res.data : [];
      const filteredStudents = studentsData.filter(s => classTeacherClassIds.includes(s.classId));

      setStudents(filteredStudents);
      if (filteredStudents.length > 0) {
        setSelectedStudentId(filteredStudents[0].id);
      } else {
        setSelectedStudentId('');
      }

      // Fetch global subjects as fallback
      const subRes = await apiClient.get('/academics/subjects');
      setGlobalSubjects(Array.isArray(subRes.data) ? subRes.data : []);

      const etRes = await apiClient.get('/academics/exam-types');
      setExamTypes(etRes.data || []);
      if (etRes.data && etRes.data.length > 0) {
        setSelectedExamType(etRes.data[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, []);

  const loadStudentGrades = async () => {
    if (!selectedStudentId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/exams/student/${selectedStudentId}/subjects?examType=${selectedExamType}`);
      setSubjectsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentGrades();
  }, [selectedStudentId, selectedExamType]);

  useEffect(() => {
    const fetchStudentClassSubjects = async () => {
      if (!selectedStudentId || students.length === 0) {
        setStudentClassSubjects([]);
        return;
      }
      const student = students.find(s => s.id === selectedStudentId);
      if (!student || !student.classId) {
        setStudentClassSubjects([]);
        return;
      }
      try {
        const res = await apiClient.get(`/academics/class-subjects/${student.classId}`);
        const mapped = res.data.map(cs => ({
          id: cs.subjectId,
          name: cs.subjectName,
          code: cs.subjectCode
        }));
        setStudentClassSubjects(mapped);
      } catch (err) {
        console.error('Error fetching student class subjects:', err);
      }
    };
    fetchStudentClassSubjects();
  }, [selectedStudentId, students]);

  const updateSubjectField = (subjId, field, val) => {
    setSubjectsList(prev => prev.map(s => s.subjectId === subjId ? { ...s, [field]: val } : s));
  };

  const handleSaveMarks = async () => {
    if (!selectedStudentId) return;
    setSavingProgress(true);
    try {
      const payload = {
        studentId: selectedStudentId,
        examType: selectedExamType,
        subjects: subjectsList.map(s => ({
          subjectId: s.subjectId,
          theoryMarks: s.theoryMarks === '' || s.theoryMarks === null ? null : parseFloat(s.theoryMarks),
          practicalMarks: s.practicalMarks === '' || s.practicalMarks === null ? null : parseFloat(s.practicalMarks),
          remarks: s.remarks || ''
        }))
      };

      await apiClient.post('/exams/results/student-marks', payload);

      // Send notices via Express auxiliary service to Student & Admin
      const studentObj = students.find(s => s.id === selectedStudentId);
      const teacherUser = JSON.parse(localStorage.getItem('eduvault_user'));
      const teacherName = teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}` : 'Class Teacher';

      try {
        // Send notice to School Admin for review/approval
        await expressClient.post('/notifications', {
          recipientId: 'SCHOOLADMINS',
          title: '📋 Student Marks Submitted for Review',
          body: `Semester grades updated for student ${studentObj?.name || 'Student'} by teacher ${teacherName}. Pending administrative approval and release.`,
          type: 'GENERAL'
        });
      } catch (e) {
        console.error('Failed to send notifications through auxiliary service', e);
      }

      alert('Student theory and practical marks saved successfully! Submitted to admin for review.');
      loadStudentGrades();
    } catch (err) {
      console.error(err);
      alert('Failed to save progress marks.');
    } finally {
      setSavingProgress(false);
    }
  };

  const handlePopupSubjectChange = (subjectId) => {
    const existing = subjectsList.find(s => s.subjectId === subjectId);
    setPopupForm({
      subjectId,
      theoryMarks: existing && existing.theoryMarks !== null ? existing.theoryMarks.toString() : '',
      practicalMarks: existing && existing.practicalMarks !== null ? existing.practicalMarks.toString() : '',
      remarks: existing ? (existing.remarks || '') : ''
    });
  };

  const handleSavePopupMarks = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedStudentId || !popupForm.subjectId) return;

    setSubjectsList(prev => {
      const exists = prev.some(s => s.subjectId === popupForm.subjectId);
      if (exists) {
        return prev.map(s => s.subjectId === popupForm.subjectId ? {
          ...s,
          theoryMarks: popupForm.theoryMarks === '' ? null : parseFloat(popupForm.theoryMarks),
          practicalMarks: popupForm.practicalMarks === '' ? null : parseFloat(popupForm.practicalMarks),
          remarks: popupForm.remarks || ''
        } : s);
      } else {
        const gSub = studentClassSubjects.find(s => s.id === popupForm.subjectId) || globalSubjects.find(s => s.id === popupForm.subjectId);
        return [...prev, {
          subjectId: popupForm.subjectId,
          subjectName: gSub?.name || 'Unknown',
          subjectCode: gSub?.code || '',
          theoryMarks: popupForm.theoryMarks === '' ? null : parseFloat(popupForm.theoryMarks),
          practicalMarks: popupForm.practicalMarks === '' ? null : parseFloat(popupForm.practicalMarks),
          remarks: popupForm.remarks || ''
        }];
      }
    });

    setShowMarksPopup(false);
    setPopupForm({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const classForSelectedStudent = selectedStudent ? teacherClasses.find(c => c.id === selectedStudent.classId) : null;
  const publishedExamTypes = classForSelectedStudent?.publishedExamTypes || classForSelectedStudent?.PublishedExamTypes || '';
  const isApproved = selectedExamType 
    ? publishedExamTypes
        .split(',')
        .map(t => t.trim().toLowerCase())
        .includes(selectedExamType.toLowerCase())
    : false;

  if (!isClassTeacher) {
    return (
      <div>
        <Topbar title="Student Marks Entry" />
        <div className="card max-w-xl mx-auto mt-8 text-center p-8 border border-amber-100 bg-amber-50/20 rounded-2xl">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="font-display font-bold text-lg text-primary mb-2">Access Denied</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Marks entry is restricted to Class Teachers only. You are not currently assigned as a Class Teacher (Advisor) for any active class sections.
          </p>
          <div className="inline-block px-3 py-1.5 rounded-lg bg-amber-100/50 text-amber-800 text-xs font-semibold">
            Advisor Assignment Required
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Student Marks Entry" />
      
      {isApproved && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800 flex items-center gap-2 font-medium">
          ⚠️ Reports for this class have been approved and published by the administration. Editing is locked.
        </div>
      )}

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-gray-50 pb-4">
          <div className="flex flex-wrap items-center gap-4 flex-1">
            <div className="w-72">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Select Student from Class Roster</label>
              <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="input text-sm">
                <option value="">Choose student...</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.class} {s.section})</option>
                ))}
              </select>
            </div>
            <div className="w-72">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Select Examination Type</label>
              <select value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)} className="input text-sm">
                {examTypes.map(et => (
                  <option key={et.id} value={et.name}>{et.name}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedStudentId && !isApproved && (
            <button
              onClick={() => setShowMarksPopup(true)}
              className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 mt-5"
            >
              <span>+ Enter Subject Mark</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading assigned curriculum subjects...</div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th text-left min-w-[100px]">Subject Code</th>
                    <th className="table-th text-left min-w-[150px]">Subject Name</th>
                    <th className="table-th min-w-[120px]">Theory Marks (70)</th>
                    <th className="table-th min-w-[120px]">Practical Marks (30)</th>
                    <th className="table-th min-w-[80px]">Total (100)</th>
                    <th className="table-th min-w-[200px]">Subject Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsList.map((s, idx) => {
                    const theory = parseFloat(s.theoryMarks ?? 0);
                    const practical = parseFloat(s.practicalMarks ?? 0);
                    const total = s.theoryMarks !== null || s.practicalMarks !== null ? theory + practical : '-';
                    return (
                      <tr key={s.subjectId || idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td font-mono text-xs text-gray-400">{s.subjectCode}</td>
                        <td className="table-td font-semibold text-primary text-sm">{s.subjectName}</td>
                        <td className="table-td">
                          <input
                            type="number"
                            min="0"
                            max="70"
                            disabled={isApproved}
                            value={s.theoryMarks ?? ''}
                            onChange={e => updateSubjectField(s.subjectId, 'theoryMarks', e.target.value)}
                            placeholder="e.g. 55"
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center m-auto focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
                          />
                        </td>
                        <td className="table-td">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            disabled={isApproved}
                            value={s.practicalMarks ?? ''}
                            onChange={e => updateSubjectField(s.subjectId, 'practicalMarks', e.target.value)}
                            placeholder="e.g. 25"
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center m-auto focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
                          />
                        </td>
                        <td className="table-td text-center font-bold text-primary text-sm">{total}</td>
                        <td className="table-td">
                          <input
                            disabled={isApproved}
                            value={s.remarks || ''}
                            onChange={e => updateSubjectField(s.subjectId, 'remarks', e.target.value)}
                            placeholder="Feedback remark..."
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {subjectsList.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No subjects linked to this student's class.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {subjectsList.length > 0 && !isApproved && (
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                <button onClick={handleSaveMarks} disabled={savingProgress} className="btn-primary text-sm">
                  {savingProgress ? 'Saving Student Progress...' : '💾 Save Student Progress'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enter Subject Mark Popup Modal */}
      {showMarksPopup && selectedStudentId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">✏️ Enter Subject Mark</h3>
                <p className="text-blue-200 text-xxs">
                  Student: {students.find(s => s.id === selectedStudentId)?.name || 'Select student'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMarksPopup(false);
                  setPopupForm({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
                }}
                className="text-white hover:text-blue-200 text-lg"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSavePopupMarks} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Subject *</label>
                <select
                  required
                  value={popupForm.subjectId}
                  onChange={e => handlePopupSubjectChange(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">Choose Subject</option>
                  {studentClassSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code.toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Theory Marks (Max 70)</label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={popupForm.theoryMarks}
                    onChange={e => setPopupForm(p => ({ ...p, theoryMarks: e.target.value }))}
                    placeholder="e.g. 55"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Practical Marks (Max 30)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={popupForm.practicalMarks}
                    onChange={e => setPopupForm(p => ({ ...p, practicalMarks: e.target.value }))}
                    placeholder="e.g. 25"
                    className="input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject Remarks</label>
                <input
                  value={popupForm.remarks}
                  onChange={e => setPopupForm(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Feedback / remark..."
                  className="input text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMarksPopup(false);
                    setPopupForm({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProgress || !popupForm.subjectId}
                  className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl"
                >
                  {savingProgress ? 'Saving...' : '💾 Save Marks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Student Remarks Feed ---
export const Remarks = () => {
  const [remarksFeed, setRemarksFeed] = useState([]);
      const [students, setStudents] = useState([]);
      const [showNew, setShowNew] = useState(false);
      const [selectedStudent, setSelectedStudent] = useState('');
      const [remarkText, setRemarkText] = useState('');
      const [tag, setTag] = useState('NEUTRAL');
      const [loading, setLoading] = useState(false);

  const fetchFeed = async () => {
    try {
      const feedRes = await expressClient.get('/remarks');
      setRemarksFeed(feedRes.data);

      const studRes = await apiClient.get('/academics/students');
      setStudents(studRes.data);
      if (studRes.data.length > 0) {
        setSelectedStudent(studRes.data[0].id);
      }
    } catch (err) {
        console.error(err);
    }
  };

  useEffect(() => {
        fetchFeed();
  }, []);

  const handleSaveRemark = async (e) => {
        e.preventDefault();
      if (!selectedStudent || !remarkText) return;
      setLoading(true);
      try {
      const studentObj = students.find(s => s.id === selectedStudent);
      await expressClient.post('/remarks', {
        studentId: selectedStudent,
      studentName: studentObj?.name || 'Unknown',
      classInfo: `${studentObj?.class || 'Grade 10'} - ${studentObj?.section || 'Section A'}`,
      remarkText,
      tag
      });
      setShowNew(false);
      setRemarkText('');
      fetchFeed();
    } catch (err) {
        console.error('Error saving remark:', err);
    } finally {
        setLoading(false);
    }
  };

      return (
      <div>
        <Topbar title="Student Remarks Feed" />
        <div className="card mb-4">
          <div className="flex justify-between mb-4">
            <h3 className="font-display font-semibold text-primary">Academic Remarks Feed</h3>
            <button onClick={() => setShowNew(true)} className="btn-primary text-xs">+ Add Remark</button>
          </div>
          <div className="space-y-3">
            {remarksFeed.map((r, i) => (
              <div key={r._id || i} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm flex-shrink-0">
                    {r.studentName ? r.studentName[0] : '?'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <span className="font-semibold text-sm text-primary">{r.studentName}</span>
                        <span className="text-xs text-gray-400 ml-2">{r.classInfo}</span>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-600">{r.remarkText}</p>
                    <div className="mt-2">
                      <span className={`badge ${r.tag === 'URGENT' ? 'badge-danger' : r.tag === 'POSITIVE' ? 'badge-success' : r.tag === 'NEGATIVE' ? 'bg-red-100 text-red-800' : 'badge-gray'}`}>
                        ● {r.tag}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {remarksFeed.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">No remarks logged for this classroom.</div>
            )}
          </div>
        </div>

        {showNew && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleSaveRemark} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-display font-bold text-primary text-xl">Add New Remark</h3>
                <button type="button" onClick={() => setShowNew(false)} className="text-gray-400 hover:text-primary">✖</button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Student *</label>
                  <select required value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="input">
                    <option value="">Select student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.class})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Remark Type / Tag</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['POSITIVE', 'NEGATIVE', 'URGENT', 'NEUTRAL'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTag(t)}
                        className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${tag === t
                            ? t === 'POSITIVE'
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : t === 'NEGATIVE'
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : t === 'URGENT'
                                  ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                  : 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-200 text-gray-400'
                          }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Remark Text *</label><textarea required value={remarkText} onChange={e => setRemarkText(e.target.value)} placeholder="Write your remark here..." className="input h-28 resize-none text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-outline text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">
                  {loading ? 'Saving...' : 'Save Remark'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      );
};

// --- Homework Page ---
export const Homework = () => {
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [classSelector, setClassSelector] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [hwAttachment, setHwAttachment] = useState('');

  // Sub-Tab state ('homework' | 'syllabus')
  const [activeTab, setActiveTab] = useState('homework');

  // Syllabus State
  const [syllabi, setSyllabi] = useState([]);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [sTitle, setSTitle] = useState('');
  const [sSubject, setSSubject] = useState('Mathematics');
  const [sClass, setSClass] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [sFile, setSFile] = useState('');
  const [savingSyllabus, setSavingSyllabus] = useState(false);

  // Close dropdown when clicking outside — use capture phase so it fires before child handlers
  useEffect(() => {
    const handleClickOutside = (e) => {
      // Only close if the click is outside a dropdown toggle or menu
      if (!e.target.closest('[data-hw-menu]')) {
        setOpenMenuId(null);
      }
    };
      document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchHomeworksAndClasses = async () => {
    try {
      const [res, clsRes, sylRes] = await Promise.all([
        expressClient.get('/homework'),
        apiClient.get('/academics/classes'),
        expressClient.get('/syllabus').catch(() => ({ data: [] }))
      ]);
      setHomeworks(res.data);
      setClasses(clsRes.data);
      setSyllabi(sylRes.data);
      if (clsRes.data.length > 0) {
        setClassSelector(clsRes.data[0].id);
        setSClass(`Class ${clsRes.data[0].grade} - ${clsRes.data[0].section}`);
      }
    } catch (err) {
      console.error('Error fetching homeworks/syllabus:', err);
    }
  };

  useEffect(() => {
        fetchHomeworksAndClasses();
  }, []);

  const handleCreate = async (e) => {
        e.preventDefault();
      if (!title || !dueDate || !instructions || !classSelector) {
        setError('Please fill in all fields.');
      return;
    }
      setError('');
      setLoading(true);
      try {
      // Find class by ID for accurate enrolled count
      const matchedClassObj = classes.find(c => c.id === classSelector);
      const totalStudents = matchedClassObj ? (matchedClassObj.enrolled || 0) : 0;
      const formattedClassName = matchedClassObj
      ? `Class ${matchedClassObj.grade} - ${matchedClassObj.section}`
      : `Class ${classSelector}`;

      await expressClient.post('/homework', {
        title,
        className: formattedClassName,
        dueDate,
        instructions,
        attachmentUrl: hwAttachment,
        totalStudents
      });
      setShowNew(false);
      setTitle('');
      setInstructions('');
      setDueDate('');
      setHwAttachment('');
      fetchHomeworksAndClasses();
    } catch (err) {
        console.error(err);
      setError('Failed to create assignment.');
    } finally {
        setLoading(false);
    }
  };

  const handleSimulateSubmit = async (id) => {
        setOpenMenuId(null);
      try {
        await expressClient.put(`/homework/${id}/submit`);
      fetchHomeworksAndClasses();
    } catch (err) {
        console.error(err);
      alert('Failed to log submission.');
    }
  };

  const handleUpdateStatus = async (id, status) => {
        setOpenMenuId(null);
      try {
        await expressClient.put(`/homework/${id}/status`, { status });
      fetchHomeworksAndClasses();
    } catch (err) {
        console.error(err);
      alert('Failed to update homework status.');
    }
  };

  const handleSyncCount = async (id, className) => {
        setOpenMenuId(null);
      try {
      // Find the matching class by name to get current enrolled count
      const match = classes.find(c =>
      `Class ${c.grade} - ${c.section}` === className ||
      `Class ${c.grade}` === className ||
      `Class ${c.grade} ${c.section}` === className
      );
      const totalStudents = match ? (match.enrolled || 0) : 0;
      await expressClient.put(`/homework/${id}/sync-count`, {totalStudents});
      fetchHomeworksAndClasses();
    } catch (err) {
        console.error(err);
      alert('Failed to sync enrollment count.');
    }
  };

  const handleDeleteHomework = async (id) => {
        setOpenMenuId(null);
      if (window.confirm('Are you sure you want to delete this homework assignment?')) {
      try {
        await expressClient.delete(`/homework/${id}`);
      fetchHomeworksAndClasses();
      } catch (err) {
        console.error(err);
      alert('Failed to delete homework.');
      }
    }
  };

  const filteredHomeworks = homeworks.filter(h => {
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = (h.title || '').toLowerCase().includes(q);
      const classMatch = (h.className || '').toLowerCase().includes(q);
      if (!titleMatch && !classMatch) return false;
    }
    if (filterStatus && (h.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(h.dueDate || h.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(h.dueDate || h.createdAt) > to) return false;
    }
    return true;
  });

  const handleCreateSyllabus = async (e) => {
    e.preventDefault();
    if (!sTitle || !sClass || !sSubject || !sFile) {
      alert('Please fill title, select subject, class, and attach PDF/image file.');
      return;
    }
    setSavingSyllabus(true);
    try {
      await expressClient.post('/syllabus', {
        className: sClass,
        subject: sSubject,
        title: sTitle,
        fileUrl: sFile,
        description: sDescription
      });
      alert('🎉 Syllabus uploaded successfully!');
      setShowSyllabusModal(false);
      setSTitle('');
      setSDescription('');
      setSFile('');
      fetchHomeworksAndClasses();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload syllabus.');
    } finally {
      setSavingSyllabus(false);
    }
  };

  const handleDeleteSyllabus = async (id) => {
    if (window.confirm('Delete this syllabus document?')) {
      try {
        await expressClient.delete(`/syllabus/${id}`);
        fetchHomeworksAndClasses();
      } catch (err) {
        alert('Failed to delete syllabus.');
      }
    }
  };

  const activeCount = homeworks.filter(h => h.status === 'Active').length;
  const pendingCount = homeworks.filter(h => h.status === 'Pending Review').length;
  const completedCount = homeworks.filter(h => h.status === 'Completed').length;

  return (
    <div>
      <Topbar
        title="Homework & Curriculum Syllabus"
        subtitle="Faculty Portal › Academic Content"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSyllabusModal(true)}
              className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              📚 Upload Class Syllabus
            </button>
            <button
              onClick={() => { setError(''); setShowNew(true); }}
              className="btn-primary text-xs py-2 px-4"
            >
              + Create New Homework
            </button>
          </div>
        }
      />

      {/* Sub-Tabs Bar */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('homework')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'homework'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>📝</span>
          <span>Assigned Homework ({homeworks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('syllabus')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'syllabus'
              ? 'border-purple-600 text-purple-700 font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>📚</span>
          <span>Class Subject Syllabus ({syllabi.length})</span>
        </button>
      </div>
      {/* Homework View */}
      {activeTab === 'homework' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { l: 'Active Assignments', v: activeCount.toString(), sub: 'Current term', icon: '📋' },
              { l: 'Pending Review', v: pendingCount.toString(), sub: 'Needs attention', icon: '⚠️', warn: pendingCount > 0 },
              { l: 'Completed', v: completedCount.toString(), sub: 'Archived assignments', icon: '✅' }
            ].map(s => (
              <div key={s.l} className="stat-card flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <div>
                  <div className="font-display text-2xl font-bold text-primary">{s.v}</div>
                  <div className="text-xs text-gray-500">{s.l}</div>
                  <div className={`text-xs font-medium ${s.warn ? 'text-yellow-500' : 'text-blue-500'}`}>{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-gray-50 p-2.5 border border-gray-100 rounded-xl">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search homework..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl"
                  style={{ width: '160px' }}
                />
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1 px-2.5 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary" style={{ width: '135px' }} />
                <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1 px-2.5 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary" style={{ width: '135px' }} />
                {(dateFrom || dateTo || search || filterStatus) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setFilterStatus(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th text-left min-w-[200px]">Assignment & Class</th>
                    <th className="table-th min-w-[120px]">Due Date</th>
                    <th className="table-th min-w-[150px]">Submissions</th>
                    <th className="table-th min-w-[100px]">Status</th>
                    <th className="table-th min-w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHomeworks.map((h, i) => {
                    const subStr = (h.submissions || '0/0').split('/');
                    const submittedFallback = parseInt(subStr[0]) || 0;
                    const totalFallback = parseInt(subStr[1]) || 0;
                    const submitted = (typeof h.submittedCount === 'number') ? h.submittedCount : submittedFallback;
                    const total = (typeof h.totalStudents === 'number' && h.totalStudents > 0) ? h.totalStudents : totalFallback;
                    const pct = total > 0 ? Math.min(100, Math.round((submitted / total) * 100)) : 0;
                    const menuId = h._id || i;
                    return (
                      <tr key={menuId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td"><div className="font-semibold text-sm text-primary">{h.title}</div><div className="text-xs text-gray-400">{h.className}</div></td>
                        <td className="table-td text-sm text-gray-500">📅 {formatDateDDMMYYYY(h.dueDate)}</td>
                        <td className="table-td">
                          <div className="text-xs font-semibold mb-1 text-gray-700">{submitted}/{total}</div>
                          <div className="h-2 bg-gray-100 rounded-full w-28 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : 'bg-yellow-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{pct}% submitted</div>
                        </td>
                        <td className="table-td"><span className={h.status === 'Active' ? 'badge-info' : h.status === 'Pending Review' ? 'badge-warning' : 'badge-success'}>{h.status}</span></td>
                        <td className="table-td relative" data-hw-menu>
                          <button
                            data-hw-menu
                            onClick={() => setOpenMenuId(openMenuId === menuId ? null : menuId)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-primary transition-colors font-bold text-lg"
                          >⋮</button>
                          {openMenuId === menuId && (
                            <div data-hw-menu className="absolute right-0 top-10 z-50 bg-white border border-gray-200 rounded-xl shadow-xl w-52 py-1">
                              <button
                                onClick={() => handleSimulateSubmit(h._id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              >📥 Log Submission</button>
                              <button
                                onClick={() => handleSyncCount(h._id, h.className)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                              >🔢 Sync Enrollment Count</button>
                              {h.status !== 'Completed' && (
                                <button
                                  onClick={() => handleUpdateStatus(h._id, 'Completed')}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                >✅ Mark Completed</button>
                              )}
                              {h.status !== 'Active' && (
                                <button
                                  onClick={() => handleUpdateStatus(h._id, 'Active')}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                >🔄 Mark Active</button>
                              )}
                              <div className="border-t border-gray-100 my-1" />
                              <button
                                onClick={() => handleDeleteHomework(h._id)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >🗑️ Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {homeworks.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-gray-400 text-sm">No assignments posted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

        {showNew && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <form onSubmit={handleCreate} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-display font-bold text-primary text-xl">Create New Homework</h3>
                <button type="button" onClick={() => setShowNew(false)} className="text-gray-400 hover:text-primary">✖</button>
              </div>
              <div className="p-6 space-y-4">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{error}</div>}
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Assignment Title *</label><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Read Physics Chapter 2" className="input text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Target Class *</label>
                    <select value={classSelector} onChange={e => setClassSelector(e.target.value)} className="input text-sm">
                      <option value="">Choose Class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>Class {c.grade} - {c.section} ({c.enrolled} enrolled)</option>
                      ))}
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date *</label><input required type="date" value={dueDate} min={new Date().toISOString().split('T')[0]} onChange={e => setDueDate(e.target.value)} className="input text-sm" /></div>
                </div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Instructions *</label><textarea required value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Provide detailed steps, links, or instructions..." className="input h-20 resize-none text-sm" /></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Attach Reference PDF / Image (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (upEv) => setHwAttachment(upEv.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="input text-xs"
                  />
                  {hwAttachment && <span className="text-2xs text-green-600 font-bold block mt-1">✓ Reference Document Attached</span>}
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowNew(false)} className="btn-outline text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">
                  {loading ? 'Creating assignment...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Syllabus View & Upload Section */}
        {activeTab === 'syllabus' && (
          <div className="space-y-6 mt-4">
            <div className="card bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <span className="text-2xs font-extrabold uppercase tracking-widest text-purple-300">Curriculum Repository</span>
                <h3 className="text-lg font-bold mt-1">Manage Class Subject Syllabus</h3>
                <p className="text-xs text-purple-200 mt-0.5">Upload course outlines, chapter blueprints, and study materials for students.</p>
              </div>
              <button
                onClick={() => setShowSyllabusModal(true)}
                className="btn-primary bg-white text-purple-950 font-bold text-xs hover:bg-purple-50 py-2.5 px-4 rounded-xl shadow-lg"
              >
                + Upload Syllabus PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {syllabi.map((s) => (
                <div key={s._id} className="card bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-3 py-1 rounded-full text-2xs font-extrabold bg-purple-50 text-purple-700 border border-purple-100 uppercase">
                        📘 {s.subject}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{s.className}</span>
                    </div>
                    <h4 className="font-display font-bold text-primary text-base line-clamp-2 mt-2">{s.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                      {s.description || 'Official course syllabus.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-3xs font-mono font-bold text-slate-400">{formatDateDDMMYYYY(s.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={s.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline text-xs py-1 px-3 border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        👁️ View
                      </a>
                      <button
                        onClick={() => handleDeleteSyllabus(s._id)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {syllabi.length === 0 && (
                <div className="col-span-full card text-center py-12 text-slate-400 text-xs italic">
                  No syllabus documents uploaded yet. Click "+ Upload Syllabus PDF" to add your first course outline.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Syllabus Modal */}
        {showSyllabusModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <form onSubmit={handleCreateSyllabus} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-purple-100">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 flex justify-between items-center">
                <h3 className="font-display font-bold text-lg">📚 Upload Class Syllabus</h3>
                <button type="button" onClick={() => setShowSyllabusModal(false)} className="text-white hover:text-purple-200 text-lg">✖</button>
              </div>

              <div className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Class *</label>
                  <select value={sClass} onChange={e => setSClass(e.target.value)} className="input text-xs font-semibold">
                    {classes.map(c => (
                      <option key={c.id} value={`Class ${c.grade} - ${c.section}`}>Class {c.grade} - {c.section}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Subject *</label>
                  <select value={sSubject} onChange={e => setSSubject(e.target.value)} className="input text-xs font-semibold">
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English Literature">English Literature</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Syllabus Document Title *</label>
                  <input
                    required
                    placeholder="e.g. Annual Mathematics Board Blueprint & Course Outline"
                    value={sTitle}
                    onChange={e => setSTitle(e.target.value)}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Attach Syllabus PDF / Image File *</label>
                  <input
                    type="file"
                    required={!sFile}
                    accept=".pdf,image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (upEv) => setSFile(upEv.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="input text-xs"
                  />
                  {sFile && <span className="text-2xs text-green-600 font-bold block mt-1">✓ File Attached Ready</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description / Course Topics</label>
                  <textarea
                    placeholder="Brief description of chapters, exam weightage, lab modules..."
                    value={sDescription}
                    onChange={e => setSDescription(e.target.value)}
                    className="input text-xs h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowSyllabusModal(false)} className="btn-outline text-xs">Cancel</button>
                <button type="submit" disabled={savingSyllabus} className="btn-primary text-xs bg-purple-700 hover:bg-purple-800">
                  {savingSyllabus ? 'Uploading...' : '📤 Publish Syllabus'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      );
};

// --- Teacher Profile ---
export const TeacherProfile = () => {
  const [profile, setProfile] = useState(null);
      const [loading, setLoading] = useState(true);
      const [editing, setEditing] = useState(false);
      const [saving, setSaving] = useState(false);
      const [saveMsg, setSaveMsg] = useState('');
      const [form, setForm] = useState({firstName: '', lastName: '', qualifications: '', officeLocation: '' });

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/academics/teacher/profile');
      setProfile(res.data);
      setForm({
        firstName: res.data.firstName || '',
      lastName: res.data.lastName || '',
      qualifications: res.data.qualifications || '',
      officeLocation: res.data.officeLocation || '',
      });
    } catch (err) {
        console.error('Failed to load DB teacher profile:', err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {loadProfile(); }, []);

  const handleSave = async (e) => {
        e.preventDefault();
      setSaving(true);
      setSaveMsg('');
      try {
        await apiClient.patch('/academics/teacher/profile', {
          firstName: form.firstName,
          lastName: form.lastName,
          qualifications: form.qualifications,
          officeLocation: form.officeLocation,
        });
      await loadProfile();
      setEditing(false);
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
        console.error('Failed to save profile:', err);
      setSaveMsg('Failed to save. Please try again.');
    } finally {
        setSaving(false);
    }
  };

  const handleCancel = () => {
        setForm({
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          qualifications: profile?.qualifications || '',
          officeLocation: profile?.officeLocation || '',
        });
      setEditing(false);
  };

  if (loading) {
    return <Loader message="Retrieving your teacher profile" />;
  }

      return (
      <div>
        <Topbar title="My Profile" />
        <div className="card max-w-3xl">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 w-full sm:w-auto">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-3xl font-bold text-accent shrink-0">
                {profile?.firstName ? `${profile.firstName[0]}${profile.lastName[0]}` : '👤'}
              </div>
              <div className="text-center sm:text-left w-full">
                <h2 className="font-display text-2xl font-bold text-primary">{profile?.firstName} {profile?.lastName}</h2>
                <p className="text-accent font-semibold text-sm mt-0.5">{profile?.department || 'Faculty'}</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center justify-center sm:justify-start gap-1">👩‍🏫 Faculty Account</span>
                  <span className="flex items-center justify-center sm:justify-start gap-1">📧 {profile?.email}</span>
                  <span className="flex items-center justify-center sm:justify-start gap-1">🆔 Employee ID: #{profile?.employeeId}</span>
                </div>
              </div>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-outline text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0">
                ✏️ Edit Profile
              </button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button onClick={handleCancel} className="btn-outline text-xs flex-1 sm:flex-none justify-center">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs flex-1 sm:flex-none justify-center">
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            )}
          </div>

          {saveMsg && (
            <div className={`mb-4 text-xs font-semibold rounded-lg px-4 py-2.5 ${saveMsg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {saveMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 text-sm">
            {/* Left column */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-3.5">🏢 Administrative Assignment</h3>
              <div className="space-y-3">
                {/* Name — editable */}
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">First Name</span>
                  {editing ? (
                    <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input text-sm py-1 px-2 w-36 text-right" />
                  ) : (
                    <span className="font-semibold text-primary">{profile?.firstName}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Last Name</span>
                  {editing ? (
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input text-sm py-1 px-2 w-36 text-right" />
                  ) : (
                    <span className="font-semibold text-primary">{profile?.lastName}</span>
                  )}
                </div>
                {/* Department — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Department</span>
                  <span className="font-semibold text-primary">{profile?.department}</span>
                </div>
                {/* Office Room — editable */}
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Office Room</span>
                  {editing ? (
                    <input value={form.officeLocation} onChange={e => setForm(f => ({ ...f, officeLocation: e.target.value }))} className="input text-sm py-1 px-2 w-36 text-right" />
                  ) : (
                    <span className="font-medium text-gray-700">{profile?.officeLocation}</span>
                  )}
                </div>
                {/* Joining Date — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Contract Joined</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">{profile?.joined}</span>
                    <span className="text-xs text-gray-400 ml-1" title="Set by admin — cannot be changed">🔒</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-3.5">💼 Qualifications & Payout</h3>
              <div className="space-y-3">
                {/* Qualifications — editable */}
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Qualifications</span>
                  {editing ? (
                    <input value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} className="input text-sm py-1 px-2 w-36 text-right" />
                  ) : (
                    <span className="font-medium text-gray-700">{profile?.qualifications}</span>
                  )}
                </div>
                {/* Salary — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Monthly Salary</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">Rs. {profile?.salary?.toLocaleString() ?? '0'}</span>
                    <span className="text-xs text-gray-400" title="Set by admin — cannot be changed">🔒</span>
                  </div>
                </div>
                {/* Status — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Staff Status</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-green-600">{profile?.isActive ? 'ACTIVE' : 'ON LEAVE'}</span>
                    <span className="text-xs text-gray-400" title="Set by admin — cannot be changed">🔒</span>
                  </div>
                </div>
              </div>

              {editing && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 leading-relaxed">
                  🔒 <strong>Salary</strong>, <strong>Department</strong>, <strong>Status</strong>, and <strong>Joining Date</strong> are managed by the school admin and cannot be changed here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      );
};

// --- Teacher Self Attendance View ---
// --- Helper: Haversine Distance Calculation (meters) ---
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// --- Teacher Self Attendance View ---
export const TeacherSelfAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [schoolSetting, setSchoolSetting] = useState(null);
  const [teacherLocation, setTeacherLocation] = useState(null);
  const [locatingGps, setLocatingGps] = useState(false);
  const [distance, setDistance] = useState(null);
  const [punching, setPunching] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTodayAndSettings = async () => {
    try {
      const res = await expressClient.get('/teacher-attendance/today');
      setTodayAttendance(res.data.attendance || null);
      setSchoolSetting(res.data.schoolSetting || null);
      if (res.data.attendance) {
        setSelectedRecord(res.data.attendance);
      }
    } catch (err) {
      console.error('Failed to load today punch status:', err);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await expressClient.get('/teacher-attendance/my-attendance');
      setAttendanceList(res.data || []);
    } catch (err) {
      console.error('Failed to load my attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayAndSettings();
    fetchAttendanceHistory();
    // Auto-detect GPS location on load
    if (navigator.geolocation) {
      setLocatingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          setTeacherLocation({ latitude: lat, longitude: lng });
          setLocatingGps(false);
        },
        (err) => {
          setLocatingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, []);

  useEffect(() => {
    if (teacherLocation && schoolSetting) {
      const d = calculateHaversineDistance(
        schoolSetting.latitude,
        schoolSetting.longitude,
        teacherLocation.latitude,
        teacherLocation.longitude
      );
      setDistance(d);
    }
  }, [teacherLocation, schoolSetting]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setTeacherLocation({ latitude: lat, longitude: lng });
        setLocatingGps(false);
      },
      (err) => {
        setLocatingGps(false);
        alert('GPS location detection failed: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handlePunchIn = async () => {
    if (!teacherLocation) {
      alert('Please detect your current GPS location first.');
      return;
    }
    setPunching(true);
    try {
      const res = await expressClient.post('/teacher-attendance/punch-in', {
        latitude: teacherLocation.latitude,
        longitude: teacherLocation.longitude,
        address: 'School Premises GPS'
      });
      alert('📍 Punch In Successful!');
      fetchTodayAndSettings();
      fetchAttendanceHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Punch In failed.');
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!teacherLocation) {
      alert('Please detect your current GPS location first.');
      return;
    }
    setPunching(true);
    try {
      const res = await expressClient.post('/teacher-attendance/punch-out', {
        latitude: teacherLocation.latitude,
        longitude: teacherLocation.longitude,
        address: 'School Premises GPS'
      });
      alert('🚀 Punch Out Successful!');
      fetchTodayAndSettings();
      fetchAttendanceHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Punch Out failed.');
    } finally {
      setPunching(false);
    }
  };

  const radiusLimit = schoolSetting?.geofenceRadiusMeters || 300;
  const isWithinRadius = distance !== null && distance <= radiusLimit;
  const activeModes = schoolSetting?.attendanceModes || ['app', 'biometric'];
  const isAppEnabled = activeModes.includes('app');
  const isBiometricEnabled = activeModes.includes('biometric');

  const totalDays = attendanceList.length;
  const presentCount = attendanceList.filter(a => a.status === 'Present').length;
  const lateCount = attendanceList.filter(a => a.status === 'Late').length;
  const singlePunchCount = attendanceList.filter(a => a.status === 'Single Punch').length;
  const halfDayCount = attendanceList.filter(a => a.status === 'Half Day').length;
  const absentCount = attendanceList.filter(a => a.status === 'Absent').length;
  const leaveCount = attendanceList.filter(a => a.status === 'On Leave').length;
  
  const attendanceRate = totalDays > 0 
    ? (((presentCount + lateCount + halfDayCount) / totalDays) * 100).toFixed(1) + '%' 
    : '100%';

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
    const record = attendanceList.find(a => a.date === dateStr);
    calendarDays.push({
      padding: false,
      day,
      dateStr,
      record,
      key: `day-${day}`
    });
  }

  const getStatusColor = (status) => {
    if (status === 'Present') return 'bg-emerald-500 text-white hover:bg-emerald-600';
    if (status === 'Late') return 'bg-amber-500 text-white hover:bg-amber-600';
    if (status === 'Single Punch') return 'bg-blue-500 text-white hover:bg-blue-600';
    if (status === 'Half Day') return 'bg-purple-500 text-white hover:bg-purple-600';
    if (status === 'Absent') return 'bg-rose-500 text-white hover:bg-rose-600';
    if (status === 'On Leave') return 'bg-orange-500 text-white hover:bg-orange-600';
    return 'bg-gray-100 text-gray-400 hover:bg-gray-200';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return <Loader message="Accessing your attendance logs" />;
  }

  return (
    <div>
      <Topbar title="My Attendance Logs" subtitle="View your daily punch history, working hours, and campus attendance status" />
      
      {/* Geofence Radar / Punch Control Card */}
      {isAppEnabled ? (
        <div className="card bg-gradient-to-br from-slate-900 via-primary-dark to-slate-900 text-white mb-6 p-6 shadow-xl rounded-2xl relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg ${
                isWithinRadius ? 'bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300' : 'bg-rose-500/20 border-2 border-rose-400 text-rose-300'
              }`}>
                {isWithinRadius ? '🎯' : '⚠️'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold font-display text-white">Daily 300m GPS Punch In / Punch Out</h3>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${
                    isWithinRadius ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/40' : 'bg-rose-500/30 text-rose-300 border border-rose-400/40'
                  }`}>
                    {distance === null ? 'Locating GPS...' : isWithinRadius ? '🟢 Inside Premises (≤ 300m)' : '🔴 Outside Premises (> 300m)'}
                  </span>
                </div>
                <p className="text-xs text-blue-200/80 mt-1">
                  School GPS: ({schoolSetting?.latitude || 26.9124}, {schoolSetting?.longitude || 75.7873}) | Geofence Radius: <strong>{radiusLimit} meters</strong>
                </p>
                {teacherLocation && (
                  <div className="text-[11px] text-emerald-300 font-mono mt-1 flex items-center gap-2">
                    <span>📍 Your GPS: {teacherLocation.latitude}, {teacherLocation.longitude}</span>
                    <span className="text-white/60">|</span>
                    <span className="font-bold">Distance: {distance != null ? `${distance} meters` : 'Calculating...'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={detectLocation}
                disabled={locatingGps}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-2"
              >
                {locatingGps ? '📡 Locating...' : '🔄 Refresh My GPS'}
              </button>

              {!todayAttendance?.punchInTime ? (
                <button
                  type="button"
                  onClick={handlePunchIn}
                  disabled={!isWithinRadius || punching}
                  className={`px-6 py-3 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center gap-2 ${
                    isWithinRadius && !punching
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer shadow-emerald-500/30'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  {punching ? '⏳ Punching In...' : '📍 Punch In Now'}
                </button>
              ) : !todayAttendance?.punchOutTime ? (
                <button
                  type="button"
                  onClick={handlePunchOut}
                  disabled={!isWithinRadius || punching}
                  className={`px-6 py-3 rounded-xl text-sm font-extrabold shadow-lg transition-all flex items-center gap-2 ${
                    isWithinRadius && !punching
                      ? 'bg-purple-500 hover:bg-purple-400 text-white cursor-pointer shadow-purple-500/30'
                      : 'bg-gray-600 text-gray-300 cursor-not-allowed opacity-60'
                  }`}
                >
                  {punching ? '⏳ Punching Out...' : '🚀 Punch Out Now'}
                </button>
              ) : (
                <div className="px-5 py-2.5 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  ✅ Completed Punch In & Out Today
                </div>
              )}
            </div>
          </div>

          {/* Warning Banner when outside 300m radius */}
          {!isWithinRadius && distance !== null && (
            <div className="mt-4 bg-rose-500/20 border border-rose-400/40 rounded-xl p-3 text-xs text-rose-200 flex items-center gap-2">
              ⚠️ <strong>Punching Disabled:</strong> You are currently <strong>{distance} meters</strong> away from school campus. Please reach within the <strong>{radiusLimit}m</strong> geofence boundary to enable punch in/out buttons.
            </div>
          )}
        </div>
      ) : isBiometricEnabled ? (
        <div className="card bg-gradient-to-r from-slate-900 via-primary to-slate-900 text-white mb-6 p-6 shadow-xl rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border-2 border-blue-400 text-blue-300 flex items-center justify-center text-3xl font-bold shadow-lg">
              ☝️
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                Biometric Fingerprint Punch Active
              </h3>
              <p className="text-xs text-blue-200 mt-1">
                Your school uses official biometric thumb hardware for attendance. Please place your thumb on the campus biometric machine to punch in and out. Logs sync automatically to your portal.
              </p>
            </div>
          </div>
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 rounded-xl text-xs font-bold whitespace-nowrap">
            📡 Hardware Synced
          </div>
        </div>
      ) : null}

      {/* Today's Punch Summary */}
      {todayAttendance && (
        <div className="card mb-6 bg-slate-900 text-white p-4 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Punch In Time</span>
            <span className="font-bold text-emerald-400 text-sm">
              {todayAttendance.punchInTime ? new Date(todayAttendance.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Punched In'}
            </span>
          </div>
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Punch Out Time</span>
            <span className="font-bold text-purple-400 text-sm">
              {todayAttendance.punchOutTime ? new Date(todayAttendance.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not Punched Out'}
            </span>
          </div>
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Worked Hours</span>
            <span className="font-bold text-blue-300 text-sm">
              {todayAttendance.workingHours ? `${todayAttendance.workingHours} hrs` : 'In Progress'}
            </span>
          </div>
          <div>
            <span className="text-white/60 text-[10px] block font-semibold uppercase">Today Status</span>
            <span className="font-extrabold text-amber-300 text-sm">{todayAttendance.status}</span>
          </div>
        </div>
      )}

      {/* Monthly Statistics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Attendance Rate', value: attendanceRate, color: 'text-primary', icon: '📈' },
          { label: 'Present Days', value: presentCount, color: 'text-emerald-600', icon: '✅' },
          { label: 'Late Days', value: lateCount, color: 'text-amber-500', icon: '⏱️' },
          { label: 'Single Punch', value: singlePunchCount, color: 'text-blue-500', icon: '📍' },
          { label: 'Half Days', value: halfDayCount, color: 'text-purple-600', icon: '🌓' },
          { label: 'Absent Days', value: absentCount, color: 'text-rose-500', icon: '❌' }
        ].map(stat => (
          <div key={stat.label} className="stat-card flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-lg bg-primary/5 flex items-center justify-center text-lg shrink-0">{stat.icon}</div>
            <div>
              <div className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-primary text-lg">
              📅 {monthNames[month]} {year}
            </h3>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-2 border rounded-lg hover:bg-gray-50 text-xs font-bold">◀ Prev</button>
              <button onClick={handleNextMonth} className="p-2 border rounded-lg hover:bg-gray-50 text-xs font-bold">Next ▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(item => {
              if (item.padding) {
                return <div key={item.key} className="h-16 bg-gray-50/30 rounded-xl border border-dashed border-gray-100" />;
              }
              const hasRecord = !!item.record;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => item.record && setSelectedRecord(item.record)}
                  className={`h-16 rounded-xl border flex flex-col justify-between p-2 text-left relative transition-all ${
                    hasRecord
                      ? getStatusColor(item.record.status)
                      : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="text-xs font-bold">{item.day}</span>
                  {hasRecord && (
                    <span className="text-[9px] font-extrabold uppercase leading-none opacity-95 truncate max-w-full">
                      {item.record.status}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Details Drawer */}
        <div className="space-y-4">
          <div className="card bg-gray-50/50">
            <h3 className="font-display font-bold text-primary text-sm mb-4 flex items-center gap-2">
              ℹ️ Date Inspection Log
            </h3>
            {selectedRecord ? (
              <div className="space-y-3.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Date</span>
                  <span className="font-bold text-primary">{selectedRecord.date}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Status</span>
                  <span className="font-extrabold text-primary">{selectedRecord.status}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Punch In</span>
                  <span className="font-bold text-emerald-600">
                    {selectedRecord.punchInTime ? new Date(selectedRecord.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Punch Out</span>
                  <span className="font-bold text-purple-600">
                    {selectedRecord.punchOutTime ? new Date(selectedRecord.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-100">
                  <span className="text-gray-400 font-semibold uppercase">Working Hours</span>
                  <span className="font-bold text-blue-600">
                    {selectedRecord.workingHours ? `${selectedRecord.workingHours} hrs` : 'N/A'}
                  </span>
                </div>
                {selectedRecord.status === 'Late' && (
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase">Minutes Late</span>
                    <span className="font-bold text-amber-600">{selectedRecord.lateMinutes} mins</span>
                  </div>
                )}
                {selectedRecord.punchInLocation && (
                  <div className="py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase block mb-1">GPS Location</span>
                    <span className="font-mono text-[10px] text-slate-700 bg-white p-2 rounded border border-gray-200 block">
                      📍 Lat: {selectedRecord.punchInLocation.latitude}, Lng: {selectedRecord.punchInLocation.longitude}
                    </span>
                  </div>
                )}
                <div className="py-1.5">
                  <span className="text-gray-400 font-semibold uppercase block mb-1">Remarks</span>
                  <p className="text-gray-600 bg-white p-2.5 rounded-lg border border-gray-100 italic leading-normal">
                    {selectedRecord.remarks || 'No remarks provided.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 italic text-2xs">
                Click on any marked date in the calendar to view full attendance logs and GPS details.
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-bold text-primary text-sm mb-3">Status Legend</h3>
            <div className="space-y-2">
              {[
                { label: 'Present', color: 'bg-emerald-500' },
                { label: 'Late', color: 'bg-amber-500' },
                { label: 'Single Punch', color: 'bg-blue-500' },
                { label: 'Half Day', color: 'bg-purple-500' },
                { label: 'Absent', color: 'bg-rose-500' },
                { label: 'On Leave', color: 'bg-orange-500' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="font-medium text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Teacher Notices ---
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
      setNoticesList(res.data);
    } catch (err) {
      console.error('Error fetching notices:', err);
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
    try {
      await expressClient.post('/notifications', {
        recipientId: target,
        title,
        body,
        type
      });
      if (sendWhatsApp) {
        await apiClient.post('/academics/whatsapp/send-broadcast', {
          title,
          body
        });
      }
      setShowNew(false);
      setTitle('');
      setBody('');
      setSendWhatsApp(false);
      fetchNotices();
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

// --- Teacher School Holiday Calendar ---
export const TeacherHolidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHolidays = async () => {
    try {
      const res = await expressClient.get('/holidays');
      setHolidays(res.data);
    } catch (err) {
      console.error('Error fetching holidays:', err);
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
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = firstDayOfMonth.getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push({ padding: true, key: `pad-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const matchedHoliday = holidays.find(h => {
      const hStart = h.date;
      const hEnd = h.endDate || h.date;
      return dateStr >= hStart && dateStr <= hEnd;
    });
    calendarDays.push({
      padding: false,
      day,
      dateStr,
      holiday: matchedHoliday,
      key: `day-${day}`
    });
  }

  const getCategoryBadge = (cat) => {
    switch (cat) {
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
      <Topbar title="School Holiday Calendar" subtitle="Faculty Portal › Annual School Holidays" />

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
            🔍 View Details
          </button>
        </div>
      )}

      {/* Main Grid: Interactive Calendar & Side Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card bg-white shadow-sm border border-slate-200/80 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold font-display text-primary">
                {monthNames[month]} {year}
              </h2>
              <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 font-bold text-slate-600 border border-slate-200">
                {calendarDays.filter(d => !d.padding && d.holiday).length} Holidays This Month
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

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell) => {
              if (cell.padding) {
                return <div key={cell.key} className="h-24 bg-slate-50/50 rounded-xl border border-dashed border-slate-100" />;
              }

              const isToday = cell.dateStr === getTodayStr();
              const hasHoliday = !!cell.holiday;
              const isSelected = selectedHoliday && (cell.holiday?._id === selectedHoliday._id || cell.dateStr === selectedHoliday.date);
              const categoryStyle = hasHoliday ? getCategoryBadge(cell.holiday.category) : null;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    if (hasHoliday) {
                      setSelectedHoliday(cell.holiday);
                    }
                  }}
                  className={`h-24 p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? 'ring-2 ring-primary ring-offset-2 border-primary shadow-md'
                      : hasHoliday
                      ? `${categoryStyle.bg} border-2 hover:scale-[1.02] shadow-2xs cursor-pointer`
                      : isToday
                      ? 'bg-blue-50/40 border-blue-300 hover:bg-blue-50'
                      : 'bg-white border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black ${
                      isToday ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center' : 'text-slate-700'
                    }`}>
                      {cell.day}
                    </span>
                    {hasHoliday && (
                      <span className={`w-2 h-2 rounded-full ${categoryStyle.dot}`} />
                    )}
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
                  ) : (
                    <span className="text-[9px] text-slate-300 font-medium">School Open</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

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
                        className="text-xs font-bold text-primary hover:underline"
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

// ==========================================
// Teacher Leaves (Self-Apply, Quotas, History)
// ==========================================
export const TeacherLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    leaveType: 'CL',
    dayType: 'FullDay',
    halfDaySession: 'Morning',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [leavesRes, balRes] = await Promise.all([
        apiClient.get('/academics/leave/my-leaves'),
        apiClient.get('/academics/leave/my-balance')
      ]);
      setLeaves(leavesRes.data || []);
      setBalance(balRes.data || null);
    } catch (err) {
      console.error('Failed to load leave records:', err);
      setError('Failed to load leave balance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!form.reason) {
      setError('Please provide a reason for the leave application.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/academics/leave/apply', {
        leaveType: form.leaveType,
        dayType: form.dayType,
        halfDaySession: form.dayType === 'HalfDay' ? form.halfDaySession : null,
        fromDate: form.fromDate,
        toDate: form.dayType === 'HalfDay' ? form.fromDate : form.toDate,
        reason: form.reason
      });
      setSuccess('Leave application submitted successfully! Awaiting Account Manager review.');
      setShowApplyModal(false);
      setForm({
        leaveType: 'CL',
        dayType: 'FullDay',
        halfDaySession: 'Morning',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        reason: ''
      });
      fetchLeaveData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <Topbar title="My Leave Portal" subtitle="Apply for Leave, Track Approval Status & Check Annual Leave Quotas" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            Teacher Leave Management
          </h1>
          <p className="text-sm text-emerald-200/90 max-w-xl">
            Apply for Casual Leave (CL), Sick Leave (SL), Earned Leave (EL), or Half-Day sessions. Your leave balances are managed in real-time.
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setShowApplyModal(true);
          }}
          className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 transition flex items-center gap-2.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {/* Quota Balances 4 Cards */}
      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Casual Leave (CL)</span>
            <div className="text-2xl font-black text-purple-600 font-mono">
              {balance.cl?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.cl?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.cl?.used || 0) / (balance.cl?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.cl?.used || 0} days used this year</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Sick Leave (SL)</span>
            <div className="text-2xl font-black text-teal-600 font-mono">
              {balance.sl?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.sl?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.sl?.used || 0) / (balance.sl?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.sl?.used || 0} days used this year</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Earned Leave (EL/PL)</span>
            <div className="text-2xl font-black text-indigo-600 font-mono">
              {balance.el?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.el?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.el?.used || 0) / (balance.el?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.el?.used || 0} days used this year</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Maternity Leave (ML)</span>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {balance.ml?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.ml?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-rose-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.ml?.used || 0) / (balance.ml?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.ml?.used || 0} days used this year</p>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900">My Leave Applications History ({leaves.length})</h2>
          <p className="text-xs text-slate-400 mt-0.5">Status updates from School Account Office</p>
        </div>

        {loading ? (
          <div className="py-20 text-center"><Loader /></div>
        ) : leaves.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <CalendarCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No Leave Requests Logged</p>
            <p className="text-xs text-slate-400">Click "Apply for Leave" above to request time off.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3.5 px-6">TYPE</th>
                  <th className="py-3.5 px-4">DURATION / SESSION</th>
                  <th className="py-3.5 px-4">TOTAL DAYS</th>
                  <th className="py-3.5 px-4">REASON</th>
                  <th className="py-3.5 px-4">APPLIED ON</th>
                  <th className="py-3.5 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {leaves.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-2xs font-black">
                        {l.leaveType}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-700">
                      <div>
                        {new Date(l.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {l.dayType === 'FullDay' && l.fromDate !== l.toDate && ` to ${new Date(l.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </div>
                      <span className="text-3xs text-slate-400 font-semibold">
                        {l.dayType === 'HalfDay' ? `Half Day (${l.halfDaySession || 'Session'})` : 'Full Day'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {l.totalDays} {l.totalDays === 1 ? 'day' : 'days'}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {new Date(l.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-3xs font-black uppercase tracking-wider border ${
                        l.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : l.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {l.status}
                      </span>
                      {l.rejectionNote && (
                        <span className="text-3xs text-rose-600 block mt-1">Note: {l.rejectionNote}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-300" />
                Apply for Leave
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleApply} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Leave Type</label>
                  <select
                    value={form.leaveType}
                    onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="CL">Casual Leave (CL)</option>
                    <option value="SL">Sick Leave (SL)</option>
                    <option value="EL">Earned Leave (EL/PL)</option>
                    <option value="ML">Maternity Leave (ML)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Session Type</label>
                  <select
                    value={form.dayType}
                    onChange={e => setForm(p => ({ ...p, dayType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="FullDay">Full Day</option>
                    <option value="HalfDay">Half Day (0.5d)</option>
                  </select>
                </div>
              </div>

              {form.dayType === 'HalfDay' && (
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Half Day Session</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Morning', 'Afternoon'].map(sess => (
                      <button
                        key={sess}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, halfDaySession: sess }))}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                          form.halfDaySession === sess
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {sess} Session
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">From Date *</label>
                  <input
                    type="date"
                    required
                    value={form.fromDate}
                    onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                {form.dayType === 'FullDay' && (
                  <div>
                    <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">To Date *</label>
                    <input
                      type="date"
                      required
                      value={form.toDate}
                      onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Reason *</label>
                <textarea
                  required
                  value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="State reason for absence..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowApplyModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Teacher Library (My Books & Fines)
// ==========================================
export const TeacherLibrary = () => {
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
      <Topbar title="My Library Loans" subtitle="Check Your Active Book Borrowings, Due Dates & Overdue Fines" />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-cyan-400 shrink-0" />
            My Borrowed Books
          </h1>
          <p className="text-sm text-cyan-200/90 max-w-xl">
            Keep track of returned books, active loans, return due dates, and fine policies established by the school librarian.
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
            <p className="text-xs text-slate-400">Visit the school library to check out books and learning resources.</p>
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
                {data.books.map(b => (
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

