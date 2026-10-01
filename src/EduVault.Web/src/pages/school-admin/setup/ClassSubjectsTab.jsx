import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/apiClient';
import { BookOpen, UserPlus, UserCheck, Trash2, Search, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatClassLabel } from '../../../utils/classUtils';

const ClassSubjectsTab = ({ classes = [], subjects = [], teachers = [], uniqueGradeClasses = [] }) => {
  const [classSubjectsList, setClassSubjectsList] = useState([]);
  const [mappingClassId, setMappingClassId] = useState('');
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingForm, setMappingForm] = useState({ subjectId: '', selectedSubjectIds: [], teacherId: '' });
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editingClassSubject, setEditingClassSubject] = useState(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ teacherId: '' });
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (uniqueGradeClasses.length > 0 && !mappingClassId) {
      setMappingClassId(uniqueGradeClasses[0].primaryClassId);
    }
  }, [uniqueGradeClasses, mappingClassId]);

  const fetchClassSubjects = async (classId) => {
    if (!classId) return;
    try {
      const res = await apiClient.get(`/academics/class-subjects/${classId}`);
      setClassSubjectsList(res.data);
    } catch (err) {
      console.error('Error fetching class subjects:', err);
    }
  };

  useEffect(() => {
    if (mappingClassId) {
      fetchClassSubjects(mappingClassId);
    }
  }, [mappingClassId]);

  const handleSaveClassSubject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const subjectsToLink = mappingForm.selectedSubjectIds && mappingForm.selectedSubjectIds.length > 0
      ? mappingForm.selectedSubjectIds
      : (mappingForm.subjectId ? [mappingForm.subjectId] : []);

    if (!mappingClassId || subjectsToLink.length === 0) {
      setError('Please select at least one subject to link.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [mappingClassId];
      let totalLinked = 0;

      for (const clsId of targetClassIds) {
        let existingIds = new Set();
        try {
          const res = await apiClient.get(`/academics/class-subjects/${clsId}`);
          existingIds = new Set((res.data || []).map(cs => cs.subjectId || cs.id));
        } catch (e) {
          existingIds = new Set((classSubjectsList || []).map(cs => cs.subjectId || cs.id));
        }

        for (const subId of subjectsToLink) {
          if (!existingIds.has(subId)) {
            try {
              await apiClient.post('/academics/class-subjects', {
                classId: clsId,
                subjectId: subId,
                teacherId: mappingForm.teacherId || null
              });
              totalLinked++;
            } catch (err) {}
          }
        }
      }

      const gradeTitle = activeGradeGroup?.formattedGrade || 'Class';
      const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';
      setSuccess(`🎉 Subject(s) saved once for ${gradeTitle}${secInfo} across all sections!`);
      setTimeout(() => setSuccess(''), 5000);
      setShowMappingModal(false);
      setMappingForm({ subjectId: '', selectedSubjectIds: [], teacherId: '' });
      fetchClassSubjects(mappingClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to map subject(s) to class.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditTeacher = (cs) => {
    setEditingClassSubject(cs);
    setEditTeacherForm({
      teacherId: cs.teacherId || ''
    });
    setShowEditTeacherModal(true);
  };

  const handleSaveEditTeacher = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingClassSubject || !mappingClassId) return;

    setSavingTeacher(true);
    setError('');
    setSuccess('');
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [mappingClassId];
      const teacherIdToSave = editTeacherForm.teacherId ? editTeacherForm.teacherId : null;

      for (const clsId of targetClassIds) {
        try {
          await apiClient.post('/academics/class-subjects', {
            classId: clsId,
            subjectId: editingClassSubject.subjectId,
            teacherId: teacherIdToSave
          });
        } catch (err) {
          console.error('Error updating class subject teacher:', err);
        }
      }

      const assignedTeacher = teachers.find(t => (t.id || t.Id) === teacherIdToSave);
      const gradeTitle = activeGradeGroup?.formattedGrade || 'Class';
      const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';

      if (assignedTeacher) {
        setSuccess(`🎉 Teacher "${assignedTeacher.name || assignedTeacher.Name}" assigned to ${editingClassSubject.subjectName} for ${gradeTitle}${secInfo}!`);
      } else {
        setSuccess(`Teacher unassigned from ${editingClassSubject.subjectName} for ${gradeTitle}${secInfo}.`);
      }
      setTimeout(() => setSuccess(''), 5000);
      setShowEditTeacherModal(false);
      setEditingClassSubject(null);
      await fetchClassSubjects(mappingClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update teacher assignment.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteClassSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to remove this subject from this class?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [mappingClassId];
      for (const clsId of targetClassIds) {
        try {
          await apiClient.delete(`/academics/class-subjects/${clsId}/${subjectId}`);
        } catch (e) {}
      }
      setSuccess('Subject mapping removed successfully across all sections!');
      fetchClassSubjects(mappingClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove subject mapping.');
    } finally {
      setLoading(false);
    }
  };

  const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));

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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Panel: Class Selector */}
              <div className="card md:col-span-1 h-fit">
                <h3 className="font-display font-bold text-primary text-base mb-2 flex items-center gap-2">
                  🏫 Select Class
                </h3>
                <p className="text-gray-400 text-xxs mb-4">Choose a class to view and map its subjects.</p>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {uniqueGradeClasses.map(g => {
                    const isActive = g.classIds.includes(mappingClassId);
                    return (
                      <button
                        key={g.formattedGrade}
                        onClick={() => setMappingClassId(g.primaryClassId)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-between ${isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/25'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-primary'
                          }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold truncate text-xs">{g.formattedGrade}</div>
                          {g.sections.length > 0 && (
                            <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                              Sections: {g.sections.join(', ')}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          Go
                        </span>
                      </button>
                    );
                  })}
                  {uniqueGradeClasses.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs italic">No classes found.</div>
                  )}
                </div>
              </div>

              {/* Right Panel: Class-Subjects Mapping */}
              <div className="card md:col-span-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                      📚 Subjects Curriculum
                    </h3>
                    <p className="text-gray-400 text-xs mt-1">
                      Manage subjects taught in <span className="font-semibold text-gray-700">{activeGradeGroup?.formattedGrade || 'the selected class'}</span>
                      {activeGradeGroup?.sections.length > 0 && (
                        <span className="ml-1 text-primary font-medium">(Syncs across Sections: {activeGradeGroup.sections.join(', ')})</span>
                      )}.
                    </p>
                  </div>

                  {mappingClassId && (
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleAutoMapStandardCurriculum}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
                        title="Auto-map age-appropriate standard curriculum for this class across all its sections"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>⚡ 1-Click Standard Curriculum</span>
                      </button>

                      <button
                        onClick={() => {
                          const existingSubjIds = (classSubjectsList || []).map(cs => cs.subjectId || cs.id);
                          setMappingForm({ subjectId: '', selectedSubjectIds: existingSubjIds, teacherId: '' });
                          setSubjectSearchQuery('');
                          setShowMappingModal(true);
                        }}
                        className="btn-primary text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5"
                      >
                        <span>+ Link Subject(s)</span>
                      </button>
                    </div>
                  )}
                </div>

              {mappingClassId ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Subject Code</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Subject Name</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Assigned Teacher</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSubjectsList.map(cs => (
                        <tr key={cs.subjectId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-sm font-semibold text-primary">
                            <span className="bg-primary/5 text-primary px-2.5 py-1 rounded-lg border border-primary/10 uppercase text-xs">
                              {cs.subjectCode || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-sm font-semibold text-gray-700">
                            {cs.subjectName}
                          </td>
                          <td className="py-3.5 px-4 text-sm text-gray-600 font-medium">
                            {cs.teacherName && cs.teacherName !== 'Unassigned' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacher(cs)}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 font-semibold transition-all cursor-pointer shadow-2xs"
                                title="Click to change teacher"
                              >
                                <span>👤 {cs.teacherName}</span>
                                <Pencil className="w-3 h-3 text-blue-400 group-hover:text-blue-700 transition-colors ml-0.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacher(cs)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 font-medium transition-all cursor-pointer"
                                title="Click to assign teacher"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                                <span>+ Assign Teacher</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacher(cs)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                title="Edit / Assign Teacher"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClassSubject(cs.subjectId)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Remove Subject"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {classSubjectsList.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-400 text-xs italic">
                            No subjects linked to this class yet. Click "+ Link Subject" to customize its curriculum.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  Select a class from the left panel to manage subjects.
                </div>
              )}
            </div>
          </div>

      {showMappingModal && mappingClassId && (() => {
        const currentClass = classes.find(c => c.id === mappingClassId);
        const existingSubjIds = new Set((classSubjectsList || []).map(cs => cs.subjectId || cs.id));
        const filteredSubjects = subjects.filter(s => {
          if (!subjectSearchQuery.trim()) return true;
          const q = subjectSearchQuery.toLowerCase();
          return s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
        });

        const toggleSubject = (id) => {
          setMappingForm(prev => {
            const cur = prev.selectedSubjectIds || [];
            if (cur.includes(id)) {
              return { ...prev, selectedSubjectIds: cur.filter(x => x !== id) };
            } else {
              return { ...prev, selectedSubjectIds: [...cur, id] };
            }
          });
        };

        const selectCoreSubjects = () => {
          const coreNames = ['hindi', 'english', 'mathematics', 'science', 'social'];
          const coreIds = subjects
            .filter(s => coreNames.some(cn => s.name?.toLowerCase().includes(cn)))
            .map(s => s.id);
          setMappingForm(prev => ({
            ...prev,
            selectedSubjectIds: Array.from(new Set([...(prev.selectedSubjectIds || []), ...coreIds]))
          }));
        };

        const selectAllFiltered = () => {
          setMappingForm(prev => ({
            ...prev,
            selectedSubjectIds: Array.from(new Set([...(prev.selectedSubjectIds || []), ...filteredSubjects.map(s => s.id)]))
          }));
        };

        const clearSelection = () => {
          setMappingForm(prev => ({ ...prev, selectedSubjectIds: [] }));
        };

        const selectedCount = (mappingForm.selectedSubjectIds || []).length;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <form onSubmit={handleSaveClassSubject} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col max-h-[90vh]">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-5 flex justify-between items-center text-white">
                <div>
                  {(() => {
                    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
                    const gradeTitle = activeGradeGroup ? activeGradeGroup.formattedGrade : formatClassLabel(currentClass?.grade, currentClass?.section);
                    const sectionsNote = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';
                    return (
                      <>
                        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Link Subject(s) to {gradeTitle}</span>
                        </h3>
                        <p className="text-slate-300 text-xxs mt-0.5">
                          Saving only once automatically syncs all selected subjects to {gradeTitle}{sectionsNote}!
                        </p>
                      </>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Search & Quick Action Chips */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={subjectSearchQuery}
                      onChange={e => setSubjectSearchQuery(e.target.value)}
                      placeholder="Search subject by name or code..."
                      className="input text-xs flex-1 py-1.5 px-3"
                    />
                    {subjectSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSubjectSearchQuery('')}
                        className="text-gray-400 hover:text-gray-600 text-xs px-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={selectCoreSubjects}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                    >
                      ⚡ + Core (Hindi, Eng, Math, Sci, SST)
                    </button>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition cursor-pointer"
                    >
                      Reset
                    </button>
                    <span className="ml-auto text-xxs font-semibold text-gray-500">
                      {selectedCount} Selected
                    </span>
                  </div>
                </div>

                {/* Multi-Select Subject Checkbox List */}
                <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {filteredSubjects.map(s => {
                    const isSelected = (mappingForm.selectedSubjectIds || []).includes(s.id);
                    const isAlreadyLinked = existingSubjIds.has(s.id);

                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                          isAlreadyLinked
                            ? 'bg-gray-50/80 opacity-70 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-50/50 hover:bg-indigo-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected || isAlreadyLinked}
                            disabled={isAlreadyLinked}
                            onChange={() => !isAlreadyLinked && toggleSubject(s.id)}
                            className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <span>{s.name}</span>
                              <span className="text-[10px] font-mono font-normal bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                {s.code}
                              </span>
                            </div>
                            {s.department && (
                              <div className="text-[10px] text-gray-400">{s.department}</div>
                            )}
                          </div>
                        </div>

                        {isAlreadyLinked ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            ✓ Linked
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                  {filteredSubjects.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 italic">No subjects match search.</div>
                  )}
                </div>

                {/* Optional Teacher Assignment */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assign Faculty Teacher (Optional)
                  </label>
                  <select
                    value={mappingForm.teacherId}
                    onChange={e => setMappingForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="input text-xs"
                  >
                    <option value="">Leave Unassigned (Assign Later)</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.department ? `(${t.department})` : ''} - {t.employeeId}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    If you do not wish to assign a teacher right now, leave as "Leave Unassigned". You can assign a teacher at any time.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedCount === 0}
                  className="btn-primary text-xs px-5 py-2 font-bold disabled:opacity-50"
                >
                  {loading ? 'Linking...' : `Link ${selectedCount} Subject(s) to Class`}
                </button>
              </div>
            </form>
          </div>
        );
      })()}


      {showEditTeacherModal && editingClassSubject && (() => {
        const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
        const gradeTitle = activeGradeGroup?.formattedGrade || 'Class';
        const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <form onSubmit={handleSaveEditTeacher} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-5 flex justify-between items-center text-white">
                <div>
                  <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-400" />
                    <span>Assign / Change Teacher</span>
                  </h3>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {gradeTitle}{secInfo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditTeacherModal(false)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Subject Details Box */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xxs font-bold text-gray-400 uppercase tracking-wider">Subject</div>
                    <div className="text-sm font-bold text-gray-800 mt-0.5">{editingClassSubject.subjectName}</div>
                  </div>
                  <span className="bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg border border-primary/20 uppercase text-xs">
                    {editingClassSubject.subjectCode || 'N/A'}
                  </span>
                </div>

                {/* Current Assignment Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Current Assignment
                  </label>
                  <div className="text-xs">
                    {editingClassSubject.teacherName && editingClassSubject.teacherName !== 'Unassigned' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                        👤 {editingClassSubject.teacherName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 italic">
                        No teacher currently assigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Teacher Dropdown Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Select Teacher to Assign
                  </label>
                  <select
                    value={editTeacherForm.teacherId}
                    onChange={e => setEditTeacherForm({ teacherId: e.target.value })}
                    className="input text-xs sm:text-sm w-full py-2.5"
                    autoFocus
                  >
                    <option value="">-- None / Unassigned (Remove Teacher) --</option>
                    {teachers.map(t => (
                      <option key={t.id || t.Id} value={t.id || t.Id}>
                        {t.name || t.Name} {t.department ? `(${t.department})` : ''} {t.employeeId ? `[ID: ${t.employeeId}]` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-2">
                    💡 Assigning or changing a teacher automatically syncs across all sections of this class.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowEditTeacherModal(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  {editTeacherForm.teacherId && (
                    <button
                      type="button"
                      onClick={() => setEditTeacherForm({ teacherId: '' })}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline px-2 py-1"
                    >
                      Clear Selection
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingTeacher}
                    className="btn-primary text-xs px-5 py-2 font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingTeacher ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Save Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        );
      })()}
    </>
  );
};

export default ClassSubjectsTab;
