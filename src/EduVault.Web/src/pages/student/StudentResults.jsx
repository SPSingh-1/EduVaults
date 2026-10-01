import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import Loader from '../../components/common/Loader';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY, formatDateRangeDDMMYYYY, getTodayStr } from '../../utils/dateUtils';
import DateFilterInput from '../../components/common/DateFilterInput';
import { loadScript } from '../../utils/scriptLoader';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Trophy,
  Award,
  ClipboardList,
  PenTool,
  Wallet,
  Megaphone,
  User,
  CreditCard,
  Lock,
  MessageSquare,
  Printer,
  Building,
  GraduationCap,
  Mail,
  Fingerprint,
  MapPin,
  HeartPulse,
  BookOpen,
  ChevronDown,
  CalendarDays,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';
import { printRenderedDocument } from '../../components/print/PrintIframe';
import { CustomStudentTooltip, executePaymentFlow } from './studentUtils';

export const StudentResults = () => {
  const [perf, setPerf] = useState(null);
  const [profile, setProfile] = useState(null);
  const [examTypes, setExamTypes] = useState([]);
  const [selectedExamType, setSelectedExamType] = useState('Semester Examination');

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const etRes = await apiClient.get('/academics/exam-types');
        if (etRes.data && etRes.data.length > 0) {
          const types = etRes.data.map(et => et.name || et.Name || (typeof et === 'string' ? et : ''));
          setExamTypes(types);
          if (types.includes('Semester Examination')) {
            setSelectedExamType('Semester Examination');
          } else {
            setSelectedExamType(types[0]);
          }
        } else {
          setExamTypes(['Semester Examination', 'Final Examination', 'Quarterly Examination', 'Unit Examination']);
        }
      } catch (err) {
        console.error("Error loading exam types, falling back to defaults", err);
        setExamTypes(['Semester Examination', 'Final Examination', 'Quarterly Examination', 'Unit Examination']);
      }

      try {
        const profRes = await apiClient.get('/academics/student/profile');
        setProfile(profRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await apiClient.get('/exams/student/performance', {
          params: { examType: selectedExamType }
        });
        setPerf(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    if (selectedExamType) {
      fetchPerformance();
    }
  }, [selectedExamType]);

  const [printingReport, setPrintingReport] = useState(false);

  const handlePrint = async () => {
    setPrintingReport(true);
    try {
      const studentRecordId = profile?.id || profile?.Id || profile?.StudentId || 'current';
      const printed = await printRenderedDocument('ReportCard', studentRecordId, '', { examType: selectedExamType });
      if (!printed) {
        window.print();
      }
    } catch (err) {
      console.warn('Print template error, falling back to page print:', err);
      window.print();
    } finally {
      setPrintingReport(false);
    }
  };

  const examDropdown = (
    <div className="relative flex items-center w-full sm:w-auto">
      <BookOpen className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
      <select
        value={selectedExamType}
        onChange={(e) => setSelectedExamType(e.target.value)}
        className="pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:border-slate-350 focus:border-slate-400 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all cursor-pointer appearance-none w-full sm:min-w-[200px]"
      >
        {examTypes.map((et, i) => (
          <option key={i} value={et}>
            {et}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );

  if (perf && perf.areMarksPublished === false) {
    return (
      <div>
        {/* Mobile View Header */}
        <div className="sm:hidden no-print">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" />
          <div className="flex flex-col gap-2.5 mb-5 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
            {examDropdown}
          </div>
        </div>
        {/* Desktop View Header */}
        <div className="hidden sm:block no-print">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" actions={
            <div className="flex items-center gap-3">
              {examDropdown}
            </div>
          } />
        </div>

        <div className="card text-center py-20 max-w-md mx-auto mt-12 border border-slate-100 bg-white shadow-lg rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-100">🔒</div>
          <h3 className="font-display font-bold text-lg text-primary mb-2">Report Cards Not Released</h3>
          <p className="text-gray-500 text-sm leading-relaxed mb-6 font-light">
            {perf.message || "Your semester report cards and final grades have not been officially published by the school administration yet."}
          </p>
          <div className="inline-block px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            Status: Awaiting Admin Release
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print">
        {/* Mobile View Header */}
        <div className="sm:hidden">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" />
          <div className="flex flex-col gap-2.5 mb-5 bg-white p-3 rounded-xl border border-slate-100 shadow-xs">
            {examDropdown}
            <button 
              onClick={handlePrint} 
              disabled={printingReport}
              className="btn-primary text-xs flex items-center justify-center gap-1.5 py-2.5 select-none active:scale-95 transition-all w-full"
            >
              <Printer className="w-4.5 h-4.5" /> {printingReport ? 'Generating Marksheet...' : 'Download PDF Report Card'}
            </button>
          </div>
        </div>
        {/* Desktop View Header */}
        <div className="hidden sm:block">
          <Topbar title="Academic Performance" subtitle="Academic Records › Final Results" actions={
            <div className="flex items-center gap-3">
              {examDropdown}
              <button 
                onClick={handlePrint} 
                disabled={printingReport}
                className="btn-primary text-xs flex items-center gap-1.5 select-none active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4" /> {printingReport ? 'Generating Marksheet...' : 'Download PDF Report Card'}
              </button>
            </div>
          } />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body, html {
            background-color: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sidebar, .no-print, .no-print * {
            display: none !important;
          }
          .main-content {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: auto !important;
          }
          .printable-report-card {
            border: 1px solid #cbd5e1 !important;
            border-radius: 12px !important;
            padding: 24px !important;
            box-shadow: none !important;
            width: 100% !important;
            margin: 0 !important;
            position: relative !important;
          }
        }
      `}} />

      <div className="grid grid-cols-3 gap-4 mb-6 no-print">
        {[
          { l: 'Semester GPA', v: perf?.semesterGpa || '3.85', c: 'text-primary' },
          { l: 'Cumulative GPA', v: perf?.cumulativeGpa || '3.72', c: 'text-blue-600' },
          { l: 'Class Rank', v: perf?.classRank || '5th / 40', c: 'text-green-600' },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.l}</div>
            <div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="card printable-report-card">
        <div className="hidden print:block border-b-2 border-primary pb-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="font-display font-extrabold text-2xl text-primary tracking-tight">{profile?.schoolName || 'GREENWOOD ACADEMY'}</h1>
              <p className="text-xs text-gray-500 font-medium">
                {profile?.schoolAddress}{profile?.schoolCity ? `, ${profile.schoolCity}` : ''} | {profile?.schoolWebsite || 'https://greenwood.edu'}
              </p>
            </div>
            <div className="text-right">
              <h2 className="font-display font-bold text-lg text-primary">{selectedExamType.toUpperCase()}</h2>
              <p className="text-xs font-semibold text-gray-400">Academic Year: {profile?.academicYear || '2023-24'}</p>
            </div>
          </div>
        </div>


        <div className="hidden print:block mb-6 pb-6 border-b border-gray-100 text-sm space-y-2">
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Student Name:</span>
              <span className="font-bold text-primary">{profile?.firstName} {profile?.lastName}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Student ID:</span>
              <span className="font-mono text-gray-700 font-semibold">{profile?.studentId}</span>
            </div>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Class:</span>
              <span className="font-semibold text-primary">{profile?.class} - {profile?.section}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Enrollment Date:</span>
              <span className="font-medium text-gray-700">{profile?.enrollDate}</span>
            </div>
          </div>
          <div className="flex justify-between items-center w-full">
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Father Name:</span>
              <span className="font-semibold text-primary">{profile?.guardianName || 'N/A'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-400 font-semibold uppercase text-xs">Contact Number:</span>
              <span className="font-medium text-gray-700">{profile?.guardianPhone || 'N/A'}</span>
            </div>
          </div>
        </div>

        <h3 className="font-display font-semibold text-primary mb-4 print:text-base">Detailed Subject Breakdown</h3>

        <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-150">
                <th className="table-th text-left print:text-xs print:py-2">Subject</th>
                <th className="table-th text-center print:text-xs print:py-2">Internal (30)</th>
                <th className="table-th text-center print:text-xs print:py-2">Exam (70)</th>
                <th className="table-th text-center print:text-xs print:py-2">Total (100)</th>
                <th className="table-th text-center print:text-xs print:py-2">Grade</th>
                <th className="table-th text-center print:text-xs print:py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {perf?.subjectsBreakdown?.map((s, i) => {
                const isPass = s.status === 'Pass' || s.status?.toLowerCase() === 'pass';
                const gradeUpper = s.grade?.toUpperCase() || '';
                const isGoodGrade = gradeUpper.startsWith('A') || gradeUpper.startsWith('B') || gradeUpper === 'O';
                const isPoorGrade = gradeUpper.startsWith('C') || gradeUpper.startsWith('D') || gradeUpper === 'E';
                const gradeColor = isGoodGrade ? 'text-emerald-600' : isPoorGrade ? 'text-amber-500' : 'text-rose-600';

                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50 print:border-gray-100 transition-colors">
                    <td className="table-td font-semibold text-sm text-primary print:py-2.5 print:text-xs">{s.subject}</td>
                    <td className="table-td text-sm text-center print:py-2.5 print:text-xs">{s.internal}</td>
                    <td className="table-td text-sm text-center print:py-2.5 print:text-xs">{s.exam}</td>
                    <td className="table-td text-sm font-bold text-center print:py-2.5 print:text-xs">{s.total}</td>
                    <td className="table-td print:py-2.5 text-center"><span className={`font-bold text-sm print:text-xs ${gradeColor}`}>{s.grade}</span></td>
                    <td className="table-td print:py-2.5 text-center">
                      <span className={`${isPass
                        ? 'badge-success print:bg-green-50 print:text-green-800 print:border print:border-green-200'
                        : 'badge-danger print:bg-red-50 print:text-red-800 print:border print:border-red-200'
                        } print:text-[10px]`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!perf?.subjectsBreakdown || perf.subjectsBreakdown.length === 0) && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No exam records graded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="hidden print:flex print:flex-row print:justify-between border border-gray-250 rounded-xl p-4 mt-8 bg-gray-50/50 gap-4">
          <div className="flex-1">
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Semester GPA</div>
            <div className="font-display text-lg font-black text-primary">{perf?.semesterGpa}</div>
          </div>
          <div className="flex-1 border-l border-gray-200 pl-4">
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Cumulative GPA</div>
            <div className="font-display text-lg font-black text-blue-600">{perf?.cumulativeGpa}</div>
          </div>
          <div className="flex-1 border-l border-gray-200 pl-4">
            <div className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Class Rank</div>
            <div className="font-display text-lg font-black text-green-600">{perf?.classRank}</div>
          </div>
        </div>

        <div className="hidden print:flex justify-between items-center mt-16 pt-8 border-t border-gray-100 text-center">
          <div className="w-48">
            <div className="h-10"></div>
            <div className="border-t border-gray-400 text-xs font-semibold text-gray-500 pt-1.5">Class Teacher Signature</div>
          </div>
          <div className="w-48">
            <div className="h-10"></div>
            <div className="border-t border-gray-400 text-xs font-semibold text-gray-500 pt-1.5">Principal Signature</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Student Fees ---
const generateMockPaymentId = () => {
  return `pay_mock_${Math.random().toString(36).substring(7)}`;
};



export default StudentResults;
