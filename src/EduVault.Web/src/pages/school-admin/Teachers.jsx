import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';

const sc = { Active: 'badge-success', 'On Leave': 'badge-warning' };

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
        className={className || "input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl"}
        style={style || { width: '130px' }}
      />
    </div>
  );
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Teachers = () => {
  const user = JSON.parse(localStorage.getItem('eduvault_user') || '{}');
  const schoolName = user?.schoolName || 'Central High';
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('directory');

  // Daily Attendance States
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceTeachers, setAttendanceTeachers] = useState([]);
  const [attendanceSaved, setAttendanceSaved] = useState(false);

  // Teacher Attendance Inspection States
  const [selectedInspectionTeacherId, setSelectedInspectionTeacherId] = useState('');
  const [teacherAttendanceHistory, setTeacherAttendanceHistory] = useState([]);
  const [teacherAttendanceStats, setTeacherAttendanceStats] = useState(null);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionMonth, setInspectionMonth] = useState(new Date());
  const [selectedInspectionDayRecord, setSelectedInspectionDayRecord] = useState(null);

  const fetchTeacherInspectionData = async (tId) => {
    if (!tId) {
      setTeacherAttendanceHistory([]);
      setTeacherAttendanceStats(null);
      return;
    }
    setInspectionLoading(true);
    try {
      const res = await expressClient.get(`/teacher-attendance/teacher/${tId}`);
      setTeacherAttendanceHistory(res.data.records || []);
      setTeacherAttendanceStats(res.data.stats || null);
    } catch (err) {
      console.error('Failed to load teacher inspection history:', err);
    } finally {
      setInspectionLoading(false);
    }
  };

  // Dropdown filter states
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewTeacherData, setViewTeacherData] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

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
    dateOfBirth: '',
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
    if (teachers.length > 0 && !selectedInspectionTeacherId) {
      setSelectedInspectionTeacherId(teachers[0].id);
    }
  }, [teachers]);

  useEffect(() => {
    if (activeTab === 'attendance' && selectedInspectionTeacherId) {
      fetchTeacherInspectionData(selectedInspectionTeacherId);
    }
  }, [activeTab, selectedInspectionTeacherId]);

  const parseCSV = (text) => {
    const lines = text.split(/\r\n|\n/);
    if (lines.length < 2) return [];
    const result = [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = [];
      let insideQuote = false;
      let currentValue = '';
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
      });
      result.push(row);
    }
    return result;
  };

  const downloadCsvTemplate = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Date of Birth', 'Department', 'Office Location', 'Qualifications', 'Specialization'];
    const sampleRows = [
      ['Amit', 'Sharma', 'amit.sharma@school.com', '15-03-1985', 'Mathematics', 'Block A - Room 10', 'M.Sc Mathematics; B.Ed', 'Algebra'],
      ['Priya', 'Verma', 'priya.verma@school.com', '22-07-1988', 'Science', 'Block B - Lab 2', 'M.Sc Physics; B.Ed', 'Physics'],
      ['Rahul', 'Singh', 'rahul.singh@school.com', '09/11/1982', 'English', 'Block C - Room 20', 'M.A English; B.Ed', 'English Literature']
    ];
    
    let csvContent = headers.join(',') + '\n';
    sampleRows.forEach(row => {
      csvContent += row.map(val => `"${val}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'teacher_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate that it's a CSV file
    const fileName = file.name || '';
    const fileExtension = fileName.split('.').pop().toLowerCase();
    const isCsv = fileExtension === 'csv' && (file.type === '' || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel' || file.type === 'application/csv');
    if (!isCsv) {
      setImportError('Invalid file type. Only CSV files (.csv) are allowed.');
      return;
    }

    // Limit file size to 1 MB to prevent Denial of Service
    if (file.size > 1 * 1024 * 1024) {
      setImportError('File size is too large. Maximum size is 1 MB.');
      return;
    }

    setImportError('');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setImportError('No valid rows found in CSV file.');
          return;
        }

        if (parsed.length > 100) {
          setImportError('Bulk import is limited to a maximum of 100 rows at a time.');
          return;
        }

        // Validate each row for formula injection and script/HTML injection
        const hasFormulaOrScript = (val, isPhone = false) => {
          if (!val) return false;
          const str = val.toString().trim();
          if (str.length === 0) return false;
          
          const firstChar = str[0];
          if (firstChar === '=' || firstChar === '-' || firstChar === '@') {
            return true;
          }
          if (firstChar === '+' && !isPhone) {
            return true;
          }
          if (isPhone && !/^\+?[0-9\s\-()]+$/.test(str)) {
            return true;
          }
          if (str.includes('<') || str.includes('>')) {
            return true;
          }
          return false;
        };

        for (let i = 0; i < parsed.length; i++) {
          const row = parsed[i];
          const nameVal = row['name'] || row['teacher name'] || row['teachername'] || '';
          let first = row['first name'] || row['firstname'] || row['first_name'] || '';
          let last = row['last name'] || row['lastname'] || row['last_name'] || '';
          if (!first && nameVal) {
            const parts = nameVal.trim().split(/\s+/);
            first = parts[0] || '';
            last = parts.slice(1).join(' ') || '';
          }
          const emailVal = row['email'] || row['email address'] || row['emailid'] || row['mailid'] || row['username'] || '';
          const dob = row['date of birth'] || row['dob'] || row['birth date'] || row['birthdate'] || row['dateofbirth'] || '';
          const dept = row['department'] || row['dept'] || '';
          const office = row['office location'] || row['officelocation'] || row['office'] || '';
          const qual = row['qualifications'] || row['qualification'] || row['degree'] || '';
          const spec = row['specialization'] || row['subject'] || '';

          if (hasFormulaOrScript(first)) {
            setImportError(`Row ${i + 1}: First Name contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(last)) {
            setImportError(`Row ${i + 1}: Last Name contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(emailVal)) {
            setImportError(`Row ${i + 1}: Email contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(dob)) {
            setImportError(`Row ${i + 1}: Date of Birth contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(dept)) {
            setImportError(`Row ${i + 1}: Department contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(office)) {
            setImportError(`Row ${i + 1}: Office Location contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(qual)) {
            setImportError(`Row ${i + 1}: Qualifications contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(spec)) {
            setImportError(`Row ${i + 1}: Specialization contains invalid or unsafe characters.`);
            return;
          }
        }

        const mappedTeachers = parsed.map(row => {
          const nameVal = row['name'] || row['teacher name'] || row['teachername'] || '';
          let first = row['first name'] || row['firstname'] || row['first_name'] || '';
          let last = row['last name'] || row['lastname'] || row['last_name'] || '';
          if (!first && nameVal) {
            const parts = nameVal.trim().split(/\s+/);
            first = parts[0] || '';
            last = parts.slice(1).join(' ') || '';
          }
          return {
            firstName: first || 'Unknown',
            lastName: last || 'Teacher',
            email: row['email'] || row['email address'] || row['emailid'] || row['mailid'] || row['username'] || '',
            dateOfBirth: row['date of birth'] || row['dob'] || row['birth date'] || row['birthdate'] || row['dateofbirth'] || '01-01-1980',
            department: row['department'] || row['dept'] || departments[0]?.name || 'Science & Mathematics',
            officeLocation: row['office location'] || row['officelocation'] || row['office'] || '',
            qualifications: row['qualifications'] || row['qualification'] || row['degree'] || '',
            specialization: row['specialization'] || row['subject'] || ''
          };
        });

        const res = await apiClient.post('/academics/teachers/import', { teachers: mappedTeachers });
        setImportResult(res.data);
        fetchTeachers();
      } catch (err) {
        console.error('Error importing CSV:', err);
        setImportError(err.response?.data?.error || 'Failed to import teacher CSV roster.');
      }
    };
    reader.readAsText(file);
  };

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
      dateOfBirth: '',
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
        dateOfBirth: teacher.dateOfBirth || '',
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

  // Filter teachers based on search query, department, status, and date range
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
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.createdAt) > to) return false;
    }
    
    return matchesSearch && matchesDept && matchesStatus;
  });

  const attPresentCount = attendanceTeachers.filter(t => t.status === 'Present').length;
  const attLateCount = attendanceTeachers.filter(t => t.status === 'Late').length;
  const attAbsentCount = attendanceTeachers.filter(t => t.status === 'Absent').length;
  const attLeaveCount = attendanceTeachers.filter(t => t.status === 'On Leave').length;

  return (
    <div>
      <Topbar title="Teacher Management" actions={activeTab === 'directory' && (
        <div className="flex gap-2">
          <button onClick={() => { setImportError(''); setImportResult(null); setShowImportModal(true); }} className="btn-outline text-xs">↑ Bulk Import</button>
          <button onClick={() => { setError(''); resetForm(); setShowModal(true); }} className="btn-primary text-xs">+ Add New Teacher</button>
        </div>
      )} />

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
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-all ${activeTab === tab.id
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

            <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <input placeholder="Search teachers by name, email, or employee ID..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl" style={{ width: '130px' }} />
                <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl" style={{ width: '130px' }} />
                {(dateFrom || dateTo || search || selectedDepartment || selectedStatus) && (
                  <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setSelectedDepartment(''); setSelectedStatus(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }} className="w-full xl:w-auto">
                <select className="input text-xs" style={{ flex: 1, minWidth: 100 }} value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)}>
                  <option value="">All Departments</option>
                  {uniqueDepartments.map((dept, idx) => (
                    <option key={idx} value={dept}>{dept}</option>
                  ))}
                </select>
                <select className="input text-xs" style={{ flex: 1, minWidth: 100 }} value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {uniqueStatuses.map((stat, idx) => (
                    <option key={idx} value={stat}>{stat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
                <table className="w-full" style={{ minWidth: '950px', borderCollapse: 'collapse' }}>
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
              </div>
            </div>
          </>
        )}

        {activeTab === 'attendance' && (
          <div>
            {/* Teacher Selection Bar */}
            <div className="card mb-6 bg-gradient-to-r from-slate-900 via-primary to-slate-900 p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-lg rounded-2xl">
              <div>
                <h3 className="font-display font-bold text-lg flex items-center gap-2">
                  👨‍🏫 Teacher Attendance Inspection Portal
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">Select a faculty member from the directory to inspect their GPS punch-ins, working hours, and monthly attendance calendar.</p>
              </div>

              <div className="flex items-center gap-3 min-w-[280px]">
                <label className="text-xs font-bold text-white uppercase whitespace-nowrap">Select Teacher:</label>
                <select
                  value={selectedInspectionTeacherId}
                  onChange={e => setSelectedInspectionTeacherId(e.target.value)}
                  className="input bg-white text-slate-900 text-xs font-bold py-2 px-3 rounded-xl shadow-md border-0 focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Select Teacher —</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name || `${t.firstName} ${t.lastName}`} ({t.employeeId || 'ID N/A'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedInspectionTeacherId ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <div className="text-sm font-semibold">Select a teacher above to inspect their attendance history.</div>
              </div>
            ) : inspectionLoading ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="animate-spin text-3xl mb-3">⏳</div>
                <div className="text-sm font-semibold">Loading teacher attendance history...</div>
              </div>
            ) : (
              <div>
                {/* Statistics Metric Cards */}
                {teacherAttendanceStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                    {[
                      { label: 'Present Days', value: teacherAttendanceStats.totalPresent, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: '✅' },
                      { label: 'Late Days', value: teacherAttendanceStats.totalLate, color: 'text-amber-600 bg-amber-50 border-amber-100', icon: '⏱️' },
                      { label: 'Single Punch', value: teacherAttendanceStats.totalSinglePunch, color: 'text-blue-600 bg-blue-50 border-blue-100', icon: '📍' },
                      { label: 'Half Days', value: teacherAttendanceStats.totalHalfDay, color: 'text-purple-600 bg-purple-50 border-purple-100', icon: '🌓' },
                      { label: 'Absent Days', value: teacherAttendanceStats.totalAbsent, color: 'text-rose-600 bg-rose-50 border-rose-100', icon: '❌' },
                      { label: 'On Leave', value: teacherAttendanceStats.totalOnLeave, color: 'text-orange-600 bg-orange-50 border-orange-100', icon: '💼' }
                    ].map(metric => (
                      <div key={metric.label} className={`card p-3.5 border ${metric.color} flex items-center gap-3 shadow-2xs`}>
                        <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg shadow-xs shrink-0">{metric.icon}</div>
                        <div>
                          <div className={`font-display text-xl font-bold ${metric.color.split(' ')[0]}`}>{metric.value}</div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{metric.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Monthly Calendar View */}
                {(() => {
                  const year = inspectionMonth.getFullYear();
                  const month = inspectionMonth.getMonth();
                  const firstDay = new Date(year, month, 1);
                  const firstDayOfWeek = firstDay.getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();

                  const monthNames = [
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ];

                  const calendarDays = [];
                  for (let i = 0; i < firstDayOfWeek; i++) {
                    calendarDays.push({ padding: true, key: `pad-${i}` });
                  }
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const record = teacherAttendanceHistory.find(a => a.date === dateStr);
                    calendarDays.push({ padding: false, day, dateStr, record, key: `day-${day}` });
                  }

                  const getStatusBadgeColor = (status) => {
                    if (status === 'Present') return 'bg-emerald-500 text-white';
                    if (status === 'Late') return 'bg-amber-500 text-white';
                    if (status === 'Single Punch') return 'bg-blue-500 text-white';
                    if (status === 'Half Day') return 'bg-purple-500 text-white';
                    if (status === 'Absent') return 'bg-rose-500 text-white';
                    if (status === 'On Leave') return 'bg-orange-500 text-white';
                    return 'bg-gray-100 text-gray-400';
                  };

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="card lg:col-span-2">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                            📅 {monthNames[month]} {year} Calendar
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setInspectionMonth(new Date(year, month - 1, 1)); setSelectedInspectionDayRecord(null); }}
                              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-xs font-bold"
                            >
                              ◀ Prev
                            </button>
                            <button
                              onClick={() => { setInspectionMonth(new Date(year, month + 1, 1)); setSelectedInspectionDayRecord(null); }}
                              className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-xs font-bold"
                            >
                              Next ▶
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
                        </div>

                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                          {calendarDays.map(item => {
                            if (item.padding) {
                              return <div key={item.key} className="h-16 bg-gray-50/30 rounded-xl border border-dashed border-gray-100" />;
                            }
                            const hasRecord = !!item.record;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => item.record && setSelectedInspectionDayRecord(item.record)}
                                className={`h-16 rounded-xl border flex flex-col justify-between p-2 text-left relative transition-all ${
                                  hasRecord
                                    ? getStatusBadgeColor(item.record.status)
                                    : 'border-gray-100 hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                <span className="text-xs font-bold">{item.day}</span>
                                {hasRecord && (
                                  <span className="text-[9px] font-extrabold uppercase leading-none opacity-95 truncate max-w-full">
                                    {item.record.status}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Day Details Drawer */}
                      <div className="space-y-4">
                        <div className="card bg-gray-50/50">
                          <h3 className="font-display font-bold text-primary text-sm mb-4 flex items-center gap-2">
                            ℹ️ Attendance Details Log
                          </h3>
                          {selectedInspectionDayRecord ? (
                            <div className="space-y-3.5 text-xs">
                              <div className="flex justify-between py-1.5 border-b border-gray-100">
                                <span className="text-gray-400 font-semibold uppercase">Date</span>
                                <span className="font-bold text-primary">{selectedInspectionDayRecord.date}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-100">
                                <span className="text-gray-400 font-semibold uppercase">Status</span>
                                <span className="font-extrabold text-primary">{selectedInspectionDayRecord.status}</span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-100">
                                <span className="text-gray-400 font-semibold uppercase">Punch In Time</span>
                                <span className="font-bold text-emerald-600">
                                  {selectedInspectionDayRecord.punchInTime ? new Date(selectedInspectionDayRecord.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-100">
                                <span className="text-gray-400 font-semibold uppercase">Punch Out Time</span>
                                <span className="font-bold text-purple-600">
                                  {selectedInspectionDayRecord.punchOutTime ? new Date(selectedInspectionDayRecord.punchOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between py-1.5 border-b border-gray-100">
                                <span className="text-gray-400 font-semibold uppercase">Worked Hours</span>
                                <span className="font-bold text-blue-600">
                                  {selectedInspectionDayRecord.workingHours ? `${selectedInspectionDayRecord.workingHours} hrs` : 'N/A'}
                                </span>
                              </div>
                              {selectedInspectionDayRecord.status === 'Late' && (
                                <div className="flex justify-between py-1.5 border-b border-gray-100">
                                  <span className="text-gray-400 font-semibold uppercase">Minutes Late</span>
                                  <span className="font-bold text-amber-600">{selectedInspectionDayRecord.lateMinutes} mins</span>
                                </div>
                              )}
                              {selectedInspectionDayRecord.punchInLocation && (
                                <div className="py-1.5 border-b border-gray-100">
                                  <span className="text-gray-400 font-semibold uppercase block mb-1">GPS Location</span>
                                  <span className="font-mono text-[10px] text-slate-700 bg-white p-2 rounded border border-gray-200 block">
                                    📍 Lat: {selectedInspectionDayRecord.punchInLocation.latitude}, Lng: {selectedInspectionDayRecord.punchInLocation.longitude}
                                  </span>
                                </div>
                              )}
                              <div className="py-1.5">
                                <span className="text-gray-400 font-semibold uppercase block mb-1">Remarks</span>
                                <p className="text-gray-600 bg-white p-2.5 rounded-lg border border-gray-100 italic leading-normal">
                                  {selectedInspectionDayRecord.remarks || 'No remarks provided.'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-400 italic text-2xs">
                              Click on any marked date in the calendar to view full attendance remarks and GPS details.
                            </div>
                          )}
                        </div>

                        <div className="card">
                          <h3 className="font-display font-bold text-primary text-sm mb-3">Status Legend</h3>
                          <div className="space-y-2">
                            {[
                              { label: 'Present', color: 'bg-emerald-500' },
                              { label: 'Late', color: 'bg-amber-500' },
                              { label: 'Single Punch', color: 'bg-blue-500' },
                              { label: 'Half Day', color: 'bg-purple-500' },
                              { label: 'Absent', color: 'bg-rose-500' },
                              { label: 'On Leave', color: 'bg-orange-500' }
                            ].map(item => (
                              <div key={item.label} className="flex items-center gap-2 text-xs">
                                <span className={`w-3 h-3 rounded-full ${item.color}`} />
                                <span className="font-medium text-gray-600">{item.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
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
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Date of Birth</div>
                  <div className="text-primary font-medium">{viewTeacherData.dateOfBirth || 'Not Specified'}</div>
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="teacher-dob-input">Date of Birth *</label>
                    <input id="teacher-dob-input" required type="text" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} placeholder="dd-MM-yyyy" className="input" />
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

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Bulk Teacher Import</h3>
                <p className="text-blue-200 text-xs">Import a list of teachers from a CSV file.</p>
              </div>
              <button type="button" onClick={() => { setShowImportModal(false); setImportResult(null); setImportError(''); }} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {importError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">
                  ⚠️ {importError}
                </div>
              )}

              {!importResult ? (
                <div className="space-y-4 text-left font-sans">
                  
                  {/* Expected CSV Template Structure */}
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3 font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Required CSV Roster Format</span>
                      <button 
                        type="button" 
                        onClick={downloadCsvTemplate}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100/70 border border-blue-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        📥 Download CSV Template
                      </button>
                    </div>
                    <div className="overflow-x-auto max-w-full rounded-lg border border-slate-150 bg-white shadow-sm">
                      <table className="min-w-[650px] text-[10px] text-left border-collapse font-sans">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-150 font-mono text-slate-705 font-semibold">
                            <th className="p-2 border-r border-slate-150">First Name</th>
                            <th className="p-2 border-r border-slate-150">Last Name</th>
                            <th className="p-2 border-r border-slate-150">Email</th>
                            <th className="p-2 border-r border-slate-150">Date of Birth</th>
                            <th className="p-2 border-r border-slate-150">Department</th>
                            <th className="p-2 border-r border-slate-150">Office Location</th>
                            <th className="p-2 border-r border-slate-150">Qualifications</th>
                            <th className="p-2">Specialization</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-150/60 font-mono text-gray-500">
                            <td className="p-2 border-r border-slate-150">Amit</td>
                            <td className="p-2 border-r border-slate-150">Sharma</td>
                            <td className="p-2 border-r border-slate-150 font-mono text-[10px]">amit.sharma@school.com</td>
                            <td className="p-2 border-r border-slate-150">15-03-1985</td>
                            <td className="p-2 border-r border-slate-150">Mathematics</td>
                            <td className="p-2 border-r border-slate-150">Block A - Room 10</td>
                            <td className="p-2 border-r border-slate-150">M.Sc Mathematics; B.Ed</td>
                            <td className="p-2">Algebra</td>
                          </tr>
                          <tr className="border-b border-slate-150/60 font-mono text-gray-500">
                            <td className="p-2 border-r border-slate-150">Priya</td>
                            <td className="p-2 border-r border-slate-150">Verma</td>
                            <td className="p-2 border-r border-slate-150 font-mono text-[10px]">priya.verma@school.com</td>
                            <td className="p-2 border-r border-slate-150">22-07-1888</td>
                            <td className="p-2 border-r border-slate-150">Science</td>
                            <td className="p-2 border-r border-slate-150">Block B - Lab 2</td>
                            <td className="p-2 border-r border-slate-150">M.Sc Physics; B.Ed</td>
                            <td className="p-2">Physics</td>
                          </tr>
                          <tr className="font-mono text-gray-500">
                            <td className="p-2 border-r border-slate-150">Rahul</td>
                            <td className="p-2 border-r border-slate-150">Singh</td>
                            <td className="p-2 border-r border-slate-150 font-mono text-[10px]">rahul.singh@school.com</td>
                            <td className="p-2 border-r border-slate-150">09/11/1982</td>
                            <td className="p-2 border-r border-slate-150">English</td>
                            <td className="p-2 border-r border-slate-150">Block C - Room 20</td>
                            <td className="p-2 border-r border-slate-150">M.A English; B.Ed</td>
                            <td className="p-2">English Literature</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="text-[10px] text-gray-405 font-medium leading-normal">
                      ℹ️ Please upload a CSV file matching this exact header structure. Headers are case-insensitive.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1.5">Roster File (CSV) *</label>
                    <div 
                      onClick={() => document.getElementById('csv-file-picker').click()} 
                      className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-all bg-gray-50/50"
                    >
                      <span className="text-2xl mb-2 block">📄</span>
                      <span className="text-xs font-semibold text-gray-500 block">Click to select CSV File</span>
                      <span className="text-[10px] text-gray-400 mt-1 block">Roster columns: First Name, Last Name, Email, Date of Birth, Department, Office Location, Qualifications, Specialization</span>
                    </div>
                    <input 
                      type="file" 
                      id="csv-file-picker" 
                      accept=".csv" 
                      onChange={handleCsvUpload} 
                      className="hidden" 
                      aria-label="Upload CSV File"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-left font-sans">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                    <span className="text-2xl mb-1 block">✅</span>
                    <h4 className="font-bold text-green-800 text-sm">Import Completed</h4>
                    <p className="text-xs text-green-600 mt-1">Successfully registered {importResult.successCount} new teachers!</p>
                  </div>

                  {importResult.duplicates.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-primary text-xs uppercase mb-2">⚠️ Skipped Records (Duplicates: {importResult.duplicates.length})</h4>
                      <p className="text-[11px] text-gray-400 mb-2">The following email addresses already exist in the database:</p>
                      <div className="border border-amber-100 rounded-xl overflow-hidden text-xs max-h-40 overflow-y-auto">
                        <table className="w-full text-left bg-amber-50/20">
                          <thead>
                            <tr className="bg-amber-50 text-amber-800 border-b border-amber-100">
                              <th className="p-2 font-bold text-[10px]">Teacher</th>
                              <th className="p-2 font-bold text-[10px]">Email</th>
                              <th className="p-2 font-bold text-[10px]">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.duplicates.map((dup, idx) => (
                              <tr key={idx} className="border-b border-amber-50/60 last:border-0">
                                <td className="p-2 font-medium text-gray-700">{dup.firstName} {dup.lastName}</td>
                                <td className="p-2 text-gray-600 font-mono text-[10px]">{dup.email}</td>
                                <td className="p-2 text-gray-500 font-mono text-[10px]">{dup.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-3 bg-gray-50/50 border-t border-gray-100">
              <button 
                type="button"
                onClick={() => { setShowImportModal(false); setImportResult(null); setImportError(''); }} 
                className="btn-outline text-xs"
              >
                {importResult ? 'Done' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
