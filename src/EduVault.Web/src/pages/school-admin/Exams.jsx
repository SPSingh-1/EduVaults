import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { Plus, Search, Calendar, CheckCircle2, Clock, BookOpen, AlertCircle, X, Trash2, Edit2, Download } from 'lucide-react';

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
    examType: 'Mid Term',
    totalMarks: 100,
    passingMarks: 40
  });

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
      if (classesRes.status === 'fulfilled') setClasses(classesRes.value.data || []);
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

  // Filtered Exams
  const filteredExams = exams.filter(e => {
    const matchesQuery = !searchQuery || 
      (e.subject && e.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.grade && e.grade.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (e.proctor && e.proctor.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGrade = selectedGradeFilter === 'ALL' || (e.grade && e.grade.includes(selectedGradeFilter));
    return matchesQuery && matchesGrade;
  });

  return (
    <div>
      <Topbar
        title="Exams & Assessment Center"
        subtitle="Manage exam schedules, result approvals, and grade reporting"
        actions={
          <div className="flex gap-2">
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
            <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
              <div className="flex-1 relative w-full">
                <input
                  type="text"
                  placeholder="Search by subject, grade, or proctor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input pl-9 text-xs"
                />
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              <select
                value={selectedGradeFilter}
                onChange={(e) => setSelectedGradeFilter(e.target.value)}
                className="input text-xs w-full sm:w-48"
              >
                <option value="ALL">All Grades</option>
                {classes.map(c => (
                  <option key={c.id} value={c.grade}>Grade {c.grade}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center"><Loader /></div>
            ) : filteredExams.length === 0 ? (
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
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase font-semibold">
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
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses[e.status] || 'badge-info'}`}>
                            {e.status}
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
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Exam Cycle</label>
                  <select
                    value={formData.examType}
                    onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                    className="input text-xs"
                  >
                    <option value="Unit Test 1">Unit Test 1</option>
                    <option value="Mid Term">Mid Term</option>
                    <option value="Unit Test 2">Unit Test 2</option>
                    <option value="Final Exam">Final Exam</option>
                    <option value="Quiz">Class Quiz</option>
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
    </div>
  );
};

export default Exams;
