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

export const Homework = () => {
  const [homeworks, setHomeworks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [classSelector, setClassSelector] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [hwAttachment, setHwAttachment] = useState('');

  // Sub-Tab state ('homework' | 'syllabus')
  const [activeTab, setActiveTab] = useState('homework');

  // Syllabus State
  const [syllabi, setSyllabi] = useState([]);
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [sTitle, setSTitle] = useState('');
  const [sSubject, setSSubject] = useState('Mathematics');
  const [sClass, setSClass] = useState('');
  const [sDescription, setSDescription] = useState('');
  const [sFile, setSFile] = useState('');
  const [savingSyllabus, setSavingSyllabus] = useState(false);

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
      const [res, clsRes, sylRes] = await Promise.all([
        expressClient.get('/homework'),
        apiClient.get('/academics/classes'),
        expressClient.get('/syllabus').catch(() => ({ data: [] }))
      ]);
      setHomeworks(res.data);
      setClasses(clsRes.data);
      setSyllabi(sylRes.data);
      if (clsRes.data.length > 0) {
        setClassSelector(clsRes.data[0].id);
        setSClass(formatClassLabel(clsRes.data[0].grade, clsRes.data[0].section));
      }
    } catch (err) {
      console.error('Error fetching homeworks/syllabus:', err);
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
      ? formatClassLabel(matchedClassObj.grade, matchedClassObj.section)
      : formatGrade(classSelector);

      await expressClient.post('/homework', {
        title,
        className: formattedClassName,
        dueDate,
        instructions,
        attachmentUrl: hwAttachment,
        totalStudents
      });
      setShowNew(false);
      setTitle('');
      setInstructions('');
      setDueDate('');
      setHwAttachment('');
      fetchHomeworksAndClasses();
    } catch (err) {
        console.error(err);
      setError('Failed to create assignment.');
    } finally {
        setLoading(false);
    }
  };

  const handleLogSubmission = async (id) => {
        setOpenMenuId(null);
      try {
        await expressClient.put(`/homework/${id}/submit`);
      fetchHomeworksAndClasses();
      showToast('Submission logged successfully.', 'success');
    } catch (err) {
        console.error(err);
      showToast('Failed to log submission.', 'error');
    }
  };

  const handleUpdateStatus = async (id, status) => {
        setOpenMenuId(null);
      try {
        await expressClient.put(`/homework/${id}/status`, { status });
      fetchHomeworksAndClasses();
      showToast(`Status updated to ${status}.`, 'info');
    } catch (err) {
        console.error(err);
      showToast('Failed to update homework status.', 'error');
    }
  };

  const handleSyncCount = async (id, className) => {
        setOpenMenuId(null);
      try {
      // Find the matching class by name to get current enrolled count
      const match = classes.find(c =>
      formatClassLabel(c.grade, c.section) === className ||
      formatGrade(c.grade) === className ||
      `Class ${c.grade} - ${c.section}` === className ||
      `Class ${c.grade}` === className
      );
      const totalStudents = match ? (match.enrolled || 0) : 0;
      await expressClient.put(`/homework/${id}/sync-count`, {totalStudents});
      fetchHomeworksAndClasses();
      showToast('Enrollment count synced.', 'success');
    } catch (err) {
        console.error(err);
      showToast('Failed to sync enrollment count.', 'error');
    }
  };

  const handleDeleteHomework = async (id) => {
        setOpenMenuId(null);
      if (window.confirm('Are you sure you want to delete this homework assignment?')) {
      try {
        await expressClient.delete(`/homework/${id}`);
      fetchHomeworksAndClasses();
      showToast('Homework deleted.', 'info');
      } catch (err) {
        console.error(err);
      showToast('Failed to delete homework.', 'error');
      }
    }
  };

  const filteredHomeworks = homeworks.filter(h => {
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = (h.title || '').toLowerCase().includes(q);
      const classMatch = (h.className || '').toLowerCase().includes(q);
      if (!titleMatch && !classMatch) return false;
    }
    if (filterStatus && (h.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(h.dueDate || h.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(h.dueDate || h.createdAt) > to) return false;
    }
    return true;
  });

  const handleCreateSyllabus = async (e) => {
    e.preventDefault();
    if (!sTitle || !sClass || !sSubject || !sFile) {
      showToast('Please fill title, select subject, class, and attach PDF/image file.', 'warning');
      return;
    }
    setSavingSyllabus(true);
    try {
      await expressClient.post('/syllabus', {
        className: sClass,
        subject: sSubject,
        title: sTitle,
        fileUrl: sFile,
        description: sDescription
      });
      showToast('🎉 Syllabus uploaded successfully!', 'success');
      setShowSyllabusModal(false);
      setSTitle('');
      setSDescription('');
      setSFile('');
      fetchHomeworksAndClasses();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to upload syllabus.', 'error');
    } finally {
      setSavingSyllabus(false);
    }
  };

  const handleDeleteSyllabus = async (id) => {
    if (window.confirm('Delete this syllabus document?')) {
      try {
        await expressClient.delete(`/syllabus/${id}`);
        fetchHomeworksAndClasses();
        showToast('Syllabus deleted.', 'info');
      } catch (err) {
        showToast('Failed to delete syllabus.', 'error');
      }
    }
  };

  const activeCount = homeworks.filter(h => h.status === 'Active').length;
  const pendingCount = homeworks.filter(h => h.status === 'Pending Review').length;
  const completedCount = homeworks.filter(h => h.status === 'Completed').length;

  return (
    <div>
      <Topbar
        title="Homework & Curriculum Syllabus"
        subtitle="Faculty Portal › Academic Content"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSyllabusModal(true)}
              className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              📚 Upload Class Syllabus
            </button>
            <button
              onClick={() => { setError(''); setShowNew(true); }}
              className="btn-primary text-xs py-2 px-4"
            >
              + Create New Homework
            </button>
          </div>
        }
      />

      {/* Sub-Tabs Bar */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('homework')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'homework'
              ? 'border-primary text-primary font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>📝</span>
          <span>Assigned Homework ({homeworks.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('syllabus')}
          className={`pb-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'syllabus'
              ? 'border-purple-600 text-purple-700 font-extrabold'
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>📚</span>
          <span>Class Subject Syllabus ({syllabi.length})</span>
        </button>
      </div>
      {/* Homework View */}
      {activeTab === 'homework' && (
        <>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 bg-gray-50 p-2.5 border border-gray-100 rounded-xl">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search homework..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl"
                  style={{ width: '160px' }}
                />
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1 px-2.5 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary" style={{ width: '135px' }} />
                <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1 px-2.5 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary" style={{ width: '135px' }} />
                {(dateFrom || dateTo || search || filterStatus) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setFilterStatus(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
                )}
              </div>
            </div>
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
                  {filteredHomeworks.map((h, i) => {
                    const subStr = (h.submissions || '0/0').split('/');
                    const submittedFallback = parseInt(subStr[0]) || 0;
                    const totalFallback = parseInt(subStr[1]) || 0;
                    const submitted = (typeof h.submittedCount === 'number') ? h.submittedCount : submittedFallback;
                    const total = (typeof h.totalStudents === 'number' && h.totalStudents > 0) ? h.totalStudents : totalFallback;
                    const pct = total > 0 ? Math.min(100, Math.round((submitted / total) * 100)) : 0;
                    const menuId = h._id || i;
                    return (
                      <tr key={menuId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td">
                          <div className="font-semibold text-sm text-primary">{h.title}</div>
                          <div className="text-xs text-gray-400">{h.className}</div>
                          {h.attachmentUrl && (
                            <a
                              href={h.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-2xs font-bold text-purple-600 hover:underline mt-0.5"
                            >
                              📎 Reference File
                            </a>
                          )}
                        </td>
                        <td className="table-td text-sm text-gray-500">📅 {formatDateDDMMYYYY(h.dueDate)}</td>
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
                                onClick={() => handleLogSubmission(h._id)}
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
        </>
      )}

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Target Class *</label>
                    <select value={classSelector} onChange={e => setClassSelector(e.target.value)} className="input text-sm">
                      <option value="">Choose Class...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{formatClassLabel(c.grade, c.section)} ({c.enrolled || 0} enrolled)</option>
                      ))}
                    </select>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date *</label><input required type="date" value={dueDate} min={new Date().toISOString().split('T')[0]} onChange={e => setDueDate(e.target.value)} className="input text-sm" /></div>
                </div>
                                <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Instructions *</label><textarea required value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Provide detailed steps, links, or instructions..." className="input h-20 resize-none text-sm" /></div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Attach Reference PDF / Image (Optional)</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 15 * 1024 * 1024) {
                          showToast('Attachment exceeds 15MB limit. Please choose a smaller file.', 'error');
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (upEv) => setHwAttachment(upEv.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="input text-xs"
                  />
                  {hwAttachment && <span className="text-2xs text-green-600 font-bold block mt-1">✓ Reference Document Attached</span>}
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 pb-6 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowNew(false)} className="btn-outline text-xs">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">
                  {loading ? 'Creating assignment...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Syllabus View & Upload Section */}
        {activeTab === 'syllabus' && (
          <div className="space-y-6 mt-4">
            <div className="card bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
              <div>
                <span className="text-2xs font-extrabold uppercase tracking-widest text-purple-300">Curriculum Repository</span>
                <h3 className="text-lg font-bold mt-1">Manage Class Subject Syllabus</h3>
                <p className="text-xs text-purple-200 mt-0.5">Upload course outlines, chapter blueprints, and study materials for students.</p>
              </div>
              <button
                onClick={() => setShowSyllabusModal(true)}
                className="btn-primary bg-white text-purple-950 font-bold text-xs hover:bg-purple-50 py-2.5 px-4 rounded-xl shadow-lg"
              >
                + Upload Syllabus PDF
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {syllabi.map((s) => (
                <div key={s._id} className="card bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-3 py-1 rounded-full text-2xs font-extrabold bg-purple-50 text-purple-700 border border-purple-100 uppercase">
                        📘 {s.subject}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{s.className}</span>
                    </div>
                    <h4 className="font-display font-bold text-primary text-base line-clamp-2 mt-2">{s.title}</h4>
                    <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                      {s.description || 'Official course syllabus.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-3xs font-mono font-bold text-slate-400">{formatDateDDMMYYYY(s.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <a
                        href={s.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-outline text-xs py-1 px-3 border-purple-200 text-purple-700 hover:bg-purple-50"
                      >
                        👁️ View
                      </a>
                      <button
                        onClick={() => handleDeleteSyllabus(s._id)}
                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {syllabi.length === 0 && (
                <div className="col-span-full card text-center py-12 text-slate-400 text-xs italic">
                  No syllabus documents uploaded yet. Click "+ Upload Syllabus PDF" to add your first course outline.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Syllabus Modal */}
        {showSyllabusModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <form onSubmit={handleCreateSyllabus} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-purple-100">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 flex justify-between items-center">
                <h3 className="font-display font-bold text-lg">📚 Upload Class Syllabus</h3>
                <button type="button" onClick={() => setShowSyllabusModal(false)} className="text-white hover:text-purple-200 text-lg">✖</button>
              </div>

              <div className="p-6 space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Class *</label>
                  <select value={sClass} onChange={e => setSClass(e.target.value)} className="input text-xs font-semibold">
                    {classes.map(c => (
                      <option key={c.id} value={formatClassLabel(c.grade, c.section)}>{formatClassLabel(c.grade, c.section)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Subject *</label>
                  <select value={sSubject} onChange={e => setSSubject(e.target.value)} className="input text-xs font-semibold">
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English Literature">English Literature</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="Hindi">Hindi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Syllabus Document Title *</label>
                  <input
                    required
                    placeholder="e.g. Annual Mathematics Board Blueprint & Course Outline"
                    value={sTitle}
                    onChange={e => setSTitle(e.target.value)}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Attach Syllabus PDF / Image File *</label>
                  <input
                    type="file"
                    required={!sFile}
                    accept=".pdf,image/*"
                    onChange={e => {
                      const file = e.target.files[0];
                      if (file) {
                        if (file.size > 15 * 1024 * 1024) {
                          showToast('Syllabus file exceeds 15MB limit. Please choose a smaller file.', 'error');
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (upEv) => setSFile(upEv.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="input text-xs"
                  />
                  {sFile && <span className="text-2xs text-green-600 font-bold block mt-1">✓ File Attached Ready</span>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description / Course Topics</label>
                  <textarea
                    placeholder="Brief description of chapters, exam weightage, lab modules..."
                    value={sDescription}
                    onChange={e => setSDescription(e.target.value)}
                    className="input text-xs h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 pb-6 pt-2 border-t border-gray-100">
                <button type="button" onClick={() => setShowSyllabusModal(false)} className="btn-outline text-xs">Cancel</button>
                <button type="submit" disabled={savingSyllabus} className="btn-primary text-xs bg-purple-700 hover:bg-purple-800">
                  {savingSyllabus ? 'Uploading...' : '📤 Publish Syllabus'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
      );
};

// --- Teacher Profile ---
export default Homework;
