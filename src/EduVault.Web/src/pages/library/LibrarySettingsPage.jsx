import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  Sliders, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  BookOpen,
  Sparkles,
  Info
} from 'lucide-react';

const LibrarySettingsPage = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    finePerDay: 2.00,
    maxIssueDays: 14,
    maxBooksPerMember: 3
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/library/settings');
      setSettings(res.data);
      setForm({
        finePerDay: res.data.finePerDay || 2.00,
        maxIssueDays: res.data.maxIssueDays || 14,
        maxBooksPerMember: res.data.maxBooksPerMember || 3
      });
    } catch (err) {
      console.error('Failed to load library settings:', err);
      setError('Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.put('/library/settings', {
        finePerDay: parseFloat(form.finePerDay),
        maxIssueDays: parseInt(form.maxIssueDays),
        maxBooksPerMember: parseInt(form.maxBooksPerMember)
      });
      setSuccess('Library rules & fine rates updated successfully! The new fine rate will be visible across all student and teacher dashboards.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update library settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Fine & Library Policy Settings" subtitle="Configure Overdue Fines, Loan Durations & Member Borrowing Limits" />

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
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

        {loading ? (
          <div className="py-24 text-center"><Loader /></div>
        ) : (
          <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm space-y-6 text-left">
            <div className="border-b border-slate-100 pb-5">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-cyan-600" />
                Borrowing & Fine Parameters
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                These policies automatically calculate overdue charges when books are returned by students or teachers.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Fine Per Day */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-black text-slate-600 uppercase tracking-wider">
                    Fine Rate Per Overdue Day
                  </label>
                  <DollarSign className="w-4 h-4 text-cyan-600" />
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    required
                    value={form.finePerDay}
                    onChange={e => setForm(p => ({ ...p, finePerDay: e.target.value }))}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <p className="text-3xs text-slate-400">
                  Charged per overdue day past return date.
                </p>
              </div>

              {/* Max Issue Days */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-black text-slate-600 uppercase tracking-wider">
                    Default Loan Duration
                  </label>
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.maxIssueDays}
                    onChange={e => setForm(p => ({ ...p, maxIssueDays: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400">Days</span>
                </div>
                <p className="text-3xs text-slate-400">
                  Number of days allowed before a book is overdue.
                </p>
              </div>

              {/* Max Books Per Member */}
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-2xs font-black text-slate-600 uppercase tracking-wider">
                    Max Books / Member
                  </label>
                  <BookOpen className="w-4 h-4 text-purple-600" />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.maxBooksPerMember}
                    onChange={e => setForm(p => ({ ...p, maxBooksPerMember: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-2xs font-bold text-slate-400">Books</span>
                </div>
                <p className="text-3xs text-slate-400">
                  Max concurrent active loans per student or teacher.
                </p>
              </div>
            </div>

            <div className="p-4 bg-cyan-50 border border-cyan-100 rounded-2xl flex items-start gap-3 text-xs text-cyan-900">
              <Info className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Automatic Student & Faculty Notice</span>
                The fine rate of <strong>₹{form.finePerDay} per day</strong> and the maximum loan duration will automatically be displayed on all student and teacher dashboards inside their "My Library" widgets.
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LibrarySettingsPage;
