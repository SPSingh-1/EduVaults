import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import Loader from '../../components/common/Loader';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY, formatDateRangeDDMMYYYY, getTodayStr } from '../../utils/dateUtils';
import DateFilterInput from '../../components/common/DateFilterInput';
import { formatClassLabel, formatGrade } from '../../utils/classUtils';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Building, 
  Users, 
  CheckSquare, 
  Calendar, 
  Edit, 
  PenTool, 
  MessageSquare, 
  Megaphone, 
  User, 
  DollarSign, 
  ClipboardList,
  CalendarDays,
  CalendarCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Send,
  Plus,
  X,
  Search,
  Filter,
  Trash2,
  Eye,
  Download,
  Upload,
  Check
} from 'lucide-react';

const showToast = (msg, type = 'info') => {
  if (typeof window !== 'undefined' && window.appToast?.[type]) {
    window.appToast[type](msg);
  } else {
    console.log(`[Toast ${type}]:`, msg);
  }
};

export const MarksEntry = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [subjectsList, setSubjectsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState(true);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('Semester Examination');

  const [marksSubTab, setMarksSubTab] = useState('marks'); // 'marks' | 'question_papers'
  const [examsList, setExamsList] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [uploadExamModal, setUploadExamModal] = useState(null);
  const [paperUploadForm, setPaperUploadForm] = useState({ fileUrl: '', paperContent: '', notes: '' });
  const [uploadingPaper, setUploadingPaper] = useState(false);
  const [paperUploadMsg, setPaperUploadMsg] = useState({ error: '', success: '' });

  // States for marks entry popup
  const [showMarksPopup, setShowMarksPopup] = useState(false);
  const [popupForm, setPopupForm] = useState({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
  const [globalSubjects, setGlobalSubjects] = useState([]);
  const [studentClassSubjects, setStudentClassSubjects] = useState([]);

  const fetchExamsList = async () => {
    try {
      setLoadingExams(true);
      const res = await apiClient.get('/exams/schedule');
      setExamsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load exams list:', err);
    } finally {
      setLoadingExams(false);
    }
  };

  const handleUploadPaper = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!uploadExamModal) return;
    setUploadingPaper(true);
    setPaperUploadMsg({ error: '', success: '' });
    try {
      const res = await apiClient.post(`/exams/${uploadExamModal.id}/upload-question-paper`, paperUploadForm);
      setPaperUploadMsg({ error: '', success: res.data?.message || 'Question paper submitted successfully!' });
      fetchExamsList();
      setTimeout(() => {
        setUploadExamModal(null);
        setPaperUploadForm({ fileUrl: '', paperContent: '', notes: '' });
        setPaperUploadMsg({ error: '', success: '' });
      }, 2000);
    } catch (err) {
      setPaperUploadMsg({ error: err.response?.data?.error || 'Failed to submit question paper.', success: '' });
    } finally {
      setUploadingPaper(false);
    }
  };

  const fetchRosterData = async () => {
    try {
      const classesRes = await apiClient.get('/academics/teacher/classes');
      const classesData = Array.isArray(classesRes.data) ? classesRes.data : [];
      setTeacherClasses(classesData);
      const classTeacherClasses = classesData.filter(c => c.isClassTeacher || c.IsClassTeacher);
      setIsClassTeacher(classTeacherClasses.length > 0);

      const classTeacherClassIds = classTeacherClasses.map(c => c.id);

      const res = await apiClient.get('/academics/students');
      const studentsData = Array.isArray(res.data) ? res.data : [];
      const filteredStudents = studentsData.filter(s => classTeacherClassIds.includes(s.classId));

      setStudents(filteredStudents);
      if (filteredStudents.length > 0) {
        setSelectedStudentId(filteredStudents[0].id);
      } else {
        setSelectedStudentId('');
      }

      // Fetch global subjects as fallback
      const subRes = await apiClient.get('/academics/subjects');
      setGlobalSubjects(Array.isArray(subRes.data) ? subRes.data : []);

      const etRes = await apiClient.get('/academics/exam-types');
      setExamTypes(etRes.data || []);
      if (etRes.data && etRes.data.length > 0) {
        setSelectedExamType(etRes.data[0].name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRosterData();
  }, []);

  const loadStudentGrades = async () => {
    if (!selectedStudentId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/exams/student/${selectedStudentId}/subjects?examType=${selectedExamType}`);
      setSubjectsList(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentGrades();
  }, [selectedStudentId, selectedExamType]);

  useEffect(() => {
    const fetchStudentClassSubjects = async () => {
      if (!selectedStudentId || students.length === 0) {
        setStudentClassSubjects([]);
        return;
      }
      const student = students.find(s => s.id === selectedStudentId);
      if (!student || !student.classId) {
        setStudentClassSubjects([]);
        return;
      }
      try {
        const res = await apiClient.get(`/academics/class-subjects/${student.classId}`);
        const list = Array.isArray(res.data) ? res.data : [];
        const mapped = list.map(cs => ({
          id: cs.subjectId,
          name: cs.subjectName,
          code: cs.subjectCode
        }));
        setStudentClassSubjects(mapped);
      } catch (err) {
        console.error('Error fetching student class subjects:', err);
      }
    };
    fetchStudentClassSubjects();
  }, [selectedStudentId, students]);

  const updateSubjectField = (subjId, field, val) => {
    setSubjectsList(prev => prev.map(s => s.subjectId === subjId ? { ...s, [field]: val } : s));
  };

  const handleSaveMarks = async () => {
    if (!selectedStudentId) return;
    setSavingProgress(true);
    try {
      const payload = {
        studentId: selectedStudentId,
        examType: selectedExamType,
        subjects: subjectsList.map(s => ({
          subjectId: s.subjectId,
          theoryMarks: s.theoryMarks === '' || s.theoryMarks === null ? null : parseFloat(s.theoryMarks),
          practicalMarks: s.practicalMarks === '' || s.practicalMarks === null ? null : parseFloat(s.practicalMarks),
          remarks: s.remarks || ''
        }))
      };

      await apiClient.post('/exams/results/student-marks', payload);

      // Send notices via Express auxiliary service to Student & Admin
      const studentObj = (students || []).find(s => s.id === selectedStudentId);
      let teacherUser = null;
      try {
        teacherUser = JSON.parse(localStorage.getItem('eduvault_user') || 'null');
      } catch {
        // fallback to default
      }
      const teacherName = teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}` : 'Class Teacher';

      try {
        // Send notice to School Admin for review/approval
        await expressClient.post('/notifications', {
          recipientId: 'SCHOOLADMINS',
          title: '📋 Student Marks Submitted for Review',
          body: `Semester grades updated for student ${studentObj?.name || 'Student'} by teacher ${teacherName}. Pending administrative approval and release.`,
          type: 'GENERAL'
        });
      } catch (e) {
        console.error('Failed to send notifications through auxiliary service', e);
      }

      showToast('Student theory and practical marks saved successfully! Submitted to admin for review.', 'success');
      loadStudentGrades();
    } catch (err) {
      console.error(err);
      showToast('Failed to save progress marks.', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const handlePopupSubjectChange = (subjectId) => {
    const existing = subjectsList.find(s => s.subjectId === subjectId);
    setPopupForm({
      subjectId,
      theoryMarks: existing && existing.theoryMarks !== null ? existing.theoryMarks.toString() : '',
      practicalMarks: existing && existing.practicalMarks !== null ? existing.practicalMarks.toString() : '',
      remarks: existing ? (existing.remarks || '') : ''
    });
  };

  const handleSavePopupMarks = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedStudentId || !popupForm.subjectId) return;

    setSubjectsList(prev => {
      const exists = prev.some(s => s.subjectId === popupForm.subjectId);
      if (exists) {
        return prev.map(s => s.subjectId === popupForm.subjectId ? {
          ...s,
          theoryMarks: popupForm.theoryMarks === '' ? null : parseFloat(popupForm.theoryMarks),
          practicalMarks: popupForm.practicalMarks === '' ? null : parseFloat(popupForm.practicalMarks),
          remarks: popupForm.remarks || ''
        } : s);
      } else {
        const gSub = studentClassSubjects.find(s => s.id === popupForm.subjectId) || globalSubjects.find(s => s.id === popupForm.subjectId);
        return [...prev, {
          subjectId: popupForm.subjectId,
          subjectName: gSub?.name || 'Unknown',
          subjectCode: gSub?.code || '',
          theoryMarks: popupForm.theoryMarks === '' ? null : parseFloat(popupForm.theoryMarks),
          practicalMarks: popupForm.practicalMarks === '' ? null : parseFloat(popupForm.practicalMarks),
          remarks: popupForm.remarks || ''
        }];
      }
    });

    setShowMarksPopup(false);
    setPopupForm({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const classForSelectedStudent = selectedStudent ? teacherClasses.find(c => c.id === selectedStudent.classId) : null;
  const publishedExamTypes = classForSelectedStudent?.publishedExamTypes || classForSelectedStudent?.PublishedExamTypes || '';
  const isApproved = selectedExamType 
    ? publishedExamTypes
        .split(',')
        .map(t => t.trim().toLowerCase())
        .includes(selectedExamType.toLowerCase())
    : false;

  if (!isClassTeacher) {
    return (
      <div>
        <Topbar title="Student Marks Entry" />
        <div className="card max-w-xl mx-auto mt-8 text-center p-8 border border-amber-100 bg-amber-50/20 rounded-2xl">
          <div className="text-4xl mb-3">⚠️</div>
          <h3 className="font-display font-bold text-lg text-primary mb-2">Access Denied</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-5">
            Marks entry is restricted to Class Teachers only. You are not currently assigned as a Class Teacher (Advisor) for any active class sections.
          </p>
          <div className="inline-block px-3 py-1.5 rounded-lg bg-amber-100/50 text-amber-800 text-xs font-semibold">
            Advisor Assignment Required
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Topbar title="Examination Management & Marks" subtitle="Curriculum assessment records and teacher question paper submissions" />

      {/* Subtabs Switcher */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setMarksSubTab('marks')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            marksSubTab === 'marks'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Student Marks Entry</span>
        </button>
        <button
          onClick={() => { setMarksSubTab('question_papers'); fetchExamsList(); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            marksSubTab === 'question_papers'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>📄 Question Paper Submissions (3-Day Rule)</span>
        </button>
      </div>

      {marksSubTab === 'question_papers' ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-3">
            <div>
              <h3 className="font-display font-extrabold text-slate-900 text-sm m-0">
                Scheduled Exams & Question Paper Deadlines
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                School Policy: Teachers must upload question papers at least <strong>3 days prior</strong> to the scheduled exam date.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={async () => {
                  try {
                    const res = await apiClient.post('/exams/send-pending-paper-alerts');
                    showToast(res.data?.message || '5-Day pending paper alerts checked & sent.', 'info');
                  } catch (e) {
                    showToast('Failed to trigger alert check.', 'error');
                  }
                }}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold transition flex items-center gap-1"
                title="Test 5-Day countdown WhatsApp & notice engine"
              >
                <span>🔔 Test 5-Day Alerts</span>
              </button>
              <button onClick={fetchExamsList} className="btn-outline text-xs">
                🔄 Refresh List
              </button>
            </div>
          </div>

          {/* 5-Day Alert Policy Banner */}
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-center gap-2.5">
            <span className="text-base">📢</span>
            <p className="m-0 leading-relaxed">
              <strong>Automated 5-Day Warning Engine:</strong> EduVault automatically begins dispatching daily in-app notices and WhatsApp alerts to subject teachers starting <strong>5 days before exam day</strong> until the question paper is submitted. Paper submissions strictly lock <strong>3 days prior</strong> to the exam.
            </p>
          </div>

          {loadingExams ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading scheduled exams...</div>
          ) : examsList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No upcoming examinations scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="table-th">Subject & Class</th>
                    <th className="table-th">Exam Date</th>
                    <th className="table-th">Upload Deadline (3-Day)</th>
                    <th className="table-th">Submission Status</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {examsList.map(exam => {
                    return (
                      <tr key={exam.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="table-td">
                          <div className="font-bold text-slate-800">{exam.subject}</div>
                          <div className="text-[11px] text-slate-400">{exam.grade} • {exam.section || 'All Sections'} ({exam.examType})</div>
                        </td>
                        <td className="table-td">
                          <div className="font-semibold text-slate-700">{exam.date}</div>
                          <div className="text-[10px] text-slate-400">{exam.time || 'Morning Session'}</div>
                        </td>
                        <td className="table-td">
                          <div className="font-bold text-slate-800">{exam.deadlineDate}</div>
                          {exam.daysUntilExam !== undefined && (
                            <div className={`text-[10px] font-semibold ${
                              exam.daysUntilExam < 3 ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {exam.daysUntilExam > 0 ? `${exam.daysUntilExam} day(s) until exam` : 'Exam today/passed'}
                            </div>
                          )}
                        </td>
                        <td className="table-td">
                          {exam.paperStatus === 'Submitted' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✅ Paper Submitted
                            </span>
                          ) : exam.paperStatus === 'DeadlineMissed' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              ⛔ Deadline Missed (Locked)
                            </span>
                          ) : (
                            <div>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                ⏳ Pending Submission
                              </span>
                              {exam.daysUntilExam <= 5 && exam.daysUntilExam >= 3 && (
                                <span className="block mt-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200 animate-pulse text-center">
                                  🚨 5-Day Alert Active
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="table-td">
                          {exam.paperStatus === 'Submitted' ? (
                            <div className="flex items-center gap-2">
                              {exam.questionPaperUrl?.startsWith('http') ? (
                                <a 
                                  href={exam.questionPaperUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 font-bold hover:underline"
                                >
                                  View Doc
                                </a>
                              ) : (
                                <button 
                                  onClick={() => showToast(`Paper Content: ${exam.questionPaperUrl || 'No content provided'}`, 'info')}
                                  className="text-xs text-blue-600 font-bold hover:underline"
                                >
                                  View Paper
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setUploadExamModal(exam);
                                  setPaperUploadForm({ fileUrl: exam.questionPaperUrl || '', paperContent: '', notes: exam.questionPaperNotes || '' });
                                }}
                                className="text-[11px] text-slate-500 hover:text-slate-800"
                              >
                                Re-upload
                              </button>
                            </div>
                          ) : exam.canUpload ? (
                            <button
                              onClick={() => {
                                setUploadExamModal(exam);
                                setPaperUploadForm({ fileUrl: '', paperContent: '', notes: '' });
                              }}
                              className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition"
                            >
                              📤 Upload Paper
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Submission Closed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
          {isApproved && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-sm text-amber-800 flex items-center gap-2 font-medium">
              ⚠️ Reports for this class have been approved and published by the administration. Editing is locked.
            </div>
          )}

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-gray-50 pb-4">
              <div className="flex flex-wrap items-center gap-4 flex-1">
                <div className="w-72">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Select Student from Class Roster</label>
                  <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="input text-sm">
                    <option value="">Choose student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.class} {s.section})</option>
                    ))}
                  </select>
                </div>
            <div className="w-72">
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Select Examination Type</label>
              <select value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)} className="input text-sm">
                {examTypes.map(et => (
                  <option key={et.id} value={et.name}>{et.name}</option>
                ))}
              </select>
            </div>
          </div>
          {selectedStudentId && !isApproved && (
            <button
              onClick={() => setShowMarksPopup(true)}
              className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 mt-5"
            >
              <span>+ Enter Subject Mark</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading assigned curriculum subjects...</div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th text-left min-w-[100px]">Subject Code</th>
                    <th className="table-th text-left min-w-[150px]">Subject Name</th>
                    <th className="table-th min-w-[120px]">Theory Marks (70)</th>
                    <th className="table-th min-w-[120px]">Practical Marks (30)</th>
                    <th className="table-th min-w-[80px]">Total (100)</th>
                    <th className="table-th min-w-[200px]">Subject Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectsList.map((s, idx) => {
                    const theory = parseFloat(s.theoryMarks ?? 0);
                    const practical = parseFloat(s.practicalMarks ?? 0);
                    const total = s.theoryMarks !== null || s.practicalMarks !== null ? theory + practical : '-';
                    return (
                      <tr key={s.subjectId || idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td font-mono text-xs text-gray-400">{s.subjectCode}</td>
                        <td className="table-td font-semibold text-primary text-sm">{s.subjectName}</td>
                        <td className="table-td">
                          <input
                            type="number"
                            min="0"
                            max="70"
                            disabled={isApproved}
                            value={s.theoryMarks ?? ''}
                            onChange={e => updateSubjectField(s.subjectId, 'theoryMarks', e.target.value)}
                            placeholder="e.g. 55"
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center m-auto focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
                          />
                        </td>
                        <td className="table-td">
                          <input
                            type="number"
                            min="0"
                            max="30"
                            disabled={isApproved}
                            value={s.practicalMarks ?? ''}
                            onChange={e => updateSubjectField(s.subjectId, 'practicalMarks', e.target.value)}
                            placeholder="e.g. 25"
                            className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center m-auto focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
                          />
                        </td>
                        <td className="table-td text-center font-bold text-primary text-sm">{total}</td>
                        <td className="table-td">
                          <input
                            disabled={isApproved}
                            value={s.remarks || ''}
                            onChange={e => updateSubjectField(s.subjectId, 'remarks', e.target.value)}
                            placeholder="Feedback remark..."
                            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {subjectsList.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No subjects linked to this student's class.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {subjectsList.length > 0 && !isApproved && (
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                <button onClick={handleSaveMarks} disabled={savingProgress} className="btn-primary text-sm">
                  {savingProgress ? 'Saving Student Progress...' : '💾 Save Student Progress'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Upload Question Paper Modal (Enforcing 3-Day Submission Policy) */}
      {uploadExamModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-100">
            <div className="bg-gradient-to-r from-primary to-primary/90 px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-extrabold text-base flex items-center gap-2">
                  <span>📄 Upload Exam Question Paper</span>
                </h3>
                <p className="text-blue-100 text-xs mt-0.5">
                  {uploadExamModal.subject} — {uploadExamModal.grade} ({uploadExamModal.examType})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadExamModal(null);
                  setPaperUploadMsg({ error: '', success: '' });
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold transition text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadPaper} className="p-6 space-y-4">
              {/* Deadline reminder banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center justify-between">
                  <span>📅 Exam Date: {uploadExamModal.date}</span>
                  <span className="text-rose-600 font-extrabold">⏰ Deadline: {uploadExamModal.deadlineDate}</span>
                </div>
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  School rule: Teachers must submit final question papers at least <strong>3 days</strong> in advance to ensure admin review, proofreading, and secure printing.
                </p>
              </div>

              {paperUploadMsg.error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{paperUploadMsg.error}</span>
                </div>
              )}

              {paperUploadMsg.success && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-700 font-medium flex items-center gap-2">
                  <span>✅</span>
                  <span>{paperUploadMsg.success}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Question Paper Document URL / Cloud Link (Google Drive, Dropbox, PDF)
                </label>
                <input
                  type="url"
                  value={paperUploadForm.fileUrl}
                  onChange={e => setPaperUploadForm(p => ({ ...p, fileUrl: e.target.value }))}
                  placeholder="https://drive.google.com/file/d/... or secure cloud link"
                  className="input text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Provide a cloud link to the PDF/Word question paper.
                </p>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase">OR Paste Text</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Question Paper Text / Raw Questions
                </label>
                <textarea
                  rows={4}
                  value={paperUploadForm.paperContent}
                  onChange={e => setPaperUploadForm(p => ({ ...p, paperContent: e.target.value }))}
                  placeholder="Section A: Multiple Choice Questions (10 Marks)...&#10;Section B: Long Answer Questions (40 Marks)..."
                  className="input text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Notes for Exam Controller / Headmaster (Optional)
                </label>
                <input
                  type="text"
                  value={paperUploadForm.notes}
                  onChange={e => setPaperUploadForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="e.g. Graph paper required for Q4, 2 extra blank sheets needed per student."
                  className="input text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setUploadExamModal(null);
                    setPaperUploadMsg({ error: '', success: '' });
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingPaper || (!paperUploadForm.fileUrl.trim() && !paperUploadForm.paperContent.trim())}
                  className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs hover:bg-primary/90 disabled:opacity-50 transition flex items-center gap-1.5 shadow-sm"
                >
                  {uploadingPaper ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>🚀 Submit Question Paper</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enter Subject Mark Popup Modal */}
      {showMarksPopup && selectedStudentId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">✏️ Enter Subject Mark</h3>
                <p className="text-blue-200 text-xxs">
                  Student: {students.find(s => s.id === selectedStudentId)?.name || 'Select student'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMarksPopup(false);
                  setPopupForm({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
                }}
                className="text-white hover:text-blue-200 text-lg"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSavePopupMarks} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Subject *</label>
                <select
                  required
                  value={popupForm.subjectId}
                  onChange={e => handlePopupSubjectChange(e.target.value)}
                  className="input text-sm"
                >
                  <option value="">Choose Subject</option>
                  {studentClassSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code.toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Theory Marks (Max 70)</label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={popupForm.theoryMarks}
                    onChange={e => setPopupForm(p => ({ ...p, theoryMarks: e.target.value }))}
                    placeholder="e.g. 55"
                    className="input text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Practical Marks (Max 30)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={popupForm.practicalMarks}
                    onChange={e => setPopupForm(p => ({ ...p, practicalMarks: e.target.value }))}
                    placeholder="e.g. 25"
                    className="input text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject Remarks</label>
                <input
                  value={popupForm.remarks}
                  onChange={e => setPopupForm(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="Feedback / remark..."
                  className="input text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMarksPopup(false);
                    setPopupForm({ subjectId: '', theoryMarks: '', practicalMarks: '', remarks: '' });
                  }}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProgress || !popupForm.subjectId}
                  className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl"
                >
                  {savingProgress ? 'Saving...' : '💾 Save Marks'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Student Remarks Feed ---
export default MarksEntry;
