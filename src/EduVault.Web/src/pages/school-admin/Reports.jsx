import { useState, useEffect, useCallback } from "react";
import Topbar from "../../components/layout/Topbar";
import { apiClient, expressClient } from "../../api/apiClient";
import { 
  Check, 
  AlertCircle, 
  Eye, 
  Send, 
  RotateCcw, 
  Globe, 
  CheckCircle2, 
  Loader2,
  Printer,
  X 
} from "lucide-react";


const getBadgeStyle = (examType) => {
  const styles = {
    "Semester Examination": "bg-blue-50 text-blue-700 border-blue-200",
    "Mid Term": "bg-amber-50 text-amber-700 border-amber-200",
    "Final Examination": "bg-violet-50 text-violet-700 border-violet-200",
  };
  return styles[examType] || "bg-gray-50 text-gray-600 border-gray-200";
};

const Reports = () => {
  const savedUser = localStorage.getItem('eduvault_user');
  const loggedInUser = savedUser ? JSON.parse(savedUser) : null;
  const schoolName = loggedInUser?.schoolName || "EduVault Advanced Academy";

  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [reportDetails, setReportDetails] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [selectedReportExamType, setSelectedReportExamType] = useState("Semester Examination");

  // Per-student approval state map: { [studentId]: { isApproved, approvedAt } }
  const [approvals, setApprovals] = useState({});
  const [actionLoading, setActionLoading] = useState({}); // { [studentId]: true/false }
  const [bulkLoading, setBulkLoading] = useState(false);

  // Load classes + students + exam types on mount
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [clsRes, studRes, etRes] = await Promise.all([
        apiClient.get("/academics/classes"),
        apiClient.get("/academics/students"),
        apiClient.get("/academics/exam-types"),
      ]);
      const classesData = Array.isArray(clsRes.data) ? clsRes.data : [];
      setClassesList(classesData);
      if (classesData.length > 0) setSelectedClassId(classesData[0].id);
      setStudents(Array.isArray(studRes.data) ? studRes.data : []);

      const examTypesData = Array.isArray(etRes.data) && etRes.data.length > 0 
        ? etRes.data.map(et => et.name) 
        : ["Semester Examination", "Mid Term", "Final Examination"];
      setExamTypes(examTypesData);
      if (examTypesData.length > 0) {
        if (examTypesData.includes("Semester Examination")) {
          setSelectedReportExamType("Semester Examination");
        } else {
          setSelectedReportExamType(examTypesData[0]);
        }
      }
    } catch (err) {
      console.error("Error loading reports data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reload approvals whenever class or exam type changes
  const fetchApprovals = useCallback(async (classId, examType) => {
    if (!classId || !examType) return;
    try {
      const res = await apiClient.get(
        `/academics/report-approvals?classId=${classId}&examType=${encodeURIComponent(examType)}`
      );
      const map = {};
      (Array.isArray(res.data) ? res.data : []).forEach((a) => {
        map[a.studentId] = { 
          isApproved: a.isApproved, 
          approvedAt: a.approvedAt,
          hasMarks: a.hasMarks
        };
      });
      setApprovals(map);
    } catch (err) {
      console.error("Error loading approvals:", err);
      setApprovals({});
    }
  }, []);

  useEffect(() => {
    fetchApprovals(selectedClassId, selectedReportExamType);
  }, [selectedClassId, selectedReportExamType, fetchApprovals]);

  const selectedClass = classesList.find((c) => c.id === selectedClassId);
  const classStudents = students.filter((s) => s.classId === selectedClassId && approvals[s.id]?.hasMarks === true);
  const allApproved =
    classStudents.length > 0 &&
    classStudents.every((s) => approvals[s.id]?.isApproved);
  const anyNotApproved = classStudents.some((s) => !approvals[s.id]?.isApproved);

  const publishedTypesStr = selectedClass?.publishedExamTypes || selectedClass?.PublishedExamTypes || '';
  const isExamTypePublished = publishedTypesStr
    .split(',')
    .map(t => t.trim().toLowerCase())
    .includes(selectedReportExamType.toLowerCase());

  // --- Approve single student ---
  const handleApprove = async (student) => {
    setActionLoading((prev) => ({ ...prev, [student.id]: true }));
    try {
      await apiClient.post("/academics/report-approvals/approve", {
        classId: selectedClassId,
        studentId: student.id,
        examType: selectedReportExamType,
      });
      setApprovals((prev) => ({
        ...prev,
        [student.id]: { 
          ...prev[student.id], 
          isApproved: true, 
          approvedAt: new Date().toISOString() 
        },
      }));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to approve report.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [student.id]: false }));
    }
  };

  // --- Revoke single student ---
  const handleRevoke = async (student) => {
    const reason = window.prompt("Enter reason for revoking (will be sent to teacher):");
    if (reason === null) return;
    if (!reason.trim()) { alert("A reason is required."); return; }
    setActionLoading((prev) => ({ ...prev, [student.id]: true }));
    try {
      const res = await apiClient.post("/academics/report-approvals/revoke", {
        classId: selectedClassId,
        studentId: student.id,
        examType: selectedReportExamType,
        reason,
      });
      // Notify class teacher
      const { classTeacherId, className } = res.data;
      if (classTeacherId) {
        try {
          await expressClient.post("/notifications", {
            recipientId: [classTeacherId],
            title: "?? Report Revoked — Re-edit Required",
            body: `A report for ${student.name} in ${className} (${selectedReportExamType}) has been revoked. Reason: ${reason}. Please re-enter marks and resubmit.`,
            type: "URGENT",
          });
        } catch (e) { console.error("Notification error:", e); }
      }
      setApprovals((prev) => ({
        ...prev,
        [student.id]: { isApproved: false, approvedAt: null },
      }));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to revoke report.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [student.id]: false }));
    }
  };

  // --- Bulk Approve ---
  const handleBulkApprove = async () => {
    if (!selectedClassId || !selectedClass) return;
    if (!window.confirm(`Approve ALL ${classStudents.length} student reports for ${selectedReportExamType}?`)) return;
    setBulkLoading(true);
    try {
      await apiClient.post("/academics/report-approvals/bulk-approve", {
        classId: selectedClassId,
        examType: selectedReportExamType,
      });
      // Update local state
      const newApprovals = { ...approvals };
      classStudents.forEach((s) => {
        if (newApprovals[s.id]?.hasMarks) {
          newApprovals[s.id] = { 
            ...newApprovals[s.id],
            isApproved: true, 
            approvedAt: new Date().toISOString() 
          };
        }
      });
      setApprovals(newApprovals);
    } catch (err) {
      alert(err.response?.data?.error || "Bulk approval failed.");
    } finally {
      setBulkLoading(false);
    }
  };

  const [publishLoading, setPublishLoading] = useState(false);

  const handlePublish = async (publish) => {
    if (!selectedClassId || !selectedReportExamType) return;
    const actionText = publish ? "Publish" : "Unpublish";
    if (!window.confirm(`Are you sure you want to ${actionText.toLowerCase()} reports for ${selectedReportExamType}?`)) return;

    setPublishLoading(true);
    try {
      const res = await apiClient.post(`/academics/classes/${selectedClassId}/toggle-marks-publication`, {
        publish,
        examType: selectedReportExamType,
      });

      // Update local classesList
      setClassesList((prev) =>
        prev.map((c) =>
          c.id === selectedClassId
            ? { ...c, publishedExamTypes: res.data.publishedExamTypes, PublishedExamTypes: res.data.publishedExamTypes }
            : c
        )
      );

      if (publish) {
        // Send notification to all approved students in this class
        const approvedStudentIds = classStudents.filter((s) => approvals[s.id]?.isApproved).map((s) => s.id);
        if (approvedStudentIds.length > 0) {
          try {
            await expressClient.post("/notifications", {
              recipientId: approvedStudentIds,
              title: "🎉 Result Published!",
              body: `Your ${selectedReportExamType} result for Class ${selectedClass?.grade} - ${selectedClass?.section} has been published. You can now view your report card.`,
              type: "GENERAL",
            });
          } catch (e) {
            console.error("Notification error during publish:", e);
          }
        }
        alert("Reports published successfully and approved students notified!");
      } else {
        alert("Reports unpublished successfully.");
      }
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${actionText.toLowerCase()} reports.`);
    } finally {
      setPublishLoading(false);
    }
  };

  // --- View Report ---
  const handleViewReport = async (student) => {
    setSelectedStudent(student);
    setLoadingReport(true);
    setReportDetails(null);
    try {
      const res = await apiClient.get(
        `/exams/student/performance?studentId=${student.id}&examType=${encodeURIComponent(selectedReportExamType)}`
      );
      setReportDetails(res.data);
    } catch (err) {
      console.error("Failed to load performance report:", err);
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div>
      <div className="no-print">
        <Topbar
          title="Academic Reports & Release"
          subtitle="Dashboard › Academics › Student Reports"
        />
      </div>

      {/* Print styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body, html {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sidebar, 
          .no-print, 
          .no-print * {
            display: none !important;
          }
          .main-content {
            margin: 0 !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .space-y-4 {
            display: none !important;
          }
          .print-modal-backdrop {
            position: relative !important;
            background: transparent !important;
            padding: 0 !important;
            display: block !important;
            z-index: auto !important;
            inset: auto !important;
            overflow: visible !important;
          }
          .printable-card-modal {
            border: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background-color: white !important;
          }
        }
      `}} />

      <div className="space-y-4">
        {/* Filters row */}
        <div className="card no-print">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-2xs font-bold text-gray-400 uppercase mb-1">Class Section</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="input text-sm"
              >
                <option value="">— Select Class —</option>
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    Class {c.grade} - {c.section}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="block text-2xs font-bold text-gray-400 uppercase mb-1">Examination Type</label>
              <select
                value={selectedReportExamType}
                onChange={(e) => setSelectedReportExamType(e.target.value)}
                className="input text-sm"
              >
                {examTypes.map((et) => (
                  <option key={et} value={et}>{et}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 pt-4">
              {anyNotApproved && (
                <button
                  onClick={handleBulkApprove}
                  disabled={bulkLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                >
                  ✓ Bulk Approve All ({classStudents.filter(s => !approvals[s.id]?.isApproved).length} pending)
                </button>
              )}
              {allApproved && classStudents.length > 0 && (
                <span className="px-3 py-2 rounded-xl text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                  ✓ All {classStudents.length} reports approved
                </span>
              )}

              {/* Publish / Unpublish Button */}
              {classStudents.some(s => approvals[s.id]?.isApproved) && (
                <>
                  {!isExamTypePublished ? (
                    <button
                      onClick={() => handlePublish(true)}
                      disabled={publishLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm disabled:opacity-60 flex items-center gap-1.5"
                    >
                      🚀 Publish Reports
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                        📢 Published
                      </span>
                      <button
                        onClick={() => handlePublish(false)}
                        disabled={publishLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all disabled:opacity-60"
                      >
                        Unpublish
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="card no-print">
          <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-4">
            <div>
              <h3 className="font-display font-semibold text-primary m-0">
                Student Roster:{" "}
                {selectedClass
                  ? `Class ${selectedClass.grade} - ${selectedClass.section}`
                  : "No Class Selected"}
              </h3>
              <p className="text-2xs text-gray-400 mt-0.5">
                {selectedReportExamType} · {classStudents.length} Students
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold border ${getBadgeStyle(selectedReportExamType)}`}>
              {selectedReportExamType}
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-3" />
              Loading class roster...
            </div>
          ) : classStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th text-left">Student Name</th>
                    <th className="table-th">Roll No.</th>
                    <th className="table-th">Guardian</th>
                    <th className="table-th">Exam Type</th>
                    <th className="table-th">Approval Status</th>
                    <th className="table-th">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student) => {
                    const approval = approvals[student.id];
                    const isApproved = approval?.isApproved === true;
                    const isLoading = actionLoading[student.id];
                    return (
                      <tr
                        key={student.id}
                        className={`border-b border-gray-50 transition-colors ${isApproved ? "bg-green-50/40" : "hover:bg-gray-50"}`}
                      >
                        {/* Student Name */}
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isApproved ? "bg-green-100 text-green-700" : "bg-primary/5 text-primary"}`}>
                              {student.name ? student.name[0].toUpperCase() : "?"}
                            </div>
                            <div>
                              <div className="font-semibold text-sm text-primary">{student.name}</div>
                              <div className="text-xs text-gray-400">{student.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Roll No */}
                        <td className="table-td text-xs font-mono text-gray-500">
                          {student.studentId || "N/A"}
                        </td>

                        {/* Guardian */}
                        <td className="table-td text-sm text-gray-600">
                          {student.father || "N/A"}
                        </td>

                        {/* Exam Type badge */}
                        <td className="table-td">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getBadgeStyle(selectedReportExamType)}`}>
                            {selectedReportExamType}
                          </span>
                        </td>

                        {/* Approval Status */}
                        <td className="table-td">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-extrabold bg-green-100 text-green-700 border border-green-200">
                              <Check className="w-3.5 h-3.5" /> Approved
                            </span>
                          ) : approvals[student.id]?.hasMarks === false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-extrabold bg-gray-100 text-gray-400 border border-gray-200">
                              <AlertCircle className="w-3.5 h-3.5 text-gray-400" /> No Marks
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-2xs font-extrabold bg-amber-50 text-amber-600 border border-amber-200">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Pending
                            </span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewReport(student)}
                              disabled={approvals[student.id]?.hasMarks === false}
                              className="px-2.5 py-1.5 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            {!isApproved ? (
                              <button
                                onClick={() => handleApprove(student)}
                                disabled={isLoading || approvals[student.id]?.hasMarks === false}
                                className="px-2.5 py-1.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center gap-1"
                              >
                                {isLoading ? <Loader2 className="animate-spin w-3 h-3" /> : <Check className="w-3.5 h-3.5" />} Approve
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRevoke(student)}
                                disabled={isLoading}
                                className="px-2.5 py-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-all disabled:opacity-60 flex items-center gap-1"
                              >
                                {isLoading ? <Loader2 className="animate-spin w-3 h-3" /> : <RotateCcw className="w-3.5 h-3.5" />} Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400 text-sm">
              {selectedClassId
                ? "No students currently enrolled in this class."
                : "Please select a class to view students."}
            </div>
          )}
        </div>
      </div>

      {/* Individual Report Card Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 print-modal-backdrop overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden printable-card-modal">
            {/* Modal Header */}
            <div className="bg-primary p-5 text-white flex justify-between items-center no-print">
              <div>
                <h4 className="font-bold text-base">Student Performance Record</h4>
                <p className="text-blue-200 text-2xs">
                  {selectedReportExamType} · {approvals[selectedStudent?.id]?.isApproved ? "Approved" : "Pending Approval"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-white hover:text-blue-100 text-lg ml-2 flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Report body */}
            <div className="p-6">
              <div className="border-b-2 border-primary pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">
                      {schoolName.toUpperCase()}
                    </h1>
                    <p className="text-xs text-gray-400 font-light mt-0.5">
                      Academic Progress Report Card · Official Record
                    </p>
                  </div>
                  <div className="text-right">
                    <h2 className="font-display font-bold text-sm text-primary uppercase">
                      Report Summary
                    </h2>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-3xs font-extrabold border ${getBadgeStyle(selectedReportExamType)}`}>
                      {selectedReportExamType}
                    </span>
                    <br />
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-3xs font-extrabold ${approvals[selectedStudent?.id]?.isApproved ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>
                      {approvals[selectedStudent?.id]?.isApproved ? "APPROVED" : "PENDING APPROVAL"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Student info */}
              <div className="mb-6 pb-6 border-b border-gray-100 text-sm space-y-2">
                <div className="flex justify-between items-center w-full">
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Student Name:</span>
                    <span className="font-bold text-primary">{selectedStudent.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Student ID:</span>
                    <span className="font-mono text-gray-700 font-semibold">{selectedStudent.studentId || "N/A"}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center w-full">
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Class:</span>
                    <span className="font-semibold text-primary">
                      Class {selectedClass?.grade} - {selectedClass?.section}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Guardian/Relationship:</span>
                    <span className="font-medium text-gray-600">Father</span>
                  </div>
                </div>
                <div className="flex justify-between items-center w-full">
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Father Name:</span>
                    <span className="font-semibold text-primary">{selectedStudent.father || "N/A"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Contact Number:</span>
                    <span className="font-medium text-gray-600">{selectedStudent.guardianPhone || "N/A"}</span>
                  </div>
                </div>
              </div>

              {loadingReport ? (
                <div className="py-20 text-center text-gray-400 text-sm">
                  <Loader2 className="animate-spin w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  Fetching grades and analytics...
                </div>
              ) : reportDetails ? (
                <div>
                  <div className="flex flex-row justify-between border border-gray-100 rounded-xl p-4 mb-6 bg-gray-50/50 gap-4">
                    {[
                      { l: "Semester GPA", v: reportDetails.semesterGpa || "N/A", c: "text-primary" },
                      { l: "Cumulative GPA", v: reportDetails.cumulativeGpa || "N/A", c: "text-blue-600" },
                      { l: "Class Rank", v: reportDetails.classRank || "N/A", c: "text-green-600" },
                      { l: "Attendance", v: reportDetails.attendance || "100.0%", c: "text-amber-600" },
                    ].map((s, idx) => (
                      <div key={s.l} className={`flex-1 ${idx > 0 ? 'border-l border-gray-200 pl-4' : ''}`}>
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">{s.l}</div>
                        <div className={`font-display text-lg font-black ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>

                  <h4 className="font-display font-semibold text-xs text-primary uppercase tracking-wider mb-3">
                    Detailed Subject Breakdown
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="table-th text-left py-2">Subject</th>
                        <th className="table-th py-2">Theory (70)</th>
                        <th className="table-th py-2">Practical (30)</th>
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
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold ${s.status === "Pass" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!reportDetails.subjectsBreakdown || reportDetails.subjectsBreakdown.length === 0) && (
                        <tr>
                          <td colSpan="6" className="text-center py-6 text-gray-400 text-xs">
                            No grades submitted yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

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
                <div className="py-20 text-center text-red-500 text-sm">
                  Failed to load performance report.
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-5 bg-gray-50 border-t border-gray-100 no-print">
              <div className="flex gap-2">
                {selectedStudent && !approvals[selectedStudent?.id]?.isApproved && (
                  <button
                    onClick={() => { handleApprove(selectedStudent); setSelectedStudent(null); }}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all"
                  >
                    ? Approve This Report
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
