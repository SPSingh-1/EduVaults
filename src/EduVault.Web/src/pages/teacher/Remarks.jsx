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
export default Remarks;
