import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

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
        className={className || "input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl"}
        style={style || { width: '130px' }}
      />
    </div>
  );
};

const sc = {
  ACTIVE: 'badge-success',
  PROMOTED: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200',
  ADMIN_PROMOTED: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200',
  COMPARTMENT_PENDING: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200',
  RETAINED_REPEAT: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200',
  WITHDRAWN: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200',
  SUSPENDED: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200'
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dropdown filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewStudentData, setViewStudentData] = useState(null);

  // Promotion Modal state
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promotingStudent, setPromotingStudent] = useState(null);
  const [promoteNextClassId, setPromoteNextClassId] = useState('');
  const [promoteAcademicYear, setPromoteAcademicYear] = useState('2026-27');
  const [promoteAdminOverride, setPromoteAdminOverride] = useState(false);
  const [promoteOverrideReason, setPromoteOverrideReason] = useState('');
  const [studentOutcome, setStudentOutcome] = useState(null);
  const [loadingOutcome, setLoadingOutcome] = useState(false);
  const [promoteError, setPromoteError] = useState('');
  const [promoting, setPromoting] = useState(false);

  // Retention (Fail/Repeat) Modal state
  const [showRetainModal, setShowRetainModal] = useState(false);
  const [retainingStudent, setRetainingStudent] = useState(null);
  const [retainClassId, setRetainClassId] = useState('');
  const [retainNewAcademicYear, setRetainNewAcademicYear] = useState('2026-27');
  const [retainReason, setRetainReason] = useState('');
  const [retainSendWhatsApp, setRetainSendWhatsApp] = useState(true);
  const [retaining, setRetaining] = useState(false);
  const [retainError, setRetainError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [classSections, setClassSections] = useState([]);
  const [capacityWarning, setCapacityWarning] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Transfer Certificate (TC) & No-Dues Clearance State
  const [showTcModal, setShowTcModal] = useState(false);
  const [tcStudent, setTcStudent] = useState(null);
  const [clearanceData, setClearanceData] = useState(null);
  const [loadingClearance, setLoadingClearance] = useState(false);
  const [issuingTc, setIssuingTc] = useState(false);
  const [tcError, setTcError] = useState('');
  const [tcSuccessResult, setTcSuccessResult] = useState(null);
  const [tcForm, setTcForm] = useState({
    reason: 'Parent Request / Relocation to another city',
    conductRemark: 'Exemplary Conduct & Good Academic Record',
    adminOverride: false,
    adminOverrideNote: ''
  });

  // Student Password Reset Modal State
  const [showResetPassModal, setShowResetPassModal] = useState(false);
  const [resetStudentObj, setResetStudentObj] = useState(null);
  const [newStudentPassword, setNewStudentPassword] = useState('Student123!');
  const [resetPassLoading, setResetPassLoading] = useState(false);
  const [resetPassSuccess, setResetPassSuccess] = useState('');
  const [resetPassError, setResetPassError] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

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
    dateOfBirth: '',
    status: 'ACTIVE',
    previousSchoolName: '',
    previousTcNumber: '',
    previousTcDate: '',
    previousTcDocumentUrl: ''
  });

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importClassId, setImportClassId] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');

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
      dateOfBirth: '',
      status: 'ACTIVE',
      previousSchoolName: '',
      previousTcNumber: '',
      previousTcDate: '',
      previousTcDocumentUrl: ''
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
        dateOfBirth: student.dateOfBirth || '',
        status: student.status || 'ACTIVE',
        previousSchoolName: student.previousSchoolName || '',
        previousTcNumber: student.previousTcNumber || '',
        previousTcDate: student.previousTcDate || '',
        previousTcDocumentUrl: student.previousTcDocumentUrl || ''
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

  const handlePromoteClick = async (student) => {
    setPromotingStudent(student);
    setPromoteError('');
    setPromoteAdminOverride(false);
    setPromoteOverrideReason('');
    setStudentOutcome(null);
    setLoadingOutcome(true);
    setShowPromoteModal(true);

    const currentGradeStr = (student.class || '').replace('Class ', '').trim();
    const currentGradeNum = parseInt(currentGradeStr, 10);
    if (!isNaN(currentGradeNum)) {
      const nextGradeNum = currentGradeNum + 1;
      const targetSection = student.section || 'Section A';
      
      const match = classSections.find(
        c => String(c.grade) === String(nextGradeNum) && c.section === targetSection
      );
      
      if (match) {
        setPromoteNextClassId(match.id);
      } else {
        const fallback = classSections.find(c => String(c.grade) === String(nextGradeNum));
        setPromoteNextClassId(fallback ? fallback.id : '');
      }
    } else {
      setPromoteNextClassId('');
    }

    try {
      const res = await apiClient.get(`/academics/students/${student.id}/academic-outcome`);
      setStudentOutcome(res.data);
      if (res.data.failedSubjectsCount > 0) {
        setPromoteAdminOverride(true);
      }
    } catch (err) {
      console.error('Error fetching academic outcome:', err);
    } finally {
      setLoadingOutcome(false);
    }
  };

  const handleOpenTcModal = async (student) => {
    setTcStudent(student);
    setClearanceData(null);
    setTcSuccessResult(null);
    setTcError('');
    setTcForm({
      reason: 'Parent Request / Relocation to another city',
      conductRemark: 'Exemplary Conduct & Good Academic Record',
      adminOverride: false,
      adminOverrideNote: ''
    });
    setShowTcModal(true);
    setLoadingClearance(true);
    try {
      const res = await apiClient.get(`/academics/students/${student.id}/clearance-check`);
      setClearanceData(res.data);
    } catch (err) {
      setTcError(err.response?.data?.error || 'Failed to check student clearance.');
    } finally {
      setLoadingClearance(false);
    }
  };

  const handleGenerateTc = async () => {
    if (!tcStudent) return;
    setIssuingTc(true);
    setTcError('');
    try {
      const res = await apiClient.post(`/academics/students/${tcStudent.id}/generate-tc`, {
        reason: tcForm.reason,
        conductRemark: tcForm.conductRemark,
        adminOverride: tcForm.adminOverride,
        adminOverrideNote: tcForm.adminOverrideNote
      });
      setTcSuccessResult(res.data);
      fetchData();
    } catch (err) {
      setTcError(err.response?.data?.error || 'Failed to generate Transfer Certificate.');
    } finally {
      setIssuingTc(false);
    }
  };

  const handlePromoteSubmit = async () => {
    if (!promoteNextClassId || !promotingStudent) return;
    setPromoting(true);
    setPromoteError('');
    try {
      await apiClient.post(`/academics/students/${promotingStudent.id}/promote`, {
        nextClassId: promoteNextClassId,
        academicYear: promoteAcademicYear,
        adminOverride: promoteAdminOverride,
        overrideReason: promoteOverrideReason
      });
      setShowPromoteModal(false);
      fetchData();
    } catch (err) {
      setPromoteError(err.response?.data?.error || 'Failed to promote student.');
    } finally {
      setPromoting(false);
    }
  };

  const handleRetainClick = async (student) => {
    setRetainingStudent(student);
    setRetainError('');
    setStudentOutcome(null);
    setLoadingOutcome(true);
    setRetainClassId(student.classId || '');
    setRetainReason('Failed core subjects evaluation - Retained in current grade for academic reinforcement.');
    setRetainSendWhatsApp(true);
    setShowRetainModal(true);

    try {
      const res = await apiClient.get(`/academics/students/${student.id}/academic-outcome`);
      setStudentOutcome(res.data);
      if (res.data.classId) {
        setRetainClassId(res.data.classId);
      }
    } catch (err) {
      console.error('Error fetching outcome for retention:', err);
    } finally {
      setLoadingOutcome(false);
    }
  };

  const handleRetainSubmit = async () => {
    if (!retainingStudent) return;
    setRetaining(true);
    setRetainError('');
    try {
      await apiClient.post(`/academics/students/${retainingStudent.id}/retain`, {
        currentClassId: retainClassId || null,
        newAcademicYear: retainNewAcademicYear,
        retentionReason: retainReason,
        sendParentWhatsAppAlert: retainSendWhatsApp
      });
      setShowRetainModal(false);
      fetchData();
    } catch (err) {
      setRetainError(err.response?.data?.error || 'Failed to retain student in current grade.');
    } finally {
      setRetaining(false);
    }
  };

  const handleOpenResetPass = (student) => {
    setResetStudentObj(student);
    setNewStudentPassword('Student123!');
    setResetPassSuccess('');
    setResetPassError('');
    setShowPasswordText(false);
    setShowResetPassModal(true);
  };

  const handleExecuteResetPass = async (e) => {
    e.preventDefault();
    if (!resetStudentObj) return;
    setResetPassLoading(true);
    setResetPassError('');
    setResetPassSuccess('');
    try {
      const res = await apiClient.post('/support/reset-student-password', {
        studentId: resetStudentObj.id,
        newPassword: newStudentPassword
      });
      if (res.data.success) {
        setResetPassSuccess(res.data.message || 'Password successfully updated.');
      } else {
        setResetPassError(res.data.error || 'Failed to update password.');
      }
    } catch (err) {
      setResetPassError(err.response?.data?.error || 'Failed to update student password.');
    } finally {
      setResetPassLoading(false);
    }
  };


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
    const headers = ['FirstName', 'LastName', 'DateOfBirth', 'ClassId', 'BloodGroup', 'GuardianName', 'GuardianPhone', 'GuardianRelationship', 'Address'];
    const sampleRows = [
      ['Aarav', 'Sharma', '15-03-2010', '101', 'A+', 'Rajesh Sharma', '919876543210', 'Father', 'Jaipur'],
      ['Ananya', 'Verma', '22-07-2011', '101', 'B+', 'Sunita Verma', '919812345678', 'Mother', 'Alwar'],
      ['Vivaan', 'Singh', '05/11/2010', '102', 'O+', 'Mahesh Singh', '91990012233', 'Father', 'Bhilwara']
    ];
    
    let csvContent = headers.join(',') + '\n';
    sampleRows.forEach(row => {
      csvContent += row.map(val => `"${val}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_import_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!importClassId) {
      setImportError('Please select a target enrollment class first.');
      return;
    }
    
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
          const nameVal = row['name'] || row['student name'] || row['studentname'] || '';
          let first = row['first name'] || row['firstname'] || row['first_name'] || '';
          let last = row['last name'] || row['lastname'] || row['last_name'] || '';
          if (!first && nameVal) {
            const parts = nameVal.trim().split(/\s+/);
            first = parts[0] || '';
            last = parts.slice(1).join(' ') || '';
          }
          const dob = row['date of birth'] || row['dob'] || row['birth date'] || row['birthdate'] || row['dateofbirth'] || '';
          const blood = row['blood group'] || row['bloodgroup'] || row['blood'] || '';
          const gName = row['guardian name'] || row['guardianname'] || row['father name'] || row['fathername'] || row["father's name"] || row['father'] || '';
          const gPhone = row['guardian phone'] || row['guardianphone'] || row['phone'] || row['contact'] || row['phone number'] || row['phonenumber'] || '';
          const gRel = row['guardian relationship'] || row['guardianrelationship'] || row['relationship'] || row['relation'] || '';
          const address = row['address'] || row['location'] || row['residence'] || '';

          if (hasFormulaOrScript(first)) {
            setImportError(`Row ${i + 1}: First Name contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(last)) {
            setImportError(`Row ${i + 1}: Last Name contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(blood)) {
            setImportError(`Row ${i + 1}: Blood Group contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(gName)) {
            setImportError(`Row ${i + 1}: Guardian Name contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(gPhone, true)) {
            setImportError(`Row ${i + 1}: Guardian Phone contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(gRel)) {
            setImportError(`Row ${i + 1}: Guardian Relationship contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(address)) {
            setImportError(`Row ${i + 1}: Address contains invalid or unsafe characters.`);
            return;
          }
          if (hasFormulaOrScript(dob)) {
            setImportError(`Row ${i + 1}: Date of Birth contains invalid or unsafe characters.`);
            return;
          }
        }

        const mappedStudents = parsed.map(row => {
          const nameVal = row['name'] || row['student name'] || row['studentname'] || '';
          let first = row['first name'] || row['firstname'] || row['first_name'] || '';
          let last = row['last name'] || row['lastname'] || row['last_name'] || '';
          if (!first && nameVal) {
            const parts = nameVal.trim().split(/\s+/);
            first = parts[0] || '';
            last = parts.slice(1).join(' ') || '';
          }
          return {
            firstName: first || 'Unknown',
            lastName: last || 'Student',
            dateOfBirth: row['date of birth'] || row['dob'] || row['birth date'] || row['birthdate'] || row['dateofbirth'] || '01-01-2015',
            classId: importClassId,
            bloodGroup: row['blood group'] || row['bloodgroup'] || row['blood'] || '',
            guardianName: row['guardian name'] || row['guardianname'] || row['father name'] || row['fathername'] || row["father's name"] || row['father'] || 'Guardian',
            guardianPhone: row['guardian phone'] || row['guardianphone'] || row['phone'] || row['contact'] || row['phone number'] || row['phonenumber'] || '',
            guardianRelationship: row['guardian relationship'] || row['guardianrelationship'] || row['relationship'] || row['relation'] || 'Father',
            address: row['address'] || row['location'] || row['residence'] || ''
          };
        });

        const res = await apiClient.post('/academics/students/import', { students: mappedStudents });
        setImportResult(res.data);
        fetchData();
      } catch (err) {
        console.error('Error importing CSV:', err);
        setImportError(err.response?.data?.error || 'Failed to import student CSV roster.');
      }
    };
    reader.readAsText(file);
  };

  // Helper to normalize class names for comparison (e.g. "Class 1" or "1" => "1")
  const normalizeClass = (cls) => {
    if (!cls) return '';
    return cls.toString().toLowerCase().replace(/\s+/g, '').replace(/^(class|grade)/, '');
  };

  const normalizeSection = (sec) => {
    if (!sec) return '';
    return sec.toString().toLowerCase().replace(/\s+/g, '').replace(/^section/, '');
  };

  // Filter students based on all 4 filter criteria (Name, Class, Section, Status)
  const uniqueSections = [...new Set(classSections.map(c => c.section))].filter(Boolean).sort();
  const uniqueGrades = [...new Set(classSections.map(c => c.grade))].filter(Boolean).sort((a, b) => {
    const na = parseInt(a, 10);
    const nb = parseInt(b, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.localeCompare(b);
  });

  const filtered = students.filter(s => {
    const nameStr = s.name || '';
    const matchesName = !search || nameStr.toLowerCase().includes(search.toLowerCase());
    const matchesClass = !selectedClass || normalizeClass(s.class) === normalizeClass(selectedClass);
    const matchesSection = !selectedSection || normalizeSection(s.section) === normalizeSection(selectedSection);
    const statusStr = s.status || '';
    const matchesStatus = !selectedStatus || statusStr.toUpperCase() === selectedStatus.toUpperCase();
    
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
    
    return matchesName && matchesClass && matchesSection && matchesStatus;
  });

  return (
    <div>
      <Topbar title="Student Directory" subtitle="Admin Portal" actions={
        <div className="flex gap-2">
          <button onClick={() => { setImportError(''); setImportResult(null); setImportClassId(''); setShowImportModal(true); }} className="btn-outline text-xs">↑ Bulk Import</button>
          <button onClick={() => { setError(''); resetForm(); setShowModal(true); }} className="btn-primary text-xs">+ Add New Student</button>
        </div>
      } />
      <div className="card">
        <p className="text-xs text-gray-400 mb-4">Manage and organize all student records across all classes.</p>
        <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <input placeholder="Search students by name..." value={search} onChange={e => setSearch(e.target.value)} className="input pl-9 text-sm" />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl" style={{ width: '130px' }} />
            <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl" style={{ width: '130px' }} />
            {(dateFrom || dateTo || search || selectedClass || selectedSection || selectedStatus) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setSelectedClass(''); setSelectedSection(''); setSelectedStatus(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 shrink-0 w-full xl:w-auto">
            {/* Class Filter Dropdown */}
            <select className="input w-full text-xs sm:text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">Class All</option>
              {uniqueGrades.map(grade => (
                <option key={grade} value={grade}>Class {grade}</option>
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
                  <th className="table-th">Date of Birth</th>
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
                        <div className="min-w-0 max-w-[200px]">
                          <div className="font-semibold text-primary text-sm truncate" title={s.name}>{s.name}</div>
                          <div className="text-xs text-gray-400 truncate" title={s.email}>{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-xs font-mono text-gray-500">{s.studentId}</td>
                    <td className="table-td text-sm">{s.class}</td>
                    <td className="table-td text-sm">{s.section}</td>
                    <td className="table-td text-sm">{s.father}</td>
                    <td className="table-td text-sm text-gray-500">{s.dateOfBirth || 'N/A'}</td>
                    <td className="table-td"><span className={sc[s.status] || 'badge-success'}>{s.status}</span></td>
                    <td className="table-td">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Promote Button */}
                        <button 
                          onClick={() => handlePromoteClick(s)} 
                          className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-lg transition-all duration-200 shadow-xs hover:shadow hover:scale-105 text-xs font-bold" 
                          title="Promote Student (Normal / Admin Direct Override)"
                        >
                          🚀 Promote
                        </button>

                        {/* Retain (Fail / Repeat Year) Button */}
                        <button 
                          onClick={() => handleRetainClick(s)} 
                          className="p-1.5 text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 rounded-lg transition-all duration-200 shadow-xs hover:shadow hover:scale-105 text-xs font-bold" 
                          title="Retain Student (Fail / Repeat Year Detention)"
                        >
                          🔄 Retain
                        </button>

                        {/* View Profile */}
                        <button onClick={() => handleView(s.id)} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-xs hover:shadow hover:scale-105" title="View Profile">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* Edit Profile */}
                        <button onClick={() => handleEdit(s.id)} className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-xs hover:shadow hover:scale-105" title="Edit Profile">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Reset Password */}
                        <button 
                          onClick={() => handleOpenResetPass(s)} 
                          className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-lg transition-all duration-200 shadow-xs hover:shadow hover:scale-105 text-xs font-bold" 
                          title="Reset Student Password (Instant Admin/Teacher Reset)"
                        >
                          🔑 Reset
                        </button>

                        {/* Transfer Certificate (TC) */}
                        <button 
                          onClick={() => handleOpenTcModal(s)} 
                          className={`p-1.5 rounded-lg transition-all duration-200 shadow-xs hover:shadow hover:scale-105 ${
                            s.status === 'WITHDRAWN' 
                              ? 'text-purple-600 bg-purple-50 hover:bg-purple-100' 
                              : 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                          }`} 
                          title={s.status === 'WITHDRAWN' ? 'View Issued Transfer Certificate (TC)' : 'Issue Transfer Certificate & No-Dues Clearance'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {/* Delete Profile */}
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all duration-200 shadow-xs hover:shadow hover:scale-105" title="Delete Profile">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
                <div className="col-span-2 sm:col-span-1 min-w-0">
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Email Address</div>
                  <div className="text-primary font-medium break-all" title={viewStudentData.email}>{viewStudentData.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Date of Birth</div>
                  <div className="text-primary font-medium">{viewStudentData.dateOfBirth || 'Not Specified'}</div>
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

              {/* Inward TC Details (if student transferred from another school) */}
              {(viewStudentData.previousSchoolName || viewStudentData.previousTcNumber) && (
                <div>
                  <hr className="border-gray-100 my-4" />
                  <h4 className="font-semibold text-primary text-xs uppercase mb-3 tracking-wide flex items-center gap-1.5">
                    <span>🏫 Previous School & Inward TC Record</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-xs">
                    <div>
                      <div className="text-gray-400 font-semibold mb-0.5">Previous School</div>
                      <div className="font-semibold text-primary">{viewStudentData.previousSchoolName || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 font-semibold mb-0.5">Previous TC No.</div>
                      <div className="font-mono font-bold text-blue-700">{viewStudentData.previousTcNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 font-semibold mb-0.5">TC Issue Date</div>
                      <div className="font-medium text-gray-700">{viewStudentData.previousTcDate || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 font-semibold mb-0.5">Attached Document</div>
                      {viewStudentData.previousTcDocumentUrl ? (
                        <a href={viewStudentData.previousTcDocumentUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">
                          View Attached TC 📄
                        </a>
                      ) : (
                        <span className="text-gray-400">None attached</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Outward TC Record (if TC was issued by this school) */}
              {viewStudentData.outwardTcNumber && (
                <div>
                  <hr className="border-gray-100 my-4" />
                  <h4 className="font-semibold text-rose-700 text-xs uppercase mb-3 tracking-wide flex items-center gap-1.5">
                    <span>📜 Outward Transfer Certificate Issued</span>
                  </h4>
                  <div className="bg-rose-50/60 p-3.5 rounded-xl border border-rose-200 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-semibold">Certificate Number:</span>
                      <span className="font-mono font-bold text-rose-700 text-sm">{viewStudentData.outwardTcNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-semibold">Issued Date:</span>
                      <span className="font-medium text-gray-800">{viewStudentData.outwardTcIssuedDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-semibold">Leaving Reason:</span>
                      <span className="font-medium text-gray-800">{viewStudentData.tcReason || 'Parent Request'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-semibold">Conduct Remark:</span>
                      <span className="font-medium text-gray-800">{viewStudentData.tcConductRemark || 'Good'}</span>
                    </div>
                    <div className="pt-2 border-t border-rose-200/60 text-[11px] text-rose-600 font-medium">
                      🔒 Student user account deactivated upon TC generation.
                    </div>
                  </div>
                </div>
              )}
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
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5" htmlFor="form-dob-input">Date of Birth *</label>
                    <input id="form-dob-input" required type="text" value={form.dateOfBirth} onChange={e => setForm(f => ({ ...f, dateOfBirth: e.target.value }))} placeholder="dd-MM-yyyy" className="input" />
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
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number (10 Digits)</label>
                    <input 
                      type="tel"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={form.guardianPhone} 
                      onChange={e => setForm(f => ({ ...f, guardianPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} 
                      placeholder="e.g. 9876543210" 
                      className="input font-mono" 
                    />
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

              {/* Inward TC Details (Optional: If student is joining from another school) */}
              <div className="pt-2 border-t border-gray-100">
                <h4 className="font-semibold text-primary text-sm flex items-center gap-2 mb-1">
                  <span>🏫 Previous School & Inward TC (Optional)</span>
                </h4>
                <p className="text-xs text-gray-400 mb-3">Fill this if the student has transferred from another institution with a Transfer Certificate.</p>
                <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Previous School Name</label>
                    <input value={form.previousSchoolName} onChange={e => setForm(f => ({ ...f, previousSchoolName: e.target.value }))} placeholder="e.g. St. Xavier High School" className="input bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Previous TC Number</label>
                    <input value={form.previousTcNumber} onChange={e => setForm(f => ({ ...f, previousTcNumber: e.target.value }))} placeholder="e.g. TC-2025-9812" className="input bg-white font-mono" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">TC Issue Date</label>
                    <input value={form.previousTcDate} onChange={e => setForm(f => ({ ...f, previousTcDate: e.target.value }))} placeholder="dd-MM-yyyy" className="input bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">TC Document URL / Link</label>
                    <input value={form.previousTcDocumentUrl} onChange={e => setForm(f => ({ ...f, previousTcDocumentUrl: e.target.value }))} placeholder="https://drive... or file link" className="input bg-white" />
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

      {/* Promote Student Modal */}
      {showPromoteModal && promotingStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Promote Student</h3>
                <p className="text-blue-200 text-xs">Advance student to the next academic grade level</p>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-4">
              {promoteError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{promoteError}</div>}
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase mb-1">Student Details</div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="font-semibold text-primary">{promotingStudent.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {promotingStudent.studentId}</div>
                  <div className="text-xs text-gray-500 mt-1">Current Class: <span className="font-semibold text-primary">{promotingStudent.class} - {promotingStudent.section}</span></div>
                  <div className="text-xs mt-2 flex items-center gap-1.5">
                    <span>Exam Status:</span>
                    {promotingStudent.finalResult === "Pass" ? (
                      <span className="badge badge-success text-[10px] py-0.5 px-2 font-bold">✅ Pass (GPA: {promotingStudent.gpa})</span>
                    ) : promotingStudent.finalResult === "Fail" ? (
                      <span className="badge badge-danger text-[10px] py-0.5 px-2 font-bold">⚠️ Fail (GPA: {promotingStudent.gpa})</span>
                    ) : (
                      <span className="badge badge-gray text-[10px] py-0.5 px-2 font-bold">No Exam Records</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Promotion Class *</label>
                <select
                  value={promoteNextClassId}
                  onChange={e => setPromoteNextClassId(e.target.value)}
                  className="input w-full text-xs"
                  required
                >
                  <option value="">Select Target Class</option>
                  {classSections.map(c => (
                    <option key={c.id} value={c.id}>
                      Class {c.grade} - {c.section} {c.teacher ? `(Teacher: ${c.teacher})` : '(No Teacher)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button onClick={() => setShowPromoteModal(false)} className="btn-outline text-xs">Cancel</button>
              <button
                onClick={handlePromoteSubmit}
                disabled={promoting || !promoteNextClassId}
                className="btn-primary text-xs"
              >
                {promoting ? 'Promoting...' : 'Promote Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden font-sans">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Bulk Student Import</h3>
                <p className="text-blue-200 text-xs">Import a list of students from a CSV file.</p>
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
                  <div>
                    <label className="block text-xs font-semibold text-gray-650 mb-1.5" htmlFor="import-class-select">Target Enrollment Class *</label>
                    <select 
                      id="import-class-select" 
                      value={importClassId} 
                      onChange={e => setImportClassId(e.target.value)} 
                      className="input"
                    >
                      <option value="">Select Target Class</option>
                      {classSections.map(c => (
                        <option key={c.id} value={c.id}>Class {c.grade} - {c.section}</option>
                      ))}
                    </select>
                  </div>

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
                            <th className="p-2 border-r border-slate-150">FirstName</th>
                            <th className="p-2 border-r border-slate-150">LastName</th>
                            <th className="p-2 border-r border-slate-150">DateOfBirth</th>
                            <th className="p-2 border-r border-slate-150">ClassId</th>
                            <th className="p-2 border-r border-slate-150">BloodGroup</th>
                            <th className="p-2 border-r border-slate-150">GuardianName</th>
                            <th className="p-2 border-r border-slate-150">GuardianPhone</th>
                            <th className="p-2 border-r border-slate-150">GuardianRelationship</th>
                            <th className="p-2">Address</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-150/60 font-mono text-gray-500">
                            <td className="p-2 border-r border-slate-150">Aarav</td>
                            <td className="p-2 border-r border-slate-150">Sharma</td>
                            <td className="p-2 border-r border-slate-150">15-03-2010</td>
                            <td className="p-2 border-r border-slate-150">101</td>
                            <td className="p-2 border-r border-slate-150">A+</td>
                            <td className="p-2 border-r border-slate-150">Rajesh Sharma</td>
                            <td className="p-2 border-r border-slate-150">919876543210</td>
                            <td className="p-2 border-r border-slate-150">Father</td>
                            <td className="p-2">Jaipur</td>
                          </tr>
                          <tr className="border-b border-slate-150/60 font-mono text-gray-500">
                            <td className="p-2 border-r border-slate-150">Ananya</td>
                            <td className="p-2 border-r border-slate-150">Verma</td>
                            <td className="p-2 border-r border-slate-150">22-07-2011</td>
                            <td className="p-2 border-r border-slate-150">101</td>
                            <td className="p-2 border-r border-slate-150">B+</td>
                            <td className="p-2 border-r border-slate-150">Sunita Verma</td>
                            <td className="p-2 border-r border-slate-150">919812345678</td>
                            <td className="p-2 border-r border-slate-150">Mother</td>
                            <td className="p-2">Alwar</td>
                          </tr>
                          <tr className="font-mono text-gray-500">
                            <td className="p-2 border-r border-slate-150">Vivaan</td>
                            <td className="p-2 border-r border-slate-150">Singh</td>
                            <td className="p-2 border-r border-slate-150">05/11/2010</td>
                            <td className="p-2 border-r border-slate-150">102</td>
                            <td className="p-2 border-r border-slate-150">O+</td>
                            <td className="p-2 border-r border-slate-150">Mahesh Singh</td>
                            <td className="p-2 border-r border-slate-150">91990012233</td>
                            <td className="p-2 border-r border-slate-150">Father</td>
                            <td className="p-2">Bhilwara</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="text-[10px] text-gray-405 font-medium leading-normal">
                      ℹ️ Please upload a CSV file matching this exact header structure. Select target enrollment class to apply class mapping.
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
                      <span className="text-[10px] text-gray-400 mt-1 block">Roster columns: Name/First/Last Name, DOB, Guardian Name/Phone/Relation, Address</span>
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
                    <p className="text-xs text-green-600 mt-1">Successfully admitted {importResult.successCount} new students!</p>
                  </div>

                  {importResult.duplicates.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-primary text-xs uppercase mb-2">⚠️ Skipped Records (Duplicates: {importResult.duplicates.length})</h4>
                      <p className="text-[11px] text-gray-400 mb-2">The following student entries already exist with identical names and guardian phone details:</p>
                      <div className="border border-amber-100 rounded-xl overflow-hidden text-xs max-h-40 overflow-y-auto">
                        <table className="w-full text-left bg-amber-50/20">
                          <thead>
                            <tr className="bg-amber-50 text-amber-800 border-b border-amber-100">
                              <th className="p-2 font-bold text-[10px]">Student Name</th>
                              <th className="p-2 font-bold text-[10px]">Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(importResult.duplicates || []).map((dup, idx) => (
                              <tr key={idx} className="border-b border-amber-50/60 last:border-0">
                                <td className="p-2 font-medium text-gray-700">{dup.firstName} {dup.lastName}</td>
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
      {/* Transfer Certificate (TC) & No-Dues Clearance Modal */}
      {showTcModal && tcStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-800 to-primary px-6 py-5 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl">
                  📜
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">Transfer Certificate & Clearance Desk</h3>
                  <p className="text-rose-100 text-xs">Cross-department No-Dues verification for {tcStudent.name}</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowTcModal(false); setTcSuccessResult(null); }} 
                className="text-white hover:text-rose-200 text-lg w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center"
              >
                ✖
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {tcError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl p-3.5 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{tcError}</span>
                </div>
              )}

              {/* SUCCESS / PRINTABLE TC VIEW */}
              {tcSuccessResult ? (
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 text-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="font-bold text-sm">Transfer Certificate Issued Successfully!</div>
                      <div className="text-emerald-700 mt-0.5">
                        Certificate <strong>#{tcSuccessResult.tcNumber}</strong> generated on {tcSuccessResult.issuedDate}. 
                        Student user account has been deactivated immediately.
                      </div>
                    </div>
                  </div>

                  {/* Printable TC Certificate Preview */}
                  <div id="printable-tc-certificate" className="border-2 border-primary/20 bg-amber-50/20 p-6 rounded-2xl space-y-4 text-gray-800">
                    <div className="text-center border-b border-primary/20 pb-4">
                      <div className="text-xs uppercase font-bold tracking-widest text-primary/70">Official Document</div>
                      <h2 className="text-xl font-bold font-display text-primary mt-0.5">{tcSuccessResult.school?.name || 'School of Excellence'}</h2>
                      <p className="text-xs text-gray-500">{tcSuccessResult.school?.address}, {tcSuccessResult.school?.city} • Code: {tcSuccessResult.school?.code}</p>
                      <div className="inline-block mt-2 px-4 py-1 rounded-full bg-primary text-white text-xs font-bold uppercase tracking-wider">
                        Transfer Certificate (T.C.)
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-semibold border-b border-gray-100 pb-2">
                      <span>TC Serial No: <strong className="font-mono text-primary">{tcSuccessResult.tcNumber}</strong></span>
                      <span>Date of Issue: <strong className="text-gray-900">{tcSuccessResult.issuedDate}</strong></span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                      <div>
                        <span className="text-gray-400 font-semibold block">1. Name of Pupil:</span>
                        <strong className="text-primary text-sm">{tcSuccessResult.student?.name}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block">2. Student ID / Roll Code:</span>
                        <strong className="font-mono text-gray-800">{tcSuccessResult.student?.studentId}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block">3. Father's / Guardian's Name:</span>
                        <strong className="text-gray-800">{tcSuccessResult.student?.fatherName || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block">4. Date of Birth:</span>
                        <strong className="text-gray-800">{tcSuccessResult.student?.dob || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block">5. Class Last Studied:</span>
                        <strong className="text-primary">{tcSuccessResult.student?.className}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 font-semibold block">6. Reason for Leaving:</span>
                        <strong className="text-gray-800">{tcSuccessResult.student?.reason}</strong>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400 font-semibold block">7. General Conduct & Remarks:</span>
                        <strong className="text-gray-800">{tcSuccessResult.student?.conduct}</strong>
                      </div>
                    </div>

                    <div className="pt-8 flex justify-between items-end border-t border-gray-200/80 text-xs">
                      <div className="text-center">
                        <div className="w-24 border-b border-gray-400 mb-1 mx-auto"></div>
                        <span className="text-gray-400 font-medium">Class Teacher</span>
                      </div>
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400 mx-auto mb-1">
                          School Seal
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="w-28 border-b border-gray-400 mb-1 mx-auto"></div>
                        <span className="text-gray-800 font-bold">Principal Signature</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => window.print()} 
                      className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                    >
                      <span>🖨️ Print Transfer Certificate</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setShowTcModal(false); setTcSuccessResult(null); }} 
                      className="btn-outline text-xs px-4 py-2"
                    >
                      Close Desk
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Student Snapshot Info */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                        {tcStudent.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-primary text-sm">{tcStudent.name}</div>
                        <div className="text-xs text-gray-500 font-mono">ID: {tcStudent.studentId} • Class: {tcStudent.class} ({tcStudent.section})</div>
                      </div>
                    </div>
                    <span className={`badge ${sc[tcStudent.status] || 'badge-success'} text-xs font-bold`}>
                      {tcStudent.status}
                    </span>
                  </div>

                  {loadingClearance ? (
                    <div className="py-10 text-center text-gray-400 text-sm">
                      <div className="inline-block animate-spin text-xl mb-2">⏳</div>
                      <div>Running real-time cross-department clearance check...</div>
                    </div>
                  ) : clearanceData ? (
                    <div className="space-y-4">
                      {/* Department Clearance Cards */}
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Multi-Department Clearance Verification</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 1. Library Clearance Card */}
                        <div className={`p-4 rounded-xl border transition-all ${
                          clearanceData.clearance.library.isClear 
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                            : 'bg-rose-50/50 border-rose-200 text-rose-950'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <span>📚 Library Department</span>
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              clearanceData.clearance.library.isClear 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-rose-600 text-white'
                            }`}>
                              {clearanceData.clearance.library.isClear ? 'CLEARED' : 'DUES PENDING'}
                            </span>
                          </div>

                          {clearanceData.clearance.library.isClear ? (
                            <div className="text-xs text-emerald-700">
                              ✓ 0 books issued, ₹0 overdue fines pending.
                            </div>
                          ) : (
                            <div className="text-xs space-y-1 text-rose-800">
                              {clearanceData.clearance.library.unreturnedBookCount > 0 && (
                                <div>• <strong>{clearanceData.clearance.library.unreturnedBookCount} book(s)</strong> not returned yet.</div>
                              )}
                              {clearanceData.clearance.library.unpaidFineAmount > 0 && (
                                <div>• <strong>₹{clearanceData.clearance.library.unpaidFineAmount}</strong> library fine pending.</div>
                              )}
                              <div className="text-[11px] text-rose-600 mt-1">Please return all books to the library before generating TC.</div>
                            </div>
                          )}
                        </div>

                        {/* 2. Fees & Accounts Clearance Card */}
                        <div className={`p-4 rounded-xl border transition-all ${
                          clearanceData.clearance.fees.isClear 
                            ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950' 
                            : 'bg-rose-50/50 border-rose-200 text-rose-950'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <span>💰 Accounts & Fees</span>
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              clearanceData.clearance.fees.isClear 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-rose-600 text-white'
                            }`}>
                              {clearanceData.clearance.fees.isClear ? 'CLEARED' : 'DUES PENDING'}
                            </span>
                          </div>

                          {clearanceData.clearance.fees.isClear ? (
                            <div className="text-xs text-emerald-700">
                              ✓ All fee invoices fully paid up to date.
                            </div>
                          ) : (
                            <div className="text-xs space-y-1 text-rose-800">
                              <div>• <strong>₹{clearanceData.clearance.fees.pendingFeeAmount?.toLocaleString()}</strong> pending fees across {clearanceData.clearance.fees.unpaidInvoiceCount} invoice(s).</div>
                              <div className="text-[11px] text-rose-600 mt-1">Please clear all fee dues at the Accounts / Reception counter.</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* TC Generation Form */}
                      <div className="pt-2 border-t border-gray-100 space-y-3">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wide">TC Certificate Details</h4>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Reason for Leaving *</label>
                            <input 
                              value={tcForm.reason} 
                              onChange={e => setTcForm(f => ({ ...f, reason: e.target.value }))}
                              placeholder="e.g. Parent Request / Relocation" 
                              className="input text-xs" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Conduct & Character *</label>
                            <input 
                              value={tcForm.conductRemark} 
                              onChange={e => setTcForm(f => ({ ...f, conductRemark: e.target.value }))}
                              placeholder="e.g. Good / Exemplary" 
                              className="input text-xs" 
                            />
                          </div>
                        </div>

                        {!clearanceData.clearance.isAllClear && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={tcForm.adminOverride} 
                                onChange={e => setTcForm(f => ({ ...f, adminOverride: e.target.checked }))}
                                className="rounded text-rose-600 focus:ring-rose-500" 
                              />
                              <span className="text-xs font-bold text-amber-900">Authorize Special Admin Override (Bypass pending dues)</span>
                            </label>
                            {tcForm.adminOverride && (
                              <input 
                                value={tcForm.adminOverrideNote} 
                                onChange={e => setTcForm(f => ({ ...f, adminOverrideNote: e.target.value }))}
                                placeholder="State reason for exemption / admin authorization..." 
                                className="input bg-white text-xs"
                              />
                            )}
                          </div>
                        )}

                        <div className="p-3 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                          <span>🔒</span>
                          <span>
                            <strong>Immediate Login Deactivation:</strong> Once issued, the student's portal login will be disabled immediately. 
                            All historical marks, invoices, and records remain preserved for school audits.
                          </span>
                        </div>
                      </div>

                      {/* Modal Actions */}
                      <div className="flex justify-end gap-3 pt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowTcModal(false)} 
                          className="btn-outline text-xs px-4 py-2"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button" 
                          onClick={handleGenerateTc}
                          disabled={issuingTc || (!clearanceData.clearance.isAllClear && !tcForm.adminOverride)}
                          className={`btn-primary text-xs px-4 py-2 flex items-center gap-1.5 ${
                            !clearanceData.clearance.isAllClear && !tcForm.adminOverride 
                              ? 'opacity-50 cursor-not-allowed' 
                              : 'bg-rose-700 hover:bg-rose-800'
                          }`}
                        >
                          <span>{issuingTc ? 'Generating TC...' : '📜 Issue Transfer Certificate & Deactivate'}</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Promote Student Modal (with Direct Admin Override) */}
      {showPromoteModal && promotingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scale-up">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🚀</span>
                <div>
                  <h3 className="font-display font-bold text-base">Promote Student to Next Grade</h3>
                  <p className="text-emerald-100 text-xs">{promotingStudent.name} • Current Class: {promotingStudent.class} ({promotingStudent.section})</p>
                </div>
              </div>
              <button onClick={() => setShowPromoteModal(false)} className="text-white hover:text-emerald-200 text-lg">✖</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {promoteError && (
                <div className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl p-3 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{promoteError}</span>
                </div>
              )}

              {/* Academic Outcome Evaluation Card */}
              {loadingOutcome ? (
                <div className="py-6 text-center text-gray-400">
                  <div className="inline-block animate-spin text-lg mb-1">⏳</div>
                  <div>Evaluating annual exam performance and subject scores...</div>
                </div>
              ) : studentOutcome ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">Exam Performance Evaluation:</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                      studentOutcome.failedSubjectsCount === 0 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : studentOutcome.failedSubjectsCount <= 2 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {studentOutcome.recommendedOutcome}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-lg border border-slate-100 text-center">
                    <div>
                      <div className="text-gray-400 text-[10px]">Total Subjects</div>
                      <div className="font-bold text-gray-800 text-sm">{studentOutcome.totalSubjects}</div>
                    </div>
                    <div>
                      <div className="text-emerald-600 text-[10px]">Passed (≥40%)</div>
                      <div className="font-bold text-emerald-700 text-sm">{studentOutcome.passedSubjects}</div>
                    </div>
                    <div>
                      <div className="text-rose-600 text-[10px]">Failed (&lt;40%)</div>
                      <div className="font-bold text-rose-700 text-sm">{studentOutcome.failedSubjectsCount}</div>
                    </div>
                  </div>

                  {studentOutcome.failedSubjectsCount > 0 && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1 text-[11px]">
                      <div className="font-bold flex items-center gap-1">
                        <span>⚠️</span>
                        <span>Student has failed in {studentOutcome.failedSubjectsCount} subject(s).</span>
                      </div>
                      <div>Standard auto-promotion is blocked. Direct Admin Override is required to grant promotion.</div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Target Class Selection */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Class & Section *</label>
                <select 
                  value={promoteNextClassId} 
                  onChange={e => setPromoteNextClassId(e.target.value)}
                  className="input w-full text-xs"
                >
                  <option value="">Select Target Class</option>
                  {classSections.map(c => (
                    <option key={c.id} value={c.id}>
                      Class {c.grade} - {c.section} (Room {c.room}) [{c.enrolled}/{c.capacity}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Academic Year */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Target Academic Session *</label>
                <input 
                  value={promoteAcademicYear} 
                  onChange={e => setPromoteAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="input w-full text-xs font-mono"
                />
              </div>

              {/* School Admin Direct Override Option */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={promoteAdminOverride} 
                    onChange={e => setPromoteAdminOverride(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-bold text-amber-900">
                    School Admin Direct Override (Promote despite fail marks / Grace Promotion)
                  </span>
                </label>
                
                {promoteAdminOverride && (
                  <div>
                    <label className="block font-semibold text-amber-800 mb-1">Override Audit Reason *</label>
                    <textarea 
                      rows={2}
                      value={promoteOverrideReason}
                      onChange={e => setPromoteOverrideReason(e.target.value)}
                      placeholder="e.g. Medical Leave Exemption / Principal Grace Promotion / Exceptional Extracurricular Discretion"
                      className="input bg-white w-full text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-slate-600 space-y-1 text-[11px]">
                <div>• Unpaid invoices from the current class will be consolidated into an <strong>Arrears Rollover</strong> invoice.</div>
                <div>• New class fee schedule will be attached automatically.</div>
                <div>• Automated WhatsApp promotion notice will be dispatched to guardian phone.</div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowPromoteModal(false)}
                className="btn-outline text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handlePromoteSubmit}
                disabled={promoting || !promoteNextClassId || (studentOutcome?.failedSubjectsCount > 0 && !promoteAdminOverride)}
                className="btn-primary text-xs px-4 py-2 bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1.5"
              >
                <span>{promoting ? 'Promoting...' : '🚀 Confirm Promotion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Retain Student in Same Class (Fail / Repeat Year) Modal */}
      {showRetainModal && retainingStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-scale-up">
            <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700 px-6 py-4 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔄</span>
                <div>
                  <h3 className="font-display font-bold text-base">Retain Student (Fail / Repeat Year)</h3>
                  <p className="text-amber-100 text-xs">{retainingStudent.name} • Current Class: {retainingStudent.class} ({retainingStudent.section})</p>
                </div>
              </div>
              <button onClick={() => setShowRetainModal(false)} className="text-white hover:text-amber-200 text-lg">✖</button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {retainError && (
                <div className="bg-red-50 border border-red-200 text-red-700 font-semibold rounded-xl p-3 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{retainError}</span>
                </div>
              )}

              {/* Performance Evaluation */}
              {loadingOutcome ? (
                <div className="py-6 text-center text-gray-400">
                  <div className="inline-block animate-spin text-lg mb-1">⏳</div>
                  <div>Loading academic performance evaluation...</div>
                </div>
              ) : studentOutcome ? (
                <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex justify-between items-center text-rose-900 font-bold">
                    <span>Performance Assessment:</span>
                    <span className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[10px] uppercase">
                      {studentOutcome.failedSubjectsCount} Subjects Failed
                    </span>
                  </div>
                  <div className="text-rose-800 text-[11px]">
                    Aggregate Score: <strong>{studentOutcome.aggregatePercentage}%</strong> across {studentOutcome.totalSubjects} subjects.
                  </div>
                </div>
              ) : null}

              {/* Target Section Selection */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Retention Class & Section *</label>
                <select 
                  value={retainClassId} 
                  onChange={e => setRetainClassId(e.target.value)}
                  className="input w-full text-xs"
                >
                  <option value="">Select Class Section</option>
                  {classSections.map(c => (
                    <option key={c.id} value={c.id}>
                      Class {c.grade} - {c.section} (Room {c.room}) [{c.enrolled}/{c.capacity}]
                    </option>
                  ))}
                </select>
              </div>

              {/* New Academic Year */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">New Academic Session *</label>
                <input 
                  value={retainNewAcademicYear} 
                  onChange={e => setRetainNewAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="input w-full text-xs font-mono"
                />
              </div>

              {/* Retention Reason */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Retention Reason / Official Remark *</label>
                <textarea 
                  rows={2}
                  value={retainReason} 
                  onChange={e => setRetainReason(e.target.value)}
                  placeholder="e.g. Failed in core subjects - Retained in current grade for academic reinforcement and subject mastery."
                  className="input w-full text-xs"
                />
              </div>

              {/* Send Parent WhatsApp Notice Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={retainSendWhatsApp} 
                    onChange={e => setRetainSendWhatsApp(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-bold text-gray-800">
                    Send Automated WhatsApp Academic Performance & Retention Notice to Parent
                  </span>
                </label>
              </div>

              <div className="p-3 bg-slate-100 rounded-xl text-slate-600 space-y-1 text-[11px]">
                <div>• Student enrollment status will be marked as <strong>RETAINED_REPEAT</strong>.</div>
                <div>• Current grade annual fee structure will be renewed for the new academic session.</div>
                <div>• Historical report cards and exam scores remain safely preserved for institutional audits.</div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-gray-100 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowRetainModal(false)}
                className="btn-outline text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleRetainSubmit}
                disabled={retaining || !retainClassId}
                className="btn-primary text-xs px-4 py-2 bg-rose-700 hover:bg-rose-800 flex items-center gap-1.5"
              >
                <span>{retaining ? 'Retaining...' : '🔄 Confirm Class Retention'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Password Reset Modal */}
      {showResetPassModal && resetStudentObj && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg shadow-xs">
                  🔑
                </div>
                <div>
                  <h3 className="font-display font-bold text-primary text-base">Reset Student Password</h3>
                  <p className="text-xs text-gray-500">
                    Instant institutional credential reset
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowResetPassModal(false)}
                className="w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteResetPass} className="p-6 space-y-4">
              {/* Student Summary Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="font-bold text-sm text-slate-800">{resetStudentObj.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  <span>Class: <strong>{resetStudentObj.class} - {resetStudentObj.section}</strong></span>
                  <span>ID: <strong className="font-mono">{resetStudentObj.studentId}</strong></span>
                </div>
                <div className="text-xs text-slate-400 font-mono truncate">{resetStudentObj.email}</div>
              </div>

              {resetPassSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>✓</span> {resetPassSuccess}
                  </div>
                  <div className="p-2 bg-white/80 rounded-lg border border-emerald-100 flex items-center justify-between font-mono text-xs">
                    <span>New Password: <strong>{newStudentPassword}</strong></span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(newStudentPassword)}
                      className="text-emerald-700 hover:underline text-2xs font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {resetPassError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  ⚠️ {resetPassError}
                </div>
              )}

              {!resetPassSuccess && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input 
                        type={showPasswordText ? 'text' : 'password'}
                        value={newStudentPassword}
                        onChange={e => setNewStudentPassword(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        className="input pr-10 text-xs sm:text-sm font-mono"
                        required
                        minLength={6}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {showPasswordText ? '🙈' : '👁'}
                      </button>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-2xs text-gray-400 font-semibold uppercase tracking-wider">Quick Preset:</span>
                    <button
                      type="button"
                      onClick={() => setNewStudentPassword('Student123!')}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                    >
                      Student123!
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewStudentPassword(`Pass#${Math.floor(100000 + Math.random() * 900000)}`)}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors border border-slate-200"
                    >
                      Random PIN
                    </button>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowResetPassModal(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  {resetPassSuccess ? 'Close' : 'Cancel'}
                </button>
                {!resetPassSuccess && (
                  <button
                    type="submit"
                    disabled={resetPassLoading || !newStudentPassword}
                    className="btn-primary text-xs px-4 py-2 bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                  >
                    <span>{resetPassLoading ? 'Updating...' : '🔑 Update Password'}</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;

