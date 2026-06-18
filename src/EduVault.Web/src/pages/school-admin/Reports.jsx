import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';

const Reports = () => {
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [denying, setDenying] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clsRes = await apiClient.get('/academics/classes');
      const classesData = Array.isArray(clsRes.data) ? clsRes.data : [];
      setClassesList(classesData);

      if (classesData.length > 0) {
        setSelectedClassId(classesData[0].id);
      }

      const studRes = await apiClient.get('/academics/students');
      setStudents(Array.isArray(studRes.data) ? studRes.data : []);
    } catch (err) {
      console.error('Error loading data for reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedClass = classesList.find(c => c.id === selectedClassId);
  const classStudents = students.filter(s => s.classId === selectedClassId);

  const handleTogglePublication = async () => {
    if (!selectedClassId || !selectedClass) return;
    setPublishing(true);
    const newStatus = !selectedClass.areMarksPublished;
    try {
      await apiClient.post(`/academics/classes/${selectedClassId}/toggle-marks-publication`, newStatus, {
        headers: { 'Content-Type': 'application/json' }
      });
      // Update local state
      setClassesList(prev => prev.map(c => c.id === selectedClassId ? { ...c, areMarksPublished: newStatus } : c));

      // If published/released, notify all students of this class
      if (newStatus) {
        const studentIds = classStudents.map(s => s.id);
        if (studentIds.length > 0) {
          try {
            await expressClient.post('/notifications', {
              recipientId: studentIds,
              title: '🏆 Report Cards Released!',
              body: `Official report cards for Class ${selectedClass.grade} - ${selectedClass.section} have been released. You can now view your final results in the Performance portal.`,
              type: 'GENERAL'
            });
          } catch (e) {
            console.error('Failed to push release notifications to students:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to update publication status:', err);
      alert('Error updating report cards release status.');
    } finally {
      setPublishing(false);
    }
  };

  const handleDenyMarks = async () => {
    if (!selectedClassId || !selectedClass) return;
    const reason = window.prompt("Enter rejection reason for the teacher:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("A reason is required to deny marks submission.");
      return;
    }
    setDenying(true);
    try {
      const res = await apiClient.post(`/academics/classes/${selectedClassId}/deny-marks`, { reason });
      const { classTeacherId, className } = res.data;
      if (classTeacherId) {
        try {
          await expressClient.post('/notifications', {
            recipientId: [classTeacherId],
            title: '❌ Marks Submission Rejected',
            body: `The marks submission for ${className} has been rejected by the administrator. Reason: ${reason}. Please revise and resubmit.`,
            type: 'URGENT'
          });
        } catch (e) {
          console.error('Failed to push notification to teacher:', e);
        }
      }
      alert("Marks submission rejected and class teacher notified successfully.");
    } catch (err) {
      console.error('Failed to deny marks:', err);
      alert(err.response?.data?.error || 'Error denying marks submission.');
    } finally {
      setDenying(false);
    }
  };

  const handleViewReport = async (student) => {
    setSelectedStudent(student);
    setLoadingReport(true);
    setReportDetails(null);
    try {
      const res = await apiClient.get(`/exams/student/performance?studentId=${student.id}`);
      setReportDetails(res.data);
    } catch (err) {
      console.error('Failed to load performance report:', err);
      alert('Error loading performance details for student.');
    } finally {
      setLoadingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <Topbar title="Academic Reports & Release" subtitle="Dashboard › Academics › Student Reports" />

      {/* Printable Area CSS hack */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          .main-content, .main-content *, 
          #root, #root *,
          body * {
            visibility: hidden;
          }
          .printable-card-modal, .printable-card-modal * {
            visibility: visible;
          }
          .printable-card-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            background-color: white !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <div className="grid grid-cols-4 gap-6">
        {/* Class Selection & Publication Toggle Panel */}
        <div className="col-span-1 space-y-4">
          <div className="card">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-primary/60 mb-3">Select Class Section</h3>
            
            <div className="mb-4">
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="input text-sm"
              >
                <option value="">— Select Class —</option>
                {classesList.map(c => (
                  <option key={c.id} value={c.id}>
                    Class {c.grade} - {c.section}
                  </option>
                ))}
              </select>
            </div>

            {selectedClass && (
              <div className="border-t border-gray-100 pt-4 mt-2">
                <div className="text-2xs font-semibold text-gray-400 uppercase mb-2">Publication Control</div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">Report Visibility</span>
                    <span className={`badge text-2xs font-extrabold ${selectedClass.areMarksPublished ? 'badge-success' : 'bg-slate-100 text-slate-500'}`}>
                      {selectedClass.areMarksPublished ? '● Released' : '● Unpublished'}
                    </span>
                  </div>

                  <button
                    onClick={handleTogglePublication}
                    disabled={publishing}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      selectedClass.areMarksPublished
                        ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                        : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {publishing
                      ? 'Updating...'
                      : selectedClass.areMarksPublished
                      ? '🔒 Lock / Revoke Reports'
                      : '🔓 Publish / Release Reports'}
                  </button>
                  {!selectedClass.areMarksPublished && (
                    <button
                      onClick={handleDenyMarks}
                      disabled={denying}
                      className="w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                    >
                      {denying ? 'Denying...' : '❌ Deny Marks Submission'}
                    </button>
                  )}
                  <p className="text-[10px] text-gray-400 font-light leading-relaxed">
                    {selectedClass.areMarksPublished
                      ? 'Report cards are visible on student dashboards. Click above to hide them.'
                      : 'Report cards are hidden. Click above to release marks for Class ' + selectedClass.grade + ' - ' + selectedClass.section + '.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="col-span-3 card">
          <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
            <h3 className="font-display font-semibold text-primary m-0">
              Student Roster: {selectedClass ? `Class ${selectedClass.grade} - ${selectedClass.section}` : 'No Class Selected'}
            </h3>
            <span className="text-xs text-gray-400 font-medium">{classStudents.length} Students</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <div className="animate-spin text-2xl mb-3">⏳</div>
              Loading class roster...
            </div>
          ) : classStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th text-left">Student Name</th>
                    <th className="table-th">Roll Number</th>
                    <th className="table-th">Guardian</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Report Card</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(student => (
                    <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary text-xs">
                            {student.name ? student.name[0].toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-primary">{student.name}</div>
                            <div className="text-xs text-gray-400">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-xs font-mono text-gray-500">{student.studentId || 'N/A'}</td>
                      <td className="table-td text-sm text-gray-600">{student.father || 'N/A'}</td>
                      <td className="table-td">
                        <span className="badge badge-success text-2xs uppercase font-extrabold">{student.status}</span>
                      </td>
                      <td className="table-td">
                        <button
                          onClick={() => handleViewReport(student)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all"
                        >
                          📈 View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 text-sm">
              No students currently enrolled in this class.
            </div>
          )}
        </div>
      </div>

      {/* Individual Report Card Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 no-print overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden printable-card-modal">
            {/* Modal Header */}
            <div className="bg-primary p-5 text-white flex justify-between items-center no-print">
              <div>
                <h4 className="font-bold text-base">Student Performance Record</h4>
                <p className="text-blue-200 text-2xs">Pre-release review dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg flex items-center gap-1.5 transition-all"
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-white hover:text-blue-100 text-lg ml-2"
                >
                  ✖
                </button>
              </div>
            </div>

            {/* Official Report Card Printable Layout */}
            <div className="p-6">
              {/* Header for printing */}
              <div className="border-b-2 border-primary pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">EDUVAULT ADVANCED ACADEMY</h1>
                    <p className="text-xs text-gray-400 font-light mt-0.5">
                      Academic Progress Report Card · Official Record
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="font-display font-bold text-sm text-primary uppercase">Report Summary</h2>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-3xs font-extrabold ${selectedClass?.areMarksPublished ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                      {selectedClass?.areMarksPublished ? 'PUBLISHED' : 'DRAFT / HIDDEN'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student info */}
              <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100 text-sm">
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase w-24">Student Name:</span>
                    <span className="font-bold text-primary">{selectedStudent.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase w-24">Student ID:</span>
                    <span className="font-mono text-gray-700 font-semibold">{selectedStudent.studentId || 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase w-24">Class Section:</span>
                    <span className="font-semibold text-primary">Class {selectedClass?.grade} - {selectedClass?.section}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase w-24">Guardian:</span>
                    <span className="font-medium text-gray-600">{selectedStudent.father || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {loadingReport ? (
                <div className="py-20 text-center text-gray-400 text-sm">
                  <div className="animate-spin text-2xl mb-2">⏳</div>
                  Fetching grades and cumulative analytics...
                </div>
              ) : reportDetails ? (
                <div>
                  {/* Performance stats cards */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    {[
                      { l: 'Semester GPA', v: reportDetails.semesterGpa || 'N/A', c: 'text-primary' },
                      { l: 'Cumulative GPA', v: reportDetails.cumulativeGpa || 'N/A', c: 'text-blue-600' },
                      { l: 'Class Rank', v: reportDetails.classRank || 'N/A', c: 'text-green-600' },
                      { l: 'Attendance Rate', v: reportDetails.attendance || '100.0%', c: 'text-amber-600' }
                    ].map(s => (
                      <div key={s.l} className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{s.l}</div>
                        <div className={`font-display text-lg font-bold ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Grades breakdown table */}
                  <h4 className="font-display font-semibold text-xs text-primary uppercase tracking-wider mb-3">Detailed Subject Breakdown</h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="table-th text-left py-2">Subject</th>
                        <th className="table-th py-2">Theory Marks (70)</th>
                        <th className="table-th py-2">Practical Marks (30)</th>
                        <th className="table-th py-2">Total (100)</th>
                        <th className="table-th py-2">Grade</th>
                        <th className="table-th py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportDetails.subjectsBreakdown?.map((s, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="table-td font-semibold text-xs text-primary py-2">{s.subject}</td>
                          <td className="table-td text-xs text-center py-2">{s.exam}</td>
                          <td className="table-td text-xs text-center py-2">{s.internal}</td>
                          <td className="table-td text-xs font-bold text-center py-2">{s.total}</td>
                          <td className="table-td text-center py-2">
                            <span className="font-extrabold text-xs text-green-600">{s.grade}</span>
                          </td>
                          <td className="table-td text-center py-2">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${s.status === 'Pass' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!reportDetails.subjectsBreakdown || reportDetails.subjectsBreakdown.length === 0) && (
                        <tr>
                          <td colSpan="6" className="text-center py-6 text-gray-400 text-xs">No grades submitted by subject teachers yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Signature Section */}
                  <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-100 text-center">
                    <div className="w-40">
                      <div className="h-8"></div>
                      <div className="border-t border-gray-400 text-[10px] font-semibold text-gray-500 pt-1">Class Teacher</div>
                    </div>
                    <div className="w-40">
                      <div className="h-8"></div>
                      <div className="border-t border-gray-400 text-[10px] font-semibold text-gray-500 pt-1">Principal / Registrar</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-red-500 text-sm">Failed to load performance report.</div>
              )}
            </div>

            {/* Footer buttons for screen view */}
            <div className="flex justify-end p-5 bg-gray-50 border-t border-gray-100 no-print">
              <button
                onClick={() => setSelectedStudent(null)}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
