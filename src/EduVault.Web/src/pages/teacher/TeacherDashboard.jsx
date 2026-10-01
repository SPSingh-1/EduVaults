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

export const TeacherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduleView, setScheduleView] = useState('today');
  const [teacherChartMode, setTeacherChartMode] = useState('attendance'); // 'attendance', 'enrollment'
  const [showAiPaperModal, setShowAiPaperModal] = useState(false);
  const [generatingPaper, setGeneratingPaper] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState(null);
  const [paperForm, setPaperForm] = useState({
    className: 'Class 10',
    subject: 'Science',
    topic: 'Light Reflection & Refraction',
    totalMarks: 50,
    durationMinutes: 90,
    difficulty: 'Moderate',
    instructions: 'Include MCQs, 3-mark conceptual questions, and 5-mark diagram questions.'
  });

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

  const handleGenerateQuestionPaper = async () => {
    setGeneratingPaper(true);
    try {
      const res = await apiClient.post('/school-admin/plan/generate-question-paper', paperForm);
      setGeneratedPaper(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate AI question paper.', 'error');
    } finally {
      setGeneratingPaper(false);
    }
  };

  const handlePrintQuestionPaper = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <Topbar 
        title="Teacher Dashboard" 
        subtitle="Academic Year 2023-24 - Live Overview" 
        actions={
          <button
            onClick={() => setShowAiPaperModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <span>✨ AI Question Paper</span>
          </button>
        }
      />

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

      {/* AI Question Paper Generator Modal */}
      {showAiPaperModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">✨</span>
                <div>
                  <h3 className="font-display font-black text-lg m-0">AI Examination & Worksheet Generator</h3>
                  <p className="text-xs text-purple-200 mt-0.5">Powered by Gemini AI curriculum intelligence</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowAiPaperModal(false); setGeneratedPaper(null); }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {!generatedPaper ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Target Class *</label>
                      <input 
                        value={paperForm.className}
                        onChange={e => setPaperForm(p => ({ ...p, className: e.target.value }))}
                        placeholder="e.g. Class 10"
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Subject *</label>
                      <input 
                        value={paperForm.subject}
                        onChange={e => setPaperForm(p => ({ ...p, subject: e.target.value }))}
                        placeholder="e.g. Science / Mathematics"
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Chapter / Topics Covered *</label>
                    <input 
                      value={paperForm.topic}
                      onChange={e => setPaperForm(p => ({ ...p, topic: e.target.value }))}
                      placeholder="e.g. Light Reflection and Refraction, Electricity"
                      className="input text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Total Marks</label>
                      <input 
                        type="number"
                        value={paperForm.totalMarks}
                        onChange={e => setPaperForm(p => ({ ...p, totalMarks: parseInt(e.target.value) || 50 }))}
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Duration (Mins)</label>
                      <input 
                        type="number"
                        value={paperForm.durationMinutes}
                        onChange={e => setPaperForm(p => ({ ...p, durationMinutes: parseInt(e.target.value) || 90 }))}
                        className="input text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Difficulty</label>
                      <select 
                        value={paperForm.difficulty}
                        onChange={e => setPaperForm(p => ({ ...p, difficulty: e.target.value }))}
                        className="input text-xs"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Hard">Hard / Challenging</option>
                        <option value="Mixed">Mixed (Standard Board)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Special Examiner Instructions (Optional)</label>
                    <textarea 
                      rows="2"
                      value={paperForm.instructions}
                      onChange={e => setPaperForm(p => ({ ...p, instructions: e.target.value }))}
                      placeholder="e.g. Include 5 MCQs, 3 numerical problems, and 2 case-study questions."
                      className="input text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={handleGenerateQuestionPaper}
                      disabled={generatingPaper}
                      className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <span>{generatingPaper ? '🤖 AI is drafting exam paper...' : '🚀 Generate Question Paper'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <span className="text-3xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md uppercase">Draft Ready</span>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">{generatedPaper.examTitle}</h4>
                      <p className="text-xs text-slate-400">{generatedPaper.className} • {generatedPaper.subject} • {generatedPaper.totalMarks} Marks ({generatedPaper.durationMinutes} Mins)</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setGeneratedPaper(null)}
                        className="btn-outline text-xs"
                      >
                        ← Modify Prompt
                      </button>
                      <button 
                        onClick={handlePrintQuestionPaper}
                        className="btn-primary text-xs flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / Export PDF</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Paper Printable Content Area */}
                  <div id="printable-question-paper" className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-800 font-serif leading-relaxed text-xs space-y-4">
                    <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
                      <h3 className="text-sm font-black uppercase tracking-wider">{generatedPaper.schoolName || 'EduVault Senior Secondary School'}</h3>
                      <div className="text-xs font-bold">{generatedPaper.examTitle}</div>
                      <div className="flex justify-between font-sans text-[11px] font-semibold mt-2 text-slate-600">
                        <span>Class: {generatedPaper.className}</span>
                        <span>Subject: {generatedPaper.subject}</span>
                        <span>Max Marks: {generatedPaper.totalMarks}</span>
                        <span>Time: {generatedPaper.durationMinutes} mins</span>
                      </div>
                    </div>

                    {generatedPaper.generalInstructions?.length > 0 && (
                      <div className="font-sans text-[11px] border-b border-slate-200 pb-2 mb-3">
                        <strong>General Instructions:</strong>
                        <ul className="list-disc list-inside mt-1 text-slate-600 space-y-0.5">
                          {generatedPaper.generalInstructions.map((ins, i) => (
                            <li key={i}>{ins}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {generatedPaper.sections?.map((sec, sIdx) => (
                      <div key={sIdx} className="space-y-3 pt-2">
                        <div className="font-sans font-bold text-slate-900 uppercase border-b border-slate-200 pb-1 flex justify-between">
                          <span>{sec.sectionName}</span>
                          <span>[{sec.sectionMarks} Marks]</span>
                        </div>
                        <div className="space-y-3 pl-2">
                          {sec.questions?.map((q, qIdx) => (
                            <div key={qIdx} className="space-y-1">
                              <div className="flex justify-between gap-4 font-sans text-xs">
                                <span className="font-semibold">{q.questionNo}. {q.text}</span>
                                <span className="font-bold shrink-0 text-slate-600">[{q.marks}]</span>
                              </div>
                              {q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-1.5 pl-4 font-sans text-[11px] text-slate-600 mt-1">
                                  {q.options.map((opt, oIdx) => (
                                    <div key={oIdx}>{opt}</div>
                                  ))}
                                </div>
                              )}
                              {q.answer && (
                                <div className="no-print mt-1 text-[10px] text-purple-700 bg-purple-50 p-1.5 rounded border border-purple-100 font-sans">
                                  <strong>Key:</strong> {q.answer}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Dedicated Teacher Classes ---
export default TeacherDashboard;
