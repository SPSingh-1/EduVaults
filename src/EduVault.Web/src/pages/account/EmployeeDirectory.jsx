import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  Users, UserPlus, Search, Filter, ShieldCheck, 
  Building2, Award, DollarSign, Eye, Edit, 
  CheckCircle2, AlertCircle, RefreshCw, X, FileText, Phone, Mail, MapPin
} from 'lucide-react';

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [staffTypeFilter, setStaffTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Male',
    staffType: 'Teaching',
    departmentId: '',
    designationId: '',
    baseGrossSalary: 35000,
    pfApplicable: true,
    esiApplicable: true,
    ptApplicable: true,
    tdsApplicable: false,
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    panNumber: '',
    qualification: 'B.Ed / M.Sc',
    specialization: 'Academics'
  });

  useEffect(() => {
    fetchEmployees();
  }, [staffTypeFilter, statusFilter]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get(`/api/hrm/employees?search=${search}&staffType=${staffTypeFilter}&status=${statusFilter}`);
      setEmployees(res.data?.employees || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch employees list');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First and last name are required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await apiClient.post('/api/hrm/employees', formData);
      setSuccessMsg('Employee registered successfully!');
      setShowAddModal(false);
      fetchEmployees();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  const handleViewEmployee = async (id) => {
    try {
      const res = await apiClient.get(`/api/hrm/employees/${id}`);
      setSelectedEmp(res.data?.employee);
    } catch (err) {
      setError('Could not load profile: ' + (err.response?.data?.error || err.message));
    }
  };

  // Staff type count badges
  const teachingCount = employees.filter(e => e.staffType === 'Teaching').length;
  const nonTeachingCount = employees.filter(e => e.staffType !== 'Teaching').length;
  const activeCount = employees.filter(e => e.employmentStatus === 'Active').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <Topbar title="HRM — Employee Master Directory" subtitle="Unified staff repository for Teaching, Non-Teaching, and Administrative personnel" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-slate-900">{employees.length}</span>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-emerald-600">{activeCount}</span>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Employees</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-blue-600">{teachingCount}</span>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Teaching Faculty</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-2xl font-black text-amber-600">{nonTeachingCount}</span>
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Non-Teaching Staff</span>
            </div>
          </div>
        </div>

        {/* Global Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm shadow-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Search, Filter & Action Bar */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search by employee name, code, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-2xl focus:border-indigo-600 focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            {['ALL', 'Teaching', 'NonTeaching', 'Administrative', 'Support', 'Transport'].map(t => (
              <button
                key={t}
                onClick={() => setStaffTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  staffTypeFilter === t
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {t}
              </button>
            ))}

            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 shadow-md shadow-emerald-100 shrink-0 ml-2"
            >
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-12"><Loader text="Loading Employee Directory..." /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3.5">Employee</th>
                    <th className="px-5 py-3.5">Code</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Department / Role</th>
                    <th className="px-5 py-3.5">Base Salary</th>
                    <th className="px-5 py-3.5">Statutory</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-900">{emp.fullName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{emp.email || emp.phone || 'No Contact'}</div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">
                        {emp.employeeCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          emp.staffType === 'Teaching' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {emp.staffType}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800">{emp.designationName || 'General Staff'}</div>
                        <div className="text-[10px] text-slate-400">{emp.departmentName || 'General'}</div>
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-slate-900">
                        ₹{emp.baseGrossSalary?.toLocaleString('en-IN') || 0}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1 text-[9px] font-extrabold">
                          {emp.pfApplicable && <span className="bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200">PF</span>}
                          {emp.esiApplicable && <span className="bg-blue-50 text-blue-700 px-1 rounded border border-blue-200">ESI</span>}
                          {emp.ptApplicable && <span className="bg-purple-50 text-purple-700 px-1 rounded border border-purple-200">PT</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {emp.employmentStatus}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button 
                          onClick={() => handleViewEmployee(emp.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-xl font-bold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> 360 View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {employees.length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-slate-400 text-xs">
                        No employees found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 360 Employee Profile Drawer / Modal */}
        {selectedEmp && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{selectedEmp.fullName}</h3>
                  <p className="text-xs text-indigo-200 font-mono">{selectedEmp.employeeCode} • {selectedEmp.staffType}</p>
                </div>
                <button onClick={() => setSelectedEmp(null)} className="text-indigo-200 hover:text-white p-1.5 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
                {/* Organizational Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Department</span>
                    <span className="font-bold text-slate-800">{selectedEmp.departmentName || 'General'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Designation</span>
                    <span className="font-bold text-slate-800">{selectedEmp.designationName || 'Staff Member'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                    <span className="font-bold text-emerald-600">{selectedEmp.employmentStatus}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Monthly Gross</span>
                    <span className="font-bold text-slate-900">₹{selectedEmp.baseGrossSalary?.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Joining Date</span>
                    <span className="font-bold text-slate-800">{new Date(selectedEmp.joiningDate).toLocaleDateString('en-GB')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Statutory Reg</span>
                    <span className="font-bold text-indigo-600">PF: {selectedEmp.pfApplicable ? 'Yes' : 'No'} | ESI: {selectedEmp.esiApplicable ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Bank & Tax Details */}
                <div>
                  <h4 className="font-bold text-slate-900 text-xs mb-2">Banking & Masked KYC Data</h4>
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bank Name</span>
                      <span className="font-semibold text-slate-800">{selectedEmp.bankName || 'Not Set'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Account Number (Masked)</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedEmp.bankAccountNumberMasked || 'XXXX-XXXX'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">IFSC Code</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedEmp.bankIfscCode || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">PAN / Tax Ref</span>
                      <span className="font-mono font-semibold text-slate-800">{selectedEmp.panNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Academic Extension (If Teacher) */}
                {selectedEmp.teacherProfile && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-2">Academic & Teaching Profile</h4>
                    <div className="grid grid-cols-2 gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Qualification</span>
                        <span className="font-semibold text-slate-800">{selectedEmp.teacherProfile.qualification}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Specialization</span>
                        <span className="font-semibold text-slate-800">{selectedEmp.teacherProfile.specialization}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setSelectedEmp(null)} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-primary px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base">Register New School Employee</h3>
                  <p className="text-xs text-blue-200">Create unified profile with salary and statutory eligibility</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-blue-200 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">First Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Last Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Staff Category *</label>
                    <select
                      value={formData.staffType}
                      onChange={e => setFormData({ ...formData, staffType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="Teaching">Teaching Faculty</option>
                      <option value="NonTeaching">Non-Teaching Staff</option>
                      <option value="Administrative">Administrative</option>
                      <option value="Support">Support Staff</option>
                      <option value="Transport">Transport / Driver</option>
                      <option value="Security">Security Guard</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                    <input 
                      type="email" 
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Base Monthly Gross Salary (₹) *</label>
                    <input 
                      type="number" 
                      required
                      value={formData.baseGrossSalary}
                      onChange={e => setFormData({ ...formData, baseGrossSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Statutory Checkboxes */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="block font-bold text-slate-800 mb-2">Statutory Applicability for this Employee</span>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={formData.pfApplicable}
                        onChange={e => setFormData({ ...formData, pfApplicable: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span>PF Applicable</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={formData.esiApplicable}
                        onChange={e => setFormData({ ...formData, esiApplicable: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span>ESI Applicable</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox"
                        checked={formData.ptApplicable}
                        onChange={e => setFormData({ ...formData, ptApplicable: e.target.checked })}
                        className="rounded text-indigo-600"
                      />
                      <span>PT Applicable</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                    {saving ? 'Registering...' : 'Complete Registration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
