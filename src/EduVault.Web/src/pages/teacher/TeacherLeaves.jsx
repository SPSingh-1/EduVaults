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

export const TeacherLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    leaveType: 'CL',
    dayType: 'FullDay',
    halfDaySession: 'Morning',
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    reason: ''
  });

  const fetchLeaveData = async () => {
    setLoading(true);
    try {
      const [leavesRes, balRes] = await Promise.all([
        apiClient.get('/academics/leave/my-leaves'),
        apiClient.get('/academics/leave/my-balance')
      ]);
      setLeaves(leavesRes.data || []);
      setBalance(balRes.data || null);
    } catch (err) {
      console.error('Failed to load leave records:', err);
      setError('Failed to load leave balance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.reason || !form.reason.trim()) {
      setError('Please provide a reason for the leave application.');
      return;
    }

    const reqFrom = form.fromDate;
    const reqTo = form.dayType === 'HalfDay' ? form.fromDate : form.toDate;

    if (reqFrom > reqTo) {
      setError('From date cannot be after To date.');
      return;
    }

    // Client-side duplicate / overlap check against existing active leave requests
    const conflicting = leaves.find(l => {
      if (l.status === 'Rejected') return false;
      const lFrom = (l.fromDate || '').split('T')[0];
      const lTo = (l.toDate || '').split('T')[0];
      const overlaps = lFrom <= reqTo && lTo >= reqFrom;
      if (!overlaps) return false;

      // If both are HalfDay on same date but different sessions (Morning vs Afternoon), allow both
      if (l.dayType === 'HalfDay' && form.dayType === 'HalfDay' && lFrom === reqFrom) {
        return (l.halfDaySession || 'Morning') === form.halfDaySession;
      }
      return true;
    });

    if (conflicting) {
      const conflictFrom = new Date(conflicting.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const conflictTo = new Date(conflicting.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const dateText = conflictFrom === conflictTo ? conflictFrom : `${conflictFrom} to ${conflictTo}`;
      setError(`A leave request (${conflicting.leaveType} - ${conflicting.status}) already exists on ${dateText}. Multiple leaves cannot be applied for the same day.`);
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/academics/leave/apply', {
        leaveType: form.leaveType,
        dayType: form.dayType,
        halfDaySession: form.dayType === 'HalfDay' ? form.halfDaySession : null,
        fromDate: form.fromDate,
        toDate: form.dayType === 'HalfDay' ? form.fromDate : form.toDate,
        reason: form.reason
      });
      setSuccess('Leave application submitted successfully! Awaiting Account Manager review.');
      setShowApplyModal(false);
      setForm({
        leaveType: 'CL',
        dayType: 'FullDay',
        halfDaySession: 'Morning',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        reason: ''
      });
      fetchLeaveData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to submit leave application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <Topbar title="My Leave Portal" subtitle="Apply for Leave, Track Approval Status & Check Annual Leave Quotas" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-emerald-400 shrink-0" />
            Teacher Leave Management
          </h1>
          <p className="text-sm text-emerald-200/90 max-w-xl">
            Apply for Casual Leave (CL), Sick Leave (SL), Earned Leave (EL), or Half-Day sessions. Your leave balances are managed in real-time.
          </p>
        </div>

        <button
          onClick={() => {
            setError('');
            setShowApplyModal(true);
          }}
          className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/25 transition flex items-center gap-2.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="font-semibold">{success}</p>
        </div>
      )}

      {/* Quota Balances 4 Cards */}
      {balance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Casual Leave (CL)</span>
            <div className="text-2xl font-black text-purple-600 font-mono">
              {balance.cl?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.cl?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.cl?.used || 0) / (balance.cl?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.cl?.used || 0} days used this year</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Sick Leave (SL)</span>
            <div className="text-2xl font-black text-teal-600 font-mono">
              {balance.sl?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.sl?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-teal-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.sl?.used || 0) / (balance.sl?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.sl?.used || 0} days used this year</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Earned Leave (EL/PL)</span>
            <div className="text-2xl font-black text-indigo-600 font-mono">
              {balance.el?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.el?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.el?.used || 0) / (balance.el?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.el?.used || 0} days used this year</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Maternity Leave (ML)</span>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {balance.ml?.remaining || 0} <span className="text-xs text-slate-400 font-normal">/ {balance.ml?.allotted || 0} left</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-rose-600 h-full rounded-full" style={{ width: `${Math.min(100, ((balance.ml?.used || 0) / (balance.ml?.allotted || 1)) * 100)}%` }} />
            </div>
            <p className="text-3xs text-slate-400 mt-1.5">{balance.ml?.used || 0} days used this year</p>
          </div>
        </div>
      )}

      {/* History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100">
          <h2 className="text-base font-extrabold text-slate-900">My Leave Applications History ({leaves.length})</h2>
          <p className="text-xs text-slate-400 mt-0.5">Status updates from School Account Office</p>
        </div>

        {loading ? (
          <div className="py-20 text-center"><Loader /></div>
        ) : leaves.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <CalendarCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No Leave Requests Logged</p>
            <p className="text-xs text-slate-400">Click "Apply for Leave" above to request time off.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3.5 px-6">TYPE</th>
                  <th className="py-3.5 px-4">DURATION / SESSION</th>
                  <th className="py-3.5 px-4">TOTAL DAYS</th>
                  <th className="py-3.5 px-4">REASON</th>
                  <th className="py-3.5 px-4">APPLIED ON</th>
                  <th className="py-3.5 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {leaves.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-2xs font-black">
                        {l.leaveType}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-700">
                      <div>
                        {new Date(l.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {l.dayType === 'FullDay' && l.fromDate !== l.toDate && ` to ${new Date(l.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                      </div>
                      <span className="text-3xs text-slate-400 font-semibold">
                        {l.dayType === 'HalfDay' ? `Half Day (${l.halfDaySession || 'Session'})` : 'Full Day'}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {l.totalDays} {l.totalDays === 1 ? 'day' : 'days'}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 max-w-xs truncate" title={l.reason}>
                      {l.reason}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500">
                      {new Date(l.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-3xs font-black uppercase tracking-wider border ${
                        l.status === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : l.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {l.status}
                      </span>
                      {l.rejectionNote && (
                        <span className="text-3xs text-rose-600 block mt-1">Note: {l.rejectionNote}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-300" />
                Apply for Leave
              </h3>
              <button onClick={() => setShowApplyModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleApply} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-2xl flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Leave Type</label>
                  <select
                    value={form.leaveType}
                    onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="CL">Casual Leave (CL)</option>
                    <option value="SL">Sick Leave (SL)</option>
                    <option value="EL">Earned Leave (EL/PL)</option>
                    <option value="ML">Maternity Leave (ML)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Session Type</label>
                  <select
                    value={form.dayType}
                    onChange={e => setForm(p => ({ ...p, dayType: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="FullDay">Full Day</option>
                    <option value="HalfDay">Half Day (0.5d)</option>
                  </select>
                </div>
              </div>

              {form.dayType === 'HalfDay' && (
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Half Day Session</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Morning', 'Afternoon'].map(sess => (
                      <button
                        key={sess}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, halfDaySession: sess }))}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                          form.halfDaySession === sess
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {sess} Session
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">From Date *</label>
                  <input
                    type="date"
                    required
                    value={form.fromDate}
                    onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                {form.dayType === 'FullDay' && (
                  <div>
                    <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">To Date *</label>
                    <input
                      type="date"
                      required
                      value={form.toDate}
                      onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Reason *</label>
                <textarea
                  required
                  value={form.reason}
                  onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                  placeholder="State reason for absence..."
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowApplyModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// Teacher Library (My Books & Fines)
// ==========================================
export default TeacherLeaves;
