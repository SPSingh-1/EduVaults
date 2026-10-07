import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/apiClient';
import { Sparkles, CheckCircle2, AlertCircle, X, Edit2, Pencil, RefreshCw, Clock } from 'lucide-react';
import { formatGrade, formatSection, formatClassLabel } from '../../../utils/classUtils';
import { useToast } from '../../../contexts/ToastContext';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TimetableTab = ({ classes = [], subjects = [], teachers = [], departments = [], uniqueGradeClasses = [] }) => {
  const { toast } = useToast();
  const [periods, setPeriods] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [scheduleItems, setScheduleItems] = useState([]);
  const [selectedClassMappedSubjects, setSelectedClassMappedSubjects] = useState([]);
  
  const [showCellModal, setShowCellModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [cellForm, setCellForm] = useState({
    departmentName: '',
    subjectId: '',
    teacherId: '',
    remark: ''
  });

  const [showAiTimetableModal, setShowAiTimetableModal] = useState(false);
  const [aiTimetableScope, setAiTimetableScope] = useState('selected');
  const [aiGeneratingTimetable, setAiGeneratingTimetable] = useState(false);
  const [aiTimetableResult, setAiTimetableResult] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPeriods = async () => {
    try {
      const res = await apiClient.get('/academics/timetable/periods');
      setPeriods(res.data || []);
    } catch (err) {
      console.error('Error fetching periods:', err);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (uniqueGradeClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(uniqueGradeClasses[0].primaryClassId);
    }
  }, [uniqueGradeClasses, selectedClassId]);

  const fetchClassSchedule = async (classId) => {
    if (!classId) return;
    try {
      const [res, mappedRes] = await Promise.all([
        apiClient.get(`/academics/timetable/schedule/${classId}`),
        apiClient.get(`/academics/class-subjects/${classId}`).catch(() => ({ data: [] }))
      ]);
      setScheduleItems(res.data || []);
      setSelectedClassMappedSubjects(mappedRes.data || []);
    } catch (err) {
      console.error('Error fetching class schedule:', err);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchClassSchedule(selectedClassId);
    }
  }, [selectedClassId]);

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
      fetchPeriods();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save timetable periods.');
    } finally {
      setLoadingPeriods(false);
    }
  };

  const handleAutoSetupPeriods = async () => {
    const standardPeriods = [
      { periodNumber: 1, startTime: '08:30', endTime: '09:15', durationMinutes: 45 },
      { periodNumber: 2, startTime: '09:15', endTime: '10:00', durationMinutes: 45 },
      { periodNumber: 3, startTime: '10:15', endTime: '11:00', durationMinutes: 45 },
      { periodNumber: 4, startTime: '11:00', endTime: '11:45', durationMinutes: 45 },
      { periodNumber: 5, startTime: '12:15', endTime: '13:00', durationMinutes: 45 },
      { periodNumber: 6, startTime: '13:00', endTime: '13:45', durationMinutes: 45 }
    ];
    setLoadingPeriods(true);
    try {
      const res = await apiClient.post('/academics/timetable/periods', standardPeriods);
      setPeriods(res.data);
      setSuccess('⚡ Standard 6-period school schedule (08:30 - 13:45) configured successfully!');
      setTimeout(() => setSuccess(''), 5000);
      fetchPeriods();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to auto-setup standard periods.');
    } finally {
      setLoadingPeriods(false);
    }
  };

  const handleAutoFillClassTimetable = async () => {
    if (!selectedClassId) {
      toast.warning('Please select a class first.');
      return;
    }
    if (periods.length === 0) {
      toast.warning('Please configure periods first or click "⚡ Auto Standard 6 Periods".');
      return;
    }
    if (subjects.length === 0) {
      toast.warning('No subjects found. Please setup subjects in Infrastructure first.');
      return;
    }
    if (!window.confirm('Are you sure you want to auto-populate a sample Monday to Friday timetable schedule for this class?')) return;
    
    setLoading(true);
    try {
      const activeDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [selectedClassId];

      for (const cId of targetClassIds) {
        let subIdx = 0;
        let teacherIdx = 0;
        for (const day of activeDays) {
          for (const p of periods) {
            const sub = subjects[subIdx % subjects.length];
            const tchr = teachers.length > 0 ? teachers[teacherIdx % teachers.length] : null;
            subIdx++;
            if (teachers.length > 0) teacherIdx++;
            try {
              await apiClient.post('/academics/timetable/schedule', {
                classId: cId,
                dayOfWeek: day,
                periodNumber: p.periodNumber,
                subjectId: sub.id,
                teacherId: tchr ? tchr.id : null,
                remark: ''
              });
            } catch (err) {}
          }
        }
      }
      await fetchClassSchedule(selectedClassId);
      const gradeTitle = activeGradeGroup ? activeGradeGroup.formattedGrade : 'this class';
      const secNotice = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Synced across Sections: ${activeGradeGroup.sections.join(', ')})` : '';
      setSuccess(`🎉 Sample timetable schedule generated once for ${gradeTitle}${secNotice}!`);
      setTimeout(() => setSuccess(''), 6000);
    } catch (e) {
      setError('Could not auto-generate timetable.');
    } finally {
      setLoading(false);
    }
  };

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
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : (selectedClassId ? [selectedClassId] : []);

      for (const cId of targetClassIds) {
        await apiClient.post('/academics/timetable/schedule', {
          classId: cId,
          subjectId: isClearing ? null : cellForm.subjectId,
          customSubjectName: null,
          teacherId: isClearing ? null : cellForm.teacherId,
          periodNumber: selectedCell.periodNo,
          dayOfWeek: selectedCell.day
        });
      }

      if (selectedCell.item && cellForm.remark !== (selectedCell.item.remark || '')) {
        await apiClient.post(`/academics/timetable/remark/${selectedCell.item.id}`, {
          remark: cellForm.remark
        });
      }

      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
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
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : (selectedClassId ? [selectedClassId] : []);

      for (const cId of targetClassIds) {
        await apiClient.post('/academics/timetable/schedule', {
          classId: cId,
          subjectId: null,
          customSubjectName: null,
          teacherId: null,
          periodNumber: selectedCell.periodNo,
          dayOfWeek: selectedCell.day
        });
      }
      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
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
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to post remark.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleGenerateAiTimetable = async (forcedScope) => {
    const scopeToUse = forcedScope || aiTimetableScope || (selectedClassId ? 'selected' : 'all');
    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));

    if (scopeToUse !== 'all' && !selectedClassId) {
      toast.warning('Please select a class first or choose All Classes.');
      return;
    }

    if (scopeToUse !== 'all' && selectedClassId) {
      try {
        const checkRes = await apiClient.get(`/academics/class-subjects/${selectedClassId}`);
        if (!checkRes.data || checkRes.data.length === 0) {
          setSelectedClassMappedSubjects([]);
          const gradeTitle = activeGradeGroup?.formattedGrade || 'this class';
          const msg = `Please first map subjects with classes! No subjects are linked to ${gradeTitle} in 'Subjects Curriculum'. Due to this, the timetable cannot be created.`;
          toast.warning(msg);
          setError(msg);
          setShowAiTimetableModal(false);
          return;
        } else {
          setSelectedClassMappedSubjects(checkRes.data);
        }
      } catch (err) {
        console.warn('Could not pre-validate mapped subjects:', err);
      }
    }

    setAiGeneratingTimetable(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/academics/timetable/generate-ai', {
        classId: selectedClassId || null,
        scope: scopeToUse,
        overwrite: true
      });

      if (selectedClassId) {
        await fetchClassSchedule(selectedClassId);
      }
      setShowAiTimetableModal(false);

      const gradeTitle = activeGradeGroup?.formattedGrade || (classes.find(c => c.id === selectedClassId)?.grade ? formatGrade(classes.find(c => c.id === selectedClassId).grade) : 'Selected Class');
      const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';
      const scopeLabel = scopeToUse === 'all' ? 'All Classes' : `${gradeTitle}${secInfo}`;

      setAiTimetableResult({
        totalSlots: res.data.scheduledTotal,
        classesCount: res.data.classesCount,
        timestamp: new Date().toLocaleTimeString()
      });

      setSuccess(`🎉 AI Timetable successfully regenerated! ${res.data.scheduledTotal} periods scheduled for ${scopeLabel} with zero teacher clashes.`);
      setTimeout(() => setSuccess(''), 7000);
    } catch (err) {
      console.error('AI timetable error:', err);
      setError(err.response?.data?.error || 'AI Timetable generator encountered an error.');
    } finally {
      setAiGeneratingTimetable(false);
    }
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
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoSetupPeriods}
                    disabled={loadingPeriods}
                    className="btn-outline text-xxs py-1.5 px-3 border-amber-500/30 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold flex items-center gap-1"
                  >
                    ⚡ Auto Standard 6 Periods
                  </button>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-display font-bold text-primary text-lg">Weekly Class Timetable Scheduler</h3>
                  <p className="text-gray-400 text-xs">Configure subjects, times, and teacher assignments. Double-bookings are automatically prevented.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Selected Class:</label>
                  <select
                    value={(() => {
                      const active = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                      return active ? active.primaryClassId : selectedClassId;
                    })()}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="input flex-1 sm:w-60 text-sm font-semibold text-slate-800"
                  >
                    <option value="">Select Class</option>
                    {uniqueGradeClasses.map(g => (
                      <option key={g.formattedGrade} value={g.primaryClassId}>
                        {g.formattedGrade} {g.sections.length > 0 ? `(Sections: ${g.sections.join(', ')})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setAiTimetableScope(selectedClassId ? 'selected' : 'all');
                      setShowAiTimetableModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
                    title="Generate intelligent conflict-free timetable using AI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>🤖 AI Smart Timetable Generator</span>
                  </button>

                  {selectedClassId && (
                    <button
                      type="button"
                      onClick={() => handleGenerateAiTimetable('selected')}
                      disabled={aiGeneratingTimetable}
                      className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      title="Regenerate timetable for selected class"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${aiGeneratingTimetable ? 'animate-spin' : ''}`} />
                      <span>{aiGeneratingTimetable ? 'Regenerating...' : '🔄 Regenerate Class'}</span>
                    </button>
                  )}

                  {selectedClassId && (
                    <button
                      type="button"
                      onClick={handleClearAllTimetable}
                      disabled={loading || scheduleItems.length === 0}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Clear all timetable slots for selected class"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clear All Slots</span>
                    </button>
                  )}

                  {selectedClassId && (
                    <button
                      type="button"
                      onClick={handleAutoFillClassTimetable}
                      disabled={loading}
                      className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 transition"
                      title="Quick-fill sample schedule for this class"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Quick Sample</span>
                    </button>
                  )}

                  <a
                    href="/demo-templates/06_timetable_schedule_demo.csv"
                    download="06_timetable_schedule_demo.csv"
                    className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition"
                    title="Download Timetable CSV template"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Demo CSV</span>
                  </a>
                </div>
              </div>

              {selectedClassId ? (() => {
                const totalSlots = periods.length * days.length;
                const scheduledSlots = scheduleItems.filter(s => s.teacherId || (s.subjectName && s.subjectName !== 'Free Period')).length;
                const pct = totalSlots > 0 ? Math.round((scheduledSlots / totalSlots) * 100) : 0;
                const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                const activeGradeTitle = activeGradeGroup?.formattedGrade || 'This Class';

                return (
                  <div className="space-y-3">
                    {/* Notice if Class has No Subjects Mapped */}
                    {selectedClassMappedSubjects.length === 0 && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
                            ⚠️
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-extrabold text-amber-950 text-sm">
                                Subjects Not Mapped: Timetable Not Created
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                                Action Required
                              </span>
                            </div>
                            <p className="text-amber-900 text-xs mt-1 leading-relaxed">
                              No subjects are linked to <strong>{activeGradeTitle}</strong> in <em>Subjects Curriculum</em>. Due to this, the timetable schedule cannot be generated. Please first map subjects to this class.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setMappingClassId(selectedClassId);
                            setActiveTab('class-subjects');
                            fetchClassSubjectsData();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer shrink-0 hover:scale-105 active:scale-95 whitespace-nowrap"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>👉 Map Subjects for {activeGradeTitle}</span>
                        </button>
                      </div>
                    )}

                    {/* Status Strip & Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className={`w-2.5 h-2.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                          <span>Status: {scheduledSlots} / {totalSlots} Slots Scheduled ({pct}%)</span>
                        </div>
                        <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-600' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Subject Color Legend */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 font-medium">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Legend:</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Math
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Science
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> English
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Hindi
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Sports/PE
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-50 text-pink-800 border border-pink-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Art
                        </span>
                      </div>
                    </div>

                    {/* Timetable Grid Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
                      <table className="w-full min-w-[850px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                            <th className="p-3 text-center text-xs font-bold uppercase tracking-wider w-36 border-r border-slate-200">
                              Period / Time
                            </th>
                            {days.map(d => {
                              const dayCount = scheduleItems.filter(s => s.dayOfWeek === d && (s.teacherId || (s.subjectName && s.subjectName !== 'Free Period'))).length;
                              return (
                                <th key={d} className="p-3 text-center border-r border-slate-200 last:border-r-0 min-w-[170px]">
                                  <div className="flex items-center justify-between gap-1 px-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">{d}</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${dayCount > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'}`}>
                                        {dayCount}/{periods.length}
                                      </span>
                                    </div>
                                    {dayCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClearDayColumn(d);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-md transition-colors cursor-pointer"
                                        title={`Clear all periods on ${d}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {periods.map(p => {
                            const periodCount = scheduleItems.filter(s => s.periodNumber === p.periodNumber && (s.teacherId || (s.subjectName && s.subjectName !== 'Free Period'))).length;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                                {/* Period Row Header with quick clear */}
                                <td className="p-3 bg-slate-50/70 border-r border-slate-200 align-middle">
                                  <div className="flex items-center justify-between gap-1">
                                    <div>
                                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                                        <span>Period {p.periodNumber}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                                        <span>{p.startTime} - {p.endTime}</span>
                                      </div>
                                    </div>
                                    {periodCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClearPeriodRow(p.periodNumber);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-md transition-colors cursor-pointer"
                                        title={`Clear Period ${p.periodNumber} across all days`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Period Days Slots */}
                                {days.map(day => {
                                  const cell = scheduleItems.find(s => s.dayOfWeek === day && s.periodNumber === p.periodNumber);
                                  const isAssigned = cell && (cell.teacherId || (cell.subjectName && cell.subjectName !== 'Free Period'));
                                  const theme = isAssigned ? getSubjectTheme(cell.subjectName) : null;

                                  return (
                                    <td
                                      key={day}
                                      className="p-2 border-r border-slate-200 last:border-r-0 align-top transition-colors min-w-[170px]"
                                    >
                                      {isAssigned ? (
                                        <div
                                          onClick={() => handleCellClick(day, p.periodNumber)}
                                          className={`group/card relative p-2.5 rounded-xl border transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${theme.bg} ${theme.border}`}
                                        >
                                          {/* Hover quick clear button */}
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                            <button
                                              type="button"
                                              onClick={(e) => handleClearSingleSlot(e, day, p.periodNumber)}
                                              className="p-1 rounded-md bg-white/90 hover:bg-rose-100 text-slate-400 hover:text-rose-600 shadow-xs transition cursor-pointer"
                                              title="Clear this slot"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-1.5 pr-5">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                                            <span className={`font-bold text-xs leading-tight truncate ${theme.text}`}>
                                              {cell.subjectName || 'Subject'}
                                            </span>
                                          </div>

                                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-600 font-medium truncate">
                                            <span className="opacity-70">👤</span>
                                            <span className="truncate">{cell.teacherName || 'Unassigned'}</span>
                                          </div>

                                          {cell.isRescheduled && (
                                            <span className="mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-300">
                                              ⚡ COVER ASSIGNED
                                            </span>
                                          )}

                                          {cell.remark && (
                                            <div
                                              title={cell.remark}
                                              className="bg-rose-100/70 border border-rose-200/80 text-rose-700 text-[10px] p-1 rounded-md mt-1 font-medium truncate"
                                            >
                                              ⚠️ {cell.remark}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleCellClick(day, p.periodNumber)}
                                          className="w-full h-full min-h-[64px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 p-2 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer group/empty"
                                          title={`Click to schedule Period ${p.periodNumber} on ${day}`}
                                        >
                                          <span className="text-xs font-semibold group-hover/empty:scale-110 transition-transform">+ Assign</span>
                                        </button>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-12 text-gray-400 text-sm">Please select a class/section above to manage its timetable schedule.</div>
              )}
            </div>
          </div>


      {showCellModal && selectedCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">Schedule: Period {selectedCell.periodNo}</h3>
                {(() => {
                  const active = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                  const label = active ? active.formattedGrade : 'Class';
                  const sec = active && active.sections.length > 0 ? ` (Syncs to Sections: ${active.sections.join(', ')})` : '';
                  return <p className="text-blue-200 text-xxs">{selectedCell.day} • {label}{sec}</p>;
                })()}
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

      {showAiTimetableModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col">
            <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>🤖 AI Smart Timetable Generator</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Automated constraint-based timetable scheduling with zero teacher clashes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiTimetableModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Scheduling Scope:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="scope"
                      value="selected"
                      checked={aiTimetableScope === 'selected'}
                      onChange={e => setAiTimetableScope(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-bold text-gray-800">
                        {(() => {
                          const active = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                          const label = active ? active.formattedGrade : (classes.find(c => c.id === selectedClassId) ? formatGrade(classes.find(c => c.id === selectedClassId).grade) : 'Choose Class');
                          const sec = active && active.sections.length > 0 ? ` (Sections: ${active.sections.join(', ')})` : '';
                          return `Selected Class: ${label}${sec}`;
                        })()}
                      </div>
                      <div className="text-[11px] text-gray-400">Generates schedule once and syncs across all sections of this class without teacher clashes.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={aiTimetableScope === 'all'}
                      onChange={e => setAiTimetableScope(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-bold text-gray-800">Whole School Classes ({classes.length} Classes)</div>
                      <div className="text-[11px] text-gray-400">Globally balances all class timetables & prevents faculty double-booking.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-xl p-3.5 text-xs text-indigo-950 space-y-2">
                <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>AI Timetable Generator & Regeneration Rules:</span>
                </div>
                <div className="text-[11px] space-y-1.5 text-indigo-900">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Curriculum-Mapped Subjects Only:</strong> Schedules are strictly generated using only the subjects linked to each class in <em>Subjects Curriculum</em>.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Strict Faculty Preservation:</strong> The specific teacher assigned to each subject in Curriculum is strictly retained for all its scheduled periods.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">!</span>
                    <span><strong>Unmapped Class Validation:</strong> If no subjects are linked to a class, the AI will halt and notify: <em>"Please first map subjects with classes."</em></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span><strong>Free & Extra Periods:</strong> Any spare or open periods are automatically scheduled as <strong>Game / Physical Activity</strong> periods.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span><strong>Zero Clash Guarantee:</strong> Double-booking of any faculty across multiple classes or periods is strictly prevented.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAiTimetableModal(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleGenerateAiTimetable()}
                disabled={aiGeneratingTimetable}
                className="btn-primary text-xs px-5 py-2.5 font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{aiGeneratingTimetable ? 'AI Regenerating...' : '🔄 Regenerate AI Timetable Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default TimetableTab;
