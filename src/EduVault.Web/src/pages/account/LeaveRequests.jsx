import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  CalendarCheck, 
  Check, 
  X, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  Calendar, 
  MessageSquare,
  Sparkles,
  Filter
} from 'lucide-react';

const LeaveRequests = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/account/leave-requests');
      setLeaves(res.data || []);
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      setError('Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleUpdateStatus = async (id, status, note = '') => {
    try {
      await apiClient.put(`/account/leave-requests/${id}`, {
        status,
        rejectionNote: note
      });
      setSuccess(`Leave request marked as ${status}.`);
      setRejectingId(null);
      setRejectionNote('');
      fetchLeaves();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update leave request status.');
    }
  };

  const filtered = leaves.filter(l => {
    const s = search.toLowerCase();
    const matchesSearch = 
      (l.teacherName || '').toLowerCase().includes(s) ||
      (l.teacherEmail || '').toLowerCase().includes(s) ||
      (l.reason || '').toLowerCase().includes(s);
    
    const matchesStatus = statusFilter === 'ALL' || (l.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesType = typeFilter === 'ALL' || (l.leaveType || '').toUpperCase() === typeFilter.toUpperCase();

    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;
  const approvedCount = leaves.filter(l => l.status === 'Approved').length;
  const rejectedCount = leaves.filter(l => l.status === 'Rejected').length;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Teacher Leave Approvals" subtitle="Review and Approve / Reject Teacher Leave Applications" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Pending Review</span>
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">
              {pendingCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Requires approval action</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Approved Leaves</span>
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              {approvedCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Deducted from teacher quota</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Rejected</span>
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                <X className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {rejectedCount}
            </div>
            <p className="text-xs text-slate-400 mt-1">Declined applications</p>
          </div>
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

        {/* Requests Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'Pending', 'Approved', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Leave Types</option>
                <option value="CL">Casual Leave (CL)</option>
                <option value="SL">Sick Leave (SL)</option>
                <option value="EL">Earned Leave (EL)</option>
                <option value="ML">Maternity Leave (ML)</option>
              </select>

              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by teacher name..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center"><Loader /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <CalendarCheck className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">No Leave Requests Found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">TEACHER</th>
                    <th className="py-3.5 px-4">TYPE</th>
                    <th className="py-3.5 px-4">DURATION</th>
                    <th className="py-3.5 px-4">DAYS</th>
                    <th className="py-3.5 px-4">REASON</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filtered.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{l.teacherName}</div>
                        <div className="text-xs text-slate-400 font-mono">{l.teacherEmail}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-2xs font-black border border-purple-100">
                          {l.leaveType}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-700">
                        <div>
                          {new Date(l.fromDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          {l.dayType === 'FullDay' && l.fromDate !== l.toDate && ` - ${new Date(l.toDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                        </div>
                        <span className="text-3xs text-slate-400 font-semibold">
                          {l.dayType === 'HalfDay' ? `Half Day (${l.halfDaySession || 'Session'})` : 'Full Day'}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-slate-900">
                        {l.totalDays} {l.totalDays === 1 ? 'day' : 'days'}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 max-w-xs truncate" title={l.reason}>
                        {l.reason || 'N/A'}
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
                      </td>
                      <td className="py-4 px-4 text-right space-x-2">
                        {l.status === 'Pending' ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(l.id, 'Approved')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(l.id);
                                setRejectionNote('');
                              }}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-3xs text-slate-400 font-semibold">Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal with note */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 text-left">
            <h3 className="font-extrabold text-base text-slate-900">Reject Leave Application</h3>
            <p className="text-xs text-slate-500">Provide an optional reason for rejecting this leave request:</p>
            <textarea
              value={rejectionNote}
              onChange={e => setRejectionNote(e.target.value)}
              placeholder="e.g. Exam duty on this date..."
              rows={3}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setRejectingId(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
              <button
                onClick={() => handleUpdateStatus(rejectingId, 'Rejected', rejectionNote)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
