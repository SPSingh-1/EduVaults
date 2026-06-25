import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
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
  ClipboardList 
} from 'lucide-react';

const teacherLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/teacher/dashboard' },
  { icon: Building, label: 'My Classes', path: '/teacher/classes' },
  { icon: Users, label: 'Students', path: '/teacher/students' },
  { icon: CheckSquare, label: 'Attendance', path: '/teacher/attendance' },
  { icon: Calendar, label: 'My Attendance', path: '/teacher/self-attendance' },
  { icon: Edit, label: 'Marks Entry', path: '/teacher/marks' },
  { icon: PenTool, label: 'Homework', path: '/teacher/homework' },
  { icon: MessageSquare, label: 'Remarks', path: '/teacher/remarks' },
  { icon: Megaphone, label: 'Notices', path: '/teacher/notices' },
  { icon: User, label: 'Profile', path: '/teacher/profile' },
];

const CustomTeacherTooltip = ({ active, payload, label, isSalary }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-100/80 p-3 rounded-2xl shadow-[0_12px_30px_-5px_rgba(0,0,0,0.08)] transition-all">
        <p className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-2xs text-slate-550 font-semibold">{item.name}:</span>
            <span className="text-xs font-black text-slate-800 font-mono">
              {isSalary ? `Rs. ${item.value.toLocaleString()}` : `${item.value} students`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const TeacherLayout = () => (
  <div className="flex">
    <Sidebar links={teacherLinks} role="teacher" />
    <main className="main-content flex-1"><Outlet /></main>
  </div>
);

// --- Teacher Dashboard ---
export const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleView, setScheduleView] = useState('today');

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
    return (
      <div>
        <Topbar title="Teacher Dashboard" subtitle="Loading classroom statistics..." />
        <div className="card text-center py-12 text-gray-400 text-sm">Loading dashboard analytics...</div>
      </div>
    );
  }

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[new Date().getDay()];
  const isWeekend = todayName === 'Saturday' || todayName === 'Sunday';
  const todaySchedule = stats?.schedule?.filter(
    item => item.dayOfWeek.toLowerCase() === todayName.toLowerCase()
  ) || [];

  return (
    <div className="space-y-6">
      <Topbar title="Teacher Dashboard" subtitle="Academic Year 2023-24" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'My Classes', value: stats?.totalClasses ?? '0', sub: stats?.myClassesToday || 'No classes today', icon: Building, color: 'text-blue-500', bgColor: 'bg-blue-50/50' },
          { label: 'Total Students', value: stats?.totalStudents ?? '0', sub: 'Across class roster', icon: Users, color: 'text-emerald-500', bgColor: 'bg-emerald-50/50' },
          { label: 'Pending Reviews', value: stats?.pendingReviews ?? '0', sub: 'Requires submission', icon: ClipboardList, color: 'text-amber-500', bgColor: 'bg-amber-50/50' },
          { label: 'Base Salary', value: stats?.salary ? `Rs. ${stats.salary.toLocaleString()}` : 'Rs. 55,000', sub: 'Direct deposit', icon: DollarSign, color: 'text-violet-500', bgColor: 'bg-violet-50/50' },
        ].map(s => (
          <div key={s.label} className="stat-card flex items-center justify-between p-5 hover:shadow-md transition-all">
            <div className="space-y-1">
              <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-xs font-semibold text-gray-450">{s.label}</div>
              <div className="text-2xs font-semibold text-blue-500">{s.sub}</div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${s.bgColor}`}>
              <s.icon className={`w-6 h-6 ${s.color} stroke-[1.75]`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Students per Class */}
        <div className="card flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-primary text-sm m-0">Student Enrollment by Class</h3>
            <p className="text-2xs text-gray-400">Class roster size distributions</p>
          </div>
          <div className="h-64 w-full">
            {stats?.classEnrollments && stats.classEnrollments.length > 0 ? (
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

  return (
    <div>
      <Topbar title="My Assigned Classes" subtitle="Manage schedules, remarks, and cancellations" />

      {loading ? (
        <div className="card text-center py-12 text-gray-400 text-sm">Loading classroom mappings...</div>
      ) : (
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
      )}

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

// --- Dedicated Teacher Taught Students ---
export const TeacherStudents = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
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
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 relative">
            <input 
              placeholder={activeTab === 'roster' ? "Search students by name..." : "Search parents by student or guardian name..."} 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="input pl-9 text-sm" 
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
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
        const gSub = globalSubjects.find(s => s.id === popupForm.subjectId);
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
  const isApproved = classForSelectedStudent?.areMarksPublished === true || classForSelectedStudent?.AreMarksPublished === true;

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
                  {globalSubjects.map(s => (
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

      // Form state
      const [title, setTitle] = useState('');
      const [classSelector, setClassSelector] = useState('');
      const [dueDate, setDueDate] = useState('');
      const [instructions, setInstructions] = useState('');

      // Dropdown menu state
      const [openMenuId, setOpenMenuId] = useState(null);

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
      const res = await expressClient.get('/homework');
      setHomeworks(res.data);

      const clsRes = await apiClient.get('/academics/classes');
      setClasses(clsRes.data);
      if (clsRes.data.length > 0) {
        // Use class ID as the selector value for reliable lookup
        setClassSelector(clsRes.data[0].id);
      }
    } catch (err) {
        console.error('Error fetching homeworks:', err);
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
      totalStudents
      });
      setShowNew(false);
      setTitle('');
      setInstructions('');
      setDueDate('');
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

  const activeCount = homeworks.filter(h => h.status === 'Active').length;
  const pendingCount = homeworks.filter(h => h.status === 'Pending Review').length;
  const completedCount = homeworks.filter(h => h.status === 'Completed').length;

      return (
      <div>
        <Topbar title="Assigned Homework" subtitle="Dashboard › Homework"
          actions={<button onClick={() => { setError(''); setShowNew(true); }} className="btn-primary text-sm">+ Create New Homework</button>} />
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
                {homeworks.map((h, i) => {
                  // Parse submissions: prefer numeric fields, fall back to parsing "X/Y" string
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
                      <td className="table-td text-sm text-gray-500">📅 {new Date(h.dueDate).toLocaleDateString()}</td>
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
                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Instructions *</label><textarea required value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Provide detailed steps, links, or instructions..." className="input h-24 resize-none text-sm" /></div>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-outline text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">
                  {loading ? 'Creating assignment...' : 'Create Assignment'}
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

      if (loading) return (
      <div>
        <Topbar title="My Profile" />
        <div className="card text-center py-12 text-gray-400 text-sm">Loading profile details...</div>
      </div>
      );

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
export const TeacherSelfAttendance = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await expressClient.get('/teacher-attendance/my-attendance');
        setAttendanceList(res.data || []);
      } catch (err) {
        console.error('Failed to load my attendance:', err);
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
  const leaveCount = attendanceList.filter(a => a.status === 'On Leave').length;
  
  const attendanceRate = totalDays > 0 
    ? (((presentCount + lateCount) / totalDays) * 100).toFixed(1) + '%' 
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
    if (status === 'Present') return 'bg-green-500 text-white hover:bg-green-600';
    if (status === 'Late') return 'bg-amber-500 text-white hover:bg-amber-600';
    if (status === 'Absent') return 'bg-red-500 text-white hover:bg-red-600';
    if (status === 'On Leave') return 'bg-orange-500 text-white hover:bg-orange-600';
    return 'bg-gray-100 text-gray-400 hover:bg-gray-200';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div>
      <Topbar title="My Attendance Logs" subtitle="Track your daily attendance status and details" />
      
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Attendance Rate', value: attendanceRate, color: 'text-primary', icon: '📈' },
          { label: 'Present Days', value: presentCount, color: 'text-green-600', icon: '✅' },
          { label: 'Late Days', value: lateCount, color: 'text-amber-500', icon: '⏱️' },
          { label: 'Absent Days', value: absentCount, color: 'text-red-500', icon: '❌' },
          { label: 'Leave Days', value: leaveCount, color: 'text-orange-500', icon: '💼' }
        ].map(stat => (
          <div key={stat.label} className="stat-card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center text-xl">{stat.icon}</div>
            <div>
              <div className={`font-display text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-16 text-gray-400">
          <div className="animate-spin text-2xl mb-3">⏳</div>
          Loading your attendance logs...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div className="card col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display font-bold text-primary text-lg">
                📅 {monthNames[month]} {year}
              </h3>
              <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-2 border rounded-lg hover:bg-gray-50 text-xs font-bold">◀ Prev</button>
                <button onClick={handleNextMonth} className="p-2 border rounded-lg hover:bg-gray-50 text-xs font-bold">Next ▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-gray-400">
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
                      <span className="text-[9px] font-extrabold uppercase leading-none opacity-90 truncate max-w-full">
                        {item.record.status}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card bg-gray-50/50">
              <h3 className="font-display font-bold text-primary text-sm mb-4">ℹ️ Date Details</h3>
              {selectedRecord ? (
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase">Date</span>
                    <span className="font-bold text-primary">{selectedRecord.date}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-100">
                    <span className="text-gray-400 font-semibold uppercase">Status</span>
                    <span className="font-bold text-primary">{selectedRecord.status}</span>
                  </div>
                  {selectedRecord.status === 'Late' && (
                    <div className="flex justify-between py-1.5 border-b border-gray-100">
                      <span className="text-gray-400 font-semibold uppercase">Minutes Late</span>
                      <span className="font-bold text-amber-600">{selectedRecord.lateMinutes} mins</span>
                    </div>
                  )}
                  <div className="py-1.5">
                    <span className="text-gray-400 font-semibold uppercase block mb-1">Admin Remarks</span>
                    <p className="text-gray-600 bg-white p-2.5 rounded-lg border border-gray-100 italic leading-normal">
                      {selectedRecord.remarks || 'No remarks provided.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 italic text-2xs">
                  Click on any marked date in the calendar to view full attendance remarks and details.
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="font-display font-bold text-primary text-sm mb-3">Legend</h3>
              <div className="space-y-2">
                {[
                  { label: 'Present', color: 'bg-green-500' },
                  { label: 'Late', color: 'bg-amber-500' },
                  { label: 'Absent', color: 'bg-red-500' },
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
      )}
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
      setShowNew(false);
      setTitle('');
      setBody('');
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
