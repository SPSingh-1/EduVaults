import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import PrintIframe, { printDirectHtml } from '../../components/print/PrintIframe';
import {
  Printer, Sparkles, Send, Eye, Trash2, Plus, CheckCircle2,
  AlertCircle, Search, Filter, Layers, Globe, Building, Check,
  ChevronRight, RefreshCw, FileText, X, Code, Sliders, ArrowUp,
  ArrowDown, Play, Copy, Star, ShieldCheck, HelpCircle, Edit3,
  UploadCloud, Image as ImageIcon, FileUp, Database, Save
} from 'lucide-react';

const DOC_TYPES = [
  { value: 'All', label: 'All Document Types', icon: '🗂️' },
  { value: 'FeeReceipt', label: 'Fee Receipts', icon: '💰' },
  { value: 'ReportCard', label: 'Report Cards / Marksheets', icon: '📊' },
  { value: 'SalarySlip', label: 'Salary Slips', icon: '💵' },
  { value: 'AdmitCard', label: 'Exam Admit Cards / Hall Tickets', icon: '🎫' },
  { value: 'TransferCertificate', label: 'Transfer Certificates (TC)', icon: '📜' },
  { value: 'GatePass', label: 'Gate Passes / Visitor Slips', icon: '🚪' }
];

const PAPER_SIZES = [
  { value: 'A4Single', label: 'A4 Single Sheet (Letterhead standard)' },
  { value: 'A4TwinCopy', label: 'A4 Twin-Copy (Duplicate with Scissor Cut)' },
  { value: 'A5Portrait', label: 'A5 Compact Portrait' },
  { value: 'Thermal80mm', label: '80mm POS Thermal Slip (Roll printer)' },
  { value: 'CR80ID', label: 'CR80 PVC Plastic Card' }
];

const MERGE_TAGS = [
  { tag: '{{school.name}}', desc: 'School Official Name', category: 'School' },
  { tag: '{{school.address}}', desc: 'School Full Address', category: 'School' },
  { tag: '{{school.phone}}', desc: 'School Contact Number', category: 'School' },
  { tag: '{{school.affiliationNo}}', desc: 'Board Affiliation No.', category: 'School' },
  { tag: '{{school.logoUrl}}', desc: 'School Official Logo', category: 'School' },

  { tag: '{{student.name}}', desc: 'Student Full Name', category: 'Student' },
  { tag: '{{student.rollNo}}', desc: 'Roll Number', category: 'Student' },
  { tag: '{{student.admissionNo}}', desc: 'Admission Number', category: 'Student' },
  { tag: '{{student.class}}', desc: 'Class / Grade', category: 'Student' },
  { tag: '{{student.section}}', desc: 'Section / Division', category: 'Student' },
  { tag: '{{student.fatherName}}', desc: 'Father / Guardian Name', category: 'Student' },
  { tag: '{{student.dob}}', desc: 'Date of Birth', category: 'Student' },

  { tag: '{{fee.receiptNo}}', desc: 'Fee Receipt Serial', category: 'Fee' },
  { tag: '{{fee.date}}', desc: 'Payment Date', category: 'Fee' },
  { tag: '{{fee.totalPaid}}', desc: 'Amount Paid (₹)', category: 'Fee' },
  { tag: '{{fee.amountInWords}}', desc: 'Amount in Words', category: 'Fee' },
  { tag: '{{fee.itemsTable}}', desc: 'Breakdown Items Table', category: 'Fee' },
  { tag: '{{fee.cashierName}}', desc: 'Cashier Name', category: 'Fee' },

  { tag: '{{admit.rollNo}}', desc: 'Exam Roll Number', category: 'Exam' },
  { tag: '{{admit.center}}', desc: 'Examination Center', category: 'Exam' },
  { tag: '{{admit.examName}}', desc: 'Exam Title / Session', category: 'Exam' },
  { tag: '{{admit.scheduleTable}}', desc: 'Date & Subject Schedule', category: 'Exam' },
  { tag: '{{exam.name}}', desc: 'Examination Full Name', category: 'Exam' },
  { tag: '{{exam.academicYear}}', desc: 'Academic Year / Session', category: 'Exam' },
  { tag: '{{exam.marksTable}}', desc: 'Full Marks & Grades Table', category: 'Exam' },
  { tag: '{{exam.marksRows}}', desc: 'Dynamic Marks Table Rows (tbody)', category: 'Exam' },
  { tag: '{{exam.totalCredits}}', desc: 'Total Credits Registered', category: 'Exam' },
  { tag: '{{exam.totalMarks}}', desc: 'Maximum / Total Marks or Points', category: 'Exam' },
  { tag: '{{exam.obtainedMarks}}', desc: 'Total Marks / Points Obtained', category: 'Exam' },
  { tag: '{{exam.percentage}}', desc: 'Overall Percentage (%)', category: 'Exam' },
  { tag: '{{exam.grade}}', desc: 'Overall Grade (e.g. A++, A+)', category: 'Exam' },
  { tag: '{{exam.sgpa}}', desc: 'Semester Grade Point Average (SGPA)', category: 'Exam' },
  { tag: '{{exam.cgpa}}', desc: 'Cumulative Grade Point Average (CGPA)', category: 'Exam' },
  { tag: '{{exam.resultStatus}}', desc: 'Result Status (PASS / FAIL)', category: 'Exam' },
  { tag: '{{exam.declaredDate}}', desc: 'Result Declaration Date', category: 'Exam' },

  { tag: '{{employee.name}}', desc: 'Staff Member Name', category: 'Salary' },
  { tag: '{{employee.code}}', desc: 'Employee Code', category: 'Salary' },
  { tag: '{{employee.designation}}', desc: 'Designation / Post', category: 'Salary' },
  { tag: '{{salary.month}}', desc: 'Salary Month', category: 'Salary' },
  { tag: '{{salary.netSalary}}', desc: 'Net In-Hand Salary (₹)', category: 'Salary' },
  { tag: '{{salary.earningsTable}}', desc: 'Earnings Breakdown', category: 'Salary' },
  { tag: '{{salary.deductionsTable}}', desc: 'Deductions Breakdown', category: 'Salary' },

  { tag: '{{student.motherName}}', desc: "Mother's Full Name", category: 'Student' },
  { tag: '{{student.bloodGroup}}', desc: 'Blood Group', category: 'Student' },
  { tag: '{{student.aadhaarNo}}', desc: 'Aadhaar Card Number', category: 'Student' },
  { tag: '{{student.phone}}', desc: 'Student / Parent Mobile', category: 'Student' },
  { tag: '{{student.address}}', desc: 'Residential Address', category: 'Student' },
  { tag: '{{student.category}}', desc: 'Social Category (GEN/OBC/SC/ST)', category: 'Student' },
  { tag: '{{student.gender}}', desc: 'Gender (Male/Female)', category: 'Student' },
  { tag: '{{student.admissionDate}}', desc: 'Admission Enrollment Date', category: 'Student' },
  { tag: '{{student.busRoute}}', desc: 'Transport / Bus Route No', category: 'Student' },

  { tag: '{{employee.name}}', desc: 'Staff Member Name', category: 'Salary' },
  { tag: '{{employee.code}}', desc: 'Employee Code / Staff ID', category: 'Salary' },
  { tag: '{{employee.designation}}', desc: 'Designation / Post', category: 'Salary' },
  { tag: '{{employee.department}}', desc: 'Staff Department', category: 'Salary' },
  { tag: '{{employee.bankAccount}}', desc: 'Salary Bank Account No', category: 'Salary' },
  { tag: '{{employee.panNo}}', desc: 'PAN Card Number', category: 'Salary' },
  { tag: '{{employee.pfNo}}', desc: 'PF / UAN Number', category: 'Salary' },
  { tag: '{{employee.doj}}', desc: 'Date of Joining', category: 'Salary' },
  { tag: '{{salary.month}}', desc: 'Salary Month & Year', category: 'Salary' },
  { tag: '{{salary.presentDays}}', desc: 'Total Days Worked / Present', category: 'Salary' },
  { tag: '{{salary.netSalary}}', desc: 'Net In-Hand Salary (₹)', category: 'Salary' },
  { tag: '{{salary.earningsTable}}', desc: 'Earnings Breakdown', category: 'Salary' },
  { tag: '{{salary.deductionsTable}}', desc: 'Deductions Breakdown', category: 'Salary' },

  { tag: '{{tc.certificateNo}}', desc: 'Transfer Certificate No', category: 'Certificate' },
  { tag: '{{tc.penNo}}', desc: 'Permanent Education No (PEN)', category: 'Certificate' },
  { tag: '{{tc.leavingClass}}', desc: 'Class Last Studied', category: 'Certificate' },
  { tag: '{{gatepass.tokenNo}}', desc: 'Visitor Gate Pass Token', category: 'Security' },
  { tag: '{{gatepass.visitorName}}', desc: 'Visitor Name', category: 'Security' },
  { tag: '{{custom.custom_column}}', desc: 'Custom SQL Stored Procedure Tag', category: 'Custom SQL' }
];

const PRESET_INFO_FIELDS = [
  // Student presets
  { label: "Father's Name", tag: '{{student.fatherName}}', category: 'Student' },
  { label: "Mother's Name", tag: '{{student.motherName}}', category: 'Student' },
  { label: 'Date of Birth', tag: '{{student.dob}}', category: 'Student' },
  { label: 'Aadhaar Card No', tag: '{{student.aadhaarNo}}', category: 'Student' },
  { label: 'Blood Group', tag: '{{student.bloodGroup}}', category: 'Student' },
  { label: 'Student Mobile', tag: '{{student.phone}}', category: 'Student' },
  { label: 'Address', tag: '{{student.address}}', category: 'Student' },
  { label: 'Category / Caste', tag: '{{student.category}}', category: 'Student' },
  { label: 'PEN Number', tag: '{{student.penNo}}', category: 'Student' },
  { label: 'Gender', tag: '{{student.gender}}', category: 'Student' },
  { label: 'Admission Date', tag: '{{student.admissionDate}}', category: 'Student' },
  { label: 'Bus / Route No', tag: '{{student.busRoute}}', category: 'Student' },

  // Employee / Staff presets
  { label: 'Employee Name', tag: '{{employee.name}}', category: 'Staff' },
  { label: 'Employee Code', tag: '{{employee.code}}', category: 'Staff' },
  { label: 'Designation', tag: '{{employee.designation}}', category: 'Staff' },
  { label: 'Department', tag: '{{employee.department}}', category: 'Staff' },
  { label: 'Pay Month / Period', tag: '{{salary.month}}', category: 'Staff' },
  { label: 'Bank Account No', tag: '{{employee.bankAccount}}', category: 'Staff' },
  { label: 'PAN Card No', tag: '{{employee.panNo}}', category: 'Staff' },
  { label: 'UAN / PF Number', tag: '{{employee.pfNo}}', category: 'Staff' },
  { label: 'Days Present', tag: '{{salary.presentDays}}', category: 'Staff' },
  { label: 'Date of Joining', tag: '{{employee.doj}}', category: 'Staff' },

  // Receipt / Exam presets
  { label: 'Receipt Number', tag: '{{fee.receiptNo}}', category: 'Receipt' },
  { label: 'Payment Date', tag: '{{fee.date}}', category: 'Receipt' },
  { label: 'Exam Roll No', tag: '{{admit.rollNo}}', category: 'Exam' },
  { label: 'Exam Center', tag: '{{admit.center}}', category: 'Exam' },
  { label: 'Academic Session', tag: '{{exam.academicYear}}', category: 'Exam' }
];

const DEFAULT_DETAILS_FIELDS_BY_TYPE = {
  FeeReceipt: [
    { id: 'df1', label: 'Student Name', tag: '{{student.name}}' },
    { id: 'df2', label: 'Roll / Id', tag: '{{student.rollNo}}' },
    { id: 'df3', label: 'Admission No', tag: '{{student.admissionNo}}' },
    { id: 'df4', label: 'Class & Section', tag: '{{student.class}} - {{student.section}}' },
    { id: 'df5', label: 'Receipt No', tag: '{{fee.receiptNo}}' },
    { id: 'df6', label: 'Date', tag: '{{fee.date}}' }
  ],
  ReportCard: [
    { id: 'df1', label: 'Student Name', tag: '{{student.name}}' },
    { id: 'df2', label: 'Roll No', tag: '{{student.rollNo}}' },
    { id: 'df3', label: 'Admission No', tag: '{{student.admissionNo}}' },
    { id: 'df4', label: 'Class & Section', tag: '{{student.class}} - {{student.section}}' },
    { id: 'df5', label: "Father's Name", tag: '{{student.fatherName}}' },
    { id: 'df6', label: 'Academic Year', tag: '{{exam.academicYear}}' }
  ],
  SalarySlip: [
    { id: 'df1', label: 'Employee Name', tag: '{{employee.name}}' },
    { id: 'df2', label: 'Employee Code', tag: '{{employee.code}}' },
    { id: 'df3', label: 'Designation', tag: '{{employee.designation}}' },
    { id: 'df4', label: 'Department', tag: '{{employee.department}}' },
    { id: 'df5', label: 'Pay Month', tag: '{{salary.month}}' },
    { id: 'df6', label: 'Bank A/C No', tag: '{{employee.bankAccount}}' }
  ],
  AdmitCard: [
    { id: 'df1', label: 'Candidate Name', tag: '{{student.name}}' },
    { id: 'df2', label: 'Exam Roll No', tag: '{{admit.rollNo}}' },
    { id: 'df3', label: 'Class & Section', tag: '{{student.class}} - {{student.section}}' },
    { id: 'df4', label: 'Exam Center', tag: '{{admit.center}}' },
    { id: 'df5', label: "Father's Name", tag: '{{student.fatherName}}' },
    { id: 'df6', label: 'Date of Birth', tag: '{{student.dob}}' }
  ],
  TransferCertificate: [
    { id: 'df1', label: 'Student Name', tag: '{{student.name}}' },
    { id: 'df2', label: "Father's Name", tag: '{{student.fatherName}}' },
    { id: 'df3', label: "Mother's Name", tag: '{{student.motherName}}' },
    { id: 'df4', label: 'Admission No', tag: '{{student.admissionNo}}' },
    { id: 'df5', label: 'TC Number', tag: '{{tc.certificateNo}}' },
    { id: 'df6', label: 'Class Last Studied', tag: '{{tc.leavingClass}}' }
  ],
  GatePass: [
    { id: 'df1', label: 'Visitor Name', tag: '{{gatepass.visitorName}}' },
    { id: 'df2', label: 'Pass / Token No', tag: '{{gatepass.tokenNo}}' },
    { id: 'df3', label: 'Whom to Meet', tag: '{{gatepass.toMeet}}' },
    { id: 'df4', label: 'Purpose of Visit', tag: '{{gatepass.purpose}}' },
    { id: 'df5', label: 'Entry Time', tag: '{{gatepass.entryTime}}' },
    { id: 'df6', label: 'Vehicle No', tag: '{{gatepass.vehicleNo}}' }
  ]
};

const DEFAULT_COLUMNS_BY_TYPE = {
  FeeReceipt: [
    { id: 'c1', label: 'Item / Particulars', tag: '{{fee.itemsTable}}', width: '70%', align: 'left' },
    { id: 'c2', label: 'Total Paid', tag: '₹{{fee.totalPaid}}', width: '30%', align: 'right' }
  ],
  ReportCard: [
    { id: 'c1', label: 'Subject Name', tag: 'Subject', width: '40%', align: 'left' },
    { id: 'c2', label: 'Max Marks', tag: '100', width: '20%', align: 'center' },
    { id: 'c3', label: 'Marks Obtained', tag: '{{exam.marksTable}}', width: '20%', align: 'center' },
    { id: 'c4', label: 'Grade', tag: '{{exam.grade}}', width: '20%', align: 'center' }
  ],
  SalarySlip: [
    { id: 'c1', label: 'Earnings Components', tag: '{{salary.earningsTable}}', width: '50%', align: 'left' },
    { id: 'c2', label: 'Deductions Components', tag: '{{salary.deductionsTable}}', width: '50%', align: 'left' }
  ],
  AdmitCard: [
    { id: 'c1', label: 'Date & Subject Schedule', tag: '{{admit.scheduleTable}}', width: '100%', align: 'left' }
  ],
  TransferCertificate: [
    { id: 'c1', label: 'Student Particulars & History', tag: '{{student.name}}', width: '100%', align: 'left' }
  ],
  GatePass: [
    { id: 'c1', label: 'Visitor Details & Vehicle', tag: '{{gatepass.visitorName}}', width: '100%', align: 'left' }
  ]
};

const SuperPrintGallery = () => {
  // Navigation tabs: 'gallery' | 'generator' | 'studio' | 'simulator' | 'broadcast'
  const [activeTab, setActiveTab] = useState('gallery');

  // School Selector
  const [schools, setSchools] = useState([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('global'); // 'global' or school GUID

  // Templates
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('All');

  // Feedback Notification
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Print execution
  const [printContent, setPrintContent] = useState('');
  const [triggerPrintFn, setTriggerPrintFn] = useState(null);

  // --- STUDIO STATE (Dual-Mode: Visual vs Code) ---
  const [studioMode, setStudioMode] = useState('visual'); // 'visual' | 'code'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('New Custom Format');
  const [documentType, setDocumentType] = useState('FeeReceipt');
  const [paperSize, setPaperSize] = useState('A4Single');
  const [rawHtmlCode, setRawHtmlCode] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Visual Designer Config
  const [visualHeaderRules, setVisualHeaderRules] = useState({
    repeatOnEveryPage: false,
    showLogo: true,
    showAddress: true,
    showAffiliation: true,
    titleAlign: 'center'
  });
  const [visualColumns, setVisualColumns] = useState(DEFAULT_COLUMNS_BY_TYPE.FeeReceipt);
  const [visualDetailsFields, setVisualDetailsFields] = useState(DEFAULT_DETAILS_FIELDS_BY_TYPE.FeeReceipt);
  const [detailsGridCols, setDetailsGridCols] = useState(2); // 2 or 3 columns
  const [visualFooterRules, setVisualFooterRules] = useState({
    signaturesOnLastPageOnly: true,
    repeatFooter: true,
    showPageNumbers: true,
    showAuthorizedSign: true
  });

  // Add / Edit Detail Field Modal State
  const [showAddDetailModal, setShowAddDetailModal] = useState(false);
  const [newDetailLabel, setNewDetailLabel] = useState('');
  const [newDetailTag, setNewDetailTag] = useState('');
  const [editingDetailIndex, setEditingDetailIndex] = useState(null);

  // Add Custom Column Modal State
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColTag, setNewColTag] = useState('');
  const [newColWidth, setNewColWidth] = useState('25%');
  const [newColAlign, setNewColAlign] = useState('left');

  // --- AI GENERATOR STATE ---
  const [aiDocType, setAiDocType] = useState('ReportCard');
  const [aiPaperSize, setAiPaperSize] = useState('A4Single');
  const [aiPrompt, setAiPrompt] = useState('CBSE Class 10th Report Card with subject-wise theory & practical marks, grading scale, teacher remarks and principal stamp');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiImage, setAiImage] = useState(null);
  const [aiImageName, setAiImageName] = useState('');
  const [aiImageSize, setAiImageSize] = useState('');
  const [aiFileType, setAiFileType] = useState('image'); // 'image' | 'pdf'
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [aiPreviewView, setAiPreviewView] = useState('preview'); // 'preview' | 'schema'
  const [aiSaveAsDefault, setAiSaveAsDefault] = useState(false);

  // --- SIMULATOR STATE ---
  const [simDocType, setSimDocType] = useState('FeeReceipt');
  const [simRecordId, setSimRecordId] = useState('sample-demo-record');
  const [simLoading, setSimLoading] = useState(false);
  const [simHtml, setSimHtml] = useState('');

  // --- PUSH MODAL STATE ---
  const [showPushModal, setShowPushModal] = useState(false);
  const [targetPushTemplate, setTargetPushTemplate] = useState(null);
  const [pushMode, setPushMode] = useState('all'); // 'all' | 'selected'
  const [selectedPushSchoolIds, setSelectedPushSchoolIds] = useState([]);
  const [schoolPushSearch, setSchoolPushSearch] = useState('');
  const [setAsDefaultOnPush, setSetAsDefaultOnPush] = useState(true);
  const [pushing, setPushing] = useState(false);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback({ type: '', message: '' }), 5000);
  };

  // 1. Fetch schools list on mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await apiClient.get('/super/schools');
        setSchools(res.data || []);
      } catch (err) {
        console.error('Failed to load schools:', err);
      }
    };
    fetchSchools();
  }, []);

  // 2. Fetch templates whenever selectedSchoolId changes
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      if (selectedSchoolId === 'global') {
        const res = await apiClient.get('/super/print-templates/masters');
        setTemplates(res.data || []);
      } else {
        const res = await apiClient.get(`/print-templates?schoolId=${selectedSchoolId}&includeMasters=true`);
        setTemplates(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      showFeedback('error', 'Failed to load templates for the selected context.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedSchoolId]);

  // Handle Instant Test Print
  const handleTestPrint = (html) => {
    if (!html) {
      showFeedback('error', 'No HTML content to print.');
      return;
    }
    setPrintContent(html);
    setTimeout(() => {
      if (triggerPrintFn) triggerPrintFn();
      else printDirectHtml(html);
    }, 150);
  };

  // Visual Compiler: turns visual columns, details fields and pagination rules into HTML
  const compileVisualToHtml = (type, size, hRules, detailsFields, cols, fRules, gridCols = 2) => {
    const isThermal = size === 'Thermal80mm';
    const isTwin = size === 'A4TwinCopy';
    const alignClass = hRules.titleAlign === 'left' ? 'text-left' : hRules.titleAlign === 'right' ? 'text-right' : 'text-center';

    const headerHtml = `
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; text-align: ${hRules.titleAlign};">
        <div style="display: flex; align-items: center; justify-content: ${hRules.titleAlign === 'left' ? 'flex-start' : hRules.titleAlign === 'right' ? 'flex-end' : 'center'}; gap: 14px; margin-bottom: 4px;">
          ${hRules.showLogo ? '<img src="{{school.logoUrl}}" style="max-height: 55px; max-width: 90px; object-fit: contain;" onerror="this.style.display=\'none\'" alt="Logo" />' : ''}
          <div style="font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase;">{{school.name}}</div>
        </div>
        ${hRules.showAddress ? '<div style="font-size: 11px; color: #64748b;">{{school.address}} | Ph: {{school.phone}}</div>' : ''}
        ${hRules.showAffiliation ? '<div style="font-size: 10px; color: #94a3b8;">Affiliation No: {{school.affiliationNo}}</div>' : ''}
        <h3 style="margin-top: 8px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #2563eb;">{{exam.name}}</h3>
      </div>
    `;

    const activeDetails = detailsFields !== undefined ? detailsFields : (DEFAULT_DETAILS_FIELDS_BY_TYPE[type] || DEFAULT_DETAILS_FIELDS_BY_TYPE.FeeReceipt);
    const detailsGridHtml = activeDetails && activeDetails.length > 0 ? `
      <div style="display: grid; grid-template-columns: repeat(${gridCols || 2}, 1fr); gap: 8px; font-size: 11px; margin-bottom: 14px; background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0; border-radius: 6px;">
        ${activeDetails.map(f => `<div><strong>${f.label}:</strong> ${f.tag}</div>`).join('')}
      </div>
    ` : '';

    const tableRows = cols.map(c => `
      <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: ${c.align}; width: ${c.width}; background: #f8fafc;">
        ${c.label}
      </th>
    `).join('');

    const sampleRowValues = cols.map(c => `
      <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: ${c.align}; font-size: 11.5px;">
        ${c.tag}
      </td>
    `).join('');

    const columnsTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
        <thead>
          <tr style="background: #f1f5f9;">
            ${tableRows}
          </tr>
        </thead>
        <tbody>
          <tr>
            ${sampleRowValues}
          </tr>
        </tbody>
      </table>
    `;

    const footerHtml = `
      <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 10px; ${fRules.signaturesOnLastPageOnly ? 'page-break-inside: avoid;' : ''}">
        ${fRules.repeatFooter ? '<div style="display: flex; justify-content: space-between; font-size: 10px; color: #64748b; margin-bottom: 24px;"><span>System Generated Document</span><span>Date: {{fee.date}}</span><span>Page 1 of 1</span></div>' : ''}
        ${fRules.showAuthorizedSign ? `
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; margin-top: 20px;">
            <div style="border-top: 1px solid #000; padding-top: 4px; width: 140px; text-align: center;">Authorized Sign</div>
            <div style="border-top: 1px solid #000; padding-top: 4px; width: 140px; text-align: center;">Accountant</div>
            <div style="border-top: 1px solid #000; padding-top: 4px; width: 140px; text-align: center;">Principal</div>
          </div>
        ` : ''}
      </div>
    `;

    const mediaPrintRules = `
      <style>
        @media print {
          ${hRules.repeatOnEveryPage ? 'thead { display: table-header-group; }' : ''}
          ${fRules.signaturesOnLastPageOnly ? '.last-page-signatures { page-break-before: auto; }' : ''}
        }
      </style>
    `;

    return `<div class="${isThermal ? 'print-zone-thermal' : 'print-zone-a4'}" style="font-family: sans-serif; padding: 14px; background: #fff; color: #000;">
      ${mediaPrintRules}
      ${headerHtml}
      ${detailsGridHtml}
      ${columnsTableHtml}
      ${footerHtml}
    </div>`;
  };

  // Switch between Visual & Code mode with synchronization
  const handleToggleStudioMode = (newMode) => {
    if (newMode === 'code' && studioMode === 'visual') {
      // Compile visual designer state into raw HTML
      const compiled = compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, detailsGridCols);
      setRawHtmlCode(compiled);
    }
    setStudioMode(newMode);
  };

  // Reordering Columns (Move Up / Move Down)
  const moveColumn = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= visualColumns.length) return;
    const next = [...visualColumns];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setVisualColumns(next);
    const updatedHtml = compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, next, visualFooterRules, detailsGridCols);
    setRawHtmlCode(updatedHtml);
  };

  const removeColumn = (index) => {
    const next = visualColumns.filter((_, i) => i !== index);
    setVisualColumns(next);
    const updatedHtml = compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, next, visualFooterRules, detailsGridCols);
    setRawHtmlCode(updatedHtml);
  };

  const handleAddCustomColumn = () => {
    if (!newColLabel.trim()) return;
    const newCol = {
      id: 'c_' + Date.now(),
      label: newColLabel.trim(),
      tag: newColTag.trim() || `{{custom.${newColLabel.trim().toLowerCase().replace(/\s+/g, '_')}}}`,
      width: newColWidth,
      align: newColAlign
    };
    const next = [...visualColumns, newCol];
    setVisualColumns(next);
    setShowAddColModal(false);
    setNewColLabel('');
    setNewColTag('');
    const updatedHtml = compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, next, visualFooterRules, detailsGridCols);
    setRawHtmlCode(updatedHtml);
    showFeedback('success', `Column "${newCol.label}" added!`);
  };

  // Details Fields (Student / Employee Info) Handlers
  const moveDetailField = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= visualDetailsFields.length) return;
    const next = [...visualDetailsFields];
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    setVisualDetailsFields(next);
    const updatedHtml = compileVisualToHtml(documentType, paperSize, visualHeaderRules, next, visualColumns, visualFooterRules, detailsGridCols);
    setRawHtmlCode(updatedHtml);
  };

  const removeDetailField = (index) => {
    const next = visualDetailsFields.filter((_, i) => i !== index);
    setVisualDetailsFields(next);
    const updatedHtml = compileVisualToHtml(documentType, paperSize, visualHeaderRules, next, visualColumns, visualFooterRules, detailsGridCols);
    setRawHtmlCode(updatedHtml);
  };

  const openAddDetailField = () => {
    setEditingDetailIndex(null);
    setNewDetailLabel('');
    setNewDetailTag('');
    setShowAddDetailModal(true);
  };

  const openEditDetailField = (index) => {
    const target = visualDetailsFields[index];
    setEditingDetailIndex(index);
    setNewDetailLabel(target.label);
    setNewDetailTag(target.tag);
    setShowAddDetailModal(true);
  };

  const handleSaveCustomDetailField = () => {
    if (!newDetailLabel.trim()) return;
    const tag = newDetailTag.trim() || `{{custom.${newDetailLabel.trim().toLowerCase().replace(/\s+/g, '_')}}}`;
    let next;
    if (editingDetailIndex !== null) {
      next = [...visualDetailsFields];
      next[editingDetailIndex] = {
        ...next[editingDetailIndex],
        label: newDetailLabel.trim(),
        tag
      };
      showFeedback('success', `Field "${newDetailLabel.trim()}" updated!`);
    } else {
      const newField = {
        id: 'df_' + Date.now(),
        label: newDetailLabel.trim(),
        tag
      };
      next = [...visualDetailsFields, newField];
      showFeedback('success', `Field "${newDetailLabel.trim()}" added to details!`);
    }
    setVisualDetailsFields(next);
    setShowAddDetailModal(false);
    setNewDetailLabel('');
    setNewDetailTag('');
    setEditingDetailIndex(null);
    const updatedHtml = compileVisualToHtml(documentType, paperSize, visualHeaderRules, next, visualColumns, visualFooterRules, detailsGridCols);
    setRawHtmlCode(updatedHtml);
  };

  // Open Template in Studio
  const handleOpenStudioForTemplate = (tpl) => {
    setSelectedTemplate(tpl);
    setTemplateName(tpl.templateName || tpl.TemplateName || 'Custom Format');
    const docType = tpl.documentType || tpl.DocumentType || 'FeeReceipt';
    setDocumentType(docType);
    setPaperSize(tpl.paperSize || tpl.PaperSize || 'A4Single');
    const html = tpl.htmlContent || tpl.HtmlContent || '';
    setRawHtmlCode(html);

    let parsedConfig = null;
    try {
      if (tpl.layoutConfigJson) parsedConfig = JSON.parse(tpl.layoutConfigJson);
    } catch (e) {}

    const details = parsedConfig?.detailsFields || DEFAULT_DETAILS_FIELDS_BY_TYPE[docType] || DEFAULT_DETAILS_FIELDS_BY_TYPE.FeeReceipt;
    const cols = parsedConfig?.columns || DEFAULT_COLUMNS_BY_TYPE[docType] || DEFAULT_COLUMNS_BY_TYPE.FeeReceipt;
    const gridCols = parsedConfig?.gridCols || 2;

    setVisualDetailsFields(details);
    setVisualColumns(cols);
    setDetailsGridCols(gridCols);
    setActiveTab('studio');
  };

  // Save Template in Studio
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      showFeedback('error', 'Template name is required.');
      return;
    }
    setSavingTemplate(true);
    try {
      const finalHtml = studioMode === 'visual'
        ? compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, detailsGridCols)
        : rawHtmlCode;

      const isMaster = selectedSchoolId === 'global';
      const targetSchool = isMaster ? null : selectedSchoolId;

      const layoutConfigJson = JSON.stringify({
        headerRules: visualHeaderRules,
        footerRules: visualFooterRules,
        columns: visualColumns,
        detailsFields: visualDetailsFields,
        gridCols: detailsGridCols
      });

      if (selectedTemplate && selectedTemplate.id) {
        await apiClient.put(`/print-templates/${selectedTemplate.id}`, {
          templateName,
          documentType,
          paperSize,
          layoutConfigJson,
          htmlContent: finalHtml,
          isDefault: selectedTemplate.isDefault || false
        });
        showFeedback('success', `Template "${templateName}" updated successfully!`);
      } else {
        await apiClient.post('/print-templates', {
          templateName,
          documentType,
          paperSize,
          layoutConfigJson,
          htmlContent: finalHtml,
          schoolId: targetSchool,
          isSuperAdminMaster: isMaster,
          isDefault: false
        });
        showFeedback('success', `New template "${templateName}" created successfully!`);
      }
      fetchTemplates();
      setActiveTab('gallery');
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Set / Toggle Default Template
  const handleSetDefault = async (id) => {
    try {
      const res = await apiClient.post(`/print-templates/${id}/set-default`);
      showFeedback('success', res.data?.message || 'Format default status updated successfully!');
      fetchTemplates();
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Failed to update default format.');
    }
  };

  // Deactivate Template
  const handleDeleteTemplate = async (id) => {
    if (!confirm('Are you sure you want to deactivate this format?')) return;
    try {
      await apiClient.delete(`/print-templates/${id}`);
      showFeedback('success', 'Template deactivated.');
      fetchTemplates();
    } catch (err) {
      showFeedback('error', 'Failed to delete template.');
    }
  };

  // AI Image / PDF Helpers
  const handleImageFile = (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isImage && !isPdf) {
      showFeedback('error', 'Please select a valid image (PNG, JPG, WEBP) or PDF document.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      showFeedback('error', 'File size should be under 12MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setAiImage(e.target.result);
      setAiImageName(file.name);
      setAiImageSize((file.size / 1024).toFixed(1) + ' KB');
      setAiFileType(isPdf ? 'pdf' : 'image');
      showFeedback('success', `${isPdf ? 'PDF document' : 'Photo'} "${file.name}" attached! AI will replicate its layout.`);
    };
    reader.readAsDataURL(file);
  };

  const handleDropImage = (e) => {
    e.preventDefault();
    setIsDraggingImage(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveImage = () => {
    setAiImage(null);
    setAiImageName('');
    setAiImageSize('');
    setAiFileType('image');
  };

  // AI Generator Submit
  const handleRunAi = async () => {
    if (!aiPrompt.trim() && !aiImage) {
      showFeedback('error', 'Please provide a prompt instruction or upload a document/photo.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await apiClient.post('/print-templates/ai-generate', {
        documentType: aiDocType,
        paperSize: aiPaperSize,
        prompt: aiPrompt.trim() || 'Faithfully clone the visual layout, tables, borders, and typography of the uploaded document and generate an EduVault print template with merge tags.',
        base64Image: aiImage || null
      });
      setAiResult(res.data);
      showFeedback('success', aiImage ? `AI successfully cloned format from ${aiFileType === 'pdf' ? 'PDF' : 'photo'}! Review live preview.` : 'AI format generated! Review live preview.');
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'AI generation failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUseAiResultInStudio = () => {
    if (!aiResult) return;
    setSelectedTemplate(null);
    setTemplateName(aiResult.templateName || 'AI Generated Format');
    setDocumentType(aiResult.documentType || aiDocType);
    setPaperSize(aiResult.paperSize || aiPaperSize);
    setRawHtmlCode(aiResult.htmlContent);
    setStudioMode('code');
    setActiveTab('studio');
    showFeedback('success', 'AI Template loaded into Code Studio! You can edit, customize or test print.');
  };

  // Direct Save Format from AI Result
  const handleSaveDirectFromAi = async (setAsDefault = false) => {
    if (!aiResult) return;
    setSavingTemplate(true);
    try {
      const isMaster = selectedSchoolId === 'global';
      const targetSchool = isMaster ? null : selectedSchoolId;

      await apiClient.post('/print-templates', {
        templateName: aiResult.templateName || `${aiDocType} AI Generated Format`,
        documentType: aiResult.documentType || aiDocType,
        paperSize: aiResult.paperSize || aiPaperSize,
        layoutConfigJson: JSON.stringify({ wasAiGenerated: true, prompt: aiPrompt }),
        htmlContent: aiResult.htmlContent,
        schoolId: targetSchool,
        isSuperAdminMaster: isMaster,
        isDefault: setAsDefault
      });

      const schoolObj = schools.find(s => s.id === targetSchool);
      const schoolName = schoolObj ? schoolObj.name : 'School';
      showFeedback('success', `Format "${aiResult.templateName}" saved successfully${isMaster ? ' as Global Master' : ` for ${schoolName}`}!`);
      await fetchTemplates();
      setActiveTab('gallery');
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Failed to save format.');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Helper to extract merge tags and map them to Database Schema and Columns
  const getDetectedSchemaColumns = (html) => {
    if (!html) return [];
    const matches = html.match(/\{\{([^{}]+)\}\}/g) || [];
    const unique = [...new Set(matches)];

    return unique.map(tag => {
      const clean = tag.replace(/[{}]/g, '').trim().toLowerCase();
      if (clean.startsWith('school.')) {
        const col = clean.split('.')[1] || 'name';
        return {
          tag,
          table: 'Schools',
          column: col === 'name' ? 'Name' : col === 'address' ? 'Address' : col === 'phone' ? 'Phone' : col === 'affiliationno' ? 'AffiliationNumber' : 'LogoUrl',
          type: 'VARCHAR / TEXT',
          status: 'Direct Table Column',
          badge: 'DB Field'
        };
      }
      if (clean.startsWith('student.')) {
        const col = clean.split('.')[1] || 'name';
        if (col === 'name') return { tag, table: 'Users JOIN Students', column: 'Users.FirstName || " " || Users.LastName', type: 'VARCHAR', status: 'Relational (User table)', badge: 'DB Field' };
        if (col === 'rollno') return { tag, table: 'Students', column: 'Students.StudentId / RollNumber', type: 'VARCHAR', status: 'Direct Table Column', badge: 'DB Field' };
        if (col === 'admissionno') return { tag, table: 'Students', column: 'Students.AdmissionNumber', type: 'VARCHAR', status: 'Direct Table Column', badge: 'DB Field' };
        if (col === 'fathername') return { tag, table: 'Students', column: 'Students.FatherName / GuardianName', type: 'VARCHAR', status: 'Direct Table Column', badge: 'DB Field' };
        if (col === 'class' || col === 'section') return { tag, table: 'Enrollments JOIN Classes', column: 'Classes.Grade / Classes.Section', type: 'VARCHAR', status: 'Relational (Class table)', badge: 'DB Field' };
        return { tag, table: 'Students', column: `Students.${col}`, type: 'VARCHAR', status: 'Direct Table Column', badge: 'DB Field' };
      }
      if (clean.startsWith('exam.')) {
        const col = clean.split('.')[1] || 'marks';
        if (col.includes('rows') || col.includes('table')) {
          return { tag, table: 'ExamResults JOIN Exams JOIN Subjects', column: 'Dynamic <tr> rows generated by Backend Engine', type: 'HTML / RELATIONAL', status: 'Query Procedure', badge: 'Relational Procedure' };
        }
        if (col.includes('totalcredit') || col.includes('totalmarks')) {
          return { tag, table: 'ExamResults / Exams', column: 'SUM(Exams.MaxMarks / Credits)', type: 'DECIMAL (Computed)', status: 'Procedure Aggregation', badge: 'Calculated' };
        }
        if (col.includes('obtainedmarks')) {
          return { tag, table: 'ExamResults', column: 'SUM(ExamResults.MarksObtained)', type: 'DECIMAL (Computed)', status: 'Procedure Aggregation', badge: 'Calculated' };
        }
        if (col.includes('sgpa') || col.includes('cgpa') || col.includes('percentage')) {
          return { tag, table: 'ExamResults Engine', column: 'Calculated via Formula: (Earned Credits / Total Credits)', type: 'DECIMAL (Formula)', status: 'Engine Computation', badge: 'Calculated' };
        }
        if (col.includes('result') || col.includes('grade')) {
          return { tag, table: 'ExamResults Engine', column: 'CASE WHEN Marks >= 40 THEN "PASS" ELSE "FAIL"', type: 'VARCHAR', status: 'Engine Evaluation', badge: 'Calculated' };
        }
        return { tag, table: 'Exams / ExamResults', column: col, type: 'VARCHAR / TIMESTAMP', status: 'Computed or DB Column', badge: 'DB Field' };
      }
      if (clean.startsWith('fee.')) {
        const col = clean.split('.')[1] || 'amount';
        if (col === 'receiptno') return { tag, table: 'Transactions', column: 'ReferenceNumber', type: 'VARCHAR', status: 'Direct Table Column', badge: 'DB Field' };
        if (col === 'totalpaid') return { tag, table: 'Transactions', column: 'Amount', type: 'NUMERIC(18,2)', status: 'Direct Table Column', badge: 'DB Field' };
        if (col === 'date') return { tag, table: 'Transactions', column: 'TransactionDate', type: 'TIMESTAMP', status: 'Direct Table Column', badge: 'DB Field' };
        if (col === 'amountinwords') return { tag, table: 'NumberToWords Service', column: 'Generated in Words via Backend Helper', type: 'TEXT', status: 'Procedural Helper', badge: 'Calculated' };
        if (col.includes('table') || col.includes('items')) return { tag, table: 'Invoices JOIN FeeStructures', column: 'Dynamic Fee Particulars <tr>', type: 'HTML / RELATIONAL', status: 'Relational Procedure', badge: 'Relational Procedure' };
        return { tag, table: 'Transactions / Invoices', column: col, type: 'VARCHAR', status: 'Direct Table Column', badge: 'DB Field' };
      }
      return { tag, table: 'Context / Custom', column: clean, type: 'TEXT', status: 'Merged via Print Engine', badge: 'Dynamic Tag' };
    });
  };

  // Real Data Simulation
  const handleRunSimulator = async (targetDocType) => {
    const doc = targetDocType || simDocType;
    setSimLoading(true);
    try {
      const params = {};
      if (selectedSchoolId !== 'global') {
        params.schoolId = selectedSchoolId;
      }
      const recordId = simRecordId.trim() || 'sample-demo-record';
      const res = await apiClient.get(`/print-templates/render/${doc}/${recordId}`, { params });
      setSimHtml(res.data.html || res.data.renderedHtml);
      showFeedback('success', `Real data merged for ${doc}!`);
    } catch (err) {
      showFeedback('error', 'Simulation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSimLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'simulator' && !simHtml) {
      handleRunSimulator(simDocType);
    }
  }, [activeTab]);

  // Execute Push to Schools
  const handleExecutePush = async () => {
    if (!targetPushTemplate) return;
    if (pushMode === 'selected' && selectedPushSchoolIds.length === 0) {
      showFeedback('error', 'Please select at least one school to push the template to.');
      return;
    }
    setPushing(true);
    try {
      const payload = {
        masterTemplateId: targetPushTemplate.id,
        pushToAllSchools: pushMode === 'all',
        schoolIds: pushMode === 'all' ? null : selectedPushSchoolIds,
        setAsDefault: setAsDefaultOnPush
      };
      const res = await apiClient.post('/super/print-templates/push', payload);
      showFeedback('success', res.data?.message || 'Master template pushed to schools!');
      setShowPushModal(false);
      setTargetPushTemplate(null);
    } catch (err) {
      showFeedback('error', err.response?.data?.error || 'Failed to push template.');
    } finally {
      setPushing(false);
    }
  };

  const filteredTemplates = templates.filter(t => {
    const name = (t.templateName || t.TemplateName || '').toLowerCase();
    const desc = (t.description || t.Description || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesQ = name.includes(q) || desc.includes(q);
    const doc = t.documentType || t.DocumentType;
    const matchesDoc = selectedDocType === 'All' || doc === selectedDocType;
    return matchesQ && matchesDoc;
  });

  const selectedSchoolObj = schools.find(s => s.id === selectedSchoolId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Hidden isolated print frame */}
      <PrintIframe htmlContent={printContent} onReady={fn => setTriggerPrintFn(() => fn)} />

      <Topbar
        title="Super Admin Visual Print Studio & Master Hub"
        subtitle="Centralized Layout Builder, Column Reordering, School-Wise Tailoring & Push Engine"
        actions={
          <div className="flex items-center gap-2">
            {/* School Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <Building className="w-4 h-4 text-indigo-600 shrink-0" />
              <div className="text-left">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Scope / Target School</div>
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="global">🌐 Global Masters (All Schools)</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      🏫 {s.name} ({s.city || 'Campus'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedTemplate(null);
                setTemplateName('New School Print Format');
                setDocumentType('FeeReceipt');
                setPaperSize('A4Single');
                setVisualColumns(DEFAULT_COLUMNS_BY_TYPE.FeeReceipt);
                setRawHtmlCode(compileVisualToHtml('FeeReceipt', 'A4Single', visualHeaderRules, DEFAULT_COLUMNS_BY_TYPE.FeeReceipt, visualFooterRules));
                setActiveTab('studio');
              }}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Format</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Global Feedback Banner */}
        {feedback.message && (
          <div className={`p-4 rounded-2xl flex items-center justify-between shadow-sm border ${feedback.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              {feedback.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback({ type: '', message: '' })} className="font-bold text-xs hover:opacity-75">&times;</button>
          </div>
        )}

        {/* Current Context Notification Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              {selectedSchoolId === 'global' ? <Globe className="w-5 h-5" /> : <Building className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                {selectedSchoolId === 'global' ? 'Global Master Repository' : `Configuring Layouts for: ${selectedSchoolObj?.name || 'Selected School'}`}
              </div>
              <div className="text-[11px] text-slate-300">
                {selectedSchoolId === 'global'
                  ? 'Master templates defined here can be broadcast or pushed to all schools with 1 click.'
                  : `Formats created or modified here will directly apply to ${selectedSchoolObj?.name}. School Admin will print using these formats.`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/30 font-mono text-[11px] font-bold border border-indigo-400/20">
              {templates.length} Templates Active
            </span>
            <button
              onClick={fetchTemplates}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
              title="Refresh templates"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto select-none">
          {[
            { id: 'gallery', label: '1. Formats Gallery', icon: Layers, badge: templates.length },
            { id: 'generator', label: '2. AI Format Generator', icon: Sparkles, smart: true },
            { id: 'studio', label: '3. Dual-Mode Visual & Code Studio', icon: Sliders },
            { id: 'simulator', label: '4. Real Data Print Simulator', icon: Play },
            ...(selectedSchoolId === 'global' ? [{ id: 'broadcast', label: '5. Push to Schools Hub', icon: Send }] : [])
          ].map(tab => {
            const IconComp = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 cursor-pointer ${active ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${active ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-200 text-slate-700'}`}>
                    {tab.badge}
                  </span>
                )}
                {tab.smart && (
                  <span className="px-1.5 py-0.2 bg-amber-400 text-amber-950 rounded-full text-[9px] font-black uppercase">
                    Smart
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FORMATS GALLERY */}
        {/* ========================================================================= */}
        {activeTab === 'gallery' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search formats by name, document type or keywords..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs bg-transparent focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedDocType}
                  onChange={e => setSelectedDocType(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50 focus:outline-none font-medium"
                >
                  {DOC_TYPES.map(d => (
                    <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Template Cards Grid */}
            {loading ? (
              <Loader message="Loading formats gallery..." />
            ) : filteredTemplates.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-2xs space-y-3">
                <FileText className="w-12 h-12 text-slate-300 mx-auto stroke-[1.5]" />
                <h3 className="text-sm font-bold text-slate-800">No print formats found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No templates match your search criteria. Create one from scratch or generate a ready format with AI.
                </p>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setActiveTab('generator')}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Generate with AI
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setTemplateName('New Custom Format');
                      setDocumentType('FeeReceipt');
                      setPaperSize('A4Single');
                      setVisualColumns(DEFAULT_COLUMNS_BY_TYPE.FeeReceipt);
                      setRawHtmlCode(compileVisualToHtml('FeeReceipt', 'A4Single', visualHeaderRules, DEFAULT_COLUMNS_BY_TYPE.FeeReceipt, visualFooterRules));
                      setActiveTab('studio');
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Design Format
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredTemplates.map(tpl => {
                  const isDefault = tpl.isDefault || tpl.IsDefault;
                  const isMaster = !tpl.schoolId && !tpl.SchoolId;
                  const html = tpl.htmlContent || tpl.HtmlContent || '';

                  return (
                    <div
                      key={tpl.id || tpl.Id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 inline-block mb-1.5">
                              {tpl.documentType || tpl.DocumentType}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {tpl.templateName || tpl.TemplateName}
                            </h3>
                          </div>
                          {isDefault ? (
                            <button
                              onClick={() => handleSetDefault(tpl.id || tpl.Id)}
                              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group/star"
                              title="Click to remove Default status"
                            >
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500 group-hover/star:rotate-12 transition-transform" /> Default
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSetDefault(tpl.id || tpl.Id)}
                              className="text-[10px] font-semibold text-slate-400 hover:text-amber-600 flex items-center gap-1 cursor-pointer transition-all hover:scale-105 active:scale-95 px-1 py-0.5"
                              title="Click to set as Default format"
                            >
                              <Star className="w-3 h-3" /> Set Default
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {tpl.description || tpl.Description || `Standard layout for ${tpl.documentType || tpl.DocumentType} printing.`}
                        </p>

                        {/* Live Micro Thumbnail Preview */}
                        <div className="w-full h-36 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 relative pointer-events-none select-none">
                          <iframe
                            title={`preview-${tpl.id || tpl.Id}`}
                            srcDoc={html}
                            className="w-[200%] h-[200%] origin-top-left scale-50 border-none bg-white"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Paper: <strong className="text-slate-700">{tpl.paperSize || tpl.PaperSize}</strong></span>
                          <span>{isMaster ? '🌐 Global Master' : '🏫 School Custom'}</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-4 border-t border-slate-100 mt-4 grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleOpenStudioForTemplate(tpl)}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => handleTestPrint(html)}
                          className="py-1.5 px-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Instant Physical Test Print"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>
                        {isMaster ? (
                          <button
                            onClick={() => {
                              setTargetPushTemplate(tpl);
                              setPushMode('all');
                              setSelectedPushSchoolIds([]);
                              setShowPushModal(true);
                            }}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Push to Schools"
                          >
                            <Send className="w-3 h-3" /> Push
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id || tpl.Id)}
                            className="py-1.5 px-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Deactivate format"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: AI FORMAT GENERATOR */}
        {/* ========================================================================= */}
        {activeTab === 'generator' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">AI Print Format Generator</h2>
                <p className="text-xs text-slate-500">
                  Type instructions in plain English/Hinglish to generate print-perfect HTML & CSS layouts automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Type</label>
                <select
                  value={aiDocType}
                  onChange={e => setAiDocType(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  {DOC_TYPES.filter(d => d.value !== 'All').map(d => (
                    <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Paper Size</label>
                <select
                  value={aiPaperSize}
                  onChange={e => setAiPaperSize(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-medium"
                >
                  {PAPER_SIZES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo / PDF Document Upload Zone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                  Upload Sample Document (PDF or Photo/Scan)
                </label>
                <span className="text-[11px] text-slate-400 font-medium">PDF, PNG, JPG, WEBP (Max 12MB)</span>
              </div>

              {!aiImage ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingImage(true); }}
                  onDragLeave={() => setIsDraggingImage(false)}
                  onDrop={handleDropImage}
                  onClick={() => document.getElementById('ai-image-upload-super')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-4.5 text-center cursor-pointer transition-all ${
                    isDraggingImage
                      ? 'border-indigo-500 bg-indigo-50/60 scale-[1.01]'
                      : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70 bg-white'
                  }`}
                >
                  <input
                    id="ai-image-upload-super"
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        <span className="text-indigo-600 underline underline-offset-2">Click to upload</span> or drag & drop a PDF or Photo
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Upload sample Marksheet, Fee Receipt, TC, ID Card in PDF or Image format — AI will clone its exact layout!
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50/80 to-purple-50/40 border border-indigo-200 rounded-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    {aiFileType === 'pdf' ? (
                      <div className="w-12 h-12 rounded-xl bg-red-100 border border-red-200 flex flex-col items-center justify-center text-red-600 font-black text-[11px] shadow-xs">
                        <FileText className="w-5 h-5 mb-0.5" />
                        <span>PDF</span>
                      </div>
                    ) : (
                      <div className="relative group">
                        <img
                          src={aiImage}
                          alt="Sample preview"
                          className="w-12 h-12 object-cover rounded-xl border border-indigo-200 shadow-sm"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${aiFileType === 'pdf' ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>
                          {aiFileType === 'pdf' ? 'PDF ATTACHED' : 'PHOTO ATTACHED'}
                        </span>
                        <span className="text-xs font-semibold text-slate-800 truncate max-w-[220px]">
                          {aiImageName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {aiImageSize} • AI Vision will parse this {aiFileType === 'pdf' ? 'PDF' : 'image'} & clone layout with dynamic merge tags.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove document"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prompt / Layout Specifications
              </label>
              <textarea
                rows={4}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Describe how the document should look, which columns it should have, borders, tables, signatures, etc."
                className="w-full text-xs p-3.5 border border-slate-200 rounded-2xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
              {/* Quick Prompt Pills */}
              <div className="flex flex-wrap gap-2 mt-2">
                {[
                  'CBSE Term-2 Annual Marksheet with Grade Scale & Remarks',
                  '80mm POS Thermal Fee Cash Receipt with Barcode & Cut-line',
                  'Exam Hall Ticket with Passport Photo Box, Timetable & Rules',
                  'Staff Monthly Salary Slip with PF, ESI & Statutory Deductions',
                  'Official Transfer Certificate (TC) with PEN & Government Seal'
                ].map(pill => (
                  <button
                    key={pill}
                    onClick={() => setAiPrompt(pill)}
                    className="text-[10.5px] px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  >
                    + {pill}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleRunAi}
                disabled={aiLoading}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4" />
                {aiLoading ? 'AI Engine Synthesizing Layout...' : 'Generate Format with AI'}
              </button>
            </div>

            {/* AI Generated Result Preview */}
            {aiResult && (() => {
              const detectedColumns = getDetectedSchemaColumns(aiResult.htmlContent);
              const isMaster = selectedSchoolId === 'global';
              const targetSchoolObj = !isMaster ? schools.find(s => s.id === selectedSchoolId) : null;
              const targetSchoolName = targetSchoolObj ? targetSchoolObj.name : 'Global Masters (All Schools)';

              return (
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  {/* Top Bar: Title, Toggle, and Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Format Generated: {aiResult.templateName}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Target Destination: <strong className="text-indigo-700">{isMaster ? '🌐 Global Master (All Schools)' : `🏫 ${targetSchoolName}`}</strong>
                      </p>
                    </div>

                    {/* View Switcher: Live Preview vs Schema & Procedure */}
                    <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => setAiPreviewView('preview')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${aiPreviewView === 'preview' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Live Document</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAiPreviewView('schema')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${aiPreviewView === 'schema' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}
                      >
                        <Database className="w-3.5 h-3.5" />
                        <span>DB Columns & SQL Procedure ({detectedColumns.length})</span>
                      </button>
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestPrint(aiResult.htmlContent)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> Test Print
                      </button>
                      <button
                        type="button"
                        onClick={handleUseAiResultInStudio}
                        className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Open in Studio
                      </button>
                    </div>
                  </div>

                  {/* Direct Save Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-indigo-50/70 to-emerald-50/70 border border-indigo-100 rounded-2xl">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={aiSaveAsDefault}
                        onChange={e => setAiSaveAsDefault(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Set as active default format for <strong>{aiDocType}</strong></span>
                    </label>

                    <button
                      type="button"
                      disabled={savingTemplate}
                      onClick={() => handleSaveDirectFromAi(aiSaveAsDefault)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Save className="w-4 h-4" />
                      {savingTemplate ? 'Saving Format...' : `Save Format to ${isMaster ? 'Global Master' : targetSchoolName}`}
                    </button>
                  </div>

                  {/* VIEW 1: LIVE DOCUMENT PREVIEW */}
                  {aiPreviewView === 'preview' && (
                    <div className="border border-slate-300 rounded-2xl p-4 bg-slate-100">
                      <iframe
                        title="ai-preview"
                        srcDoc={aiResult.htmlContent}
                        className="w-full bg-white rounded-xl shadow-md border border-slate-300"
                        style={{ height: '480px' }}
                      />
                    </div>
                  )}

                  {/* VIEW 2: DATABASE COLUMNS, PROCEDURE & API MAPPING */}
                  {aiPreviewView === 'schema' && (
                    <div className="space-y-4 bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xl">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Database className="w-4 h-4 text-emerald-400" />
                            <span>Database Columns & Dynamic Procedure Inspector</span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Every placeholder tag in this template maps directly to database tables or backend procedure calculations.
                          </p>
                        </div>
                        <span className="text-xs font-mono px-2.5 py-1 bg-emerald-950 text-emerald-300 rounded-lg border border-emerald-800">
                          {detectedColumns.length} Fields Auto-Mapped
                        </span>
                      </div>

                      {/* Columns Mapping Table */}
                      <div className="overflow-x-auto rounded-xl border border-slate-800">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-800/80 text-slate-300 uppercase text-[10px] tracking-wider">
                            <tr>
                              <th className="p-3">Template Merge Tag</th>
                              <th className="p-3">Target DB Table</th>
                              <th className="p-3">Source Column / Expression</th>
                              <th className="p-3">Data Type</th>
                              <th className="p-3">Engine Mapping</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-200">
                            {detectedColumns.map((col, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                                <td className="p-3 font-bold text-amber-300">{col.tag}</td>
                                <td className="p-3 text-cyan-300">{col.table}</td>
                                <td className="p-3 text-slate-300 font-sans text-xs">{col.column}</td>
                                <td className="p-3 text-purple-300 text-[11px]">{col.type}</td>
                                <td className="p-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    col.badge === 'Calculated' 
                                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                      : col.badge === 'Relational Procedure'
                                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  }`}>
                                    {col.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* API Endpoint & SQL Procedure Code Boxes */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Box 1: Backend API Endpoint */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Backend API Endpoint (Live)
                            </span>
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800">
                              HTTP GET
                            </span>
                          </div>
                          <code className="block p-2.5 bg-slate-900 rounded-lg text-emerald-400 text-xs font-mono break-all">
                            /api/print-templates/render/{aiDocType}/&#123;recordId&#125;{selectedSchoolId !== 'global' ? `?schoolId=${selectedSchoolId}` : ''}
                          </code>
                          <p className="text-[11px] text-slate-400 font-sans">
                            When requested, backend controller merges this template HTML with real entity rows and returns printable HTML without UI pollution.
                          </p>
                        </div>

                        {/* Box 2: Database Stored Procedure / Query Logic */}
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              PostgreSQL Query / Procedure Logic
                            </span>
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">
                              EF Core / SQL
                            </span>
                          </div>
                          <pre className="p-2.5 bg-slate-900 rounded-lg text-amber-200 text-[11px] font-mono overflow-x-auto max-h-32">
{aiDocType === 'ReportCard' ? `-- Fetch Student, Exam Marks & Calculate SGPA/CGPA
SELECT 
  st."StudentId", u."FirstName" || ' ' || u."LastName" AS "StudentName",
  c."Grade", c."Section",
  er."MarksObtained", ex."MaxMarks", sub."Name" AS "Subject"
FROM "Students" st
JOIN "Users" u ON st."UserId" = u."Id"
JOIN "ExamResults" er ON er."StudentId" = st."UserId"
JOIN "Exams" ex ON er."ExamId" = ex."Id"
JOIN "Subjects" sub ON ex."SubjectId" = sub."Id"
WHERE st."UserId" = @recordId;` : aiDocType === 'FeeReceipt' ? `-- Fetch Receipt Particulars & Student Info
SELECT 
  t."ReferenceNumber", t."Amount", t."TransactionDate",
  st."AdmissionNumber", u."FirstName" || ' ' || u."LastName" AS "StudentName"
FROM "Transactions" t
JOIN "Invoices" i ON t."InvoiceId" = i."Id"
JOIN "Students" st ON i."StudentId" = st."Id"
JOIN "Users" u ON st."UserId" = u."Id"
WHERE t."ReferenceNumber" = @recordId;` : `-- Dynamic Entity Procedure for ${aiDocType}
SELECT * FROM "${aiDocType === 'SalarySlip' ? 'SalaryRecords' : 'PrintTemplates'}"
WHERE "Id" = @recordId;`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: DUAL-MODE VISUAL BLOCK & RAW HTML STUDIO */}
        {/* ========================================================================= */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Properties & Visual/Code Settings */}
            <div className="lg:col-span-5 space-y-4">
              {/* Properties Card */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Format Properties</h3>
                  {/* Mode Switcher Toggle */}
                  <div className="bg-slate-100 p-0.5 rounded-xl flex items-center">
                    <button
                      onClick={() => handleToggleStudioMode('visual')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${studioMode === 'visual' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      🎨 Visual
                    </button>
                    <button
                      onClick={() => handleToggleStudioMode('code')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${studioMode === 'code' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      💻 HTML Code
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Format Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Document Type</label>
                    <select
                      value={documentType}
                      onChange={e => {
                        const newDoc = e.target.value;
                        setDocumentType(newDoc);
                        const cols = DEFAULT_COLUMNS_BY_TYPE[newDoc] || DEFAULT_COLUMNS_BY_TYPE.FeeReceipt;
                        setVisualColumns(cols);
                        const details = DEFAULT_DETAILS_FIELDS_BY_TYPE[newDoc] || DEFAULT_DETAILS_FIELDS_BY_TYPE.FeeReceipt;
                        setVisualDetailsFields(details);
                        setRawHtmlCode(compileVisualToHtml(newDoc, paperSize, visualHeaderRules, details, cols, visualFooterRules, detailsGridCols));
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium"
                    >
                      {DOC_TYPES.filter(d => d.value !== 'All').map(d => (
                        <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Paper Size</label>
                    <select
                      value={paperSize}
                      onChange={e => {
                        const newSize = e.target.value;
                        setPaperSize(newSize);
                        setRawHtmlCode(compileVisualToHtml(documentType, newSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, detailsGridCols));
                      }}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium"
                    >
                      {PAPER_SIZES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {savingTemplate ? 'Saving...' : 'Save Configuration'}
                  </button>
                  <button
                    onClick={() => handleTestPrint(studioMode === 'visual' ? compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, detailsGridCols) : rawHtmlCode)}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-black active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Physical Printer Test"
                  >
                    <Printer className="w-3.5 h-3.5" /> Test Print
                  </button>
                </div>
              </div>

              {/* MODE 1: VISUAL DESIGNER CONTROLS */}
              {studioMode === 'visual' && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
                  {/* Header Rules */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Header & Pagination Rule</span>
                      <span className="text-[10px] text-indigo-600 font-bold">No-Code</span>
                    </h4>
                    <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visualHeaderRules.repeatOnEveryPage}
                          onChange={e => {
                            const next = { ...visualHeaderRules, repeatOnEveryPage: e.target.checked };
                            setVisualHeaderRules(next);
                            setRawHtmlCode(compileVisualToHtml(documentType, paperSize, next, visualDetailsFields, visualColumns, visualFooterRules, detailsGridCols));
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-700">Repeat Header on Every Page</span>
                      </label>
                      <p className="text-[10px] text-slate-400 pl-5">
                        {visualHeaderRules.repeatOnEveryPage
                          ? 'Table header will repeat cleanly at the top of every printed page.'
                          : 'School banner will show on First Page Only (Letterhead style).'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Candidate & Document Info Fields (Student / Employee Details Box) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Candidate & Info Fields ({visualDetailsFields.length})
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Particulars box under header (Student/Employee data)
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsGridCols(2);
                              setRawHtmlCode(compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, 2));
                            }}
                            className={`px-1.5 py-0.5 rounded cursor-pointer ${detailsGridCols === 2 ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                            title="2 Columns Layout"
                          >
                            2 Col
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDetailsGridCols(3);
                              setRawHtmlCode(compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, 3));
                            }}
                            className={`px-1.5 py-0.5 rounded cursor-pointer ${detailsGridCols === 3 ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-500'}`}
                            title="3 Columns Layout"
                          >
                            3 Col
                          </button>
                        </div>

                        <button
                          onClick={openAddDetailField}
                          className="text-[11px] px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Add Field
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {visualDetailsFields.length === 0 ? (
                        <div className="p-3 text-center border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-400">
                          No details fields configured. Click "+ Add Field" to add student or staff info.
                        </div>
                      ) : (
                        visualDetailsFields.map((f, idx) => (
                          <div
                            key={f.id || idx}
                            className="p-2 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800 text-[11px] truncate">{f.label}</div>
                              <div className="text-[10px] font-mono text-indigo-600 truncate">{f.tag}</div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => moveDetailField(idx, -1)}
                                disabled={idx === 0}
                                className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move Field Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => moveDetailField(idx, 1)}
                                disabled={idx === visualDetailsFields.length - 1}
                                className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                                title="Move Field Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => openEditDetailField(idx)}
                                className="p-1 rounded bg-white hover:bg-indigo-50 text-indigo-600 cursor-pointer"
                                title="Edit Field Label / Tag"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => removeDetailField(idx)}
                                className="p-1 rounded bg-white hover:bg-red-50 text-red-600 cursor-pointer"
                                title="Remove Field"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Columns Manager with Reorder Up/Down */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Document Columns & Fields ({visualColumns.length})
                      </h4>
                      <button
                        onClick={() => setShowAddColModal(true)}
                        className="text-[11px] px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Column
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {visualColumns.map((col, idx) => (
                        <div
                          key={col.id}
                          className="p-2.5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate">{col.label}</div>
                            <div className="text-[10px] font-mono text-indigo-600 truncate">{col.tag} ({col.width})</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => moveColumn(idx, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move Column Up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveColumn(idx, 1)}
                              disabled={idx === visualColumns.length - 1}
                              className="p-1 rounded bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                              title="Move Column Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeColumn(idx)}
                              className="p-1 rounded bg-white hover:bg-red-100 text-red-600 cursor-pointer"
                              title="Remove Column"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Rules */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Footer & Signatures Rule
                    </h4>
                    <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visualFooterRules.signaturesOnLastPageOnly}
                          onChange={e => {
                            const next = { ...visualFooterRules, signaturesOnLastPageOnly: e.target.checked };
                            setVisualFooterRules(next);
                            setRawHtmlCode(compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, next, detailsGridCols));
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span className="font-semibold text-slate-700">Signatures on Last Page Only</span>
                      </label>
                      <p className="text-[10px] text-slate-400 pl-5">
                        Principal & cashier signature blocks will be reserved for the final page instead of crowding intermediate pages.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: RAW HTML CODE CONTROLS & MERGE TAGS DRAWER */}
              {studioMode === 'code' && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Merge Data Tags (Click to Copy)
                    </h4>
                    <span className="text-[10px] text-slate-400">SQL & API Tags</span>
                  </div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                    {MERGE_TAGS.map(m => (
                      <div
                        key={m.tag}
                        onClick={() => {
                          navigator.clipboard.writeText(m.tag);
                          showFeedback('success', `Copied tag: ${m.tag}`);
                        }}
                        className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-mono font-bold text-indigo-700 text-[11px]">{m.tag}</span>
                        <span className="text-[10px] text-slate-400">{m.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Code Editor / Live Render Output Frame */}
            <div className="lg:col-span-7 space-y-4">
              {studioMode === 'code' && (
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Code className="w-3.5 h-3.5 text-indigo-600" /> HTML & CSS Template Code
                    </span>
                    <span className="text-[10px] text-slate-400">Monospace Editor</span>
                  </div>
                  <textarea
                    rows={12}
                    value={rawHtmlCode}
                    onChange={e => setRawHtmlCode(e.target.value)}
                    className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 rounded-2xl border border-slate-800 focus:outline-none"
                  />
                </div>
              )}

              {/* Live Render Output Preview Frame */}
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-indigo-600" /> Live Render Output
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400">Target: {paperSize}</span>
                    <button
                      onClick={() => handleTestPrint(studioMode === 'visual' ? compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, detailsGridCols) : rawHtmlCode)}
                      className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Printer className="w-3 h-3" /> Test Print
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-100">
                  <iframe
                    title="studio-live-preview"
                    srcDoc={studioMode === 'visual' ? compileVisualToHtml(documentType, paperSize, visualHeaderRules, visualDetailsFields, visualColumns, visualFooterRules, detailsGridCols) : rawHtmlCode}
                    className="w-full bg-white rounded-xl shadow-md border border-slate-300"
                    style={{ height: '480px' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: REAL DATA PRINT SIMULATOR */}
        {/* ========================================================================= */}
        {activeTab === 'simulator' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Real Data Merging Simulator</h2>
              <p className="text-xs text-slate-500">
                Simulate how templates merge with database records before pushing to schools or printing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Type</label>
                <select
                  value={simDocType}
                  onChange={e => {
                    const next = e.target.value;
                    setSimDocType(next);
                    handleRunSimulator(next);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium"
                >
                  {DOC_TYPES.filter(d => d.value !== 'All').map(d => (
                    <option key={d.value} value={d.value}>{d.icon} {d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Record ID / Sample</label>
                <input
                  type="text"
                  value={simRecordId}
                  onChange={e => setSimRecordId(e.target.value)}
                  placeholder="GUID or leave for demo data"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>

              <div>
                <button
                  onClick={() => handleRunSimulator(simDocType)}
                  disabled={simLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  {simLoading ? 'Rendering...' : 'Run Simulation'}
                </button>
              </div>
            </div>

            {simHtml && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Real Data Compiled
                  </span>
                  <button
                    onClick={() => handleTestPrint(simHtml)}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Merged Document
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-100">
                  <iframe
                    title="simulator-output"
                    srcDoc={simHtml}
                    className="w-full bg-white rounded-xl shadow-md border border-slate-300"
                    style={{ height: '480px' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BROADCAST / PUSH TO SCHOOLS HUB */}
        {/* ========================================================================= */}
        {activeTab === 'broadcast' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Master Template Broadcast Hub</h2>
              <p className="text-xs text-slate-500">
                Push standard master formats across all onboarded schools instantly so they do not need to design from scratch.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Master Template to Push</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {templates.filter(t => !t.schoolId && !t.SchoolId).map(t => (
                  <div
                    key={t.id || t.Id}
                    onClick={() => {
                      setTargetPushTemplate(t);
                      setShowPushModal(true);
                    }}
                    className="p-4 border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all bg-slate-50 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{t.templateName || t.TemplateName}</div>
                      <div className="text-[11px] text-slate-500">{t.documentType || t.DocumentType} · {t.paperSize || t.PaperSize}</div>
                    </div>
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-[11px] font-bold shadow-2xs">
                      Push
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD / EDIT DETAIL FIELD MODAL */}
        {/* ========================================================================= */}
        {showAddDetailModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingDetailIndex !== null ? 'Edit Details Field' : 'Add Candidate / Student / Staff Field'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add or modify the information box shown below the document header
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDetailModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  &times;
                </button>
              </div>

              {/* Quick Preset Pills */}
              <div>
                <label className="block font-bold text-slate-700 text-xs mb-1.5">
                  Quick Select Common Fields:
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100">
                  {PRESET_INFO_FIELDS.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setNewDetailLabel(p.label);
                        setNewDetailTag(p.tag);
                      }}
                      className="px-2 py-1 text-[10.5px] font-semibold bg-white hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-slate-700 transition-colors cursor-pointer"
                    >
                      + {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Field Label (Heading)</label>
                  <input
                    type="text"
                    value={newDetailLabel}
                    onChange={e => setNewDetailLabel(e.target.value)}
                    placeholder="e.g. Father's Name, Employee Code, Blood Group"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Merge Tag (SQL / API Placeholder)</label>
                  <input
                    type="text"
                    value={newDetailTag}
                    onChange={e => setNewDetailTag(e.target.value)}
                    placeholder="e.g. {{student.fatherName}}, {{employee.code}}, {{custom.xyz}}"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Leave blank to auto-generate from label
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddDetailModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomDetailField}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  {editingDetailIndex !== null ? 'Update Field' : 'Add to Details'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ADD COLUMN MODAL */}
        {/* ========================================================================= */}
        {showAddColModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900">Add Custom Column / SQL Field</h3>
                <button onClick={() => setShowAddColModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">&times;</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Column Label (Heading)</label>
                  <input
                    type="text"
                    value={newColLabel}
                    onChange={e => setNewColLabel(e.target.value)}
                    placeholder="e.g. Bus Route No, Board Roll, Previous Balance"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">SQL / Data Merge Tag</label>
                  <input
                    type="text"
                    value={newColTag}
                    onChange={e => setNewColTag(e.target.value)}
                    placeholder="e.g. {{custom.bus_route}} or {{student.rollNo}}"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-mono text-[11px]"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Leave blank to auto-generate from column label. Can map directly to Stored Procedure or EF Core fields.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Width</label>
                    <select
                      value={newColWidth}
                      onChange={e => setNewColWidth(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                    >
                      <option value="15%">15% (Compact)</option>
                      <option value="25%">25% (Standard)</option>
                      <option value="40%">40% (Wide)</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Alignment</label>
                    <select
                      value={newColAlign}
                      onChange={e => setNewColAlign(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAddColModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCustomColumn}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer"
                >
                  Add Column
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PUSH TO SCHOOLS MODAL */}
        {/* ========================================================================= */}
        {showPushModal && targetPushTemplate && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Broadcast Master Format</h3>
                  <p className="text-[11px] text-slate-500">Push "{targetPushTemplate.templateName}" to schools</p>
                </div>
                <button onClick={() => setShowPushModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">&times;</button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex gap-2">
                  <button
                    onClick={() => setPushMode('all')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${pushMode === 'all' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    🌐 All ({schools.length}) Schools
                  </button>
                  <button
                    onClick={() => setPushMode('selected')}
                    className={`flex-1 py-2 rounded-xl font-bold border transition-all cursor-pointer ${pushMode === 'selected' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    🏫 Select Schools
                  </button>
                </div>

                {pushMode === 'selected' && (
                  <div className="space-y-2 border border-slate-200 rounded-2xl p-3 max-h-48 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Search school name..."
                      value={schoolPushSearch}
                      onChange={e => setSchoolPushSearch(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 mb-2"
                    />
                    {schools
                      .filter(s => s.name?.toLowerCase().includes(schoolPushSearch.toLowerCase()))
                      .map(s => {
                        const isChecked = selectedPushSchoolIds.includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedPushSchoolIds(selectedPushSchoolIds.filter(id => id !== s.id));
                                } else {
                                  setSelectedPushSchoolIds([...selectedPushSchoolIds, s.id]);
                                }
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span className="font-medium text-slate-800">{s.name}</span>
                          </label>
                        );
                      })}
                  </div>
                )}

                <label className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setAsDefaultOnPush}
                    onChange={e => setSetAsDefaultOnPush(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">Set as default active format in destination schools</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowPushModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecutePush}
                  disabled={pushing}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {pushing ? 'Broadcasting...' : 'Broadcast to Schools'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperPrintGallery;
