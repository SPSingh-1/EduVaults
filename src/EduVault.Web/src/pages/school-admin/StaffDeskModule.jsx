import React, { useState, useEffect, useCallback } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  AlertCircle,
  Filter,
  Search,
  UserCheck,
  Users,
  RefreshCw,
  FileText,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Edit3
} from 'lucide-react';

export default function StaffDeskModule() {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // ─── Attendance State ────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceData, setAttendanceData] = useState({ summary: null, records: [] });
  const [departments, setDepartments] = useState([]);

  // Attendance Punch Edit Modal
  const [punchModal, setPunchModal] = useState(null); // employee record
  const [punchForm, setPunchForm] = useState({ status: 'Present', checkInTime: '', checkOutTime: '', remarks: '' });
  const [savingPunch, setSavingPunch] = useState(false);

  // ─── Leave Desk State ────────────────────────────────────────────────────────
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('ALL');
  const [forwardModal, setForwardModal] = useState(null); // selected leave request
  const [forwardNote, setForwardNote] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // ─── Fetch Attendance ────────────────────────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (departmentFilter !== 'ALL') params.append('department', departmentFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiClient.get(`/hrm/attendance/daily?${params.toString()}`);
      if (res.data) {
        setAttendanceData(res.data);
        // Extract distinct departments
        const depts = Array.from(new Set(res.data.records.map(r => r.department).filter(Boolean)));
        setDepartments(depts);
      }
    } catch (err) {
      console.error('Failed to fetch daily attendance:', err);
      notify(err.response?.data?.error || 'Failed to load attendance records.', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, departmentFilter, searchQuery]);

  // ─── Fetch Leaves ────────────────────────────────────────────────────────────
  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: new Date(selectedDate).getFullYear() });
      if (leaveStatusFilter !== 'ALL') params.append('status', leaveStatusFilter);

      const res = await apiClient.get(`/hrm/leave-requests?${params.toString()}`);
      if (res.data && res.data.requests) {
        setLeaveRequests(res.data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch leave requests:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, leaveStatusFilter]);

  useEffect(() => {
    if (activeTab === 'attendance') {
      fetchAttendance();
    } else {
      fetchLeaves();
    }
  }, [activeTab, fetchAttendance, fetchLeaves]);

  // ─── Handle Attendance Punch Update ──────────────────────────────────────────
  const handleSavePunch = async () => {
    if (!punchModal) return;
    setSavingPunch(true);
    try {
      await apiClient.post('/hrm/attendance/mark', {
        employeeId: punchModal.employeeId,
        date: selectedDate,
        status: punchForm.status,
        checkInTime: punchForm.checkInTime || null,
        checkOutTime: punchForm.checkOutTime || null,
        remarks: punchForm.remarks || 'Updated from Staff Desk'
      });
      notify(`Attendance updated for ${punchModal.name}`);
      setPunchModal(null);
      fetchAttendance();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to update attendance.', 'error');
    } finally {
      setSavingPunch(false);
    }
  };

  // ─── Handle Forward Leave to Accounts ────────────────────────────────────────
  const handleForwardLeave = async () => {
    if (!forwardModal) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/hrm/leave-requests/${forwardModal.id}/forward`, {
        note: forwardNote || 'Verified by School Admin and recommended for approval.'
      });
      notify('Leave request successfully forwarded to Accounts Department.');
      setForwardModal(null);
      setForwardNote('');
      fetchLeaves();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to forward leave request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Handle Reject Leave ─────────────────────────────────────────────────────
  const handleRejectLeave = async () => {
    if (!rejectModal) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/hrm/leave-requests/${rejectModal.id}/reject`, {
        note: rejectReason || 'Rejected by School Admin.'
      });
      notify('Leave request rejected.');
      setRejectModal(null);
      setRejectReason('');
      fetchLeaves();
    } catch (err) {
      notify(err.response?.data?.error || 'Failed to reject leave request.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const summary = attendanceData.summary || {
    totalStaff: 0,
    presentCount: 0,
    absentCount: 0,
    onLeaveCount: 0,
    lateCount: 0,
    attendanceRate: 0
  };

  return (
    <div className="space-y-6">
      <Topbar
        title="Staff Attendance & Leave Desk"
        subtitle="Daily Roll Call, Real-Time Punch Tracking & Leave Review Desk"
      />

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center justify-between shadow-sm transition-all ${
            notification.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{notification.msg}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Desk Navigation Tabs */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-sm">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'attendance'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          Daily Staff Attendance Roll Call
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'leaves'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" />
          Leave Review & Forwarding Desk
          {leaveRequests.filter(r => r.status === 'Pending').length > 0 && (
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              {leaveRequests.filter(r => r.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: DAILY ATTENDANCE ROLL CALL */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-64">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff name or code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none w-full"
                />
              </div>
            </div>

            <button
              onClick={fetchAttendance}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{summary.totalStaff}</div>
                <div className="text-xs text-slate-500 font-medium">Total Staff</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-emerald-600">{summary.presentCount}</div>
                <div className="text-xs text-slate-500 font-medium">Present</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-rose-600">{summary.absentCount}</div>
                <div className="text-xs text-slate-500 font-medium">Absent</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-amber-600">{summary.onLeaveCount}</div>
                <div className="text-xs text-slate-500 font-medium">On Leave</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{summary.lateCount}</div>
                <div className="text-xs text-slate-500 font-medium">Late</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-indigo-600">{summary.attendanceRate}%</div>
                <div className="text-xs text-slate-500 font-medium">Turnout Rate</div>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Staff Attendance Roll Call</h3>
                <p className="text-xs text-slate-500 mt-0.5">Date: {new Date(selectedDate).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'short', year:'numeric' })}</p>
              </div>
              <div className="text-xs text-slate-400">
                Showing {attendanceData.records.length} staff records
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center"><Loader /></div>
            ) : attendanceData.records.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No staff records found for this date and filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Code</th>
                      <th className="py-3.5 px-4">Department & Role</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">In / Out Punch</th>
                      <th className="py-3.5 px-4">Source</th>
                      <th className="py-3.5 px-4">Remarks</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendanceData.records.map(emp => {
                      const isPresent = emp.status === 'Present';
                      const isAbsent = emp.status === 'Absent';
                      const isOnLeave = emp.status === 'OnLeave';
                      const isLate = emp.status === 'Late';

                      return (
                        <tr key={emp.employeeId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {emp.name}
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {emp.employeeCode || '—'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-slate-800 font-medium">{emp.department || 'General'}</span>
                            <span className="text-slate-400 block text-[11px]">{emp.designation || 'Staff'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isPresent ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              isAbsent ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              isOnLeave ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              isLate ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isPresent ? 'bg-emerald-500' :
                                isAbsent ? 'bg-rose-500' :
                                isOnLeave ? 'bg-amber-500' :
                                isLate ? 'bg-blue-500' : 'bg-slate-400'
                              }`} />
                              {emp.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                            {emp.checkIn || '—'} / {emp.checkOut || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">
                            {emp.source}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] max-w-xs truncate">
                            {emp.remarks || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setPunchModal(emp);
                                setPunchForm({
                                  status: emp.status === 'OnLeave' ? 'Present' : emp.status,
                                  checkInTime: emp.checkIn || '',
                                  checkOutTime: emp.checkOut || '',
                                  remarks: emp.remarks || ''
                                });
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-600 text-slate-700 rounded-lg text-xs font-semibold transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Update
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LEAVE REVIEW & FORWARDING DESK */}
      {activeTab === 'leaves' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-500 uppercase">Status Filter:</span>
              {['ALL', 'Pending', 'ForwardedToAccounts', 'Approved', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => setLeaveStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    leaveStatusFilter === st
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Requests' :
                   st === 'ForwardedToAccounts' ? 'Forwarded to Accounts' : st}
                </button>
              ))}
            </div>

            <button
              onClick={fetchLeaves}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          {/* Leave Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Staff Leave Applications</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                School Admin operational review desk. Forward verified requests with recommendation notes to Accounts department for financial clearance.
              </p>
            </div>

            {loading ? (
              <div className="p-12 text-center"><Loader /></div>
            ) : leaveRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">
                No leave requests match the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-3.5 px-4">Applicant</th>
                      <th className="py-3.5 px-4">Leave Type</th>
                      <th className="py-3.5 px-4">Period & Duration</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Current Status</th>
                      <th className="py-3.5 px-4">Admin Recommendation</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaveRequests.map(req => {
                      const isPending = req.status === 'Pending';
                      const isForwarded = req.status === 'ForwardedToAccounts';
                      const isApproved = req.status === 'Approved';
                      const isRejected = req.status === 'Rejected';

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-900 block">{req.employeeName || 'Staff Member'}</span>
                            <span className="text-slate-400 text-[11px]">Applied {new Date(req.appliedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-bold text-[11px] border border-purple-200">
                              {req.leaveType}
                            </span>
                            <span className="text-slate-500 block text-[11px] mt-0.5">{req.leaveTypeName}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">
                              {new Date(req.fromDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })} → {new Date(req.toDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                            </div>
                            <span className="text-purple-600 font-bold text-[11px]">{req.totalDays} day(s) ({req.dayType})</span>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs truncate text-slate-600">
                            {req.reason || '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              isForwarded ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isApproved ? 'bg-emerald-500' :
                                isRejected ? 'bg-rose-500' :
                                isForwarded ? 'bg-indigo-500' : 'bg-amber-500'
                              }`} />
                              {isForwarded ? 'Forwarded to Accounts' : req.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 text-[11px] max-w-xs">
                            {req.forwardNote ? (
                              <div>
                                <span className="font-medium text-slate-800">Note: </span>
                                {req.forwardNote}
                                {req.forwardedAt && (
                                  <span className="text-slate-400 block text-[10px]">
                                    Forwarded {new Date(req.forwardedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">No notes</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setForwardModal(req);
                                    setForwardNote('Verified by School Admin. Reliever arranged. Recommended for approval.');
                                  }}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                                >
                                  <Send className="w-3 h-3" />
                                  Forward to Accounts
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectModal(req);
                                    setRejectReason('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold border border-rose-200 transition"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Reject
                                </button>
                              </div>
                            ) : isForwarded ? (
                              <span className="text-[11px] text-indigo-600 font-semibold flex items-center justify-end gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                Pending with Accounts
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Completed</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PUNCH UPDATE MODAL ────────────────────────────────────────────────── */}
      {punchModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Update Attendance Punch</h3>
                <p className="text-xs text-slate-500 mt-0.5">{punchModal.name} ({punchModal.employeeCode})</p>
              </div>
              <button
                onClick={() => setPunchModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Status</label>
                <select
                  value={punchForm.status}
                  onChange={e => setPunchForm({ ...punchForm, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium outline-none"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="HalfDay">HalfDay</option>
                  <option value="Late">Late</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Check-In Time</label>
                  <input
                    type="time"
                    value={punchForm.checkInTime}
                    onChange={e => setPunchForm({ ...punchForm, checkInTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Check-Out Time</label>
                  <input
                    type="time"
                    value={punchForm.checkOutTime}
                    onChange={e => setPunchForm({ ...punchForm, checkOutTime: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Remarks / Note</label>
                <textarea
                  rows="2"
                  value={punchForm.remarks}
                  onChange={e => setPunchForm({ ...punchForm, remarks: e.target.value })}
                  placeholder="e.g. Manual correction by principal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setPunchModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePunch}
                disabled={savingPunch}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {savingPunch ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FORWARD LEAVE MODAL ──────────────────────────────────────────────── */}
      {forwardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Forward to Accounts Department</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recommendation for {forwardModal.employeeName} ({forwardModal.leaveType} · {forwardModal.totalDays} days)
                </p>
              </div>
              <button
                onClick={() => setForwardModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-100 text-purple-900">
                <p className="font-semibold">Workflow Rule:</p>
                <p className="text-[11px] text-purple-700 mt-0.5">
                  As School Admin, your recommendation will forward this leave to the Accounts Department. The Account Manager will perform final financial validation against payroll and leave quota.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  School Admin Recommendation Note
                </label>
                <textarea
                  rows="3"
                  value={forwardNote}
                  onChange={e => setForwardNote(e.target.value)}
                  placeholder="e.g. Verified by School Admin. Reliever arranged. Recommended for approval."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setForwardModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleForwardLeave}
                disabled={actionLoading}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {actionLoading ? 'Forwarding...' : 'Forward to Accounts'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECT LEAVE MODAL ───────────────────────────────────────────────── */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-rose-700 text-base">Reject Leave Request</h3>
                <p className="text-xs text-slate-500 mt-0.5">Applicant: {rejectModal.employeeName}</p>
              </div>
              <button
                onClick={() => setRejectModal(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Rejection *</label>
                <textarea
                  rows="3"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Specify why this leave cannot be granted..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectLeave}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
