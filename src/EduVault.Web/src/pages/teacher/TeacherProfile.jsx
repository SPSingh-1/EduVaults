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

export const TeacherProfile = () => {
  const [profile, setProfile] = useState(null);
      const [loading, setLoading] = useState(true);
      const [editing, setEditing] = useState(false);
      const [saving, setSaving] = useState(false);
      const [saveMsg, setSaveMsg] = useState('');
      const [form, setForm] = useState({firstName: '', lastName: '', qualifications: '', officeLocation: '' });

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/academics/teacher/profile');
      setProfile(res.data);
      setForm({
        firstName: res.data.firstName || '',
      lastName: res.data.lastName || '',
      qualifications: res.data.qualifications || '',
      officeLocation: res.data.officeLocation || '',
      });
    } catch (err) {
        console.error('Failed to load DB teacher profile:', err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {loadProfile(); }, []);

  const handleSave = async (e) => {
        e.preventDefault();
      setSaving(true);
      setSaveMsg('');
      try {
        await apiClient.patch('/academics/teacher/profile', {
          firstName: form.firstName,
          lastName: form.lastName,
          qualifications: form.qualifications,
          officeLocation: form.officeLocation,
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
          firstName: profile?.firstName || '',
          lastName: profile?.lastName || '',
          qualifications: profile?.qualifications || '',
          officeLocation: profile?.officeLocation || '',
        });
      setEditing(false);
  };

  if (loading) {
    return <Loader message="Retrieving your teacher profile" />;
  }

      return (
      <div>
        <Topbar title="My Profile" />
        <div className="card max-w-3xl">

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 w-full sm:w-auto">
              <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-3xl font-bold text-accent shrink-0">
                {profile?.firstName ? `${profile.firstName[0]}${profile.lastName[0]}` : '👤'}
              </div>
              <div className="text-center sm:text-left w-full">
                <h2 className="font-display text-2xl font-bold text-primary">{profile?.firstName} {profile?.lastName}</h2>
                <p className="text-accent font-semibold text-sm mt-0.5">{profile?.department || 'Faculty'}</p>
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mt-2 text-xs text-gray-500">
                  <span className="flex items-center justify-center sm:justify-start gap-1">👩‍🏫 Faculty Account</span>
                  <span className="flex items-center justify-center sm:justify-start gap-1">📧 {profile?.email}</span>
                  <span className="flex items-center justify-center sm:justify-start gap-1">🆔 Employee ID: #{profile?.employeeId}</span>
                </div>
              </div>
            </div>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="btn-outline text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto shrink-0">
                ✏️ Edit Profile
              </button>
            ) : (
              <div className="flex gap-2 w-full sm:w-auto shrink-0">
                <button onClick={handleCancel} className="btn-outline text-xs flex-1 sm:flex-none justify-center">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs flex-1 sm:flex-none justify-center">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 text-sm">
            {/* Left column */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-3.5">🏢 Administrative Assignment</h3>
              <div className="space-y-3">
                {/* Name — editable */}
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">First Name</span>
                  {editing ? (
                    <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="input text-sm py-1 px-2 w-28 sm:w-36 text-right" />
                  ) : (
                    <span className="font-semibold text-primary">{profile?.firstName}</span>
                  )}
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Last Name</span>
                  {editing ? (
                    <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="input text-sm py-1 px-2 w-28 sm:w-36 text-right" />
                  ) : (
                    <span className="font-semibold text-primary">{profile?.lastName}</span>
                  )}
                </div>
                {/* Department — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Department</span>
                  <span className="font-semibold text-primary">{profile?.department}</span>
                </div>
                {/* Office Room — editable */}
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Office Room</span>
                  {editing ? (
                    <input value={form.officeLocation} onChange={e => setForm(f => ({ ...f, officeLocation: e.target.value }))} className="input text-sm py-1 px-2 w-28 sm:w-36 text-right" />
                  ) : (
                    <span className="font-medium text-gray-700">{profile?.officeLocation}</span>
                  )}
                </div>
                {/* Joining Date — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Contract Joined</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-gray-700">{profile?.joined}</span>
                    <span className="text-xs text-gray-400 ml-1" title="Set by admin — cannot be changed">🔒</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-3.5">💼 Qualifications & Payout</h3>
              <div className="space-y-3">
                {/* Qualifications — editable */}
                <div className="flex justify-between items-center py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Qualifications</span>
                  {editing ? (
                    <input value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} className="input text-sm py-1 px-2 w-28 sm:w-36 text-right" />
                  ) : (
                    <span className="font-medium text-gray-700">{profile?.qualifications}</span>
                  )}
                </div>
                {/* Salary — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Monthly Salary</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">Rs. {profile?.salary?.toLocaleString() ?? '0'}</span>
                    <span className="text-xs text-gray-400" title="Set by admin — cannot be changed">🔒</span>
                  </div>
                </div>
                {/* Status — read only */}
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-xs text-gray-400 font-semibold uppercase">Staff Status</span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-green-600">{profile?.isActive ? 'ACTIVE' : 'ON LEAVE'}</span>
                    <span className="text-xs text-gray-400" title="Set by admin — cannot be changed">🔒</span>
                  </div>
                </div>
              </div>

              {editing && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 leading-relaxed">
                  🔒 <strong>Salary</strong>, <strong>Department</strong>, <strong>Status</strong>, and <strong>Joining Date</strong> are managed by the school admin and cannot be changed here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      );
};

// --- Teacher Self Attendance View ---
// --- Helper: Haversine Distance Calculation (meters) ---
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 999999;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// --- Teacher Self Attendance View ---
export default TeacherProfile;
