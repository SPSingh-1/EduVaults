import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';

const sc = { Active: 'badge-success', 'On Leave': 'badge-warning' };

const Teachers = () => {
  const user = JSON.parse(localStorage.getItem('eduvault_user') || '{}');
  const schoolName = user?.schoolName || 'Central High';
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('directory');

  // Teacher Attendance States
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false);
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [attendanceSubmitted, setAttendanceSubmitted] = useState(false);
  const [attendanceTeachers, setAttendanceTeachers] = useState([]);
  
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

  const fetchAttendance = async () => {
    if (teachers.length === 0) return;
    setAttendanceLoading(true);
    try {
      const res = await expressClient.get(`/teacher-attendance?date=${selectedDate}`);
      const dbRecords = res.data || [];

      // Merge backend teachers roster with DB attendance records
      const merged = teachers.map(t => {
        const dbRec = dbRecords.find(r => r.teacherId === t.id);
        const name = t.name || `${t.firstName} ${t.lastName}`;
        return {
          id: t.id,
          name,
          employeeId: t.employeeId || 'N/A',
          department: t.department || 'General',
          status: dbRec?.status || 'Present',
          lateMinutes: dbRec?.lateMinutes || '',
          remarks: dbRec?.remarks || ''
        };
      });

      setAttendanceTeachers(merged);
      const isSaved = dbRecords.length > 0;
      setAttendanceSaved(isSaved);
    } catch (err) {
      console.error('Failed to load teacher attendance:', err);
    } finally {
      setAttendanceLoading(false);
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

  useEffect(() => {
    if (activeTab === 'attendance') {
      setAttendanceSaved(false);
      setIsEditingAttendance(false);
      fetchAttendance();
    }
  }, [activeTab, selectedDate, teachers]);

  const handleSetAttendanceStatus = (id, status) => {
    setAttendanceTeachers(prev => prev.map(t => t.id === id ? { ...t, status, lateMinutes: status === 'Late' ? (t.lateMinutes || '10') : '' } : t));
  };

  const handleSetLateMinutes = (id, lateMinutes) => {
    setAttendanceTeachers(prev => prev.map(t => t.id === id ? { ...t, lateMinutes } : t));
  };

  const handleSetRemarks = (id, remarks) => {
    setAttendanceTeachers(prev => prev.map(t => t.id === id ? { ...t, remarks } : t));
  };

  const handleMarkAll = (status) => {
    setAttendanceTeachers(prev => prev.map(t => ({ ...t, status, lateMinutes: status === 'Late' ? (t.lateMinutes || '10') : '' })));
  };

  const handleSaveAttendance = async () => {
    setAttendanceSubmitting(true);
    try {
      const payload = {
        date: selectedDate,
        attendance: attendanceTeachers.map(t => ({
          teacherId: t.id,
          name: t.name,
          employeeId: t.employeeId,
          status: t.status,
          lateMinutes: t.status === 'Late' ? (parseInt(t.lateMinutes) || 0) : 0,
          remarks: t.remarks
        }))
      };
      await expressClient.post('/teacher-attendance/submit', payload);
      setAttendanceSubmitted(true);
      setAttendanceSaved(true);
      setIsEditingAttendance(false);
      setTimeout(() => setAttendanceSubmitted(false), 4000);
      fetchAttendance();
    } catch (err) {
      console.error(err);
      alert('Failed to save teacher attendance.');
    } finally {
      setAttendanceSubmitting(false);
    }
  };

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

  const attPresentCount = attendanceTeachers.filter(t => t.status === 'Present').length;
  const attLateCount = attendanceTeachers.filter(t => t.status === 'Late').length;
  const attAbsentCount = attendanceTeachers.filter(t => t.status === 'Absent').length;
  const attLeaveCount = attendanceTeachers.filter(t => t.status === 'On Leave').length;

  return (
    <div>
      <Topbar title="Teacher Management" actions={activeTab === 'directory' && <button onClick={() => { setError(''); resetForm(); setShowModal(true); }} className="btn-primary">+ Add New Teacher</button>} />
      
      <div className="card">
        <p className="text-xs text-gray-400 mb-4">Efficiently manage and monitor your faculty records.</p>
        
        {/* Tab Headers */}
        <div className="flex border-b border-gray-100 mb-6 gap-6">
          {[
            { id: 'directory', label: 'Teacher Directory', icon: '👤' },
            { id: 'attendance', label: 'Teacher Attendance', icon: '📋' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'directory' && (
          <>
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
                  <th className="table-th text-left">Teacher Info</th>
                  <th className="table-th text-left">ID</th>
                  <th className="table-th text-left">Department</th>
                  <th className="table-th text-left">Qualifications</th>
                  <th className="table-th text-left">Specialization</th>
                  <th className="table-th text-left">Assigned Classes</th>
                  <th className="table-th text-left">Contact</th>
                  <th className="table-th text-left">Status</th>
                  <th className="table-th text-left">Actions</th>
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
                        <button type="button" onClick={() => handleView(t.id)} className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="View Profile">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => handleEdit(t.id)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Edit Profile">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => handleDelete(t.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Delete Profile">
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
                    <td colSpan="9" className="text-center py-6 text-gray-400 text-sm">No teachers registered yet matching filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'attendance' && (
          <div>
            {attendanceSubmitted && (
              <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700 flex items-center gap-2 font-medium">
                ✅ Teacher attendance saved successfully for {selectedDate}!
              </div>
            )}

            {/* Filters / Actions */}
            <div className="flex flex-wrap items-end gap-4 mb-5 pb-4 border-b border-gray-100">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Attendance Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="input text-sm"
                />
              </div>

              {attendanceTeachers.length > 0 && (
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={attendanceSaved && !isEditingAttendance}
                    onClick={() => handleMarkAll('Present')}
                    className={`px-3 py-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-all ${attendanceSaved && !isEditingAttendance ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ✓ All Present
                  </button>
                  <button
                    type="button"
                    disabled={attendanceSaved && !isEditingAttendance}
                    onClick={() => handleMarkAll('Absent')}
                    className={`px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-all ${attendanceSaved && !isEditingAttendance ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    ✗ All Absent
                  </button>
                  <button
                    type="button"
                    disabled={attendanceSaved && !isEditingAttendance}
                    onClick={() => handleMarkAll('On Leave')}
                    className={`px-3 py-2 text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-all ${attendanceSaved && !isEditingAttendance ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    💼 All On Leave
                  </button>
                </div>
              )}
            </div>

            {/* Summary Row */}
            {attendanceTeachers.length > 0 && (
              <div className="grid grid-cols-5 gap-4 mb-5">
                {[
                  { label: 'Total Staff', value: attendanceTeachers.length, color: 'text-primary bg-primary/5' },
                  { label: 'Present', value: attPresentCount, color: 'text-green-600 bg-green-50' },
                  { label: 'Late', value: attLateCount, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Absent', value: attAbsentCount, color: 'text-red-500 bg-red-50' },
                  { label: 'On Leave', value: attLeaveCount, color: 'text-orange-500 bg-orange-50/50' }
                ].map(metric => (
                  <div key={metric.label} className={`rounded-xl p-3 text-center ${metric.color}`}>
                    <div className="text-2xs font-semibold uppercase tracking-wide opacity-80">{metric.label}</div>
                    <div className="font-display text-lg font-bold mt-0.5">{metric.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Attendance Table */}
            {attendanceLoading ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                <div className="animate-spin text-2xl mb-2">⏳</div>
                Loading teacher attendance records...
              </div>
            ) : attendanceTeachers.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">
                No teachers found in directory to mark attendance.
              </div>
            ) : (
              <div>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th text-left">Teacher Name</th>
                      <th className="table-th text-left">Employee ID</th>
                      <th className="table-th text-left">Department</th>
                      <th className="table-th">Status</th>
                      <th className="table-th">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceTeachers.map(t => (
                      <tr key={t.id} className={`border-b border-gray-50 hover:bg-gray-50 ${attendanceSaved && !isEditingAttendance ? 'opacity-85' : ''}`}>
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${t.status === 'Absent' ? 'bg-red-100 text-red-600'
                              : t.status === 'Late' ? 'bg-amber-100 text-amber-700'
                                : t.status === 'On Leave' ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                              {t.name ? t.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                            </div>
                            <div className="font-semibold text-primary text-sm">{t.name}</div>
                          </div>
                        </td>
                        <td className="table-td text-xs font-mono text-gray-500">{t.employeeId}</td>
                        <td className="table-td text-sm text-gray-600">{t.department}</td>
                        <td className="table-td">
                          <div className="flex items-center justify-center gap-1.5">
                            {[
                              { key: 'Present', activeClass: 'bg-green-500 text-white border-green-500', inactiveClass: 'bg-white text-gray-400 border-gray-200 hover:border-green-300 hover:text-green-600' },
                              { key: 'Late', activeClass: 'bg-amber-500 text-white border-amber-500', inactiveClass: 'bg-white text-gray-400 border-gray-200 hover:border-amber-300 hover:text-amber-600' },
                              { key: 'Absent', activeClass: 'bg-red-500 text-white border-red-500', inactiveClass: 'bg-white text-gray-400 border-gray-200 hover:border-red-300 hover:text-red-500' },
                              { key: 'On Leave', activeClass: 'bg-orange-500 text-white border-orange-500', inactiveClass: 'bg-white text-gray-400 border-gray-200 hover:border-orange-300 hover:text-orange-600' }
                            ].map(({ key, activeClass, inactiveClass }) => (
                              <button
                                key={key}
                                type="button"
                                disabled={attendanceSaved && !isEditingAttendance}
                                onClick={() => handleSetAttendanceStatus(t.id, key)}
                                className={`px-2.5 py-1.5 rounded-lg text-2xs font-bold border transition-all min-w-[64px] ${t.status === key ? activeClass : inactiveClass
                                  } ${attendanceSaved && !isEditingAttendance ? 'cursor-not-allowed opacity-60' : ''}`}
                              >
                                {key}
                              </button>
                            ))}

                            {t.status === 'Late' && (
                              <div className="flex items-center gap-1 ml-2">
                                <span className="text-[10px] text-amber-700 font-semibold whitespace-nowrap">Mins:</span>
                                <input
                                  type="number"
                                  min="1"
                                  max="120"
                                  disabled={attendanceSaved && !isEditingAttendance}
                                  value={t.lateMinutes || ''}
                                  onChange={e => handleSetLateMinutes(t.id, e.target.value)}
                                  placeholder="10"
                                  className="w-12 border border-amber-200 bg-amber-50 rounded px-1.5 py-1 text-2xs text-center focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="table-td">
                          <input
                            disabled={attendanceSaved && !isEditingAttendance}
                            value={t.remarks || ''}
                            onChange={e => handleSetRemarks(t.id, e.target.value)}
                            placeholder="Optional remark"
                            className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/20 bg-gray-50 placeholder-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Save / Update buttons */}
                <div className="flex justify-end gap-3 mt-5">
                  {attendanceSaved && !isEditingAttendance ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingAttendance(true)}
                      className="px-6 py-2.5 rounded-xl font-bold text-xs border-2 border-primary text-primary bg-white hover:bg-primary/5 transition-all flex items-center gap-1.5"
                    >
                      ✏️ Edit Attendance
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSaveAttendance}
                      disabled={attendanceSubmitting}
                      className="btn-primary text-xs px-6 py-2.5 rounded-xl font-bold"
                    >
                      {attendanceSubmitting ? '⏳ Saving...' : isEditingAttendance ? '🔄 Update Attendance' : '✔ Save Attendance'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
