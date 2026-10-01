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

  // Password Reset Modal State for Teachers
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const generateStudentPassword = () => `Stu#${Math.floor(100000 + Math.random() * 900000)}`;
  const [newStudentPassword, setNewStudentPassword] = useState(generateStudentPassword());
  const [resetPassLoading, setResetPassLoading] = useState(false);
  const [resetPassSuccess, setResetPassSuccess] = useState('');
  const [resetPassError, setResetPassError] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const [remarkText, setRemarkText] = useState('');
  const [tag, setTag] = useState('NEUTRAL');
  const [savingRemark, setSavingRemark] = useState(false);

  const fetchRoster = async () => {
    try {
      const clsRes = await apiClient.get('/academics/teacher/classes');
      setClasses(clsRes.data);

      const studRes = await apiClient.get('/academics/students');

      const clsData = Array.isArray(clsRes.data) ? clsRes.data : [];
      const studData = Array.isArray(studRes.data) ? studRes.data : [];

      // Filter roster to show students matching classes taught by the teacher
      const taughtClassIds = clsData.map(c => c.id);
      const taughtStudents = studData.filter(s => taughtClassIds.includes(s.classId));
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
      showToast('Feedback remark saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to log remark.', 'error');
    } finally {
      setSavingRemark(false);
    }
  };

  const handleOpenResetPass = (student) => {
    setResetStudentObj(student);
    setNewStudentPassword(generateStudentPassword());
    setResetPassSuccess('');
    setResetPassError('');
    setShowPasswordText(false);
    setShowResetPassModal(true);
  };

  const handleExecuteResetPass = async (e) => {
    e.preventDefault();
    if (!resetStudentObj) return;
    setResetPassLoading(true);
    setResetPassError('');
    setResetPassSuccess('');
    try {
      const res = await apiClient.post('/support/reset-student-password', {
        studentId: resetStudentObj.id,
        newPassword: newStudentPassword
      });
      if (res.data.success) {
        setResetPassSuccess(res.data.message || 'Password successfully updated.');
      } else {
        setResetPassError(res.data.error || 'Failed to update password.');
      }
    } catch (err) {
      setResetPassError(err.response?.data?.error || 'Failed to update student password.');
    } finally {
      setResetPassLoading(false);
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
              <option key={c.id} value={c.id}>{formatClassLabel(c.grade, c.section)}</option>
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
                        <button
                          onClick={() => handleOpenResetPass(s)}
                          className="px-2.5 py-1 text-2xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-all flex items-center gap-1"
                          title="Reset Student Password"
                        >
                          🔑 Reset Pass
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

      {/* Teacher Student Password Reset Modal */}
      {showResetPassModal && resetStudentObj && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg">
                  🔑
                </div>
                <div>
                  <h3 className="font-display font-bold text-primary text-base">Reset Student Password</h3>
                  <p className="text-xs text-gray-500">Teacher classroom credential assist</p>
                </div>
              </div>
              <button 
                onClick={() => setShowResetPassModal(false)}
                className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteResetPass} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-sm text-slate-800">{resetStudentObj.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>Class: <strong>{resetStudentObj.class} - {resetStudentObj.section}</strong></span>
                  <span>ID: <strong className="font-mono">{resetStudentObj.studentId}</strong></span>
                </div>
                <div className="text-xs text-slate-400 font-mono truncate">{resetStudentObj.email}</div>
              </div>

              {resetPassSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>✓</span> {resetPassSuccess}
                  </div>
                  <div className="p-2 bg-white/80 rounded-lg border border-emerald-100 flex items-center justify-between font-mono text-xs">
                    <span>New Password: <strong>{newStudentPassword}</strong></span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(newStudentPassword)}
                      className="text-emerald-700 hover:underline text-2xs font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {resetPassError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  ⚠️ {resetPassError}
                </div>
              )}

              {!resetPassSuccess && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                    <div className="relative">
                      <input 
                        type={showPasswordText ? 'text' : 'password'}
                        value={newStudentPassword}
                        onChange={e => setNewStudentPassword(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        className="input pr-10 text-xs sm:text-sm font-mono"
                        required
                        minLength={6}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {showPasswordText ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-2xs text-gray-400 font-semibold uppercase tracking-wider">Quick Preset:</span>
                    <button
                      type="button"
                      onClick={() => setNewStudentPassword(generateStudentPassword())}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                    >
                      🎲 Generate New PIN
                    </button>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  {resetPassSuccess ? 'Close' : 'Cancel'}
                </button>
                {!resetPassSuccess && (
                  <button
                    type="submit"
                    disabled={resetPassLoading || !newStudentPassword}
                    className="btn-primary text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{resetPassLoading ? 'Updating...' : '🔑 Update Password'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Attendance Page ---
export default TeacherStudents;
