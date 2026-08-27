import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  Search,
  User,
  Clock,
  MapPin,
  BookOpen,
  DollarSign,
  Phone,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Printer,
  MessageSquare,
  FileText,
  UserCheck,
  ArrowRight,
  Sparkles,
  Building,
  UserPlus,
  Send,
  Calendar,
  X,
  CreditCard,
  Check
} from 'lucide-react';

const FrontDeskDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('visitors'); // 'visitors' | 'gatepass' | 'inquiries' | 'fees'

  useEffect(() => {
    if (location.pathname.includes('/visitors')) {
      setActiveTab('visitors');
    } else if (location.pathname.includes('/gatepass')) {
      setActiveTab('gatepass');
    } else if (location.pathname.includes('/inquiries')) {
      setActiveTab('inquiries');
    } else if (location.pathname.includes('/fees')) {
      setActiveTab('visitors');
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [location.pathname]);

  // Stats
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    todayPresent: 0,
    todayVisitors: 0,
    activeVisitors: 0,
    todayGatePasses: 0,
    totalInquiries: 0,
    currentTime: '',
    currentDate: ''
  });

  // Visitors & GatePass & Inquiries Data
  const [visitors, setVisitors] = useState([]);
  const [gatePasses, setGatePasses] = useState([]);
  const [inquiries, setInquiries] = useState([]);

  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState(null);
  const [collectingPayment, setCollectingPayment] = useState(false);

  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    phone: '',
    purpose: 'Fee Submission / Inquiry',
    studentName: '',
    classSection: '',
    whomToMeet: 'Front Desk Officer'
  });

  const [showGatePassModal, setShowGatePassModal] = useState(false);
  const [gatePassForm, setGatePassForm] = useState({
    parentName: '',
    parentPhone: '',
    reason: 'Family Emergency / Doctor Appointment'
  });
  const [issuedGatePassResult, setIssuedGatePassResult] = useState(null);

  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    childName: '',
    targetClass: 'Class 1',
    parentName: '',
    phone: '',
    address: '',
    notes: 'Walk-in parent inquiry for upcoming academic session'
  });

  // TC / No-Dues Check for Receptionist Desk
  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [clearanceData, setClearanceData] = useState(null);
  const [loadingClearance, setLoadingClearance] = useState(false);

  const handleCheckClearance = async (studentId) => {
    setShowClearanceModal(true);
    setLoadingClearance(true);
    setClearanceData(null);
    try {
      const res = await apiClient.get(`/academics/students/${studentId}/clearance-check`);
      setClearanceData(res.data);
    } catch (err) {
      console.error('Failed to load clearance check:', err);
      showToast('Could not fetch student clearance data.');
    } finally {
      setLoadingClearance(false);
    }
  };

  const [toastMessage, setToastMessage] = useState('');
  const searchInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/receptionist/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load front desk stats:', err);
    }
  };

  const fetchVisitors = async () => {
    try {
      const res = await apiClient.get('/receptionist/visitors');
      setVisitors(res.data || []);
    } catch (err) {
      console.error('Failed to load visitors:', err);
    }
  };

  const fetchGatePasses = async () => {
    try {
      const res = await apiClient.get('/receptionist/gate-passes');
      setGatePasses(res.data || []);
    } catch (err) {
      console.error('Failed to load gate passes:', err);
    }
  };

  const fetchInquiries = async () => {
    try {
      const res = await apiClient.get('/receptionist/inquiries');
      setInquiries(res.data || []);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchVisitors();
    fetchGatePasses();
    fetchInquiries();

    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get(`/receptionist/search-student?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectStudent = async (student) => {
    setSelectedStudent(student);
    setLoadingDetails(true);
    setSearchResults([]);
    try {
      const [liveRes, feeRes] = await Promise.all([
        apiClient.get(`/receptionist/student-live-status/${student.id}`),
        apiClient.get(`/receptionist/student-fee-summary/${student.id}`)
      ]);
      setLiveStatus(liveRes.data.liveStatus);
      setFeeSummary(feeRes.data);
    } catch (err) {
      console.error('Failed to load student live status:', err);
      showToast('Could not load live student status details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCollectFee = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !selectedStudent) return;
    setCollectingPayment(true);
    try {
      const res = await apiClient.post('/receptionist/collect-fee', {
        studentId: selectedStudent.id,
        invoiceId: selectedInvoice.id,
        amount: selectedInvoice.amount,
        paymentMethod
      });
      setPaymentSuccessReceipt(res.data);
      showToast(`Payment of ₹${selectedInvoice.amount} collected successfully!`);
      // Refresh fee summary
      const feeRes = await apiClient.get(`/receptionist/student-fee-summary/${selectedStudent.id}`);
      setFeeSummary(feeRes.data);
      fetchStats();
    } catch (err) {
      console.error('Payment collection error:', err);
      showToast(err.response?.data?.error || 'Failed to collect payment.');
    } finally {
      setCollectingPayment(false);
    }
  };

  const handleAddVisitor = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/receptionist/visitors', visitorForm);
      showToast('Visitor check-in logged successfully!');
      setShowVisitorModal(false);
      setVisitorForm({
        visitorName: '',
        phone: '',
        purpose: 'Fee Submission / Inquiry',
        studentName: '',
        classSection: '',
        whomToMeet: 'Front Desk Officer'
      });
      fetchVisitors();
      fetchStats();
    } catch (err) {
      console.error('Visitor error:', err);
      showToast('Failed to log visitor.');
    }
  };

  const handleCheckoutVisitor = async (id) => {
    try {
      await apiClient.post(`/receptionist/visitors/${id}/checkout`);
      showToast('Visitor marked as Checked Out.');
      fetchVisitors();
      fetchStats();
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const handleIssueGatePass = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please select a student first from the search bar above.');
      return;
    }
    try {
      const res = await apiClient.post('/receptionist/gate-pass', {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        classSection: selectedStudent.className,
        parentName: gatePassForm.parentName || selectedStudent.guardianName,
        parentPhone: gatePassForm.parentPhone || selectedStudent.guardianPhone,
        reason: gatePassForm.reason
      });
      setIssuedGatePassResult(res.data.gatePass);
      showToast(`Gate Pass #${res.data.gatePass.passNumber} issued!`);
      fetchGatePasses();
      fetchStats();
    } catch (err) {
      console.error('Gate pass error:', err);
      showToast('Failed to issue gate pass.');
    }
  };

  const handleAddInquiry = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/receptionist/inquiries', inquiryForm);
      showToast('Admission inquiry recorded successfully!');
      setShowInquiryModal(false);
      setInquiryForm({
        childName: '',
        targetClass: 'Class 1',
        parentName: '',
        phone: '',
        address: '',
        notes: 'Walk-in parent inquiry for upcoming academic session'
      });
      fetchInquiries();
      fetchStats();
    } catch (err) {
      console.error('Inquiry error:', err);
      showToast('Failed to save inquiry.');
    }
  };

  const sendWhatsAppReceipt = (mobile, studentName, amount, refNo) => {
    const cleanPhone = (mobile || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hello! Payment of ₹${amount} for ${studentName} has been received at the School Front Desk.\nReceipt No: ${refNo}\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Topbar with Live School Clock */}
      <Topbar
        title="Front Desk & Reception"
        subtitle="Universal Student 360, Spot Fee Desk, Live Classroom Locator & Visitor Log"
        actions={
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 shadow-sm">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{stats.currentTime || 'Live Clock'}</span>
            </div>
            <button
              onClick={() => setShowVisitorModal(true)}
              className="btn-primary flex items-center gap-2 text-xs shadow-md"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>+ New Visitor</span>
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card flex items-center gap-3.5 p-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.todayPresent} / {stats.totalStudents}</div>
            <div className="text-[11px] text-gray-500 font-medium">Students Present Today</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-3.5 p-4">
          <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.todayVisitors} ({stats.activeVisitors} Active)</div>
            <div className="text-[11px] text-gray-500 font-medium">Walk-in Visitors</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-3.5 p-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.todayGatePasses}</div>
            <div className="text-[11px] text-gray-500 font-medium">Early Gate Passes</div>
          </div>
        </div>

        <div className="stat-card flex items-center gap-3.5 p-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{stats.totalInquiries}</div>
            <div className="text-[11px] text-gray-500 font-medium">Admission Inquiries</div>
          </div>
        </div>
      </div>

      {/* Universal Search Header Card */}
      <div className="card border-2 border-primary/20 shadow-md relative">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-primary absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search student by Name, Guardian Mobile, Roll No, or Class (Press Ctrl+K)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-12 pr-12 py-3.5 text-base w-full font-medium bg-gray-50/50 border-gray-200 focus:bg-white transition-all rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="text-xs text-gray-400 font-medium hidden md:block shrink-0 px-2">
            Instant parent counter look-up
          </div>
        </div>

        {/* Dropdown Live Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-40 max-h-96 overflow-y-auto divide-y divide-gray-50 animate-scale-up">
            {searchResults.map((st) => (
              <div
                key={st.id}
                onClick={() => selectStudent(st)}
                className="p-3.5 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {st.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <span>{st.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">{st.className}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                      <span>Roll ID: <strong className="font-mono text-gray-700">{st.studentId}</strong></span>
                      <span>Guardian: <strong className="text-gray-700">{st.guardianName}</strong> ({st.guardianPhone})</span>
                    </div>
                  </div>
                </div>
                <div className="text-primary font-semibold text-xs flex items-center gap-1">
                  <span>View 360</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Desks Shortcut Cards (Always accessible) */}
      {!selectedStudent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => navigate('/receptionist/visitors')} 
            className="stat-card hover:border-violet-300 hover:shadow-md cursor-pointer transition-all p-5 flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              👥
            </div>
            <div>
              <div className="font-display font-bold text-sm text-primary group-hover:text-violet-700 transition-colors">Visitor Register</div>
              <p className="text-xs text-gray-400 mt-1">Log walk-in guests, issue visitor badges & checkout</p>
            </div>
          </div>

          <div 
            onClick={() => navigate('/receptionist/fees')} 
            className="stat-card hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all p-5 flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              💳
            </div>
            <div>
              <div className="font-display font-bold text-sm text-primary group-hover:text-emerald-700 transition-colors">Counter Fee Desk</div>
              <p className="text-xs text-gray-400 mt-1">Spot student fee collection, UPI & WhatsApp receipts</p>
            </div>
          </div>

          <div 
            onClick={() => navigate('/receptionist/gatepass')} 
            className="stat-card hover:border-amber-300 hover:shadow-md cursor-pointer transition-all p-5 flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              🎫
            </div>
            <div>
              <div className="font-display font-bold text-sm text-primary group-hover:text-amber-700 transition-colors">Gate Pass Desk</div>
              <p className="text-xs text-gray-400 mt-1">Authorized early departure slips for guardians</p>
            </div>
          </div>

          <div 
            onClick={() => navigate('/receptionist/inquiries')} 
            className="stat-card hover:border-blue-300 hover:shadow-md cursor-pointer transition-all p-5 flex items-start gap-4 group"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0 group-hover:scale-110 transition-transform">
              📋
            </div>
            <div>
              <div className="font-display font-bold text-sm text-primary group-hover:text-blue-700 transition-colors">Admission Leads</div>
              <p className="text-xs text-gray-400 mt-1">Record prospect student inquiries & follow-ups</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Action Split: Student 360 & Fee Counter */}
      {selectedStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* Left Column: Live Period & Location Card (5 cols) */}
          <div className="lg:col-span-6 card space-y-5 bg-gradient-to-br from-white to-blue-50/30 border border-blue-100/80 shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-primary text-white font-bold text-xl flex items-center justify-center shadow-md">
                  {selectedStudent.name[0]}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display font-bold text-lg text-gray-900 truncate">{selectedStudent.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-xs">{selectedStudent.className}</span>
                    <span className="text-xs text-gray-400 font-mono">{selectedStudent.studentId}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedStudent(null); setLiveStatus(null); setFeeSummary(null); }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingDetails ? (
              <div className="py-8 flex justify-center"><Loader small /></div>
            ) : liveStatus ? (
              <div className="space-y-4">
                {/* Live Attendance Banner */}
                <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  liveStatus.todayAttendance === 'Present' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' :
                  liveStatus.todayAttendance === 'Absent' ? 'bg-rose-50/80 border-rose-200 text-rose-900' :
                  'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      liveStatus.todayAttendance === 'Present' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`} />
                    <span className="font-semibold text-xs uppercase tracking-wide">Today's Attendance:</span>
                    <strong className="text-sm font-bold">{liveStatus.todayAttendance}</strong>
                  </div>
                  <span className="text-[11px] font-medium opacity-80">{stats.currentDate}</span>
                </div>

                {/* Live Period & Teacher Box */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>Current Active Period</span>
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {liveStatus.periodTiming}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Subject In Progress</div>
                      <div className="font-bold text-gray-900 text-sm mt-0.5 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-primary" />
                        <span>{liveStatus.currentSubject}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-gray-400 font-semibold uppercase">Classroom / Location</div>
                      <div className="font-bold text-gray-900 text-sm mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-500" />
                        <span>{liveStatus.roomNumber}</span>
                      </div>
                    </div>

                    <div className="col-span-2 bg-gray-50/80 p-2.5 rounded-lg flex items-center justify-between text-xs">
                      <span className="text-gray-600">Teacher: <strong className="text-gray-900">{liveStatus.currentTeacher}</strong></span>
                      {liveStatus.remainingMinutes > 0 && (
                        <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                          {liveStatus.remainingMinutes} min left
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Guardian Quick Contact */}
                <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[11px] text-gray-400 font-semibold">Guardian Info</div>
                    <div className="font-semibold text-gray-800 mt-0.5">
                      {selectedStudent.guardianName} ({selectedStudent.guardianRelationship})
                    </div>
                    <div className="text-gray-500 font-mono">{selectedStudent.guardianPhone}</div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={`tel:${selectedStudent.guardianPhone}`}
                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                      title="Call Parent"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleCheckClearance(selectedStudent.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Check No-Dues / TC Readiness for Walk-in Parent"
                    >
                      <span>📜 No-Dues / TC Status</span>
                    </button>
                    <button
                      onClick={() => {
                        setGatePassForm({
                          parentName: selectedStudent.guardianName,
                          parentPhone: selectedStudent.guardianPhone,
                          reason: 'Early parent pick-up'
                        });
                        setShowGatePassModal(true);
                      }}
                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Issue Gate Pass</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right Column: Instant Fee Counter Card (7 cols) */}
          <div className="lg:col-span-6 card space-y-4 border border-emerald-100/80 shadow-md">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-display font-bold text-base text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <span>Instant Fee Counter & Balance</span>
              </h3>
              <span className="text-xs font-semibold text-gray-400">Walk-in Collection</span>
            </div>

            {loadingDetails ? (
              <div className="py-8 flex justify-center"><Loader small /></div>
            ) : feeSummary ? (
              <div className="space-y-4">
                {/* 3 Metrics Box */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <div className="text-[11px] text-gray-500 font-semibold">Total Fees</div>
                    <div className="text-base font-bold text-gray-900 mt-0.5 font-mono">₹{Number(feeSummary.totalFees || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-center">
                    <div className="text-[11px] text-emerald-700 font-semibold">Paid</div>
                    <div className="text-base font-bold text-emerald-700 mt-0.5 font-mono">₹{Number(feeSummary.totalPaid || 0).toLocaleString()}</div>
                  </div>
                  <div className={`p-3 rounded-xl border text-center ${feeSummary.totalDue > 0 ? 'bg-rose-50/70 border-rose-200 text-rose-700' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                    <div className="text-[11px] font-semibold">Outstanding Due</div>
                    <div className="text-base font-bold mt-0.5 font-mono">₹{Number(feeSummary.totalDue || 0).toLocaleString()}</div>
                  </div>
                </div>

                {/* Invoices List */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Fee Invoices & Dues</div>
                  {(feeSummary.invoices || []).length === 0 ? (
                    <div className="text-xs text-gray-400 py-3 text-center">No fee invoices recorded for this student.</div>
                  ) : (
                    (feeSummary.invoices || []).map((inv) => (
                      <div
                        key={inv.id}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                          inv.status === 'Paid'
                            ? 'bg-gray-50/50 border-gray-100 text-gray-600'
                            : 'bg-white border-amber-200 shadow-sm'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-gray-900">{inv.title}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">Due Date: {inv.dueDate}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900 font-mono text-sm">₹{inv.amount}</span>
                          {inv.status === 'Paid' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">PAID</span>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setPaymentSuccessReceipt(null);
                                setShowPaymentModal(true);
                              }}
                              className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1 shadow-sm"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Collect</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Bottom Multi-Tab Operation Center */}
      <div className="card space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('visitors'); navigate('/receptionist/visitors'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'visitors' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Walk-in Visitor Log ({visitors.length})
            </button>
            <button
              onClick={() => { setActiveTab('gatepass'); navigate('/receptionist/gatepass'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'gatepass' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Early Gate Passes ({gatePasses.length})
            </button>
            <button
              onClick={() => { setActiveTab('inquiries'); navigate('/receptionist/inquiries'); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'inquiries' ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Admission Inquiries ({inquiries.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'visitors' && (
              <button onClick={() => setShowVisitorModal(true)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5" />
                <span>+ Log Visitor</span>
              </button>
            )}
            {activeTab === 'inquiries' && (
              <button onClick={() => setShowInquiryModal(true)} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New Inquiry</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Visitors Log Table */}
        {activeTab === 'visitors' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Visitor Name</th>
                  <th className="pb-3">Contact</th>
                  <th className="pb-3">Purpose</th>
                  <th className="pb-3">Meeting With</th>
                  <th className="pb-3">Check-in Time</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {visitors.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400">No visitors logged today.</td>
                  </tr>
                ) : (
                  visitors.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-semibold text-gray-900">{v.visitorName}</td>
                      <td className="py-3 font-mono text-gray-600">{v.phone}</td>
                      <td className="py-3 text-gray-700">{v.purpose}</td>
                      <td className="py-3 text-gray-600">{v.whomToMeet}</td>
                      <td className="py-3 text-gray-500">{new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${v.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="py-3">
                        {v.status === 'Active' && (
                          <button
                            onClick={() => handleCheckoutVisitor(v.id)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                          >
                            Check-out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Gate Passes Table */}
        {activeTab === 'gatepass' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Pass #</th>
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3">Class</th>
                  <th className="pb-3">Parent / Guardian</th>
                  <th className="pb-3">Reason</th>
                  <th className="pb-3">Time Issued</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {gatePasses.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400">No early gate passes issued today.</td>
                  </tr>
                ) : (
                  gatePasses.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-mono font-bold text-primary">{g.passNumber}</td>
                      <td className="py-3 font-semibold text-gray-900">{g.studentName}</td>
                      <td className="py-3 text-gray-600">{g.classSection}</td>
                      <td className="py-3 text-gray-700">{g.parentName} ({g.parentPhone})</td>
                      <td className="py-3 text-gray-600">{g.reason}</td>
                      <td className="py-3 text-gray-500">{new Date(g.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700">
                          {g.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Admission Inquiries Table */}
        {activeTab === 'inquiries' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">Child Name</th>
                  <th className="pb-3">Target Class</th>
                  <th className="pb-3">Parent Name</th>
                  <th className="pb-3">Phone</th>
                  <th className="pb-3">Notes</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {inquiries.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-400">No admission inquiries logged.</td>
                  </tr>
                ) : (
                  inquiries.map((inq) => (
                    <tr key={inq.id} className="hover:bg-gray-50/50">
                      <td className="py-3 font-semibold text-gray-900">{inq.childName}</td>
                      <td className="py-3 font-medium text-primary">{inq.targetClass}</td>
                      <td className="py-3 text-gray-700">{inq.parentName}</td>
                      <td className="py-3 font-mono text-gray-600">{inq.phone}</td>
                      <td className="py-3 text-gray-500 max-w-xs truncate">{inq.notes}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                          {inq.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Spot Fee Payment Collection */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Spot Fee Payment Collection</span>
                </h3>
                <p className="text-blue-100 text-xs">Counter receipt processing for {selectedStudent?.name}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            {paymentSuccessReceipt ? (
              <div className="p-6 space-y-4 text-center">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="font-display font-bold text-lg text-gray-900">Payment Successful!</h4>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-xs space-y-2 text-left font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Receipt Ref:</span>
                    <strong className="text-gray-900">{paymentSuccessReceipt.referenceNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Student:</span>
                    <strong className="text-gray-900">{paymentSuccessReceipt.studentName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Paid:</span>
                    <strong className="text-emerald-700 text-sm">₹{paymentSuccessReceipt.amount}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Method:</span>
                    <strong>{paymentSuccessReceipt.paymentMethod}</strong>
                  </div>
                </div>

                <div className="flex gap-2 justify-center pt-2">
                  <button
                    onClick={() => window.print()}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Thermal Slip</span>
                  </button>
                  <button
                    onClick={() => sendWhatsAppReceipt(
                      selectedStudent.guardianPhone,
                      paymentSuccessReceipt.studentName,
                      paymentSuccessReceipt.amount,
                      paymentSuccessReceipt.referenceNumber
                    )}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send WhatsApp</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCollectFee} className="p-6 space-y-4">
                <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fee Title:</span>
                    <strong className="text-gray-900">{selectedInvoice.title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount Due:</span>
                    <strong className="text-emerald-700 text-sm font-mono">₹{selectedInvoice.amount}</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment Mode</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Cash', 'UPI', 'Card', 'Cheque'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPaymentMethod(mode)}
                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                          paymentMethod === mode
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex gap-2 justify-end border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={collectingPayment}
                    className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
                  >
                    {collectingPayment ? <Loader small /> : <Check className="w-4 h-4" />}
                    <span>Confirm & Generate Receipt</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Visitor */}
      {showVisitorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">New Visitor Check-in</h3>
                <p className="text-blue-100 text-xs">Record walk-in parent / visitor entry details</p>
              </div>
              <button onClick={() => setShowVisitorModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddVisitor} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Visitor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={visitorForm.visitorName}
                  onChange={(e) => setVisitorForm({ ...visitorForm, visitorName: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number (10 Digits) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="e.g. 9876543210"
                  value={visitorForm.phone}
                  onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="input text-xs w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Purpose of Visit</label>
                <select
                  value={visitorForm.purpose}
                  onChange={(e) => setVisitorForm({ ...visitorForm, purpose: e.target.value })}
                  className="input text-xs w-full"
                >
                  <option value="Fee Submission / Inquiry">Fee Submission / Inquiry</option>
                  <option value="Meet Class Teacher / Principal">Meet Class Teacher / Principal</option>
                  <option value="New Admission Inquiry">New Admission Inquiry</option>
                  <option value="Early Student Pickup">Early Student Pickup</option>
                  <option value="General Meeting">General Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Whom to Meet</label>
                <input
                  type="text"
                  placeholder="e.g. Principal / Class Teacher"
                  value={visitorForm.whomToMeet}
                  onChange={(e) => setVisitorForm({ ...visitorForm, whomToMeet: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>
              <div className="pt-3 flex gap-2 justify-end border-t border-gray-100">
                <button type="button" onClick={() => setShowVisitorModal(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-5 py-2">Check-in Visitor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Early Gate Pass */}
      {showGatePassModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">Early Student Gate Pass</h3>
                <p className="text-blue-100 text-xs">Emergency checkout for {selectedStudent.name}</p>
              </div>
              <button onClick={() => setShowGatePassModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            {issuedGatePassResult ? (
              <div className="p-6 space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="font-display font-bold text-base text-gray-900">Gate Pass Issued Successfully</h4>
                <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 text-xs space-y-2 text-left font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pass Token:</span>
                    <strong className="text-primary font-bold text-sm">{issuedGatePassResult.passNumber}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Student:</span>
                    <strong>{issuedGatePassResult.studentName} ({issuedGatePassResult.classSection})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Picked by:</span>
                    <strong>{issuedGatePassResult.parentName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Reason:</span>
                    <strong className="text-gray-700">{issuedGatePassResult.reason}</strong>
                  </div>
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <button onClick={() => window.print()} className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Exit Pass</span>
                  </button>
                  <button onClick={() => setShowGatePassModal(false)} className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg">Done</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleIssueGatePass} className="p-6 space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={gatePassForm.parentName}
                    onChange={(e) => setGatePassForm({ ...gatePassForm, parentName: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Phone (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="e.g. 9876543210"
                    value={gatePassForm.parentPhone}
                    onChange={(e) => setGatePassForm({ ...gatePassForm, parentPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="input text-xs w-full font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reason for Early Leave *</label>
                  <textarea
                    required
                    rows="2"
                    value={gatePassForm.reason}
                    onChange={(e) => setGatePassForm({ ...gatePassForm, reason: e.target.value })}
                    className="input text-xs w-full py-2"
                  />
                </div>
                <div className="pt-3 flex gap-2 justify-end border-t border-gray-100">
                  <button type="button" onClick={() => setShowGatePassModal(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button type="submit" className="btn-primary text-xs px-5 py-2">Generate Pass</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: New Admission Inquiry */}
      {showInquiryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">New Admission Inquiry</h3>
                <p className="text-blue-100 text-xs">Record walk-in parent inquiry</p>
              </div>
              <button onClick={() => setShowInquiryModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddInquiry} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Child Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Gupta"
                  value={inquiryForm.childName}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, childName: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Target Class</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 5"
                    value={inquiryForm.targetClass}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, targetClass: e.target.value })}
                    className="input text-xs w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Contact Phone (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="e.g. 9876543210"
                    value={inquiryForm.phone}
                    onChange={(e) => setInquiryForm({ ...inquiryForm, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    className="input text-xs w-full font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Parent Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Rajesh Gupta"
                  value={inquiryForm.parentName}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, parentName: e.target.value })}
                  className="input text-xs w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Address</label>
                <textarea
                  rows="2"
                  value={inquiryForm.notes}
                  onChange={(e) => setInquiryForm({ ...inquiryForm, notes: e.target.value })}
                  className="input text-xs w-full py-2"
                />
              </div>
              <div className="pt-3 flex gap-2 justify-end border-t border-gray-100">
                <button type="button" onClick={() => setShowInquiryModal(false)} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                <button type="submit" className="btn-primary text-xs px-5 py-2">Save Inquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* No-Dues & TC Readiness Modal (Receptionist View) */}
      {showClearanceModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-gradient-to-r from-primary to-blue-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📜</span>
                <div>
                  <h3 className="font-display font-bold text-base">Student No-Dues & TC Status</h3>
                  <p className="text-blue-200 text-xs">Live check across Library and Accounts</p>
                </div>
              </div>
              <button onClick={() => setShowClearanceModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <div className="p-6 space-y-4">
              {loadingClearance ? (
                <div className="py-8 flex justify-center"><Loader small /></div>
              ) : clearanceData ? (
                <div className="space-y-4">
                  {/* Student Snapshot */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-primary text-sm">{clearanceData.student.name}</div>
                      <div className="text-xs text-gray-500 font-mono">ID: {clearanceData.student.studentId} • {clearanceData.student.className}</div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      clearanceData.clearance.isAllClear 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {clearanceData.clearance.isAllClear ? '✅ TC READY (ALL CLEAR)' : '⚠️ DUES PENDING'}
                    </span>
                  </div>

                  {clearanceData.student.outwardTcNumber && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
                      📜 <strong>TC Already Issued:</strong> #{clearanceData.student.outwardTcNumber} on {clearanceData.student.outwardTcIssuedDate}.
                    </div>
                  )}

                  {/* 1. Library Status */}
                  <div className={`p-3.5 rounded-xl border ${
                    clearanceData.clearance.library.isClear ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                  }`}>
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span>📚 Library Department</span>
                      <span className={clearanceData.clearance.library.isClear ? 'text-emerald-700' : 'text-rose-700'}>
                        {clearanceData.clearance.library.isClear ? '✓ Cleared' : '❌ Books / Fines Due'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {clearanceData.clearance.library.isClear 
                        ? 'All books returned, ₹0 pending fines.' 
                        : `${clearanceData.clearance.library.unreturnedBookCount} unreturned book(s), ₹${clearanceData.clearance.library.unpaidFineAmount} fines pending.`}
                    </div>
                  </div>

                  {/* 2. Fee Status */}
                  <div className={`p-3.5 rounded-xl border ${
                    clearanceData.clearance.fees.isClear ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
                  }`}>
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <span>💰 Fee & Accounts Department</span>
                      <span className={clearanceData.clearance.fees.isClear ? 'text-emerald-700' : 'text-rose-700'}>
                        {clearanceData.clearance.fees.isClear ? '✓ Cleared' : '❌ Outstanding Fee Due'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {clearanceData.clearance.fees.isClear 
                        ? 'All fee dues cleared.' 
                        : `₹${clearanceData.clearance.fees.pendingFeeAmount?.toLocaleString()} pending across ${clearanceData.clearance.fees.unpaidInvoiceCount} invoice(s).`}
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    💡 <em>Note for Receptionist:</em> Official Transfer Certificates are authorized and issued by the School Admin / Principal once all department dues are settled.
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end pt-2">
                <button onClick={() => setShowClearanceModal(false)} className="btn-primary text-xs px-4 py-2">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FrontDeskDashboard;
