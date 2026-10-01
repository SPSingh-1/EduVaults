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

export const StudentHomework = () => {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [homeworks, setHomeworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submissionFile, setSubmissionFile] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');

  const fetchHomeworks = async () => {
    try {
      // Fetch student profile first
      const profRes = await apiClient.get('/academics/student/profile');
      const prof = profRes.data;
      setProfile(prof);

      // Fetch homework assignments
      const homeworkRes = await expressClient.get('/homework');
      const studentClass = `${prof.class} - ${prof.section}`;
      const filtered = homeworkRes.data.filter(h => h.className === studentClass || h.className.includes(prof.class));
      setHomeworks(filtered);
    } catch (err) {
      console.error('Error loading student homework:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeworks();
  }, []);

  const handleSubmitHomework = async (id) => {
    if (!submissionFile) {
      toast.warning('Please attach a solution file (PDF or Image) before submitting.');
      return;
    }
    setSubmittingId(id);
    try {
      await expressClient.post(`/homework/${id}/submit-file`, {
        submissionFileUrl: submissionFile,
        submissionNotes
      });
      setSubmitSuccess(true);
      toast.success('Assignment submitted successfully!');
      await fetchHomeworks();
      setTimeout(() => {
        setSubmitSuccess(false);
        setSelectedHomework(null);
        setSubmissionFile('');
        setSubmissionNotes('');
      }, 1500);
    } catch (err) {
      console.error('Error submitting homework:', err);
      toast.error(err.response?.data?.error || 'Failed to submit homework.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return <Loader message="Retrieving your homework assignments" />;
  }

  return (
    <div>
      <Topbar title="My Homework Assignments" subtitle="Academic Tasks › Homework" />
      <div className="card">
        <p className="text-xs text-gray-400 mb-4">Complete and submit your tasks before their due dates with attached solution files (PDF / Image).</p>
        <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-150">
                <th className="table-th text-left">Assignment Details</th>
                <th className="table-th text-left">Instructions & Attachments</th>
                <th className="table-th text-center">Due Date</th>
                <th className="table-th text-center">Status</th>
                <th className="table-th text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {homeworks.map((h, i) => {
                const isSubmitted = h.submittedStudents?.includes(profile?.id);
                const isClosed = h.status === 'Completed';

                return (
                  <tr key={h._id || i} className="border-b border-gray-100 hover:bg-gray-50/55 transition-colors">
                    <td className="table-td">
                      <div className="font-semibold text-sm text-primary">{h.title}</div>
                      <div className="text-2xs text-gray-400 mt-0.5">{h.className}</div>
                    </td>
                    <td className="table-td text-sm text-slate-650 max-w-xs">
                      <div className="truncate">{h.instructions}</div>
                      {h.attachmentUrl && (
                        <a
                          href={h.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-2xs font-bold text-purple-600 hover:underline mt-1"
                        >
                          📎 View Reference PDF/Image
                        </a>
                      )}
                    </td>
                    <td className="table-td text-center text-sm font-semibold text-gray-500">
                      📅 {formatDateDDMMYYYY(h.dueDate)}
                    </td>
                    <td className="table-td text-center">
                      <span className={`badge ${isSubmitted ? 'badge-success' : isClosed ? 'badge-gray' : 'badge-warning'}`}>
                        {isSubmitted ? 'Submitted' : isClosed ? 'Closed' : 'Pending'}
                      </span>
                    </td>
                    <td className="table-td text-center">
                      {isSubmitted ? (
                        <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1.5">
                          ✓ Done
                        </span>
                      ) : isClosed ? (
                        <span className="text-xs text-gray-400 italic">Closed</span>
                      ) : (
                        <button
                          onClick={() => setSelectedHomework(h)}
                          className="btn-primary text-2xs py-1.5 px-3 rounded-lg hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer"
                        >
                          📤 Submit Assignment PDF
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {homeworks.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400 text-sm">No homework assignments posted for your class.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submission Modal */}
      {selectedHomework && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">📤 Submit Homework Assignment</h3>
                <p className="text-blue-200 text-xxs">Attach your completed assignment PDF or Image solution.</p>
              </div>
              {!submitSuccess && (
                <button
                  type="button"
                  onClick={() => setSelectedHomework(null)}
                  className="text-white hover:text-blue-200 text-lg transition-colors"
                >
                  ✖
                </button>
              )}
            </div>

            <div className="p-6 space-y-4">
              {submitSuccess ? (
                <div className="text-center py-6 space-y-3 animate-fadeIn">
                  <div className="w-16 h-16 bg-green-50 text-green-600 border border-green-200 rounded-full flex items-center justify-center text-3xl font-bold mx-auto animate-bounce">
                    🎉
                  </div>
                  <h4 className="font-display font-bold text-lg text-primary">Submission Successful!</h4>
                  <p className="text-xs text-gray-500">Your assignment PDF and solution notes have been submitted.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="text-2xs text-gray-400 font-bold uppercase tracking-wider">Assignment</div>
                    <div className="font-semibold text-primary text-sm">{selectedHomework.title}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-2xs text-gray-400 font-bold uppercase tracking-wider">Instructions</div>
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 max-h-24 overflow-y-auto border border-gray-100">
                      {selectedHomework.instructions}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                    <span className="font-medium">Due Date:</span>
                    <span className="font-bold">
                      📅 {formatDateDDMMYYYY(selectedHomework.dueDate)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-2xs font-bold text-gray-700 uppercase mb-1">Attach Assignment PDF / Image Solution *</label>
                      <input
                        type="file"
                        accept=".pdf,image/*"
                        onChange={e => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 15 * 1024 * 1024) {
                              toast.error('File size exceeds 15MB limit. Please choose a smaller file.');
                              e.target.value = '';
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (uploadEvent) => {
                              setSubmissionFile(uploadEvent.target.result);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="input text-xs"
                      />
                      {submissionFile && (
                        <div className="text-2xs text-green-600 font-bold mt-1">✓ Assignment File Ready for Upload</div>
                      )}
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-gray-700 uppercase mb-1">Submission Notes (Optional)</label>
                      <textarea
                        placeholder="Add any notes or comments for your teacher..."
                        value={submissionNotes}
                        onChange={e => setSubmissionNotes(e.target.value)}
                        className="input text-xs h-16 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      disabled={submittingId === selectedHomework._id}
                      onClick={() => setSelectedHomework(null)}
                      className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs hover:bg-gray-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingId === selectedHomework._id}
                      onClick={() => handleSubmitHomework(selectedHomework._id)}
                      className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/10 hover:shadow-lg transition-all"
                    >
                      {submittingId === selectedHomework._id ? (
                        <>
                          <span className="animate-spin">⏳</span> Submitting...
                        </>
                      ) : (
                        '📤 Confirm & Submit Solution'
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Student Daily Class Schedule ---
export default StudentHomework;
