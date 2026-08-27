import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  UserPlus, 
  DollarSign, 
  Eye, 
  EyeOff, 
  Search, 
  ShieldCheck, 
  User, 
  Mail, 
  Briefcase 
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
    <div>
      <Topbar 
        title="Account & HRM Managers" 
        actions={
          <button 
            onClick={() => { setError(''); setShowModal(true); }} 
            className="btn-primary text-xs"
          >
            + Register Account Manager
          </button>
        } 
      />

      <div className="space-y-6">
        {/* Success/Error Alerts */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3.5 flex items-center justify-between">
            <span>✅ {success}</span>
            <button onClick={() => setSuccess('')} className="text-emerald-600 font-bold">✕</button>
          </div>
        )}

        {error && !showModal && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl p-3.5">
            ⚠️ {error}
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0">
              💰
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Account Managers</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">{managers.length}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
              🛡️
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Active Portal Logins</div>
              <div className="text-2xl font-bold font-display text-emerald-600 mt-0.5">
                {managers.filter(m => m.isActive !== false).length}
              </div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
              💼
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">HRM & Finance Coverage</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">100%</div>
            </div>
          </div>
        </div>

        {/* Directory Card */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-primary">Account Managers Directory</h3>
              <p className="text-xs text-gray-400 mt-0.5">Staff with access to payroll, leaves, fee invoicing, and expense ledgers.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9 text-xs py-2"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 flex justify-center"><Loader small /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="table-th">Account Manager</th>
                    <th className="table-th">Employee Code</th>
                    <th className="table-th">Designation</th>
                    <th className="table-th">Registered Date</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {m.firstName ? m.firstName[0] : 'A'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-primary text-sm truncate">{m.firstName} {m.lastName}</div>
                            <div className="text-xs text-gray-400 truncate break-all">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {m.employeeId || 'ACC-AUTO'}
                        </span>
                      </td>
                      <td className="table-td text-xs text-gray-700">{m.designation || 'Account & Finance Officer'}</td>
                      <td className="table-td text-xs text-gray-500">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="table-td">
                        <span className="badge-success">Active</span>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-400 text-xs">
                        No account managers registered yet. Click "+ Register Account Manager" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="bg-primary px-6 py-5 rounded-t-2xl flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Register Account Manager</h3>
                <p className="text-blue-200 text-xs">Creates credentials with access to the /account portal</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                className="text-white hover:text-blue-200 text-lg"
              >
                ✖
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="e.g. Ramesh"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="e.g. Sharma"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Login Email Address *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="accounts@yourschool.edu"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Account Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••••••"
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee Code (Optional)</label>
                  <input
                    type="text"
                    value={form.employeeId}
                    onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                    placeholder="e.g. ACC-101"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Finance Head"
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2"
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
