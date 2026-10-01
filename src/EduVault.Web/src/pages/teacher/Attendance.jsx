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

export const Attendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10)); // default to today (empty caused a 400 on first load)
  const [students, setStudents] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [rapidMode, setRapidMode] = useState(false);
  const [rapidIndex, setRapidIndex] = useState(0);

  useEffect(() => {
    if (!rapidMode) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleRapidMark('Absent');
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleRapidMark('Present');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleRapidMark('Late');
      } else if (e.key === 'Escape') {
        setRapidMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rapidMode, rapidIndex, students]);

  const handleRapidMark = (status) => {
    if (rapidIndex < students.length) {
      const studentId = students[rapidIndex].id;
      setStatus(studentId, status);
      setRapidIndex(prev => prev + 1);
    }
  };

  // Load teacher's own classes for the dropdown
  const fetchClasses = async () => {
    try {
      const res = await apiClient.get('/academics/teacher/classes');
      const classesList = Array.isArray(res.data) ? res.data : [];
      setClasses(classesList);
      // Auto-select the class where teacher is class teacher
      const classTeacherClass = classesList.find(c => c.isClassTeacher);
      if (classTeacherClass) {
        setSelectedClassId(classTeacherClass.id);
      } else if (classesList.length > 0) {
        setSelectedClassId(classesList[0].id);
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
        let cleanRemark;
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
      const isSaved = records.length > 0 && records.every(r => r.status !== null && r.status !== undefined && r.status !== '');
      setAttendanceSaved(isSaved);
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
      showToast('Failed to submit attendance.', 'error');
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
          ✅ Attendance saved successfully for {selectedClass ? formatClassLabel(selectedClass.grade, selectedClass.section) : 'this class'}!
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
                <option key={c.id} value={c.id}>{formatClassLabel(c.grade, c.section, c.room)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date</label>
            <input
              type="date"
              min={getTodayStr()}
              value={selectedDate}
              onChange={e => {
                const val = e.target.value;
                if (val && val < getTodayStr()) {
                  showToast("Past dates (aaj se pehle ki dates) select nahi ki ja sakti hain.", 'warning');
                  setSelectedDate(getTodayStr());
                } else {
                  setSelectedDate(val);
                }
              }}
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
              <button
                disabled={attendanceSaved && !isEditing}
                onClick={() => { setRapidIndex(0); setRapidMode(true); }}
                className={`px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg shadow-xs transition-all flex items-center gap-1.5 ${attendanceSaved && !isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span>⚡ 15-Sec Roll Call</span>
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
                className={`bg-white rounded-xl border shadow-sm px-5 py-4 flex flex-wrap items-center gap-4 transition-all ${s.status === 'Absent' ? 'border-red-100 bg-red-50/30'
                    : s.status === 'Late' ? 'border-amber-100 bg-amber-50/30'
                      : 'border-gray-100'
                  } ${attendanceSaved && !isEditing ? 'opacity-80' : ''}`}
              >
                {/* Student Info */}
                <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${s.status === 'Absent' ? 'bg-red-100 text-red-600'
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
                      className={`px-4 py-2 rounded-lg text-xs font-bold border-2 transition-all min-w-[72px] ${s.status === key ? activeClass : inactiveClass
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

      {/* ⚡ 15-Sec Rapid Mobile Roll Call Modal */}
      {rapidMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  ⚡
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">15-Sec Rapid Roll Call</h3>
                  <p className="text-2xs text-slate-500">
                    {rapidIndex < students.length
                      ? `Student ${rapidIndex + 1} of ${students.length}`
                      : 'Roll Call Finished!'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRapidMode(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-200"
                style={{
                  width: `${students.length > 0 ? (Math.min(rapidIndex, students.length) / students.length) * 100 : 0}%`
                }}
              />
            </div>

            {/* Active Student Card */}
            {rapidIndex < students.length ? (
              <div className="space-y-4">
                <div className="p-6 bg-gradient-to-b from-slate-50 to-slate-100/60 rounded-2xl border border-slate-200/80 text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-black flex items-center justify-center mx-auto border-2 border-primary/20">
                    {students[rapidIndex].name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-display font-extrabold text-xl text-slate-900">
                      {students[rapidIndex].name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono font-semibold">
                      Roll No: {students[rapidIndex].studentId || rapidIndex + 1}
                    </p>
                  </div>
                  <div>
                    <span className={`inline-block text-2xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                      students[rapidIndex].status === 'Present'
                        ? 'bg-emerald-100 text-emerald-800'
                        : students[rapidIndex].status === 'Absent'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      Current: {students[rapidIndex].status}
                    </span>
                  </div>
                </div>

                {/* 3 Touch-Friendly Rapid Buttons */}
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => handleRapidMark('Absent')}
                    className="py-4 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border-2 border-rose-200 rounded-2xl flex flex-col items-center justify-center gap-1 transition"
                  >
                    <span className="text-xl">✗</span>
                    <span className="text-xs font-black">ABSENT</span>
                    <span className="text-3xs text-rose-500 font-semibold">[← Key]</span>
                  </button>

                  <button
                    onClick={() => handleRapidMark('Late')}
                    className="py-4 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-700 border-2 border-amber-200 rounded-2xl flex flex-col items-center justify-center gap-1 transition"
                  >
                    <span className="text-xl">⏰</span>
                    <span className="text-xs font-black">LATE</span>
                    <span className="text-3xs text-amber-500 font-semibold">[↓ Key]</span>
                  </button>

                  <button
                    onClick={() => handleRapidMark('Present')}
                    className="py-4 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-700 border-2 border-emerald-200 rounded-2xl flex flex-col items-center justify-center gap-1 transition"
                  >
                    <span className="text-xl">✓</span>
                    <span className="text-xs font-black">PRESENT</span>
                    <span className="text-3xs text-emerald-500 font-semibold">[→ Key]</span>
                  </button>
                </div>

                {/* Navigation Back / Next Preview */}
                <div className="flex items-center justify-between pt-2 text-2xs text-slate-500">
                  <button
                    disabled={rapidIndex === 0}
                    onClick={() => setRapidIndex(Math.max(0, rapidIndex - 1))}
                    className="hover:text-slate-800 disabled:opacity-40 font-semibold"
                  >
                    ← Previous Student
                  </button>

                  {rapidIndex + 1 < students.length && (
                    <span className="truncate max-w-[180px]">
                      Next: {students[rapidIndex + 1].name}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              /* Finish Screen */
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg">All Students Marked!</h4>
                  <p className="text-xs text-slate-500 mt-1">Review the totals and submit attendance now</p>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-2xs text-slate-400 font-bold block">PRESENT</span>
                    <strong className="text-emerald-700 text-base">{presentCount}</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-slate-400 font-bold block">ABSENT</span>
                    <strong className="text-rose-700 text-base">{absentCount}</strong>
                  </div>
                  <div>
                    <span className="text-2xs text-slate-400 font-bold block">LATE</span>
                    <strong className="text-amber-700 text-base">{lateCount}</strong>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setRapidIndex(0)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Restart
                  </button>
                  <button
                    onClick={async () => {
                      setRapidMode(false);
                      await handleSubmit();
                    }}
                    className="flex-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Save & Submit Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// --- Student Marks Entry ---
export default Attendance;
