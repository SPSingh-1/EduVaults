import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import Loader from '../../components/common/Loader';
import { ArrowUpDown, ArrowUp, ArrowDown, X, Edit, Save } from 'lucide-react';

const statusColor = { Active: 'badge-success', Pending: 'badge-warning', Suspended: 'badge-danger' };

// Module-level helper — available to all components in this file
const safeUrl = (url) => {
  if (!url || typeof url !== 'string') return '/logo.jpeg';
  const trimmed = url.trim();
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {}
  return '/logo.jpeg';
};

const DateFilterInput = ({ label, value, onChange, className = '', style = {} }) => {
  const [focused, setFocused] = useState(false);
  const formatDisplay = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
  };

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {label && <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{label}</span>}
      <input
        type={focused ? 'date' : 'text'}
        value={focused ? value : formatDisplay(value)}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="dd/mm/yyyy"
        className={className || "input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl"}
        style={style || { width: '135px' }}
      />
    </div>
  );
};


const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Schools = () => {
  const location = useLocation();
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');
  const [activatingSchool, setActivatingSchool] = useState(null);
  const [actEmail, setActEmail] = useState('');
  const [actPassword, setActPassword] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Selected school detail & edit states
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
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
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const fetchSchools = async () => {
    try {
      const res = await apiClient.get('/super/schools');
      setSchools(res.data);
    } catch (err) {
      console.error('Error fetching schools:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
    if (location.state?.added) {
      setAdded(true);
      setTimeout(() => setAdded(false), 5000);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  const toggleStatus = async (s) => {
    if (s.status !== 'Active') {
      setActEmail(s.adminEmail || '');
      setActPassword('');
      setActivatingSchool(s);
    } else {
      const confirmSuspend = window.confirm(`Are you sure you want to suspend ${s.name}?`);
      if (!confirmSuspend) return;
      try {
        await apiClient.put(`/super/schools/${s.id}/status`, {
          status: 'Suspended'
        });
        fetchSchools();
      } catch (err) {
        console.error('Error suspending school:', err);
      }
    }
  };

  const confirmActivation = async () => {
    if (!actEmail || !actPassword) {
      alert('Please fill in both email and password.');
      return;
    }
    try {
      await apiClient.put(`/super/schools/${activatingSchool.id}/status`, {
        status: 'Active',
        adminEmail: actEmail,
        adminPassword: actPassword
      });
      setActivatingSchool(null);
      setActEmail('');
      setActPassword('');
      fetchSchools();
    } catch (err) {
      console.error('Error activating school:', err);
      alert(err.response?.data?.error || 'Failed to activate school.');
    }
  };

  const filtered = schools.filter(s => {
    const matchesName = s.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesName) return false;
    if (statusFilter && (s.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;
    if (typeFilter && (s.type || '').toLowerCase() !== typeFilter.toLowerCase()) return false;
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(s.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(s.createdAt) > to) return false;
    }
    return true;
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      if (field === 'createdAt' || field === 'studentsCount') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  const handleViewDetails = async (s) => {
    setSelectedSchool(s);
    setIsEditing(false);
    let modes = ['app', 'biometric'];
    let bioKey = '';
    try {
      const setRes = await expressClient.get(`/school-settings?schoolId=${s.id}`);
      if (setRes.data && setRes.data.attendanceModes) {
        modes = setRes.data.attendanceModes;
        bioKey = setRes.data.biometricApiKey || '';
      }
    } catch (err) {
      console.error('Failed to load school settings:', err);
    }
    setEditForm({
      name: s.name || '',
      address: s.address || '',
      city: s.city || '',
      website: s.website || '',
      adminName: s.adminName || '',
      adminEmail: s.adminEmail || '',
      adminPassword: '',
      logoUrl: s.logoUrl || '/logo.jpeg',
      emailDomain: s.emailDomain || '',
      themeColor: s.themeColor || '#1a2744',
      attendanceModes: modes,
      biometricApiKey: bioKey,
      hasAccountModule: s.hasAccountModule || false,
      hasLibraryModule: s.hasLibraryModule || false
    });
    setEditError('');
  };

  const handleUpdate = async () => {
    if (!editForm.name || !editForm.adminEmail || !editForm.adminName) {
      setEditError('School Name, Admin Name, and Admin Email are required.');
      return;
    }
    setEditError('');
    setEditLoading(true);
    try {
      const res = await apiClient.put(`/super/schools/${selectedSchool.id}`, editForm);
      try {
        await apiClient.put(`/super/schools/${selectedSchool.id}/modules`, {
          hasAccountModule: editForm.hasAccountModule,
          hasLibraryModule: editForm.hasLibraryModule
        });
      } catch (e) {
        console.error('Failed to sync school modules:', e);
      }
      try {
        await expressClient.post('/school-settings', {
          schoolId: selectedSchool.id,
          attendanceModes: editForm.attendanceModes || ['app', 'biometric'],
          biometricApiKey: editForm.biometricApiKey || ''
        });
      } catch (e) {
        console.error('Failed to sync school settings:', e);
      }
      const updatedSchool = {
        ...selectedSchool,
        ...res.data,
        hasAccountModule: editForm.hasAccountModule,
        hasLibraryModule: editForm.hasLibraryModule,
        adminName: editForm.adminName,
        adminEmail: editForm.adminEmail
      };
      setSelectedSchool(updatedSchool);
      setIsEditing(false);
      fetchSchools();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update school details.');
    } finally {
      setEditLoading(false);
    }
  };

  const sortedSchools = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === 'createdAt') {
      aVal = new Date(aVal || 0).getTime();
      bVal = new Date(bVal || 0).getTime();
    } else if (sortField === 'studentsCount') {
      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Calculate quick stats
  const totalSchools = schools.length;
  const activeSchools = schools.filter(s => s.status === 'Active').length;
  const pendingSchools = schools.filter(s => s.status === 'Pending').length;

  if (initialLoading) {
    return <Loader message="Accessing registered campus logs" />;
  }

  return (
    <div>
      <Topbar title="Schools Management" actions={
        <button onClick={() => { setError(''); setShowModal(true); }} className="btn-primary">+ Add New School</button>
      } />
      {added && <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 flex items-center gap-2">✅ School registered successfully!</div>}
      <div className="card">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <input placeholder="Search schools by name..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl" style={{ width: '135px' }} />
            <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl" style={{ width: '135px' }} />
            {(dateFrom || dateTo || search || statusFilter || typeFilter) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setStatusFilter(''); setTypeFilter(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }} className="w-full xl:w-auto">
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input text-xs" style={{ flex: 1, minWidth: 100 }}>
              <option value="">All Types</option>
              <option value="Private">Private</option>
              <option value="Public">Public</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input text-xs" style={{ flex: 1, minWidth: 100 }}>
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
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
                <tr className="border-b border-gray-100 font-sans">
                  <th onClick={() => handleSort('name')} className="table-th cursor-pointer select-none hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">
                      <span>School Name</span>
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('schoolCode')} className="table-th cursor-pointer select-none hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Code</span>
                      {sortField === 'schoolCode' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('adminName')} className="table-th cursor-pointer select-none hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Admin Contact</span>
                      {sortField === 'adminName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('studentsCount')} className="table-th cursor-pointer select-none hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Students</span>
                      {sortField === 'studentsCount' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('status')} className="table-th cursor-pointer select-none hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </div>
                  </th>
                  <th onClick={() => handleSort('createdAt')} className="table-th cursor-pointer select-none hover:text-primary transition-colors">
                    <div className="flex items-center gap-1">
                      <span>Date Joined</span>
                      {sortField === 'createdAt' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                      ) : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                    </div>
                  </th>
                  <th className="table-th select-none">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedSchools.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors font-sans">
                    <td className="table-td">
                      <button 
                        onClick={() => handleViewDetails(s)} 
                        className="font-semibold text-primary hover:underline hover:text-blue-600 focus:outline-none text-left"
                      >
                        {s.name}
                      </button>
                      <div className="text-xs text-gray-400 font-mono">ID: {s.id}</div>
                    </td>
                    <td className="table-td"><span className="badge badge-gray font-mono">{s.schoolCode}</span></td>
                    <td className="table-td font-sans">
                      <div className="text-xs font-semibold text-gray-700">{s.adminName || 'N/A'}</div>
                      <div className="text-[11px] text-gray-500">{s.adminEmail || 'N/A'}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{s.adminPhone || 'N/A'}</div>
                    </td>
                    <td className="table-td font-medium">{s.studentsCount}</td>
                    <td className="table-td"><span className={statusColor[s.status] || 'badge-gray'}>{s.status}</span></td>
                    <td className="table-td text-gray-500 font-sans">{formatDateDDMMYYYY(s.createdAt)}</td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button onClick={() => toggleStatus(s)} className="text-blue-600 hover:underline text-xs font-medium">
                          {s.status === 'Active' ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedSchools.length === 0 && (
                  <tr>
                    <td colSpan="7" className="text-center py-6 text-gray-400 text-sm">No schools registered yet.</td>
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

      {activatingSchool && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left">
            <div className="bg-primary px-6 py-5">
              <h3 className="font-display font-bold text-white text-lg">Generate Credentials</h3>
              <p className="text-blue-200 text-xs mt-0.5">Activate {activatingSchool.name} and configure their admin credentials.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 font-sans">Admin Email * (For login)</label>
                <input type="email" value={actEmail} onChange={e => setActEmail(e.target.value)} placeholder="admin@school.com" className="input text-black font-sans" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 font-sans">Admin Password *</label>
                <input type="password" value={actPassword} onChange={e => setActPassword(e.target.value)} placeholder="Minimum 6 characters" className="input text-black font-sans" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setActivatingSchool(null)} className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-4 py-2 rounded-xl transition-all font-sans">Cancel</button>
                <button onClick={confirmActivation} className="btn-primary text-xs px-4 py-2 rounded-xl font-sans">Activate & Save Credentials</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* School Details / Edit Modal */}
      {selectedSchool && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="bg-primary px-6 py-5 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-white text-lg">
                  {isEditing ? 'Edit School Details' : 'School Information Details'}
                </h3>
                <p className="text-blue-200 text-sm">
                  {isEditing 
                    ? `Modifying details for ${selectedSchool.name}`
                    : `Viewing profile log for ${selectedSchool.name}`
                  }
                </p>
              </div>
              <button 
                onClick={() => setSelectedSchool(null)} 
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 font-sans text-left">
              {editError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">
                  {editError}
                </div>
              )}

              {/* Logo / Branding Preview */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-white border border-gray-150 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={safeUrl(isEditing ? editForm.logoUrl : selectedSchool.logoUrl)} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1 font-sans">
                  <div className="font-semibold text-primary truncate">
                    {isEditing ? editForm.name : selectedSchool.name}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    CODE: {selectedSchool.schoolCode}
                  </div>
                  <div className="flex gap-2 items-center mt-1">
                    <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: isEditing ? editForm.themeColor : selectedSchool.themeColor }} />
                    <span className="text-[11px] text-gray-500 font-medium">Theme Color Preference</span>
                  </div>
                </div>
              </div>

              {/* Form Layout */}
              <div className="grid grid-cols-2 gap-4 font-sans">
                
                {/* School Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">School Name *</label>
                  {isEditing ? (
                    <input 
                      value={editForm.name} 
                      onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      className="input font-sans text-sm text-black"
                    />
                  ) : (
                    <div className="text-sm font-semibold text-primary py-1 px-1">{selectedSchool.name}</div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Address</label>
                  {isEditing ? (
                    <input 
                      value={editForm.address} 
                      onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                      className="input font-sans text-sm text-black"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 py-1 px-1">{selectedSchool.address || 'N/A'}</div>
                  )}
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">City / State</label>
                  {isEditing ? (
                    <input 
                      value={editForm.city} 
                      onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                      className="input font-sans text-sm text-black"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 py-1 px-1">{selectedSchool.city || 'N/A'}</div>
                  )}
                </div>

                {/* Website */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Website URL</label>
                  {isEditing ? (
                    <input 
                      value={editForm.website} 
                      onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))}
                      className="input font-sans text-sm text-black"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 py-1 px-1">
                      {selectedSchool.website ? (
                        <a href={selectedSchool.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedSchool.website}</a>
                      ) : 'N/A'}
                    </div>
                  )}
                </div>

                {/* Email Domain */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Email Domain</label>
                  {isEditing ? (
                    <input 
                      value={editForm.emailDomain} 
                      onChange={e => setEditForm(p => ({ ...p, emailDomain: e.target.value }))}
                      className="input font-sans text-sm text-black"
                    />
                  ) : (
                    <div className="text-sm text-gray-700 py-1 px-1 font-mono">{selectedSchool.emailDomain || 'N/A'}</div>
                  )}
                </div>

                {/* Logo URL */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Logo Path / URL</label>
                  {isEditing ? (
                    <input 
                      value={editForm.logoUrl} 
                      onChange={e => setEditForm(p => ({ ...p, logoUrl: e.target.value }))}
                      className="input font-sans text-sm text-black"
                    />
                  ) : (
                    <div className="text-xs text-gray-400 py-1 px-1 truncate font-mono">{selectedSchool.logoUrl || 'N/A'}</div>
                  )}
                </div>

                {/* Theme Color */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Theme Color Hex</label>
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input 
                        type="color" 
                        value={editForm.themeColor} 
                        onChange={e => setEditForm(p => ({ ...p, themeColor: e.target.value }))}
                        className="w-10 h-9 p-0.5 border border-gray-200 rounded-lg cursor-pointer shrink-0"
                      />
                      <input 
                        value={editForm.themeColor} 
                        onChange={e => setEditForm(p => ({ ...p, themeColor: e.target.value }))}
                        className="input font-mono text-sm text-black uppercase"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-gray-700 py-1 px-1 font-mono">{selectedSchool.themeColor || 'N/A'}</div>
                  )}
                </div>

                {/* Read-Only Stats */}
                <div className="col-span-2 grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-center mt-1">
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</div>
                    <div className="text-xs font-bold text-primary mt-0.5">{selectedSchool.status}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Students</div>
                    <div className="text-xs font-bold text-primary mt-0.5">{selectedSchool.studentsCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Joined Date</div>
                    <div className="text-xs font-bold text-primary mt-0.5">{formatDateDDMMYYYY(selectedSchool.createdAt)}</div>
                  </div>
                </div>

                {/* Attendance Modes Configuration */}
                <div className="col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-xl my-2">
                  <label className="block text-xs font-bold text-primary mb-2 flex items-center justify-between">
                    <span>⚙️ Allowed Attendance Punching Modes</span>
                    <span className="text-[10px] text-gray-400 font-normal">Super Admin Control</span>
                  </label>
                  {isEditing ? (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: 'app', label: '📱 App GPS Punching', desc: '300m Geofence Radius' },
                          { id: 'biometric', label: '☝️ Biometric Fingerprint Machine', desc: 'Thumb / Fingerprint Device' }
                        ].map(mode => {
                          const isChecked = (editForm.attendanceModes || []).includes(mode.id);
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => {
                                setEditForm(p => {
                                  const current = p.attendanceModes || ['app', 'biometric'];
                                  const updated = current.includes(mode.id)
                                    ? current.filter(m => m !== mode.id)
                                    : [...current, mode.id];
                                  return { ...p, attendanceModes: updated };
                                });
                              }}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                isChecked
                                  ? 'bg-primary/10 border-primary text-primary font-bold shadow-2xs'
                                  : 'bg-white border-gray-200 text-gray-400 opacity-60'
                              }`}
                            >
                              <div className="text-xs font-bold">{mode.label}</div>
                              <div className="text-[10px] font-normal opacity-75 mt-0.5">{mode.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                      {(editForm.attendanceModes || []).includes('biometric') && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Biometric Hardware Device Secret Key</label>
                          <input
                            value={editForm.biometricApiKey || ''}
                            onChange={e => setEditForm(p => ({ ...p, biometricApiKey: e.target.value }))}
                            placeholder="e.g. bio_secret_key_xxxx"
                            className="input font-mono text-xs text-slate-800 bg-white"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 items-center">
                      {(editForm.attendanceModes || ['app', 'biometric']).map(m => (
                        <span key={m} className="px-3 py-1.5 rounded-lg text-2xs font-bold bg-white text-primary border border-slate-200 shadow-2xs">
                          {m === 'app' ? '📱 App GPS Punching (300m Radius)' : '☝️ Biometric Fingerprint Machine'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Module Permissions (Super Admin Grant) */}
                <div className="col-span-2 p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-xl my-2">
                  <label className="block text-xs font-bold text-indigo-950 mb-2 flex items-center justify-between">
                    <span>🛡️ Granted School Modules</span>
                    <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Super Admin Authority</span>
                  </label>
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, hasAccountModule: !p.hasAccountModule }))}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          editForm.hasAccountModule
                            ? 'bg-purple-600 text-white font-bold shadow-md border-purple-600'
                            : 'bg-white border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>💰 Account & HRM Module</span>
                          <span>{editForm.hasAccountModule ? 'ENABLED' : 'DISABLED'}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${editForm.hasAccountModule ? 'text-purple-100' : 'text-slate-400'}`}>
                          Enables Account Manager registration, salaries, leaves, and billing
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditForm(p => ({ ...p, hasLibraryModule: !p.hasLibraryModule }))}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          editForm.hasLibraryModule
                            ? 'bg-cyan-600 text-white font-bold shadow-md border-cyan-600'
                            : 'bg-white border-slate-200 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-between">
                          <span>📚 Library Management</span>
                          <span>{editForm.hasLibraryModule ? 'ENABLED' : 'DISABLED'}</span>
                        </div>
                        <div className={`text-[10px] mt-0.5 ${editForm.hasLibraryModule ? 'text-cyan-100' : 'text-slate-400'}`}>
                          Enables Librarian registration, book catalog, CSV import, and loans
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className={`px-3 py-1.5 rounded-lg text-2xs font-bold border ${selectedSchool.hasAccountModule ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        💰 Account & HRM: {selectedSchool.hasAccountModule ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className={`px-3 py-1.5 rounded-lg text-2xs font-bold border ${selectedSchool.hasLibraryModule ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                        📚 Library: {selectedSchool.hasLibraryModule ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Administrator Contact Details */}
                <div className="col-span-2 pt-2 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wide mb-3">Administrator Credentials</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Full Name *</label>
                      {isEditing ? (
                        <input 
                          value={editForm.adminName} 
                          onChange={e => setEditForm(p => ({ ...p, adminName: e.target.value }))}
                          className="input font-sans text-sm text-black"
                        />
                      ) : (
                        <div className="text-sm font-semibold text-gray-700 py-1 px-1">{selectedSchool.adminName || 'N/A'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Login Email *</label>
                      {isEditing ? (
                        <input 
                          type="email"
                          value={editForm.adminEmail} 
                          onChange={e => setEditForm(p => ({ ...p, adminEmail: e.target.value }))}
                          className="input font-sans text-sm text-black"
                        />
                      ) : (
                        <div className="text-sm text-gray-700 py-1 px-1 font-mono">{selectedSchool.adminEmail || 'N/A'}</div>
                      )}
                    </div>
                    {isEditing && (
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 mb-1">New Password (Leave blank to keep current)</label>
                        <input 
                          type="password"
                          value={editForm.adminPassword} 
                          onChange={e => setEditForm(p => ({ ...p, adminPassword: e.target.value }))}
                          placeholder="••••••••"
                          className="input font-sans text-sm text-black"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center px-6 pb-6 border-t border-gray-100 pt-4">
              <div>
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="btn-outline flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 border-blue-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="btn-outline text-xs"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <button 
                    onClick={handleUpdate} 
                    disabled={editLoading}
                    className="btn-primary flex items-center gap-1.5 text-xs"
                  >
                    {editLoading ? 'Saving...' : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>✓ Save Changes</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={() => setSelectedSchool(null)} 
                    className="btn-primary text-xs"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Schools;
