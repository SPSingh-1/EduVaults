import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/apiClient';
import { Sparkles, CheckCircle2, AlertCircle, X, Pencil, UserCheck, Trash2, Calendar, Lock, Unlock } from 'lucide-react';
import { formatGrade, formatSection, formatClassLabel, sortClasses, sortGrades } from '../../../utils/classUtils';
import DateFilterInput from '../../../components/common/DateFilterInput';
import { useToast } from '../../../contexts/ToastContext';

const PromotionSetupTab = () => {
  const { toast } = useToast();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [executingBatch, setExecutingBatch] = useState(false);
  const [promoPromoteError, setPromoPromoteError] = useState('');

  const [promoStudents, setPromoStudents] = useState([]);
  const [promoClasses, setPromoClasses] = useState([]);
  const [promoClassSections, setPromoClassSections] = useState([]);
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [promoSearch, setPromoSearch] = useState('');
  const [promoDateFrom, setPromoDateFrom] = useState('');
  const [promoDateTo, setPromoDateTo] = useState('');
  const [promoSelectedClass, setPromoSelectedClass] = useState('');
  const [promoSelectedSection, setPromoSelectedSection] = useState('');
  const [promoSelectedStatus, setPromoSelectedStatus] = useState('');

  // Modals state for student promotion setup
  const [showPromoViewModal, setShowPromoViewModal] = useState(false);
  const [promoViewStudentData, setPromoViewStudentData] = useState(null);
  const [showPromoPromoteModal, setShowPromoPromoteModal] = useState(false);
  const [promoPromotingStudent, setPromoPromotingStudent] = useState(null);
  const [promoPromoteNextClassId, setPromoPromoteNextClassId] = useState('');
  const [promoPromoting, setPromoPromoting] = useState(false);

  // Academic Session Timeline & Batch Promotion State
  const [sessionTimeline, setSessionTimeline] = useState({
    currentAcademicSession: '2025-26',
    sessionStartDate: '2025-04-01',
    sessionEndDate: '2026-03-31',
    promotionOpensDate: '2026-03-15',
    nextAcademicSession: '2026-27',
    isPromotionWindowOpen: false,
    daysUntilOpens: 0,
    isScheduleLocked: false
  });
  const [sessionScheduleUnlocked, setSessionScheduleUnlocked] = useState(false);
  const [sessionScheduleOverrideReason, setSessionScheduleOverrideReason] = useState('');
  const [savingSession, setSavingSession] = useState(false);
  const [batchSourceClassId, setBatchSourceClassId] = useState('');
  const [batchTargetClassId, setBatchTargetClassId] = useState('');
  const [batchTargetYear, setBatchTargetYear] = useState('2026-27');
  const [batchPreview, setBatchPreview] = useState(null);
  const [loadingBatchPreview, setLoadingBatchPreview] = useState(false);
  const [selectedBatchStudentIds, setSelectedBatchStudentIds] = useState([]);
  const [batchAdminOverride, setBatchAdminOverride] = useState(false);
  const [batchOverrideReason, setBatchOverrideReason] = useState('');

  const normalizePromoClass = (cls) => {
    if (!cls) return '';
    return cls.toString().toLowerCase().replace(/\s+/g, '').replace(/^(class|grade)/, '');
  };

  const normalizePromoSection = (sec) => {
    if (!sec) return '';
    return sec.toString().toLowerCase().replace(/\s+/g, '').replace(/^section/, '');
  };

  const fetchPromotionSetupData = async () => {
    setLoadingPromo(true);
    try {
      const [studRes, classRes, secRes, sessionRes] = await Promise.all([
        apiClient.get('/academics/students'),
        apiClient.get('/academics/enrollment-classes'),
        apiClient.get('/academics/classes'),
        apiClient.get('/academics/academic-session').catch(() => ({ data: null }))
      ]);
      setPromoStudents(studRes.data || []);
      setPromoClasses(sortGrades(classRes.data || []));
      setPromoClassSections(sortClasses(secRes.data || []));
      if (sessionRes?.data) {
        setSessionTimeline(sessionRes.data);
        if (sessionRes.data.nextAcademicSession) {
          setBatchTargetYear(sessionRes.data.nextAcademicSession);
        }
      }
    } catch (err) {
      console.error('Error fetching promotion setup data:', err);
    } finally {
      setLoadingPromo(false);
    }
  };

  const handleSaveSessionTimeline = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccess('');

    if (!sessionTimeline.sessionStartDate || !sessionTimeline.sessionEndDate) {
      setError('Both Session Start Date and Session End Date are required.');
      return;
    }

    const start = new Date(sessionTimeline.sessionStartDate);
    const end = new Date(sessionTimeline.sessionEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please provide valid dates for Session Start and End.');
      return;
    }

    // Validation 1: End Date must be strictly after Start Date
    if (end <= start) {
      setError('Validation Error: Session End Date must be after Session Start Date (सत्र समाप्त होने की तारीख शुरू होने की तारीख के बाद होनी चाहिए).');
      return;
    }

    // Validation 2: Minimum 11 months gap
    const dayDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (dayDiff < 330 || monthDiff < 11) {
      setError(`Validation Error: Academic session must span at least 11 months (Current duration is only ${dayDiff} days / ${monthDiff} months. सत्र शुरू और समाप्त होने के बीच कम से कम 11 महीने का अंतर होना आवश्यक है).`);
      return;
    }

    // Validation 3: Promotion Window Opens Date
    if (sessionTimeline.promotionOpensDate) {
      const promo = new Date(sessionTimeline.promotionOpensDate);
      if (!isNaN(promo.getTime())) {
        const promoDaysFromStart = Math.round((promo - start) / (1000 * 60 * 60 * 24));
        if (promoDaysFromStart < 300) {
          setError('Validation Error: Promotion Window Opens Date must be towards the end of the session (at least 10 months after start date).');
          return;
        }
        if (promo > new Date(end.getTime() + 60 * 24 * 60 * 60 * 1000)) {
          setError('Validation Error: Promotion Window Opens Date cannot exceed 60 days after Session End Date.');
          return;
        }
      }
    }

    // Validation 4: Edit Protection (If schedule is locked, require reason)
    if (sessionTimeline.isScheduleLocked && sessionScheduleUnlocked) {
      if (!sessionScheduleOverrideReason || sessionScheduleOverrideReason.trim().length < 5) {
        setError('Please provide a descriptive reason (minimum 5 characters) for modifying an active, locked academic session schedule.');
        return;
      }
    }

    setSavingSession(true);
    try {
      const res = await apiClient.post('/academics/academic-session', {
        currentAcademicSession: sessionTimeline.currentAcademicSession,
        sessionStartDate: sessionTimeline.sessionStartDate,
        sessionEndDate: sessionTimeline.sessionEndDate,
        promotionOpensDate: sessionTimeline.promotionOpensDate,
        nextAcademicSession: sessionTimeline.nextAcademicSession,
        adminOverride: sessionScheduleUnlocked,
        overrideReason: sessionScheduleOverrideReason
      });
      setSuccess(res.data?.message || 'Academic Session Timeline saved & locked successfully!');
      if (res.data) {
        setSessionTimeline(s => ({ ...s, ...res.data }));
      }
      setSessionScheduleUnlocked(false);
      setSessionScheduleOverrideReason('');
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save academic session timeline.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleFetchBatchPreview = async (classId) => {
    setBatchSourceClassId(classId);
    if (!classId) {
      setBatchPreview(null);
      setSelectedBatchStudentIds([]);
      return;
    }
    setLoadingBatchPreview(true);
    setBatchResult(null);
    try {
      const res = await apiClient.get(`/academics/classes/${classId}/batch-promotion-preview`);
      setBatchPreview(res.data);
      // Auto-select all eligible (passed 40%+, active, no TC) students
      const eligibleIds = (res.data?.students || [])
        .filter(s => s.eligibleForAutoPromote)
        .map(s => s.id);
      setSelectedBatchStudentIds(eligibleIds);

      // Auto deduce target class (next grade, same section)
      const currentGradeRaw = String(res.data.grade || '').trim();
      const currentGradeClean = currentGradeRaw.toLowerCase().replace(/^(class\s+|grade\s+)+/gi, '').trim();
      let nextGradeToMatch = null;
      if (currentGradeClean.includes('play') || currentGradeClean === 'pg') nextGradeToMatch = 'nursery';
      else if (currentGradeClean.includes('nur')) nextGradeToMatch = 'lkg';
      else if (currentGradeClean.includes('lkg')) nextGradeToMatch = 'ukg';
      else if (currentGradeClean.includes('ukg') || currentGradeClean.includes('kg')) nextGradeToMatch = '1';
      else {
        const currentGradeNum = parseInt(currentGradeClean, 10);
        if (!isNaN(currentGradeNum) && currentGradeNum < 12) {
          nextGradeToMatch = String(currentGradeNum + 1);
        }
      }

      if (nextGradeToMatch) {
        const targetSection = (res.data.section || 'A').replace(/^Section\s+/i, '').trim().toUpperCase();
        const match = promoClassSections.find(c => {
          const g = String(c.grade || '').toLowerCase().replace(/^(class\s+|grade\s+)+/gi, '').trim();
          const s = String(c.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
          return g === nextGradeToMatch && s === targetSection;
        }) || promoClassSections.find(c => {
          const g = String(c.grade || '').toLowerCase().replace(/^(class\s+|grade\s+)+/gi, '').trim();
          return g === nextGradeToMatch;
        });
        if (match) {
          setBatchTargetClassId(match.id);
        }
      }
    } catch (err) {
      console.error('Failed to load batch promotion preview:', err);
    } finally {
      setLoadingBatchPreview(false);
    }
  };

  const handleExecuteBatchPromote = async () => {
    if (!batchSourceClassId || !batchTargetClassId || selectedBatchStudentIds.length === 0) {
      toast.warning('Please select source class, target class, and at least 1 student to promote.');
      return;
    }

    setExecutingBatch(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post(`/academics/classes/${batchSourceClassId}/batch-promote`, {
        targetClassId: batchTargetClassId,
        targetAcademicYear: batchTargetYear,
        studentIds: selectedBatchStudentIds,
        adminOverride: batchAdminOverride,
        overrideReason: batchOverrideReason
      });
      setSuccess(res.data?.message || 'Students batch-promoted successfully!');
      setBatchResult(res.data);
      handleFetchBatchPreview(batchSourceClassId);
      fetchPromotionSetupData();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute batch promotion.');
    } finally {
      setExecutingBatch(false);
    }
  };

  const handlePromoViewClick = async (id) => {
    try {
      const res = await apiClient.get(`/academics/students/${id}`);
      setPromoViewStudentData(res.data);
      setShowPromoViewModal(true);
    } catch (err) {
      console.error("Error fetching student profile:", err);
    }
  };

  const handlePromoPromoteClick = (student) => {
    setPromoPromotingStudent(student);
    setPromoPromoteError('');
    
    const currentGradeStr = student.class.replace('Class ', '').trim();
    const currentGradeNum = parseInt(currentGradeStr, 10);
    if (!isNaN(currentGradeNum)) {
      const nextGradeNum = currentGradeNum + 1;
      const targetSection = student.section || 'Section A';
      
      const match = promoClassSections.find(
        c => String(c.grade) === String(nextGradeNum) && c.section === targetSection
      );
      
      if (match) {
        setPromoPromoteNextClassId(match.id);
      } else {
        const fallback = promoClassSections.find(c => String(c.grade) === String(nextGradeNum));
        setPromoPromoteNextClassId(fallback ? fallback.id : '');
      }
    } else {
      setPromoPromoteNextClassId('');
    }
    
    setShowPromoPromoteModal(true);
  };

  const handlePromoPromoteSubmit = async () => {
    if (!promoPromoteNextClassId || !promoPromotingStudent) return;
    setPromoPromoting(true);
    setPromoPromoteError('');
    try {
      await apiClient.post(`/academics/students/${promoPromotingStudent.id}/promote`, {
        nextClassId: promoPromoteNextClassId
      });
      setShowPromoPromoteModal(false);
      fetchPromotionSetupData();
    } catch (err) {
      setPromoPromoteError(err.response?.data?.error || 'Failed to promote student.');
    } finally {
      setPromoPromoting(false);
    }
  };

  const handlePromoDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this student profile?')) {
      try {
        await apiClient.delete(`/academics/students/${id}`);
        fetchPromotionSetupData();
      } catch (err) {
        console.error('Error deleting student profile:', err);
      }
    }
  };

  useEffect(() => {
    fetchPromotionSetupData();
  }, []);

  const promoUniqueSections = [...new Set(promoClassSections.map(c => c.section))].filter(Boolean).sort();
  const promoUniqueGrades = sortGrades([...new Set(promoClassSections.map(c => c.grade))].filter(Boolean));
  const filteredPromo = promoStudents.filter(s => {
    const nameStr = s.name || '';
    const matchesName = !promoSearch || nameStr.toLowerCase().includes(promoSearch.toLowerCase());
    const matchesClass = !promoSelectedClass || normalizePromoClass(s.class) === normalizePromoClass(promoSelectedClass);
    const matchesSection = !promoSelectedSection || normalizePromoSection(s.section) === normalizePromoSection(promoSelectedSection);
    const statusStr = s.status || '';
    const matchesStatus = !promoSelectedStatus || statusStr.toUpperCase() === promoSelectedStatus.toUpperCase();

    if (promoDateFrom) {
      const from = new Date(promoDateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(s.createdAt) < from) return false;
    }
    if (promoDateTo) {
      const to = new Date(promoDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(s.createdAt) > to) return false;
    }

    return matchesName && matchesClass && matchesSection && matchesStatus;
  });

  const sc = { ACTIVE: 'badge-success', WITHDRAWN: 'badge-gray', SUSPENDED: 'badge-danger' };

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold rounded-xl p-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold rounded-xl p-4 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-emerald-400 hover:text-emerald-600 font-bold ml-2">✕</button>
        </div>
      )}

            <div className="space-y-6">
              {/* Card 1: Academic Session & Promotion Timeline Setup */}
              <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>Academic Session & Promotion Timeline</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure your school's annual session cycle. One-Click Batch Promotion remains locked until the promotion window opens.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {sessionTimeline.isScheduleLocked && (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full shadow-xs">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Schedule Active & Locked</span>
                      </span>
                    )}
                    {sessionTimeline.isPromotionWindowOpen ? (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full shadow-xs">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Promotion Window OPEN</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full shadow-xs">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Promotion Window LOCKED ({sessionTimeline.daysUntilOpens > 0 ? `Opens in ${sessionTimeline.daysUntilOpens} days` : 'Before Window Date'})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration / Gap Visual Meter */}
                {(() => {
                  const s = sessionTimeline.sessionStartDate ? new Date(sessionTimeline.sessionStartDate) : null;
                  const e = sessionTimeline.sessionEndDate ? new Date(sessionTimeline.sessionEndDate) : null;
                  const hasBoth = s && e && !isNaN(s.getTime()) && !isNaN(e.getTime());
                  const days = hasBoth ? Math.round((e - s) / (1000 * 60 * 60 * 24)) : null;
                  const months = hasBoth ? Math.round(days / 30.4) : null;
                  const isValidGap = days !== null && days >= 330 && e > s;

                  return (
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs px-3 py-2 bg-gray-50/80 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">Annual Session Duration:</span>
                        {hasBoth ? (
                          isValidGap ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">
                              ✓ {months} Months ({days} Days) — Valid Academic Session
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 text-[11px]">
                              ⚠️ {days < 0 ? 'Invalid: End Date is before Start Date' : `${months} Months (${days} Days) — Minimum 11 months (~330 days) required!`}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">Set Start and End dates to calculate session span</span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">Standard CBSE / State Board Cycle: 12 Months</span>
                    </div>
                  );
                })()}

                {/* Lock banner & Emergency Override Controls */}
                {sessionTimeline.isScheduleLocked && !sessionScheduleUnlocked && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        <strong>Timeline Protection Active:</strong> To avoid accidental disruption to student exams and fee collection, this session schedule is locked.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSessionScheduleUnlocked(true)}
                      className="btn-outline text-xs px-3 py-1.5 font-bold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100/80 rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock to Edit (Admin Override)</span>
                    </button>
                  </div>
                )}

                {/* Emergency Override Input Box */}
                {sessionTimeline.isScheduleLocked && sessionScheduleUnlocked && (
                  <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>School Admin Emergency Override Mode Active</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSessionScheduleUnlocked(false);
                          setSessionScheduleOverrideReason('');
                        }}
                        className="text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                      >
                        Cancel & Keep Locked
                      </button>
                    </div>
                    <p className="text-amber-800 text-xxs leading-relaxed">
                      You are editing an active academic session schedule. Changes to dates directly affect batch promotion gates and fee structures. A mandatory reason is required for audit logs.
                    </p>
                    <div>
                      <label className="block font-bold text-amber-900 mb-1">
                        Mandatory Reason for Editing Active Schedule *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. State Govt / Education Board notification for session date extension"
                        value={sessionScheduleOverrideReason}
                        onChange={e => setSessionScheduleOverrideReason(e.target.value)}
                        className="input text-xs w-full py-2 px-3 bg-white border border-amber-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                {(() => {
                  const isFieldsDisabled = sessionTimeline.isScheduleLocked && !sessionScheduleUnlocked;
                  const minEnd = sessionTimeline.sessionStartDate ? (() => {
                    const d = new Date(sessionTimeline.sessionStartDate);
                    if (isNaN(d.getTime())) return '';
                    d.setMonth(d.getMonth() + 11);
                    return d.toISOString().split('T')[0];
                  })() : '';

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Current Session</label>
                        <input
                          type="text"
                          placeholder="e.g. 2025-26"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.currentAcademicSession || ''}
                          onChange={e => setSessionTimeline(s => ({ ...s, currentAcademicSession: e.target.value }))}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl font-semibold ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Session Start Date</label>
                        <input
                          type="date"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.sessionStartDate ? sessionTimeline.sessionStartDate.split('T')[0] : ''}
                          onChange={e => {
                            const newStart = e.target.value;
                            setSessionTimeline(s => {
                              let updatedEnd = s.sessionEndDate;
                              if (newStart) {
                                const d = new Date(newStart);
                                d.setFullYear(d.getFullYear() + 1);
                                d.setDate(d.getDate() - 1);
                                updatedEnd = d.toISOString().split('T')[0];
                              }
                              return { ...s, sessionStartDate: newStart, sessionEndDate: updatedEnd };
                            });
                          }}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Session End Date <span className="text-gray-400 font-normal">(Min +11 mo)</span>
                        </label>
                        <input
                          type="date"
                          disabled={isFieldsDisabled}
                          min={minEnd}
                          value={sessionTimeline.sessionEndDate ? sessionTimeline.sessionEndDate.split('T')[0] : ''}
                          onChange={e => setSessionTimeline(s => ({ ...s, sessionEndDate: e.target.value }))}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Promotion Window Opens</label>
                        <input
                          type="date"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.promotionOpensDate ? sessionTimeline.promotionOpensDate.split('T')[0] : ''}
                          onChange={e => setSessionTimeline(s => ({ ...s, promotionOpensDate: e.target.value }))}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Next Session (Target)</label>
                        <input
                          type="text"
                          placeholder="e.g. 2026-27"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.nextAcademicSession || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setSessionTimeline(s => ({ ...s, nextAcademicSession: val }));
                            setBatchTargetYear(val);
                          }}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl font-semibold ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                  <span className="text-[11px] text-gray-500">
                    💡 <em>Mid-session batch promotions remain strictly locked until the Promotion Window Opens date to safeguard against premature grade advancement.</em>
                  </span>

                  {(!sessionTimeline.isScheduleLocked || sessionScheduleUnlocked) && (
                    <button
                      type="button"
                      onClick={handleSaveSessionTimeline}
                      disabled={savingSession}
                      className="btn-primary text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs hover:shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{savingSession ? 'Saving Timeline...' : 'Save & Lock Session Schedule'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: 1-Click Smart Class Batch Promotion Dashboard */}
              <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>1-Click Smart Class Batch Promotion</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Select a source class to automatically audit 40%+ final exam marks across subjects, calculate fee arrears rollover, and advance the whole class in a single click.
                    </p>
                  </div>
                </div>

                {/* Lock banner if promotion window is closed */}
                {!sessionTimeline.isPromotionWindowOpen && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Mid-Session Promotion Lock Active</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      The academic session is currently in progress. Normal batch promotion will automatically unlock on{' '}
                      <strong>{sessionTimeline.promotionOpensDate ? new Date(sessionTimeline.promotionOpensDate).toLocaleDateString() : 'session end'}</strong>.
                      This ensures no student is accidentally bumped to the next class during an ongoing academic term.
                    </p>
                    <div className="flex items-center gap-3 pt-1 border-t border-amber-200/60">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 select-none">
                        <input
                          type="checkbox"
                          checked={batchAdminOverride}
                          onChange={e => setBatchAdminOverride(e.target.checked)}
                          className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                        />
                        <span>School Admin Direct Emergency Override</span>
                      </label>
                      {batchAdminOverride && (
                        <input
                          type="text"
                          placeholder="State reason (e.g. Early Board transfer, Special batch)"
                          value={batchOverrideReason}
                          onChange={e => setBatchOverrideReason(e.target.value)}
                          className="input text-xs py-1 px-3 bg-white border border-amber-300 rounded-lg flex-1"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">1. Select Source Class</label>
                    <select
                      value={batchSourceClassId}
                      onChange={e => handleFetchBatchPreview(e.target.value)}
                      className="input text-xs font-semibold w-full py-2 px-3 bg-white border border-gray-200 rounded-xl"
                    >
                      <option value="">-- Choose Class to Promote --</option>
                      {sortClasses(promoClassSections).map(c => (
                        <option key={c.id} value={c.id}>
                          {formatGrade(c.grade)} - {formatSection(c.section)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">2. Target Destination Class</label>
                    <select
                      value={batchTargetClassId}
                      onChange={e => setBatchTargetClassId(e.target.value)}
                      className="input text-xs font-semibold w-full py-2 px-3 bg-white border border-gray-200 rounded-xl"
                    >
                      <option value="">-- Choose Target Next Class --</option>
                      {sortClasses(promoClassSections).map(c => (
                        <option key={c.id} value={c.id}>
                          {formatGrade(c.grade)} - {formatSection(c.section)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">3. Target Academic Session</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-27"
                      value={batchTargetYear}
                      onChange={e => setBatchTargetYear(e.target.value)}
                      className="input text-xs font-semibold w-full py-2 px-3 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Loading state */}
                {loadingBatchPreview && (
                  <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Auditing class students, final exam marks, and pending arrears...</span>
                  </div>
                )}

                {/* Batch Preview Results */}
                {batchPreview && !loadingBatchPreview && (
                  <div className="space-y-4">
                    {/* Stat Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-gray-500 block">Total Students in Class</span>
                        <strong className="text-base font-bold text-gray-900">{batchPreview.totalStudents}</strong>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-emerald-700 block">Eligible to Advance (40%+)</span>
                        <strong className="text-base font-bold text-emerald-700">{batchPreview.eligibleCount}</strong>
                      </div>
                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-amber-800 block">Review / Retain Required</span>
                        <strong className="text-base font-bold text-amber-800">{batchPreview.ineligibleCount}</strong>
                      </div>
                      <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-blue-700 block">Total Arrears to Rollover</span>
                        <strong className="text-base font-bold text-blue-800">₹{(batchPreview.totalClassArrears || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Table of Students */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              (batchPreview.students || []).length > 0 &&
                              selectedBatchStudentIds.length === (batchPreview.students || []).length
                            }
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedBatchStudentIds((batchPreview.students || []).map(s => s.id));
                              } else {
                                setSelectedBatchStudentIds([]);
                              }
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-bold text-gray-700">
                            Select All ({selectedBatchStudentIds.length} of {batchPreview.totalStudents} selected)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const eligibleOnly = (batchPreview.students || [])
                              .filter(s => s.eligibleForAutoPromote)
                              .map(s => s.id);
                            setSelectedBatchStudentIds(eligibleOnly);
                          }}
                          className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Select Only Eligible (Passed 40%+)
                        </button>
                      </div>

                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                              <th className="py-2.5 px-3 w-10"></th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Student Name & Roll No</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Final Exam Status</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Pending Fee Arrears</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Enrollment / TC</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Promotion Verdict</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(batchPreview.students || []).map(st => {
                              const isChecked = selectedBatchStudentIds.includes(st.id);
                              return (
                                <tr
                                  key={st.id}
                                  className={`hover:bg-gray-50/60 transition-colors ${
                                    st.eligibleForAutoPromote ? 'bg-white' : 'bg-amber-50/20'
                                  }`}
                                >
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedBatchStudentIds(prev => [...prev, st.id]);
                                        } else {
                                          setSelectedBatchStudentIds(prev => prev.filter(id => id !== st.id));
                                        }
                                      }}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-gray-800">{st.name}</div>
                                    <div className="text-[10px] text-gray-400">Roll: {st.rollNumber || 'N/A'}</div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {st.examStatus === 'PASSED' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ✓ Passed ({st.gpa?.toFixed(1) || '40%+'}%)
                                      </span>
                                    ) : st.examStatus === 'FAILED' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        ✗ Failed (&lt;40% in subjects)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                                        No Marks Recorded
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-700">
                                    {st.unpaidBalance > 0 ? (
                                      <span className="text-amber-700">₹{st.unpaidBalance.toLocaleString()} (Will Rollover)</span>
                                    ) : (
                                      <span className="text-emerald-700">₹0 (All Clear)</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {st.hasTC ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                        TC ISSUED
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        {st.enrollmentStatus || 'ACTIVE'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {st.eligibleForAutoPromote ? (
                                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                                        ✓ Ready to Promote
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 font-medium text-[11px]">
                                        {st.hasTC ? 'Blocked (TC Issued)' : 'Needs Retain / Review'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Batch Promotion Execution Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                      <div>
                        {!sessionTimeline.isPromotionWindowOpen && !batchAdminOverride ? (
                          <div className="text-xs text-amber-800 flex items-center gap-1.5 font-medium">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Execution locked until promotion window opens. Use Emergency Override if needed.</span>
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-700 font-medium">
                            ✨ Ready to advance {selectedBatchStudentIds.length} selected students to {promoClassSections.find(c => c.id === batchTargetClassId)?.grade ? formatGrade(promoClassSections.find(c => c.id === batchTargetClassId)?.grade) : 'Target Class'}.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteBatchPromote}
                        disabled={
                          executingBatch ||
                          selectedBatchStudentIds.length === 0 ||
                          (!sessionTimeline.isPromotionWindowOpen && !batchAdminOverride)
                        }
                        className="btn-primary text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {executingBatch
                            ? 'Processing Batch Promotion...'
                            : `🚀 Execute 1-Click Class Promotion (${selectedBatchStudentIds.length})`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Batch Result Report */}
                {batchResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Batch Promotion Completed Successfully!</span>
                    </div>
                    <div className="text-xs text-emerald-800 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>🎓 <strong>Promoted:</strong> {batchResult.promotedCount} Students</div>
                      <div>📋 <strong>Invoices Rolled Over:</strong> {batchResult.unpaidInvoicesRolledOver} Unpaid Invoices</div>
                      <div>📱 <strong>WhatsApp Alerts:</strong> Sent to registered parents</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Student Promotion Setup Directory (Individual Management) */}
              <div className="card">
                <h3 className="font-display font-bold text-primary text-lg mb-1 flex items-center gap-2">
                  🚀 Student Promotion Setup Directory
                </h3>
                <p className="text-xs text-gray-400 mb-4">Manage, filter, and manually advance student records across all grade levels.</p>

                <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-5">
                  <div className="flex-1 relative">
                    <input placeholder="Search students by name..." value={promoSearch} onChange={e => setPromoSearch(e.target.value)} className="input pl-9 text-sm" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <DateFilterInput label="From:" value={promoDateFrom} onChange={setPromoDateFrom} />
                    <DateFilterInput label="To:" value={promoDateTo} onChange={setPromoDateTo} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 shrink-0 w-full xl:w-auto">
                    <select className="input w-full text-xs sm:text-sm" value={promoSelectedClass} onChange={e => setPromoSelectedClass(e.target.value)}>
                      <option value="">Class All</option>
                      {promoUniqueGrades.map(grade => (
                        <option key={grade} value={grade}>{formatGrade(grade)}</option>
                      ))}
                    </select>

                    <select className="input w-full text-xs sm:text-sm" value={promoSelectedSection} onChange={e => setPromoSelectedSection(e.target.value)}>
                      <option value="">Section All</option>
                      {promoUniqueSections.map(sec => (
                        <option key={sec} value={sec}>{formatSection(sec)}</option>
                      ))}
                    </select>

                    <select className="input w-full text-xs sm:text-sm" value={promoSelectedStatus} onChange={e => setPromoSelectedStatus(e.target.value)}>
                      <option value="">Status All</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="WITHDRAWN">WITHDRAWN</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                {loadingPromo ? (
                  <div className="py-12 text-center text-gray-400 text-sm">Loading promotion directory...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Roll No</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Student Name</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Class</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Section</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Parent Name</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Contact</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPromo.map(s => (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-sm font-semibold text-primary">{s.rollNumber || 'N/A'}</td>
                            <td className="py-3.5 px-4 text-sm font-semibold text-gray-700">{s.name}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{formatGrade(s.class)}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{formatSection(s.section)}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{s.parentName || 'N/A'}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{s.parentPhone || 'N/A'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`badge ${sc[s.status] || 'badge-gray'}`}>{s.status}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handlePromoViewClick(s)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105" title="View Details">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button onClick={() => handlePromoPromoteClick(s)} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105" title="Promote Student">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                                  </svg>
                                </button>
                                <button onClick={() => handlePromoDeleteClick(s.id)} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105" title="Delete Profile">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredPromo.length === 0 && (
                          <tr>
                            <td colSpan="8" className="text-center py-6 text-gray-400 text-sm">No students found matching current filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );

      {/* Promotion setup: View Details Modal */}
      {showPromoViewModal && promoViewStudentData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Student Profile Details</h3>
                <p className="text-blue-200 text-xs">Profile overview for {promoViewStudentData.firstName} {promoViewStudentData.lastName}</p>
              </div>
              <button onClick={() => setShowPromoViewModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-5 text-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Student ID</div>
                  <div className="font-mono font-semibold text-primary">{promoViewStudentData.studentId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Status</div>
                  <div>
                    <span className="badge badge-success text-xs">
                      {promoViewStudentData.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Email Address</div>
                  <div className="text-primary font-medium">{promoViewStudentData.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Blood Group</div>
                  <div className="text-primary font-medium">{promoViewStudentData.bloodGroup || 'Not Specified'}</div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="font-semibold text-primary text-xs uppercase mb-3 tracking-wide">👪 Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Guardian Name</div>
                    <div className="text-primary font-medium">{promoViewStudentData.guardianName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Relationship</div>
                    <div className="text-primary font-medium">{promoViewStudentData.guardianRelationship}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Contact Number</div>
                    <div className="text-primary font-medium">{promoViewStudentData.guardianPhone}</div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Residential Address</div>
                <div className="text-primary font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">{promoViewStudentData.address || 'No address registered.'}</div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowPromoViewModal(false)} className="btn-primary text-xs py-2">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion setup: Promote Student Modal */}
      {showPromoPromoteModal && promoPromotingStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 shadow-2xl animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Promote Student</h3>
                <p className="text-blue-200 text-xs">Advance student to the next academic grade level</p>
              </div>
              <button onClick={() => setShowPromoPromoteModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-4">
              {promoPromoteError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{promoPromoteError}</div>}
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase mb-1">Student Details</div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="font-semibold text-primary">{promoPromotingStudent.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {promoPromotingStudent.studentId}</div>
                  <div className="text-xs text-gray-500 mt-1">Current Class: <span className="font-semibold text-primary">{promoPromotingStudent.class} - {promoPromotingStudent.section}</span></div>
                  <div className="text-xs mt-2 flex items-center gap-1.5">
                    <span>Exam Status:</span>
                    {promoPromotingStudent.finalResult === "Pass" ? (
                      <span className="badge badge-success text-[10px] py-0.5 px-2 font-bold">✅ Pass (GPA: {promoPromotingStudent.gpa})</span>
                    ) : promoPromotingStudent.finalResult === "Fail" ? (
                      <span className="badge badge-danger text-[10px] py-0.5 px-2 font-bold">⚠️ Fail (GPA: {promoPromotingStudent.gpa})</span>
                    ) : (
                      <span className="badge badge-gray text-[10px] py-0.5 px-2 font-bold">No Exam Records</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Promotion Class *</label>
                <select
                  value={promoPromoteNextClassId}
                  onChange={e => setPromoPromoteNextClassId(e.target.value)}
                  className="input w-full text-xs"
                  required
                >
                  <option value="">Select Target Class</option>
                  {promoClassSections.map(c => (
                    <option key={c.id} value={c.id}>
                      {formatClassLabel(c.grade, c.section)} {c.teacher ? `(Teacher: ${c.teacher})` : '(No Teacher)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button onClick={() => setShowPromoPromoteModal(false)} className="btn-outline text-xs">Cancel</button>
              <button
                onClick={handlePromoPromoteSubmit}
                disabled={promoPromoting || !promoPromoteNextClassId}
                className="btn-primary text-xs"
              >
                {promoPromoting ? 'Promoting...' : 'Promote Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromotionSetupTab;
