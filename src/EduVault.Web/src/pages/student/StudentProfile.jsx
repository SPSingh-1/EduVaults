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

export const StudentProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({ guardianPhone: '', address: '', bloodGroup: '' });

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/academics/student/profile');
      setProfile(res.data);
      setForm({
        guardianPhone: res.data.guardianPhone || '',
        address: res.data.address || '',
        bloodGroup: res.data.bloodGroup || '',
      });
    } catch (err) {
      console.error('Failed to load DB profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await apiClient.patch('/academics/student/profile', {
        guardianPhone: form.guardianPhone,
        address: form.address,
        bloodGroup: form.bloodGroup,
      });
      await loadProfile();
      setEditing(false);
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setSaveMsg('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      guardianPhone: profile?.guardianPhone || '',
      address: profile?.address || '',
      bloodGroup: profile?.bloodGroup || '',
    });
    setEditing(false);
  };

  if (loading) {
    return <Loader message="Retrieving your student profile" />;
  }
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  return (
    <div>
      <Topbar title="My Profile" />
      <div className="card max-w-4xl border border-slate-100 hover:shadow-xs transition-shadow">

        {/* Header */}
        <div className="flex items-center justify-between gap-5 mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md border-4 border-white select-none">
              {profile?.firstName ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase() : 'ST'}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-primary">{profile?.firstName} {profile?.lastName}</h2>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-slate-400" /> Student Account</span>
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {profile?.email}</span>
                <span className="flex items-center gap-1.5"><Fingerprint className="w-4 h-4 text-slate-400" /> #{profile?.studentId}</span>
              </div>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-outline text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-all select-none cursor-pointer">
              <PenTool className="w-3.5 h-3.5 text-primary" /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleCancel} className="btn-outline text-xs cursor-pointer select-none">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-xs cursor-pointer select-none">
                {saving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          )}
        </div>

        {saveMsg && (
          <div className={`mb-4 text-xs font-semibold rounded-lg px-4 py-2.5 ${saveMsg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {saveMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          {/* Academic Enrollment — all read-only */}
          <div>
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-4 pb-1.5 border-b border-slate-100">
              <Building className="w-4 h-4 text-primary/80" /> Academic Enrollment
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Class & Section</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-primary">{profile?.class} - {profile?.section}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Classroom Room</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.room}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Academic Year</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.academicYear}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Enrollment Date</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.enrollDate}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned by admin — cannot be changed" />
                </div>
              </div>
            </div>
          </div>

          {/* Guardian & Medical — partially editable */}
          <div>
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-4 pb-1.5 border-b border-slate-100">
              <HeartPulse className="w-4 h-4 text-rose-500" /> Guardian & Medical Info
            </h3>
            <div className="space-y-1">
              {/* Guardian Name — read only */}
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Guardian Name</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-primary">{profile?.guardianName} ({profile?.guardianRelationship})</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Managed by admin" />
                </div>
              </div>
              {/* Contact Phone — editable */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 px-1 hover:bg-slate-50/10 rounded-lg">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Contact Phone</span>
                {editing ? (
                  <input
                    type="tel"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={form.guardianPhone}
                    onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    className="input text-xs py-1.5 px-3 w-40 text-right border border-slate-200 focus:border-primary rounded-lg focus:ring-1 focus:ring-primary/20 font-mono"
                    placeholder="9876543210"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-700 font-mono">{profile?.guardianPhone}</span>
                )}
              </div>
              {/* Blood Group — editable */}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 px-1 hover:bg-slate-50/10 rounded-lg">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Blood Group</span>
                {editing ? (
                  <select value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} className="input text-xs py-1.5 px-3 w-32 border border-slate-200 focus:border-primary rounded-lg">
                    <option value="">Select...</option>
                    {bloodGroups.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                ) : (
                  <span className="badge bg-red-50 text-red-700 border border-red-200/60 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-lg select-none">{profile?.bloodGroup || 'Not Specified'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Address — editable, full width */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-3.5 pb-1.5 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-emerald-500" /> Residential Address
            </h3>
            {editing ? (
              <textarea
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                rows={3}
                className="input resize-none text-xs w-full border border-slate-200 focus:border-primary rounded-xl focus:ring-1 focus:ring-primary/20 p-3"
                placeholder="Enter full residential address..."
              />
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150/40 text-slate-650 leading-relaxed font-semibold text-xs">
                {profile?.address || 'No registered address.'}
              </div>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-6 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-normal flex items-start gap-2 select-none">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              <strong>Locked Parameters</strong>: Class, Room, Academic Year, and Student ID are managed exclusively by the school registrar and cannot be modified directly.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Student Homework View ---
export default StudentProfile;
