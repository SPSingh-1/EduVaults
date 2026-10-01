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
      showToast('Remark updated successfully.', 'success');
      loadTimetable();
    } catch (err) {
      console.error(err);
      showToast('Failed to save remark.', 'error');
    }
  };

  const handleCancelClass = async (e) => {
    e.preventDefault();
    if (!activeItem || !cancelReason) return;
    try {
      await apiClient.post(`/academics/timetable/cancel/${activeItem.id}`, { reason: cancelReason });
      setShowCancelModal(false);
      setCancelReason('');
      showToast('Class cancelled successfully.', 'info');
      loadTimetable();
    } catch (err) {
      console.error(err);
      showToast('Failed to cancel class.', 'error');
    }
  };

  const handleRestoreClass = async (item) => {
    if (!item) return;
    try {
      await apiClient.post(`/academics/timetable/restore/${item.id}`);
      showToast('Class schedule restored.', 'success');
      loadTimetable();
    } catch (err) {
      console.error(err);
      showToast('Failed to restore class.', 'error');
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = [1, 2, 3, 4, 5];

  if (loading) {
    return <Loader message="Accessing class schedules & mappings" />;
  }

  return (
    <div>
      <Topbar title="My Assigned Classes" subtitle="Manage schedules, remarks, and cancellations" />
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
                <div className="font-bold text-sm text-primary">{formatClassLabel(c.grade, c.section)}</div>
                <div className="text-xs text-gray-400 mt-1">Room {c.room} · {c.enrolled} Students</div>
                {c.isClassTeacher && <span className="inline-block mt-2 px-2 py-0.5 rounded bg-green-100 text-green-800 text-2xs font-extrabold">🏫 Advisory Class</span>}
              </button>
            ))}
          </div>

          {/* Timetable Grid Schedule */}
          <div className="col-span-3 card">
            <h3 className="font-display font-semibold text-primary text-base mb-4">
              📅 Timetable Schedule: {formatClassLabel(selectedClass?.grade, selectedClass?.section)}
            </h3>

            <div className="overflow-x-auto">
              <div className="min-w-[700px] md:min-w-0">
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
                          className={`p-3 border rounded-xl flex flex-col justify-between min-h-[90px] text-left relative ${isCancelled
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
                                    className={`text-[10px] leading-snug font-medium mt-1.5 p-1 px-2 rounded-md border cursor-help transition-all ${isCancelled
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
          </div>
        </div>

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
export default TeacherClasses;
