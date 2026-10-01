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

export const StudentDashboard = () => {
  const [profile, setProfile] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [remarks, setRemarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('Semester Examination');
  const [dashboardTab, setDashboardTab] = useState('overview');
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryExamType, setSelectedHistoryExamType] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [detailedProfile, setDetailedProfile] = useState(null);
  const [printingCardIndex, setPrintingCardIndex] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [switchingSibling, setSwitchingSibling] = useState(false);

  const handleSwitchSibling = async (targetStudentId) => {
    setSwitchingSibling(true);
    try {
      const res = await apiClient.post(`/academics/student/switch-sibling/${targetStudentId}`);
      if (res.data?.token) {
        localStorage.setItem('eduvault_token', res.data.token);
        localStorage.setItem('eduvault_user', JSON.stringify(res.data.user));
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch sibling:', err);
      alert(err.response?.data?.error || 'Failed to switch student account.');
    } finally {
      setSwitchingSibling(false);
    }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const [histRes, profRes] = await Promise.all([
        apiClient.get('/exams/student/academic-history'),
        apiClient.get('/academics/student/profile').catch(() => null)
      ]);
      setHistoryList(histRes.data);
      if (profRes && profRes.data) {
        setDetailedProfile(profRes.data);
      }
    } catch (err) {
      console.error("Error loading academic history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (dashboardTab === 'history') {
      fetchHistory();
    }
  }, [dashboardTab]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintingCardIndex(null);
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const uniqueHistoryExamTypes = Array.from(
    new Set(historyList.flatMap(hist => hist.subjects.map(sub => sub.examType || '')))
  ).filter(Boolean);

  useEffect(() => {
    if (historyList.length > 0 && !selectedHistoryExamType) {
      const uniqueTypes = Array.from(
        new Set(historyList.flatMap(hist => hist.subjects.map(sub => sub.examType || '')))
      ).filter(Boolean);
      const defaultType = uniqueTypes.find(t => t === 'Semester Examination')
        || uniqueTypes.find(t => t === 'Final Examination')
        || uniqueTypes.find(t => t.toLowerCase().includes('final'))
        || uniqueTypes.find(t => t.toLowerCase().includes('semester'))
        || uniqueTypes[0]
        || '';
      setSelectedHistoryExamType(defaultType);
    }
  }, [historyList, selectedHistoryExamType]);

  const handlePrintHistory = (idx) => {
    setPrintingCardIndex(idx);
    setTimeout(() => {
      window.print();
    }, 150);
  };


  const fetchInvoices = async () => {
    try {
      const billRes = await apiClient.get('/billing/invoices');
      setInvoices(billRes.data);
    } catch (err) {
      console.error(err);
    }
  };



  const handleQuickPay = async (invoiceId) => {
    await executePaymentFlow(invoiceId, setPaymentLoading, fetchInvoices);
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load all data in parallel for fast first paint
        const [profRes, etRes, billRes, attRes, remarksRes, sibRes] = await Promise.all([
          apiClient.get('/academics/student/profile').catch(() => null),
          apiClient.get('/academics/exam-types').catch(() => ({ data: [] })),
          apiClient.get('/billing/invoices').catch(() => ({ data: [] })),
          apiClient.get('/academics/attendance/my').catch(() => ({ data: [] })),
          expressClient.get('/remarks').catch(() => ({ data: [] })),
          apiClient.get('/academics/student/siblings').catch(() => ({ data: [] })),
        ]);

        if (sibRes?.data) setSiblings(sibRes.data);

        const activeEnrollDate = profRes?.data?.enrollDate;
        setProfile(profRes?.data || JSON.parse(localStorage.getItem('eduvault_user')));

        if (etRes.data && etRes.data.length > 0) {
          const types = etRes.data.map(et => et.name || et.Name || (typeof et === 'string' ? et : ''));
          setExamTypes(types);
          if (types.includes('Semester Examination')) {
            setSelectedExamType('Semester Examination');
          } else {
            setSelectedExamType(types[0]);
          }
        } else {
          setExamTypes(['Semester Examination', 'Final Examination', 'Quarterly Examination', 'Unit Examination']);
        }

        setInvoices(billRes.data);

        const filteredAtt = (attRes.data || []).filter(a => !activeEnrollDate || a.date >= activeEnrollDate.split('T')[0]);
        setAttendanceList(filteredAtt);

        setRemarks(remarksRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);


  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const perfRes = await apiClient.get('/exams/student/performance', {
          params: { examType: selectedExamType }
        });
        setPerformance(perfRes.data);
      } catch (err) {
        console.error("Error loading performance:", err);
      }
    };
    if (selectedExamType) {
      fetchPerformance();
    }
  }, [selectedExamType]);

  const totalDays = attendanceList.length;
  const presentDays = attendanceList.filter(a => a.status === 'Present').length;
  const lateDays = attendanceList.filter(a => a.status === 'Late').length;
  const absentDays = attendanceList.filter(a => a.status === 'Absent').length;
  const realAttendancePercent = totalDays > 0
    ? ((presentDays + lateDays) / totalDays * 100).toFixed(1) + '%'
    : '0.0%';

  const todayStr = getTodayStr();
  const todayAtt = attendanceList.find(a => a.date === todayStr);

  const pendingAmount = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);

  const perfData = performance?.subjectsBreakdown?.map(s => ({
    subject: s.subject.length > 15 ? s.subject.substring(0, 15) + '...' : s.subject,
    marks: s.total
  })) || [];

  const attData = [
    { name: 'Present', value: presentDays || 0, color: '#10b981' },
    { name: 'Late', value: lateDays || 0, color: '#f59e0b' },
    { name: 'Absent', value: absentDays || 0, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const feeData = [
    { name: 'Paid', amount: totalPaid, fill: '#10b981' },
    { name: 'Outstanding', amount: pendingAmount, fill: '#ef4444' }
  ];

  const studentAverage = performance?.subjectsBreakdown?.length > 0
    ? performance.subjectsBreakdown.reduce((sum, s) => sum + s.total, 0) / performance.subjectsBreakdown.length
    : 85.0;

  const rankData = [
    { name: 'Your Average', score: parseFloat((Number(studentAverage) || 85).toFixed(1)), fill: '#3b82f6', colorGrad: 'yourAvgGrad' },
    { name: 'Class Average', score: parseFloat(performance?.classAverage ?? 76.5), fill: '#94a3b8', colorGrad: 'classAvgGrad' },
    { name: 'Class Highest', score: parseFloat(performance?.classHighest ?? 92.0), fill: '#10b981', colorGrad: 'classHighGrad' }
  ];

  const studentConfiguredWidgets = profile?.configuredWidgets || profile?.ConfiguredWidgets || [];
  const getStudentWidget = (key, defaultTitle) => {
    const found = studentConfiguredWidgets.find(w => w.widgetKey === key);
    return {
      isVisible: found ? found.isEnabled : true,
      title: found?.title || defaultTitle,
      timeRange: found?.timeRange || 'Academic Year'
    };
  };

  const attRateWidget = getStudentWidget('card.student.attendance_rate', 'Term Attendance Rate');
  const gpaCardWidget = getStudentWidget('card.student.gpa_standing', 'Current GPA Standing');
  const feesCardWidget = getStudentWidget('card.student.fee_balance', 'Outstanding Fee Balance');
  const rankCardWidget = getStudentWidget('card.student.class_rank', 'Class Rank Standing');
  const libraryCardWidget = getStudentWidget('card.student.library_loans', 'Active Library Loans');

  if (loading) {
    return <Loader message="Gathering your academic overview" />;
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Topbar title="Student Dashboard Overview" subtitle={`Welcome back, ${profile?.firstName || 'Student'}. Here's your live academic summary.`} />
      </div>

      {/* 👨‍👩‍👧‍👦 Multi-Sibling Switcher Bar (Parent Portal) */}
      {siblings && siblings.length > 1 && (
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 border border-indigo-200/60 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs no-print">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              👨‍👩‍👧
            </span>
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-indigo-700 block">
                Parent Portal • Multi-Child Switcher
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Viewing profile for: <strong className="text-slate-900">{profile?.firstName} {profile?.lastName}</strong> ({profile?.class || 'Grade'} - {profile?.section || 'Sec'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xs text-slate-500 font-semibold">Switch Child:</span>
            {siblings.map((sib) => (
              <button
                key={sib.studentId}
                disabled={sib.isCurrent || switchingSibling}
                onClick={() => handleSwitchSibling(sib.studentId)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  sib.isCurrent
                    ? 'bg-indigo-600 text-white shadow-xs cursor-default'
                    : 'bg-white hover:bg-indigo-50 text-slate-700 border border-slate-200 shadow-2xs hover:border-indigo-300'
                }`}
              >
                <span>{sib.firstName}</span>
                <span className="text-3xs opacity-80">({sib.className})</span>
                {sib.isCurrent && <span className="text-3xs">● Active</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Sub-Tabs */}
      <div className="flex no-print">
        <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200/50 shadow-inner">
          <button
            onClick={() => setDashboardTab('overview')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${dashboardTab === 'overview'
              ? 'bg-white text-primary shadow-sm border border-slate-200/30'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
              }`}
          >
            <span className="text-sm">📊</span>
            <span>Academic Overview</span>
          </button>
          <button
            onClick={() => setDashboardTab('history')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${dashboardTab === 'history'
              ? 'bg-white text-primary shadow-sm border border-slate-200/30'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
              }`}
          >
            <span className="text-sm">📜</span>
            <span>Academic History</span>
          </button>
          <button
            onClick={() => setDashboardTab('holidays')}
            className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${dashboardTab === 'holidays'
              ? 'bg-white text-primary shadow-sm border border-slate-200/30'
              : 'text-gray-500 hover:text-gray-800 hover:bg-white/40'
              }`}
          >
            <span className="text-sm">📅</span>
            <span>Holiday Calendar</span>
          </button>
        </div>
      </div>

      {dashboardTab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                key: 'attendance',
                isVisible: attRateWidget.isVisible,
                label: attRateWidget.title, 
                value: realAttendancePercent, 
                sub: todayAtt ? `Today: ${todayAtt.status}` : (totalDays > 0 ? '● On Track' : 'No Records'), 
                icon: CheckSquare, 
                color: 'text-blue-500', 
                bgColor: 'bg-blue-50/50',
                timeRange: attRateWidget.timeRange,
                subColor: todayAtt?.status === 'Absent' ? 'text-rose-500 font-bold' : todayAtt?.status === 'Present' ? 'text-emerald-600 font-bold' : 'text-gray-500'
              },
              { 
                key: 'gpa',
                isVisible: gpaCardWidget.isVisible,
                label: gpaCardWidget.title, 
                value: performance?.areMarksPublished !== false ? (performance?.semesterGpa || '0.00') : '🔒 Locked', 
                sub: performance?.areMarksPublished !== false ? 'Target: 4.00' : 'Awaiting Release', 
                icon: Award, 
                color: 'text-emerald-500', 
                bgColor: 'bg-emerald-50/50',
                timeRange: gpaCardWidget.timeRange
              },
              {
                key: 'fees',
                isVisible: feesCardWidget.isVisible,
                label: feesCardWidget.title,
                value: `Rs. ${Number(pendingAmount || 0).toLocaleString()}`,
                sub: pendingAmount > 0 ? 'Due soon' : 'All Clear',
                icon: CreditCard,
                color: 'text-rose-500',
                bgColor: 'bg-rose-50/50',
                timeRange: feesCardWidget.timeRange,
                warn: pendingAmount > 0,
                action: pendingAmount > 0 ? (
                  <button
                    onClick={() => handleQuickPay(invoices.find(i => i.status !== 'Paid')?.id)}
                    disabled={paymentLoading}
                    className="mt-2 text-[10px] font-bold text-red-650 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-lg transition-all w-full text-center border border-red-150/50 flex items-center justify-center gap-1"
                  >
                    {paymentLoading ? 'Processing...' : 'Pay Next Fee Item'}
                  </button>
                ) : null
              },
              { 
                key: 'rank',
                isVisible: rankCardWidget.isVisible,
                label: rankCardWidget.title, 
                value: performance?.areMarksPublished !== false ? (performance?.classRank || '1st / 1') : '🔒 Locked', 
                sub: performance?.areMarksPublished !== false ? 'Top 15%' : 'Awaiting Release', 
                icon: Trophy, 
                color: 'text-violet-500', 
                bgColor: 'bg-violet-50/50',
                timeRange: rankCardWidget.timeRange
              },
            ].filter(s => s.isVisible).map(s => (
              <div key={s.key} className="stat-card flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-400">{s.label}</div>
                    <div className={`font-display text-2xl font-bold ${s.warn ? 'text-rose-600' : 'text-primary'}`}>{s.value}</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-medium ${s.subColor || (s.warn ? 'text-rose-500' : 'text-gray-400')}`}>{s.sub}</span>
                      <span className="text-[9px] font-bold bg-slate-100 px-1.5 py-0.2 rounded text-slate-500">{s.timeRange}</span>
                    </div>
                  </div>
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${s.bgColor} shrink-0`}>
                    <s.icon className={`w-5.5 h-5.5 ${s.color} stroke-[1.75]`} />
                  </div>
                </div>
                {s.action}
              </div>
            ))}
          </div>

          {/* Dynamic Exam Filter Panel - Positioned directly above the graphs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm border-l-4 border-l-primary flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0 shadow-3xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-display font-bold text-slate-800 text-sm tracking-tight">Exam Segment Analytics</h4>
                <p className="text-[10px] text-slate-400 font-medium">Select an exam type to filter performance scores, averages, and rankings below</p>
              </div>
            </div>

            <div className="relative flex items-center w-full sm:w-auto shrink-0 shadow-3xs rounded-xl overflow-hidden">
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="pl-4 pr-10 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 hover:border-slate-350 focus:bg-white focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all cursor-pointer appearance-none min-w-[200px] w-full sm:w-auto"
              >
                {examTypes.map((et, i) => (
                  <option key={i} value={et}>
                    {et}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="card flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-display font-semibold text-primary text-sm m-0">Academic Subject Performance</h3>
                <p className="text-2xs text-gray-400">Total marks obtained per course segment</p>
              </div>
              <div className="h-64 w-full">
                {performance?.areMarksPublished !== false && perfData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perfData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="studentSubjectGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="subject" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomStudentTooltip isPercent={false} />} cursor={{ fill: '#f8fafc', opacity: 0.55 }} transitionDuration={180} />
                      <Bar
                        dataKey="marks"
                        name="Subject Marks"
                        fill="url(#studentSubjectGrad)"
                        radius={[4, 4, 0, 0]}
                        barSize={26}
                        activeBar={{ filter: 'brightness(1.08)', stroke: '#fff', strokeWidth: 1.5 }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : performance?.areMarksPublished === false ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200">
                    <Lock className="w-8 h-8 text-amber-500 mb-2" />
                    <div className="font-semibold text-xs text-primary mb-1">Grades Not Published Yet</div>
                    <div className="text-[10px] text-gray-400 max-w-xs font-light">Subject wise performance analytics are locked until report cards are released.</div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-xs">No subject exam records graded yet.</div>
                )}
              </div>
            </div>

            <div className="card flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-display font-semibold text-primary text-sm m-0">Class Performance Benchmarking</h3>
                <p className="text-2xs text-gray-400">Compare your score against class statistics</p>
              </div>
              <div className="h-64 w-full">
                {performance?.areMarksPublished !== false ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="yourAvgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.85} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.55} />
                        </linearGradient>
                        <linearGradient id="classAvgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.85} />
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.55} />
                        </linearGradient>
                        <linearGradient id="classHighGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.85} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomStudentTooltip isPercent={true} />} cursor={{ fill: '#f8fafc', opacity: 0.55 }} transitionDuration={180} />
                      <Bar
                        dataKey="score"
                        name="Performance Score"
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                        activeBar={{ filter: 'brightness(1.08)', stroke: '#fff', strokeWidth: 1.5 }}
                      >
                        {rankData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#${entry.colorGrad})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200">
                    <Lock className="w-8 h-8 text-amber-500 mb-2" />
                    <div className="font-semibold text-xs text-primary mb-1">Benchmarks Locked</div>
                    <div className="text-[10px] text-gray-400 max-w-xs font-light">Class rank benchmarking is hidden until release.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="card flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-display font-semibold text-primary text-sm m-0">Daily Attendance Distribution</h3>
                <p className="text-2xs text-gray-400">Overview of present, late and absent log counters</p>
              </div>
              <div className="h-64 flex items-center justify-center">
                {totalDays > 0 ? (
                  <div className="flex w-full items-center justify-around h-full">
                    <div className="w-1/2 h-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={attData}
                            innerRadius={55}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {attData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomStudentTooltip isPercent={false} />} transitionDuration={180} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 text-xs">
                      {attData.map(item => (
                        <div key={item.name} className="flex items-center gap-2.5 font-semibold">
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-400 font-medium">{item.name}:</span>
                          <span className="text-primary font-bold">{item.value} {item.value === 1 ? 'day' : 'days'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-xs">No daily attendance records.</div>
                )}
              </div>
            </div>

            <div className="card flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="font-display font-semibold text-primary text-sm m-0">School Fees Status</h3>
                <p className="text-2xs text-gray-400">Total fees settled vs pending balances</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={feeData} layout="vertical" margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="paidFeeTrack" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.85} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.55} />
                        </linearGradient>
                        <linearGradient id="outstandingFeeTrack" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.85} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.55} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomStudentTooltip isCurrency={true} />} cursor={{ fill: '#f8fafc', opacity: 0.55 }} transitionDuration={180} />
                      <Bar
                        dataKey="amount"
                        radius={[0, 4, 4, 0]}
                        barSize={20}
                        activeBar={{ filter: 'brightness(1.08)', stroke: '#fff', strokeWidth: 1.5 }}
                      >
                        {feeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#paidFeeTrack)' : 'url(#outstandingFeeTrack)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-4 space-y-2 max-h-64 overflow-y-auto pr-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pending Invoices</div>
                  {invoices.filter(i => i.status !== 'Paid').map(inv => (
                    <div key={inv.id} className="p-3 bg-red-50/40 border border-red-100/50 rounded-xl flex items-center justify-between gap-3 transition-all hover:bg-red-50/70">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-primary truncate" title={inv.desc}>{inv.desc}</div>
                        <div className="text-[9px] text-gray-400 font-light">Due: {inv.due}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-extrabold text-red-650">Rs. {inv.amount}</span>
                        <button
                          onClick={() => handleQuickPay(inv.id)}
                          disabled={paymentLoading}
                          className="btn-primary text-[9px] py-1 px-2.5 bg-red-600 hover:bg-red-700 border-none rounded-lg font-bold shadow-sm shadow-red-500/10 active:scale-95 transition-all text-white"
                        >
                          {paymentLoading ? '...' : 'Pay'}
                        </button>
                      </div>
                    </div>
                  ))}
                  {invoices.filter(i => i.status !== 'Paid').length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-16 italic">No pending dues. All clear!</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Remarks / Feedback Feed Section */}
          <div className="card">
            <h3 className="font-display font-bold text-primary text-sm mb-4">💬 Latest Feedback & Remarks from Teachers</h3>
            <div className="space-y-3">
              {remarks.length > 0 ? (
                remarks.map((r, i) => (
                  <div key={r._id || i} className="border border-gray-100 rounded-xl p-4 flex items-start gap-3 bg-gray-50/30">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {r.teacherName ? r.teacherName[0] : 'T'}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <div>
                          <span className="font-semibold text-sm text-primary">{r.teacherName}</span>
                          <span className="text-xs text-gray-400 ml-2">Teacher</span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{r.remarkText}</p>
                      <div className="mt-2">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-2xs font-bold ${r.tag === 'URGENT'
                          ? 'bg-red-100 text-red-800'
                          : r.tag === 'POSITIVE'
                            ? 'bg-green-100 text-green-800'
                            : r.tag === 'NEGATIVE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                          ● {r.tag}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400 text-xs">No feedback logged by your teachers yet.</div>
              )}
            </div>
          </div>
        </>
      ) : dashboardTab === 'history' ? (
        <div className="space-y-6">
          {printingCardIndex !== null && (
            <style dangerouslySetInnerHTML={{
              __html: `
              @media print {
                body, html {
                  background-color: white !important;
                  color: black !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .sidebar, .no-print, .no-print * {
                  display: none !important;
                }
                .main-content, .space-y-6 {
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  min-height: auto !important;
                  gap: 0 !important;
                }
                .history-card-item {
                  display: none !important;
                }
                .history-card-item-${printingCardIndex} {
                  display: block !important;
                  border: 1px solid #cbd5e1 !important;
                  border-radius: 12px !important;
                  padding: 24px !important;
                  box-shadow: none !important;
                  width: 100% !important;
                  margin: 0 !important;
                  position: relative !important;
                }
              }
            `}} />
          )}

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
            <div>
              <h3 className="font-display font-bold text-primary text-lg mb-1 flex items-center gap-2">
                📜 Prior Grade Level Records
              </h3>
              <p className="text-gray-400 text-xs">
                View your historical results and performance across previous classes in EduVault.
              </p>
            </div>
            {historyList.length > 0 && uniqueHistoryExamTypes.length > 0 && (
              <div className="relative flex items-center w-full sm:w-auto gap-2.5">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Exam Type:</span>
                <div className="relative flex items-center w-full sm:w-auto">
                  <BookOpen className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={selectedHistoryExamType}
                    onChange={(e) => setSelectedHistoryExamType(e.target.value)}
                    className="pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-350 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer appearance-none min-w-[200px] w-full sm:w-auto shadow-3xs"
                  >
                    {uniqueHistoryExamTypes.map((et, i) => (
                      <option key={i} value={et}>
                        {et}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div className="text-center py-12 text-slate-400 text-xs italic no-print">Loading prior class history...</div>
          ) : historyList.length === 0 ? (
            <div className="card text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center no-print">
              <GraduationCap className="w-10 h-10 text-slate-400 mb-3" />
              <div className="font-semibold text-xs text-primary mb-1">No Academic History Found</div>
              <div className="text-[10px] text-gray-400 max-w-xs mx-auto font-light leading-normal">
                There are no historical records for prior classes. Your academic history is populated after you are promoted to a higher grade.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {historyList.map((hist, idx) => {
                const filteredSubjects = hist.subjects.filter(sub => sub.examType === selectedHistoryExamType);

                const getFilteredGpaAndResult = () => {
                  if (!filteredSubjects.length) {
                    return { gpa: "0.00", status: "N/A" };
                  }
                  const totalPoints = filteredSubjects.reduce((acc, sub) => {
                    const gradePoints = {
                      "A+": 4.0,
                      "A": 3.7,
                      "B+": 3.3,
                      "B": 3.0,
                      "C": 2.0
                    }[sub.grade] || 1.0;
                    return acc + gradePoints;
                  }, 0);
                  const calculatedGpa = (totalPoints / filteredSubjects.length).toFixed(2);
                  const hasFail = filteredSubjects.some(sub => sub.totalMarks < 40);
                  const calculatedResult = hasFail ? "Fail" : "Pass";
                  return { gpa: calculatedGpa, status: calculatedResult };
                };

                const { gpa, status } = getFilteredGpaAndResult();

                return (
                  <div
                    key={idx}
                    className={`card bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 history-card-item history-card-item-${idx} ${printingCardIndex === idx ? 'active-print' : ''}`}
                  >
                    {/* Print-only School Header & Student Details */}
                    <div className="hidden print:block border-b-2 border-primary pb-4 mb-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">
                            {detailedProfile?.schoolName || 'GREENWOOD ACADEMY'}
                          </h1>
                          <p className="text-xs text-gray-500 font-medium">
                            {detailedProfile?.schoolAddress}
                            {detailedProfile?.schoolCity ? `, ${detailedProfile.schoolCity}` : ''}
                            {detailedProfile?.schoolWebsite ? ` | ${detailedProfile.schoolWebsite}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <h2 className="font-display font-bold text-lg text-primary">{selectedHistoryExamType.toUpperCase()}</h2>
                          <p className="text-xs font-semibold text-gray-400">Class Level: {hist.className}</p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-gray-100 text-sm space-y-2">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex gap-2">
                            <span className="text-gray-400 font-semibold uppercase text-xs">Student Name:</span>
                            <span className="font-bold text-primary">{detailedProfile?.firstName} {detailedProfile?.lastName}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-400 font-semibold uppercase text-xs">Student ID:</span>
                            <span className="font-mono text-gray-700 font-semibold">{detailedProfile?.studentId}</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center w-full">
                          <div className="flex gap-2">
                            <span className="text-gray-400 font-semibold uppercase text-xs">Guardian Name:</span>
                            <span className="font-semibold text-primary">{detailedProfile?.guardianName || 'N/A'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-400 font-semibold uppercase text-xs">Contact Number:</span>
                            <span className="font-medium text-gray-700">{detailedProfile?.guardianPhone || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Class Summary Header */}
                    <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">HISTORICAL GRADE</span>
                          {hist.academicYear && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200/60">
                              📅 Session {hist.academicYear}
                            </span>
                          )}
                        </div>
                        <div className="font-display text-lg font-bold text-primary mt-0.5">{hist.className}</div>
                        {hist.academicRemark && (
                          <div className="text-[11px] text-slate-500 mt-1 italic font-medium">
                            📝 {hist.academicRemark}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">GPA ({selectedHistoryExamType})</div>
                          <div className="font-semibold text-xs text-primary mt-0.5">GPA: {gpa}</div>
                        </div>
                        <div className="border-l border-slate-200 pl-4">
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">RESULT STATUS</div>
                          <div className="mt-0.5">
                            {status.includes("Pass") || hist.finalResult?.includes("Pass") ? (
                              <span className="badge badge-success text-[10px] py-0.5 px-2 font-extrabold uppercase tracking-wider">{hist.finalResult || status}</span>
                            ) : status.includes("Fail") || hist.finalResult?.includes("Fail") ? (
                              <span className="badge badge-danger text-[10px] py-0.5 px-2 font-extrabold uppercase tracking-wider">{hist.finalResult || status}</span>
                            ) : (
                              <span className="badge badge-secondary text-[10px] py-0.5 px-2 font-extrabold uppercase tracking-wider">{hist.finalResult || status || 'N/A'}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handlePrintHistory(idx)}
                          disabled={filteredSubjects.length === 0}
                          className="btn-primary text-[10px] py-1.5 px-3 bg-primary hover:bg-primary-dark rounded-xl font-bold flex items-center gap-1.5 active:scale-95 transition-all text-white border-none select-none disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print / PDF
                        </button>
                      </div>
                    </div>

                    {/* Subjects Performance List */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="py-2.5 text-[10px] font-bold text-slate-500 uppercase">Subject</th>
                            <th className="py-2.5 text-[10px] font-bold text-slate-500 uppercase no-print">Exam Cycle</th>
                            <th className="py-2.5 text-[10px] font-bold text-slate-500 uppercase text-center">Internal (30)</th>
                            <th className="py-2.5 text-[10px] font-bold text-slate-500 uppercase text-center">Theory (70)</th>
                            <th className="py-2.5 text-[10px] font-bold text-slate-500 uppercase text-center">Total (100)</th>
                            <th className="py-2.5 text-[10px] font-bold text-slate-500 uppercase text-center">Grade</th>
                            <th className="py-2.5 text-[10px] font-bold text-slate-500 uppercase text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredSubjects.map((sub, sIdx) => (
                            <tr key={sIdx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-3 text-xs font-bold text-primary">{sub.subjectName}</td>
                              <td className="py-3 text-xs text-slate-500 font-medium no-print">{sub.examType}</td>
                              <td className="py-3 text-xs text-slate-600 font-mono text-center font-semibold">{sub.internalMarks}</td>
                              <td className="py-3 text-xs text-slate-600 font-mono text-center font-semibold">{sub.theoryMarks}</td>
                              <td className="py-3 text-xs text-primary font-mono text-center font-bold">{sub.totalMarks}</td>
                              <td className="py-3 text-xs text-center">
                                <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 text-[10px] font-bold rounded">
                                  {sub.grade}
                                </span>
                              </td>
                              <td className="py-3 text-xs text-right">
                                {sub.status === "Pass" ? (
                                  <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200/50">Pass</span>
                                ) : (
                                  <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200/50">Fail</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {filteredSubjects.length === 0 && (
                            <tr>
                              <td colSpan="7" className="py-6 text-center text-xs text-slate-400 italic">
                                No marksheet data found for exam type "{selectedHistoryExamType}" in this class.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Print-only GPA Summary Block */}
                    <div className="hidden print:flex print:flex-row print:justify-between border border-gray-255 rounded-xl p-4 mt-8 bg-gray-50/50 gap-4">
                      <div className="flex-1">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Exam GPA</div>
                        <div className="font-display text-lg font-black text-primary">{gpa}</div>
                      </div>
                      <div className="flex-1 border-l border-gray-200 pl-4">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Result Status</div>
                        <div className="font-display text-lg font-black text-blue-600">{status}</div>
                      </div>
                    </div>

                    {/* Print-only Signatures */}
                    <div className="hidden print:flex justify-between items-center mt-16 pt-8 border-t border-gray-100 text-center">
                      <div className="w-48">
                        <div className="h-10"></div>
                        <div className="border-t border-gray-400 text-xs font-semibold text-gray-500 pt-1.5">Class Teacher Signature</div>
                      </div>
                      <div className="w-48">
                        <div className="h-10"></div>
                        <div className="border-t border-gray-400 text-xs font-semibold text-gray-500 pt-1.5">Principal Signature</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <StudentHolidays />
      )}
    </div>
  );
};

// --- Student Attendance ---
export default StudentDashboard;
