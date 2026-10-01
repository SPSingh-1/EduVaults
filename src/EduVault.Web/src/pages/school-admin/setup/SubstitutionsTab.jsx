import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/apiClient';
import { Sparkles, CheckCircle2, AlertCircle, X, Clock, RefreshCw } from 'lucide-react';
import { formatClassLabel } from '../../../utils/classUtils';
import { useToast } from '../../../contexts/ToastContext';

const SubstitutionsTab = ({ classes = [], subjects = [], teachers = [] }) => {
  const { toast } = useToast();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedAlertItem, setSelectedAlertItem] = useState(null);
  const [availableSubstitutes, setAvailableSubstitutes] = useState([]);
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState('');
  const [absentTeacherId, setAbsentTeacherId] = useState('');
  const [aiAbsencePlans, setAiAbsencePlans] = useState([]);
  const [aiAnalyzingAbsence, setAiAnalyzingAbsence] = useState(false);
  const [submittingAiCover, setSubmittingAiCover] = useState(false);
  const [whatsAppPreviewData, setWhatsAppPreviewData] = useState(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchActiveAlerts = async () => {
    try {
      const res = await apiClient.get('/academics/timetable/remarks');
      setActiveAlerts(res.data);
    } catch (err) {
      console.error('Error fetching teacher remarks:', err);
    }
  };

  useEffect(() => {
    fetchActiveAlerts();
  }, []);

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
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reassign substitute.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeTeacherAbsence = async (teacherId) => {
    if (!teacherId) {
      setAbsentTeacherId('');
      setAiAbsencePlans([]);
      return;
    }
    setAbsentTeacherId(teacherId);
    setAiAnalyzingAbsence(true);
    try {
      const absentTeacher = teachers.find(t => t.id === teacherId);
      const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
      const dayToInspect = todayDayName === 'Sunday' || todayDayName === 'Saturday' ? 'Monday' : todayDayName;

      const affectedSlots = [];
      const allClassSchedules = [];

      for (const c of classes) {
        try {
          const res = await apiClient.get(`/academics/timetable/schedule/${c.id}`);
          const items = res.data || [];
          allClassSchedules.push({ class: c, items });
          items.forEach(slot => {
            if (slot.dayOfWeek === dayToInspect && slot.teacherId === teacherId) {
              const subjObj = subjects.find(s => s.id === slot.subjectId);
              affectedSlots.push({
                slotId: slot.id,
                classId: c.id,
                className: formatClassLabel(c.grade, c.section),
                dayOfWeek: slot.dayOfWeek,
                periodNumber: slot.periodNumber,
                subjectId: slot.subjectId,
                subjectName: subjObj?.name || 'Subject',
                subjectDepartment: subjObj?.department || ''
              });
            }
          });
        } catch (e) {}
      }

      const plans = affectedSlots.map(slot => {
        const busyTeacherIds = new Set();
        allClassSchedules.forEach(({ items }) => {
          items.forEach(s => {
            if (s.dayOfWeek === slot.dayOfWeek && s.periodNumber === slot.periodNumber && s.teacherId) {
              busyTeacherIds.add(s.teacherId);
            }
          });
        });

        const freeEducators = teachers.filter(t => t.id !== teacherId && !busyTeacherIds.has(t.id));
        const deptEducator = freeEducators.find(t => t.department && slot.subjectDepartment && t.department.toLowerCase() === slot.subjectDepartment.toLowerCase());
        const selectedCover = deptEducator || freeEducators[0] || null;

        return {
          ...slot,
          freeTeachers: freeEducators,
          assignedCoverTeacherId: selectedCover?.id || '',
          assignedCoverTeacherName: selectedCover?.name || 'Unassigned',
          coverTeacherPhone: selectedCover?.phone || '9876543210'
        };
      });

      setAiAbsencePlans(plans);
    } catch (err) {
      console.error('Error analyzing absence:', err);
    } finally {
      setAiAnalyzingAbsence(false);
    }
  };

  const handleExecuteAiSubstitution = async (planItem) => {
    if (!planItem.assignedCoverTeacherId) {
      toast.warning('Please select a substitute teacher for this period.');
      return;
    }
    setSubmittingAiCover(true);
    setError('');
    setSuccess('');
    try {
      const coverTeacher = teachers.find(t => t.id === planItem.assignedCoverTeacherId);
      const absentTeacher = teachers.find(t => t.id === absentTeacherId);

      await apiClient.post(`/academics/timetable/reassign/${planItem.slotId}`, {
        teacherId: planItem.assignedCoverTeacherId,
        remark: `Substitution: Covering for ${absentTeacher?.name || 'Absent Faculty'}`
      });

      try {
        await apiClient.post('/notifications', {
          recipientId: planItem.assignedCoverTeacherId,
          title: `⚠️ Substitution Notice: Period ${planItem.periodNumber}`,
          message: `You have been assigned to cover Period ${planItem.periodNumber} (${planItem.subjectName}) for ${planItem.className} today in place of ${absentTeacher?.name || 'faculty member'}.`,
          type: 'SUBSTITUTION'
        });
      } catch (e) {}

      const timeStr = 'During standard period slot';
      const whatsAppMsg = `🏫 *EduVault School - Substitution Alert*\n━━━━━━━━━━━━━━━━━━━━\nNamaste *${coverTeacher?.name || 'Educator'}*,\nToday *${absentTeacher?.name || 'Faculty'}* is on leave.\nYou have been assigned as the substitute teacher for:\n📚 *Subject:* ${planItem.subjectName}\n👥 *Class:* ${planItem.className}\n⏰ *Period:* Period ${planItem.periodNumber} (${timeStr})\n🚪 *Classroom:* Room 3\n\nPlease supervise this class and mark attendance on EduVault.\n- *Academic Office*`;

      setWhatsAppPreviewData({
        teacherName: coverTeacher?.name || 'Educator',
        phone: planItem.coverTeacherPhone || coverTeacher?.phone || '9876543210',
        message: whatsAppMsg
      });

      setSuccess(`🎉 Substitution confirmed for ${planItem.className} (Period ${planItem.periodNumber})! In-app notification dispatched.`);
      setAiAbsencePlans(prev => prev.filter(p => p.slotId !== planItem.slotId));
      fetchActiveAlerts();
      setShowWhatsAppModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply substitution.');
    } finally {
      setSubmittingAiCover(false);
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
            {/* AI Smart Absenteeism Cover & WhatsApp Engine */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-lg border border-indigo-800/40">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>🤖 AI Smart Teacher Absenteeism & WhatsApp Substitution Engine</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    When a teacher is absent, AI scans all their scheduled periods for the day, auto-detects free teachers, reassigns coverage, and dispatches in-app and WhatsApp notifications.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-xs font-bold text-amber-300 whitespace-nowrap">Absent Educator:</span>
                    <select
                      value={absentTeacherId}
                      onChange={e => handleAnalyzeTeacherAbsence(e.target.value)}
                      className="bg-slate-800 text-white font-semibold text-xs rounded-lg px-2.5 py-1 border border-white/20 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">Select Absent Teacher...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.department || 'Faculty'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Absence Analysis Results */}
              {aiAnalyzingAbsence && (
                <div className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-amber-300 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>AI analyzing today's timetable periods & free teacher availability...</span>
                </div>
              )}

              {absentTeacherId && !aiAnalyzingAbsence && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold text-white">
                      Affected Teaching Periods for {teachers.find(t => t.id === absentTeacherId)?.name}: ({aiAbsencePlans.length} Classes Found Today)
                    </span>
                    <span className="text-amber-400 text-xxs font-semibold">⚡ AI Auto-Matched Free Period Faculty</span>
                  </div>

                  {aiAbsencePlans.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-400 italic">
                      No scheduled teaching periods found for this teacher today.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiAbsencePlans.map((plan, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-white/10 border border-white/15 flex flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] uppercase">
                                Period {plan.periodNumber} ({plan.dayOfWeek})
                              </span>
                              <h4 className="font-bold text-sm text-white mt-1.5">{plan.className}</h4>
                              <p className="text-xxs text-slate-300">
                                Subject: <span className="font-semibold text-indigo-300">{plan.subjectName}</span>
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-xxs text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                                {plan.freeTeachers.length} Teachers Free
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] text-slate-400 mb-0.5">AI Proposed Substitute:</label>
                              <select
                                value={plan.assignedCoverTeacherId}
                                onChange={e => {
                                  const val = e.target.value;
                                  setAiAbsencePlans(prev => prev.map((p, i) => i === idx ? {
                                    ...p,
                                    assignedCoverTeacherId: val,
                                    assignedCoverTeacherName: teachers.find(t => t.id === val)?.name || 'Unassigned',
                                    coverTeacherPhone: teachers.find(t => t.id === val)?.phone || '9876543210'
                                  } : p));
                                }}
                                className="w-full bg-slate-900 border border-white/20 text-white text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none"
                              >
                                <option value="">Select Free Teacher...</option>
                                {plan.freeTeachers.map(ft => (
                                  <option key={ft.id} value={ft.id}>
                                    {ft.name} ({ft.department || 'Faculty'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => handleExecuteAiSubstitution(plan)}
                                disabled={submittingAiCover || !plan.assignedCoverTeacherId}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm cursor-pointer disabled:opacity-50"
                                title="Confirm Substitution and dispatch in-app alert"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Assign Cover</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const coverTeacher = teachers.find(t => t.id === plan.assignedCoverTeacherId);
                                  const absentTeacher = teachers.find(t => t.id === absentTeacherId);
                                  const periodObj = periods.find(p => p.periodNumber === plan.periodNumber);
                                  const timeStr = periodObj ? `${periodObj.startTime} - ${periodObj.endTime}` : 'Scheduled Time';
                                  const whatsAppMsg = `🏫 *EduVault School - Substitution Alert*\n━━━━━━━━━━━━━━━━━━━━\nNamaste *${coverTeacher?.name || 'Educator'}*,\nToday *${absentTeacher?.name || 'Faculty'}* is on leave.\nYou have been assigned as the substitute teacher for:\n📚 *Subject:* ${plan.subjectName}\n👥 *Class:* ${plan.className}\n⏰ *Period:* Period ${plan.periodNumber} (${timeStr})\n🚪 *Classroom:* Room 3\n\nPlease supervise this class and mark attendance on EduVault.\n- *Academic Office*`;
                                  setWhatsAppPreviewData({
                                    teacherName: coverTeacher?.name,
                                    teacherPhone: coverTeacher?.phone || '9876543210',
                                    message: whatsAppMsg
                                  });
                                  setShowWhatsAppModal(true);
                                }}
                                disabled={!plan.assignedCoverTeacherId}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                title="Preview and send WhatsApp Alert"
                              >
                                <span>💬 WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

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
        </div>


      {showWhatsAppModal && whatsAppPreviewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col">
            <div className="p-5 bg-emerald-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <span>💬 WhatsApp Official Substitution Alert</span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Recipient: {whatsAppPreviewData.teacherName} ({whatsAppPreviewData.teacherPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs font-bold text-gray-700">Official WhatsApp Message Preview:</div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed shadow-xs">
                {whatsAppPreviewData.message}
              </div>
              <p className="text-[11px] text-gray-400">
                Click "Open in WhatsApp" to deliver this official substitution notice to the teacher via WhatsApp Web or mobile app.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="btn-outline text-xs"
              >
                Close
              </button>

              <a
                href={`https://api.whatsapp.com/send?phone=${whatsAppPreviewData.teacherPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(whatsAppPreviewData.message)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWhatsAppModal(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                <span>💬 Open in WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default SubstitutionsTab;
