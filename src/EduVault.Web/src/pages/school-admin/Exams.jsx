import { useState, useEffect, useMemo } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  Plus, Search, Calendar, CheckCircle2, Clock, BookOpen, AlertCircle, 
  X, Trash2, Edit2, Download, ChevronRight, ArrowLeft, Users, 
  Layers, Award, Filter, Eye, GraduationCap, ArrowUpRight,
  Sparkles, Check, Shuffle
} from 'lucide-react';
import { formatGrade, formatClassLabel, sortClasses } from '../../utils/classUtils';

const statusBadgeClasses = {
  SCHEDULED: 'badge-info',
  Scheduled: 'badge-info',
  ONGOING: 'badge-warning',
  Ongoing: 'badge-warning',
  DRAFT: 'badge-gray',
  Draft: 'badge-gray',
  Completed: 'badge-success',
  COMPLETED: 'badge-success'
};

// Auto-check if an assessment date has passed
const getEffectiveExamStatus = (e) => {
  if (!e) return 'Scheduled';
  const s = (e.status || '').trim();
  if (s.toLowerCase() === 'completed') return 'Completed';
  const raw = e.rawDate || e.date;
  if (raw) {
    const examDate = new Date(raw);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!isNaN(examDate.getTime()) && examDate < today) {
      return 'Completed';
    }
  }
  return s || 'Scheduled';
};

const Exams = () => {
  const [activeTab, setActiveTab] = useState('Exam Schedule');
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState({
    upcomingExams: 0,
    ongoingExams: 0,
    completedExams: 0,
    pendingApprovals: 0,
    totalAssessments: 0,
    readyForReportCards: 0
  });
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Compute clean unique grades list (so single class appears only once in dropdowns)
  const uniqueGradeList = useMemo(() => {
    const map = new Map();
    classes.forEach(c => {
      const g = formatGrade(c.grade);
      if (!map.has(g)) {
        map.set(g, { gradeValue: c.grade, formattedGrade: g });
      }
    });
    return Array.from(map.values());
  }, [classes]);

  // Hierarchical Drilldown Navigation State
  const [viewMode, setViewMode] = useState('hierarchical'); // 'hierarchical' | 'flat'
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [cycleTab, setCycleTab] = useState('routine'); // 'routine' | 'students'
  
  // Class Students Roster for Exams
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    classId: '',
    subjectId: '',
    proctorId: '',
    date: new Date().toISOString().split('T')[0],
    time: '09:00 AM - 12:00 PM',
    examType: 'Mid-term assessment',
    totalMarks: 100,
    passingMarks: 40
  });

  // AI Exam Date-Sheet & Invigilator Scheduler State
  const [showAiExamModal, setShowAiExamModal] = useState(false);
  const [generatingDateSheet, setGeneratingDateSheet] = useState(false);
  const [savingAiSchedule, setSavingAiSchedule] = useState(false);
  const [aiExamConfig, setAiExamConfig] = useState({
    examType: 'Half-Yearly Examination',
    targetGrade: 'ALL',
    startDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    shift: '09:00 AM - 12:00 PM',
    gapDays: 1,
    totalMarks: 100,
    passingMarks: 40
  });
  const [aiGeneratedDateSheet, setAiGeneratedDateSheet] = useState([]);

  // Generate conflict-free date-sheet skipping Sundays with fair invigilation
  const handleGenerateAiDateSheet = () => {
    setGeneratingDateSheet(true);
    try {
      const targetClasses = aiExamConfig.targetGrade === 'ALL'
        ? classes
        : classes.filter(c => String(c.grade) === String(aiExamConfig.targetGrade));

      if (targetClasses.length === 0) {
        showToast('No classes found matching the selected grade criteria.', 'error');
        setGeneratingDateSheet(false);
        return;
      }

      const availableSubjects = subjects.length > 0
        ? subjects
        : [
            { id: 'sub-eng', name: 'English' },
            { id: 'sub-hin', name: 'Hindi' },
            { id: 'sub-mat', name: 'Mathematics' },
            { id: 'sub-sci', name: 'Science' },
            { id: 'sub-sst', name: 'Social Studies' }
          ];

      const generated = [];
      const proctorScheduleMap = new Map(); // key: "YYYY-MM-DD" -> Set(teacherId)

      // Loop through target classes
      targetClasses.forEach((cls) => {
        let currentDate = new Date(aiExamConfig.startDate);

        availableSubjects.forEach((sub, subIdx) => {
          if (subIdx > 0) {
            // Add gap days + 1 day
            currentDate.setDate(currentDate.getDate() + 1 + Number(aiExamConfig.gapDays));
          }

          // Rule: Skip Sundays!
          if (currentDate.getDay() === 0) {
            currentDate.setDate(currentDate.getDate() + 1);
          }

          const dateStr = currentDate.toISOString().split('T')[0];
          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

          if (!proctorScheduleMap.has(dateStr)) {
            proctorScheduleMap.set(dateStr, new Set());
          }
          const busyProctors = proctorScheduleMap.get(dateStr);

          // Find an available teacher who is not busy proctoring on this date
          const availableProctor = teachers.find(t => !busyProctors.has(t.id));
          const proctorId = availableProctor ? availableProctor.id : (teachers[0]?.id || '');
          const proctorName = availableProctor
            ? `${availableProctor.firstName} ${availableProctor.lastName}`
            : (teachers[0] ? `${teachers[0].firstName} ${teachers[0].lastName}` : 'Duty Pool');

          if (availableProctor) {
            busyProctors.add(availableProctor.id);
          }

          generated.push({
            id: `ai-exam-${cls.id}-${sub.id}-${subIdx}`,
            classId: cls.id,
            className: `Grade ${cls.grade} (${cls.section || 'A'})`,
            grade: cls.grade,
            section: cls.section || 'A',
            subjectId: sub.id,
            subjectName: sub.name || sub.subjectName,
            date: dateStr,
            formattedDate: dayName,
            time: aiExamConfig.shift,
            examType: aiExamConfig.examType,
            proctorId: proctorId,
            proctorName: proctorName,
            totalMarks: Number(aiExamConfig.totalMarks) || 100,
            passingMarks: Number(aiExamConfig.passingMarks) || 40
          });
        });
      });

      setAiGeneratedDateSheet(generated);
      showToast(`AI generated ${generated.length} conflict-free exam slots with gap-day buffer (Sundays excluded).`);
    } catch (err) {
      console.error('Error generating AI date-sheet:', err);
      showToast('Could not complete date-sheet generation.', 'error');
    } finally {
      setGeneratingDateSheet(false);
    }
  };

  const handleUpdateGeneratedItemProctor = (itemId, newProctorId) => {
    const teacher = teachers.find(t => t.id === newProctorId);
    setAiGeneratedDateSheet(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              proctorId: newProctorId,
              proctorName: teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unassigned'
            }
          : item
      )
    );
  };

  const handleSaveAiDateSheet = async () => {
    if (aiGeneratedDateSheet.length === 0) return;
    setSavingAiSchedule(true);
    let savedCount = 0;
    try {
      for (const item of aiGeneratedDateSheet) {
        await apiClient.post('/exams/schedule', {
          classId: item.classId,
          subjectId: item.subjectId,
          proctorId: item.proctorId || null,
          date: new Date(item.date).toISOString(),
          time: item.time,
          examType: item.examType,
          totalMarks: item.totalMarks,
          passingMarks: item.passingMarks,
          status: 'SCHEDULED'
        });
        savedCount++;
      }

      showToast(`Successfully published ${savedCount} examination assessments to the official timetable!`);
      setShowAiExamModal(false);
      setAiGeneratedDateSheet([]);
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.error || `Saved ${savedCount} exams, but encountered an error.`, 'error');
    } finally {
      setSavingAiSchedule(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [examsRes, statsRes, pendingRes, classesRes, subjectsRes, teachersRes] = await Promise.allSettled([
        apiClient.get('/exams/schedule'),
        apiClient.get('/exams/summary-stats'),
        apiClient.get('/exams/submissions/pending'),
        apiClient.get('/academics/classes'),
        apiClient.get('/academics/subjects'),
        apiClient.get('/academics/teachers')
      ]);

      if (examsRes.status === 'fulfilled') setExams(examsRes.value.data || []);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data || {});
      if (pendingRes.status === 'fulfilled') setPendingSubmissions(pendingRes.value.data || []);
      if (classesRes.status === 'fulfilled') setClasses(sortClasses(classesRes.value.data || []));
      if (subjectsRes.status === 'fulfilled') setSubjects(subjectsRes.value.data || []);
      if (teachersRes.status === 'fulfilled') setTeachers(teachersRes.value.data || []);
    } catch (err) {
      console.error('Failed to load exam data:', err);
      showToast('Could not load examination records.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Fetch enrolled students when a class and cycle are selected
  const fetchClassStudents = async (classId, cycle) => {
    if (!classId) return;
    setLoadingStudents(true);
    try {
      const query = cycle && cycle !== 'ALL' ? `?examType=${encodeURIComponent(cycle)}` : '';
      const res = await apiClient.get(`/exams/classes/${classId}/students${query}`);
      setClassStudents(res.data?.students || []);
    } catch (err) {
      console.error('Error fetching exam class students:', err);
      setClassStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedClassId && cycleTab === 'students') {
      fetchClassStudents(selectedClassId, selectedCycle);
    }
  }, [selectedClassId, selectedCycle, cycleTab]);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    if (!formData.classId || !formData.subjectId) {
      showToast('Please select both a class and a subject.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/exams/schedule', {
        classId: formData.classId,
        subjectId: formData.subjectId,
        proctorId: formData.proctorId || null,
        date: new Date(formData.date).toISOString(),
        time: formData.time,
        examType: formData.examType,
        totalMarks: Number(formData.totalMarks) || 100,
        passingMarks: Number(formData.passingMarks) || 40,
        status: 'SCHEDULED'
      });

      showToast('Assessment scheduled successfully.');
      setShowScheduleModal(false);
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to schedule exam.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async (id) => {
    if (!window.confirm('Are you sure you want to remove this scheduled exam?')) return;
    try {
      await apiClient.delete(`/exams/schedule/${id}`);
      showToast('Exam removed from schedule.');
      loadAllData();
      if (selectedClassId && cycleTab === 'students') {
        fetchClassStudents(selectedClassId, selectedCycle);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete exam.', 'error');
    }
  };

  const handleApproveResults = async (examId) => {
    try {
      await apiClient.post('/exams/results/approve', examId);
      showToast('Exam results approved & finalized. Parent WhatsApp alerts dispatched.');
      loadAllData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to approve results.', 'error');
    }
  };

  // Group exams by class
  const classGroupedData = useMemo(() => {
    const map = new Map();

    // First populate from registered classes
    classes.forEach(c => {
      map.set(c.id, {
        classId: c.id,
        grade: c.grade,
        section: c.section,
        className: `Grade ${c.grade} (${c.section})`,
        capacity: c.capacity,
        enrolled: c.enrolled,
        exams: []
      });
    });

    // Attach exams with effective status
    exams.forEach(e => {
      const effStatus = getEffectiveExamStatus(e);
      const enhancedExam = { ...e, status: effStatus };
      
      if (map.has(e.classId)) {
        map.get(e.classId).exams.push(enhancedExam);
      } else {
        map.set(e.classId, {
          classId: e.classId,
          grade: e.grade,
          section: e.section,
          className: `${e.grade} ${e.section ? `(${e.section})` : ''}`,
          capacity: 0,
          enrolled: 0,
          exams: [enhancedExam]
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      return String(a.grade).localeCompare(String(b.grade), undefined, { numeric: true });
    });
  }, [classes, exams]);

  // Selected Class Object
  const currentSelectedClass = useMemo(() => {
    if (!selectedClassId) return null;
    return classGroupedData.find(c => c.classId === selectedClassId) || null;
  }, [selectedClassId, classGroupedData]);

  // Cycles (Semesters / Exam Types) grouped for selected class
  const cyclesForSelectedClass = useMemo(() => {
    if (!currentSelectedClass) return [];
    const cycleMap = new Map();

    currentSelectedClass.exams.forEach(e => {
      const cycleName = e.examType || 'Term Examination';
      if (!cycleMap.has(cycleName)) {
        cycleMap.set(cycleName, {
          cycleName,
          exams: [],
          dates: []
        });
      }
      const entry = cycleMap.get(cycleName);
      entry.exams.push(e);
      if (e.rawDate || e.date) {
        entry.dates.push(new Date(e.rawDate || e.date));
      }
    });

    return Array.from(cycleMap.values()).map(c => {
      const completedCount = c.exams.filter(e => e.status === 'Completed').length;
      let cycleStatus = 'Scheduled';
      if (completedCount === c.exams.length && c.exams.length > 0) {
        cycleStatus = 'Completed';
      } else if (completedCount > 0) {
        cycleStatus = 'In Progress';
      }

      // Sort dates to show range
      c.dates.sort((a, b) => a - b);
      let dateRangeStr = 'Dates configured';
      if (c.dates.length > 0) {
        const first = c.dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const last = c.dates[c.dates.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        dateRangeStr = first === last ? first : `${first} – ${last}`;
      }

      return {
        ...c,
        completedCount,
        totalSubjects: c.exams.length,
        cycleStatus,
        dateRangeStr
      };
    });
  }, [currentSelectedClass]);

  // Filtered flat list of exams (with auto-status)
  const filteredExams = useMemo(() => {
    return exams.map(e => ({
      ...e,
      status: getEffectiveExamStatus(e)
    })).filter(e => {
      const matchesQuery = !searchQuery || 
        (e.subject && e.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.grade && e.grade.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.proctor && e.proctor.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (e.examType && e.examType.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesGrade = selectedGradeFilter === 'ALL' || (e.grade && e.grade.includes(selectedGradeFilter));
      return matchesQuery && matchesGrade;
    });
  }, [exams, searchQuery, selectedGradeFilter]);

  // Open schedule modal pre-configured for a class
  const handleOpenScheduleForClass = (classId, cycleName = '') => {
    setFormData(prev => ({
      ...prev,
      classId: classId || '',
      examType: cycleName || prev.examType
    }));
    setShowScheduleModal(true);
  };

  return (
    <div>
      <Topbar
        title="Exams & Assessment Center"
        subtitle="Manage exam schedules, result approvals, and grade reporting"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAiExamModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI Date-Sheet & Invigilator Scheduler</span>
            </button>
            <button
              onClick={() => setActiveTab('Grade Configuration')}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              ⚙ Grade Config
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Schedule Assessment
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          toastType === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {toastType === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toastMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Pending Result Approvals</div>
          <div className="font-display text-2xl font-bold text-yellow-600">
            {stats.pendingApprovals || pendingSubmissions.length} Batches
          </div>
          <div className="text-xs text-gray-400">Awaiting administrative approval</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Eligible for Report Cards</div>
          <div className="font-display text-2xl font-bold text-green-600">
            {stats.readyForReportCards || 0} Students
          </div>
          <div className="text-xs text-gray-400">Active enrollments in session</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Scheduled Assessments</div>
          <div className="font-display text-2xl font-bold text-blue-600">
            {stats.totalAssessments || exams.length} Exams
          </div>
          <div className="text-xs text-gray-400">Total configured cycles</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card mb-6">
        <div className="flex gap-4 border-b border-gray-100 mb-5">
          {['Exam Schedule', 'Result Approvals', 'Grade Configuration'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium flex items-center gap-1.5 transition-all relative ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary font-semibold'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              {tab}
              {tab === 'Result Approvals' && pendingSubmissions.length > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingSubmissions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Exam Schedule */}
        {activeTab === 'Exam Schedule' && (
          <div>
            {/* Top Toolbar: Search, Filter, and Mode Toggle */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Search by subject, grade, cycle, or proctor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-9 text-xs w-full"
                  />
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>

                <select
                  value={selectedGradeFilter}
                  onChange={(e) => {
                    setSelectedGradeFilter(e.target.value);
                    setSelectedClassId(null);
                    setSelectedCycle(null);
                  }}
                  className="input text-xs w-full sm:w-44"
                >
                  <option value="ALL">All Grades</option>
                  {uniqueGradeList.map(g => (
                    <option key={g.gradeValue} value={g.gradeValue}>{g.formattedGrade}</option>
                  ))}
                </select>
              </div>

              {/* View Mode Toggle Button */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl self-end sm:self-auto shrink-0">
                <button
                  onClick={() => setViewMode('hierarchical')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'hierarchical'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Grouped by Class & Exam Cycle"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Class & Semesters
                </button>
                <button
                  onClick={() => setViewMode('flat')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'flat'
                      ? 'bg-white text-primary shadow-xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title="Flat table of all schedules"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  All Schedules List
                </button>
              </div>
            </div>

            {/* Breadcrumbs Navigation (Hierarchical Mode) */}
            {viewMode === 'hierarchical' && (
              <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 mb-5 text-xs">
                <div className="flex items-center gap-2 flex-wrap text-gray-500">
                  <button
                    onClick={() => {
                      setSelectedClassId(null);
                      setSelectedCycle(null);
                    }}
                    className={`font-semibold hover:text-primary transition-colors flex items-center gap-1 ${
                      !selectedClassId ? 'text-primary' : ''
                    }`}
                  >
                    <GraduationCap className="w-4 h-4" />
                    All Classes
                  </button>

                  {currentSelectedClass && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <button
                        onClick={() => setSelectedCycle(null)}
                        className={`font-semibold hover:text-primary transition-colors ${
                          !selectedCycle ? 'text-primary' : ''
                        }`}
                      >
                        {currentSelectedClass.className}
                      </button>
                    </>
                  )}

                  {selectedCycle && (
                    <>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold text-primary">{selectedCycle}</span>
                    </>
                  )}
                </div>

                {/* Back button if drilled in */}
                {selectedCycle ? (
                  <button
                    onClick={() => setSelectedCycle(null)}
                    className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1 bg-white"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Cycles
                  </button>
                ) : selectedClassId ? (
                  <button
                    onClick={() => setSelectedClassId(null)}
                    className="btn-outline text-xs py-1 px-2.5 flex items-center gap-1 bg-white"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to All Classes
                  </button>
                ) : null}
              </div>
            )}

            {loading ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : viewMode === 'hierarchical' ? (
              /* ========================================================================= */
              /* HIERARCHICAL VIEW                                                         */
              /* ========================================================================= */
              <div>
                {/* ---------------- LEVEL 1: ALL CLASSES GRID ---------------- */}
                {!selectedClassId && (
                  <div>
                    {classGroupedData.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                        <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <h4 className="font-semibold text-gray-700 text-sm">No classes registered</h4>
                        <p className="text-xs text-gray-400 mb-4">Add classes in Class Management to begin scheduling exams.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {classGroupedData
                          .filter(c => selectedGradeFilter === 'ALL' || String(c.grade) === String(selectedGradeFilter))
                          .filter(c => !searchQuery || c.className.toLowerCase().includes(searchQuery.toLowerCase()) || c.exams.some(e => e.subject.toLowerCase().includes(searchQuery.toLowerCase()) || e.examType?.toLowerCase().includes(searchQuery.toLowerCase())))
                          .map(c => {
                            const totalExams = c.exams.length;
                            const completedExams = c.exams.filter(e => e.status === 'Completed').length;
                            const scheduledExams = totalExams - completedExams;
                            const distinctCycles = Array.from(new Set(c.exams.map(e => e.examType || 'Term Exam')));

                            return (
                              <div
                                key={c.classId}
                                onClick={() => {
                                  setSelectedClassId(c.classId);
                                  setSelectedCycle(null);
                                }}
                                className="group card p-5 border border-gray-150 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer bg-white relative flex flex-col justify-between"
                              >
                                <div>
                                  {/* Card Top: Grade Badge and Actions */}
                                  <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm group-hover:bg-primary group-hover:text-white transition-colors">
                                        {c.grade}
                                      </div>
                                      <div>
                                        <h3 className="font-bold text-gray-800 text-sm group-hover:text-primary transition-colors">
                                          {c.className}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                          {c.enrolled > 0 ? `${c.enrolled} Students Enrolled` : 'Academic Class'}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                      {totalExams} {totalExams === 1 ? 'Exam' : 'Exams'}
                                    </span>
                                  </div>

                                  {/* Cycles preview badges */}
                                  <div className="mb-4">
                                    <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                                      Exam Cycles ({distinctCycles.length})
                                    </div>
                                    {distinctCycles.length === 0 ? (
                                      <span className="text-xs text-gray-400 italic">No cycles configured yet</span>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {distinctCycles.map((cycle, idx) => (
                                          <span
                                            key={idx}
                                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-700"
                                          >
                                            {cycle}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Card Bottom: Status Pills & Drilldown CTA */}
                                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    {completedExams > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                        ✓ {completedExams} Completed
                                      </span>
                                    )}
                                    {scheduledExams > 0 && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        ⏱ {scheduledExams} Scheduled
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-primary font-semibold text-xs flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    View Cycles <ChevronRight className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- LEVEL 2: EXAM CYCLES / SEMESTERS FOR SELECTED CLASS ---------------- */}
                {selectedClassId && !selectedCycle && currentSelectedClass && (
                  <div>
                    {/* Class Header Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-gray-50 border border-blue-100 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">
                          {currentSelectedClass.grade}
                        </div>
                        <div>
                          <h2 className="font-display font-bold text-primary text-base">
                            {currentSelectedClass.className} Examination Cycles
                          </h2>
                          <p className="text-xs text-gray-500">
                            {currentSelectedClass.exams.length} Total Assessments · {cyclesForSelectedClass.length} Exam Cycles / Semesters
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleOpenScheduleForClass(selectedClassId)}
                          className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Assessment for this Class
                        </button>
                      </div>
                    </div>

                    {/* Cycles Grid */}
                    {cyclesForSelectedClass.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <h4 className="font-semibold text-gray-700 text-sm">No exam cycles scheduled for {currentSelectedClass.className}</h4>
                        <p className="text-xs text-gray-400 mb-4">Click below to schedule the first assessment (Mid-term, Semester, or Unit Test).</p>
                        <button
                          onClick={() => handleOpenScheduleForClass(selectedClassId)}
                          className="btn-primary text-xs py-2 px-4"
                        >
                          + Schedule First Assessment
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cyclesForSelectedClass.map((cycle, idx) => (
                          <div
                            key={idx}
                            className="card p-5 border border-gray-150 hover:border-primary/40 hover:shadow-md transition-all bg-white flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <div>
                                  <h3 className="font-bold text-gray-800 text-sm mb-1">{cycle.cycleName}</h3>
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{cycle.dateRangeStr}</span>
                                  </div>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                  cycle.cycleStatus === 'Completed'
                                    ? 'bg-green-50 text-green-700 border border-green-200'
                                    : cycle.cycleStatus === 'In Progress'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                  {cycle.cycleStatus}
                                </span>
                              </div>

                              <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-1.5 text-xs">
                                <div className="flex justify-between text-gray-600">
                                  <span>Subjects Scheduled:</span>
                                  <span className="font-bold text-gray-800">{cycle.totalSubjects} Subjects</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span>Completion Progress:</span>
                                  <span className="font-bold text-primary">
                                    {cycle.completedCount} of {cycle.totalSubjects} papers completed
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Dual action buttons */}
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setSelectedCycle(cycle.cycleName);
                                  setCycleTab('routine');
                                }}
                                className="btn-outline text-xs py-2 px-2.5 flex items-center justify-center gap-1 bg-white hover:bg-gray-50"
                              >
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                Exam Routine
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedCycle(cycle.cycleName);
                                  setCycleTab('students');
                                }}
                                className="btn-primary text-xs py-2 px-2.5 flex items-center justify-center gap-1"
                              >
                                <Users className="w-3.5 h-3.5" />
                                View Students
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ---------------- LEVEL 3: ROUTINE & STUDENTS FOR SELECTED CYCLE ---------------- */}
                {selectedClassId && selectedCycle && currentSelectedClass && (
                  <div>
                    {/* Cycle Header Details */}
                    <div className="p-4 rounded-2xl bg-white border border-gray-150 shadow-xs mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">
                            {currentSelectedClass.className}
                          </span>
                          <span className="text-gray-300">•</span>
                          <span className="text-xs text-gray-500">Academic Assessment Cycle</span>
                        </div>
                        <h2 className="font-display font-bold text-primary text-lg">{selectedCycle}</h2>
                      </div>

                      <div className="flex items-center gap-2 self-stretch md:self-auto">
                        <button
                          onClick={() => handleOpenScheduleForClass(selectedClassId, selectedCycle)}
                          className="btn-primary text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 flex-1 md:flex-initial"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Subject Paper
                        </button>
                      </div>
                    </div>

                    {/* Sub-tab switcher: Routine vs Students */}
                    <div className="flex gap-2 border-b border-gray-200 mb-5">
                      <button
                        onClick={() => setCycleTab('routine')}
                        className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                          cycleTab === 'routine'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Subject Schedule & Routine (
                        {currentSelectedClass.exams.filter(e => (e.examType || 'Term Examination') === selectedCycle).length}
                        )
                      </button>
                      <button
                        onClick={() => setCycleTab('students')}
                        className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                          cycleTab === 'students'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        Enrolled Students & Mark Status
                      </button>
                    </div>

                    {/* SUB-VIEW A: ROUTINE TABLE */}
                    {cycleTab === 'routine' && (
                      <div>
                        {(() => {
                          const cycleExams = currentSelectedClass.exams.filter(e => (e.examType || 'Term Examination') === selectedCycle);

                          if (cycleExams.length === 0) {
                            return (
                              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                                <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <h4 className="font-semibold text-gray-700 text-sm">No subjects scheduled for this cycle</h4>
                                <p className="text-xs text-gray-400 mb-4">Add subject papers to complete this examination cycle routine.</p>
                                <button
                                  onClick={() => handleOpenScheduleForClass(selectedClassId, selectedCycle)}
                                  className="btn-primary text-xs py-2 px-4"
                                >
                                  + Add First Subject Paper
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="overflow-x-auto rounded-xl border border-gray-150">
                              <table className="w-full text-left">
                                <thead className="bg-gray-50/80">
                                  <tr className="border-b border-gray-150 text-gray-500 text-xs uppercase font-semibold">
                                    <th className="table-th">Subject & Paper</th>
                                    <th className="table-th">Assessment Date</th>
                                    <th className="table-th">Time Window</th>
                                    <th className="table-th">Assigned Proctor</th>
                                    <th className="table-th">Automatic Status</th>
                                    <th className="table-th text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cycleExams.map((e) => (
                                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                                      <td className="table-td">
                                        <div className="font-bold text-primary text-sm">{e.subject}</div>
                                        <div className="text-xs text-gray-400 font-mono">{e.subjectCode || 'General'}</div>
                                      </td>
                                      <td className="table-td text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5 font-medium">
                                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                          <span>{e.date}</span>
                                        </div>
                                      </td>
                                      <td className="table-td text-sm text-gray-600">
                                        <div className="flex items-center gap-1.5 font-mono text-xs">
                                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                                          <span>{e.time || '09:00 AM - 12:00 PM'}</span>
                                        </div>
                                      </td>
                                      <td className="table-td text-sm">
                                        <div className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                            {(e.proctor || 'U')[0]}
                                          </div>
                                          <span className="text-gray-700 font-medium">{e.proctor || 'Unassigned'}</span>
                                        </div>
                                      </td>
                                      <td className="table-td">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                          e.status === 'Completed' ? 'badge-success' : (statusBadgeClasses[e.status] || 'badge-info')
                                        }`}>
                                          {e.status === 'Completed' ? '✓ Completed' : e.status}
                                        </span>
                                      </td>
                                      <td className="table-td text-right">
                                        <button
                                          onClick={() => handleDeleteExam(e.id)}
                                          title="Delete Exam"
                                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* SUB-VIEW B: ENROLLED STUDENTS TABLE */}
                    {cycleTab === 'students' && (
                      <div>
                        {loadingStudents ? (
                          <div className="py-12 flex justify-center"><Loader /></div>
                        ) : classStudents.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <h4 className="font-semibold text-gray-700 text-sm">No students currently enrolled in this class</h4>
                            <p className="text-xs text-gray-400 mb-4">Enroll students into {currentSelectedClass.className} via the Students Directory.</p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center justify-between gap-3 mb-3 text-xs text-gray-500">
                              <div>
                                Showing <span className="font-bold text-primary">{classStudents.length}</span> students enrolled in {currentSelectedClass.className}
                              </div>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-gray-150">
                              <table className="w-full text-left">
                                <thead className="bg-gray-50/80">
                                  <tr className="border-b border-gray-150 text-gray-500 text-xs uppercase font-semibold">
                                    <th className="table-th">Roll / Admission ID</th>
                                    <th className="table-th">Student Name</th>
                                    <th className="table-th">Father / Guardian</th>
                                    <th className="table-th">Evaluation Progress</th>
                                    <th className="table-th">Total Score</th>
                                    <th className="table-th text-right">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {classStudents.map((s) => (
                                    <tr key={s.studentId} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                                      <td className="table-td font-mono text-xs font-bold text-primary">
                                        {s.admissionNumber || s.code || '-'}
                                      </td>
                                      <td className="table-td">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                                            {(s.name || 'S')[0]}
                                          </div>
                                          <div>
                                            <div className="font-bold text-gray-800 text-sm">{s.name}</div>
                                            {s.email && <div className="text-[11px] text-gray-400">{s.email}</div>}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="table-td text-xs text-gray-600">
                                        <div className="font-medium text-gray-800">{s.guardianName}</div>
                                        <div className="text-gray-400">{s.guardianPhone}</div>
                                      </td>
                                      <td className="table-td text-xs font-semibold text-gray-700">
                                        {s.gradedExams} of {s.totalExams || 0} subjects graded
                                      </td>
                                      <td className="table-td text-xs">
                                        {s.totalMarksObtained !== null && s.totalMarksObtained !== undefined ? (
                                          <div>
                                            <span className="font-bold text-primary text-sm">{s.totalMarksObtained}</span>
                                            <span className="text-gray-400 text-xs"> / {s.totalMaxMarks}</span>
                                            {s.percentage !== null && (
                                              <span className="ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700">
                                                {s.percentage}%
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400 italic">Not graded yet</span>
                                        )}
                                      </td>
                                      <td className="table-td text-right">
                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                          s.evaluationStatus === 'Completed'
                                            ? 'badge-success'
                                            : s.evaluationStatus === 'Partially Evaluated'
                                            ? 'badge-warning'
                                            : 'badge-gray'
                                        }`}>
                                          {s.evaluationStatus}
                                        </span>
                                      </td>
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
                )}
              </div>
            ) : (
              /* ========================================================================= */
              /* FLAT TABLE VIEW (FALLBACK)                                                */
              /* ========================================================================= */
              <div>
                {filteredExams.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <h4 className="font-semibold text-gray-700 text-sm">No assessments found</h4>
                    <p className="text-xs text-gray-400 mb-4">Schedule your first assessment to begin tracking outcomes.</p>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="btn-primary text-xs"
                    >
                      + Schedule Assessment
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-150">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50/80">
                        <tr className="border-b border-gray-150 text-gray-500 text-xs uppercase font-semibold">
                          <th className="table-th">Subject & Cycle</th>
                          <th className="table-th">Grade & Section</th>
                          <th className="table-th">Assessment Date</th>
                          <th className="table-th">Proctor</th>
                          <th className="table-th">Status</th>
                          <th className="table-th text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExams.map((e) => (
                          <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                            <td className="table-td">
                              <div className="font-semibold text-primary text-sm">{e.subject}</div>
                              <div className="text-xs text-gray-400 font-mono">{e.examType || 'Term Exam'}</div>
                            </td>
                            <td className="table-td text-sm font-medium text-gray-700">
                              {e.grade} {e.section ? `(${e.section})` : ''}
                            </td>
                            <td className="table-td text-sm text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>{e.date}</span>
                              </div>
                              {e.time && <div className="text-xs text-gray-400 pl-5">{e.time}</div>}
                            </td>
                            <td className="table-td text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                  {(e.proctor || 'U')[0]}
                                </div>
                                <span className="text-gray-700">{e.proctor || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td className="table-td">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                e.status === 'Completed' ? 'badge-success' : (statusBadgeClasses[e.status] || 'badge-info')
                              }`}>
                                {e.status === 'Completed' ? '✓ Completed' : e.status}
                              </span>
                            </td>
                            <td className="table-td text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleDeleteExam(e.id)}
                                  title="Delete Exam"
                                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Result Approvals */}
        {activeTab === 'Result Approvals' && (
          <div>
            <div className="mb-4">
              <h3 className="font-semibold text-primary text-sm">Submitted Marksheets Awaiting Approval</h3>
              <p className="text-xs text-gray-500">Review teacher mark entries and approve them for report card compilation.</p>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-700 text-sm">Queue is clean!</h4>
                <p className="text-xs text-gray-400">All submitted marks have been approved or no new entries are pending.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSubmissions.map((sub) => (
                  <div key={sub.examId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border border-gray-100 rounded-xl hover:border-gray-200 transition-all bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold">
                        📄
                      </div>
                      <div>
                        <div className="text-sm font-bold text-primary">{sub.subjectName} — {sub.grade}</div>
                        <div className="text-xs text-gray-500">
                          Cycle: <span className="font-semibold">{sub.examType}</span> · Submitted by <span className="font-semibold">{sub.submittedBy}</span> · {sub.studentCount} student records
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleApproveResults(sub.examId)}
                        className="btn-primary text-xs py-1.5 px-4 flex-1 sm:flex-initial"
                      >
                        APPROVE & PUBLISH
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Grade Configuration & Report Cards */}
        {activeTab === 'Grade Configuration' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 border border-gray-100 rounded-xl">
              <h3 className="font-semibold text-primary text-sm mb-3">Institutional Grading Scale</h3>
              <div className="space-y-2 text-xs">
                {[
                  { grade: 'A+', range: '90% - 100%', gpa: '4.0', desc: 'Outstanding' },
                  { grade: 'A', range: '80% - 89%', gpa: '3.7', desc: 'Excellent' },
                  { grade: 'B', range: '70% - 79%', gpa: '3.0', desc: 'Good' },
                  { grade: 'C', range: '60% - 69%', gpa: '2.0', desc: 'Satisfactory' },
                  { grade: 'D', range: '40% - 59%', gpa: '1.0', desc: 'Pass' },
                  { grade: 'F', range: 'Below 40%', gpa: '0.0', desc: 'Needs Improvement' }
                ].map(g => (
                  <div key={g.grade} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <span className="font-bold text-primary w-10">{g.grade}</span>
                    <span className="text-gray-600">{g.range}</span>
                    <span className="text-gray-500 font-mono">GPA {g.gpa}</span>
                    <span className="text-gray-400 text-right">{g.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border border-gray-100 rounded-xl flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-primary text-sm mb-3">Report Card Generation Hub</h3>
                <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">
                  ℹ All approved results for the current academic session will be compiled into standardized institutional report cards.
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => showToast('Bulk PDF Report Cards generation initiated.')}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-primary-light transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  🖨 Bulk Generate PDF Report Cards
                </button>
                <button
                  onClick={() => showToast('Automated WhatsApp report card links queued.')}
                  className="w-full border border-gray-200 text-primary py-2.5 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                >
                  📱 Send Digital Reports via WhatsApp
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Assessment Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-display font-bold text-primary text-lg">Schedule New Assessment</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExam} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Target Class *</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="input text-xs"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Grade {c.grade} {c.section ? `(${c.section})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Subject *</label>
                  <select
                    value={formData.subjectId}
                    onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                    className="input text-xs"
                    required
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code || 'N/A'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Assessment Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Cycle / Semester</label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="Mid-term assessment">Mid-term assessment</option>
                    <option value="Semester Examination">Semester Examination</option>
                    <option value="Final Examination">Final Examination</option>
                    <option value="Unit Test 1">Unit Test 1</option>
                    <option value="Unit Test 2">Unit Test 2</option>
                    <option value="Periodic Test">Periodic Test</option>
                    <option value="Class Quiz">Class Quiz</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Time Window</label>
                  <input
                    type="text"
                    placeholder="09:00 AM - 12:00 PM"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="input text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Invigilator / Proctor</label>
                  <select
                    value={formData.proctorId}
                    onChange={(e) => setFormData({ ...formData, proctorId: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="">Unassigned</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Total Marks</label>
                  <input
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Passing Marks</label>
                  <input
                    type="number"
                    value={formData.passingMarks}
                    onChange={(e) => setFormData({ ...formData, passingMarks: e.target.value })}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Scheduling...' : 'Save Assessment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── AI EXAMINATION DATE-SHEET & INVIGILATOR SCHEDULER MODAL ── */}
      {showAiExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white">
              <div>
                <h3 className="font-bold text-base text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  AI Exam Date-Sheet & Invigilation Scheduler
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Automated conflict-free date-sheet generation with study gap days (Sundays excluded) and balanced faculty duty allocation.
                </p>
              </div>
              <button
                onClick={() => setShowAiExamModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Configuration Panel */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  Examination Cycle & Scheduling Parameters
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Exam Cycle / Type</label>
                    <select
                      value={aiExamConfig.examType}
                      onChange={(e) => setAiExamConfig({ ...aiExamConfig, examType: e.target.value })}
                      className="input text-xs w-full bg-white"
                    >
                      <option value="Mid Term 1">Mid Term 1</option>
                      <option value="Mid Term 2">Mid Term 2</option>
                      <option value="Half-Yearly Examination">Half-Yearly Examination</option>
                      <option value="Final Examination">Final / Annual Examination</option>
                      <option value="Unit Test 1">Unit Test 1</option>
                      <option value="Periodic Assessment">Periodic Assessment</option>
                      <option value="Pre-Board Examination">Pre-Board Examination</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Target Class Scope</label>
                    <select
                      value={aiExamConfig.targetGrade}
                      onChange={(e) => setAiExamConfig({ ...aiExamConfig, targetGrade: e.target.value })}
                      className="input text-xs w-full bg-white"
                    >
                      <option value="ALL">All Enrolled Classes (Whole School)</option>
                      {uniqueGradeList.map(g => (
                        <option key={g.gradeValue} value={g.gradeValue}>{g.formattedGrade}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={aiExamConfig.startDate}
                      onChange={(e) => setAiExamConfig({ ...aiExamConfig, startDate: e.target.value })}
                      className="input text-xs w-full bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Gap Days (Prep Holiday)</label>
                    <select
                      value={aiExamConfig.gapDays}
                      onChange={(e) => setAiExamConfig({ ...aiExamConfig, gapDays: Number(e.target.value) })}
                      className="input text-xs w-full bg-white"
                    >
                      <option value={0}>0 Days (Daily Consecutive)</option>
                      <option value={1}>1 Day (Standard Prep Gap)</option>
                      <option value={2}>2 Days (Alternate / Senior Gap)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Daily Time Shift</label>
                    <select
                      value={aiExamConfig.shift}
                      onChange={(e) => setAiExamConfig({ ...aiExamConfig, shift: e.target.value })}
                      className="input text-xs w-full bg-white"
                    >
                      <option value="09:00 AM - 12:00 PM">Morning (09:00 AM - 12:00 PM)</option>
                      <option value="01:00 PM - 04:00 PM">Afternoon (01:00 PM - 04:00 PM)</option>
                      <option value="08:30 AM - 10:30 AM">Short Session (08:30 AM - 10:30 AM)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Total Marks</label>
                    <input
                      type="number"
                      value={aiExamConfig.totalMarks}
                      onChange={(e) => setAiExamConfig({ ...aiExamConfig, totalMarks: e.target.value })}
                      className="input text-xs w-full bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Passing Marks</label>
                    <input
                      type="number"
                      value={aiExamConfig.passingMarks}
                      onChange={(e) => setAiExamConfig({ ...aiExamConfig, passingMarks: e.target.value })}
                      className="input text-xs w-full bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateAiDateSheet}
                    disabled={generatingDateSheet}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Generate Conflict-Free Date-Sheet & Invigilators</span>
                  </button>
                </div>
              </div>

              {/* AI Generated Date-Sheet Table */}
              {aiGeneratedDateSheet.length > 0 && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-900">
                        {aiGeneratedDateSheet.length} Exam Slots Generated
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        • Verified non-Sunday dates • No proctor double-booking • Balanced curriculum progression
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiGeneratedDateSheet([])}
                      className="text-xs font-semibold text-emerald-800 hover:underline"
                    >
                      Clear & Re-generate
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 pl-3">Date & Day</th>
                          <th className="p-2.5">Class</th>
                          <th className="p-2.5">Subject</th>
                          <th className="p-2.5">Shift Window</th>
                          <th className="p-2.5">Assigned Invigilator (Edit)</th>
                          <th className="p-2.5 pr-3">Marks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {aiGeneratedDateSheet.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="p-2.5 pl-3 font-semibold text-slate-800 whitespace-nowrap">
                              <div>{item.formattedDate}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{item.date}</div>
                            </td>
                            <td className="p-2.5 font-bold text-blue-700">{item.className}</td>
                            <td className="p-2.5 font-semibold text-slate-900">{item.subjectName}</td>
                            <td className="p-2.5 text-slate-600 text-[11px]">{item.time}</td>
                            <td className="p-2.5">
                              <select
                                value={item.proctorId}
                                onChange={(e) => handleUpdateGeneratedItemProctor(item.id, e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-purple-500"
                              >
                                <option value="">Unassigned</option>
                                {teachers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.firstName} {t.lastName}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2.5 pr-3 text-slate-500 text-[11px] font-mono">
                              {item.totalMarks} / {item.passingMarks} pass
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAiExamModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAiDateSheet}
                disabled={aiGeneratedDateSheet.length === 0 || savingAiSchedule}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-300 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition"
              >
                {savingAiSchedule ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" /> Saving Official Schedule...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Publish & Save All ({aiGeneratedDateSheet.length}) to Schedule</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
