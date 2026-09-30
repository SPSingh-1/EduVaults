import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import { Sparkles, UploadCloud, Download, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatGrade, formatSection, formatClassLabel } from '../../utils/classUtils';

const DEFAULT_STANDARD_CLASSES = [
  { grade: 'Play Group', section: 'A', room: 'Room 1', capacity: 25, level: 'Pre-Primary' },
  { grade: 'Nursery', section: 'A', room: 'Room 1', capacity: 30, level: 'Pre-Primary' },
  { grade: 'LKG', section: 'A', room: 'Room 2', capacity: 35, level: 'Pre-Primary' },
  { grade: 'UKG', section: 'A', room: 'Room 2', capacity: 35, level: 'Pre-Primary' },
  { grade: '1', section: 'A', room: 'Room 3', capacity: 40, level: 'Primary Education' },
  { grade: '1', section: 'B', room: 'Room 3', capacity: 40, level: 'Primary Education' },
  { grade: '2', section: 'A', room: 'Room 4', capacity: 40, level: 'Primary Education' },
  { grade: '2', section: 'B', room: 'Room 4', capacity: 40, level: 'Primary Education' },
  { grade: '3', section: 'A', room: 'Room 5', capacity: 40, level: 'Primary Education' },
  { grade: '3', section: 'B', room: 'Room 5', capacity: 40, level: 'Primary Education' },
  { grade: '4', section: 'A', room: 'Room 6', capacity: 45, level: 'Primary Education' },
  { grade: '4', section: 'B', room: 'Room 6', capacity: 45, level: 'Primary Education' },
  { grade: '5', section: 'A', room: 'Room 7', capacity: 45, level: 'Primary Education' },
  { grade: '6', section: 'A', room: 'Room 7', capacity: 45, level: 'Middle School' },
  { grade: '7', section: 'A', room: 'Room 8', capacity: 50, level: 'Middle School' },
  { grade: '8', section: 'A', room: 'Room 8', capacity: 50, level: 'Middle School' },
  { grade: '9', section: 'A', room: 'Room 9', capacity: 50, level: 'Secondary Education' },
  { grade: '10', section: 'A', room: 'Room 9', capacity: 50, level: 'Secondary Education' },
  { grade: '11', section: 'A', room: 'Room 10', capacity: 60, level: 'Higher Secondary' },
  { grade: '12', section: 'A', room: 'Room 10', capacity: 60, level: 'Higher Secondary' }
];

export default function Classes() {
  const [classesList, setClassesList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [enrollmentClasses, setEnrollmentClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [capacities, setCapacities] = useState([]);

  // Bulk Import & Auto Setup State
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [parsedClasses, setParsedClasses] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('');

  // Form State
  const [form, setForm] = useState({
    grade: '',
    section: '',
    level: 'Secondary Education',
    room: '',
    capacity: ''
  });

  const fetchClassesData = async () => {
    try {
      const clsRes = await apiClient.get('/academics/classes');
      const order = ['play group', 'nursery', 'lkg', 'ukg'];
      const sorted = (clsRes.data || []).sort((a, b) => {
        const ga = formatGrade(a.grade).replace(/^Class\s*/i, '').toLowerCase();
        const gb = formatGrade(b.grade).replace(/^Class\s*/i, '').toLowerCase();
        const ia = order.indexOf(ga);
        const ib = order.indexOf(gb);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        const na = parseInt(ga);
        const nb = parseInt(gb);
        if (!isNaN(na) && !isNaN(nb)) {
          if (na !== nb) return na - nb;
          return (a.section || '').localeCompare(b.section || '');
        }
        return ga.localeCompare(gb);
      });
      setClassesList(sorted);

      const teachRes = await apiClient.get('/academics/teachers');
      setTeachers(teachRes.data);

      const encRes = await apiClient.get('/academics/enrollment-classes');
      setEnrollmentClasses(encRes.data);

      const secRes = await apiClient.get('/academics/sections');
      setSections(secRes.data);

      const rmRes = await apiClient.get('/academics/rooms');
      setRooms(rmRes.data);

      const capRes = await apiClient.get('/academics/capacities');
      setCapacities(capRes.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  useEffect(() => {
    fetchClassesData();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!form.grade || !form.section || !form.room) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/academics/classes', form);
      setShowNew(false);
      setForm({ grade: '', section: '', level: 'Secondary Education', room: '', capacity: '' });
      setSuccessMsg('Class & Section created successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchClassesData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) return;
    setLoading(true);
    try {
      await apiClient.post(`/academics/classes/${selectedClassId}/assign-teacher`, JSON.stringify(selectedTeacherId), {
        headers: { 'Content-Type': 'application/json' }
      });
      setShowAssign(false);
      setSuccessMsg('Teacher assigned to class successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchClassesData();
    } catch (err) {
      console.error('Error assigning teacher:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- 1-Click Auto Setup Classes ---
  const handleOneClickAutoSetupClasses = async () => {
    if (!window.confirm('Are you sure you want to automatically create all 20 standard Classes & Sections from Play Group to Class 12th?')) return;
    
    setBulkLoading(true);
    setBulkStatus('Starting 1-Click Class & Section Setup...');
    setError('');
    setSuccessMsg('');
    try {
      // 1. Ensure basic sections & rooms exist in master if empty
      const existingSec = new Set((sections || []).map(s => formatSection(s.name).toUpperCase()));
      for (const s of ['A', 'B', 'C', 'D']) {
        if (!existingSec.has(s)) {
          try { await apiClient.post('/academics/sections', { name: s }); } catch (e) {}
        }
      }
      const existingRm = new Set((rooms || []).map(r => r.name?.toUpperCase()));
      for (let i = 1; i <= 10; i++) {
        const rmName = `Room ${i}`;
        if (!existingRm.has(rmName.toUpperCase())) {
          try { await apiClient.post('/academics/rooms', { name: rmName }); } catch (e) {}
        }
      }

      // 2. Create Classes with normalized duplicate prevention
      const existingCls = new Set((classesList || []).map(c => `${formatGrade(c.grade).replace(/^Class\s*/i, '')}-${formatSection(c.section)}`.toUpperCase()));
      let created = 0;
      for (const cls of DEFAULT_STANDARD_CLASSES) {
        const cleanG = formatGrade(cls.grade).replace(/^Class\s*/i, '');
        const cleanS = formatSection(cls.section);
        const key = `${cleanG}-${cleanS}`.toUpperCase();
        if (!existingCls.has(key)) {
          setBulkStatus(`Creating Class ${cleanG} - Section ${cleanS}...`);
          try {
            await apiClient.post('/academics/classes', {
              ...cls,
              grade: cleanG,
              section: cleanS
            });
            created++;
          } catch (e) {}
        }
      }

      setBulkStatus('Refreshing class directory...');
      await fetchClassesData();
      setShowNew(false);
      setSuccessMsg(`🎉 Success! ${created} standard Classes & Sections configured automatically.`);
      setTimeout(() => setSuccessMsg(''), 7000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to auto setup classes.');
    } finally {
      setBulkLoading(false);
      setBulkStatus('');
    }
  };

  // --- CSV File Helper & Handlers ---
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

  const handleDownloadClassesTemplate = () => {
    const link = document.createElement('a');
    link.href = '/demo-templates/05_classes_sections_demo_20.csv';
    link.setAttribute('download', 'classes_sections_demo_20.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleParseClassesCsv = (file) => {
    if (!file) return;
    setBulkFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert('File is empty or has no data rows.');
        return;
      }

      const headerRow = splitCsvRow(lines[0]).map(h => h.toLowerCase());
      const colGrade = headerRow.findIndex(h => h.includes('class') || h.includes('grade'));
      const colSec = headerRow.findIndex(h => h.includes('sec'));
      const colCap = headerRow.findIndex(h => h.includes('cap'));
      const colRoom = headerRow.findIndex(h => h.includes('room'));

      const parsed = [];
      for (let r = 1; r < lines.length; r++) {
        const cols = splitCsvRow(lines[r]);
        let rawGrade = (colGrade >= 0 ? cols[colGrade] : cols[0]) || '';
        let cleanGrade = rawGrade.replace(/^Class\s*/i, '').trim() || rawGrade;
        let sec = (colSec >= 0 ? cols[colSec] : cols[1]) || 'A';
        let cap = (colCap >= 0 ? parseInt(cols[colCap]) : 40) || 40;
        let room = (colRoom >= 0 ? cols[colRoom] : `Room ${r}`) || 'Room 1';

        if (!cleanGrade) continue;

        let level = 'Primary Education';
        const num = parseInt(cleanGrade);
        if (['play group', 'nursery', 'lkg', 'ukg'].includes(cleanGrade.toLowerCase())) {
          level = 'Pre-Primary';
        } else if (!isNaN(num)) {
          if (num <= 5) level = 'Primary Education';
          else if (num <= 8) level = 'Middle School';
          else if (num <= 10) level = 'Secondary Education';
          else level = 'Higher Secondary';
        }

        parsed.push({
          grade: cleanGrade,
          section: sec,
          capacity: cap,
          room: room,
          level: level
        });
      }

      setParsedClasses(parsed);
    };
    reader.readAsText(file);
  };

  const handleExecuteClassesImport = async () => {
    if (!parsedClasses || parsedClasses.length === 0) return;
    setBulkLoading(true);
    setBulkStatus('Importing classes from file...');
    try {
      const existingCls = new Set((classesList || []).map(c => `${formatGrade(c.grade).replace(/^Class\s*/i, '')}-${formatSection(c.section)}`.toUpperCase()));
      let imported = 0;
      for (const cls of parsedClasses) {
        const cleanG = formatGrade(cls.grade).replace(/^Class\s*/i, '');
        const cleanS = formatSection(cls.section);
        const key = `${cleanG}-${cleanS}`.toUpperCase();
        if (!existingCls.has(key)) {
          setBulkStatus(`Importing Class ${cleanG} - ${cleanS}...`);
          try {
            await apiClient.post('/academics/classes', {
              ...cls,
              grade: cleanG,
              section: cleanS
            });
            imported++;
          } catch (e) {}
        }
      }

      await fetchClassesData();
      setShowBulkImport(false);
      setParsedClasses([]);
      setBulkFile(null);
      setSuccessMsg(`🎉 Successfully imported ${imported} classes from file!`);
      setTimeout(() => setSuccessMsg(''), 7000);
    } catch (err) {
      setError('Import encountered an error.');
    } finally {
      setBulkLoading(false);
      setBulkStatus('');
    }
  };

  return (
    <div>
      <Topbar
        title="Class & Section Management"
        subtitle="Dashboard › Academics › Classes"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOneClickAutoSetupClasses}
              disabled={bulkLoading}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Auto-create standard classes from Playgroup to 12th"
            >
              <Sparkles className="w-4 h-4" />
              <span>{bulkLoading ? 'Configuring...' : '⚡ 1-Click Auto Setup (Playgroup to 12th)'}</span>
            </button>

            <button
              type="button"
              onClick={() => { setShowBulkImport(true); setParsedClasses([]); setBulkFile(null); }}
              disabled={bulkLoading}
              className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer bg-white"
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>📥 Import CSV</span>
            </button>

            <button
              onClick={() => { setError(''); setShowNew(true); }}
              className="btn-primary flex items-center gap-1.5 text-xs py-2 px-3.5"
            >
              <span>⊕ Create New Class/Section</span>
            </button>
          </div>
        }
      />

      {/* Global Alerts & Status */}
      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {bulkStatus && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
          <span>{bulkStatus}</span>
        </div>
      )}

      <div className="card">
        <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
            <table className="w-full" style={{ minWidth: '720px', borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-gray-100">
                  {['Class & Section', 'Class Teacher', 'Room', 'Occupancy', 'Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {classesList.map((c, i) => (
                  <tr key={c.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${c.grade === '12' ? 'bg-red-500' : c.grade === '11' ? 'bg-yellow-500' : 'bg-primary'}`}>{formatGrade(c.grade).replace(/^Class\s+/i, '')}</div>
                        <div><div className="font-semibold text-sm text-primary">{formatClassLabel(c.grade, c.section)}</div><div className="text-xs text-gray-400">{c.level}</div></div>
                      </div>
                    </td>
                    <td className="table-td">
                      {c.teacher ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{c.teacher[0]}</div>
                          <div><div className="text-sm font-medium">{c.teacher}</div><div className="text-xs text-gray-400">{c.email}</div></div>
                        </div>
                      ) : <span className="text-xs text-red-500 font-semibold">TEACHER UNASSIGNED</span>}
                    </td>
                    <td className="table-td text-sm text-gray-500">{c.room}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="text-sm">{c.enrolled || 0}/{c.capacity || 40} Students</div>
                        {(c.enrolled || 0) >= (c.capacity || 40) && <span className="badge badge-danger text-xs">FULL</span>}
                        <span className={`text-xs font-semibold ${(c.pct || 0) >= 90 ? 'text-red-500' : (c.pct || 0) >= 70 ? 'text-yellow-500' : 'text-green-500'}`}>{c.pct || 0}%</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full w-32">
                        <div className={`h-full rounded-full ${(c.pct || 0) >= 90 ? 'bg-red-400' : (c.pct || 0) >= 70 ? 'bg-yellow-400' : 'bg-green-400'}`} style={{ width: `${c.pct || 0}%` }} />
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2 items-center">
                        {!c.teacher && (
                          <button
                            onClick={() => { setSelectedClassId(c.id); setSelectedTeacherId(''); setShowAssign(true); }}
                            className="btn-primary text-xs py-1.5 px-3"
                          >
                            Assign Teacher
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedClassId(c.id); setSelectedTeacherId(c.teacherId || ''); setShowAssign(true); }}
                          className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95"
                          title="Edit Teacher Assignment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {classesList.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-10">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
                          🏫
                        </div>
                        <div className="font-bold text-slate-700 text-sm">Abhi koi Class ya Section create nahi hua hai.</div>
                        <p className="text-xs text-slate-400 max-w-sm text-center">
                          Aap 1-Click Auto Setup se Playgroup se lekar 12th tak sabhi standard classes ek sath create kar sakte hain.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={handleOneClickAutoSetupClasses}
                            disabled={bulkLoading}
                            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                          >
                            <Sparkles className="w-4 h-4 text-amber-300" />
                            <span>⚡ 1-Click Auto Setup All Classes</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setShowBulkImport(true); setParsedClasses([]); setBulkFile(null); }}
                            className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5 bg-white"
                          >
                            <UploadCloud className="w-4 h-4 text-blue-600" />
                            <span>📥 Upload CSV</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create New Class Modal with 1-Click Helper Banner */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleCreateClass} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-6">
              <div className="text-xs font-semibold text-primary/60 uppercase tracking-wider mb-1">⊕ Setup New Academic Unit</div>
              <h3 className="font-display font-bold text-primary text-xl mb-1">Create New Class & Section</h3>
              <p className="text-gray-400 text-xs mb-4 font-light">Configure the classroom environment and set enrollment limits.</p>
              
              {/* Inside-Modal Fast Setup Banner */}
              <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm border border-white/10">
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> 1-Click Automation
                  </div>
                  <div className="text-[10px] text-slate-300">Auto-create all 20 standard classes in 1-click instead of adding one by one:</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleOneClickAutoSetupClasses}
                    disabled={bulkLoading}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition cursor-pointer shadow-xs"
                  >
                    ⚡ Auto Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNew(false); setShowBulkImport(true); setParsedClasses([]); setBulkFile(null); }}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white/15 hover:bg-white/25 text-white border border-white/20 transition cursor-pointer"
                  >
                    📥 CSV
                  </button>
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">{error}</div>}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Grade Level *</label>
                  <select required value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="input">
                    <option value="">Select Grade Level</option>
                    {enrollmentClasses.length > 0 ? (
                      enrollmentClasses.map(c => {
                        const num = c.name.replace(/^Class\s*/i, '').trim();
                        return <option key={c.id} value={num}>{c.name}</option>;
                      })
                    ) : (
                      ['Play Group', 'Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(g => (
                        <option key={g} value={g}>{g.startsWith('Play') || g.startsWith('Nur') || g.startsWith('LKG') || g.startsWith('UKG') ? g : `Class ${g}`}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Section Name *</label>
                  <select required value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className="input">
                    <option value="">Select Section</option>
                    {sections.length > 0 ? (
                      sections.map(s => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))
                    ) : (
                      ['A', 'B', 'C', 'D', 'E', 'F'].map(s => (
                        <option key={s} value={s}>Section {s}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Room *</label>
                  <select required value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} className="input">
                    <option value="">Select Room</option>
                    {rooms.length > 0 ? (
                      rooms.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))
                    ) : (
                      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                        <option key={r} value={`Room ${r}`}>Room {r}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student Capacity *</label>
                  <select required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} className="input">
                    <option value="">Select Capacity</option>
                    {capacities.length > 0 ? (
                      capacities.map(c => (
                        <option key={c.id} value={c.value}>{c.value}</option>
                      ))
                    ) : (
                      [20, 30, 35, 40, 45, 50, 60, 70, 80].map(cap => (
                        <option key={cap} value={cap}>{cap} Students</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4 bg-gray-50/50">
              <button type="button" onClick={() => setShowNew(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : '⊕ Create Class'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CSV Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  <span>Bulk Import Classes & Sections (CSV / Excel)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Upload a spreadsheet to register Playgroup to 12th Classes, Sections, Rooms & Capacities in one click.
                </p>
              </div>
              <button
                onClick={() => setShowBulkImport(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Step 1: Download Template */}
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-primary">Need the pre-formatted Classes template?</h4>
                  <p className="text-xxs text-gray-500 mt-0.5">
                    Download our ready-made CSV template pre-filled with 20 standard Classes, Sections, Rooms & Capacities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadClassesTemplate}
                  className="btn-outline text-xs px-3.5 py-1.5 flex items-center gap-1.5 shrink-0 bg-white border-blue-300 text-primary font-bold hover:bg-blue-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Demo CSV</span>
                </button>
              </div>

              {/* Step 2: Upload Zone */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="classesCsvInput"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={(e) => e.target.files?.[0] && handleParseClassesCsv(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="classesCsvInput" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {bulkFile ? bulkFile.name : 'Click to select CSV file, or drag & drop here'}
                  </span>
                  <span className="text-xxs text-gray-400">Supported: .csv files with headers ClassName, Section, Capacity, RoomNumber</span>
                </label>
              </div>

              {/* Step 3: Parsed Preview */}
              {parsedClasses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Parsed Classes Preview ({parsedClasses.length} Items):</span>
                    <span className="text-emerald-600 font-semibold">✓ Ready to Ingest</span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2">Grade / Class</th>
                          <th className="p-2">Section</th>
                          <th className="p-2">Room</th>
                          <th className="p-2">Capacity</th>
                          <th className="p-2">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {parsedClasses.slice(0, 15).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-bold text-primary">{row.grade}</td>
                            <td className="p-2">{row.section}</td>
                            <td className="p-2">{row.room}</td>
                            <td className="p-2">{row.capacity}</td>
                            <td className="p-2 text-slate-400 text-xxs">{row.level}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedClasses.length > 15 && (
                      <div className="p-2 text-center text-xxs text-slate-400 bg-slate-50">
                        + {parsedClasses.length - 15} more classes in file
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBulkImport(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteClassesImport}
                disabled={!parsedClasses.length || bulkLoading}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{bulkLoading ? 'Ingesting...' : `Import ${parsedClasses.length} Classes Now`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAssignTeacher} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <h3 className="font-display font-bold text-primary text-xl mb-3">Assign Class Teacher</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Educator</label>
                <select required value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} className="input">
                  <option value="">Choose Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button type="button" onClick={() => setShowAssign(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">Confirm Assignment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
