import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  UserPlus,
  Search,
  Plus,
  Phone,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  QrCode,
  Copy,
  Printer,
  Sparkles,
  ExternalLink,
  Trash2,
  Bot,
  UserCheck,
  ShieldAlert,
  Send,
  Eye,
  KeyRound
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const statusBadgeClasses = {
  Inquiry: 'badge-warning',
  Pending: 'badge-warning',
  FollowUp: 'badge-info',
  'Under Review': 'badge-info',
  Registered: 'badge-info',
  Approved: 'badge-success',
  Enrolled: 'badge-success',
  Rejected: 'badge-danger',
  Lost: 'badge-danger'
};

const Admissions = () => {
  const [tab, setTab] = useState('All Applications');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [schoolCode, setSchoolCode] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [selectedApp, setSelectedApp] = useState(null);
  const [reviewTab, setReviewTab] = useState('overview'); // 'overview' | 'enroll'
  const [submitting, setSubmitting] = useState(false);

  // Manual Quick Entry Form
  const [form, setForm] = useState({
    childName: '',
    targetClass: 'Class 1',
    parentName: '',
    phone: '',
    address: '',
    notes: 'Direct application submission by administration.'
  });

  // Review & Status Update
  const [updateStatus, setUpdateStatus] = useState('Inquiry');
  const [updateNotes, setUpdateNotes] = useState('');

  // 10-Field Quick Enrollment Form
  const [enrollForm, setEnrollForm] = useState({
    grade: '',
    section: 'Section A',
    rollNumber: '',
    admissionNumber: '',
    feeCategory: 'General',
    busRoute: '',
    hostelRequired: false,
    email: '',
    password: '',
    sendWhatsAppCredentials: true
  });

  const tabs = ['All Applications', 'QR Form Leads', 'Pending Review', 'Registered', 'Enrolled', 'Suspected Bots', 'Rejected'];

  const [studentPasswordPattern, setStudentPasswordPattern] = useState('stu@currentyear!');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const fetchSchoolProfile = async () => {
    try {
      const res = await apiClient.get('/academics/admin/profile');
      if (res.data?.schoolCode) {
        setSchoolCode(res.data.schoolCode);
      }
    } catch (err) {
      console.warn('Could not fetch school code:', err);
    }

    try {
      const rulesRes = await apiClient.get('/academics/settings/password-rules');
      if (rulesRes.data?.studentPasswordPattern) {
        setStudentPasswordPattern(rulesRes.data.studentPasswordPattern);
      }
    } catch (err) {
      console.warn('Could not load password rules in Admissions:', err);
    }
  };

  const generateStudentPassword = (childName, dob) => {
    const yr = new Date().getFullYear().toString();
    const cleanFirst = (childName || 'Student').split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'stu';
    const name3 = cleanFirst.length >= 3 ? cleanFirst.slice(0, 3) : cleanFirst.padEnd(3, 'x');
    const lastNamePart = (childName || '').split(' ').slice(1).join(' ').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const last3 = lastNamePart.length >= 3 ? lastNamePart.slice(0, 3) : 'sch';
    
    let birthYear = '2015';
    if (dob) {
      const match = String(dob).match(/\b(19\d\d|20\d\d)\b/);
      if (match) birthYear = match[0];
    }

    let pat = studentPasswordPattern || 'stu@currentyear!';
    pat = pat.replace(/\{name3\}|\{first3\}/gi, name3);
    pat = pat.replace(/\{name\}|\{firstname\}/gi, cleanFirst);
    pat = pat.replace(/\{lastname3\}|\{last3\}/gi, last3);
    pat = pat.replace(/\{school3\}/gi, 'edu');
    pat = pat.replace(/\{currentyear\}|\{year\}/gi, yr);
    pat = pat.replace(/\{birthyear\}|\{dobyear\}/gi, birthYear);
    pat = pat.replace(/\{stu\}|\{role3\}/gi, name3);
    pat = pat.replace(/(?<=[\W_]|^)currentyear(?=[\W_]|$)/gi, yr);
    pat = pat.replace(/(?<=[\W_]|^)birthyear(?=[\W_]|$)/gi, birthYear);

    if (/^stu(?=[@#!$_\.\d])/i.test(pat)) {
      pat = pat.replace(/^stu/i, name3);
    }

    if (pat.length < 6) {
      pat = `${pat}!${yr}`;
    }
    return pat;
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/receptionist/inquiries');
      setApplications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admissions:', err);
      showToast('Could not load admissions inquiries.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolProfile();
    fetchApplications();
  }, []);

  // When opening review modal for an applicant, pre-populate 10-field enrollment
  const openReviewModal = (app) => {
    setSelectedApp(app);
    setUpdateStatus(app.status);
    setUpdateNotes(app.notes || '');
    setReviewTab('overview');

    const cleanName = (app.childName || 'student').toLowerCase().replace(/[^a-z0-9]/g, '.');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const yr = new Date().getFullYear();
    const dynamicPassword = generateStudentPassword(app.childName, app.dateOfBirth);

    setEnrollForm({
      grade: app.targetClass || 'Class 1',
      section: 'Section A',
      rollNumber: '',
      admissionNumber: `STU-${yr}-${randomNum}`,
      feeCategory: 'General',
      busRoute: '',
      hostelRequired: false,
      email: `${cleanName}${randomNum % 100}@eduvault.edu`,
      password: dynamicPassword,
      sendWhatsAppCredentials: true
    });

    setShowReviewModal(true);
  };

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!form.childName || !form.parentName || !form.phone) {
      showToast('Child name, parent name, and contact phone are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/receptionist/inquiries', form);
      showToast('Admission application registered successfully.');
      setShowCreateModal(false);
      setForm({
        childName: '',
        targetClass: 'Class 1',
        parentName: '',
        phone: '',
        address: '',
        notes: ''
      });
      fetchApplications();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit admission application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSubmitting(true);
    try {
      await apiClient.put(`/receptionist/inquiries/${selectedApp.id}/status`, {
        status: updateStatus,
        notes: updateNotes || selectedApp.notes
      });
      showToast(`Application status updated to ${updateStatus}.`);
      setShowReviewModal(false);
      fetchApplications();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Click Enrollment & WhatsApp Dispatch
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    if (!enrollForm.email || !enrollForm.password) {
      showToast('Login email and password are required to create a student profile.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post(`/receptionist/inquiries/${selectedApp.id}/enroll`, enrollForm);
      showToast(res.data?.message || 'Student enrolled successfully and credentials dispatched!');
      setShowReviewModal(false);
      fetchApplications();
    } catch (err) {
      showToast(err.response?.data?.error || err.response?.data?.message || 'Failed to enroll student.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInquiry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this admission record?')) return;
    try {
      await apiClient.delete(`/receptionist/inquiries/${id}`);
      showToast('Admission entry deleted.');
      fetchApplications();
    } catch (err) {
      showToast('Could not delete inquiry.', 'error');
    }
  };

  const handlePurgeBots = async () => {
    if (!window.confirm('Delete all honeypot-flagged spam bot submissions?')) return;
    try {
      const res = await apiClient.delete('/receptionist/inquiries/flagged-bots');
      showToast(res.data?.message || 'Flagged bot submissions purged.');
      fetchApplications();
    } catch (err) {
      showToast('Failed to purge bot submissions.', 'error');
    }
  };

  const sanitizeCsvCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  };

  const exportCSV = () => {
    if (applications.length === 0) {
      showToast('No admission records to export.', 'error');
      return;
    }

    const headers = [
      'App ID,Child Name,Target Class,Parent Name,Phone,Address,Source,Aadhaar,Status,Date'
    ];
    const rows = applications.map(a =>
      `"${sanitizeCsvCell(a.applicationId || a.id)}","${sanitizeCsvCell(a.childName)}","${sanitizeCsvCell(a.targetClass)}","${sanitizeCsvCell(a.parentName)}","${sanitizeCsvCell(a.phone)}","${sanitizeCsvCell(a.address || '')}","${sanitizeCsvCell(a.source || 'manual')}","${sanitizeCsvCell(a.aadhaarLastFour ? `XXXX-XXXX-${a.aadhaarLastFour}` : 'N/A')}","${sanitizeCsvCell(a.status)}","${new Date(a.createdAt).toLocaleDateString()}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admissions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Admissions exported to CSV.');
  };

  const copyQrLink = () => {
    const url = `${window.location.origin}/apply/${schoolCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // KPIs
  const totalApps = applications.length;
  const qrAppsCount = applications.filter(a => a.source === 'qr_form').length;
  const pendingCount = applications.filter(a => a.status === 'Inquiry' || a.status === 'FollowUp' || a.status === 'Pending').length;
  const enrolledCount = applications.filter(a => a.status === 'Enrolled' || a.status === 'Registered' || a.status === 'Approved').length;
  const botCount = applications.filter(a => a.isHoneypotFlagged).length;

  // Filtered List
  const filtered = applications.filter(a => {
    const matchesSearch =
      !searchQuery ||
      (a.childName && a.childName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.parentName && a.parentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.phone && a.phone.includes(searchQuery)) ||
      (a.targetClass && a.targetClass.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.applicationId && a.applicationId.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (tab === 'All Applications') return true;
    if (tab === 'QR Form Leads') return a.source === 'qr_form';
    if (tab === 'Pending Review') return a.status === 'Inquiry' || a.status === 'FollowUp' || a.status === 'Pending';
    if (tab === 'Registered') return a.status === 'Registered' || a.status === 'Approved';
    if (tab === 'Enrolled') return a.status === 'Enrolled';
    if (tab === 'Suspected Bots') return a.isHoneypotFlagged;
    if (tab === 'Rejected') return a.status === 'Lost' || a.status === 'Rejected';
    return true;
  });

  const publicApplyUrl = `${window.location.origin}/apply/${schoolCode || 'DEMO'}`;
  const qrCodeImageUrl = `${API_BASE}/api/public/admission/qr-code/${schoolCode || 'DEMO'}`;

  return (
    <div>
      <Topbar
        title="Application Overview"
        subtitle="Admission Management, QR Self-Registration & Student Intake"
        actions={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition"
            >
              <QrCode className="w-3.5 h-3.5" /> Get QR Code
            </button>

            <button onClick={exportCSV} className="btn-outline text-xs flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>

            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Manual Entry
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            toastType === 'error'
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}
        >
          {toastType === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toastMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Total Inquiries</div>
          <div className="font-display text-2xl font-bold text-blue-600">{totalApps}</div>
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <span className="text-purple-600 font-semibold">{qrAppsCount} via QR</span> • {totalApps - qrAppsCount} direct
          </div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Pending Reviews</div>
          <div className="font-display text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <div className="text-xs text-gray-400">Needs admin verification</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Enrolled Students</div>
          <div className="font-display text-2xl font-bold text-green-600">{enrolledCount}</div>
          <div className="text-xs text-gray-400">Converted & assigned classes</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Suspected Bots</div>
          <div className="font-display text-2xl font-bold text-red-600 flex items-center justify-between">
            <span>{botCount}</span>
            {botCount > 0 && (
              <button
                onClick={handlePurgeBots}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-bold"
              >
                Purge All
              </button>
            )}
          </div>
          <div className="text-xs text-gray-400">Trapped by honeypot</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by student name, parent phone, application ID, or class..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-9 text-xs"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                tab === t ? 'text-primary border-b-2 border-primary font-bold' : 'text-gray-500 hover:text-primary'
              }`}
            >
              {t}
              {t === 'Suspected Bots' && botCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700 font-bold">
                  {botCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
            <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-700 text-sm">No applications found</h4>
            <p className="text-xs text-gray-400 mb-4">No matching records under this category.</p>
            <div className="flex justify-center gap-2">
              <button onClick={() => setShowQrModal(true)} className="btn-outline text-xs">
                🔲 Show QR Standee
              </button>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary text-xs">
                + Create Entry
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase font-semibold">
                  <th className="table-th">Candidate & Parent</th>
                  <th className="table-th">Applied Grade</th>
                  <th className="table-th">Source</th>
                  <th className="table-th">Contact & Aadhaar</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {(a.childName || 'S')[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-primary text-sm flex items-center gap-1.5">
                            <span>{a.childName}</span>
                            {a.applicationId && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {a.applicationId}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">Parent: {a.parentName}</div>
                        </div>
                      </div>
                    </td>

                    <td className="table-td text-sm font-semibold text-gray-700">{a.targetClass}</td>

                    <td className="table-td">
                      {a.isHoneypotFlagged ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1 w-fit">
                          <Bot className="w-3 h-3" /> Bot
                        </span>
                      ) : a.source === 'qr_form' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1 w-fit">
                          <QrCode className="w-3 h-3" /> QR Form
                        </span>
                      ) : a.source === 'csv_import' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-100 text-cyan-700 border border-cyan-200 w-fit">
                          📥 CSV Import
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200 w-fit">
                          ✏️ Manual
                        </span>
                      )}
                    </td>

                    <td className="table-td text-xs text-gray-600">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{a.phone}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {a.aadhaarLastFour ? `Aadhaar: •••• ${a.aadhaarLastFour}` : 'Aadhaar: Not provided'}
                      </div>
                    </td>

                    <td className="table-td text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="table-td">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses[a.status] || 'badge-info'}`}>
                        {a.status}
                      </span>
                    </td>

                    <td className="table-td text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openReviewModal(a)}
                          className="text-xs text-primary font-bold hover:underline bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Review / Enroll
                        </button>
                        <button
                          onClick={() => handleDeleteInquiry(a.id)}
                          title="Delete entry"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
          <div>
            Showing {filtered.length} of {applications.length} applications
          </div>
        </div>
      </div>

      {/* ── QR CODE BANNER / MODAL ── */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">Student Self-Registration QR</h3>
              </div>
              <button onClick={() => setShowQrModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-3 mb-4">
              Is QR Code ko print karke school reception ya notice board par lagayein. Parent scan karke pura admission form khud bharenge.
            </p>

            {/* QR Image Container */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl inline-block mb-4 shadow-inner">
              <img
                src={qrCodeImageUrl}
                alt="Admission QR Code"
                className="w-52 h-52 object-contain mx-auto rounded-lg shadow-sm"
                onError={e => {
                  e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(publicApplyUrl)}`;
                }}
              />
              <div className="text-[11px] font-mono font-bold text-slate-700 mt-2">
                School Code: {schoolCode || 'AUTO'}
              </div>
            </div>

            {/* Link Copy Box */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs mb-5">
              <input
                type="text"
                readOnly
                value={publicApplyUrl}
                className="bg-transparent flex-1 text-gray-700 font-mono text-[11px] focus:outline-none truncate"
              />
              <button
                onClick={copyQrLink}
                className="px-2.5 py-1 rounded-lg bg-primary text-white font-semibold text-[11px] flex items-center gap-1 hover:bg-primary/90 transition"
              >
                <Copy className="w-3 h-3" /> {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="flex gap-2">
              <a
                href={qrCodeImageUrl}
                download={`admission-qr-${schoolCode}.png`}
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Download PNG
              </a>
              <a
                href={publicApplyUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Form
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE MANUAL LEAD MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-display font-bold text-primary text-lg">New Admission Lead / Walk-in</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Student / Child Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.childName}
                  onChange={e => setForm({ ...form, childName: e.target.value })}
                  className="input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Target Class *</label>
                  <input
                    type="text"
                    placeholder="e.g. Class 1"
                    value={form.targetClass}
                    onChange={e => setForm({ ...form, targetClass: e.target.value })}
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={form.parentName}
                    onChange={e => setForm({ ...form, parentName: e.target.value })}
                    className="input text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Address (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 42 Gandhi Nagar, Delhi"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs py-2 px-5">
                  {submitting ? 'Saving...' : 'Register Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ENHANCED REVIEW & QUICK ENROLL MODAL ── */}
      {showReviewModal && selectedApp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-gray-900 text-lg">{selectedApp.childName}</h3>
                  {selectedApp.applicationId && (
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                      {selectedApp.applicationId}
                    </span>
                  )}
                  {selectedApp.source === 'qr_form' && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                      Self-Registered via QR
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Target Grade: <strong className="text-gray-700">{selectedApp.targetClass}</strong> • Phone:{' '}
                  <strong className="text-gray-700">{selectedApp.phone}</strong>
                </p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex gap-2 my-4 border-b border-gray-100 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setReviewTab('overview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  reviewTab === 'overview' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📄 Applicant Full Details
              </button>
              <button
                type="button"
                onClick={() => setReviewTab('enroll')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  reviewTab === 'enroll'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> ⚡ 10-Field Quick Enroll
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {reviewTab === 'overview' ? (
                <div className="space-y-4 text-xs">
                  {/* Category 1: Student Demographics */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-blue-600" /> Student Profile & Identification
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-gray-600">
                      <div>
                        <span className="text-gray-400">DOB:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.dateOfBirth || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Gender:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.gender || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Category:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.category || 'General'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Blood Group:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.bloodGroup || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Religion:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.religion || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Aadhaar:</span>{' '}
                        <strong className="text-gray-800 font-mono">
                          {selectedApp.aadhaarLastFour ? `•••• ${selectedApp.aadhaarLastFour}` : 'Not provided'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Category 2: Parents */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="font-bold text-slate-800">👨‍👩‍👧 Parents & Family Info</div>
                    <div className="grid grid-cols-2 gap-2 text-gray-600">
                      <div>
                        <span className="text-gray-400">Father:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.fatherName || selectedApp.parentName}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Father WhatsApp:</span>{' '}
                        <strong className="text-emerald-700">{selectedApp.fatherPhone || selectedApp.phone}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Occupation:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.fatherOccupation || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Mother Name:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.motherName || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Annual Income:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.annualFamilyIncome || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Guardian Email:</span>{' '}
                        <strong className="text-gray-800">{selectedApp.guardianEmail || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Category 3: Address */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-800">🏠 Residential Address</div>
                    <p className="text-gray-700 leading-relaxed">
                      {selectedApp.address ||
                        `${selectedApp.houseNo || ''} ${selectedApp.streetOrVillage || ''}, ${selectedApp.city || ''}, ${selectedApp.state || ''} - ${selectedApp.pincode || ''}`}
                    </p>
                  </div>

                  {/* Category 4: Past School & Medical */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800">🏫 Previous School</div>
                      <div className="text-gray-700">
                        {selectedApp.previousSchoolName ? (
                          <>
                            <div>{selectedApp.previousSchoolName}</div>
                            <div className="text-[11px] text-gray-500">
                              Board: {selectedApp.previousBoard || 'N/A'} • TC: {selectedApp.previousTcNumber || 'N/A'}
                            </div>
                          </>
                        ) : (
                          <div className="text-gray-400">No previous school record</div>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-800">🏥 Emergency Contact</div>
                      <div className="text-gray-700">
                        <div>
                          {selectedApp.emergencyContactName || selectedApp.parentName} (
                          {selectedApp.emergencyContactRelation || 'Parent'})
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Phone: {selectedApp.emergencyContactPhone || selectedApp.phone}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Regular Status Update */}
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="font-bold text-gray-700 text-xs">Update Status / Remarks</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Status</label>
                        <select
                          value={updateStatus}
                          onChange={e => setUpdateStatus(e.target.value)}
                          className="input text-xs font-semibold"
                        >
                          <option value="Inquiry">Inquiry (Open)</option>
                          <option value="FollowUp">Follow-up Scheduled</option>
                          <option value="Registered">Registered (Docs Submitted)</option>
                          <option value="Enrolled">Enrolled</option>
                          <option value="Lost">Lost / Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Remarks</label>
                        <input
                          type="text"
                          value={updateNotes}
                          onChange={e => setUpdateNotes(e.target.value)}
                          placeholder="Outcome notes..."
                          className="input text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleUpdateStatus}
                        disabled={submitting}
                        className="btn-primary text-xs py-1.5 px-4"
                      >
                        Save Remarks
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── 10-FIELD QUICK ENROLLMENT TAB ── */
                <form onSubmit={handleEnrollStudent} className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div className="font-bold flex items-center gap-1.5 text-xs mb-1">
                      <Sparkles className="w-4 h-4 text-emerald-600" /> Admin Fast-Enrollment (Max 10 Fields)
                    </div>
                    <p className="text-[11px] text-emerald-700">
                      Bacha enroll hote hi uska student account ban jayega aur parent ke WhatsApp number par login ID aur password turant chala jayega.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">1. Class Confirm *</label>
                      <input
                        type="text"
                        value={enrollForm.grade}
                        onChange={e => setEnrollForm({ ...enrollForm, grade: e.target.value })}
                        className="input text-xs font-semibold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">2. Section *</label>
                      <select
                        value={enrollForm.section}
                        onChange={e => setEnrollForm({ ...enrollForm, section: e.target.value })}
                        className="input text-xs font-semibold"
                      >
                        <option value="Section A">Section A</option>
                        <option value="Section B">Section B</option>
                        <option value="Section C">Section C</option>
                        <option value="Section D">Section D</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">3. Roll Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 24"
                        value={enrollForm.rollNumber}
                        onChange={e => setEnrollForm({ ...enrollForm, rollNumber: e.target.value })}
                        className="input text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">4. Admission / Student ID *</label>
                      <input
                        type="text"
                        value={enrollForm.admissionNumber}
                        onChange={e => setEnrollForm({ ...enrollForm, admissionNumber: e.target.value })}
                        className="input text-xs font-mono font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">5. Fee Category</label>
                      <select
                        value={enrollForm.feeCategory}
                        onChange={e => setEnrollForm({ ...enrollForm, feeCategory: e.target.value })}
                        className="input text-xs"
                      >
                        <option value="General">General / Standard</option>
                        <option value="RTE">RTE (Right to Education)</option>
                        <option value="Staff Child">Staff Child</option>
                        <option value="Sibling Concession">Sibling Concession</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">6. Bus Route (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. Route 4 / Not Required"
                        value={enrollForm.busRoute}
                        onChange={e => setEnrollForm({ ...enrollForm, busRoute: e.target.value })}
                        className="input text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">7. Student Login Email *</label>
                      <input
                        type="email"
                        value={enrollForm.email}
                        onChange={e => setEnrollForm({ ...enrollForm, email: e.target.value })}
                        className="input text-xs font-mono"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-700">8. Temporary Password *</label>
                        <button
                          type="button"
                          onClick={() => {
                            const yr = new Date().getFullYear();
                            const r = Math.floor(100 + Math.random() * 900);
                            setEnrollForm({ ...enrollForm, password: `Edu@${yr}${r}!` });
                          }}
                          className="text-[10px] text-blue-600 font-bold hover:underline"
                        >
                          Auto-generate
                        </button>
                      </div>
                      <input
                        type="text"
                        value={enrollForm.password}
                        onChange={e => setEnrollForm({ ...enrollForm, password: e.target.value })}
                        className="input text-xs font-mono font-bold text-indigo-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={enrollForm.sendWhatsAppCredentials}
                        onChange={e => setEnrollForm({ ...enrollForm, sendWhatsAppCredentials: e.target.checked })}
                        className="w-4 h-4 rounded text-emerald-600"
                      />
                      <span className="font-semibold text-gray-800 text-xs flex items-center gap-1">
                        <Send className="w-3 h-3 text-emerald-600" /> Send credentials via WhatsApp to{' '}
                        <strong className="text-emerald-700">{selectedApp.phone}</strong>
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setReviewTab('overview')}
                      className="btn-outline text-xs py-2 px-4"
                    >
                      Back to Overview
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="py-2.5 px-6 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
                    >
                      {submitting ? 'Enrolling...' : 'Confirm Enrollment & Send WhatsApp'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admissions;
