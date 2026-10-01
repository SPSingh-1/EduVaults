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

export const StudentExams = () => {
  const [profile, setProfile] = useState(null);
  const [exams, setExams] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
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
    return <Loader message="Accessing your examination schedules" />;
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
      if (search) {
        const q = search.toLowerCase();
        const subjMatch = (e.subject || e.subjectName || '').toLowerCase().includes(q);
        const codeMatch = (e.subjectCode || '').toLowerCase().includes(q);
        const typeMatch = (e.examType || '').toLowerCase().includes(q);
        if (!subjMatch && !codeMatch && !typeMatch) return false;
      }
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
      if (search) {
        const q = search.toLowerCase();
        const subjMatch = (e.subject || e.subjectName || '').toLowerCase().includes(q);
        const codeMatch = (e.subjectCode || '').toLowerCase().includes(q);
        const typeMatch = (e.examType || '').toLowerCase().includes(q);
        if (!subjMatch && !codeMatch && !typeMatch) return false;
      }
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
    try {
      const target = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = target - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays < 0) return 'Passed';
      return `In ${diffDays} days`;
    } catch (e) {
      return 'Upcoming';
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search exam/subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl"
            style={{ width: '160px' }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          {(dateFrom || dateTo || search) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
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


const CLIENT_DEFAULT_HOLIDAYS = [
  { _id: 'h1', title: 'Republic Day', date: '2026-01-26', endDate: '2026-01-26', category: 'NATIONAL', description: 'National celebration of Republic Day of India. Flag hoisting ceremony.' },
  { _id: 'h2', title: 'Maha Shivratri', date: '2026-02-15', endDate: '2026-02-15', category: 'FESTIVAL', description: 'School holiday on account of Maha Shivratri.' },
  { _id: 'h3', title: 'Holi Festival', date: '2026-03-04', endDate: '2026-03-05', category: 'FESTIVAL', description: 'School closed for Holi and Dhulandi celebrations.' },
  { _id: 'h4', title: 'Eid-ul-Fitr', date: '2026-03-20', endDate: '2026-03-20', category: 'FESTIVAL', description: 'School holiday for Eid-ul-Fitr observance.' },
  { _id: 'h5', title: 'Good Friday', date: '2026-04-03', endDate: '2026-04-03', category: 'RESTRICTED', description: 'School closed for Good Friday.' },
  { _id: 'h6', title: 'Ambedkar Jayanti', date: '2026-04-14', endDate: '2026-04-14', category: 'NATIONAL', description: 'Commemoration of Dr. B.R. Ambedkar Jayanti.' },
  { _id: 'h7', title: 'Mahavir Jayanti', date: '2026-04-15', endDate: '2026-04-15', category: 'FESTIVAL', description: 'School holiday on account of Mahavir Jayanti.' },
  { _id: 'h8', title: 'Summer Vacation', date: '2026-05-18', endDate: '2026-06-30', category: 'ACADEMIC', description: 'Annual summer vacation for students and faculty.' },
  { _id: 'h9', title: 'Muharram', date: '2026-06-26', endDate: '2026-06-26', category: 'FESTIVAL', description: 'Gazetted school holiday for Muharram.' },
  { _id: 'h10', title: 'Independence Day', date: '2026-08-15', endDate: '2026-08-15', category: 'NATIONAL', description: 'Independence Day celebration. Flag hoisting at 8:00 AM.' },
  { _id: 'h11', title: 'Raksha Bandhan', date: '2026-08-28', endDate: '2026-08-28', category: 'FESTIVAL', description: 'School closed for Raksha Bandhan festival.' },
  { _id: 'h12', title: 'Janmashtami', date: '2026-09-04', endDate: '2026-09-04', category: 'FESTIVAL', description: 'School holiday on Sri Krishna Janmashtami.' },
  { _id: 'h13', title: 'Eid-e-Milad', date: '2026-09-25', endDate: '2026-09-25', category: 'FESTIVAL', description: 'School holiday for Milad-un-Nabi.' },
  { _id: 'h14', title: 'Mahatma Gandhi Jayanti', date: '2026-10-02', endDate: '2026-10-02', category: 'NATIONAL', description: 'National Holiday in honor of Mahatma Gandhi.' },
  { _id: 'h15', title: 'Dussehra Break', date: '2026-10-20', endDate: '2026-10-23', category: 'FESTIVAL', description: 'School closed for Vijayadashami Dussehra festivities.' },
  { _id: 'h16', title: 'Diwali & Chhath Vacation', date: '2026-11-08', endDate: '2026-11-15', category: 'FESTIVAL', description: 'Deepawali, Govardhan Puja, Bhai Dooj and Chhath Puja holidays.' },
  { _id: 'h17', title: 'Guru Nanak Jayanti', date: '2026-11-24', endDate: '2026-11-24', category: 'RESTRICTED', description: 'School holiday on Guru Nanak Gurpurab.' },
  { _id: 'h18', title: 'Winter Vacation & Christmas', date: '2026-12-25', endDate: '2027-01-05', category: 'ACADEMIC', description: 'Winter break and Christmas holidays.' },
  { _id: 'h19', title: 'Republic Day', date: '2027-01-26', endDate: '2027-01-26', category: 'NATIONAL', description: 'National celebration of Republic Day of India.' },
  { _id: 'h20', title: 'Holi Festival', date: '2027-03-23', endDate: '2027-03-24', category: 'FESTIVAL', description: 'Festival of colours holiday.' }
];

// --- Student Holiday Calendar Component ---
export default StudentExams;
