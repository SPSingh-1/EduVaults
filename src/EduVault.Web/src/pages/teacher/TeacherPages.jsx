import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Cell 
} from 'recharts';

const teacherLinks = [
  { icon: '📊', label: 'Dashboard', path: '/teacher/dashboard' },
  { icon: '🏫', label: 'My Classes', path: '/teacher/classes' },
  { icon: '👨‍🎓', label: 'Students', path: '/teacher/students' },
  { icon: '📋', label: 'Attendance', path: '/teacher/attendance' },
  { icon: '✏️', label: 'Marks Entry', path: '/teacher/marks' },
  { icon: '📝', label: 'Homework', path: '/teacher/homework' },
  { icon: '💬', label: 'Remarks', path: '/teacher/remarks' },
  { icon: '📢', label: 'Notices', path: '/teacher/notices' },
  { icon: '👤', label: 'Profile', path: '/teacher/profile' },
];

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
    <div>
      <Topbar title="Teacher Dashboard" subtitle="Academic Year 2023-24" />
      
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'My Classes', value: stats?.totalClasses ?? '0', sub: stats?.myClassesToday || 'No classes today', icon: '🏫' },
          { label: 'Total Students', value: stats?.totalStudents ?? '0', sub: 'Across class roster', icon: '👥' },
          { label: 'Pending Reviews', value: stats?.pendingReviews ?? '0', sub: 'Requires submission', icon: '📋' },
          { label: 'Base Salary', value: stats?.salary ? `Rs. ${stats.salary.toLocaleString()}` : 'Rs. 55,000', sub: 'Direct deposit', icon: '💰' },
        ].map(s => (
          <div key={s.label} className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-primary/10">{s.icon}</div>
            <div>
              <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xs font-medium text-blue-500">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Graph 1: Students per Class */}
        <div className="card">
          <h3 className="font-display font-bold text-primary text-sm mb-4">👥 Student Enrollment by Class</h3>
          <div className="h-64">
            {stats?.classEnrollments && stats.classEnrollments.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.classEnrollments}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="className" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [`${value} students`, 'Enrolled']} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No class rosters assigned.</div>
            )}
          </div>
        </div>

        {/* Graph 2: Salary Payout Breakdown */}
        <div className="card">
          <h3 className="font-display font-bold text-primary text-sm mb-4">📈 Monthly Salary History</h3>
          <div className="h-64">
            {stats?.salaryHistory ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.salaryHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip formatter={(value) => [`Rs. ${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Line type="monotone" dataKey="net" name="Net Payout" stroke="#10b981" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="baseSalary" name="Base Salary" stroke="#3b82f6" strokeWidth={1.5} />
                </LineChart>
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
          <div className="flex bg-gray-100 p-0.5 rounded-lg">
            <button
              onClick={() => setScheduleView('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                scheduleView === 'today'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              Today's Schedule
            </button>
            <button
              onClick={() => setScheduleView('weekly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                scheduleView === 'weekly'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-primary'
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
                  <th className="table-th">Period</th>
                  <th className="table-th">Class Room</th>
                  <th className="table-th">Subject</th>
                  <th className="table-th">Status / Remark</th>
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
                  <h4 className="font-display font-semibold text-primary text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>{day}</span>
                    <span className="text-2xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full normal-case">
                      {dayItems.length} {dayItems.length === 1 ? 'class' : 'classes'}
                    </span>
                  </h4>
                  {dayItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {dayItems.map((item, idx) => (
                        <div 
                          key={item.id || idx} 
                          className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-between hover:border-blue-200 transition-colors shadow-sm"
                        >
                          <div>
                            <div className="text-2xs font-bold text-blue-600 uppercase tracking-wider">
                              Period {item.periodNumber}
                            </div>
                            <div className="text-xs font-semibold text-gray-800 mt-0.5">
                              {item.subjectName}
                            </div>
                            <div className="text-2xs text-gray-500 mt-0.5">
                              {item.className}
                            </div>
                          </div>
                          <div>
                            {item.isRescheduled ? (
                              <span 
                                className="badge badge-danger text-2xs font-semibold cursor-help" 
                                title={item.remark}
                              >
                                {item.remark && item.remark.length > 15 ? item.remark.slice(0, 15) + '...' : item.remark || 'Rescheduled'}
                              </span>
                            ) : (
                              item.remark && (
                                <span 
                                  className="text-2xs text-gray-400 italic cursor-help" 
                                  title={item.remark}
                                >
                                  {item.remark.length > 15 ? item.remark.slice(0, 15) + '...' : item.remark}
                                </span>
                              )
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
                      className={`p-3 border rounded-xl flex flex-col justify-between min-h-[90px] text-left relative ${
                        isCancelled
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
                                className={`text-[10px] leading-snug font-medium mt-1.5 p-1 px-2 rounded-md border cursor-help transition-all ${
                                  isCancelled 
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
    const matchesSearch = !search || nameStr.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !selectedClass || s.classId === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div>
      <Topbar title="Students Roster" subtitle="Directory of students enrolled in your class sections" />
      
      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 relative">
            <input placeholder="Search students by name..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          <select className="input w-48 text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">All My Classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>Class {c.grade} - {c.section}</option>
            ))}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-th text-left">Student Name</th>
              <th className="table-th">Student ID</th>
              <th className="table-th">Class</th>
              <th className="table-th">Section</th>
              <th className="table-th">Father's Name</th>
              <th className="table-th">Actions</th>
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
                      className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                        tag === t
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
        let cleanRemark = '';
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
                className={`bg-white rounded-xl border shadow-sm px-5 py-4 flex flex-wrap items-center gap-4 transition-all ${
                  s.status === 'Absent' ? 'border-red-100 bg-red-50/30'
                  : s.status === 'Late' ? 'border-amber-100 bg-amber-50/30'
                  : 'border-gray-100'
                } ${attendanceSaved && !isEditing ? 'opacity-80' : ''}`}
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                    s.status === 'Absent' ? 'bg-red-100 text-red-600'
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
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all min-w-[72px] ${
                        s.status === key ? activeClass : inactiveClass
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

  const fetchRosterData = async () => {
    try {
      const res = await apiClient.get('/academics/students');
      setStudents(res.data);
      if (res.data.length > 0) {
        setSelectedStudentId(res.data[0].id);
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
      const res = await apiClient.get(`/exams/student/${selectedStudentId}/subjects`);
      setSubjectsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentGrades();
  }, [selectedStudentId]);

  const updateSubjectField = (subjId, field, val) => {
    setSubjectsList(prev => prev.map(s => s.subjectId === subjId ? { ...s, [field]: val } : s));
  };

  const handleSaveMarks = async () => {
    if (!selectedStudentId) return;
    setSavingProgress(true);
    try {
      const payload = {
        studentId: selectedStudentId,
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
      
      // 1. Send notice to Student
      await expressClient.post('/notifications', {
        recipientId: selectedStudentId,
        title: '📖 Report Card Update',
        body: `Your teacher ${teacherName} has updated your theory/practical grades for this semester. Check the Results portal.`,
        type: 'GENERAL'
      });

      // 2. Send notice to School Admin
      await expressClient.post('/notifications', {
        recipientId: 'SCHOOLADMINS',
        title: '📋 Student Progress Saved',
        body: `Academic progress report updated for student ${studentObj?.name || 'Bhavesh Jangid'} by teacher ${teacherName}.`,
        type: 'GENERAL'
      });

      alert('Student theory and practical marks saved successfully! Notifications pushed to student and portal admin.');
      loadStudentGrades();
    } catch (err) {
      console.error(err);
      alert('Failed to save progress marks.');
    } finally {
      setSavingProgress(false);
    }
  };

  return (
    <div>
      <Topbar title="Student Marks Entry" />
      <div className="card">
        <div className="flex items-center gap-4 mb-5 border-b border-gray-50 pb-4">
          <div className="w-80">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Select Student from Class Roster</label>
            <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="input text-sm">
              <option value="">Choose student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.class} {s.section})</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading assigned curriculum subjects...</div>
        ) : (
          <div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th text-left">Subject Code</th>
                  <th className="table-th text-left">Subject Name</th>
                  <th className="table-th">Theory Marks (70)</th>
                  <th className="table-th">Practical Marks (30)</th>
                  <th className="table-th">Total (100)</th>
                  <th className="table-th">Subject Remarks</th>
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
                          value={s.theoryMarks ?? ''}
                          onChange={e => updateSubjectField(s.subjectId, 'theoryMarks', e.target.value)}
                          placeholder="e.g. 55"
                          className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center m-auto focus:ring-1 focus:ring-primary/20"
                        />
                      </td>
                      <td className="table-td">
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={s.practicalMarks ?? ''}
                          onChange={e => updateSubjectField(s.subjectId, 'practicalMarks', e.target.value)}
                          placeholder="e.g. 25"
                          className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center m-auto focus:ring-1 focus:ring-primary/20"
                        />
                      </td>
                      <td className="table-td text-center font-bold text-primary text-sm">{total}</td>
                      <td className="table-td">
                        <input
                          value={s.remarks || ''}
                          onChange={e => updateSubjectField(s.subjectId, 'remarks', e.target.value)}
                          placeholder="Feedback remark..."
                          className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-primary/20"
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

            {subjectsList.length > 0 && (
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                <button onClick={handleSaveMarks} disabled={savingProgress} className="btn-primary text-sm">
                  {savingProgress ? 'Saving Student Progress...' : '💾 Save Student Progress'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
                      className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                        tag === t
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
      await expressClient.put(`/homework/${id}/sync-count`, { totalStudents });
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
        <table className="w-full">
          <thead><tr className="border-b border-gray-100">{['Assignment & Class', 'Due Date', 'Submissions', 'Status', 'Actions'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
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
  const [form, setForm] = useState({ firstName: '', lastName: '', qualifications: '', officeLocation: '' });

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

  useEffect(() => { loadProfile(); }, []);

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
        <div className="flex items-start justify-between mb-6 pb-6 border-b border-gray-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-3xl font-bold text-accent">
              {profile?.firstName ? `${profile.firstName[0]}${profile.lastName[0]}` : '👤'}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-primary">{profile?.firstName} {profile?.lastName}</h2>
              <p className="text-accent font-semibold text-sm mt-0.5">{profile?.department || 'Faculty'}</p>
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span>👩‍🏫 Faculty Account</span>
                <span>📧 {profile?.email}</span>
                <span>🆔 Employee ID: #{profile?.employeeId}</span>
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
