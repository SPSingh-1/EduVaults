import { Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
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

const studentLinks = [
  { icon: '📊', label: 'Dashboard', path: '/student/dashboard' },
  { icon: '📅', label: 'Daily Schedule', path: '/student/schedule' },
  { icon: '📋', label: 'Attendance', path: '/student/attendance' },
  { icon: '📈', label: 'Results', path: '/student/results' },
  { icon: '✍️', label: 'Exam Timetable', path: '/student/exams' },
  { icon: '📝', label: 'Homework', path: '/student/homework' },
  { icon: '💰', label: 'Fees', path: '/student/fees' },
  { icon: '📢', label: 'Notices', path: '/student/notices' },
  { icon: '👤', label: 'Profile', path: '/student/profile' },
];

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

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const userData = JSON.parse(localStorage.getItem('eduvault_user'));
        setProfile(userData);

        const perfRes = await apiClient.get('/exams/student/performance');
        setPerformance(perfRes.data);

        const billRes = await apiClient.get('/billing/invoices');
        setInvoices(billRes.data);

        const attRes = await apiClient.get('/academics/attendance/my');
        setAttendanceList(attRes.data);

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

  const totalDays = attendanceList.length;
  const presentDays = attendanceList.filter(a => a.status === 'Present').length;
  const lateDays = attendanceList.filter(a => a.status === 'Late').length;
  const absentDays = attendanceList.filter(a => a.status === 'Absent').length;
  const realAttendancePercent = totalDays > 0 
    ? ((presentDays + lateDays) / totalDays * 100).toFixed(1) + '%' 
    : '100%';

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
    { name: 'Your Average', score: parseFloat(studentAverage.toFixed(1)), fill: '#3b82f6' },
    { name: 'Class Average', score: parseFloat(performance?.classAverage ?? 76.5), fill: '#94a3b8' },
    { name: 'Class Highest', score: parseFloat(performance?.classHighest ?? 92.0), fill: '#10b981' }
  ];

  return (
    <div>
      <Topbar title="Student Dashboard Overview" subtitle={`Welcome back, ${profile?.firstName || 'Student'}. Here's your academic summary.`} />
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Attendance', value: totalDays > 0 ? realAttendancePercent : '98.1%', sub: 'On Track', icon: '📋' },
          { label: 'Semester GPA', value: performance?.areMarksPublished !== false ? (performance?.semesterGpa || '0.00') : '🔒 Locked', sub: performance?.areMarksPublished !== false ? 'Target: 4.00' : 'Awaiting Release', icon: '📝' },
          { label: 'Outstanding Fees', value: `Rs. ${pendingAmount.toLocaleString()}`, sub: pendingAmount > 0 ? 'Due soon' : 'All Clear', icon: '💳', warn: pendingAmount > 0 },
          { label: 'Rank', value: performance?.areMarksPublished !== false ? (performance?.classRank || '1st / 1') : '🔒 Locked', sub: performance?.areMarksPublished !== false ? 'Top 15%' : 'Awaiting Release', icon: '📢' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <div className={`font-display text-2xl font-bold ${s.warn ? 'text-red-500' : 'text-primary'}`}>{s.value}</div>
            <div className={`text-xs mt-1 ${s.warn ? 'text-red-400' : 'text-gray-400'}`}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-display font-bold text-primary text-sm mb-4">📈 Academic Subject Performance</h3>
          <div className="h-64">
            {performance?.areMarksPublished !== false && perfData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [`${value}/100`, 'Marks']} />
                  <Bar dataKey="marks" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : performance?.areMarksPublished === false ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
                <span className="text-3xl mb-2">🔒</span>
                <div className="font-semibold text-xs text-primary mb-1">Grades Not Published Yet</div>
                <div className="text-[10px] text-gray-400 max-w-xs font-light">Subject wise performance analytics are locked until report cards are released.</div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No subject exam records graded yet.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-bold text-primary text-sm mb-4">🏆 Class Performance Benchmarking</h3>
          <div className="h-64">
            {performance?.areMarksPublished !== false ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rankData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [`${value}%`, 'Score']} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-gray-200">
                <span className="text-3xl mb-2">🔒</span>
                <div className="font-semibold text-xs text-primary mb-1">Benchmarks Locked</div>
                <div className="text-[10px] text-gray-400 max-w-xs font-light">Class rank benchmarking is hidden until release.</div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-bold text-primary text-sm mb-4">📋 Daily Attendance Distribution</h3>
          <div className="h-64 flex items-center justify-center">
            {totalDays > 0 ? (
              <div className="flex w-full items-center justify-around">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {attData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} days`, 'Count']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-xs">
                  {attData.map(item => (
                    <div key={item.name} className="flex items-center gap-2 font-medium">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-500">{item.name}:</span>
                      <span className="text-primary font-bold">{item.value} days</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-xs">No daily attendance records.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-bold text-primary text-sm mb-4">💰 School Fees Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" />
                <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Amount']} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
                    <span className={`inline-block px-2.5 py-0.5 rounded text-2xs font-bold ${
                      r.tag === 'URGENT' 
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
        const res = await apiClient.get('/academics/attendance/my');
        setAttendanceList(res.data);
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
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center border transition-all ${
                      hasRecord 
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
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    selectedRecord.status === 'Present' 
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

  useEffect(() => {
    const loadPerformanceAndProfile = async () => {
      try {
        const res = await apiClient.get('/exams/student/performance');
        setPerf(res.data);

        const profRes = await apiClient.get('/academics/student/profile');
        setProfile(profRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadPerformanceAndProfile();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (perf && perf.areMarksPublished === false) {
    return (
      <div>
        <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" />
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
      <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" actions={
        <button onClick={handlePrint} className="btn-primary text-xs flex items-center gap-1.5 no-print">
          🖨️ Download PDF Report Card
        </button>
      } />
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .main-content, .main-content *, 
          #root, #root *,
          body * {
            visibility: hidden;
          }
          .printable-report-card, .printable-report-card * {
            visibility: visible;
          }
          .printable-report-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 30px;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            background-color: white !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
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
              <h2 className="font-display font-bold text-lg text-primary">OFFICIAL REPORT CARD</h2>
              <p className="text-xs font-semibold text-gray-400">Academic Year: {profile?.academicYear || '2023-24'}</p>
            </div>
          </div>
        </div>

        <div className="hidden print:grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100 text-sm">
          <div>
            <div className="flex gap-2"><span className="text-gray-400 font-semibold uppercase text-xs w-24">Student Name:</span><span className="font-bold text-primary">{profile?.firstName} {profile?.lastName}</span></div>
            <div className="flex gap-2 mt-1"><span className="text-gray-400 font-semibold uppercase text-xs w-24">Student ID:</span><span className="font-mono text-gray-700 font-semibold">{profile?.studentId}</span></div>
          </div>
          <div>
            <div className="flex gap-2"><span className="text-gray-400 font-semibold uppercase text-xs w-24">Class:</span><span className="font-semibold text-primary">{profile?.class} - {profile?.section}</span></div>
            <div className="flex gap-2 mt-1"><span className="text-gray-400 font-semibold uppercase text-xs w-24">Enrollment Date:</span><span className="font-medium text-gray-700">{profile?.enrollDate}</span></div>
          </div>
        </div>

        <h3 className="font-display font-semibold text-primary mb-4 print:text-base">Detailed Subject Breakdown</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Subject', 'Internal (30)', 'Exam (70)', 'Total (100)', 'Grade', 'Status'].map(h => <th key={h} className="table-th print:text-xs print:py-2">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {perf?.subjectsBreakdown?.map((s, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 print:border-gray-100">
                <td className="table-td font-semibold text-sm text-primary print:py-2.5 print:text-xs">{s.subject}</td>
                <td className="table-td text-sm text-center print:py-2.5 print:text-xs">{s.internal}</td>
                <td className="table-td text-sm text-center print:py-2.5 print:text-xs">{s.exam}</td>
                <td className="table-td text-sm font-bold text-center print:py-2.5 print:text-xs">{s.total}</td>
                <td className="table-td print:py-2.5 text-center"><span className="font-bold text-sm text-green-600 print:text-xs">{s.grade}</span></td>
                <td className="table-td print:py-2.5 text-center"><span className="badge-success print:bg-green-50 print:text-green-800 print:border print:border-green-200 print:text-[10px]">{s.status}</span></td>
              </tr>
            ))}
            {(!perf?.subjectsBreakdown || perf.subjectsBreakdown.length === 0) && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No exam records graded yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="hidden print:grid grid-cols-3 gap-4 border border-gray-200 rounded-xl p-4 mt-8 bg-gray-50/50">
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Semester GPA</div>
            <div className="font-display text-xl font-black text-primary">{perf?.semesterGpa}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Cumulative GPA</div>
            <div className="font-display text-xl font-black text-blue-600">{perf?.cumulativeGpa}</div>
          </div>
          <div>
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Class Rank</div>
            <div className="font-display text-xl font-black text-green-600">{perf?.classRank}</div>
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

const generateMockPaymentId = () => {
  return `pay_mock_${Math.random().toString(36).substring(7)}`;
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
        rzp.on('payment.failed', function (response){
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

  const pendingAmount = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const paidInvoices = invoices.filter(i => i.status === 'Paid');
  const lastPaymentVal = paidInvoices.length > 0 ? paidInvoices[0].amount : 0;

  return (
    <div>
      <Topbar title="Fees & Payments" subtitle="Review your financial standing and manage school dues." />
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
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Fee Description', 'Due Date', 'Amount', 'Status', 'Action'].map(h => <th key={h} className="table-th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {invoices.map((f, i) => (
                <tr key={f.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="table-td"><div className="font-semibold text-sm">{f.desc}</div><div className="text-xs text-gray-400">{f.sub}</div></td>
                  <td className="table-td text-sm font-medium">{f.due}</td>
                  <td className="table-td font-bold">Rs. {f.amount}</td>
                  <td className="table-td"><span className={f.status === 'Paid' ? 'badge-success' : 'badge-warning'}>{f.status}</span></td>
                  <td className="table-td">
                    {f.status !== 'Paid' && (
                      <button onClick={() => handlePay(f.id)} disabled={loading} className="text-xs font-semibold text-blue-600 hover:underline">
                        Pay Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-6 text-gray-400 text-sm">No fee structures invoiced yet.</td>
                </tr>
              )}
            </tbody>
          </table>
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
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100">
              {['Reference Number', 'Fee Description', 'Date', 'Payment Method', 'Amount', 'Status'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr key={t.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-td font-mono text-xs text-primary font-bold">{t.referenceNumber}</td>
                <td className="table-td text-sm font-semibold">{t.feeName}</td>
                <td className="table-td text-sm text-gray-400 font-medium">{t.date}</td>
                <td className="table-td text-sm text-gray-500 font-medium">{t.paymentMethod}</td>
                <td className="table-td text-sm font-bold text-primary">Rs. {t.amount.toLocaleString()}</td>
                <td className="table-td">
                  <span className={t.status === 'success' ? 'badge-success' : 'badge-danger'}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No transactions completed yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Student Notices ---
export const StudentNotices = () => {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    const fetchNotices = async () => {
      try {
        const res = await expressClient.get('/notifications');
        setNotices(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotices();
  }, []);

  return (
    <div>
      <Topbar title="Notices & Announcements" />
      <div className="space-y-4">
        {notices.map((n, i) => (
          <div key={n._id || i} className={`card ${n.type === 'URGENT' ? 'border-l-4 border-red-500 shadow-md' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={n.type === 'URGENT' ? 'badge-danger' : n.type === 'EVENT' ? 'badge-info' : 'badge-gray'}>{n.type}</span>
                <span className="text-xs text-gray-400 font-medium">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              {n.senderName && (
                <span className="text-xs font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg">
                  👤 Sent by: {n.senderName} ({n.senderRole === 'schooladmin' ? 'Admin' : n.senderRole === 'teacher' ? 'Teacher' : n.senderRole})
                </span>
              )}
            </div>
            <h3 className="font-display font-bold text-primary text-base mb-1.5">{n.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{n.body}</p>
          </div>
        ))}
        {notices.length === 0 && (
          <div className="card text-center py-6 text-gray-400 text-sm">No notices posted.</div>
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
      <div className="card max-w-4xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-5 mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-3xl font-bold">
              {profile?.firstName ? `${profile.firstName[0]}${profile.lastName[0]}` : '👤'}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-primary">{profile?.firstName} {profile?.lastName}</h2>
              <div className="flex gap-4 mt-1.5 text-xs text-gray-500">
                <span className="flex items-center gap-1">🎒 Student Account</span>
                <span className="flex items-center gap-1">📧 {profile?.email}</span>
                <span className="flex items-center gap-1">🆔 #{profile?.studentId}</span>
              </div>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-outline text-xs flex items-center gap-1.5">
              ✏️ Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-outline text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
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
          {/* Academic Enrollment — all read-only */}
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-3.5">🏫 Academic Enrollment</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400 font-semibold uppercase">Class & Section</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-primary">{profile?.class} - {profile?.section}</span>
                  <span className="text-xs text-gray-400" title="Assigned by admin — cannot be changed">🔒</span>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400 font-semibold uppercase">Classroom Room</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700">{profile?.room}</span>
                  <span className="text-xs text-gray-400" title="Assigned by admin — cannot be changed">🔒</span>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400 font-semibold uppercase">Academic Year</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700">{profile?.academicYear}</span>
                  <span className="text-xs text-gray-400" title="Assigned by admin — cannot be changed">🔒</span>
                </div>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400 font-semibold uppercase">Enrollment Date</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium text-gray-700">{profile?.enrollDate}</span>
                  <span className="text-xs text-gray-400" title="Assigned by admin — cannot be changed">🔒</span>
                </div>
              </div>
            </div>
          </div>

          {/* Guardian & Medical — partially editable */}
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-3.5">👪 Guardian & Medical Info</h3>
            <div className="space-y-3">
              {/* Guardian Name — read only */}
              <div className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400 font-semibold uppercase">Guardian Name</span>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-primary">{profile?.guardianName} ({profile?.guardianRelationship})</span>
                  <span className="text-xs text-gray-400" title="Managed by admin">🔒</span>
                </div>
              </div>
              {/* Contact Phone — editable */}
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400 font-semibold uppercase">Contact Phone</span>
                {editing ? (
                  <input
                    type="tel"
                    value={form.guardianPhone}
                    onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))}
                    className="input text-sm py-1 px-2 w-36 text-right"
                    placeholder="+92 300 000 0000"
                  />
                ) : (
                  <span className="font-medium text-gray-700">{profile?.guardianPhone}</span>
                )}
              </div>
              {/* Blood Group — editable */}
              <div className="flex justify-between items-center py-2 border-b border-gray-50">
                <span className="text-xs text-gray-400 font-semibold uppercase">Blood Group</span>
                {editing ? (
                  <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} className="input text-sm py-1 px-2 w-28">
                    <option value="">Select...</option>
                    {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                ) : (
                  <span className="font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded text-xs">{profile?.bloodGroup || 'Not Specified'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Address — editable, full width */}
          <div className="col-span-2">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-2.5">🏠 Residential Address</h3>
            {editing ? (
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={3}
                className="input resize-none text-sm w-full"
                placeholder="Enter full residential address..."
              />
            ) : (
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-600 leading-relaxed font-medium">
                {profile?.address || 'No registered address.'}
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 leading-relaxed">
            🔒 <strong>Class</strong>, <strong>Enrollment Date</strong>, <strong>Guardian Name</strong>, and <strong>Student ID</strong> are managed by the school admin and cannot be changed here.
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

  useEffect(() => {
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
    fetchHomeworks();
  }, []);

  return (
    <div>
      <Topbar title="My Homework Assignments" subtitle="Academic Tasks › Homework" />
      
      {loading ? (
        <div className="card text-center py-12 text-gray-400 text-sm">Loading homework assignments...</div>
      ) : (
        <div className="card">
          <p className="text-xs text-gray-400 mb-4">Complete and submit your tasks before their due dates.</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-th text-left">Assignment Details</th>
                <th className="table-th text-left">Instructions</th>
                <th className="table-th">Due Date</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {homeworks.map((h, i) => (
                <tr key={h._id || i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="table-td">
                    <div className="font-semibold text-sm text-primary">{h.title}</div>
                    <div className="text-2xs text-gray-400 mt-0.5">{h.className}</div>
                  </td>
                  <td className="table-td text-sm text-gray-600 max-w-xs truncate" title={h.instructions}>
                    {h.instructions}
                  </td>
                  <td className="table-td text-center text-sm font-semibold text-gray-500">
                    📅 {new Date(h.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="table-td text-center">
                    <span className={`badge ${h.status === 'Active' ? 'badge-info' : h.status === 'Pending Review' ? 'badge-warning' : 'badge-success'}`}>
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
              {homeworks.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-gray-400 text-sm">No homework assignments posted for your class.</td>
                </tr>
              )}
            </tbody>
          </table>
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
      <div className="flex gap-2 mb-6 border-b border-gray-100 pb-3">
        {days.map(d => {
          const isToday = d.toLowerCase() === currentDayName.toLowerCase();
          const isActive = d.toLowerCase() === activeDay.toLowerCase();
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-primary border border-gray-100'
              }`}
            >
              <span>{d}</span>
              {isToday && (
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${isActive ? 'bg-accent text-primary' : 'bg-primary/10 text-primary'}`}>
                  TODAY
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule List */}
      <div className="space-y-4">
        {periods.map(p => {
          const cell = activeDaySchedule.find(c => c.periodNumber === p.periodNumber);
          const hasClass = cell && cell.teacherId;
          const isHomeroom = cell && cell.subjectName === 'Homeroom (Class Teacher)';

          return (
            <div
              key={p.id}
              className={`card flex flex-col md:flex-row md:items-center justify-between gap-4 border transition-all ${
                hasClass 
                  ? isHomeroom 
                    ? 'border-l-4 border-l-amber-500 bg-amber-50/10 hover:shadow-md' 
                    : 'border-l-4 border-l-primary hover:shadow-md'
                  : 'border-l-4 border-l-gray-300 bg-gray-50/20'
              }`}
            >
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                  hasClass 
                    ? isHomeroom 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-primary/5 text-primary'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {p.periodNumber}
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-bold uppercase">Period {p.periodNumber}</div>
                  <div className="text-sm font-semibold text-primary">{p.startTime} - {p.endTime}</div>
                </div>
              </div>

              <div className="flex-1">
                {hasClass ? (
                  <div>
                    <h4 className="font-display font-bold text-base text-primary mb-1">
                      {cell.subjectName}
                    </h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span>👨‍🏫 Teacher:</span>
                      <span className="font-semibold text-primary">{cell.teacherName}</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="font-display font-medium text-sm text-gray-400 italic">
                      Free Period
                    </h4>
                    <p className="text-xxs text-gray-400">No scheduled classes for this period.</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end justify-center min-w-[150px] gap-2">
                {hasClass && (
                  <>
                    {cell.isRescheduled && (
                      <span className="badge badge-warning text-2xs py-1">
                        ● COVER ASSIGNED
                      </span>
                    )}
                    {cell.remark && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xxs p-2 rounded-lg font-medium leading-normal w-full md:max-w-[250px] text-left md:text-right">
                        <strong>Alert:</strong> "{cell.remark}"
                      </div>
                    )}
                  </>
                )}
                {!hasClass && (
                  <span className="badge badge-gray text-2xs py-1">
                    UNASSIGNED
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
      return examDate >= new Date() && e.status !== 'Cancelled';
    })
    .sort((a, b) => new Date(a.rawDate || a.RawDate) - new Date(b.rawDate || b.RawDate));

  const pastAndOtherExams = exams
    .filter(e => {
      const examDate = getExamDateTime(e.rawDate || e.RawDate, e.time || e.Time);
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th text-left py-2">Subject</th>
                  <th className="table-th text-left py-2">Exam Cycle</th>
                  <th className="table-th py-2">Date & Time</th>
                  <th className="table-th text-right py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {pastAndOtherExams.map(exam => (
                  <tr key={exam.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="table-td py-3">
                      <div className="font-semibold text-xs text-primary">{exam.subject}</div>
                      <div className="text-[10px] text-gray-400">{exam.subjectCode}</div>
                    </td>
                    <td className="table-td py-3 text-xs text-gray-500">{exam.examType}</td>
                    <td className="table-td py-3 text-center">
                      <div className="text-xs font-semibold text-primary">{exam.date}</div>
                      <div className="text-[10px] text-gray-400">{exam.time}</div>
                    </td>
                    <td className="table-td py-3 text-right">
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

