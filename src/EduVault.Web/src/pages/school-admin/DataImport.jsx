import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  Receipt,
  Building,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  History,
  Check,
  X,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileText,
  Copy,
  Info
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const CSV_SCHEMAS = {
  students: {
    id: 'students',
    title: 'Students Admission & Demographics',
    icon: GraduationCap,
    color: 'blue',
    description: 'Student profile, class enrollment, parents contact, and admission register.',
    demoFile: '/demo-templates/02_students_demo_25.csv',
    sampleHeader: 'admission_no,first_name,last_name,gender,dob,grade,section,parent_name,parent_phone,parent_email,blood_group,address',
    sampleRow: 'STU-2026-001,Aarav,Sharma,Male,2015-05-14,5,A,Rajesh Sharma,9876543210,rajesh@example.com,O+,B-12 Civil Lines Jaipur',
    fields: [
      { name: 'admission_no', required: true, type: 'String / Code', example: 'STU-2026-001', note: 'Unique student ID or roll number' },
      { name: 'first_name', required: true, type: 'String', example: 'Aarav', note: 'Student first name' },
      { name: 'last_name', required: true, type: 'String', example: 'Sharma', note: 'Family name / surname' },
      { name: 'gender', required: true, type: 'Male / Female / Other', example: 'Male', note: 'Gender category' },
      { name: 'dob', required: true, type: 'YYYY-MM-DD', example: '2015-05-14', note: 'Date of birth' },
      { name: 'grade', required: true, type: 'String / Number', example: '5', note: 'Play Group, Nursery, LKG, UKG, 1-12' },
      { name: 'section', required: true, type: 'String', example: 'A', note: 'Section letter (A, B, C, etc.)' },
      { name: 'parent_name', required: true, type: 'String', example: 'Rajesh Sharma', note: 'Father / Mother / Guardian' },
      { name: 'parent_phone', required: true, type: '10-digit Phone', example: '9876543210', note: 'Primary WhatsApp & SMS alert contact' },
      { name: 'parent_email', required: false, type: 'Email', example: 'rajesh@example.com', note: 'Report card & invoice recipient' },
      { name: 'blood_group', required: false, type: 'A+, B+, O+, AB+, etc.', example: 'O+', note: 'Medical emergency records' },
      { name: 'address', required: false, type: 'String', example: 'B-12 Civil Lines, Jaipur', note: 'Residential address' }
    ]
  },
  teachers: {
    id: 'teachers',
    title: 'Staff & Faculty Directory',
    icon: Users,
    color: 'emerald',
    description: 'Teacher profiles, designations, department tags, qualifications, and payroll details.',
    demoFile: '/demo-templates/03_teachers_demo_20.csv',
    sampleHeader: 'employee_id,first_name,last_name,email,phone,designation,department,specialization,joining_date,salary',
    sampleRow: 'EMP-101,Vikram,Malhotra,vikram.m@school.edu,9811223344,Senior PGT,Science,Mathematics,2021-04-01,48000',
    fields: [
      { name: 'employee_id', required: true, type: 'String', example: 'EMP-101', note: 'Unique staff code' },
      { name: 'first_name', required: true, type: 'String', example: 'Vikram', note: 'Staff first name' },
      { name: 'last_name', required: true, type: 'String', example: 'Malhotra', note: 'Staff surname' },
      { name: 'email', required: true, type: 'Email', example: 'vikram.m@school.edu', note: 'Official school login email' },
      { name: 'phone', required: true, type: '10-digit Phone', example: '9811223344', note: 'WhatsApp substitution & duty alert contact' },
      { name: 'designation', required: true, type: 'String', example: 'Senior PGT', note: 'PRT, TGT, PGT, HOD, Coordinator' },
      { name: 'department', required: true, type: 'String', example: 'Science', note: 'Science, Mathematics, Languages, Arts, Commerce' },
      { name: 'specialization', required: true, type: 'String', example: 'Mathematics', note: 'Primary subject taught' },
      { name: 'joining_date', required: false, type: 'YYYY-MM-DD', example: '2021-04-01', note: 'Service date' },
      { name: 'salary', required: false, type: 'Number (INR)', example: '48000', note: 'Monthly gross salary' }
    ]
  },
  fees: {
    id: 'fees',
    title: 'Fee Invoices & Billing Ledger',
    icon: Receipt,
    color: 'amber',
    description: 'Student invoices, fee categories, due amounts, and collection statuses.',
    demoFile: '/demo-templates/04_fee_bills_demo_20.csv',
    sampleHeader: 'invoice_no,admission_no,student_name,grade,section,fee_type,amount,due_date,status,payment_mode,receipt_no',
    sampleRow: 'INV-2026-001,STU-2026-001,Aarav Sharma,5,A,Tuition Fee - Q1,4500,2026-04-15,PAID,Cash,REC-8891',
    fields: [
      { name: 'invoice_no', required: true, type: 'String', example: 'INV-2026-001', note: 'Unique invoice voucher number' },
      { name: 'admission_no', required: true, type: 'String', example: 'STU-2026-001', note: 'Links to registered student' },
      { name: 'student_name', required: true, type: 'String', example: 'Aarav Sharma', note: 'Student display name' },
      { name: 'grade', required: true, type: 'String / Number', example: '5', note: 'Class grade' },
      { name: 'section', required: true, type: 'String', example: 'A', note: 'Class section' },
      { name: 'fee_type', required: true, type: 'String', example: 'Tuition Fee - Q1', note: 'Tuition, Lab, Transport, Exam, Annual' },
      { name: 'amount', required: true, type: 'Number', example: '4500', note: 'Total payable amount in INR' },
      { name: 'due_date', required: true, type: 'YYYY-MM-DD', example: '2026-04-15', note: 'Payment due deadline' },
      { name: 'status', required: true, type: 'PAID / UNPAID / PARTIAL', example: 'PAID', note: 'Settlement state' },
      { name: 'payment_mode', required: false, type: 'Cash / UPI / NetBanking / Cheque', example: 'Cash', note: 'Mode of collection' },
      { name: 'receipt_no', required: false, type: 'String', example: 'REC-8891', note: 'Printed receipt reference' }
    ]
  },
  classes: {
    id: 'classes',
    title: 'Classes, Sections & Rooms',
    icon: Building,
    color: 'purple',
    description: 'Classrooms, seating capacities, sections, academic streams, and assigned class mentors.',
    demoFile: '/demo-templates/05_classes_sections_demo_20.csv',
    sampleHeader: 'grade,section,room_number,capacity,stream,class_teacher',
    sampleRow: '5,A,105,40,General,Vikram Malhotra',
    fields: [
      { name: 'grade', required: true, type: 'String / Number', example: '5', note: 'Play Group, Nursery, LKG, UKG, 1-12' },
      { name: 'section', required: true, type: 'String', example: 'A', note: 'A, B, C, D, E, F' },
      { name: 'room_number', required: true, type: 'String / Number', example: '105', note: 'Physical room or lab number' },
      { name: 'capacity', required: true, type: 'Integer', example: '40', note: 'Max student capacity (e.g. 30, 40, 50)' },
      { name: 'stream', required: false, type: 'String', example: 'General', note: 'General, Science, Commerce, Humanities' },
      { name: 'class_teacher', required: false, type: 'String', example: 'Vikram Malhotra', note: 'Assigned faculty in-charge' }
    ]
  },
  master: {
    id: 'master',
    title: 'Master Setup Configuration',
    icon: Sparkles,
    color: 'rose',
    description: 'Global school settings: grades, sections, rooms, capacities, departments, subjects, and exams.',
    demoFile: '/demo-templates/01_master_setup.csv',
    sampleHeader: 'sections,rooms,grades,capacities,academic_departments,school_subjects,examination_setup',
    sampleRow: 'A;B;C;D;E;F,1;2;3;4;5;6;7;8;9;10,Play Group;Nursery;LKG;UKG;1;2;3;4;5;6;7;8;9;10;11;12,10;20;30;40;50;60;70;80,Science;Mathematics;Languages;Arts;Commerce,Hindi;English;Mathematics;Science;Social Studies;Physics;Chemistry,Mid Term 1;Mid Term 2;Half Yearly;Final Examination',
    fields: [
      { name: 'sections', required: true, type: 'Semicolon/Comma List (A-F)', example: 'A;B;C;D;E;F', note: 'All available section designations' },
      { name: 'rooms', required: true, type: 'Semicolon/Comma List (1-20)', example: '1;2;3;4;5;6;7;8;9;10', note: 'Room numbers on campus' },
      { name: 'grades', required: true, type: 'Semicolon/Comma List', example: 'Play Group;Nursery;LKG;UKG;1;2;3;4;5;6;7;8;9;10;11;12', note: 'Standard educational tiers' },
      { name: 'capacities', required: true, type: 'Semicolon/Comma Numbers', example: '10;20;30;40;50;60;70;80', note: 'Available desk capacities' },
      { name: 'academic_departments', required: true, type: 'Semicolon/Comma List', example: 'Science;Mathematics;Languages;Arts;Commerce', note: 'School departments' },
      { name: 'school_subjects', required: true, type: 'Semicolon/Comma List', example: 'Hindi;English;Mathematics;Science;Social Studies', note: 'All curriculum subjects' },
      { name: 'examination_setup', required: true, type: 'Semicolon/Comma List', example: 'Mid Term 1;Mid Term 2;Half Yearly;Final Examination', note: 'Official assessment cycles' }
    ]
  },
  timetable: {
    id: 'timetable',
    title: 'Master Timetable Schedule',
    icon: Clock,
    color: 'cyan',
    description: 'Weekly schedule of periods, days, subject lectures, and assigned room/teacher allocations.',
    demoFile: '/demo-templates/06_timetable_schedule_demo.csv',
    sampleHeader: 'class_name,section,day_of_week,period_number,time_slot,subject_name,teacher_name,room_no',
    sampleRow: 'Grade 5,A,Monday,1,08:30 AM - 09:15 AM,Mathematics,Vikram Malhotra,Room 105',
    fields: [
      { name: 'class_name', required: true, type: 'String', example: 'Grade 5', note: 'Class name' },
      { name: 'section', required: true, type: 'String', example: 'A', note: 'Section' },
      { name: 'day_of_week', required: true, type: 'Monday-Friday', example: 'Monday', note: 'Day of period' },
      { name: 'period_number', required: true, type: 'Integer (1-8)', example: '1', note: 'Period sequence slot' },
      { name: 'time_slot', required: false, type: 'HH:MM - HH:MM', example: '08:30 AM - 09:15 AM', note: 'Timing of period' },
      { name: 'subject_name', required: true, type: 'String', example: 'Mathematics', note: 'Subject taught' },
      { name: 'teacher_name', required: true, type: 'String', example: 'Vikram Malhotra', note: 'Lecturer assigned' },
      { name: 'room_no', required: false, type: 'String', example: 'Room 105', note: 'Classroom or laboratory' }
    ]
  }
};

export default function DataImport() {
  const [selectedType, setSelectedType] = useState('students');
  const [sourceName, setSourceName] = useState('Government UDISE+');
  const [file, setFile] = useState(null);

  // Workflow steps: 1 = Upload, 2 = Mapping & Preview, 3 = Completed
  const [step, setStep] = useState(1);

  // Preview & Processing state
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [columnMappings, setColumnMappings] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Schema Guide Modal State
  const [showSchemaGuideModal, setShowSchemaGuideModal] = useState(false);
  const [activeSchemaTab, setActiveSchemaTab] = useState('students');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // History
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Toast
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  const importTypes = [
    {
      id: 'students',
      label: 'Students',
      desc: 'Admission records, parents & demographics',
      icon: GraduationCap,
      color: 'blue'
    },
    {
      id: 'teachers',
      label: 'Teachers',
      desc: 'Staff directory, qualifications & salary',
      icon: Users,
      color: 'emerald'
    },
    {
      id: 'fees',
      label: 'Fee Invoices',
      desc: 'Billing ledger & payment receipts',
      icon: Receipt,
      color: 'amber'
    },
    {
      id: 'classes',
      label: 'Classes & Sections',
      desc: 'Grades, capacities & subject tracks',
      icon: Building,
      color: 'purple'
    }
  ];

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await apiClient.get('/school-admin/import/history');
      setHistory(res.data || []);
    } catch (err) {
      console.warn('Could not load import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDownloadDemoCsv = (typeId) => {
    const fileMap = {
      students: '/demo-templates/02_students_demo_25.csv',
      teachers: '/demo-templates/03_teachers_demo_20.csv',
      fees: '/demo-templates/04_fee_bills_demo_20.csv',
      classes: '/demo-templates/05_classes_sections_demo_20.csv',
      master: '/demo-templates/01_master_setup.csv',
      timetable: '/demo-templates/06_timetable_schedule_demo.csv'
    };
    const targetUrl = fileMap[typeId] || fileMap[selectedType] || fileMap.students;
    const link = document.createElement('a');
    link.href = targetUrl;
    link.setAttribute('download', targetUrl.split('/').pop());
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Downloaded sample demo CSV: ${targetUrl.split('/').pop()}`);
  };

  const handleDownloadTemplate = async (typeId) => {
    const t = typeId || selectedType || 'students';
    // Link directly to pre-generated rich demo dataset
    handleDownloadDemoCsv(t);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!file) {
      showToast('Please select a CSV file to upload.', 'error');
      return;
    }

    setLoadingPreview(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post(`/school-admin/import/preview/${selectedType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreviewData(res.data);
      setColumnMappings(res.data.columnMappings || {});
      setStep(2);
      showToast('CSV parsed successfully with AI smart column mapping.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to parse CSV. Please ensure standard comma separation.', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData || !previewData.previewRows) return;

    setImporting(true);
    try {
      const payload = {
        sourceName,
        columnMappings,
        rows: previewData.previewRows
      };

      const res = await apiClient.post(`/school-admin/import/execute/${selectedType}`, payload);
      setImportResult(res.data);
      setStep(3);
      showToast(
        `Successfully imported ${res.data.successCount} of ${res.data.totalProcessed} records into the school database!`
      );
      fetchHistory();
    } catch (err) {
      showToast(err.response?.data?.error || 'Import failed. Please check field mappings.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const resetWorkflow = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setStep(1);
  };

  return (
    <div>
      <Topbar
        title="Data Import Hub"
        subtitle="Intelligent Multi-Entity Data Onboarding, UDISE+ / Fedena Migration & Automated CSV Ingestion"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveSchemaTab(selectedType || 'students');
                setShowSchemaGuideModal(true);
              }}
              className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              📋 View CSV Format Guide
            </button>
            <button
              onClick={() => handleDownloadTemplate(selectedType)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Download {importTypes.find(t => t.id === selectedType)?.label} Template
            </button>
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

      {/* ── STEP 1: ENTITY SELECTION & FILE UPLOAD ── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Entity Type Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {importTypes.map(t => {
              const Icon = t.icon;
              const isSelected = selectedType === t.id;
              return (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="font-bold text-slate-900 text-sm">{t.label}</div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">{t.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Source & File Upload Panel */}
          <div className="card">
            {/* Quick Demo CSV Downloads Banner */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-white/10">
                <div>
                  <h4 className="font-bold text-sm text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" /> Ready-to-Use 20-25 Data Demo CSV Files (Instant Download)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Pre-filled CSV templates with 20-25 records are ready for testing and demo purposes. View the format guide or download below:
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSchemaTab(selectedType || 'students');
                      setShowSchemaGuideModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5 text-amber-300" />
                    CSV Format Specification
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadDemoCsv(selectedType)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Current ({selectedType.toUpperCase()})
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => handleDownloadDemoCsv('students')}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition flex flex-col justify-between"
                >
                  <span className="text-xxs font-bold text-blue-300">🎓 Students (25)</span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                    <Download className="w-3 h-3" /> Get CSV
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDemoCsv('teachers')}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition flex flex-col justify-between"
                >
                  <span className="text-xxs font-bold text-emerald-300">👨‍🏫 Teachers (20)</span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                    <Download className="w-3 h-3" /> Get CSV
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDemoCsv('fees')}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition flex flex-col justify-between"
                >
                  <span className="text-xxs font-bold text-amber-300">🧾 Fee Bills (20)</span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                    <Download className="w-3 h-3" /> Get CSV
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDemoCsv('classes')}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition flex flex-col justify-between"
                >
                  <span className="text-xxs font-bold text-purple-300">🏫 Classes (20)</span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                    <Download className="w-3 h-3" /> Get CSV
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDemoCsv('master')}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition flex flex-col justify-between"
                >
                  <span className="text-xxs font-bold text-rose-300">⚡ Master Setup</span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                    <Download className="w-3 h-3" /> Get CSV
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadDemoCsv('timetable')}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-left transition flex flex-col justify-between"
                >
                  <span className="text-xxs font-bold text-cyan-300">📅 Timetable</span>
                  <span className="text-[10px] text-slate-300 flex items-center gap-1 mt-1">
                    <Download className="w-3 h-3" /> Get CSV
                  </span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Import Source & File Selection
                </h3>
                <p className="text-xs text-slate-500">
                  Select where your data is originating from so column mapping can apply contextual heuristics.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Source ERP:</span>
                <select
                  value={sourceName}
                  onChange={e => setSourceName(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                >
                  <option value="Government UDISE+">🏛️ Government UDISE+</option>
                  <option value="Fedena">🎓 Fedena ERP</option>
                  <option value="Custom CSV File">📁 Custom CSV / Excel Export</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop Upload Container */}
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-center transition bg-slate-50/50">
              <UploadCloud className="w-12 h-12 text-blue-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">
                {file ? file.name : 'Choose a CSV file or drag & drop here'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Supported format: UTF-8 encoded .csv (Max 15MB)
              </p>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow-sm transition">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Browse Local CSV</span>
                <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
              </label>

              {file && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                  <Check className="w-3.5 h-3.5" /> File Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDownloadTemplate(selectedType)}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Need the standard format? Download sample CSV template
              </button>

              <button
                type="button"
                onClick={handleUploadAndPreview}
                disabled={!file || loadingPreview}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/20 transition"
              >
                {loadingPreview ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Analyzing Columns...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" /> Analyze & Preview Mapping{' '}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: SMART AI COLUMN MAPPING & DATA PREVIEW ── */}
      {step === 2 && previewData && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top Diagnostics Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="text-xs text-slate-400">Total Rows Detected</div>
              <div className="font-display text-2xl font-bold text-slate-800">{previewData.totalRows}</div>
              <div className="text-[11px] text-slate-400">From {previewData.fileName}</div>
            </div>

            <div className="stat-card">
              <div className="text-xs text-slate-400">Valid Rows</div>
              <div className="font-display text-2xl font-bold text-emerald-600">{previewData.validRows}</div>
              <div className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3 h-3" /> Ready for import
              </div>
            </div>

            <div className="stat-card">
              <div className="text-xs text-slate-400">Errors / Flagged</div>
              <div className="font-display text-2xl font-bold text-red-500">{previewData.invalidRows}</div>
              <div className="text-[11px] text-slate-400">Missing required fields</div>
            </div>

            <div className="stat-card">
              <div className="text-xs text-slate-400">Columns Mapped</div>
              <div className="font-display text-2xl font-bold text-purple-600">
                {Object.keys(columnMappings).length} / {previewData.originalHeaders?.length}
              </div>
              <div className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> AI Matched
              </div>
            </div>
          </div>

          {/* Validation Warnings Alert */}
          {previewData.errors && previewData.errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                <AlertCircle className="w-4 h-4" /> Some rows have validation notices:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                {previewData.errors.map((e, idx) => (
                  <li key={idx}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Smart Column Mappings Box */}
          <div className="card">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Smart Heuristic Column Matching</h4>
              </div>
              <span className="text-xs text-slate-400">Verify or adjust mappings before ingesting data</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {previewData.originalHeaders?.map(header => (
                <div key={header} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold truncate mb-1">
                    CSV Header: <strong className="text-slate-800">"{header}"</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-purple-600 font-bold">→ Mapped to:</span>
                    <input
                      type="text"
                      value={columnMappings[header] || ''}
                      onChange={e => setColumnMappings({ ...columnMappings, [header]: e.target.value })}
                      placeholder="Target field"
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Table Preview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-900 text-sm">
                Data Preview (First {previewData.previewRows?.length} Rows)
              </h4>
              <span className="text-xs text-slate-400">
                Data will be written directly to {selectedType} database table
              </span>
            </div>

            <div className="overflow-x-auto max-h-80 border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 font-bold text-slate-500">#</th>
                    {previewData.originalHeaders?.map(h => (
                      <th key={h} className="p-2.5 font-bold text-slate-700 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.previewRows?.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                      {previewData.originalHeaders?.map(h => (
                        <td key={h} className="p-2.5 whitespace-nowrap text-slate-700">
                          {row[h] || <span className="text-slate-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Upload
              </button>

              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={importing}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Ingesting Records...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Start Import Now ({previewData.previewRows?.length} Records)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: IMPORT SUCCESS & SUMMARY ── */}
      {step === 3 && importResult && (
        <div className="max-w-xl mx-auto card text-center p-8 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Import Completed
          </span>

          <h3 className="text-2xl font-black text-slate-900 mt-3">Batch Import Executed!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Records have been validated and inserted into the active school system with multi-tenant isolation.
          </p>

          <div className="grid grid-cols-3 gap-3 my-6 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs text-slate-400">Total Processed</div>
              <div className="text-xl font-bold text-slate-800">{importResult.totalProcessed}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Success Count</div>
              <div className="text-xl font-bold text-emerald-600">{importResult.successCount}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Errors / Skipped</div>
              <div className="text-xl font-bold text-red-500">{importResult.errorCount}</div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetWorkflow}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-md shadow-blue-600/20"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Start Another Import
            </button>
          </div>
        </div>
      )}

      {/* ── RECENT IMPORT AUDIT HISTORY ── */}
      <div className="card mt-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <h4 className="font-bold text-slate-900 text-sm">Recent Import Audit History</h4>
          </div>
          <button
            onClick={fetchHistory}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {loadingHistory ? (
          <div className="py-8 flex justify-center">
            <Loader />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No previous data imports recorded for this school.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold text-[11px]">
                  <th className="table-th">Import Type</th>
                  <th className="table-th">Source</th>
                  <th className="table-th">Records</th>
                  <th className="table-th">Success / Errors</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/60">
                    <td className="table-td font-bold text-slate-800 capitalize">{h.importType}</td>
                    <td className="table-td text-slate-600">{h.sourceName}</td>
                    <td className="table-td font-mono font-semibold text-slate-700">{h.totalRecords}</td>
                    <td className="table-td">
                      <span className="text-emerald-600 font-bold">{h.successCount} ok</span>
                      {h.errorCount > 0 && <span className="text-red-500 font-bold ml-1.5">• {h.errorCount} errors</span>}
                    </td>
                    <td className="table-td">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : h.status === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="table-td text-slate-400 text-[11px]">
                      {new Date(h.importedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CSV FORMAT & SCHEMA SPECIFICATION MODAL ── */}
      {showSchemaGuideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div>
                <h3 className="font-bold text-base text-amber-300 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  CSV Format & Field Specification Guide
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  School ERP me data import ke liye required column headers, accepted data formats aur rules.
                </p>
              </div>
              <button
                onClick={() => setShowSchemaGuideModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Entity Tabs */}
            <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
              {Object.keys(CSV_SCHEMAS).map(key => {
                const schema = CSV_SCHEMAS[key];
                const Icon = schema.icon;
                const isActive = activeSchemaTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveSchemaTab(key);
                      setCopiedSnippet(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{schema.title.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            {/* Body */}
            {CSV_SCHEMAS[activeSchemaTab] && (
              <div className="p-6 overflow-y-auto space-y-5">
                {/* Schema Header Summary */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-50/70 border border-blue-100">
                  <div>
                    <h4 className="font-bold text-sm text-blue-900 flex items-center gap-2">
                      <span>{CSV_SCHEMAS[activeSchemaTab].title}</span>
                      <span className="px-2 py-0.5 rounded-full text-xxs font-bold bg-blue-200 text-blue-800">
                        {CSV_SCHEMAS[activeSchemaTab].fields.filter(f => f.required).length} Required Fields
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xxs font-bold bg-slate-200 text-slate-700">
                        {CSV_SCHEMAS[activeSchemaTab].fields.length} Total Columns
                      </span>
                    </h4>
                    <p className="text-xs text-blue-700/90 mt-1">
                      {CSV_SCHEMAS[activeSchemaTab].description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadDemoCsv(activeSchemaTab)}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Demo CSV
                  </button>
                </div>

                {/* Sample Row Copy Box */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-bold flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5" /> CSV Sample Headers & Example Row
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const snippet = `${CSV_SCHEMAS[activeSchemaTab].sampleHeader}\n${CSV_SCHEMAS[activeSchemaTab].sampleRow}`;
                        navigator.clipboard.writeText(snippet);
                        setCopiedSnippet(true);
                        showToast('Sample CSV header & row copied to clipboard!');
                        setTimeout(() => setCopiedSnippet(false), 2500);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xxs font-bold flex items-center gap-1 transition"
                    >
                      {copiedSnippet ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-300">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-300" />
                          <span>Copy Sample Row</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-[11px] bg-black/40 p-2 rounded-lg overflow-x-auto text-slate-300 whitespace-pre">
                    <span className="text-blue-300 font-semibold">{CSV_SCHEMAS[activeSchemaTab].sampleHeader}</span>
                    {'\n'}
                    <span className="text-emerald-300">{CSV_SCHEMAS[activeSchemaTab].sampleRow}</span>
                  </div>
                </div>

                {/* Column Specification Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                        <th className="p-2.5 pl-3">Header Name</th>
                        <th className="p-2.5">Requirement</th>
                        <th className="p-2.5">Expected Type / Format</th>
                        <th className="p-2.5">Sample Value</th>
                        <th className="p-2.5 pr-3">Notes & Rules</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {CSV_SCHEMAS[activeSchemaTab].fields.map(field => (
                        <tr key={field.name} className="hover:bg-slate-50/70">
                          <td className="p-2.5 pl-3 font-mono font-bold text-blue-700">{field.name}</td>
                          <td className="p-2.5">
                            {field.required ? (
                              <span className="px-2 py-0.5 rounded-full text-xxs font-bold bg-rose-100 text-rose-700">
                                Required
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xxs font-bold bg-slate-100 text-slate-600">
                                Optional
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-medium text-slate-700">{field.type}</td>
                          <td className="p-2.5 font-mono text-[11px] text-slate-800 bg-slate-50/50 rounded">
                            {field.example}
                          </td>
                          <td className="p-2.5 pr-3 text-slate-500 text-[11px] leading-tight">{field.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Important Formatting Tips */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-[11px] leading-relaxed">
                    <div className="font-bold text-amber-950">Important CSV Tips:</div>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                      <li>Save the file in UTF-8 encoded .csv format to preserve all characters properly.</li>
                      <li>Date of Birth and Due Dates should always be in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">YYYY-MM-DD</code> format (e.g. 2015-05-14).</li>
                      <li>Phone numbers should be in standard 10-digit mobile number format (e.g. 9876543210).</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Need more help? Our smart AI column mapper can auto-detect fuzzy column names like "First Name" or "F_NAME".
              </span>
              <button
                type="button"
                onClick={() => setShowSchemaGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
