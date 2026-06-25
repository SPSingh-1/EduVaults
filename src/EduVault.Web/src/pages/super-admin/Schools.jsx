import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const statusColor = { Active: 'badge-success', Pending: 'badge-warning', Suspended: 'badge-danger' };

const Schools = () => {
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    schoolName: '',
    address: '',
    city: '',
    website: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    logoUrl: '/logo.jpeg',
    emailDomain: '',
    themeColor: '#1a2744'
  });
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSchools = async () => {
    try {
      const res = await apiClient.get('/super/schools');
      setSchools(res.data);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleAdd = async () => {
    if (!form.schoolName || !form.adminEmail || !form.adminPassword || !form.adminName) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/super/schools', form);
      setAdded(true);
      setShowModal(false);
      setForm({
        schoolName: '',
        address: '',
        city: '',
        website: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        logoUrl: '/logo.jpeg',
        emailDomain: '',
        themeColor: '#1a2744'
      });
      fetchSchools();
      setTimeout(() => setAdded(false), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register school.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    try {
      await apiClient.put(`/super/schools/${id}/status`, JSON.stringify(nextStatus), {
        headers: { 'Content-Type': 'application/json' }
      });
      fetchSchools();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filtered = schools.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  // Calculate quick stats
  const totalSchools = schools.length;
  const activeSchools = schools.filter(s => s.status === 'Active').length;
  const pendingSchools = schools.filter(s => s.status === 'Pending').length;

  return (
    <div>
      <Topbar title="Schools Management" actions={
        <button onClick={() => { setError(''); setShowModal(true); }} className="btn-primary">+ Add New School</button>
      } />
      {added && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 flex items-center gap-2">✅ School registered successfully!</div>}
      <div className="card">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <input placeholder="Search schools by name..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', width: '100%' }} className="md:w-auto">
            <select className="input" style={{ flex: 1, minWidth: 0, width: '50%' }}><option>All Types</option><option>Private</option><option>Public</option></select>
            <select className="input" style={{ flex: 1, minWidth: 0, width: '50%' }}><option>All Status</option><option>Active</option><option>Pending</option><option>Suspended</option></select>
          </div>
        </div>
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '8px', 
            marginBottom: '20px' 
          }}
        >
          <div className="bg-blue-50 rounded-xl p-2.5 sm:p-4 flex flex-col justify-between" style={{ minHeight: '85px' }}>
            <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 truncate">Total Schools</div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="font-display text-sm sm:text-2xl font-bold text-primary leading-tight">{totalSchools}</span>
              <span className="text-[8px] sm:text-xs text-green-500 font-medium whitespace-nowrap">Real-time</span>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5 sm:p-4 flex flex-col justify-between" style={{ minHeight: '85px' }}>
            <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 truncate">Active Schools</div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="font-display text-sm sm:text-2xl font-bold text-green-700 leading-tight">{activeSchools}</span>
              <span className="text-[8px] sm:text-xs text-green-500 font-medium whitespace-nowrap">Enrolled</span>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-xl p-2.5 sm:p-4 flex flex-col justify-between" style={{ minHeight: '85px' }}>
            <div className="text-[10px] sm:text-xs text-gray-500 mb-0.5 truncate">Pending/Review</div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1.5">
              <span className="font-display text-sm sm:text-2xl font-bold text-yellow-700 leading-tight">{totalSchools - activeSchools}</span>
              <span className="text-[8px] sm:text-xs text-red-500 font-medium whitespace-nowrap">Review req.</span>
            </div>
          </div>
        </div>
        <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
            <table className="w-full" style={{ minWidth: '720px', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">School Name</th>
                  <th className="table-th">Code</th>
                  <th className="table-th">Students</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Date Joined</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="font-semibold text-primary">{s.name}</div>
                      <div className="text-xs text-gray-400">ID: {s.id}</div>
                    </td>
                    <td className="table-td"><span className="badge badge-gray font-mono">{s.schoolCode}</span></td>
                    <td className="table-td font-medium">{s.studentsCount}</td>
                    <td className="table-td"><span className={statusColor[s.status] || 'badge-gray'}>{s.status}</span></td>
                    <td className="table-td text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => toggleStatus(s.id, s.status)} className="text-blue-600 hover:underline text-xs font-medium">
                          {s.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No schools registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary px-6 py-5 rounded-t-2xl">
              <h3 className="font-display font-bold text-white text-lg">Register New School</h3>
              <p className="text-blue-200 text-sm">Enter the required information to onboard a new educational institution.</p>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{error}</div>}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Name *</label>
                <input value={form.schoolName} onChange={e => setForm(p => ({ ...p, schoolName: e.target.value }))} placeholder="e.g. Greenwood Academy" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address *</label>
                  <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="Street address" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">City / State *</label>
                  <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City, State" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Email Domain *</label>
                  <input value={form.emailDomain} onChange={e => setForm(p => ({ ...p, emailDomain: e.target.value }))} placeholder="e.g. greenwood.edu" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website</label>
                  <input value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))} placeholder="https://www.school.edu" className="input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Full Name *</label>
                  <input value={form.adminName} onChange={e => setForm(p => ({ ...p, adminName: e.target.value }))} placeholder="e.g. Dr. Jenkins" className="input" />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Email *</label>
                  <input 
                    type="email" 
                    value={form.adminEmail} 
                    onChange={e => {
                      const email = e.target.value;
                      const parts = email.split('@');
                      const domain = parts.length > 1 ? parts[1] : '';
                      setForm(p => {
                        const oldEmailParts = p.adminEmail.split('@');
                        const oldDomain = oldEmailParts.length > 1 ? oldEmailParts[1] : '';
                        const shouldUpdateDomain = !p.emailDomain || p.emailDomain === oldDomain;
                        return {
                          ...p,
                          adminEmail: email,
                          emailDomain: shouldUpdateDomain ? domain : p.emailDomain
                        };
                      });
                    }} 
                    placeholder="admin@school.edu" 
                    className="input" 
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Admin Password *</label>
                  <input type="password" value={form.adminPassword} onChange={e => setForm(p => ({ ...p, adminPassword: e.target.value }))} placeholder="••••••••" className="input" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
              <button onClick={handleAdd} disabled={loading} className="btn-primary flex items-center gap-1.5">
                {loading ? 'Registering...' : '✓ Register School'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;
