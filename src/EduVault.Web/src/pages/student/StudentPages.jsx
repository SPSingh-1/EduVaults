import { Outlet } from 'react-router-dom';
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
  ChevronDown
} from 'lucide-react';


const loadScript = (src) => {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const studentLinks = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/student/dashboard' },
  { icon: Calendar, label: 'Daily Schedule', path: '/student/schedule' },
  { icon: CheckSquare, label: 'Attendance', path: '/student/attendance' },
  { icon: Trophy, label: 'Results', path: '/student/results' },
  { icon: ClipboardList, label: 'Exam Timetable', path: '/student/exams' },
  { icon: PenTool, label: 'Homework', path: '/student/homework' },
  { icon: Wallet, label: 'Fees', path: '/student/fees' },
  { icon: Megaphone, label: 'Notices', path: '/student/notices' },
  { icon: User, label: 'Profile', path: '/student/profile' },
];

const CustomStudentTooltip = ({ active, payload, label, isPercent, isCurrency }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-100/80 p-3 rounded-2xl shadow-[0_12px_30px_-5px_rgba(0,0,0,0.08)] transition-all">
        <p className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{label || payload[0].name}</p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-2xs text-slate-550 font-semibold">{item.name || 'Value'}:</span>
            <span className="text-xs font-black text-slate-800 font-mono">
              {isCurrency ? `Rs. ${item.value.toLocaleString()}` : isPercent ? `${item.value}%` : `${item.value}/100`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const StudentLayout = () => (
  <div className="flex">
    <Sidebar links={studentLinks} role="student" />
    <main className="main-content flex-1"><Outlet /></main>
  </div>
);

// --- Student Dashboard ---
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
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [detailedProfile, setDetailedProfile] = useState(null);
  const [selectedHistoryExamType, setSelectedHistoryExamType] = useState('');
  const [printingCardIndex, setPrintingCardIndex] = useState(null);

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
    if (!invoiceId) return;
    setPaymentLoading(true);
    try {
      const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        setPaymentLoading(false);
        return;
      }

      // 1. Create Razorpay order
      const orderRes = await apiClient.post('/billing/create-order', { invoiceId });
      const { orderId, amount, currency, keyId, isMock } = orderRes.data;

      const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

      // 2. Setup checkout options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "EduVault Payments",
        description: "School Fee Invoice Payment",
        order_id: isMock ? undefined : orderId,
        handler: async function (response) {
          setPaymentLoading(true);
          try {
            // 3. Verify payment signature on backend
            await apiClient.post('/billing/verify-payment', {
              invoiceId: invoiceId,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature || 'mock_signature'
            });
            alert('Payment received and verified successfully!');
            fetchInvoices();
          } catch (err) {
            alert('Payment verification failed: ' + (err.response?.data?.error || err.message));
          } finally {
            setPaymentLoading(false);
          }
        },
        prefill: {
          name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`,
          email: userProfile.email || '',
        },
        theme: {
          color: "#1a2744"
        }
      };

      if (isMock) {
        if (window.confirm("Razorpay credentials not configured. Proceed with simulated payment?")) {
          await options.handler({
            razorpay_order_id: orderId,
            razorpay_payment_id: `pay_mock_${Math.random().toString(36).substring(7)}`,
            razorpay_signature: 'mock_signature'
          });
        } else {
          setPaymentLoading(false);
        }
      } else {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          alert("Payment failed: " + response.error.description);
        });
        rzp.open();
      }
    } catch (err) {
      const errMsg = err.response?.data?.error;
      if (errMsg === 'PAYMENT_NOT_CONFIGURED') {
        alert('PAYMENT_NOT_CONFIGURED');
      } else {
        alert(errMsg || 'Order creation failed.');
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const profRes = await apiClient.get('/academics/student/profile').catch(() => null);
        const activeEnrollDate = profRes?.data?.enrollDate;
        setProfile(profRes?.data || JSON.parse(localStorage.getItem('eduvault_user')));

        const etRes = await apiClient.get('/academics/exam-types');
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

        const billRes = await apiClient.get('/billing/invoices');
        setInvoices(billRes.data);

        const attRes = await apiClient.get('/academics/attendance/my');
        const filteredAtt = attRes.data.filter(a => !activeEnrollDate || a.date >= activeEnrollDate.split('T')[0]);
        setAttendanceList(filteredAtt);

        // Fetch remarks
        const remarksRes = await expressClient.get('/remarks');
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
    { name: 'Your Average', score: parseFloat(studentAverage.toFixed(1)), fill: '#3b82f6', colorGrad: 'yourAvgGrad' },
    { name: 'Class Average', score: parseFloat(performance?.classAverage ?? 76.5), fill: '#94a3b8', colorGrad: 'classAvgGrad' },
    { name: 'Class Highest', score: parseFloat(performance?.classHighest ?? 92.0), fill: '#10b981', colorGrad: 'classHighGrad' }
  ];

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Topbar title="Student Dashboard Overview" subtitle={`Welcome back, ${profile?.firstName || 'Student'}. Here's your academic summary.`} />
      </div>

      {/* Dashboard Sub-Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-3 no-print">
        <button
          onClick={() => setDashboardTab('overview')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${dashboardTab === 'overview'
              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-white text-gray-500 border-gray-200/60 hover:text-primary hover:border-primary/20 hover:bg-gray-50'
            }`}
        >
          <span>📊</span>
          <span>Academic Overview</span>
        </button>
        <button
          onClick={() => setDashboardTab('history')}
          className={`flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${dashboardTab === 'history'
              ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
              : 'bg-white text-gray-500 border-gray-200/60 hover:text-primary hover:border-primary/20 hover:bg-gray-50'
            }`}
        >
          <span>📜</span>
          <span>Academic History</span>
        </button>
      </div>

      {dashboardTab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Attendance', value: realAttendancePercent, sub: totalDays > 0 ? 'On Track' : 'No Records', icon: CheckSquare, color: 'text-blue-500', bgColor: 'bg-blue-50/50' },
              { label: 'Semester GPA', value: performance?.areMarksPublished !== false ? (performance?.semesterGpa || '0.00') : '🔒 Locked', sub: performance?.areMarksPublished !== false ? 'Target: 4.00' : 'Awaiting Release', icon: Award, color: 'text-emerald-500', bgColor: 'bg-emerald-50/50' },
              {
                label: 'Outstanding Fees',
                value: `Rs. ${pendingAmount.toLocaleString()}`,
                sub: pendingAmount > 0 ? 'Due soon' : 'All Clear',
                icon: CreditCard,
                color: 'text-rose-500',
                bgColor: 'bg-rose-50/50',
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
              { label: 'Rank', value: performance?.areMarksPublished !== false ? (performance?.classRank || '1st / 1') : '🔒 Locked', sub: performance?.areMarksPublished !== false ? 'Top 15%' : 'Awaiting Release', icon: Trophy, color: 'text-violet-500', bgColor: 'bg-violet-50/50' },
            ].map(s => (
              <div key={s.label} className="stat-card flex flex-col justify-between min-h-[110px] hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-gray-400">{s.label}</div>
                    <div className={`font-display text-2xl font-bold ${s.warn ? 'text-rose-600' : 'text-primary'}`}>{s.value}</div>
                    <div className={`text-[10px] font-medium ${s.warn ? 'text-rose-500' : 'text-gray-400'}`}>{s.sub}</div>
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4.5 rounded-2xl border border-slate-100 shadow-3xs gap-3">
            <div className="space-y-0.5">
              <h4 className="font-display font-bold text-primary text-xs uppercase tracking-wider">Exam Segment Analytics</h4>
              <p className="text-[10px] text-gray-400">Select an exam type to filter performance scores, averages, and rankings below</p>
            </div>
            <div className="relative flex items-center w-full sm:w-auto">
              <BookOpen className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
                className="pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-350 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer appearance-none min-w-[220px] w-full sm:w-auto"
              >
                {examTypes.map((et, i) => (
                  <option key={i} value={et}>
                    {et}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
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
      ) : (
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
                        <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">PREVIOUS CLASS</div>
                        <div className="font-display text-lg font-bold text-primary mt-0.5">{hist.className}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">GPA ({selectedHistoryExamType})</div>
                          <div className="font-semibold text-xs text-primary mt-0.5">GPA: {gpa}</div>
                        </div>
                        <div className="border-l border-slate-200 pl-4">
                          <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">RESULT STATUS</div>
                          <div className="mt-0.5">
                            {status === "Pass" ? (
                              <span className="badge badge-success text-[10px] py-0.5 px-2 font-extrabold uppercase tracking-wider">Pass</span>
                            ) : status === "Fail" ? (
                              <span className="badge badge-danger text-[10px] py-0.5 px-2 font-extrabold uppercase tracking-wider">Fail</span>
                            ) : (
                              <span className="badge badge-secondary text-[10px] py-0.5 px-2 font-extrabold uppercase tracking-wider">N/A</span>
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
      )}
    </div>
  );
};

// --- Student Attendance ---
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
    return status === 'Present'
      ? 'bg-green-500 text-white hover:bg-green-600'
      : status === 'Late'
        ? 'bg-amber-500 text-white hover:bg-amber-600'
        : 'bg-red-500 text-white hover:bg-red-600';
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div>
      <Topbar title="Attendance Log" subtitle="Academic Presence Tracker" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Attendance Rate', value: attendanceRate, color: 'text-primary', icon: '📈' },
          { label: 'Present Days', value: presentCount, color: 'text-green-600', icon: '✅' },
          { label: 'Late Days', value: lateCount, color: 'text-amber-500', icon: '⏱️' },
          { label: 'Absent Days', value: absentCount, color: 'text-red-500', icon: '❌' },
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

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-primary text-lg">
              📅 {monthNames[month]} {year}
            </h3>
            <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="btn-outline px-3 py-1.5 text-xs">◀ Prev</button>
              <button onClick={handleNextMonth} className="btn-outline px-3 py-1.5 text-xs">Next ▶</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-gray-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>

          {loading ? (
            <div className="py-24 text-center text-gray-400 text-sm">Loading attendance logs...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(cd => {
                if (cd.padding) {
                  return <div key={cd.key} className="aspect-square bg-gray-50/50 rounded-lg"></div>;
                }

                const hasRecord = !!cd.record;
                return (
                  <button
                    key={cd.key}
                    onClick={() => cd.record && setSelectedRecord(cd.record)}
                    disabled={!hasRecord}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all ${hasRecord
                        ? `${getStatusColor(cd.record.status)} border-transparent font-bold cursor-pointer hover:scale-105 active:scale-95 shadow-sm`
                        : 'border-gray-100 text-gray-300 bg-gray-50/30'
                      }`}
                  >
                    <span className="text-sm">{cd.day}</span>
                    {hasRecord && (
                      <span className="text-[9px] mt-0.5 opacity-90">
                        {cd.record.status === 'Present' ? 'P' : cd.record.status === 'Late' ? 'L' : 'A'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="card h-fit">
          <h3 className="font-display font-bold text-primary text-base mb-4">📝 Attendance Details</h3>
          {selectedRecord ? (
            <div className="space-y-4">
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase">Date</div>
                <div className="text-sm font-semibold text-primary">{new Date(selectedRecord.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
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
  );
};

// --- Student Results ---
export const StudentResults = () => {
  const [perf, setPerf] = useState(null);
  const [profile, setProfile] = useState(null);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('Semester Examination');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const etRes = await apiClient.get('/academics/exam-types');
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
      } catch (err) {
        console.error("Error loading exam types, falling back to defaults", err);
        setExamTypes(['Semester Examination', 'Final Examination', 'Quarterly Examination', 'Unit Examination']);
      }

      try {
        const profRes = await apiClient.get('/academics/student/profile');
        setProfile(profRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await apiClient.get('/exams/student/performance', {
          params: { examType: selectedExamType }
        });
        setPerf(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (selectedExamType) {
      fetchPerformance();
    }
  }, [selectedExamType]);

  const handlePrint = () => {
    window.print();
  };

  const examDropdown = (
    <div className="relative flex items-center w-full sm:w-auto">
      <BookOpen className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
      <select
        value={selectedExamType}
        onChange={(e) => setSelectedExamType(e.target.value)}
        className="pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-350 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer appearance-none w-full sm:min-w-[200px]"
      >
        {examTypes.map((et, i) => (
          <option key={i} value={et}>
            {et}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );

  if (perf && perf.areMarksPublished === false) {
    return (
      <div>
        {/* Mobile View Header */}
        <div className="sm:hidden no-print">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" />
          <div className="flex flex-col gap-2.5 mb-5 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
            {examDropdown}
          </div>
        </div>
        {/* Desktop View Header */}
        <div className="hidden sm:block no-print">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" actions={
            <div className="flex items-center gap-3">
              {examDropdown}
            </div>
          } />
        </div>

        <div className="card text-center py-20 max-w-md mx-auto mt-12 border border-slate-100 bg-white shadow-lg rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-100">🔒</div>
          <h3 className="font-display font-bold text-lg text-primary mb-2">Report Cards Not Released</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 font-light">
            {perf.message || "Your semester report cards and final grades have not been officially published by the school administration yet."}
          </p>
          <div className="inline-block px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            Status: Awaiting Admin Release
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print">
        {/* Mobile View Header */}
        <div className="sm:hidden">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" />
          <div className="flex flex-col gap-2.5 mb-5 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
            {examDropdown}
            <button onClick={handlePrint} className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2.5 select-none active:scale-95 transition-all w-full">
              <Printer className="w-4.5 h-4.5" /> Download PDF Report Card
            </button>
          </div>
        </div>
        {/* Desktop View Header */}
        <div className="hidden sm:block">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" actions={
            <div className="flex items-center gap-3">
              {examDropdown}
              <button onClick={handlePrint} className="btn-primary text-xs flex items-center gap-1.5 select-none active:scale-95 transition-all">
                <Printer className="w-4 h-4" /> Download PDF Report Card
              </button>
            </div>
          } />
        </div>
      </div>

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
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
          }
          .printable-report-card {
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

      <div className="grid grid-cols-3 gap-4 mb-6 no-print">
        {[
          { l: 'Semester GPA', v: perf?.semesterGpa || '3.85', c: 'text-primary' },
          { l: 'Cumulative GPA', v: perf?.cumulativeGpa || '3.72', c: 'text-blue-600' },
          { l: 'Class Rank', v: perf?.classRank || '5th / 40', c: 'text-green-600' },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.l}</div>
            <div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card printable-report-card">
        <div className="hidden print:block border-b-2 border-primary pb-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">{profile?.schoolName || 'GREENWOOD ACADEMY'}</h1>
              <p className="text-xs text-gray-500 font-medium">
                {profile?.schoolAddress}{profile?.schoolCity ? `, ${profile.schoolCity}` : ''} | {profile?.schoolWebsite || 'https://greenwood.edu'}
              </p>
            </div>
            <div className="text-right">
              <h2 className="font-display font-bold text-lg text-primary">{selectedExamType.toUpperCase()}</h2>
              <p className="text-xs font-semibold text-gray-400">Academic Year: {profile?.academicYear || '2023-24'}</p>
            </div>
          </div>
        </div>


        <div className="hidden print:block mb-6 pb-6 border-b border-gray-100 text-sm space-y-2">
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Student Name:</span>
              <span className="font-bold text-primary">{profile?.firstName} {profile?.lastName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Student ID:</span>
              <span className="font-mono text-gray-700 font-semibold">{profile?.studentId}</span>
            </div>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Class:</span>
              <span className="font-semibold text-primary">{profile?.class} - {profile?.section}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Enrollment Date:</span>
              <span className="font-medium text-gray-700">{profile?.enrollDate}</span>
            </div>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Father Name:</span>
              <span className="font-semibold text-primary">{profile?.guardianName || 'N/A'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Contact Number:</span>
              <span className="font-medium text-gray-700">{profile?.guardianPhone || 'N/A'}</span>
            </div>
          </div>
        </div>

        <h3 className="font-display font-semibold text-primary mb-4 print:text-base">Detailed Subject Breakdown</h3>

        <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-150">
                <th className="table-th text-left print:text-xs print:py-2">Subject</th>
                <th className="table-th text-center print:text-xs print:py-2">Internal (30)</th>
                <th className="table-th text-center print:text-xs print:py-2">Exam (70)</th>
                <th className="table-th text-center print:text-xs print:py-2">Total (100)</th>
                <th className="table-th text-center print:text-xs print:py-2">Grade</th>
                <th className="table-th text-center print:text-xs print:py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {perf?.subjectsBreakdown?.map((s, i) => {
                const isPass = s.status === 'Pass' || s.status?.toLowerCase() === 'pass';
                const gradeUpper = s.grade?.toUpperCase() || '';
                const isGoodGrade = gradeUpper.startsWith('A') || gradeUpper.startsWith('B') || gradeUpper === 'O';
                const isPoorGrade = gradeUpper.startsWith('C') || gradeUpper.startsWith('D') || gradeUpper === 'E';
                const gradeColor = isGoodGrade ? 'text-emerald-600' : isPoorGrade ? 'text-amber-500' : 'text-rose-600';

                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 print:border-gray-100 transition-colors">
                    <td className="table-td font-semibold text-sm text-primary print:py-2.5 print:text-xs">{s.subject}</td>
                    <td className="table-td text-sm text-center print:py-2.5 print:text-xs">{s.internal}</td>
                    <td className="table-td text-sm text-center print:py-2.5 print:text-xs">{s.exam}</td>
                    <td className="table-td text-sm font-bold text-center print:py-2.5 print:text-xs">{s.total}</td>
                    <td className="table-td print:py-2.5 text-center"><span className={`font-bold text-sm print:text-xs ${gradeColor}`}>{s.grade}</span></td>
                    <td className="table-td print:py-2.5 text-center">
                      <span className={`${isPass
                          ? 'badge-success print:bg-green-50 print:text-green-800 print:border print:border-green-200'
                          : 'badge-danger print:bg-red-50 print:text-red-800 print:border print:border-red-200'
                        } print:text-[10px]`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!perf?.subjectsBreakdown || perf.subjectsBreakdown.length === 0) && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No exam records graded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hidden print:flex print:flex-row print:justify-between border border-gray-250 rounded-xl p-4 mt-8 bg-gray-50/50 gap-4">
          <div className="flex-1">
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Semester GPA</div>
            <div className="font-display text-lg font-black text-primary">{perf?.semesterGpa}</div>
          </div>
          <div className="flex-1 border-l border-gray-200 pl-4">
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Cumulative GPA</div>
            <div className="font-display text-lg font-black text-blue-600">{perf?.cumulativeGpa}</div>
          </div>
          <div className="flex-1 border-l border-gray-200 pl-4">
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Class Rank</div>
            <div className="font-display text-lg font-black text-green-600">{perf?.classRank}</div>
          </div>
        </div>

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
    </div>
  );
};

// --- Student Fees ---
const generateMockPaymentId = () => {
  return `pay_mock_${Math.random().toString(36).substring(7)}`;
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

export const StudentFees = () => {
  const [invoices, setInvoices] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchInvoicesAndStructures = async () => {
    try {
      const res = await apiClient.get('/billing/invoices');
      setInvoices(res.data);

      const structRes = await apiClient.get('/billing/my-fee-structures');
      setFeeStructures(structRes.data);

      const txnRes = await apiClient.get('/billing/transactions');
      setTransactions(txnRes.data);
    } catch (err) {
      console.error('Error loading fees data:', err);
    }
  };

  useEffect(() => {
    fetchInvoicesAndStructures();
  }, []);

  const handlePay = async (invoiceId) => {
    setLoading(true);
    try {
      const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 1. Create Razorpay order
      const orderRes = await apiClient.post('/billing/create-order', { invoiceId });
      const { orderId, amount, currency, keyId, isMock } = orderRes.data;

      const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

      // 2. Setup checkout options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "EduVault Payments",
        description: "School Fee Invoice Payment",
        order_id: isMock ? undefined : orderId,
        handler: async function (response) {
          setLoading(true);
          try {
            // 3. Verify payment signature on backend
            await apiClient.post('/billing/verify-payment', {
              invoiceId: invoiceId,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature || 'mock_signature'
            });
            alert('Payment received and verified successfully!');
            fetchInvoicesAndStructures();
          } catch (err) {
            alert('Payment verification failed: ' + (err.response?.data?.error || err.message));
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`,
          email: userProfile.email || '',
        },
        theme: {
          color: "#1a2744"
        }
      };

      if (isMock) {
        // Mock gateway fallback for easy demonstration/testing
        if (window.confirm("Razorpay credentials not configured. Proceed with simulated payment?")) {
          // Trigger the handler directly with fake parameters
          await options.handler({
            razorpay_order_id: orderId,
            razorpay_payment_id: generateMockPaymentId(),
            razorpay_signature: 'mock_signature'
          });
        } else {
          setLoading(false);
        }
      } else {
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
          alert("Payment failed: " + response.error.description);
        });
        rzp.open();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Order creation failed.');
    } finally {
      setLoading(false);
    }
  };

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredInvoices = invoices.filter(t => {
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.due) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.due) > to) return false;
    }
    return true;
  });

  const filteredTransactions = transactions.filter(t => {
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.date) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.date) > to) return false;
    }
    return true;
  });

  const pendingAmount = filteredInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = filteredInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const paidInvoices = filteredInvoices.filter(i => i.status === 'Paid');
  const lastPaymentVal = paidInvoices.length > 0 ? paidInvoices[0].amount : 0;

  return (
    <div>
      <Topbar title="Fees & Payments" subtitle="Review your financial standing and manage school dues." />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <span className="text-xs font-semibold text-gray-500">📅 Filter Invoices & Payments by Date Range:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { l: 'Total Outstanding', v: `Rs. ${pendingAmount.toLocaleString()}`, c: 'text-red-500' },
          { l: 'Total Paid', v: `Rs. ${totalPaid.toLocaleString()}`, c: 'text-green-600' },
          { l: 'Last Payment Amount', v: lastPaymentVal > 0 ? `Rs. ${lastPaymentVal.toLocaleString()}` : 'Rs. 0.00', c: 'text-blue-600' }
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.l}</div>
            <div className={`font-display text-xl font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-2">
          <h3 className="font-display font-semibold text-primary mb-4">Pending & Recent Invoices</h3>
          <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/50">
                <tr className="border-b border-slate-150">
                  <th className="table-th text-left">Fee Description</th>
                  <th className="table-th text-center">Due Date</th>
                  <th className="table-th text-center">Amount</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((f, i) => (
                  <tr key={f.id || i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="table-td"><div className="font-semibold text-sm text-primary">{f.desc}</div><div className="text-2xs text-gray-400">{f.sub}</div></td>
                    <td className="table-td text-center text-sm font-medium text-slate-650">{f.due}</td>
                    <td className="table-td text-center font-bold text-slate-800">Rs. {f.amount}</td>
                    <td className="table-td text-center"><span className={f.status === 'Paid' ? 'badge-success' : 'badge-warning'}>{f.status}</span></td>
                    <td className="table-td text-center">
                      {f.status !== 'Paid' && (
                        <button onClick={() => handlePay(f.id)} disabled={loading} className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-gray-400 text-sm">No fee structures invoiced yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-semibold text-primary mb-4">🏫 Yearly Fee Schedule</h3>
          <p className="text-xs text-gray-400 mb-4">Fee structures configured by school administration for your grade level.</p>
          <div className="space-y-3">
            {feeStructures.map((fs, idx) => (
              <div key={fs.id || idx} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-primary">{fs.name}</div>
                  <div className="text-xs text-gray-400">{fs.frequency} · Grade {fs.grade}</div>
                </div>
                <div className="font-bold text-primary text-sm">Rs. {fs.amount.toLocaleString()}</div>
              </div>
            ))}
            {feeStructures.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs">No applicable fee structures set.</div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="card mt-6">
        <h3 className="font-display font-semibold text-primary mb-4">📋 Payment Transaction History</h3>
        <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-150">
                <th className="table-th text-left">Reference Number</th>
                <th className="table-th text-left">Fee Description</th>
                <th className="table-th text-center">Date</th>
                <th className="table-th text-center">Payment Method</th>
                <th className="table-th text-center">Amount</th>
                <th className="table-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t, i) => (
                <tr key={t.id || i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="table-td font-mono text-xs text-primary font-bold">{t.referenceNumber}</td>
                  <td className="table-td text-sm font-semibold text-slate-700">{t.feeName}</td>
                  <td className="table-td text-center text-xs text-gray-400 font-medium">{t.date}</td>
                  <td className="table-td text-center text-xs text-gray-500 font-medium">{t.paymentMethod}</td>
                  <td className="table-td text-center text-sm font-bold text-primary">Rs. {t.amount.toLocaleString()}</td>
                  <td className="table-td text-center">
                    <span className={t.status === 'success' ? 'badge-success' : 'badge-danger'}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No transactions completed yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Student Notices ---
export const StudentNotices = () => {
  const { markAllAsRead } = useNotifications();
  const [notices, setNotices] = useState([]);
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'schooladmin', 'teacher'
  const [enrollDate, setEnrollDate] = useState(null);

  const filteredNotices = notices.filter(n => {
    // Exclude system alerts (superadmin notices) for students
    if (n.senderRole === 'superadmin') {
      return false;
    }
    // Exclude old notices posted before promotion date
    if (enrollDate && new Date(n.createdAt) < new Date(enrollDate)) {
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

  useEffect(() => {
    const fetchEnrollDate = async () => {
      try {
        const res = await apiClient.get('/academics/student/profile');
        if (res.data && res.data.enrollDate) {
          setEnrollDate(res.data.enrollDate);
        }
      } catch (err) {
        console.error("Error fetching student profile for notices:", err);
      }
    };
    fetchEnrollDate();

    const fetchNotices = async () => {
      try {
        const res = await expressClient.get('/notifications');
        setNotices(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotices();

    const token = localStorage.getItem('eduvault_token');
    if (token) {
      const expressUrl = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:5005/api';
      const socketUrl = expressUrl.replace(/\/api$/, '');
      const socket = io(socketUrl, {
        auth: { token }
      });
      socket.on('notification', (notif) => {
        setNotices(prev => [notif, ...prev]);
      });
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (notices.length > 0) {
      markAllAsRead();
    }
  }, [notices]);
  return (
    <div>
      <Topbar title="Notices & Announcements" />

      {/* Filtering Tabs */}
      <div className="flex gap-1.5 bg-slate-100/60 p-1.5 rounded-2xl w-fit border border-slate-200/30 mb-6 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'All Announcements', Icon: Megaphone },
          { id: 'schooladmin', label: 'School Admin Notices', Icon: Building },
          { id: 'teacher', label: 'Teacher Notices', Icon: GraduationCap }
        ].map(tab => {
          const isActive = activeFilterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterTab(tab.id)}
              className={`px-4.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 shrink-0 cursor-pointer transition-all duration-200 ease-out select-none active:scale-95 ${isActive
                  ? 'bg-white text-primary shadow-xs font-bold border border-slate-200/50 scale-100'
                  : 'text-slate-500 hover:text-primary hover:bg-white/40 bg-transparent border border-transparent'
                }`}
            >
              <tab.Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {filteredNotices.map((n, i) => {
          const isUrgent = n.type === 'URGENT';
          const isEvent = n.type === 'EVENT';

          return (
            <div
              key={n._id || i}
              className={`border border-slate-100/80 rounded-2xl p-5 hover:shadow-md hover:translate-x-0.5 transition-all duration-300 ease-out ${isUrgent
                  ? 'border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50/10 via-white to-white'
                  : isEvent
                    ? 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/10 via-white to-white'
                    : 'border-l-4 border-l-slate-350 bg-gradient-to-r from-slate-50/10 via-white to-white'
                }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100/80 mb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`badge ${isUrgent
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : isEvent
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-655 border border-slate-200'
                    } text-[10px] py-0.5 uppercase font-bold tracking-wider rounded-lg`}>
                    {n.type}
                  </span>
                  <span className="text-2xs text-slate-400 font-bold uppercase tracking-wider">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>

                {n.senderRole === 'superadmin' ? (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-150 uppercase tracking-wider">
                    🛡️ Platform Announcement
                  </span>
                ) : (
                  n.senderName && (
                    <div className="flex items-center gap-1.5 text-2xs text-slate-500 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg select-none">
                      <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center font-bold text-[8px] uppercase ${n.senderRole === 'schooladmin'
                          ? 'bg-amber-100 text-amber-955 border border-amber-200/50'
                          : 'bg-blue-50 text-blue-955 border border-blue-100/50'
                        }`}>
                        {n.senderName.substring(0, 2).toUpperCase()}
                      </span>
                      <span>
                        Sent by: <span className="font-semibold text-slate-700">{n.senderName}</span> <span className="text-slate-400">({n.senderRole === 'schooladmin' ? 'Admin' : 'Teacher'})</span>
                      </span>
                    </div>
                  )
                )}
              </div>

              <h3 className="font-display font-extrabold text-slate-800 text-sm md:text-base mb-1.5">{n.title}</h3>
              <p className="text-xs md:text-sm text-slate-600 leading-relaxed">{n.body}</p>
            </div>
          );
        })}
        {filteredNotices.length === 0 && (
          <div className="card text-center py-8 text-gray-400 text-xs italic">
            No notices posted for this filter tab.
          </div>
        )}
      </div>
    </div>
  );
};

// --- Student Profile ---
export const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({ guardianPhone: '', address: '', bloodGroup: '' });

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/academics/student/profile');
      setProfile(res.data);
      setForm({
        guardianPhone: res.data.guardianPhone || '',
        address: res.data.address || '',
        bloodGroup: res.data.bloodGroup || '',
      });
    } catch (err) {
      console.error('Failed to load DB profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await apiClient.patch('/academics/student/profile', {
        guardianPhone: form.guardianPhone,
        address: form.address,
        bloodGroup: form.bloodGroup,
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
      guardianPhone: profile?.guardianPhone || '',
      address: profile?.address || '',
      bloodGroup: profile?.bloodGroup || '',
    });
    setEditing(false);
  };

  if (loading) return (
    <div>
      <Topbar title="My Profile" />
      <div className="card text-center py-12 text-gray-400 text-sm">Loading profile details...</div>
    </div>
  );
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  return (
    <div>
      <Topbar title="My Profile" />
      <div className="card max-w-4xl border border-slate-100 hover:shadow-xs transition-shadow">

        {/* Header */}
        <div className="flex items-center justify-between gap-5 mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md border-4 border-white select-none">
              {profile?.firstName ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase() : 'ST'}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-primary">{profile?.firstName} {profile?.lastName}</h2>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-slate-400" /> Student Account</span>
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {profile?.email}</span>
                <span className="flex items-center gap-1.5"><Fingerprint className="w-4 h-4 text-slate-400" /> #{profile?.studentId}</span>
              </div>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-outline text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-all select-none cursor-pointer">
              <PenTool className="w-3.5 h-3.5 text-primary" /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-outline text-xs cursor-pointer select-none">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs cursor-pointer select-none">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          {/* Academic Enrollment — all read-only */}
          <div>
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-4 pb-1.5 border-b border-slate-100">
              <Building className="w-4 h-4 text-primary/80" /> Academic Enrollment
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Class & Section</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-primary">{profile?.class} - {profile?.section}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Classroom Room</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.room}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Academic Year</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.academicYear}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Enrollment Date</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.enrollDate}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
            </div>
          </div>

          {/* Guardian & Medical — partially editable */}
          <div>
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-4 pb-1.5 border-b border-slate-100">
              <HeartPulse className="w-4 h-4 text-rose-500" /> Guardian & Medical Info
            </h3>
            <div className="space-y-1">
              {/* Guardian Name — read only */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Guardian Name</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-primary">{profile?.guardianName} ({profile?.guardianRelationship})</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Managed by admin" />
                </div>
              </div>
              {/* Contact Phone — editable */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 px-1 hover:bg-slate-50/10 rounded-lg">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Contact Phone</span>
                {editing ? (
                  <input
                    type="tel"
                    value={form.guardianPhone}
                    onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))}
                    className="input text-xs py-1.5 px-3 w-40 text-right border border-slate-200 focus:border-primary rounded-lg focus:ring-1 focus:ring-primary/20"
                    placeholder="+92 300 000 0000"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-700">{profile?.guardianPhone}</span>
                )}
              </div>
              {/* Blood Group — editable */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 px-1 hover:bg-slate-50/10 rounded-lg">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Blood Group</span>
                {editing ? (
                  <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} className="input text-xs py-1.5 px-3 w-32 border border-slate-200 focus:border-primary rounded-lg">
                    <option value="">Select...</option>
                    {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                ) : (
                  <span className="badge bg-red-50 text-red-700 border border-red-200/60 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg select-none">{profile?.bloodGroup || 'Not Specified'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Address — editable, full width */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-3.5 pb-1.5 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-500" /> Residential Address
            </h3>
            {editing ? (
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={3}
                className="input resize-none text-xs w-full border border-slate-200 focus:border-primary rounded-xl focus:ring-1 focus:ring-primary/20 p-3"
                placeholder="Enter full residential address..."
              />
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150/40 text-slate-650 leading-relaxed font-semibold text-xs">
                {profile?.address || 'No registered address.'}
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-normal flex items-start gap-2 select-none">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Locked Parameters</strong>: Class, Room, Academic Year, and Student ID are managed exclusively by the school registrar and cannot be modified directly.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Student Homework View ---
export const StudentHomework = () => {
  const [profile, setProfile] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchHomeworks = async () => {
    try {
      // Fetch student profile first
      const profRes = await apiClient.get('/academics/student/profile');
      const prof = profRes.data;
      setProfile(prof);

      // Fetch homework assignments
      const homeworkRes = await expressClient.get('/homework');
      const studentClass = `${prof.class} - ${prof.section}`;
      const filtered = homeworkRes.data.filter(h => h.className === studentClass);
      setHomeworks(filtered);
    } catch (err) {
      console.error('Error loading student homework:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeworks();
  }, []);

  const handleSubmitHomework = async (id) => {
    setSubmittingId(id);
    try {
      await expressClient.put(`/homework/${id}/student-submit`);
      setSubmitSuccess(true);
      await fetchHomeworks();
      setTimeout(() => {
        setSubmitSuccess(false);
        setSelectedHomework(null);
      }, 1500);
    } catch (err) {
      console.error('Error submitting homework:', err);
      alert(err.response?.data?.error || 'Failed to submit homework.');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div>
      <Topbar title="My Homework Assignments" subtitle="Academic Tasks › Homework" />

      {loading ? (
        <div className="card text-center py-12 text-gray-400 text-sm">Loading homework assignments...</div>
      ) : (
        <div className="card">
          <p className="text-xs text-gray-400 mb-4">Complete and submit your tasks before their due dates.</p>
          <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/50">
                <tr className="border-b border-slate-150">
                  <th className="table-th text-left">Assignment Details</th>
                  <th className="table-th text-left">Instructions</th>
                  <th className="table-th text-center">Due Date</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {homeworks.map((h, i) => {
                  const isSubmitted = h.submittedStudents?.includes(profile?.id);
                  const isClosed = h.status === 'Completed';

                  return (
                    <tr key={h._id || i} className="border-b border-gray-100 hover:bg-gray-50/55 transition-colors">
                      <td className="table-td">
                        <div className="font-semibold text-sm text-primary">{h.title}</div>
                        <div className="text-2xs text-gray-400 mt-0.5">{h.className}</div>
                      </td>
                      <td className="table-td text-sm text-slate-650 max-w-xs truncate" title={h.instructions}>
                        {h.instructions}
                      </td>
                      <td className="table-td text-center text-sm font-semibold text-gray-500">
                        📅 {new Date(h.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="table-td text-center">
                        <span className={`badge ${isSubmitted ? 'badge-success' : isClosed ? 'badge-gray' : 'badge-warning'}`}>
                          {isSubmitted ? 'Submitted' : isClosed ? 'Closed' : 'Pending'}
                        </span>
                      </td>
                      <td className="table-td text-center">
                        {isSubmitted ? (
                          <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1.5">
                            ✓ Done
                          </span>
                        ) : isClosed ? (
                          <span className="text-xs text-gray-400 italic">Closed</span>
                        ) : (
                          <button
                            onClick={() => setSelectedHomework(h)}
                            className="btn-primary text-2xs py-1.5 px-3 rounded-lg hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
                          >
                            📤 Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {homeworks.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-400 text-sm">No homework assignments posted for your class.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {selectedHomework && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">📤 Submit Homework</h3>
                <p className="text-blue-200 text-xxs">Ensure all tasks are finished before submitting.</p>
              </div>
              {!submitSuccess && (
                <button
                  type="button"
                  onClick={() => setSelectedHomework(null)}
                  className="text-white hover:text-blue-200 text-lg transition-colors"
                >
                  ✖
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {submitSuccess ? (
                <div className="text-center py-6 space-y-3 animate-fadeIn">
                  <div className="w-16 h-16 bg-green-50 text-green-600 border border-green-200 rounded-full flex items-center justify-center text-3xl font-bold mx-auto animate-bounce">
                    🎉
                  </div>
                  <h4 className="font-display font-bold text-lg text-primary">Submission Successful!</h4>
                  <p className="text-xs text-gray-500">Your homework has been submitted to the teacher.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="text-2xs text-gray-400 font-bold uppercase tracking-wider">Assignment</div>
                    <div className="font-semibold text-primary text-sm">{selectedHomework.title}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xs text-gray-400 font-bold uppercase tracking-wider">Instructions</div>
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 max-h-24 overflow-y-auto border border-gray-100">
                      {selectedHomework.instructions}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    <span className="font-medium">Due Date:</span>
                    <span className="font-bold">
                      📅 {new Date(selectedHomework.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={submittingId === selectedHomework._id}
                      onClick={() => setSelectedHomework(null)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingId === selectedHomework._id}
                      onClick={() => handleSubmitHomework(selectedHomework._id)}
                      className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      {submittingId === selectedHomework._id ? (
                        <>
                          <span className="animate-spin">⏳</span> Submitting...
                        </>
                      ) : (
                        '📤 Confirm Submission'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Student Daily Class Schedule ---
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
    return (
      <div>
        <Topbar title="Daily Class Schedule" subtitle="Your personalized weekly timetable" />
        <div className="card text-center py-12 text-gray-400 text-sm">Loading timetable schedule...</div>
      </div>
    );
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
              <div className="flex items-center gap-4 min-w-[180px]">
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

              <div className="flex-1">
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

              <div className="flex flex-col items-start md:items-end justify-center min-w-[120px] gap-1.5 shrink-0">
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
export const StudentExams = () => {
  const [profile, setProfile] = useState(null);
  const [exams, setExams] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadExams = async () => {
      try {
        const profRes = await apiClient.get('/academics/student/profile');
        const prof = profRes.data;
        setProfile(prof);

        const classId = prof.classId || prof.ClassId;
        if (classId) {
          const examRes = await apiClient.get('/exams/schedule');
          const classExams = examRes.data.filter(
            e => e.classId === classId || e.ClassId === classId
          );
          setExams(classExams);
        } else {
          setError('You are not currently enrolled in any active class section.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load exam timetable. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    loadExams();
  }, []);

  if (loading) {
    return (
      <div>
        <Topbar title="Exam Timetable" subtitle="Manage and track your examination schedules" />
        <div className="card text-center py-12 text-gray-400 text-sm">Loading exam schedules...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Topbar title="Exam Timetable" subtitle="Manage and track your examination schedules" />
        <div className="card text-center py-12 text-rose-500 text-sm bg-rose-50 border border-rose-100 rounded-xl">
          ⚠️ {error}
        </div>
      </div>
    );
  }

  const getExamDateTime = (rawDateStr, timeStr) => {
    if (!rawDateStr) return new Date(0);
    const dt = new Date(rawDateStr);
    if (isNaN(dt.getTime())) return new Date(0);
    if (timeStr && timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        dt.setHours(hours, minutes, 0, 0);
      }
    }
    return dt;
  };

  const upcomingExams = exams
    .filter(e => {
      const examDate = getExamDateTime(e.rawDate || e.RawDate, e.time || e.Time);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(e.rawDate || e.RawDate) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(e.rawDate || e.RawDate) > to) return false;
      }
      return examDate >= new Date() && e.status !== 'Cancelled';
    })
    .sort((a, b) => new Date(a.rawDate || a.RawDate) - new Date(b.rawDate || b.RawDate));

  const pastAndOtherExams = exams
    .filter(e => {
      const examDate = getExamDateTime(e.rawDate || e.RawDate, e.time || e.Time);
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(e.rawDate || e.RawDate) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(e.rawDate || e.RawDate) > to) return false;
      }
      return examDate < new Date() || e.status === 'Cancelled';
    })
    .sort((a, b) => new Date(b.rawDate || b.RawDate) - new Date(a.rawDate || a.RawDate));

  const nextExam = upcomingExams[0];

  const getDaysRemaining = (dateStr) => {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `In ${diffDays} days`;
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'badge-success';
      case 'cancelled':
        return 'badge-danger';
      case 'scheduled':
      default:
        return 'badge-info';
    }
  };

  return (
    <div>
      <Topbar title="Exam Timetable" subtitle={`Exam schedule for ${profile?.class} - ${profile?.section}`} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <span className="text-xs font-semibold text-gray-500">📅 Filter Exam Timetable by Date:</span>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
          )}
        </div>
      </div>

      {nextExam && (
        <div className="card bg-gradient-to-r from-primary to-primary-light text-white mb-6 p-6 overflow-hidden relative border-none">
          <div className="absolute right-0 top-0 opacity-10 text-9xl font-bold select-none translate-x-10 -translate-y-5">
            ✍️
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 bg-accent text-primary text-2xs font-extrabold rounded-full mb-3 tracking-wider uppercase">
                🔔 Next Upcoming Exam
              </span>
              <h2 className="text-2xl font-black font-display tracking-tight mb-1">
                {nextExam.subject} ({nextExam.subjectCode})
              </h2>
              <p className="text-blue-200 text-xs font-medium flex items-center gap-4">
                <span>📅 {nextExam.date}</span>
                <span>⏱️ {nextExam.time}</span>
                <span>🚪 Room: {profile?.room || 'Assigned Classroom'}</span>
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end gap-1.5">
              <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Time Remaining</span>
              <span className="text-3xl font-black font-display text-accent leading-none">
                {getDaysRemaining(nextExam.rawDate || nextExam.RawDate)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-display font-bold text-primary text-base mb-4 flex items-center gap-2">
              📅 Upcoming Exams List
            </h3>

            <div className="space-y-4">
              {upcomingExams.map(exam => (
                <div key={exam.id} className="p-4 bg-gray-50 hover:bg-gray-50/50 border border-gray-100 rounded-xl flex items-start justify-between gap-4 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">
                        {exam.examType}
                      </span>
                      <span className={`badge ${getStatusBadgeClass(exam.status)} text-[10px]`}>
                        {exam.status}
                      </span>
                    </div>
                    <h4 className="font-display font-bold text-sm text-primary">
                      {exam.subject} ({exam.subjectCode})
                    </h4>
                    <div className="text-xxs text-gray-500 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">⏱️ {exam.time}</span>
                      <span className="flex items-center gap-1">👨‍🏫 Proctor: {exam.proctor}</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm font-bold text-primary">{exam.date}</div>
                    <div className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                      {getDaysRemaining(exam.rawDate || exam.RawDate)}
                    </div>
                  </div>
                </div>
              ))}

              {upcomingExams.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs italic">
                  No upcoming exams scheduled.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="font-display font-bold text-gray-500 text-sm mb-4">
              📚 Past & Cancelled Exams
            </h3>
            <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
              <table className="w-full border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-150">
                    <th className="table-th text-left py-2">Subject</th>
                    <th className="table-th text-left py-2">Exam Cycle</th>
                    <th className="table-th text-center py-2">Date & Time</th>
                    <th className="table-th text-center py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pastAndOtherExams.map(exam => (
                    <tr key={exam.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                      <td className="table-td py-3">
                        <div className="font-semibold text-xs text-primary">{exam.subject}</div>
                        <div className="text-[10px] text-gray-400">{exam.subjectCode}</div>
                      </td>
                      <td className="table-td py-3 text-xs text-slate-550">{exam.examType}</td>
                      <td className="table-td py-3 text-center">
                        <div className="text-xs font-semibold text-primary">{exam.date}</div>
                        <div className="text-[10px] text-gray-400">{exam.time}</div>
                      </td>
                      <td className="table-td py-3 text-center">
                        <span className={`badge ${getStatusBadgeClass(exam.status)} text-[10px]`}>
                          {exam.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pastAndOtherExams.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-gray-400 text-xs italic">
                        No past or cancelled exam records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="font-display font-bold text-primary text-sm mb-3">📝 Exam Guidelines</h3>
            <ul className="space-y-2.5 text-xs text-gray-500 leading-relaxed list-disc list-inside">
              <li>Students must report to the exam room <strong>15 minutes</strong> before the scheduled start time.</li>
              <li>Please bring your official <strong>Student ID Card</strong>.</li>
              <li>Electronic devices (smartphones, smartwatches, etc.) are strictly prohibited.</li>
              <li>Ensure you have all required stationery (pens, pencils, calculators if permitted).</li>
              <li>If you encounter a schedule conflict, contact the administration proctor immediately.</li>
            </ul>
          </div>

          <div className="card bg-accent/5 border border-accent/20">
            <h3 className="font-display font-bold text-primary text-sm mb-2 flex items-center gap-1.5">
              🏫 Assigned Classroom Room
            </h3>
            <p className="text-xs text-gray-600 mb-3">Your exams are proctored in your primary assigned homeroom section unless specified otherwise by the school administration.</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center text-lg">
                🚪
              </div>
              <div>
                <div className="text-xxs text-gray-400 font-bold uppercase">Assigned Room</div>
                <div className="text-sm font-black text-primary">{profile?.room || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

