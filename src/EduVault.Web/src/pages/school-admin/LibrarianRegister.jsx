import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  UserPlus, 
  BookOpen, 
  Eye, 
  EyeOff, 
  Search, 
  ShieldCheck, 
  User, 
  Mail 
} from 'lucide-react';

const LibrarianRegister = () => {
  const [librarians, setLibrarians] = useState([]);
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
    employeeId: ''
  });

  const fetchLibrarians = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/academics/librarians');
      setLibrarians(res.data || []);
    } catch (err) {
      console.error('Failed to load librarians:', err);
      setError(err.response?.data?.error || 'Failed to load librarians.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrarians();
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
      await apiClient.post('/academics/register-librarian', form);
      setSuccess(`Librarian ${form.firstName} ${form.lastName} registered successfully!`);
      setShowModal(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        employeeId: ''
      });
      fetchLibrarians();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Failed to register librarian:', err);
      setError(err.response?.data?.error || 'Failed to register librarian.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = librarians.filter(l => {
    const s = search.toLowerCase();
    return (
      (l.firstName || '').toLowerCase().includes(s) ||
      (l.lastName || '').toLowerCase().includes(s) ||
      (l.email || '').toLowerCase().includes(s) ||
      (l.employeeId || '').toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <Topbar 
        title="Library Staff & Librarians" 
        actions={
          <button 
            onClick={() => { setError(''); setShowModal(true); }} 
            className="btn-primary text-xs"
          >
            + Register School Librarian
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
            <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-xl shrink-0">
              📚
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Registered Librarians</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">{librarians.length}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
              🛡️
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Active Library Access</div>
              <div className="text-2xl font-bold font-display text-emerald-600 mt-0.5">
                {librarians.filter(l => l.isActive !== false).length}
              </div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl shrink-0">
              📖
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Book Catalog & Loan Desk</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">Ready</div>
            </div>
          </div>
        </div>

        {/* Directory Card */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-primary">Librarians Directory</h3>
              <p className="text-xs text-gray-400 mt-0.5">Staff with access to book cataloging, circulation desk, and fines collection.</p>
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
                    <th className="table-th">Librarian</th>
                    <th className="table-th">Employee Code</th>
                    <th className="table-th">Portal Role</th>
                    <th className="table-th">Registered Date</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-xs shrink-0">
                            {l.firstName ? l.firstName[0] : 'L'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-primary text-sm truncate">{l.firstName} {l.lastName}</div>
                            <div className="text-xs text-gray-400 truncate break-all">{l.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {l.employeeId || 'LIB-AUTO'}
                        </span>
                      </td>
                      <td className="table-td text-xs text-gray-700">School Librarian</td>
                      <td className="table-td text-xs text-gray-500">
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="table-td">
                        <span className="badge-success">Active</span>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-400 text-xs">
                        No librarians registered yet. Click "+ Register School Librarian" to add staff.
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
                <h3 className="font-display font-bold text-lg">Register School Librarian</h3>
                <p className="text-blue-200 text-xs">Creates credentials with access to the /library portal</p>
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
                    placeholder="e.g. Priya"
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
                    placeholder="e.g. Singh"
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
                  placeholder="library@yourschool.edu"
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

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employee Code (Optional)</label>
                <input
                  type="text"
                  value={form.employeeId}
                  onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}
                  placeholder="e.g. LIB-101"
                  className="input"
                />
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
                  {submitting ? 'Registering...' : 'Register Librarian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibrarianRegister;
