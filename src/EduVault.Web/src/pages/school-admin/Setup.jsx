import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const Setup = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('infrastructure'); // 'infrastructure', 'timetable', 'substitutions'

  // Tab 1: Infrastructure State
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [capacities, setCapacities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newSection, setNewSection] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [loadingSub, setLoadingSub] = useState(false);

  // Tab 2: Timetable State
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [scheduleItems, setScheduleItems] = useState([]);
  const [showCellModal, setShowCellModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // { day, period }

  // Modal Cell form state
  const [cellForm, setCellForm] = useState({
    departmentName: '',
    subjectId: '',
    teacherId: '',
    remark: ''
  });

  // Tab 3: Substitutions State
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedAlertItem, setSelectedAlertItem] = useState(null);
  const [availableSubstitutes, setAvailableSubstitutes] = useState([]);
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingSec, setLoadingSec] = useState(false);
  const [loadingRm, setLoadingRm] = useState(false);
  const [loadingGl, setLoadingGl] = useState(false);
  const [loadingCap, setLoadingCap] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');

  // Days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const fetchInfrastructure = async () => {
    try {
      const secRes = await apiClient.get('/academics/sections');
      setSections(secRes.data);

      const rmRes = await apiClient.get('/academics/rooms');
      setRooms(rmRes.data);

      const glRes = await apiClient.get('/academics/enrollment-classes');
      setGradeLevels(glRes.data);

      const capRes = await apiClient.get('/academics/capacities');
      setCapacities(capRes.data);

      const depRes = await apiClient.get('/academics/departments');
      setDepartments(depRes.data);

      const subjRes = await apiClient.get('/academics/subjects');
      setSubjects(subjRes.data);
    } catch (err) {
      console.error('Error fetching infrastructure setup data:', err);
    }
  };

  const fetchTimetableMeta = async () => {
    try {
      const clsRes = await apiClient.get('/academics/classes');
      setClasses(clsRes.data);

      const teachRes = await apiClient.get('/academics/teachers');
      setTeachers(teachRes.data);

      const subjRes = await apiClient.get('/academics/subjects');
      setSubjects(subjRes.data);

      const periodRes = await apiClient.get('/academics/timetable/periods');
      setPeriods(periodRes.data);

      if (clsRes.data.length > 0 && !selectedClassId) {
        setSelectedClassId(clsRes.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching timetable config data:', err);
    }
  };

  const fetchClassSchedule = async (classId) => {
    if (!classId) return;
    try {
      const res = await apiClient.get(`/academics/timetable/schedule/${classId}`);
      setScheduleItems(res.data);
    } catch (err) {
      console.error('Error fetching class schedule:', err);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const res = await apiClient.get('/academics/timetable/remarks');
      setActiveAlerts(res.data);
    } catch (err) {
      console.error('Error fetching teacher remarks:', err);
    }
  };

  const handleAddPeriod = () => {
    let start = "08:00";
    let end = "08:45";
    if (periods.length > 0) {
      const last = periods[periods.length - 1];
      start = last.endTime;
      const [h, m] = start.split(':').map(Number);
      const endMin = (h * 60 + m + 45) % 1440;
      const endH = Math.floor(endMin / 60).toString().padStart(2, '0');
      const endM = (endMin % 60).toString().padStart(2, '0');
      end = `${endH}:${endM}`;
    }

    const newP = {
      id: '00000000-0000-0000-0000-000000000000',
      periodNumber: periods.length + 1,
      startTime: start,
      endTime: end,
      durationMinutes: 45
    };
    setPeriods([...periods, newP]);
  };

  const handleDeletePeriod = (index) => {
    const updated = periods.filter((_, i) => i !== index).map((p, idx) => ({
      ...p,
      periodNumber: idx + 1
    }));
    setPeriods(updated);
  };

  const handlePeriodTimeChange = (index, field, value) => {
    const updated = periods.map((p, i) => {
      if (i === index) {
        const newP = { ...p, [field]: value };
        if (newP.startTime && newP.endTime) {
          const [sh, sm] = newP.startTime.split(':').map(Number);
          const [eh, em] = newP.endTime.split(':').map(Number);
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          newP.durationMinutes = diff > 0 ? diff : 45;
        }
        return newP;
      }
      return p;
    });
    setPeriods(updated);
  };

  const handleSavePeriods = async () => {
    setLoadingPeriods(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/academics/timetable/periods', periods);
      setPeriods(res.data);
      setSuccess('Timetable periods updated successfully!');
      fetchTimetableMeta();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save timetable periods.');
    } finally {
      setLoadingPeriods(false);
    }
  };

  useEffect(() => {
    fetchInfrastructure();
    fetchTimetableMeta();
    fetchActiveAlerts();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassSchedule(selectedClassId);
    }
  }, [selectedClassId]);

  // Tab 1 handlers
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

  // Tab 2 grid handlers
  const handleCellClick = (day, periodNo) => {
    setModalError('');
    const item = scheduleItems.find(s => s.dayOfWeek === day && s.periodNumber === periodNo);
    setSelectedCell({ day, periodNo, item });

    const subjectObj = item?.subjectId ? subjects.find(s => s.id === item.subjectId) : null;
    const initialDept = subjectObj?.department || '';

    setCellForm({
      departmentName: initialDept,
      subjectId: item?.subjectId || '',
      teacherId: item?.teacherId || '',
      remark: item?.remark || ''
    });
    setShowCellModal(true);
  };

  const handleSaveCell = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const isClearing = !cellForm.subjectId || !cellForm.teacherId;

      await apiClient.post('/academics/timetable/schedule', {
        classId: selectedClassId,
        subjectId: isClearing ? null : cellForm.subjectId,
        customSubjectName: null,
        teacherId: isClearing ? null : cellForm.teacherId,
        periodNumber: selectedCell.periodNo,
        dayOfWeek: selectedCell.day
      });

      // If there's an existing item and we saved a remark
      if (selectedCell.item && cellForm.remark !== (selectedCell.item.remark || '')) {
        await apiClient.post(`/academics/timetable/remark/${selectedCell.item.id}`, {
          remark: cellForm.remark
        });
      }

      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
      fetchActiveAlerts();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save timetable configuration.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleClearSlot = async () => {
    setModalError('');
    setModalLoading(true);
    try {
      await apiClient.post('/academics/timetable/schedule', {
        classId: selectedClassId,
        subjectId: null,
        customSubjectName: null,
        teacherId: null,
        periodNumber: selectedCell.periodNo,
        dayOfWeek: selectedCell.day
      });
      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
      fetchActiveAlerts();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to clear timetable cell.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCellAddRemark = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedCell.item) return;
    setModalError('');
    setModalLoading(true);
    try {
      await apiClient.post(`/academics/timetable/remark/${selectedCell.item.id}`, {
        remark: cellForm.remark
      });
      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
      fetchActiveAlerts();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to post remark.');
    } finally {
      setModalLoading(false);
    }
  };

  // Tab 3 Substitution handlers
  const handleSelectAlert = async (alertItem) => {
    setSelectedAlertItem(alertItem);
    setSelectedSubTeacherId('');
    setAvailableSubstitutes([]);
    try {
      const res = await apiClient.get(`/academics/timetable/substitutes/${alertItem.id}`);
      setAvailableSubstitutes(res.data);
    } catch (err) {
      console.error('Error fetching free teachers:', err);
    }
  };

  const handleConfirmSubstitute = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedSubTeacherId || !selectedAlertItem) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post(`/academics/timetable/reassign/${selectedAlertItem.id}`, {
        teacherId: selectedSubTeacherId
      });
      setSuccess('Class rescheduled to substitute teacher successfully!');
      setSelectedAlertItem(null);
      fetchActiveAlerts();
      if (selectedClassId) {
        fetchClassSchedule(selectedClassId);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reassign substitute.');
    } finally {
      setLoading(false);
    }
  };

  const groupedSubjects = subjects.reduce((groups, s) => {
    const dept = s.department || 'Other Subjects';
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(s);
    return groups;
  }, {});

  return (
    <div>
      <Topbar title="Academic Setup & Configurations" subtitle="Dashboard › Academics › Setup" />

      {/* Tabs Menu */}
      <div className="flex gap-4 border-b border-gray-200 px-6 mt-4">
        <button
          onClick={() => { setActiveTab('infrastructure'); setError(''); setSuccess(''); }}
          className={`pb-3 text-sm font-semibold transition-all ${activeTab === 'infrastructure' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-primary'}`}
        >
          📂 Infrastructure Setup
        </button>
        <button
          onClick={() => { setActiveTab('timetable'); setError(''); setSuccess(''); fetchTimetableMeta(); }}
          className={`pb-3 text-sm font-semibold transition-all ${activeTab === 'timetable' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-primary'}`}
        >
          📅 Weekly Timetable Config
        </button>
        <button
          onClick={() => { setActiveTab('substitutions'); setError(''); setSuccess(''); fetchActiveAlerts(); }}
          className={`pb-3 text-sm font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'substitutions' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-primary'}`}
        >
          👩‍🏫 Substitution & Cover Alerts
          {activeAlerts.length > 0 && (
            <span className="bg-rose-500 text-white text-xxs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
              {activeAlerts.length}
            </span>
          )}
        </button>
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3.5">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-600 text-xs font-semibold rounded-lg p-3.5">{success}</div>}

        {/* Tab 1 Content */}
        {activeTab === 'infrastructure' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Section Management */}
            <div className="card">
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

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Section Name</th>
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
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

            {/* Room Management */}
            <div className="card">
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

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Room Name</th>
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
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

            {/* Grade Level Management */}
            <div className="card">
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

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Grade Name</th>
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
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

            {/* Capacity Management */}
            <div className="card">
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

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Student Capacity</th>
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
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

            {/* Department Management */}
            <div className="card">
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

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Department Name</th>
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
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

            {/* Subjects Management */}
            <div className="card">
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

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase">Subject</th>
                    <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
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
        )}

        {/* Tab 2 Content */}
        {activeTab === 'timetable' && (
          <div className="space-y-6">
            {/* Periods Configuration Section */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-display font-bold text-primary text-base flex items-center gap-1.5">
                    ⚙️ Manage School Timetable Periods
                  </h3>
                  <p className="text-gray-400 text-xxs">Add or remove period rows, and adjust the start/end times displayed in the scheduler.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPeriod}
                    className="btn-outline text-xxs py-1.5 px-3 border-primary/20 text-primary hover:bg-primary/5 font-semibold"
                  >
                    + Add Period
                  </button>
                  <button
                    onClick={handleSavePeriods}
                    disabled={loadingPeriods}
                    className="btn-primary text-xxs py-1.5 px-3 font-semibold"
                  >
                    {loadingPeriods ? 'Saving...' : 'Save Periods'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {periods.map((p, idx) => (
                  <div key={p.id || idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-xs">Period {idx + 1}</span>
                      <button
                        onClick={() => handleDeletePeriod(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-100 rounded transition-colors"
                        title="Delete Period"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xxs font-semibold text-gray-500">
                      <div>
                        <label className="block mb-0.5">Start Time</label>
                        <input
                          type="time"
                          value={p.startTime}
                          onChange={e => handlePeriodTimeChange(idx, 'startTime', e.target.value)}
                          className="input py-1 px-2 text-xs w-full font-medium"
                        />
                      </div>
                      <div>
                        <label className="block mb-0.5">End Time</label>
                        <input
                          type="time"
                          value={p.endTime}
                          onChange={e => handlePeriodTimeChange(idx, 'endTime', e.target.value)}
                          className="input py-1 px-2 text-xs w-full font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {periods.length === 0 && (
                  <div className="col-span-full text-center py-4 text-gray-400 text-xs italic">
                    No periods defined. Click "+ Add Period" to begin.
                  </div>
                )}
              </div>
            </div>

            {/* Timetable Scheduler Grid */}
            <div className="card space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-display font-bold text-primary text-lg">Weekly Class Timetable Scheduler</h3>
                  <p className="text-gray-400 text-xs">Configure subjects, times, and teacher assignments. Double-bookings are automatically prevented.</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Selected Class:</label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="input w-56 text-sm"
                  >
                    <option value="">Select Class Section</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Class {c.grade} - {c.section}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClassId ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase text-center w-28">Period</th>
                        {days.map(d => (
                          <th key={d} className="border border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase text-center">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map(p => (
                        <tr key={p.id}>
                          <td className="border border-gray-200 p-3 text-center bg-gray-50">
                            <div className="font-bold text-primary text-xs">Period {p.periodNumber}</div>
                            <div className="text-xxs text-gray-400">{p.startTime} - {p.endTime}</div>
                          </td>
                          {days.map(day => {
                            const cell = scheduleItems.find(s => s.dayOfWeek === day && s.periodNumber === p.periodNumber);
                            return (
                              <td
                                key={day}
                                onClick={() => handleCellClick(day, p.periodNumber)}
                                className="border border-gray-200 p-3 text-center cursor-pointer hover:bg-indigo-50/30 transition-colors"
                              >
                                {cell && cell.teacherId ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs text-primary leading-tight">{cell.subjectName || '—'}</div>
                                    <div className="text-xxs text-gray-400">👨‍🏫 {cell.teacherName}</div>
                                    {cell.isRescheduled && (
                                      <span className="badge badge-warning text-xxs py-0.5 mt-0.5 inline-block">COVER ASSIGNED</span>
                                    )}
                                    {cell.remark && (
                                      <div
                                        title={cell.remark}
                                        className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] p-1 rounded mt-1 font-medium cursor-help"
                                      >
                                        ⚠️ {cell.remark.length > 30 ? cell.remark.slice(0, 30) + '...' : cell.remark}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xxs text-gray-300 italic py-2 hover:text-indigo-600">+ Assign</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">Please select a class/section above to manage its timetable schedule.</div>
              )}
            </div>
          </div>
        )}



        {/* Tab 3 Content */}
        {activeTab === 'substitutions' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <h3 className="font-display font-bold text-primary text-lg mb-2">Teacher Cover Requests & Remarks</h3>
              <p className="text-gray-400 text-xs mb-4">View notifications of schedule conflicts or teacher absences. Re-assign periods to free educators.</p>

              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleSelectAlert(alert)}
                    className={`p-4 border rounded-xl transition-all cursor-pointer ${selectedAlertItem?.id === alert.id ? 'border-primary bg-indigo-50/20 ring-1 ring-primary' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="badge badge-danger text-xxs mr-2">ABSENCE ALERT</span>
                        <span className="font-bold text-primary text-sm">{alert.className}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{alert.dayOfWeek} · Period {alert.periodNumber}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      Subject: <span className="font-semibold text-primary">{alert.subjectName}</span> · Current Teacher: <span className="font-semibold text-primary">{alert.teacherName}</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-2 rounded-lg font-medium flex items-center gap-1.5">
                      <span>⚠️ Teacher Remark:</span>
                      <span>"{alert.remark}"</span>
                    </div>
                  </div>
                ))}
                {activeAlerts.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">No teacher absence remarks or reschedule alerts posted.</div>
                )}
              </div>
            </div>

            {/* Substitution Actions */}
            <div className="card">
              <h3 className="font-display font-bold text-primary text-lg mb-1">Cover Re-assignment</h3>
              <p className="text-gray-400 text-xs mb-4">Select an alert to view free educators and schedule coverage.</p>

              {selectedAlertItem ? (
                <form onSubmit={handleConfirmSubstitute} className="space-y-4">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1 text-xs">
                    <div className="text-gray-400 uppercase tracking-wide font-bold">Reschedule Target</div>
                    <div className="font-semibold text-primary text-sm">{selectedAlertItem.className}</div>
                    <div className="text-gray-500">{selectedAlertItem.dayOfWeek} at Period {selectedAlertItem.periodNumber}</div>
                    <div className="text-gray-500">Subject: {selectedAlertItem.subjectName}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Free Substitute Teacher *</label>
                    <select
                      required
                      value={selectedSubTeacherId}
                      onChange={e => setSelectedSubTeacherId(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="">Choose Substitute</option>
                      {availableSubstitutes.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}{sub.department ? ` (${sub.department})` : ''}
                        </option>
                      ))}
                    </select>
                    {availableSubstitutes.length === 0 && (
                      <p className="text-xxs text-amber-600 font-semibold mt-1">⚠️ No other teachers are free during this period.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedSubTeacherId}
                    className="w-full btn-primary justify-center font-bold text-xs py-3 rounded-xl transition-all"
                  >
                    {loading ? 'Rescheduling...' : 'Confirm Substitution Cover'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-12 text-gray-300 italic text-xs">Please select an alert from the left panel to execute re-assignment.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid Cell Edit Modal */}
      {showCellModal && selectedCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">Schedule: Period {selectedCell.periodNo}</h3>
                <p className="text-blue-200 text-xxs">{selectedCell.day} weekly timetable configuration</p>
              </div>
              <button onClick={() => setShowCellModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{modalError}</div>}

              {/* Assignment Form */}
              <form onSubmit={handleSaveCell} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
                  <select 
                    value={cellForm.departmentName} 
                    onChange={e => setCellForm(f => ({ ...f, departmentName: e.target.value, subjectId: '', teacherId: '' }))}
                    className="input text-xs"
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                  <select 
                    value={cellForm.subjectId} 
                    onChange={e => setCellForm(f => ({ ...f, subjectId: e.target.value }))}
                    className="input text-xs"
                  >
                    <option value="">Free / Unassigned Period</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code && s.code.toUpperCase() !== s.name.toUpperCase().replace(/\s+/g, '') ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Teacher Assignment</label>
                  <select
                    value={cellForm.teacherId}
                    onChange={e => setCellForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="input text-xs"
                  >
                    <option value="">Free / Unassigned Period</option>
                    {(() => {
                      const filtered = teachers.filter(t => !cellForm.departmentName || t.department === cellForm.departmentName);
                      const list = filtered.length > 0 ? filtered : teachers;
                      return list.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.employeeId}){t.department ? ` - ${t.department}` : ''}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                <div className="flex justify-between gap-3 pt-2">
                  {selectedCell.item && (
                    <button
                      type="button"
                      onClick={handleClearSlot}
                      disabled={modalLoading}
                      className="btn-outline border-rose-200 text-rose-600 hover:bg-rose-50 text-xs py-2 px-4"
                    >
                      Clear Slot
                    </button>
                  )}
                  <div className="flex-1 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowCellModal(false)} className="btn-outline text-xs py-2">Cancel</button>
                    <button type="submit" disabled={modalLoading} className="btn-primary text-xs py-2">
                      {modalLoading ? 'Saving...' : 'Save Schedule'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Add Teacher Remark Section (if slot has schedule already) */}
              {selectedCell.item && (
                <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
                  <h4 className="font-semibold text-xs text-primary uppercase tracking-wide">⚠️ Teacher Remark / Reschedule Alert</h4>
                  <p className="text-xxs text-gray-400 leading-normal">Simulate a teacher absence notification or class warning alert to prompt school admin coverage workflows.</p>

                  <form onSubmit={handleCellAddRemark} className="flex gap-2">
                    <input
                      value={cellForm.remark}
                      onChange={e => setCellForm(f => ({ ...f, remark: e.target.value }))}
                      placeholder="e.g. Leave today - request cover"
                      className="input text-xs flex-1"
                    />
                    <button
                      type="submit"
                      disabled={modalLoading || !cellForm.remark}
                      className="btn-outline text-xs py-2 whitespace-nowrap"
                    >
                      Post Alert
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setup;
