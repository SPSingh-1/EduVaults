import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, 
  Mail, 
  Building, 
  MapPin, 
  Globe, 
  Calendar, 
  Lock, 
  Shield, 
  Fingerprint, 
  Edit3 
} from 'lucide-react';

const SchoolAdminProfile = () => {
  const { user, login } = useAuth(); // We can use auth user to refresh state or name
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '' });

  const loadProfile = async () => {
    try {
      const res = await apiClient.get('/academics/admin/profile');
      setProfile(res.data);
      setForm({
        firstName: res.data.firstName || '',
        lastName: res.data.lastName || '',
      });
    } catch (err) {
      console.error('Failed to load school admin profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      await apiClient.patch('/academics/admin/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
      });

      // Update local storage user details to keep Topbar/Sidebar in sync
      const savedUser = JSON.parse(localStorage.getItem('eduvault_user') || '{}');
      savedUser.firstName = form.firstName;
      savedUser.lastName = form.lastName;
      savedUser.avatar = `${form.firstName[0] || ''}${form.lastName[0] || ''}`.toUpperCase();
      localStorage.setItem('eduvault_user', JSON.stringify(savedUser));

      // Quick reload in profile view and reload local page states
      await loadProfile();
      
      // Force user context refresh
      if (window.dispatchEvent) {
        window.dispatchEvent(new Event('storage'));
      }
      
      setEditing(false);
      setSaveMsg('Profile updated successfully!');
      setTimeout(() => setSaveMsg(''), 3000);
      
      // Force page reload or state sync in context if possible
      window.location.reload();
    } catch (err) {
      console.error('Failed to save admin profile:', err);
      setSaveMsg('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
    });
    setEditing(false);
  };

  if (loading) {
    return (
      <div>
        <Topbar title="My Profile" />
        <div className="card text-center py-12 text-gray-400 text-sm">
          Loading profile details...
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="My Profile" />
      <div className="card max-w-4xl border border-slate-100 hover:shadow-xs transition-shadow">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-5 mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-blue-600 text-white flex items-center justify-center text-2xl font-black shadow-md border-4 border-white select-none">
              {profile?.firstName ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase() : 'AD'}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-primary">{profile?.firstName} {profile?.lastName}</h2>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-slate-400" /> School Administrator</span>
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-slate-400" /> {profile?.email}</span>
              </div>
            </div>
          </div>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-outline text-xs flex items-center gap-1.5 hover:bg-slate-50 transition-all select-none cursor-pointer">
              <Edit3 className="w-3.5 h-3.5 text-primary" /> Edit Profile
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
          
          {/* Personal Account Information */}
          <div>
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-4 pb-1.5 border-b border-slate-100">
              <User className="w-4 h-4 text-primary/80" /> Administrative Account Details
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">First Name</span>
                {editing ? (
                  <input 
                    type="text" 
                    value={form.firstName} 
                    onChange={e => setForm({ ...form, firstName: e.target.value })} 
                    className="input text-xs py-1 px-2.5 w-48 text-right font-medium"
                    required
                  />
                ) : (
                  <span className="text-xs font-bold text-primary">{profile?.firstName}</span>
                )}
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Last Name</span>
                {editing ? (
                  <input 
                    type="text" 
                    value={form.lastName} 
                    onChange={e => setForm({ ...form, lastName: e.target.value })} 
                    className="input text-xs py-1 px-2.5 w-48 text-right font-medium"
                    required
                  />
                ) : (
                  <span className="text-xs font-bold text-primary">{profile?.lastName}</span>
                )}
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Email Address</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.email}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Assigned login email — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Joined Date</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">{profile?.joined}</span>
                  <Lock className="w-3 h-3 text-slate-350" title="System timestamp — cannot be changed" />
                </div>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Account Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="badge badge-success">ACTIVE</span>
                  <Lock className="w-3 h-3 text-slate-350" title="Active billing account status" />
                </div>
              </div>
            </div>
          </div>

          {/* School Organization Branding Information */}
          <div>
            <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-primary flex items-center gap-2 mb-4 pb-1.5 border-b border-slate-100">
              <Building className="w-4 h-4 text-primary/80" /> Associated Institution
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">School Name</span>
                <span className="text-xs font-bold text-primary">{profile?.schoolName}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">School Code</span>
                <span className="text-xs font-mono font-bold text-slate-700">{profile?.schoolCode}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Location / Address</span>
                <span className="text-xs font-semibold text-slate-700">{profile?.schoolAddress}{profile?.schoolCity ? `, ${profile.schoolCity}` : ''}</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-slate-100 hover:bg-slate-50/20 px-1 rounded-lg transition-colors">
                <span className="text-xs text-slate-450 font-bold uppercase tracking-wider">Website URL</span>
                <a href={profile?.schoolWebsite} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">{profile?.schoolWebsite || 'N/A'}</a>
              </div>
            </div>

            {editing && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-600 leading-relaxed">
                🔒 <strong>Institution details</strong> and <strong>Email login address</strong> are locked. School-specific logo, domains, and color themes can be configured under the academic Setup panel.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default SchoolAdminProfile;
