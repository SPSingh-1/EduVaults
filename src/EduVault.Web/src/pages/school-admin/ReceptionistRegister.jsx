import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  UserPlus, 
  Eye, 
  EyeOff, 
  Search, 
  ShieldCheck, 
  User, 
  Mail, 
  PhoneCall,
  AlertCircle,
  Clock,
  Lock
} from 'lucide-react';

const ReceptionistRegister = () => {
  const [receptionists, setReceptionists] = useState([]);
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
    deskNumber: 'Front Desk - Counter 1'
  });

  const fetchReceptionists = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/academics/receptionists');
      setReceptionists(res.data || []);
    } catch (err) {
      console.error('Failed to load receptionists:', err);
      setError(err.response?.data?.error || 'Failed to load receptionists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceptionists();
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
      await apiClient.post('/academics/register-receptionist', form);
      setSuccess(`Receptionist ${form.firstName} ${form.lastName} registered successfully!`);
      setShowModal(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        employeeId: '',
        deskNumber: 'Front Desk - Counter 1'
      });
      fetchReceptionists();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Failed to register receptionist:', err);
      setError(err.response?.data?.error || 'Failed to register receptionist.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = receptionists.filter(r => {
    const s = search.toLowerCase();
    return (
      (r.firstName || '').toLowerCase().includes(s) ||
      (r.lastName || '').toLowerCase().includes(s) ||
      (r.email || '').toLowerCase().includes(s) ||
      (r.employeeId || '').toLowerCase().includes(s) ||
      (r.deskNumber || '').toLowerCase().includes(s)
    );
  });

  return (
    <div>
      <Topbar 
        title="Receptionists & Front Desk Staff" 
        actions={
          <button 
            onClick={() => { setError(''); setShowModal(true); }} 
            className="btn-primary text-xs"
          >
            + Register Front Desk Officer
          </button>
        } 
      />

      {error && !showModal && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{receptionists.length}</div>
            <div className="text-xs text-gray-500 font-medium">Active Receptionists</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">Front Desk</div>
            <div className="text-xs text-gray-500 font-medium">Universal Search Enabled</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">School Scoped</div>
            <div className="text-xs text-gray-500 font-medium">Multi-tenant Protected</div>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email, or employee ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 text-sm w-full"
            />
          </div>
          <span className="text-xs text-gray-400 font-medium">
            Showing {filtered.length} of {receptionists.length} officers
          </span>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-gray-200 rounded-2xl">
            <PhoneCall className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-800">No Receptionists Registered</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Register front desk officers to give staff access to universal student 360 search, fee collection, and visitor management.
            </p>
            <button
              onClick={() => { setError(''); setSuccess(''); setShowModal(true); }}
              className="btn-primary text-xs mt-4 mx-auto inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register First Receptionist</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Officer Name</th>
                  <th className="pb-3">Designation / Role</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Joined Date</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shadow-sm">
                          {(m.firstName?.[0] || 'R').toUpperCase()}{(m.lastName?.[0] || '').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{m.firstName} {m.lastName}</div>
                          <div className="text-[11px] text-gray-400 truncate">{m.employeeId || 'ID: Active'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 text-xs text-gray-600">
                      <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-medium">
                        {m.designation || 'Front Desk & Reception'}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-gray-500 font-mono">
                      <div className="truncate max-w-[220px]" title={m.email}>{m.email}</div>
                    </td>
                    <td className="py-3.5 text-xs text-gray-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${m.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {m.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registration Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  <PhoneCall className="w-5 h-5" />
                  <span>Register Receptionist</span>
                </h3>
                <p className="text-blue-100 text-xs mt-0.5">Create front desk account with access to Student 360, Fee Counter & Gate Pass</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">First Name *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pooja"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="input pl-9 text-xs w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Sharma"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address (Login Username) *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="receptionist@school.edu"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input pl-9 text-xs w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input pl-9 pr-10 text-xs w-full"
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

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Employee ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. REC-102"
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Desk / Counter</label>
                  <input
                    type="text"
                    placeholder="e.g. Front Desk - Gate 1"
                    value={form.deskNumber}
                    onChange={(e) => setForm({ ...form, deskNumber: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-3 justify-end border-t border-gray-100 mt-5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
                >
                  {submitting ? <Loader small /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Register Officer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceptionistRegister;
