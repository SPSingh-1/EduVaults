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

export const StudentSyllabus = () => {
  const [syllabi, setSyllabi] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [previewFile, setPreviewFile] = useState(null);

  const getStudentClassStr = (p) => {
    if (!p) return '';
    if (p.className) return p.className;
    if (p.class) {
      const cls = p.class.toString().startsWith('Class') ? p.class : `Class ${p.class}`;
      return p.section ? `${cls} - ${p.section}` : cls;
    }
    return '';
  };

  const fetchSyllabi = async () => {
    try {
      const profRes = await apiClient.get('/academics/student/profile').catch(() => null);
      const p = profRes?.data;
      if (p) {
        setProfile(p);
      }
      const studentClass = getStudentClassStr(p);
      const queryUrl = studentClass ? `/syllabus?className=${encodeURIComponent(studentClass)}` : '/syllabus';
      const res = await expressClient.get(queryUrl);
      setSyllabi(res.data);
    } catch (err) {
      console.error('Error loading syllabus:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabi();
  }, []);

  const uniqueSubjects = Array.from(new Set(syllabi.map(s => s.subject))).filter(Boolean);

  const filteredSyllabi = syllabi.filter(s => {
    const matchesSubject = selectedSubject === 'ALL' || s.subject === selectedSubject;
    const matchesSearch = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) || (s.teacherName && s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesSearch;
  });

  if (loading) {
    return <Loader message="Retrieving your class curriculum & subject syllabus" />;
  }

  const currentClassLabel = getStudentClassStr(profile) || 'My Class';

  return (
    <div className="space-y-6">
      <Topbar title="Class Subject Syllabus" subtitle={`Curriculum & Course Outline › ${currentClassLabel}`} />

      {/* Filter and Search Bar */}
      <div className="card bg-white border border-slate-200/80 shadow-sm rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Filter Subject:</span>
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="input text-xs py-1.5 px-3 bg-white border border-slate-200 rounded-xl"
          >
            <option value="ALL">All Subjects ({syllabi.length})</option>
            {uniqueSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Search by topic, subject or teacher..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input text-xs py-1.5 px-3 w-full sm:w-64 border border-slate-200 rounded-xl"
        />
      </div>

      {/* Syllabus Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSyllabi.map((s, idx) => (
          <div key={s._id || idx} className="card bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-3 py-1 rounded-full text-2xs font-extrabold bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider">
                  📚 {s.subject}
                </span>
                <span className="text-3xs font-mono font-bold text-slate-400">
                  {formatDateDDMMYYYY(s.createdAt)}
                </span>
              </div>

              <h3 className="font-display font-extrabold text-primary text-base line-clamp-2 mb-2">
                {s.title}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed">
                {s.description || 'Official subject course curriculum and examination outline.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-2xs text-slate-400 font-semibold">
                <span>Teacher: </span>
                <span className="text-slate-700 font-bold">{s.teacherName || 'Faculty'}</span>
              </div>

              <button
                type="button"
                onClick={() => setPreviewFile(s)}
                className="btn-primary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-bold shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                👁️ View Syllabus
              </button>
            </div>
          </div>
        ))}

        {filteredSyllabi.length === 0 && (
          <div className="col-span-full card text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="text-4xl mb-2">📚</div>
            <div className="font-semibold text-xs text-primary mb-1">No Syllabus Found</div>
            <p className="text-2xs text-slate-400 max-w-xs mx-auto">
              Your teachers have not uploaded syllabus documents for the selected filter yet.
            </p>
          </div>
        )}
      </div>

      {/* Syllabus Viewer Modal */}
      {previewFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-primary text-white p-4 px-6 flex justify-between items-center">
              <div>
                <span className="text-2xs font-extrabold text-blue-200 uppercase tracking-widest block">
                  {previewFile.subject} • {previewFile.className}
                </span>
                <h3 className="font-display font-bold text-lg">{previewFile.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="text-white hover:text-blue-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs text-slate-700">
                <span className="font-bold text-primary">Uploaded by:</span> {previewFile.teacherName} ({formatDateDDMMYYYY(previewFile.createdAt)})
                {previewFile.description && <p className="mt-1 text-slate-600">{previewFile.description}</p>}
              </div>

              {previewFile.fileType === 'image' || previewFile.fileUrl?.startsWith('data:image/') || previewFile.fileUrl?.match(/\.(jpeg|jpg|png|webp|gif)$/i) ? (
                <img src={previewFile.fileUrl} alt="Syllabus" className="w-full h-auto rounded-xl border border-slate-200 shadow-sm" />
              ) : (
                <iframe src={previewFile.fileUrl} title="Syllabus PDF" className="w-full h-[500px] rounded-xl border border-slate-200 shadow-sm" />
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center px-6">
              <a
                href={previewFile.fileUrl}
                download={`${previewFile.subject}_Syllabus`}
                target="_blank"
                rel="noreferrer"
                className="btn-outline text-xs py-2 px-4 font-bold flex items-center gap-1.5"
              >
                📥 Download Original Document
              </a>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="btn-primary text-xs py-2 px-5 font-bold"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Student Library (My Books & Fines)
// ==========================================
export default StudentSyllabus;
