import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import Loader from '../../components/common/Loader';
import {
  CalendarDays,
  Sparkles,
  Plus,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  Award,
  BookOpen,
  Calendar,
  X,
  Filter,
  RefreshCw,
  MessageSquare,
  Pencil,
  Building
} from 'lucide-react';

const eventTypeStyles = {
  Exam: 'bg-rose-50 border-rose-200 text-rose-700',
  Holiday: 'bg-amber-50 border-amber-200 text-amber-700',
  Sports: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  Cultural: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  Meeting: 'bg-purple-50 border-purple-200 text-purple-700',
  Academic: 'bg-blue-50 border-blue-200 text-blue-700'
};

const eventBadgeStyles = {
  Exam: 'bg-rose-100 text-rose-800',
  Holiday: 'bg-amber-100 text-amber-800',
  Sports: 'bg-emerald-100 text-emerald-800',
  Cultural: 'bg-indigo-100 text-indigo-800',
  Meeting: 'bg-purple-100 text-purple-800',
  Academic: 'bg-blue-100 text-blue-800'
};

export default function AiPlanner() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'SuperAdmin';
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  const currentYear = new Date().getFullYear();
  const defaultYear = `${currentYear}-${((currentYear + 1) % 100).toString().padStart(2, '0')}`;

  const [academicYear, setAcademicYear] = useState(defaultYear);
  const [board, setBoard] = useState('CBSE');
  const [selectedFilter, setSelectedFilter] = useState('All');

  const [planData, setPlanData] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Load schools if SuperAdmin
  useEffect(() => {
    if (isSuperAdmin) {
      apiClient.get('/super/schools')
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setSchools(list);
          if (list.length > 0 && !selectedSchoolId) {
            setSelectedSchoolId(list[0].id);
          }
        })
        .catch(err => console.warn('Failed to load schools for SuperAdmin', err));
    }
  }, [isSuperAdmin]);

  const getQueryStr = (isSubsequent = false) => {
    if (isSuperAdmin && selectedSchoolId) {
      return isSubsequent ? `&schoolId=${selectedSchoolId}` : `?schoolId=${selectedSchoolId}`;
    }
    return '';
  };

  // Custom prompt / instructions modal
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [customInstructions, setCustomInstructions] = useState(
    'Include quarterly PTMs, annual sports meet in late November, science robotics fair in November, and pre-board examinations in January.'
  );

  // Add Event Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    eventType: 'Academic',
    startDate: '',
    endDate: '',
    targetAudience: 'All',
    description: ''
  });

  // Edit Event Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    title: '',
    eventType: 'Academic',
    startDate: '',
    endDate: '',
    targetAudience: 'All',
    description: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Toast & Broadcasting
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [broadcastingId, setBroadcastingId] = useState(null);
  const [broadcastingMonth, setBroadcastingMonth] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const fetchPlan = async () => {
    setLoadingPlan(true);
    try {
      const q = getQueryStr();
      const res = await apiClient.get(`/school-admin/plan/${academicYear}${q}`);
      setPlanData(res.data);
    } catch (err) {
      console.warn('Failed to fetch plan:', err);
      showToast('Could not load calendar plan.', 'error');
    } finally {
      setLoadingPlan(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [academicYear, selectedSchoolId]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const payload = {
        academicYear,
        board,
        customInstructions
      };

      const q = getQueryStr();
      const res = await apiClient.post(`/school-admin/plan/generate${q}`, payload);
      showToast(res.data?.message || 'Academic calendar generated successfully!');
      setShowPromptModal(false);
      fetchPlan();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate plan.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddCustomEvent = async (e) => {
    e.preventDefault();
    if (!planData?.id) return;
    if (!addForm.title || !addForm.startDate) {
      showToast('Title and start date are required.', 'error');
      return;
    }

    try {
      const q = getQueryStr();
      await apiClient.post(`/school-admin/plan/events${q}`, {
        planId: planData.id,
        ...addForm
      });

      showToast('Calendar event created successfully.');
      setShowAddModal(false);
      setAddForm({
        title: '',
        eventType: 'Academic',
        startDate: '',
        endDate: '',
        targetAudience: 'All',
        description: ''
      });
      fetchPlan();
    } catch (err) {
      showToast('Failed to add calendar event.', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to remove this calendar milestone?')) return;
    try {
      const q = getQueryStr();
      await apiClient.delete(`/school-admin/plan/events/${eventId}${q}`);
      showToast('Calendar milestone removed.');
      fetchPlan();
    } catch (err) {
      showToast('Could not delete event.', 'error');
    }
  };

  const handleOpenEdit = (event) => {
    setEditForm({
      id: event.id,
      title: event.title,
      eventType: event.eventType || 'Academic',
      startDate: event.startDate,
      endDate: event.endDate || '',
      targetAudience: event.targetAudience || 'All',
      description: event.description || ''
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.id || !editForm.title || !editForm.startDate) {
      showToast('Title and start date are required.', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      const q = getQueryStr();
      await apiClient.put(`/school-admin/plan/events/${editForm.id}${q}`, {
        title: editForm.title,
        eventType: editForm.eventType,
        startDate: editForm.startDate,
        endDate: editForm.endDate || null,
        targetAudience: editForm.targetAudience,
        description: editForm.description || null
      });
      showToast('Calendar milestone updated successfully.');
      setShowEditModal(false);
      fetchPlan();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update event.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBroadcastMonth = async (monthNum, monthName, eventCount) => {
    if (!planData?.id) return;
    if (!window.confirm(`Are you sure you want to broadcast all ${eventCount} scheduled events for ${monthName} via WhatsApp?`)) {
      return;
    }
    setBroadcastingMonth(monthNum);
    try {
      const q = getQueryStr();
      const res = await apiClient.post(`/school-admin/plan/broadcast-month${q}`, {
        planId: planData.id,
        monthNumber: monthNum
      });
      showToast(res.data?.message || `WhatsApp schedule dispatched for ${monthName}!`);
      fetchPlan();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to dispatch monthly WhatsApp broadcast.', 'error');
    } finally {
      setBroadcastingMonth(null);
    }
  };

  const handleBroadcastWhatsApp = async (eventId, title) => {
    setBroadcastingId(eventId);
    try {
      const q = getQueryStr();
      const res = await apiClient.post(`/school-admin/plan/events/${eventId}/broadcast-whatsapp${q}`);
      showToast(res.data?.message || `WhatsApp reminder dispatched for "${title}"!`);
      fetchPlan();
    } catch (err) {
      showToast('Failed to dispatch WhatsApp broadcast.', 'error');
    } finally {
      setBroadcastingId(null);
    }
  };

  // Month grouping (1 = April, 2 = May, ... 12 = March)
  const monthOrder = [
    { num: 1, name: 'April' },
    { num: 2, name: 'May' },
    { num: 3, name: 'June' },
    { num: 4, name: 'July' },
    { num: 5, name: 'August' },
    { num: 6, name: 'September' },
    { num: 7, name: 'October' },
    { num: 8, name: 'November' },
    { num: 9, name: 'December' },
    { num: 10, name: 'January' },
    { num: 11, name: 'February' },
    { num: 12, name: 'March' }
  ];

  const filteredEvents = (planData?.events || []).filter(e => {
    if (selectedFilter === 'All') return true;
    return e.eventType?.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <div>
      <Topbar
        title="AI Annual School Planner"
        subtitle="12-Month Indian Curriculum Calendar Generation, Milestones & Automated WhatsApp Broadcasts"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && schools.length > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 rounded-xl px-2.5 py-1 text-xs">
                <Building className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-amber-800 font-bold hidden sm:inline">School:</span>
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  className="bg-transparent text-xs text-amber-950 font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.schoolCode || s.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <select
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
            >
              <option value={`${currentYear}-${((currentYear + 1) % 100).toString().padStart(2, '0')}`}>
                Academic Year {currentYear}-{(currentYear + 1) % 100}
              </option>
              <option value={`${currentYear + 1}-${((currentYear + 2) % 100).toString().padStart(2, '0')}`}>
                Academic Year {currentYear + 1}-{(currentYear + 2) % 100}
              </option>
            </select>

            <select
              value={board}
              onChange={e => setBoard(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none"
            >
              <option value="CBSE">CBSE Board</option>
              <option value="ICSE">ICSE / ISC</option>
              <option value="State Board">State Board</option>
            </select>

            <button
              onClick={() => setShowPromptModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{planData?.hasPlan ? 'Re-Generate with AI' : 'Generate Plan with AI'}</span>
            </button>

            {planData?.hasPlan && (
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-outline text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Milestone
              </button>
            )}
          </div>
        }
      />

      {toast.message && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 border-b border-slate-200">
        {['All', 'Exam', 'Holiday', 'Sports', 'Cultural', 'Meeting', 'Academic'].map(f => (
          <button
            key={f}
            onClick={() => setSelectedFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedFilter === f
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {f === 'All' ? '🌟 All Events' : f}
          </button>
        ))}
      </div>

      {loadingPlan ? (
        <div className="py-20 flex justify-center">
          <Loader />
        </div>
      ) : !planData?.hasPlan ? (
        <div className="card text-center py-16 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-900">No Annual Plan Active</h3>
          <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto">
            Orchestrate your school's 12-month calendar covering CBSE/ICSE exams, national holidays, sports days, science exhibitions, and PTM schedules in 1 click.
          </p>

          <button
            onClick={() => setShowPromptModal(true)}
            className="mt-6 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-blue-600/25 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate {academicYear} Calendar with AI</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Calendar Header Badge */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div>
              <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                Academic Session {planData.academicYear}
              </div>
              <h2 className="text-lg font-black mt-0.5">{planData.title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-indigo-200">Scheduled Milestones</div>
                <div className="text-xl font-black text-amber-300">{planData.totalEvents} Events</div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {planData.status}
              </span>
            </div>
          </div>

          {/* 12-Month Chronological Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {monthOrder.map(m => {
              const monthEvents = filteredEvents.filter(e => e.monthNumber === m.num || e.monthName?.toLowerCase() === m.name.toLowerCase());

              return (
                <div key={m.num} className="card p-4 border border-slate-200 hover:border-slate-300 transition-all flex flex-col">
                  {/* Month Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                        {m.num}
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm">{m.name}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleBroadcastMonth(m.num, m.name, monthEvents.length)}
                        disabled={monthEvents.length === 0 || broadcastingMonth === m.num}
                        title={`Broadcast all ${monthEvents.length} events for ${m.name} via WhatsApp`}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition shadow-sm"
                      >
                        {broadcastingMonth === m.num ? (
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Send className="w-2.5 h-2.5" />
                        )}
                        <span>Send Month</span>
                      </button>
                      <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                        {monthEvents.length} event{monthEvents.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* Events Container */}
                  <div className="space-y-2.5 flex-1">
                    {monthEvents.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic py-4 text-center">
                        No scheduled milestones
                      </div>
                    ) : (
                      monthEvents.map(e => (
                        <div
                          key={e.id}
                          className={`p-3 rounded-xl border transition-all ${
                            eventTypeStyles[e.eventType] || 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <h5 className="font-bold text-xs leading-snug">{e.title}</h5>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                eventBadgeStyles[e.eventType] || 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {e.eventType}
                            </span>
                          </div>

                          <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1.5">
                            <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>
                              {e.startDate} {e.endDate && e.endDate !== e.startDate ? `→ ${e.endDate}` : ''}
                            </span>
                          </div>

                          {e.description && (
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-2 line-clamp-2">
                              {e.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[10px]">
                            <span className="font-semibold text-slate-500">
                              Audience: <strong>{e.targetAudience}</strong>
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(e)}
                                title="Edit event title, dates, or description"
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                title="Broadcast WhatsApp notification to parents/staff"
                                onClick={() => handleBroadcastWhatsApp(e.id, e.title)}
                                disabled={broadcastingId === e.id}
                                className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition ${
                                  e.isWhatsAppNotified
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                <Send className="w-2.5 h-2.5" />
                                <span>{e.isWhatsAppNotified ? 'Dispatched' : 'WhatsApp'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteEvent(e.id)}
                                title="Remove event"
                                className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PROMPT & CUSTOMIZATION MODAL ── */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Generate AI Academic Plan</h3>
              </div>
              <button onClick={() => setShowPromptModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    className="input text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Affiliation / Board</label>
                  <select
                    value={board}
                    onChange={e => setBoard(e.target.value)}
                    className="input text-xs font-bold"
                  >
                    <option value="CBSE">CBSE (All India)</option>
                    <option value="ICSE">ICSE / ISC</option>
                    <option value="State Board">State Board</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Custom School Instructions & Event Preferences
                </label>
                <textarea
                  rows={4}
                  value={customInstructions}
                  onChange={e => setCustomInstructions(e.target.value)}
                  placeholder="Specify custom events, holidays, sports meet dates, or examination preferences..."
                  className="input text-xs leading-relaxed"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  💡 Gemini AI structures a comprehensive 12-month calendar covering all statutory holidays, exams, and milestones.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={generating}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Generate Calendar Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD CUSTOM EVENT MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Add Calendar Milestone</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomEvent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Event Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Annual Art & Craft Fair"
                  value={addForm.title}
                  onChange={e => setAddForm({ ...addForm, title: e.target.value })}
                  className="input text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Event Category</label>
                  <select
                    value={addForm.eventType}
                    onChange={e => setAddForm({ ...addForm, eventType: e.target.value })}
                    className="input text-xs font-semibold"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Exam">Exam</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Sports">Sports</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Meeting">Meeting / PTM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Audience</label>
                  <select
                    value={addForm.targetAudience}
                    onChange={e => setAddForm({ ...addForm, targetAudience: e.target.value })}
                    className="input text-xs font-semibold"
                  >
                    <option value="All">All</option>
                    <option value="Students">Students Only</option>
                    <option value="Teachers">Teachers / Staff</option>
                    <option value="Parents">Parents Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={e => setAddForm({ ...addForm, startDate: e.target.value })}
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={addForm.endDate}
                    onChange={e => setAddForm({ ...addForm, endDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or timing instructions..."
                  value={addForm.description}
                  onChange={e => setAddForm({ ...addForm, description: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT EVENT MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Modify Calendar Event</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Event Title *</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="input text-xs font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Event Category</label>
                  <select
                    value={editForm.eventType}
                    onChange={e => setEditForm({ ...editForm, eventType: e.target.value })}
                    className="input text-xs font-semibold"
                  >
                    <option value="Academic">Academic</option>
                    <option value="Exam">Exam</option>
                    <option value="Holiday">Holiday</option>
                    <option value="Sports">Sports</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Meeting">Meeting / PTM</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Target Audience</label>
                  <select
                    value={editForm.targetAudience}
                    onChange={e => setEditForm({ ...editForm, targetAudience: e.target.value })}
                    className="input text-xs font-semibold"
                  >
                    <option value="All">All</option>
                    <option value="Students">Students Only</option>
                    <option value="Teachers">Teachers / Staff</option>
                    <option value="Parents">Parents Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or timing instructions..."
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit} className="btn-primary text-xs flex items-center gap-1.5">
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
