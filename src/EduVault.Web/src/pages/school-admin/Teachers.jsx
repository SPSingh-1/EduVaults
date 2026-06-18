import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const sc = { Active: 'badge-success', 'On Leave': 'badge-warning' };

const Teachers = () => {
  const user = JSON.parse(localStorage.getItem('eduvault_user') || '{}');
  const schoolName = user?.schoolName || 'Central High';
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  
  // Dropdown filter states
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTeacherData, setViewTeacherData] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [editMode, setEditMode] = useState(false);
  const [editTeacherId, setEditTeacherId] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Teacher123!', // default
    department: '',
    officeLocation: 'Building B, Room 402',
    qualifications: '',
    specialization: '',
    isActive: true
  });

  const fetchTeachers = async () => {
    try {
      const res = await apiClient.get('/academics/teachers');
      setTeachers(res.data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await apiClient.get('/academics/departments');
      setDepartments(res.data);
      if (res.data.length > 0 && !form.department) {
        setForm(f => ({ ...f, department: res.data[0].name }));
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchDepartments();
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('openAddModal') === 'true') {
      setError('');
      resetForm();
      setShowModal(true);
    }
  }, []);

  function resetForm() {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      password: 'Teacher123!',
      department: departments[0]?.name || 'Science & Mathematics',
      officeLocation: 'Building B, Room 402',
      qualifications: '',
      specialization: '',
      isActive: true
    });
    setEditMode(false);
    setEditTeacherId(null);
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (editMode) {
        await apiClient.put(`/academics/teachers/${editTeacherId}`, form);
      } else {
        await apiClient.post('/academics/teachers', form);
      }
      setShowModal(false);
      resetForm();
      fetchTeachers();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editMode ? 'update' : 'onboard'} teacher.`);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id) => {
    try {
      const res = await apiClient.get(`/academics/teachers/${id}`);
      setViewTeacherData(res.data);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching teacher details:', err);
    }
  };

  const handleEdit = async (id) => {
    try {
      setError('');
      const res = await apiClient.get(`/academics/teachers/${id}`);
      const teacher = res.data;
      setForm({
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        email: teacher.email || '',
        password: '', // blank by default on edit
        department: teacher.department || departments[0]?.name || 'Science & Mathematics',
        officeLocation: teacher.officeLocation || '',
        qualifications: teacher.qualifications || '',
        specialization: teacher.specialization || '',
        isActive: teacher.isActive ?? true
      });
      setEditTeacherId(id);
      setEditMode(true);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching teacher details for edit:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher profile? This will clear all class/subject assignments for this teacher.')) {
      try {
        await apiClient.delete(`/academics/teachers/${id}`);
        fetchTeachers();
      } catch (err) {
        console.error('Error deleting teacher profile:', err);
      }
    }
  };

  // Extract unique departments and statuses for filtering dropdowns
  const uniqueDepartments = [...new Set(teachers.map(t => t.department))].filter(Boolean).sort();
  const uniqueStatuses = [...new Set(teachers.map(t => t.status))].filter(Boolean).sort();

  // Filter teachers based on search query, department, and status
  const filtered = teachers.filter(t => {
    const nameStr = t.name || '';
    const emailStr = t.email || '';
    const empIdStr = t.employeeId || '';
    const matchesSearch = !search || 
      nameStr.toLowerCase().includes(search.toLowerCase()) || 
      emailStr.toLowerCase().includes(search.toLowerCase()) || 
      empIdStr.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !selectedDepartment || t.department === selectedDepartment;
    const matchesStatus = !selectedStatus || t.status === selectedStatus;
    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div>
      <Topbar title="Teacher Management" actions={<button onClick={() => { setError(''); resetForm(); setShowModal(true); }} className="btn-primary">+ Add New Teacher</button>} />
      
      <div className="card">
        <p className="text-xs text-gray-400 mb-4">Efficiently manage and monitor your faculty records.</p>
        
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[{ l: 'Total Teachers', v: teachers.length.toString(), s: `${schoolName} Staff` }].map(s => (
            <div key={s.l} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">{s.l}</div>
              <div className="font-display text-2xl font-bold text-primary">{s.v}</div>
              <div className="text-xs text-gray-400">{s.s}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <input placeholder="Search teachers by name, email, or employee ID..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>
          
          <select className="input w-48 text-sm" value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}>
            <option value="">All Departments</option>
            {uniqueDepartments.map((dept, idx) => (
              <option key={idx} value={dept}>{dept}</option>
            ))}
          </select>
          
          <select className="input w-36 text-sm" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {uniqueStatuses.map((stat, idx) => (
              <option key={idx} value={stat}>{stat}</option>
            ))}
          </select>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-th">Teacher Info</th>
              <th className="table-th">ID</th>
              <th className="table-th">Department</th>
              <th className="table-th">Qualifications</th>
              <th className="table-th">Specialization</th>
              <th className="table-th">Assigned Classes</th>
              <th className="table-th">Contact</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {t.name ? t.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                    </div>
                    <div>
                      <div className="font-semibold text-primary text-sm">{t.name}</div>
                      <div className="text-xs text-gray-400">Joined {t.joined}</div>
                    </div>
                  </div>
                </td>
                <td className="table-td text-xs font-mono text-gray-500">{t.employeeId}</td>
                <td className="table-td text-sm">{t.department}</td>
                <td className="table-td text-sm">{t.qualifications}</td>
                <td className="table-td text-sm font-semibold text-primary">{t.specialization || 'N/A'}</td>
                <td className="table-td text-xs text-gray-600">{t.classes || 'None'}</td>
                <td className="table-td">
                  <div className="text-xs text-gray-500">{t.email}</div>
                  <div className="text-xs text-gray-400">{t.phone}</div>
                </td>
                <td className="table-td"><span className={sc[t.status] || 'badge-success'}>{t.status}</span></td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleView(t.id)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="View Profile">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button onClick={() => handleEdit(t.id)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Edit Profile">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Delete Profile">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-400 text-sm">No teachers registered yet matching filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Details Modal */}
      {showViewModal && viewTeacherData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Teacher Profile Details</h3>
                <p className="text-blue-200 text-xs">Profile overview for {viewTeacherData.firstName} {viewTeacherData.lastName}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-5 text-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Employee ID</div>
                  <div className="font-mono font-semibold text-primary">{viewTeacherData.employeeId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Status</div>
                  <div>
                    <span className={`badge ${viewTeacherData.isActive ? 'badge-success' : 'badge-warning'} text-xs`}>
                      {viewTeacherData.isActive ? 'Active' : 'On Leave'}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Email Address</div>
                  <div className="text-primary font-medium">{viewTeacherData.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Department</div>
                  <div className="text-primary font-medium">{viewTeacherData.department || 'Not Assigned'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Office Location</div>
                  <div className="text-primary font-medium">{viewTeacherData.officeLocation || 'Not Specified'}</div>
                </div>
                 <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Highest Qualifications</div>
                  <div className="text-primary font-medium">{viewTeacherData.qualifications || 'Not Specified'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Subject of Specialization</div>
                  <div className="text-primary font-medium">{viewTeacherData.specialization || 'Not Specified'}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowViewModal(false)} className="btn-primary text-xs py-2">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Onboard/Edit Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleOnboard} className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-display font-bold text-primary">{editMode ? 'Edit Teacher Details' : 'Add New Teacher'}</h3>
                <p className="text-xs text-gray-400">{editMode ? 'Update faculty record parameters.' : 'Onboard a new faculty member to the academic database.'}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-outline text-xs py-1.5">Cancel</button>
                <button type="submit" disabled={loading} className="btn-primary text-xs py-1.5">
                  {loading ? 'Saving...' : editMode ? 'Save Profile' : '💾 Save Profile'}
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{error}</div>}
              <div>
                <h4 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">👤 Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name *</label>
                    <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="e.g. Jonathan" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name *</label>
                    <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="e.g. Doe" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address *</label>
                    <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="j.doe@school.edu" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password {editMode ? '(Leave blank to keep current)' : '*'}</label>
                    <input type="password" required={!editMode} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">🏢 Administrative Assignment</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
                    <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="input">
                      {departments.map(d => (
                        <option key={d.id} value={d.name}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Office Location</label>
                    <input value={form.officeLocation} onChange={e => setForm(f => ({ ...f, officeLocation: e.target.value }))} placeholder="Building B, Room 402" className="input" />
                  </div>
                  {editMode && (
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Employment Status *</label>
                      <select required value={form.isActive ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'true' }))} className="input">
                        <option value="true">Active</option>
                        <option value="false">On Leave</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-primary mb-3 flex items-center gap-2">🎓 Academic Qualifications & Specialization</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Highest Degree / Qualifications</label>
                    <input value={form.qualifications} onChange={e => setForm(f => ({ ...f, qualifications: e.target.value }))} placeholder="e.g. PhD in Applied Mathematics" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject of Specialization</label>
                    <input value={form.specialization} onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Theoretical Physics" className="input" />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Teachers;
