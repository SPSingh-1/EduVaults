import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const sc = { ACTIVE: 'badge-success', WITHDRAWN: 'badge-gray', SUSPENDED: 'badge-danger' };

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');

  // Dropdown filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStudentData, setViewStudentData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [classSections, setClassSections] = useState([]);
  const [capacityWarning, setCapacityWarning] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Form State
  const [editMode, setEditMode] = useState(false);
  const [editStudentId, setEditStudentId] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: 'Student123!', // default
    classId: '',
    bloodGroup: '',
    guardianName: '',
    guardianPhone: '',
    guardianRelationship: 'Father',
    address: '',
    status: 'ACTIVE'
  });

  const fetchData = async () => {
    try {
      const studRes = await apiClient.get('/academics/students');
      setStudents(studRes.data);

      const classRes = await apiClient.get('/academics/enrollment-classes');
      setClasses(classRes.data);

      const secRes = await apiClient.get('/academics/classes');
      setClassSections(secRes.data);
      if (secRes.data.length > 0 && !editMode) {
        const firstAvailable = secRes.data.find(c => c.enrolled < c.capacity) || secRes.data[0];
        setForm(f => ({ ...f, classId: firstAvailable?.id || '' }));
      }
    } catch (err) {
      console.error('Error fetching student portal data:', err);
    }
  };

  useEffect(() => {
    fetchData();
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
      password: 'Student123!',
      classId: classSections.find(c => c.enrolled < c.capacity)?.id || classSections[0]?.id || '',
      bloodGroup: '',
      guardianName: '',
      guardianPhone: '',
      guardianRelationship: 'Father',
      address: '',
      status: 'ACTIVE'
    });
    setEditMode(false);
    setEditStudentId(null);
    setCapacityWarning(null);
    setSuggestions([]);
  };

  const handleClassChange = (val) => {
    setForm(f => ({ ...f, classId: val }));
    const cls = classSections.find(c => c.id === val);
    if (cls && cls.enrolled >= cls.capacity) {
      setCapacityWarning(cls);
      const sug = classSections.filter(c => c.grade === cls.grade && c.id !== cls.id && c.enrolled < c.capacity);
      setSuggestions(sug);
    } else {
      setCapacityWarning(null);
      setSuggestions([]);
    }
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.classId) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (editMode) {
        await apiClient.put(`/academics/students/${editStudentId}`, form);
      } else {
        await apiClient.post('/academics/students', form);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${editMode ? 'update' : 'admit'} student.`);
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (id) => {
    try {
      const res = await apiClient.get(`/academics/students/${id}`);
      setViewStudentData(res.data);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching student details:', err);
    }
  };

  const handleEdit = async (id) => {
    try {
      setError('');
      const res = await apiClient.get(`/academics/students/${id}`);
      const student = res.data;
      setForm({
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        password: '', // blank by default on edit
        classId: student.classId || '',
        bloodGroup: student.bloodGroup || '',
        guardianName: student.guardianName || '',
        guardianPhone: student.guardianPhone || '',
        guardianRelationship: student.guardianRelationship || 'Father',
        address: student.address || '',
        status: student.status || 'ACTIVE'
      });
      setEditStudentId(id);
      setEditMode(true);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching student details for edit:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student profile?')) {
      try {
        await apiClient.delete(`/academics/students/${id}`);
        fetchData();
      } catch (err) {
        console.error('Error deleting student profile:', err);
      }
    }
  };

  // Helper to normalize class names for comparison (e.g. "Class 1" or "1" => "1")
  const normalizeClass = (cls) => {
    if (!cls) return '';
    return cls.toString().toLowerCase().replace(/\s+/g, '').replace(/^class/, '');
  };

  // Filter students based on all 4 filter criteria (Name, Class, Section, Status)
  const uniqueSections = [...new Set(classSections.map(c => c.section))].filter(Boolean).sort();

  const filtered = students.filter(s => {
    const nameStr = s.name || '';
    const matchesName = !search || nameStr.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !selectedClass || normalizeClass(s.class) === normalizeClass(selectedClass);
    const matchesSection = !selectedSection || s.section === selectedSection;
    const statusStr = s.status || '';
    const matchesStatus = !selectedStatus || statusStr.toUpperCase() === selectedStatus.toUpperCase();
    return matchesName && matchesClass && matchesSection && matchesStatus;
  });

  return (
    <div>
      <Topbar title="Student Directory" subtitle="Admin Portal" actions={
        <div className="flex gap-2">
          <button className="btn-outline text-xs">↑ Bulk Import</button>
          <button onClick={() => { setError(''); resetForm(); setShowModal(true); }} className="btn-primary text-xs">+ Add New Student</button>
        </div>
      } />
      <div className="card">
        <p className="text-xs text-gray-400 mb-4">Manage and organize all student records across all classes.</p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <input placeholder="Search students by name..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>

          <div className="grid grid-cols-3 gap-2 shrink-0">
            {/* Class Filter Dropdown */}
            <select className="input w-full text-xs sm:text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Class All</option>
              {classes.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>

            {/* Section Filter Dropdown */}
            <select className="input w-full text-xs sm:text-sm" value={selectedSection} onChange={e => setSelectedSection(e.target.value)}>
              <option value="">Section All</option>
              {uniqueSections.length > 0 ? (
                uniqueSections.map((sec, idx) => (
                  <option key={idx} value={sec}>{sec}</option>
                ))
              ) : (
                <>
                  <option value="Section A">Section A</option>
                  <option value="Section B">Section B</option>
                  <option value="Section C">Section C</option>
                </>
              )}
            </select>

            {/* Status Filter Dropdown */}
            <select className="input w-full text-xs sm:text-sm" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
            <table className="w-full" style={{ minWidth: '780px', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Student Name</th>
                  <th className="table-th">Student ID</th>
                  <th className="table-th">Class</th>
                  <th className="table-th">Section</th>
                  <th className="table-th">Father's Name</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {s.name ? s.name[0] : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-primary text-sm">{s.name}</div>
                          <div className="text-xs text-gray-400">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-xs font-mono text-gray-500">{s.studentId}</td>
                    <td className="table-td text-sm">{s.class}</td>
                    <td className="table-td text-sm">{s.section}</td>
                    <td className="table-td text-sm">{s.father}</td>
                    <td className="table-td"><span className={sc[s.status] || 'badge-success'}>{s.status}</span></td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleView(s.id)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="View Profile">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => handleEdit(s.id)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Edit Profile">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Delete Profile">
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
                    <td colSpan="7" className="text-center py-6 text-gray-400 text-sm">No students registered yet matching filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">Showing 1 to {filtered.length} of {students.length} students</div>
        </div>
      </div>

      {/* View Details Modal */}
      {showViewModal && viewStudentData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Student Profile Details</h3>
                <p className="text-blue-200 text-xs">Profile overview for {viewStudentData.firstName} {viewStudentData.lastName}</p>
              </div>
              <button onClick={() => setShowViewModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-5 text-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Student ID</div>
                  <div className="font-mono font-semibold text-primary">{viewStudentData.studentId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Status</div>
                  <div>
                    <span className={`badge ${sc[viewStudentData.status] || 'badge-success'} text-xs`}>
                      {viewStudentData.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Email Address</div>
                  <div className="text-primary font-medium">{viewStudentData.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Blood Group</div>
                  <div className="text-primary font-medium">{viewStudentData.bloodGroup || 'Not Specified'}</div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="font-semibold text-primary text-xs uppercase mb-3 tracking-wide">👪 Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Guardian Name</div>
                    <div className="text-primary font-medium">{viewStudentData.guardianName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Relationship</div>
                    <div className="text-primary font-medium">{viewStudentData.guardianRelationship}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Contact Number</div>
                    <div className="text-primary font-medium">{viewStudentData.guardianPhone}</div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Residential Address</div>
                <div className="text-primary font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">{viewStudentData.address || 'No address registered.'}</div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowViewModal(false)} className="btn-primary text-xs py-2">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Admission/Edit Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleOnboard} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-primary px-6 py-5 rounded-t-2xl sticky top-0 z-10 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">{editMode ? 'Edit Student Details' : 'Student Admission'}</h3>
                <p className="text-blue-200 text-xs">{editMode ? 'Update student records in the central database.' : 'Register a new student by providing the required information.'}</p>
              </div>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-6">
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{error}</div>}
              <div>
                <h4 className="font-semibold text-primary text-sm flex items-center gap-2 mb-3">👤 Student Personal Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">First Name *</label>
                    <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="John" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Last Name *</label>
                    <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Doe" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email *</label>
                    <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@school.edu" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password {editMode ? '(Leave blank to keep current)' : '*'}</label>
                    <input type="password" required={!editMode} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Enrollment Class *</label>
                    <select required value={form.classId} onChange={e => handleClassChange(e.target.value)} className="input">
                      <option value="">Select Class Section</option>
                      {classSections.map(c => (
                        <option key={c.id} value={c.id}>Class {c.grade} - {c.section} (Room {c.room}) [{c.enrolled}/{c.capacity}]</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Blood Group</label>
                    <input value={form.bloodGroup} onChange={e => setForm(f => ({ ...f, bloodGroup: e.target.value }))} placeholder="e.g. O+" className="input" />
                  </div>

                  {editMode && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Account Status *</label>
                      <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
                        <option value="ACTIVE">Active</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                        <option value="SUSPENDED">Suspended</option>
                      </select>
                    </div>
                  )}

                  {capacityWarning && (
                    <div className="col-span-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg p-3.5 mb-2">
                      ⚠️ <strong>Room Capacity Warning</strong>: Class {capacityWarning.grade} - {capacityWarning.section} ({capacityWarning.room}) has reached its capacity limit of {capacityWarning.capacity} students.
                      <span className="text-gray-600 font-normal mt-1 block">Suggestion: Consider enrolling in other rooms/sections with remaining capacity:</span>
                      <ul className="list-disc list-inside mt-1.5 pl-1 text-gray-700">
                        {suggestions.map((s, idx) => (
                          <li key={idx}>Class {s.grade} - {s.section} (Room {s.room}) — {s.capacity - s.enrolled} seats available</li>
                        ))}
                        {suggestions.length === 0 && <li>Create a new section (e.g., Section {String.fromCharCode(capacityWarning.section.charCodeAt(capacityWarning.section.length - 1) + 1)}) in the Setup tab.</li>}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-primary text-sm flex items-center gap-2 mb-3">👪 Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Guardian Name</label>
                    <input value={form.guardianName} onChange={e => setForm(f => ({ ...f, guardianName: e.target.value }))} placeholder="Father/Mother name" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number</label>
                    <input value={form.guardianPhone} onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value }))} placeholder="Phone number" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Relationship</label>
                    <select value={form.guardianRelationship} onChange={e => setForm(f => ({ ...f, guardianRelationship: e.target.value }))} className="input">
                      <option>Father</option>
                      <option>Mother</option>
                      <option>Guardian</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
                    <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Residential address" className="input" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Submitting...' : editMode ? 'Save Profile' : 'Save & Admit Student'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Students;
