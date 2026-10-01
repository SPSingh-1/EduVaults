import { useState, useEffect } from 'react';
import { apiClient, expressClient } from '../../../api/apiClient';
import { UploadCloud, Download, Sparkles, CheckCircle2, FileSpreadsheet, AlertCircle, X, Trash2 } from 'lucide-react';
import { sortGrades } from '../../../utils/classUtils';
import { useToast } from '../../../contexts/ToastContext';

const InfrastructureTab = () => {
  const { toast } = useToast();
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [capacities, setCapacities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [subjects, setSubjects] = useState([]);
  
  const [newSection, setNewSection] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newExamType, setNewExamType] = useState('');
  const [newSubName, setNewSubName] = useState('');

  const [loadingSec, setLoadingSec] = useState(false);
  const [loadingRm, setLoadingRm] = useState(false);
  const [loadingGl, setLoadingGl] = useState(false);
  const [loadingCap, setLoadingCap] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingSub, setLoadingSub] = useState(false);
  const [loadingExamTypes, setLoadingExamTypes] = useState(false);

  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportStatus, setBulkImportStatus] = useState('');
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportParsed, setBulkImportParsed] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [schoolSettings, setSchoolSettings] = useState({
    latitude: 26.9124,
    longitude: 75.7873,
    address: '',
    geofenceRadiusMeters: 300,
    schoolStartTime: '08:00',
    gracePeriodMinutes: 15,
    minHalfDayHours: 4,
    schoolEndTime: '14:00'
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const fetchSchoolSettings = async () => {
    try {
      const res = await expressClient.get('/school-settings');
      if (res.data) {
        setSchoolSettings({
          latitude: res.data.latitude || 26.9124,
          longitude: res.data.longitude || 75.7873,
          address: res.data.address || '',
          geofenceRadiusMeters: res.data.geofenceRadiusMeters || 300,
          schoolStartTime: res.data.schoolStartTime || '08:00',
          gracePeriodMinutes: res.data.gracePeriodMinutes || 15,
          minHalfDayHours: res.data.minHalfDayHours || 4,
          schoolEndTime: res.data.schoolEndTime || '14:00'
        });
      }
    } catch (err) {
      console.error('Failed to load school settings:', err);
    }
  };

  const handleDetectSchoolGps = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSchoolSettings(prev => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6))
        }));
        setDetectingGps(false);
        toast.success(`Location detected! Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        setDetectingGps(false);
        toast.error('Failed to detect GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveSchoolSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingSettings(true);
    setError('');
    setSuccess('');
    try {
      await expressClient.post('/school-settings', schoolSettings);
      setSuccess('School timing & GPS geofence settings saved successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save school settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const fetchInfrastructure = async () => {
    try {
      const secRes = await apiClient.get('/academics/sections');
      setSections(secRes.data);

      const rmRes = await apiClient.get('/academics/rooms');
      setRooms(rmRes.data);

      const glRes = await apiClient.get('/academics/enrollment-classes');
      setGradeLevels(sortGrades(glRes.data || []));

      const capRes = await apiClient.get('/academics/capacities');
      setCapacities(capRes.data);

      const depRes = await apiClient.get('/academics/departments');
      setDepartments(depRes.data);

      const examTypeRes = await apiClient.get('/academics/exam-types');
      setExamTypes(examTypeRes.data);

      const subjRes = await apiClient.get('/academics/subjects');
      setSubjects(subjRes.data);
    } catch (err) {
      console.error('Error fetching infrastructure setup data:', err);
    }
  };

  useEffect(() => {
    fetchInfrastructure();
    fetchSchoolSettings();
  }, []);

  const handleAddSection = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newSection.trim()) return;
    setLoadingSec(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/sections', { name: newSection.trim() });
      setNewSection('');
      setSuccess('Section added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add section.');
    } finally {
      setLoadingSec(false);
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/sections/${id}`);
      setSuccess('Section deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete section.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newRoom.trim()) return;
    setLoadingRm(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/rooms', { name: newRoom.trim() });
      setNewRoom('');
      setSuccess('Room added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add room.');
    } finally {
      setLoadingRm(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/rooms/${id}`);
      setSuccess('Room deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete room.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGradeLevel = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newGradeLevel.trim()) return;
    setLoadingGl(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/enrollment-classes', { name: newGradeLevel.trim() });
      setNewGradeLevel('');
      setSuccess('Grade level added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add grade level.');
    } finally {
      setLoadingGl(false);
    }
  };

  const handleDeleteGradeLevel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this grade level?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/enrollment-classes/${id}`);
      setSuccess('Grade level deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete grade level.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCapacity = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const val = parseInt(newCapacity);
    if (isNaN(val) || val <= 0) return;
    setLoadingCap(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/capacities', { value: val });
      setNewCapacity('');
      setSuccess('Capacity option added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add capacity.');
    } finally {
      setLoadingCap(false);
    }
  };

  const handleDeleteCapacity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this capacity option?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/capacities/${id}`);
      setSuccess('Capacity option deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete capacity option.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDepartment.trim()) return;
    setLoadingDept(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/departments', { name: newDepartment.trim() });
      setNewDepartment('');
      setSuccess('Department added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add department.');
    } finally {
      setLoadingDept(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/departments/${id}`);
      setSuccess('Department deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete department.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newSubName.trim()) {
      setError('Subject name is required.');
      return;
    }
    setLoadingSub(true);
    setError('');
    setSuccess('');
    try {
      const name = newSubName.trim();
      const code = name.toUpperCase().replace(/\s+/g, '') || `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
      await apiClient.post('/academics/subjects', {
        name,
        code
      });
      setNewSubName('');
      setSuccess('Subject added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add subject.');
    } finally {
      setLoadingSub(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/subjects/${id}`);
      setSuccess('Subject deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete subject.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExamType = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newExamType.trim()) return;
    setLoadingExamTypes(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/exam-types', { name: newExamType.trim() });
      setNewExamType('');
      setSuccess('Examination type added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add examination type.');
    } finally {
      setLoadingExamTypes(false);
    }
  };

  const handleDeleteExamType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this examination type?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/exam-types/${id}`);
      setSuccess('Examination type deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete examination type.');
    } finally {
      setLoading(false);
    }
  };

  // --- Bulk Master Data Setup & Import Handlers ---
  const DEFAULT_MASTER_DATA = {
    sections: ['A', 'B', 'C', 'D', 'E', 'F'],
    rooms: ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5', 'Room 6', 'Room 7', 'Room 8', 'Room 9', 'Room 10'],
    grades: [
      'Play Group', 'Nursery', 'LKG', 'UKG',
      'Class 1', 'Class 2', 'Class 3', 'Class 4',
      'Class 5', 'Class 6', 'Class 7', 'Class 8',
      'Class 9', 'Class 10', 'Class 11', 'Class 12'
    ],
    capacities: [10, 20, 30, 40, 50, 60, 70, 80],
    departments: [
      'Languages', 'Science', 'Mathematics', 'Social Sciences',
      'Commerce', 'Arts & Humanities', 'Computer Science & IT',
      'Physical Education & Sports'
    ],
    subjects: [
      { name: 'Hindi', code: 'HIN' },
      { name: 'English', code: 'ENG' },
      { name: 'Mathematics', code: 'MATH' },
      { name: 'Science', code: 'SCI' },
      { name: 'Social Studies', code: 'SST' },
      { name: 'Physics', code: 'PHY' },
      { name: 'Chemistry', code: 'CHEM' },
      { name: 'Biology', code: 'BIO' },
      { name: 'Computer Science', code: 'CS' },
      { name: 'Economics', code: 'ECO' },
      { name: 'Accountancy', code: 'ACC' },
      { name: 'Business Studies', code: 'BST' },
      { name: 'History', code: 'HIST' },
      { name: 'Geography', code: 'GEO' },
      { name: 'Political Science', code: 'POL' },
      { name: 'Sanskrit', code: 'SAN' },
      { name: 'General Knowledge', code: 'GK' },
      { name: 'Drawing & Art', code: 'ART' },
      { name: 'Physical Education', code: 'PHE' },
      { name: 'Game', code: 'GAME' }
    ],
    examTypes: [
      'Unit Test 1',
      'Mid Term / Half Yearly Examination',
      'Unit Test 2',
      'Pre-Board Examination',
      'Final Annual Examination'
    ]
  };

  const handleOneClickSetup = async () => {
    if (!window.confirm('Are you sure you want to auto-configure standard Sections (A-F), Rooms (1-10), Grades (Playgroup-12), Capacities (10-80), Departments, Subjects, and Examination Types all at once?')) return;
    setBulkImporting(true);
    setBulkImportStatus('Starting 1-Click Master Data Setup...');
    setError('');
    setSuccess('');
    try {
      // 1. Sections
      const existingSecNames = new Set((sections || []).map(s => s.name?.toUpperCase()));
      for (const sec of DEFAULT_MASTER_DATA.sections) {
        if (!existingSecNames.has(sec.toUpperCase())) {
          setBulkImportStatus(`Configuring Section: ${sec}...`);
          try { await apiClient.post('/academics/sections', { name: sec }); } catch (e) {}
        }
      }

      // 2. Rooms
      const existingRoomNames = new Set((rooms || []).map(r => r.name?.toUpperCase()));
      for (const rm of DEFAULT_MASTER_DATA.rooms) {
        if (!existingRoomNames.has(rm.toUpperCase())) {
          setBulkImportStatus(`Configuring Room: ${rm}...`);
          try { await apiClient.post('/academics/rooms', { name: rm }); } catch (e) {}
        }
      }

      // 3. Grade Levels
      const existingGradeNames = new Set((gradeLevels || []).map(g => g.name?.toUpperCase()));
      for (const gr of DEFAULT_MASTER_DATA.grades) {
        if (!existingGradeNames.has(gr.toUpperCase())) {
          setBulkImportStatus(`Configuring Grade: ${gr}...`);
          try { await apiClient.post('/academics/enrollment-classes', { name: gr }); } catch (e) {}
        }
      }

      // 4. Capacities
      const existingCapValues = new Set((capacities || []).map(c => c.value));
      for (const cap of DEFAULT_MASTER_DATA.capacities) {
        if (!existingCapValues.has(cap)) {
          setBulkImportStatus(`Configuring Capacity: ${cap}...`);
          try { await apiClient.post('/academics/capacities', { value: cap }); } catch (e) {}
        }
      }

      // 5. Departments
      const existingDeptNames = new Set((departments || []).map(d => d.name?.toUpperCase()));
      for (const dep of DEFAULT_MASTER_DATA.departments) {
        if (!existingDeptNames.has(dep.toUpperCase())) {
          setBulkImportStatus(`Configuring Department: ${dep}...`);
          try { await apiClient.post('/academics/departments', { name: dep }); } catch (e) {}
        }
      }

      // 6. Subjects
      const existingSubjNames = new Set((subjects || []).map(s => s.name?.toUpperCase()));
      for (const sub of DEFAULT_MASTER_DATA.subjects) {
        if (!existingSubjNames.has(sub.name.toUpperCase())) {
          setBulkImportStatus(`Configuring Subject: ${sub.name}...`);
          try { await apiClient.post('/academics/subjects', { name: sub.name, code: sub.code }); } catch (e) {}
        }
      }

      // 7. Exam Types
      const existingExamNames = new Set((examTypes || []).map(e => e.name?.toUpperCase()));
      for (const ex of DEFAULT_MASTER_DATA.examTypes) {
        if (!existingExamNames.has(ex.toUpperCase())) {
          setBulkImportStatus(`Configuring Exam Type: ${ex}...`);
          try { await apiClient.post('/academics/exam-types', { name: ex }); } catch (e) {}
        }
      }

      setBulkImportStatus('Refreshing school infrastructure data...');
      await fetchInfrastructure();
      setSuccess('🎉 1-Click Master Setup Completed! All Sections, Rooms, Grades, Capacities, Departments, Subjects & Exams are now configured.');
      setTimeout(() => setSuccess(''), 7000);
    } catch (err) {
      console.error('Auto setup error:', err);
      setError(err.response?.data?.error || 'Encountered an issue during bulk setup.');
    } finally {
      setBulkImporting(false);
      setBulkImportStatus('');
    }
  };

  const handleDownloadMasterTemplate = () => {
    const headers = ['Section', 'Room', 'GradeLevel', 'RoomCapacity', 'Department', 'Subject', 'ExamType'];
    const maxRows = Math.max(
      DEFAULT_MASTER_DATA.sections.length,
      DEFAULT_MASTER_DATA.rooms.length,
      DEFAULT_MASTER_DATA.grades.length,
      DEFAULT_MASTER_DATA.capacities.length,
      DEFAULT_MASTER_DATA.departments.length,
      DEFAULT_MASTER_DATA.subjects.length,
      DEFAULT_MASTER_DATA.examTypes.length
    );

    const rows = [];
    for (let i = 0; i < maxRows; i++) {
      const sec = DEFAULT_MASTER_DATA.sections[i] || '';
      const rm = DEFAULT_MASTER_DATA.rooms[i] || '';
      const gr = DEFAULT_MASTER_DATA.grades[i] || '';
      const cap = DEFAULT_MASTER_DATA.capacities[i] !== undefined ? DEFAULT_MASTER_DATA.capacities[i] : '';
      const dep = DEFAULT_MASTER_DATA.departments[i] || '';
      const sub = DEFAULT_MASTER_DATA.subjects[i]?.name || '';
      const ex = DEFAULT_MASTER_DATA.examTypes[i] || '';
      rows.push([sec, rm, gr, cap, dep, sub, ex].map(val => `"${val}"`).join(','));
    }

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EduVault_School_Master_Setup_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const splitCsvRow = (row) => {
    const result = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(curr.trim());
        curr = '';
      } else {
        curr += char;
      }
    }
    result.push(curr.trim());
    return result.map(s => s.replace(/^["']|["']$/g, '').trim());
  };

  const handleParseCsvFile = (file) => {
    if (!file) return;
    setBulkImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.warning('File is empty or has no data rows.');
        return;
      }

      const headerRow = splitCsvRow(lines[0]).map(h => h.toLowerCase());

      const colMap = {
        section: headerRow.findIndex(h => h.includes('section')),
        room: headerRow.findIndex(h => h.includes('room') && !h.includes('capacity')),
        grade: headerRow.findIndex(h => h.includes('grade') || h.includes('class')),
        capacity: headerRow.findIndex(h => h.includes('capacity')),
        department: headerRow.findIndex(h => h.includes('department') || h.includes('dept')),
        subject: headerRow.findIndex(h => h.includes('subject')),
        examType: headerRow.findIndex(h => h.includes('exam') || h.includes('test'))
      };

      const parsed = {
        sections: new Set(),
        rooms: new Set(),
        grades: new Set(),
        capacities: new Set(),
        departments: new Set(),
        subjects: new Set(),
        examTypes: new Set()
      };

      for (let r = 1; r < lines.length; r++) {
        const cols = splitCsvRow(lines[r]);
        if (colMap.section >= 0 && cols[colMap.section]) parsed.sections.add(cols[colMap.section]);
        if (colMap.room >= 0 && cols[colMap.room]) parsed.rooms.add(cols[colMap.room]);
        if (colMap.grade >= 0 && cols[colMap.grade]) parsed.grades.add(cols[colMap.grade]);
        if (colMap.capacity >= 0 && cols[colMap.capacity]) {
          const cNum = parseInt(cols[colMap.capacity]);
          if (!isNaN(cNum) && cNum > 0) parsed.capacities.add(cNum);
        }
        if (colMap.department >= 0 && cols[colMap.department]) parsed.departments.add(cols[colMap.department]);
        if (colMap.subject >= 0 && cols[colMap.subject]) parsed.subjects.add(cols[colMap.subject]);
        if (colMap.examType >= 0 && cols[colMap.examType]) parsed.examTypes.add(cols[colMap.examType]);
      }

      setBulkImportParsed({
        sections: Array.from(parsed.sections),
        rooms: Array.from(parsed.rooms),
        grades: Array.from(parsed.grades),
        capacities: Array.from(parsed.capacities),
        departments: Array.from(parsed.departments),
        subjects: Array.from(parsed.subjects),
        examTypes: Array.from(parsed.examTypes)
      });
    };
    reader.readAsText(file);
  };

  const handleExecuteCsvImport = async () => {
    if (!bulkImportParsed) return;
    setBulkImporting(true);
    setBulkImportStatus('Starting file bulk import...');
    try {
      const existingSec = new Set((sections || []).map(s => s.name?.toUpperCase()));
      for (const s of bulkImportParsed.sections) {
        if (!existingSec.has(s.toUpperCase())) {
          setBulkImportStatus(`Importing section: ${s}...`);
          try { await apiClient.post('/academics/sections', { name: s }); } catch (e) {}
        }
      }

      const existingRm = new Set((rooms || []).map(r => r.name?.toUpperCase()));
      for (const r of bulkImportParsed.rooms) {
        if (!existingRm.has(r.toUpperCase())) {
          setBulkImportStatus(`Importing room: ${r}...`);
          try { await apiClient.post('/academics/rooms', { name: r }); } catch (e) {}
        }
      }

      const existingGr = new Set((gradeLevels || []).map(g => g.name?.toUpperCase()));
      for (const g of bulkImportParsed.grades) {
        if (!existingGr.has(g.toUpperCase())) {
          setBulkImportStatus(`Importing grade: ${g}...`);
          try { await apiClient.post('/academics/enrollment-classes', { name: g }); } catch (e) {}
        }
      }

      const existingCap = new Set((capacities || []).map(c => c.value));
      for (const c of bulkImportParsed.capacities) {
        if (!existingCap.has(c)) {
          setBulkImportStatus(`Importing capacity: ${c}...`);
          try { await apiClient.post('/academics/capacities', { value: c }); } catch (e) {}
        }
      }

      const existingDep = new Set((departments || []).map(d => d.name?.toUpperCase()));
      for (const d of bulkImportParsed.departments) {
        if (!existingDep.has(d.toUpperCase())) {
          setBulkImportStatus(`Importing department: ${d}...`);
          try { await apiClient.post('/academics/departments', { name: d }); } catch (e) {}
        }
      }

      const existingSub = new Set((subjects || []).map(s => s.name?.toUpperCase()));
      for (const sub of bulkImportParsed.subjects) {
        if (!existingSub.has(sub.toUpperCase())) {
          setBulkImportStatus(`Importing subject: ${sub}...`);
          const code = sub.toUpperCase().replace(/\s+/g, '').slice(0, 6) || 'SUB';
          try { await apiClient.post('/academics/subjects', { name: sub, code }); } catch (e) {}
        }
      }

      const existingEx = new Set((examTypes || []).map(e => e.name?.toUpperCase()));
      for (const ex of bulkImportParsed.examTypes) {
        if (!existingEx.has(ex.toUpperCase())) {
          setBulkImportStatus(`Importing exam type: ${ex}...`);
          try { await apiClient.post('/academics/exam-types', { name: ex }); } catch (e) {}
        }
      }

      await fetchInfrastructure();
      setShowBulkImportModal(false);
      setBulkImportParsed(null);
      setBulkImportFile(null);
      setSuccess('🎉 Master data successfully imported from file into school infrastructure!');
      setTimeout(() => setSuccess(''), 7000);
    } catch (err) {
      console.error('Import error:', err);
      setError('Import encountered an error.');
    } finally {
      setBulkImporting(false);
      setBulkImportStatus('');
    }
  };

  const getSubjectTheme = (name = '') => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('math')) return { bg: 'bg-emerald-50/90 hover:bg-emerald-100/90', border: 'border-emerald-200', text: 'text-emerald-950', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' };
    if (lower.includes('sci') || lower.includes('phy') || lower.includes('chem') || lower.includes('bio')) return { bg: 'bg-cyan-50/90 hover:bg-cyan-100/90', border: 'border-cyan-200', text: 'text-cyan-950', badge: 'bg-cyan-100 text-cyan-800', dot: 'bg-cyan-500' };
    if (lower.includes('eng')) return { bg: 'bg-violet-50/90 hover:bg-violet-100/90', border: 'border-violet-200', text: 'text-violet-950', badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' };
    if (lower.includes('hin') || lower.includes('sans')) return { bg: 'bg-amber-50/90 hover:bg-amber-100/90', border: 'border-amber-200', text: 'text-amber-950', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
    if (lower.includes('pe') || lower.includes('phys') || lower.includes('sport')) return { bg: 'bg-orange-50/90 hover:bg-orange-100/90', border: 'border-orange-200', text: 'text-orange-950', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' };
    if (lower.includes('art') || lower.includes('draw') || lower.includes('music')) return { bg: 'bg-pink-50/90 hover:bg-pink-100/90', border: 'border-pink-200', text: 'text-pink-950', badge: 'bg-pink-100 text-pink-800', dot: 'bg-pink-500' };
    if (lower.includes('comp') || lower.includes('it') || lower.includes('tech')) return { bg: 'bg-blue-50/90 hover:bg-blue-100/90', border: 'border-blue-200', text: 'text-blue-950', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
    if (lower.includes('soc') || lower.includes('hist') || lower.includes('geo') || lower.includes('civ')) return { bg: 'bg-teal-50/90 hover:bg-teal-100/90', border: 'border-teal-200', text: 'text-teal-950', badge: 'bg-teal-100 text-teal-800', dot: 'bg-teal-500' };
    return { bg: 'bg-indigo-50/70 hover:bg-indigo-100/80', border: 'border-indigo-200', text: 'text-indigo-950', badge: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500' };
  };

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl p-4 flex items-center justify-between mb-6">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl p-4 flex items-center justify-between mb-6">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* School Timing & GPS Geofence Settings */}
            {(() => {
              const isAppModeEnabled = (schoolSettings.attendanceModes || ['app', 'biometric']).includes('app');
              return (
                <div className="card col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/20 border border-blue-100/80 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                        {isAppModeEnabled ? '⏰ School Timings & 📍 Geofence GPS Radius Setup' : '⏰ School Timings Setup'}
                      </h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {isAppModeEnabled 
                          ? 'Configure official school operating hours, grace period, and 300m GPS radius for teacher punch-in / punch-out location validation.' 
                          : 'Configure official school operating hours, grace period, and working hour thresholds for teacher attendance.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAppModeEnabled && (
                        <button
                          type="button"
                          onClick={handleDetectSchoolGps}
                          disabled={detectingGps}
                          className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          {detectingGps ? '📡 Locating...' : '📍 Auto-Detect Current GPS'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveSchoolSettings}
                        disabled={savingSettings}
                        className="btn-primary text-xs py-2 px-5 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
                      >
                        {savingSettings ? 'Saving...' : '💾 Save Settings'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">School Start Time *</label>
                      <input
                        type="time"
                        value={schoolSettings.schoolStartTime}
                        onChange={e => setSchoolSettings(s => ({ ...s, schoolStartTime: e.target.value }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Official daily opening time</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Grace Period (Minutes) *</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={schoolSettings.gracePeriodMinutes}
                        onChange={e => setSchoolSettings(s => ({ ...s, gracePeriodMinutes: parseInt(e.target.value) || 0 }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-amber-600 font-bold mt-1 block">Late marked after {schoolSettings.schoolStartTime} + {schoolSettings.gracePeriodMinutes} mins</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Half-Day (Hours) *</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        step="0.5"
                        value={schoolSettings.minHalfDayHours}
                        onChange={e => setSchoolSettings(s => ({ ...s, minHalfDayHours: parseFloat(e.target.value) || 4 }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Punches &lt; {schoolSettings.minHalfDayHours} hrs marked Half Day</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">School End Time *</label>
                      <input
                        type="time"
                        value={schoolSettings.schoolEndTime}
                        onChange={e => setSchoolSettings(s => ({ ...s, schoolEndTime: e.target.value }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Punch-out window start</span>
                    </div>

                    {isAppModeEnabled && (
                      <>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">School Campus Address</label>
                          <input
                            type="text"
                            placeholder="Enter official school building address..."
                            value={schoolSettings.address}
                            onChange={e => setSchoolSettings(s => ({ ...s, address: e.target.value }))}
                            className="input text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">GPS Latitude *</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={schoolSettings.latitude}
                            onChange={e => setSchoolSettings(s => ({ ...s, latitude: parseFloat(e.target.value) || 0 }))}
                            className="input text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">GPS Longitude *</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={schoolSettings.longitude}
                            onChange={e => setSchoolSettings(s => ({ ...s, longitude: parseFloat(e.target.value) || 0 }))}
                            className="input text-xs font-mono"
                          />
                        </div>

                        <div className="lg:col-span-4 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                              🎯
                            </div>
                            <div>
                              <span className="font-black text-emerald-950">300m Geofence Radius Active: </span>
                              <span className="text-emerald-800">Teachers must be within <strong>{schoolSettings.geofenceRadiusMeters || 300} meters</strong> radius of coordinates ({schoolSettings.latitude}, {schoolSettings.longitude}) to punch in or out.</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="font-bold text-emerald-950 whitespace-nowrap">Radius (meters):</label>
                            <input
                              type="number"
                              min="50"
                              max="2000"
                              value={schoolSettings.geofenceRadiusMeters}
                              onChange={e => setSchoolSettings(s => ({ ...s, geofenceRadiusMeters: parseInt(e.target.value) || 300 }))}
                              className="w-24 input text-xs py-1.5 px-2 text-center bg-white font-extrabold text-emerald-900 border border-emerald-300 rounded-lg focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Master Data Setup & Import Hub */}
            <div className="card col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-slate-900 via-primary-dark to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-primary/20 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      ⚡ Quick Infrastructure Hub
                    </span>
                    <span className="text-xs text-slate-300">Sections, Rooms, Grades, Capacities, Depts, Subjects & Exams</span>
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">
                    School Master Setup & Bulk Excel Import
                  </h3>
                  <p className="text-xs text-slate-300/80 max-w-2xl leading-relaxed">
                    No need to enter records manually one by one. Use <strong>1-Click Complete School Setup</strong> to instantly configure all standard Sections (A-F), Rooms (1-10), Grades (Playgroup to 12th), Capacities (10-80), Departments, Subjects, and Exam types, or upload your custom Excel / CSV template.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300 font-semibold">
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">📂 {sections.length} Sections</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">🏫 {rooms.length} Rooms</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">🎓 {gradeLevels.length} Grades</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">👥 {capacities.length} Capacities</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">🏢 {departments.length} Depts</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">📖 {subjects.length} Subjects</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">📝 {examTypes.length} Exams</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={handleOneClickSetup}
                    disabled={bulkImporting}
                    className="px-5 py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{bulkImporting ? 'Configuring...' : '⚡ 1-Click Complete School Setup'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowBulkImportModal(true); setBulkImportParsed(null); setBulkImportFile(null); }}
                    disabled={bulkImporting}
                    className="px-5 py-3 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>📥 Import Excel / CSV</span>
                  </button>
                </div>
              </div>

              {bulkImportStatus && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs font-semibold text-amber-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>{bulkImportStatus}</span>
                </div>
              )}
            </div>

            {/* Section Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                📂 School Sections
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and organize sections for your school classes.</p>

              <form onSubmit={handleAddSection} className="flex gap-2 mb-5">
                <input
                  required
                  value={newSection}
                  onChange={e => setNewSection(e.target.value)}
                  placeholder="e.g. Section D"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingSec} className="btn-primary text-xs py-2">
                  {loadingSec ? 'Adding...' : '+ Add Section'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Section Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{s.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteSection(s.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Section"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sections.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No sections registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Room Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                Classrooms & Rooms
              </h3>
              <p className="text-gray-400 text-xs mb-4">Manage room codes and locations for educational scheduling.</p>

              <form onSubmit={handleAddRoom} className="flex gap-2 mb-5">
                <input
                  required
                  value={newRoom}
                  onChange={e => setNewRoom(e.target.value)}
                  placeholder="e.g. Room 205"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingRm} className="btn-primary text-xs py-2">
                  {loadingRm ? 'Adding...' : '+ Add Room'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Room Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{r.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteRoom(r.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Room"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No rooms registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grade Level Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                🎓 Grade Levels
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage class grades configured for your school.</p>

              <form onSubmit={handleAddGradeLevel} className="flex gap-2 mb-5">
                <input
                  required
                  value={newGradeLevel}
                  onChange={e => setNewGradeLevel(e.target.value)}
                  placeholder="e.g. Class 10"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingGl} className="btn-primary text-xs py-2">
                  {loadingGl ? 'Adding...' : '+ Add Grade'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Grade Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeLevels.map(gl => (
                      <tr key={gl.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{gl.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteGradeLevel(gl.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Grade Level"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {gradeLevels.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No grade levels registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Capacity Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                👥 Classroom Capacities
              </h3>
              <p className="text-gray-400 text-xs mb-4">Set standard class enrollment thresholds.</p>

              <form onSubmit={handleAddCapacity} className="flex gap-2 mb-5">
                <input
                  required
                  type="number"
                  value={newCapacity}
                  onChange={e => setNewCapacity(e.target.value)}
                  placeholder="e.g. 35"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingCap} className="btn-primary text-xs py-2">
                  {loadingCap ? 'Adding...' : '+ Add Capacity'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Student Capacity</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capacities.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{c.value} students</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteCapacity(c.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Capacity Option"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {capacities.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No capacity limits registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Department Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                🏢 Academic Departments
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage departments for teacher profiles.</p>

              <form onSubmit={handleAddDepartment} className="flex gap-2 mb-5">
                <input
                  required
                  value={newDepartment}
                  onChange={e => setNewDepartment(e.target.value)}
                  placeholder="e.g. Science & Mathematics"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingDept} className="btn-primary text-xs py-2">
                  {loadingDept ? 'Adding...' : '+ Add Dept'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Department Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(d => (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{d.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteDepartment(d.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Department"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {departments.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No departments registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subjects Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                📚 School Subjects
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage subjects for classrooms and exam configurations.</p>

              <div className="flex gap-2 mb-5">
                <input
                  required
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAddSubject();
                    }
                  }}
                  placeholder="e.g. Hindi"
                  className="input text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubject()}
                  disabled={loadingSub}
                  className="btn-primary text-xs py-2"
                >
                  {loadingSub ? 'Adding...' : '+ Add Subject'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Subject</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{s.name}</td>
                        <td className="py-3 text-sm text-right">
                          <button
                            onClick={() => handleDeleteSubject(s.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Subject"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {subjects.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No subjects registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Examinations Setup Card */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                📋 Examinations Setup
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage examination types/cycles for scheduling and report cards.</p>

              <form onSubmit={handleAddExamType} className="flex gap-2 mb-5">
                <input
                  required
                  value={newExamType}
                  onChange={e => setNewExamType(e.target.value)}
                  placeholder="e.g. Mid-term assessment"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingExamTypes} className="btn-primary text-xs py-2">
                  {loadingExamTypes ? 'Adding...' : '+ Add Exam'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Examination Type</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examTypes.map(et => (
                      <tr key={et.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{et.name}</td>
                        <td className="py-3 text-sm text-right">
                          <button
                            onClick={() => handleDeleteExamType(et.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Examination Type"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {examTypes.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No examination types registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  <span>Import School Infrastructure from Excel / CSV</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Upload a spreadsheet to bulk-register Sections, Rooms, Grades, Capacities, Departments, Subjects & Exam Types.
                </p>
              </div>
              <button
                onClick={() => setShowBulkImportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Step 1: Download Template */}
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-primary">Need the pre-formatted Excel template?</h4>
                  <p className="text-xxs text-gray-500 mt-0.5">
                    Download our ready-made CSV template pre-filled with standard Sections, Rooms, Class 1-12, Capacities, Subjects & Exams.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadMasterTemplate}
                  className="btn-outline text-xs px-3.5 py-1.5 flex items-center gap-1.5 shrink-0 bg-white border-blue-300 text-primary font-bold hover:bg-blue-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Step 2: Upload Zone */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="masterCsvInput"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={(e) => e.target.files?.[0] && handleParseCsvFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="masterCsvInput" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {bulkImportFile ? bulkImportFile.name : 'Click to select CSV file, or drag & drop here'}
                  </span>
                  <span className="text-xxs text-gray-400">
                    Supports .csv files with headers: Section, Room, GradeLevel, RoomCapacity, Department, Subject, ExamType
                  </span>
                </label>
              </div>

              {/* Step 3: Preview */}
              {bulkImportParsed && (
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Parsed Summary Preview (Ready to Import)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Sections</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.sections.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.sections.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Rooms</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.rooms.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.rooms.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Grade Levels</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.grades.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.grades.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Capacities</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.capacities.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.capacities.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Departments</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.departments.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.departments.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Subjects</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.subjects.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.subjects.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 col-span-2">
                      <span className="text-[10px] text-gray-400 block">Examination Types</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.examTypes.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.examTypes.join(', ')}</div>
                    </div>
                  </div>
                </div>
              )}

              {bulkImportStatus && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>{bulkImportStatus}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                disabled={bulkImporting}
                className="btn-outline text-xs px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteCsvImport}
                disabled={bulkImporting || !bulkImportParsed}
                className="btn-primary text-xs px-6 py-2.5 font-bold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{bulkImporting ? 'Importing Master Data...' : '🚀 Start Bulk Import'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InfrastructureTab;
