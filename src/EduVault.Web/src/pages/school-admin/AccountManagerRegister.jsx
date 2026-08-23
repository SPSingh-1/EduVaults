import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  UserPlus, 
  DollarSign, 
  Mail, 
  Lock, 
  User, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  ShieldCheck, 
  Eye, 
  EyeOff,
  Building,
  Calendar,
  Sparkles
} from 'lucide-react';

const AccountManagerRegister = () => {
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    employeeId: '',
    designation: 'Account & Finance Officer'
  });

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/academics/account-managers');
      setManagers(res.data || []);
    } catch (err) {
      console.error('Failed to load account managers:', err);
      setError(err.response?.data?.error || 'Failed to load account managers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) {
      setError('First name, email, and password are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/register-account-manager', form);
      setSuccess(`Account Manager ${form.firstName} ${form.lastName} registered successfully!`);
      setShowModal(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        employeeId: '',
        designation: 'Account & Finance Officer'
      });
      fetchManagers();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Failed to register account manager:', err);
      setError(err.response?.data?.error || 'Failed to register account manager.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = managers.filter(m => {
    const s = search.toLowerCase();
    return (
      (m.firstName || '').toLowerCase().includes(s) ||
      (m.lastName || '').toLowerCase().includes(s) ||
      (m.email || '').toLowerCase().includes(s) ||
      (m.employeeId || '').toLowerCase().includes(s) ||
      (m.designation || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Account & Finance Management" subtitle="Manage School Financial & HRM Officers" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-3xs font-black uppercase tracking-wider">
                HRM & Finance Role
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-400 shrink-0" />
              Account Managers
            </h1>
            <p className="text-sm text-purple-200/90 max-w-xl">
              Account Managers have dedicated access to Teacher Salaries, Leave Approvals, Salary Rules (HRA/PF), Fee Invoicing, and Expense Tracking.
            </p>
          </div>

          <button
            onClick={() => {
              setError('');
              setShowModal(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-500/25 transition flex items-center gap-2.5 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            Register Account Manager
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

        {/* Directory Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Active Account Managers ({managers.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Officers with login access to the /account portal</p>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, code..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <Loader />
              <p className="text-xs text-slate-400 mt-2 font-medium">Loading officers...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <DollarSign className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No Account Managers Registered Yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click "Register Account Manager" above to create credentials for your school's finance or HR officer.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">OFFICER</th>
                    <th className="py-3.5 px-4">EMPLOYEE CODE</th>
                    <th className="py-3.5 px-4">DESIGNATION</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4">JOINED DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filtered.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0">
                            {(m.firstName?.[0] || 'A')}{(m.lastName?.[0] || 'M')}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">
                              {m.firstName} {m.lastName}
                            </span>
                            <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {m.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-bold text-slate-700">
                        {m.employeeId}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-2xs font-bold border border-purple-100">
                          {m.designation}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-3xs font-black uppercase tracking-wider border border-emerald-100 flex items-center gap-1 w-fit">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                        {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-left border border-slate-100">
            {/* Modal Topbar */}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-300" />
                  Register Account Manager
                </h3>
                <p className="text-xs text-purple-200 mt-0.5">Creates credentials with access to the /account portal</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="e.g. Ramesh"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="e.g. Sharma"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Login Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="accounts@yourschool.edu"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Account Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs pr-10 focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Employee Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                    placeholder="e.g. ACC-101"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Designation
                  </label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Finance Head"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Registering...' : 'Register Account Manager'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagerRegister;
