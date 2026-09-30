import { useState, useEffect, useMemo } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { UploadCloud, Download, Sparkles, CheckCircle2, FileSpreadsheet, AlertCircle, X, Edit2, Pencil, UserPlus, UserCheck, Trash2, RefreshCw, Clock, BookOpen, Calendar, Lock, Unlock } from 'lucide-react';
import { formatGrade, formatSection, formatClassLabel, sortClasses, sortGrades } from '../../utils/classUtils';

const loadSubScript = (src) => {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const generateSetupMockPaymentId = () => {
  return `sub_pay_mock_${Math.random().toString(36).substring(7)}`;
};

const DateFilterInput = ({ label, value, onChange, className = '', style = {} }) => {
  const [focused, setFocused] = useState(false);
  const formatDisplay = (val) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return val;
  };
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {label && <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{label}</span>}
      <input
        type={focused ? 'date' : 'text'}
        value={focused ? value : formatDisplay(value)}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="dd/mm/yyyy"
        className={className || "input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl"}
        style={style || { width: '130px' }}
      />
    </div>
  );
};

const Setup = () => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('infrastructure'); // 'infrastructure', 'timetable', 'substitutions', 'fees'

  // Student Promotion Setup State
  const [promoStudents, setPromoStudents] = useState([]);
  const [promoClasses, setPromoClasses] = useState([]);
  const [promoClassSections, setPromoClassSections] = useState([]);
  const [loadingPromo, setLoadingPromo] = useState(false);
  const [promoSearch, setPromoSearch] = useState('');
  const [promoDateFrom, setPromoDateFrom] = useState('');
  const [promoDateTo, setPromoDateTo] = useState('');
  const [promoSelectedClass, setPromoSelectedClass] = useState('');
  const [promoSelectedSection, setPromoSelectedSection] = useState('');
  const [promoSelectedStatus, setPromoSelectedStatus] = useState('');

  // Modals state for student promotion setup
  const [showPromoViewModal, setShowPromoViewModal] = useState(false);
  const [promoViewStudentData, setPromoViewStudentData] = useState(null);
  const [showPromoPromoteModal, setShowPromoPromoteModal] = useState(false);
  const [promoPromotingStudent, setPromoPromotingStudent] = useState(null);
  const [promoPromoteNextClassId, setPromoPromoteNextClassId] = useState('');
  const [promoPromoting, setPromoPromoting] = useState(false);

  // Academic Session Timeline & Batch Promotion State
  const [sessionTimeline, setSessionTimeline] = useState({
    currentAcademicSession: '2025-26',
    sessionStartDate: '2025-04-01',
    sessionEndDate: '2026-03-31',
    promotionOpensDate: '2026-03-15',
    nextAcademicSession: '2026-27',
    isPromotionWindowOpen: false,
    daysUntilOpens: 0,
    isScheduleLocked: false
  });
  const [sessionScheduleUnlocked, setSessionScheduleUnlocked] = useState(false);
  const [sessionScheduleOverrideReason, setSessionScheduleOverrideReason] = useState('');
  const [savingSession, setSavingSession] = useState(false);
  const [batchSourceClassId, setBatchSourceClassId] = useState('');
  const [batchTargetClassId, setBatchTargetClassId] = useState('');
  const [batchTargetYear, setBatchTargetYear] = useState('2026-27');
  const [batchPreview, setBatchPreview] = useState(null);
  const [loadingBatchPreview, setLoadingBatchPreview] = useState(false);
  const [selectedBatchStudentIds, setSelectedBatchStudentIds] = useState([]);
  const [batchAdminOverride, setBatchAdminOverride] = useState(false);
  const [batchOverrideReason, setBatchOverrideReason] = useState('');
  const [executingBatch, setExecutingBatch] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  // Tab 4: Fee Rules State
  const [feeRules, setFeeRules] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feeComponents, setFeeComponents] = useState([]);
  const [feeForm, setFeeForm] = useState({
    name: '',
    type: 'class', // 'class', 'student'
    classId: '',
    grade: '',
    studentId: '',
    amount: '',
    installments: '1',
    submissionTime: 'Monthly'
  });

  // Tab 1: Infrastructure State
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [capacities, setCapacities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [newSection, setNewSection] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [newGradeLevel, setNewGradeLevel] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newExamType, setNewExamType] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [loadingSub, setLoadingSub] = useState(false);
  const [loadingExamTypes, setLoadingExamTypes] = useState(false);

  // Bulk Master Data Import State
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportStatus, setBulkImportStatus] = useState('');
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportParsed, setBulkImportParsed] = useState(null);

  // Subscription state
  const [subInfo, setSubInfo] = useState(null);
  const [payingSub, setPayingSub] = useState(false);
  const [platformPlans, setPlatformPlans] = useState([]);
  const [showUpgradeRequirementsModal, setShowUpgradeRequirementsModal] = useState(false);
  const [upgradeRequirementsPlanType, setUpgradeRequirementsPlanType] = useState('Enterprise');
  const [upgradeRequirementsText, setUpgradeRequirementsText] = useState('');

  // Dynamic Password Rules State
  const [passwordRules, setPasswordRules] = useState({
    studentPasswordPattern: 'stu@currentyear!',
    teacherPasswordPattern: 'tea@currentyear!',
    receptionistPasswordPattern: 'rec@currentyear!',
    accountantPasswordPattern: 'acc@currentyear!'
  });
  const [passwordPreviews, setPasswordPreviews] = useState({
    student: 'sha@2026!',
    teacher: 'roh@2026!',
    receptionist: 'pri@2026!',
    accountant: 'ami@2026!'
  });
  const [loadingPasswordRules, setLoadingPasswordRules] = useState(false);
  const [savingPasswordRules, setSavingPasswordRules] = useState(false);

  // Tab 2: Timetable State
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classSubjectsList, setClassSubjectsList] = useState([]);
  const [mappingClassId, setMappingClassId] = useState('');

  // Group classes by unique Grade tier so single class appears only once (saving syncs to all sections)
  const uniqueGradeClasses = useMemo(() => {
    const map = new Map();
    classes.forEach(c => {
      const gradeKey = formatGrade(c.grade);
      const cleanSec = formatSection(c.section);
      if (!map.has(gradeKey)) {
        map.set(gradeKey, {
          grade: c.grade,
          formattedGrade: gradeKey,
          sections: cleanSec ? [cleanSec] : [],
          classIds: [c.id],
          primaryClassId: c.id,
          classes: [c]
        });
      } else {
        const existing = map.get(gradeKey);
        if (cleanSec && !existing.sections.includes(cleanSec)) {
          existing.sections.push(cleanSec);
        }
        if (!existing.classIds.includes(c.id)) {
          existing.classIds.push(c.id);
          existing.classes.push(c);
        }
      }
    });

    const tierOrder = {
      'play group': 1,
      'nursery': 2,
      'lkg': 3,
      'ukg': 4,
      'kg': 5
    };

    return Array.from(map.values()).sort((a, b) => {
      const aLower = a.formattedGrade.toLowerCase();
      const bLower = b.formattedGrade.toLowerCase();

      const aTier = Object.keys(tierOrder).find(k => aLower.includes(k));
      const bTier = Object.keys(tierOrder).find(k => bLower.includes(k));

      if (aTier && bTier) return tierOrder[aTier] - tierOrder[bTier];
      if (aTier) return -1;
      if (bTier) return 1;

      const aNum = parseInt(a.formattedGrade.replace(/\D/g, ''), 10);
      const bNum = parseInt(b.formattedGrade.replace(/\D/g, ''), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;

      return a.formattedGrade.localeCompare(b.formattedGrade);
    });
  }, [classes]);

  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingForm, setMappingForm] = useState({ subjectId: '', selectedSubjectIds: [], teacherId: '' });
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editingClassSubject, setEditingClassSubject] = useState(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ teacherId: '' });
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [scheduleItems, setScheduleItems] = useState([]);
  const [selectedClassMappedSubjects, setSelectedClassMappedSubjects] = useState([]);
  const [showCellModal, setShowCellModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // { day, period }

  // Modal Cell form state
  const [cellForm, setCellForm] = useState({
    departmentName: '',
    subjectId: '',
    teacherId: '',
    remark: ''
  });

  // AI Timetable Generation State
  const [showAiTimetableModal, setShowAiTimetableModal] = useState(false);
  const [aiTimetableScope, setAiTimetableScope] = useState('selected'); // 'selected' | 'all'
  const [aiGeneratingTimetable, setAiGeneratingTimetable] = useState(false);
  const [aiTimetableResult, setAiTimetableResult] = useState(null);

  // Tab 3: Substitutions & AI Cover State
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedAlertItem, setSelectedAlertItem] = useState(null);
  const [availableSubstitutes, setAvailableSubstitutes] = useState([]);
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState('');
  const [absentTeacherId, setAbsentTeacherId] = useState('');
  const [aiAbsencePlans, setAiAbsencePlans] = useState([]);
  const [aiAnalyzingAbsence, setAiAnalyzingAbsence] = useState(false);
  const [submittingAiCover, setSubmittingAiCover] = useState(false);
  const [whatsAppPreviewData, setWhatsAppPreviewData] = useState(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // School Timing & GPS Geofence State
  const [schoolSettings, setSchoolSettings] = useState({
    latitude: 26.9124,
    longitude: 75.7873,
    address: '',
    geofenceRadiusMeters: 300,
    schoolStartTime: '08:00',
    gracePeriodMinutes: 15,
    minHalfDayHours: 4,
    schoolEndTime: '14:00'
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  const fetchSchoolSettings = async () => {
    try {
      const res = await expressClient.get('/school-settings');
      if (res.data) {
        setSchoolSettings({
          latitude: res.data.latitude || 26.9124,
          longitude: res.data.longitude || 75.7873,
          address: res.data.address || '',
          geofenceRadiusMeters: res.data.geofenceRadiusMeters || 300,
          schoolStartTime: res.data.schoolStartTime || '08:00',
          gracePeriodMinutes: res.data.gracePeriodMinutes || 15,
          minHalfDayHours: res.data.minHalfDayHours || 4,
          schoolEndTime: res.data.schoolEndTime || '14:00'
        });
      }
    } catch (err) {
      console.error('Failed to load school settings:', err);
    }
  };

  const handleDetectSchoolGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSchoolSettings(prev => ({
          ...prev,
          latitude: parseFloat(pos.coords.latitude.toFixed(6)),
          longitude: parseFloat(pos.coords.longitude.toFixed(6))
        }));
        setDetectingGps(false);
        alert(`Location detected! Lat: ${pos.coords.latitude.toFixed(6)}, Lng: ${pos.coords.longitude.toFixed(6)}`);
      },
      (err) => {
        setDetectingGps(false);
        alert('Failed to detect GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveSchoolSettings = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingSettings(true);
    setError('');
    setSuccess('');
    try {
      await expressClient.post('/school-settings', schoolSettings);
      setSuccess('School timing & GPS geofence settings saved successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save school settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const [loading, setLoading] = useState(false);
  const [loadingSec, setLoadingSec] = useState(false);
  const [loadingRm, setLoadingRm] = useState(false);
  const [loadingGl, setLoadingGl] = useState(false);
  const [loadingCap, setLoadingCap] = useState(false);
  const [loadingDept, setLoadingDept] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [success, setSuccess] = useState('');

  // Days of the week
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const fetchSubscriptionInfo = async () => {
    try {
      const res = await apiClient.get('/academics/stats');
      setSubInfo({
        status: res.data.subscriptionStatus,
        amount: res.data.subscriptionAmount,
        planType: res.data.subscriptionPlanType,
        id: res.data.subscriptionId,
        startDate: res.data.subscriptionStartDate,
        endDate: res.data.subscriptionEndDate,
        pendingUpgradeRequest: res.data.pendingUpgradeRequest
      });
      const plansRes = await apiClient.get('/billing/plans');
      setPlatformPlans(plansRes.data || []);
    } catch (err) {
      console.error('Error fetching subscription details:', err);
    }
  };

  const getRemainingDays = (endDateStr) => {
    if (!endDateStr) return 999;
    try {
      const endDate = new Date(endDateStr);
      const today = new Date();
      const diffTime = endDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return 999;
    }
  };

  const handleRequestUpgrade = (planType) => {
    setUpgradeRequirementsPlanType(planType);
    setUpgradeRequirementsText('');
    setShowUpgradeRequirementsModal(true);
  };

  const handleSubUpgradeRequirements = async (e) => {
    e.preventDefault();
    if (!upgradeRequirementsText.trim()) {
      alert('Please specify your project requirements.');
      return;
    }
    setPayingSub(true);
    try {
      await apiClient.post('/billing/upgrade-request', {
        requestedPlanType: upgradeRequirementsPlanType,
        requirements: upgradeRequirementsText
      });
      alert('Requirements submitted successfully! The Super Admin has been notified.');
      setShowUpgradeRequirementsModal(false);
      fetchSubscriptionInfo();
    } catch (err) {
      console.error('Error submitting upgrade requirements:', err);
      alert(err.response?.data?.error || 'Failed to submit requirements. Please try again.');
    } finally {
      setPayingSub(false);
    }
  };

  const handlePaySetupSubscription = async (isRenewal = false) => {
    setPayingSub(true);
    try {
      const orderRes = await apiClient.post(`/billing/create-subscription-order?isRenewal=${isRenewal}`);
      const { 
        orderId, 
        amount, 
        currency, 
        keyId, 
        isMock, 
        paymentProvider, 
        publishableKey, 
        clientId, 
        merchantId, 
        instructions 
      } = orderRes.data;

      const provider = paymentProvider ? paymentProvider.toLowerCase() : 'razorpay';
      const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

      if (provider === 'razorpay') {
        const scriptLoaded = await loadSubScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!scriptLoaded) {
          alert('Failed to load Razorpay SDK. Please check your internet connection.');
          setPayingSub(false);
          return;
        }

        const options = {
          key: keyId,
          amount: amount,
          currency: currency,
          name: isRenewal ? "EduVault Subscription Renewal" : "EduVault Subscription",
          description: `${subInfo?.planType || 'Standard'} Plan Platform Fees`,
          order_id: isMock ? undefined : orderId,
          handler: async function (response) {
            setPayingSub(true);
            try {
              await apiClient.post(`/billing/verify-subscription-payment?isRenewal=${isRenewal}`, {
                razorpayOrderId: response.razorpay_order_id || orderId,
                razorpayPaymentId: response.razorpay_payment_id || '',
                razorpaySignature: response.razorpay_signature || 'mock_signature',
                paymentProvider: 'razorpay'
              });
              alert(isRenewal ? 'Platform subscription renewal successful!' : 'Platform subscription payment successful! All features unlocked.');
              fetchSubscriptionInfo();
            } catch (err) {
              alert('Payment verification failed: ' + (err.response?.data?.error || err.message));
            } finally {
              setPayingSub(false);
            }
          },
          prefill: {
            name: userProfile.firstName || 'School Admin',
            email: userProfile.email || '',
          },
          theme: {
            color: "#1a2744"
          }
        };

        if (isMock) {
          if (window.confirm("Razorpay credentials not configured. Proceed with simulated subscription payment?")) {
            await options.handler({
              razorpay_order_id: orderId,
              razorpay_payment_id: generateSetupMockPaymentId(),
              razorpay_signature: 'mock_signature'
            });
          } else {
            setPayingSub(false);
          }
        } else {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response) {
            alert("Payment failed: " + response.error.description);
          });
          rzp.open();
        }
      }
      else if (provider === 'cashless') {
        const confirmMsg = `🏦 Platform Cashless / Bank Transfer Instructions:\n\n${instructions || 'Please transfer the platform fees to the admin account.'}\n\nAmount: Rs. ${amount}\n\nHave you completed the bank transfer? Click OK to submit subscription verification.`;
        if (window.confirm(confirmMsg)) {
          setPayingSub(true);
          try {
            const txRef = `cashless_sub_${Math.random().toString(36).substring(7)}`;
            await apiClient.post(`/billing/verify-subscription-payment?isRenewal=${isRenewal}`, {
              razorpayOrderId: orderId,
              paymentProvider: 'cashless',
              transactionReference: txRef
            });
            alert(isRenewal ? 'Platform subscription renewal submitted!' : 'Platform subscription payment submitted! The admin will verify it shortly.');
            fetchSubscriptionInfo();
          } catch (err) {
            alert('Failed to submit cashless transaction: ' + (err.response?.data?.error || err.message));
          } finally {
            setPayingSub(false);
          }
        } else {
          setPayingSub(false);
        }
      }
      else {
        // Stripe, PayPal, PhonePe simulations
        const providerName = provider === 'stripe' ? 'Stripe' : provider === 'paypal' ? 'PayPal' : provider === 'phonepe' ? 'PhonePe' : provider;
        const confirmMsg = `💳 Active Platform Gateway: ${providerName}\n\nAmount: Rs. ${amount}\n\nWould you like to proceed with the simulated checkout?`;
        
        if (window.confirm(confirmMsg)) {
          setPayingSub(true);
          try {
            const txRef = `${provider}_sub_${Math.random().toString(36).substring(7)}`;
            await apiClient.post(`/billing/verify-subscription-payment?isRenewal=${isRenewal}`, {
              razorpayOrderId: orderId,
              paymentProvider: provider,
              transactionReference: txRef
            });
            alert(isRenewal ? 'Platform subscription renewal successful!' : 'Platform subscription payment successful! All features unlocked.');
            fetchSubscriptionInfo();
          } catch (err) {
            alert('Payment verification failed: ' + (err.response?.data?.error || err.message));
          } finally {
            setPayingSub(false);
          }
        } else {
          setPayingSub(false);
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Order creation failed.');
    } finally {
      setPayingSub(false);
    }
  };

  const fetchInfrastructure = async () => {
    try {
      const secRes = await apiClient.get('/academics/sections');
      setSections(secRes.data);

      const rmRes = await apiClient.get('/academics/rooms');
      setRooms(rmRes.data);

      const glRes = await apiClient.get('/academics/enrollment-classes');
      setGradeLevels(sortGrades(glRes.data || []));

      const capRes = await apiClient.get('/academics/capacities');
      setCapacities(capRes.data);

      const depRes = await apiClient.get('/academics/departments');
      setDepartments(depRes.data);

      const examTypeRes = await apiClient.get('/academics/exam-types');
      setExamTypes(examTypeRes.data);

      const subjRes = await apiClient.get('/academics/subjects');
      setSubjects(subjRes.data);
    } catch (err) {
      console.error('Error fetching infrastructure setup data:', err);
    }
  };

  const fetchTimetableMeta = async () => {
    try {
      const clsRes = await apiClient.get('/academics/classes');
      setClasses(sortClasses(clsRes.data || []));

      const teachRes = await apiClient.get('/academics/teachers');
      setTeachers(teachRes.data);

      const subjRes = await apiClient.get('/academics/subjects');
      setSubjects(subjRes.data);

      const periodRes = await apiClient.get('/academics/timetable/periods');
      setPeriods(periodRes.data);

      if (clsRes.data.length > 0 && !selectedClassId) {
        setSelectedClassId(clsRes.data[0].id);
      }
      if (clsRes.data.length > 0) {
        setFeeForm(f => ({ ...f, classId: f.classId || clsRes.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching timetable config data:', err);
    }
  };

  const fetchClassSchedule = async (classId) => {
    if (!classId) return;
    try {
      const [res, mappedRes] = await Promise.all([
        apiClient.get(`/academics/timetable/schedule/${classId}`),
        apiClient.get(`/academics/class-subjects/${classId}`).catch(() => ({ data: [] }))
      ]);
      setScheduleItems(res.data || []);
      setSelectedClassMappedSubjects(mappedRes.data || []);
    } catch (err) {
      console.error('Error fetching class schedule:', err);
    }
  };

  const fetchActiveAlerts = async () => {
    try {
      const res = await apiClient.get('/academics/timetable/remarks');
      setActiveAlerts(res.data);
    } catch (err) {
      console.error('Error fetching teacher remarks:', err);
    }
  };

  const handleAddPeriod = () => {
    let start = "08:00";
    let end = "08:45";
    if (periods.length > 0) {
      const last = periods[periods.length - 1];
      start = last.endTime;
      const [h, m] = start.split(':').map(Number);
      const endMin = (h * 60 + m + 45) % 1440;
      const endH = Math.floor(endMin / 60).toString().padStart(2, '0');
      const endM = (endMin % 60).toString().padStart(2, '0');
      end = `${endH}:${endM}`;
    }

    const newP = {
      id: '00000000-0000-0000-0000-000000000000',
      periodNumber: periods.length + 1,
      startTime: start,
      endTime: end,
      durationMinutes: 45
    };
    setPeriods([...periods, newP]);
  };

  const handleDeletePeriod = (index) => {
    const updated = periods.filter((_, i) => i !== index).map((p, idx) => ({
      ...p,
      periodNumber: idx + 1
    }));
    setPeriods(updated);
  };

  const handlePeriodTimeChange = (index, field, value) => {
    const updated = periods.map((p, i) => {
      if (i === index) {
        const newP = { ...p, [field]: value };
        if (newP.startTime && newP.endTime) {
          const [sh, sm] = newP.startTime.split(':').map(Number);
          const [eh, em] = newP.endTime.split(':').map(Number);
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          newP.durationMinutes = diff > 0 ? diff : 45;
        }
        return newP;
      }
      return p;
    });
    setPeriods(updated);
  };

  const handleSavePeriods = async () => {
    setLoadingPeriods(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/academics/timetable/periods', periods);
      setPeriods(res.data);
      setSuccess('Timetable periods updated successfully!');
      fetchTimetableMeta();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save timetable periods.');
    } finally {
      setLoadingPeriods(false);
    }
  };

  const handleAutoSetupPeriods = async () => {
    const standardPeriods = [
      { periodNumber: 1, startTime: '08:30', endTime: '09:15', durationMinutes: 45 },
      { periodNumber: 2, startTime: '09:15', endTime: '10:00', durationMinutes: 45 },
      { periodNumber: 3, startTime: '10:15', endTime: '11:00', durationMinutes: 45 },
      { periodNumber: 4, startTime: '11:00', endTime: '11:45', durationMinutes: 45 },
      { periodNumber: 5, startTime: '12:15', endTime: '13:00', durationMinutes: 45 },
      { periodNumber: 6, startTime: '13:00', endTime: '13:45', durationMinutes: 45 }
    ];
    setLoadingPeriods(true);
    try {
      const res = await apiClient.post('/academics/timetable/periods', standardPeriods);
      setPeriods(res.data);
      setSuccess('⚡ Standard 6-period school schedule (08:30 - 13:45) configured successfully!');
      setTimeout(() => setSuccess(''), 5000);
      fetchTimetableMeta();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to auto-setup standard periods.');
    } finally {
      setLoadingPeriods(false);
    }
  };

  const handleAutoFillClassTimetable = async () => {
    if (!selectedClassId) {
      alert('Please select a class first.');
      return;
    }
    if (periods.length === 0) {
      alert('Please configure periods first or click "⚡ Auto Standard 6 Periods".');
      return;
    }
    if (subjects.length === 0) {
      alert('No subjects found. Please setup subjects in Infrastructure first.');
      return;
    }
    if (!window.confirm('Are you sure you want to auto-populate a sample Monday to Friday timetable schedule for this class?')) return;
    
    setLoading(true);
    try {
      const activeDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [selectedClassId];

      for (const cId of targetClassIds) {
        let subIdx = 0;
        let teacherIdx = 0;
        for (const day of activeDays) {
          for (const p of periods) {
            const sub = subjects[subIdx % subjects.length];
            const tchr = teachers.length > 0 ? teachers[teacherIdx % teachers.length] : null;
            subIdx++;
            if (teachers.length > 0) teacherIdx++;
            try {
              await apiClient.post('/academics/timetable/schedule', {
                classId: cId,
                dayOfWeek: day,
                periodNumber: p.periodNumber,
                subjectId: sub.id,
                teacherId: tchr ? tchr.id : null,
                remark: ''
              });
            } catch (err) {}
          }
        }
      }
      await fetchClassSchedule(selectedClassId);
      const gradeTitle = activeGradeGroup ? activeGradeGroup.formattedGrade : 'this class';
      const secNotice = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Synced across Sections: ${activeGradeGroup.sections.join(', ')})` : '';
      setSuccess(`🎉 Sample timetable schedule generated once for ${gradeTitle}${secNotice}!`);
      setTimeout(() => setSuccess(''), 6000);
    } catch (e) {
      setError('Could not auto-generate timetable.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeSetupData = async () => {
    try {
      const rulesRes = await apiClient.get('/billing/structures');
      setFeeRules(rulesRes.data);

      const studRes = await apiClient.get('/academics/students');
      setStudentsList(studRes.data);

      // Auto-select first student if available to avoid empty dropdowns
      if (studRes.data.length > 0) {
        setFeeForm(f => ({ ...f, studentId: studRes.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching fee setup data:', err);
    }
  };

  const handleCreateFeeRule = async (e) => {
    e.preventDefault();
    if (!feeForm.name || !feeForm.amount) {
      setError('Name and Amount are required.');
      return;
    }

    const totalVal = parseFloat(feeForm.amount);
    const sumComponents = feeComponents.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
    const unassigned = totalVal - sumComponents;

    if (feeComponents.length > 0 && Math.abs(unassigned) >= 0.01) {
      setError('Sum of components must equal the Total Amount.');
      return;
    }

    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(feeForm.classId));
    const selectedClass = classes.find(c => c.id === feeForm.classId);
    const gradeStr = activeGradeGroup ? activeGradeGroup.formattedGrade : (selectedClass ? formatGrade(selectedClass.grade) : '');

    setLoadingFees(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/billing/structures', {
        name: feeForm.name.trim(),
        grade: gradeStr,
        studentId: feeForm.type === 'student' ? feeForm.studentId : null,
        amount: totalVal,
        frequency: feeForm.submissionTime,
        installments: parseInt(feeForm.installments),
        submissionTime: feeForm.submissionTime,
        breakdown: feeComponents.length > 0 ? JSON.stringify(feeComponents.map(c => ({ category: c.category, amount: parseFloat(c.amount) }))) : null
      });
      const secMsg = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Applies to all Sections: ${activeGradeGroup.sections.join(', ')})` : '';
      setSuccess(`🎉 Fee rule created once for ${gradeStr}${secMsg}! Invoices auto-generated.`);
      setFeeForm(f => ({ ...f, name: '', amount: '' }));
      setFeeComponents([]);
      fetchFeeSetupData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create fee rule.');
    } finally {
      setLoadingFees(false);
    }
  };

  const handleDeleteFeeRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee rule? Any unpaid invoices generated by this rule will be deleted.')) return;
    setLoadingFees(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/billing/structures/${id}`);
      setSuccess('Fee rule deleted and associated unpaid invoices removed.');
      fetchFeeSetupData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete fee rule.');
    } finally {
      setLoadingFees(false);
    }
  };

  const fetchClassSubjects = async (classId) => {
    if (!classId) return;
    try {
      const res = await apiClient.get(`/academics/class-subjects/${classId}`);
      setClassSubjectsList(res.data);
    } catch (err) {
      console.error('Error fetching class subjects:', err);
    }
  };

  const fetchClassSubjectsData = async () => {
    try {
      const sortedCls = sortClasses(clsRes.data || []);
      setClasses(sortedCls);
      if (sortedCls.length > 0 && !mappingClassId) {
        setMappingClassId(sortedCls[0].id);
      }

      const subjRes = await apiClient.get('/academics/subjects');
      setSubjects(subjRes.data);

      const teachRes = await apiClient.get('/academics/teachers');
      setTeachers(teachRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPromotionSetupData = async () => {
    setLoadingPromo(true);
    try {
      const [studRes, classRes, secRes, sessionRes] = await Promise.all([
        apiClient.get('/academics/students'),
        apiClient.get('/academics/enrollment-classes'),
        apiClient.get('/academics/classes'),
        apiClient.get('/academics/academic-session').catch(() => ({ data: null }))
      ]);
      setPromoStudents(studRes.data || []);
      setPromoClasses(sortGrades(classRes.data || []));
      setPromoClassSections(sortClasses(secRes.data || []));
      if (sessionRes?.data) {
        setSessionTimeline(sessionRes.data);
        if (sessionRes.data.nextAcademicSession) {
          setBatchTargetYear(sessionRes.data.nextAcademicSession);
        }
      }
    } catch (err) {
      console.error('Error fetching promotion setup data:', err);
    } finally {
      setLoadingPromo(false);
    }
  };

  const handleSaveSessionTimeline = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setError('');
    setSuccess('');

    if (!sessionTimeline.sessionStartDate || !sessionTimeline.sessionEndDate) {
      setError('Both Session Start Date and Session End Date are required.');
      return;
    }

    const start = new Date(sessionTimeline.sessionStartDate);
    const end = new Date(sessionTimeline.sessionEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Please provide valid dates for Session Start and End.');
      return;
    }

    // Validation 1: End Date must be strictly after Start Date
    if (end <= start) {
      setError('Validation Error: Session End Date must be after Session Start Date (सत्र समाप्त होने की तारीख शुरू होने की तारीख के बाद होनी चाहिए).');
      return;
    }

    // Validation 2: Minimum 11 months gap
    const dayDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    const monthDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (dayDiff < 330 || monthDiff < 11) {
      setError(`Validation Error: Academic session must span at least 11 months (Current duration is only ${dayDiff} days / ${monthDiff} months. सत्र शुरू और समाप्त होने के बीच कम से कम 11 महीने का अंतर होना आवश्यक है).`);
      return;
    }

    // Validation 3: Promotion Window Opens Date
    if (sessionTimeline.promotionOpensDate) {
      const promo = new Date(sessionTimeline.promotionOpensDate);
      if (!isNaN(promo.getTime())) {
        const promoDaysFromStart = Math.round((promo - start) / (1000 * 60 * 60 * 24));
        if (promoDaysFromStart < 300) {
          setError('Validation Error: Promotion Window Opens Date must be towards the end of the session (at least 10 months after start date).');
          return;
        }
        if (promo > new Date(end.getTime() + 60 * 24 * 60 * 60 * 1000)) {
          setError('Validation Error: Promotion Window Opens Date cannot exceed 60 days after Session End Date.');
          return;
        }
      }
    }

    // Validation 4: Edit Protection (If schedule is locked, require reason)
    if (sessionTimeline.isScheduleLocked && sessionScheduleUnlocked) {
      if (!sessionScheduleOverrideReason || sessionScheduleOverrideReason.trim().length < 5) {
        setError('Please provide a descriptive reason (minimum 5 characters) for modifying an active, locked academic session schedule.');
        return;
      }
    }

    setSavingSession(true);
    try {
      const res = await apiClient.post('/academics/academic-session', {
        currentAcademicSession: sessionTimeline.currentAcademicSession,
        sessionStartDate: sessionTimeline.sessionStartDate,
        sessionEndDate: sessionTimeline.sessionEndDate,
        promotionOpensDate: sessionTimeline.promotionOpensDate,
        nextAcademicSession: sessionTimeline.nextAcademicSession,
        adminOverride: sessionScheduleUnlocked,
        overrideReason: sessionScheduleOverrideReason
      });
      setSuccess(res.data?.message || 'Academic Session Timeline saved & locked successfully!');
      if (res.data) {
        setSessionTimeline(s => ({ ...s, ...res.data }));
      }
      setSessionScheduleUnlocked(false);
      setSessionScheduleOverrideReason('');
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save academic session timeline.');
    } finally {
      setSavingSession(false);
    }
  };

  const handleFetchBatchPreview = async (classId) => {
    setBatchSourceClassId(classId);
    if (!classId) {
      setBatchPreview(null);
      setSelectedBatchStudentIds([]);
      return;
    }
    setLoadingBatchPreview(true);
    setBatchResult(null);
    try {
      const res = await apiClient.get(`/academics/classes/${classId}/batch-promotion-preview`);
      setBatchPreview(res.data);
      // Auto-select all eligible (passed 40%+, active, no TC) students
      const eligibleIds = (res.data?.students || [])
        .filter(s => s.eligibleForAutoPromote)
        .map(s => s.id);
      setSelectedBatchStudentIds(eligibleIds);

      // Auto deduce target class (next grade, same section)
      const currentGradeRaw = String(res.data.grade || '').trim();
      const currentGradeClean = currentGradeRaw.toLowerCase().replace(/^(class\s+|grade\s+)+/gi, '').trim();
      let nextGradeToMatch = null;
      if (currentGradeClean.includes('play') || currentGradeClean === 'pg') nextGradeToMatch = 'nursery';
      else if (currentGradeClean.includes('nur')) nextGradeToMatch = 'lkg';
      else if (currentGradeClean.includes('lkg')) nextGradeToMatch = 'ukg';
      else if (currentGradeClean.includes('ukg') || currentGradeClean.includes('kg')) nextGradeToMatch = '1';
      else {
        const currentGradeNum = parseInt(currentGradeClean, 10);
        if (!isNaN(currentGradeNum) && currentGradeNum < 12) {
          nextGradeToMatch = String(currentGradeNum + 1);
        }
      }

      if (nextGradeToMatch) {
        const targetSection = (res.data.section || 'A').replace(/^Section\s+/i, '').trim().toUpperCase();
        const match = promoClassSections.find(c => {
          const g = String(c.grade || '').toLowerCase().replace(/^(class\s+|grade\s+)+/gi, '').trim();
          const s = String(c.section || '').replace(/^Section\s+/i, '').trim().toUpperCase();
          return g === nextGradeToMatch && s === targetSection;
        }) || promoClassSections.find(c => {
          const g = String(c.grade || '').toLowerCase().replace(/^(class\s+|grade\s+)+/gi, '').trim();
          return g === nextGradeToMatch;
        });
        if (match) {
          setBatchTargetClassId(match.id);
        }
      }
    } catch (err) {
      console.error('Failed to load batch promotion preview:', err);
    } finally {
      setLoadingBatchPreview(false);
    }
  };

  const handleExecuteBatchPromote = async () => {
    if (!batchSourceClassId || !batchTargetClassId || selectedBatchStudentIds.length === 0) {
      alert('Please select source class, target class, and at least 1 student to promote.');
      return;
    }

    setExecutingBatch(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post(`/academics/classes/${batchSourceClassId}/batch-promote`, {
        targetClassId: batchTargetClassId,
        targetAcademicYear: batchTargetYear,
        studentIds: selectedBatchStudentIds,
        adminOverride: batchAdminOverride,
        overrideReason: batchOverrideReason
      });
      setSuccess(res.data?.message || 'Students batch-promoted successfully!');
      setBatchResult(res.data);
      handleFetchBatchPreview(batchSourceClassId);
      fetchPromotionSetupData();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to execute batch promotion.');
    } finally {
      setExecutingBatch(false);
    }
  };

  const handlePromoViewClick = async (id) => {
    try {
      const res = await apiClient.get(`/academics/students/${id}`);
      setPromoViewStudentData(res.data);
      setShowPromoViewModal(true);
    } catch (err) {
      console.error("Error fetching student profile:", err);
    }
  };

  const handlePromoPromoteClick = (student) => {
    setPromoPromotingStudent(student);
    setPromoPromoteError('');
    
    const currentGradeStr = student.class.replace('Class ', '').trim();
    const currentGradeNum = parseInt(currentGradeStr, 10);
    if (!isNaN(currentGradeNum)) {
      const nextGradeNum = currentGradeNum + 1;
      const targetSection = student.section || 'Section A';
      
      const match = promoClassSections.find(
        c => String(c.grade) === String(nextGradeNum) && c.section === targetSection
      );
      
      if (match) {
        setPromoPromoteNextClassId(match.id);
      } else {
        const fallback = promoClassSections.find(c => String(c.grade) === String(nextGradeNum));
        setPromoPromoteNextClassId(fallback ? fallback.id : '');
      }
    } else {
      setPromoPromoteNextClassId('');
    }
    
    setShowPromoPromoteModal(true);
  };

  const handlePromoPromoteSubmit = async () => {
    if (!promoPromoteNextClassId || !promoPromotingStudent) return;
    setPromoPromoting(true);
    setPromoPromoteError('');
    try {
      await apiClient.post(`/academics/students/${promoPromotingStudent.id}/promote`, {
        nextClassId: promoPromoteNextClassId
      });
      setShowPromoPromoteModal(false);
      fetchPromotionSetupData();
    } catch (err) {
      setPromoPromoteError(err.response?.data?.error || 'Failed to promote student.');
    } finally {
      setPromoPromoting(false);
    }
  };

  const handlePromoDeleteClick = async (id) => {
    if (window.confirm('Are you sure you want to delete this student profile?')) {
      try {
        await apiClient.delete(`/academics/students/${id}`);
        fetchPromotionSetupData();
      } catch (err) {
        console.error('Error deleting student profile:', err);
      }
    }
  };

  const normalizePromoClass = (cls) => {
    if (!cls) return '';
    return cls.toString().toLowerCase().replace(/\s+/g, '').replace(/^(class|grade)/, '');
  };

  const normalizePromoSection = (sec) => {
    if (!sec) return '';
    return sec.toString().toLowerCase().replace(/\s+/g, '').replace(/^section/, '');
  };

  const handleSaveClassSubject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const subjectsToLink = mappingForm.selectedSubjectIds && mappingForm.selectedSubjectIds.length > 0
      ? mappingForm.selectedSubjectIds
      : (mappingForm.subjectId ? [mappingForm.subjectId] : []);

    if (!mappingClassId || subjectsToLink.length === 0) {
      setError('Please select at least one subject to link.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [mappingClassId];
      let totalLinked = 0;

      for (const clsId of targetClassIds) {
        let existingIds = new Set();
        try {
          const res = await apiClient.get(`/academics/class-subjects/${clsId}`);
          existingIds = new Set((res.data || []).map(cs => cs.subjectId || cs.id));
        } catch (e) {
          existingIds = new Set((classSubjectsList || []).map(cs => cs.subjectId || cs.id));
        }

        for (const subId of subjectsToLink) {
          if (!existingIds.has(subId)) {
            try {
              await apiClient.post('/academics/class-subjects', {
                classId: clsId,
                subjectId: subId,
                teacherId: mappingForm.teacherId || null
              });
              totalLinked++;
            } catch (err) {}
          }
        }
      }

      const gradeTitle = activeGradeGroup?.formattedGrade || 'Class';
      const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';
      setSuccess(`🎉 Subject(s) saved once for ${gradeTitle}${secInfo} across all sections!`);
      setTimeout(() => setSuccess(''), 5000);
      setShowMappingModal(false);
      setMappingForm({ subjectId: '', selectedSubjectIds: [], teacherId: '' });
      fetchClassSubjects(mappingClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to map subject(s) to class.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoMapStandardCurriculum = async () => {
    if (!mappingClassId) {
      alert('Please select a class first.');
      return;
    }
    const currentClass = classes.find(c => c.id === mappingClassId);
    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
    const gradeStr = (currentClass?.grade || '').toString().toLowerCase();
    const gradeDisplayName = activeGradeGroup?.formattedGrade || formatGrade(currentClass?.grade || '');
    const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';

    if (!window.confirm(`Are you sure you want to automatically link standard curriculum subjects (Hindi, English, Math, Science, etc.) for ${gradeDisplayName}${secInfo} across all sections?`)) return;

    setLoading(true);
    try {
      const findSub = (keyword) => subjects.find(s => s.name?.toLowerCase().includes(keyword.toLowerCase()));

      let targetSubjectNames = ['Hindi', 'English', 'Mathematics', 'Science', 'Social Studies', 'Computer Science'];
      if (['play group', 'nursery', 'lkg', 'ukg'].some(k => gradeStr.includes(k))) {
        targetSubjectNames = ['English', 'Hindi', 'Mathematics', 'Drawing & Art', 'General Knowledge'];
      } else if (['1', '2', '3', '4', '5'].some(k => gradeStr.endsWith(k) || gradeStr === k)) {
        targetSubjectNames = ['Hindi', 'English', 'Mathematics', 'Science', 'Social Studies', 'Drawing & Art', 'Physical Education'];
      } else if (['6', '7', '8'].some(k => gradeStr.endsWith(k) || gradeStr === k)) {
        targetSubjectNames = ['Hindi', 'English', 'Sanskrit', 'Mathematics', 'Science', 'Social Studies', 'Computer Science'];
      } else if (['9', '10'].some(k => gradeStr.endsWith(k) || gradeStr === k)) {
        targetSubjectNames = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer Science'];
      } else if (['11', '12'].some(k => gradeStr.endsWith(k) || gradeStr === k)) {
        targetSubjectNames = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science', 'Accountancy', 'Economics'];
      }

      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [mappingClassId];
      let totalAdded = 0;

      for (const clsId of targetClassIds) {
        let existingSubjIds = new Set();
        try {
          const res = await apiClient.get(`/academics/class-subjects/${clsId}`);
          existingSubjIds = new Set((res.data || []).map(cs => cs.subjectId || cs.id));
        } catch (e) {
          existingSubjIds = new Set((classSubjectsList || []).map(cs => cs.subjectId || cs.id));
        }

        for (const name of targetSubjectNames) {
          const found = findSub(name);
          if (found && !existingSubjIds.has(found.id)) {
            try {
              await apiClient.post('/academics/class-subjects', {
                classId: clsId,
                subjectId: found.id,
                teacherId: null
              });
              totalAdded++;
            } catch (e) {}
          }
        }
      }

      await fetchClassSubjects(mappingClassId);
      setSuccess(`🎉 Standard curriculum saved once for ${gradeDisplayName}${secInfo} across all sections!`);
      setTimeout(() => setSuccess(''), 6000);
    } catch (e) {
      setError('Failed to auto-map standard curriculum.');
    } finally {
      setLoading(false);
    }
  };

  // --- Real-time AI Timetable Generator ---
  const handleGenerateAiTimetable = async (forcedScope) => {
    const scopeToUse = forcedScope || aiTimetableScope || (selectedClassId ? 'selected' : 'all');
    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));

    if (scopeToUse !== 'all' && !selectedClassId) {
      alert('Please select a class first or choose All Classes.');
      return;
    }

    // Pre-validation: verify that selected class has mapped subjects in curriculum
    if (scopeToUse !== 'all' && selectedClassId) {
      try {
        const checkRes = await apiClient.get(`/academics/class-subjects/${selectedClassId}`);
        if (!checkRes.data || checkRes.data.length === 0) {
          setSelectedClassMappedSubjects([]);
          const gradeTitle = activeGradeGroup?.formattedGrade || 'this class';
          const msg = `Please first map subjects with classes! No subjects are linked to ${gradeTitle} in 'Subjects Curriculum'. Due to this, the timetable cannot be created.`;
          alert(msg);
          setError(msg);
          setShowAiTimetableModal(false);
          return;
        } else {
          setSelectedClassMappedSubjects(checkRes.data);
        }
      } catch (err) {
        console.warn('Could not pre-validate mapped subjects:', err);
      }
    }

    setAiGeneratingTimetable(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/academics/timetable/generate-ai', {
        classId: selectedClassId || null,
        scope: scopeToUse,
        overwrite: true
      });

      if (selectedClassId) {
        await fetchClassSchedule(selectedClassId);
      }
      setShowAiTimetableModal(false);

      const gradeTitle = activeGradeGroup?.formattedGrade || (classes.find(c => c.id === selectedClassId)?.grade ? formatGrade(classes.find(c => c.id === selectedClassId).grade) : 'Selected Class');
      const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';
      const scopeLabel = scopeToUse === 'all' ? 'All Classes' : `${gradeTitle}${secInfo}`;

      setAiTimetableResult({
        totalSlots: res.data.scheduledTotal,
        classesCount: res.data.classesCount,
        timestamp: new Date().toLocaleTimeString()
      });

      setSuccess(`🎉 AI Timetable successfully regenerated! ${res.data.scheduledTotal} periods scheduled for ${scopeLabel} with zero teacher clashes.`);
      setTimeout(() => setSuccess(''), 7000);
    } catch (err) {
      console.error('AI timetable error:', err);
      setError(err.response?.data?.error || 'AI Timetable generator encountered an error.');
    } finally {
      setAiGeneratingTimetable(false);
    }
  };

  // --- AI Absenteeism Substitution & WhatsApp Engine ---
  const handleAnalyzeTeacherAbsence = async (teacherId) => {
    if (!teacherId) {
      setAbsentTeacherId('');
      setAiAbsencePlans([]);
      return;
    }
    setAbsentTeacherId(teacherId);
    setAiAnalyzingAbsence(true);
    try {
      const absentTeacher = teachers.find(t => t.id === teacherId);
      const todayDayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
      const dayToInspect = todayDayName === 'Sunday' || todayDayName === 'Saturday' ? 'Monday' : todayDayName;

      // 1. Find all scheduled periods for this absent teacher on this day across all classes
      const affectedSlots = [];
      const allClassSchedules = [];

      for (const c of classes) {
        try {
          const res = await apiClient.get(`/academics/timetable/schedule/${c.id}`);
          const items = res.data || [];
          allClassSchedules.push({ class: c, items });
          items.forEach(slot => {
            if (slot.dayOfWeek === dayToInspect && slot.teacherId === teacherId) {
              const subjObj = subjects.find(s => s.id === slot.subjectId);
              affectedSlots.push({
                slotId: slot.id,
                classId: c.id,
                className: formatClassLabel(c.grade, c.section),
                dayOfWeek: slot.dayOfWeek,
                periodNumber: slot.periodNumber,
                subjectId: slot.subjectId,
                subjectName: subjObj?.name || 'Subject',
                subjectDepartment: subjObj?.department || ''
              });
            }
          });
        } catch (e) {}
      }

      // 2. For each affected period, find free teachers
      const plans = affectedSlots.map(slot => {
        const busyTeacherIds = new Set();
        allClassSchedules.forEach(({ items }) => {
          items.forEach(s => {
            if (s.dayOfWeek === slot.dayOfWeek && s.periodNumber === slot.periodNumber && s.teacherId) {
              busyTeacherIds.add(s.teacherId);
            }
          });
        });

        // Free teachers who are NOT busy in this period and NOT the absent teacher
        const freeEducators = teachers.filter(t => t.id !== teacherId && !busyTeacherIds.has(t.id));
        
        // Prioritize matching department
        const deptEducator = freeEducators.find(t => t.department && slot.subjectDepartment && t.department.toLowerCase() === slot.subjectDepartment.toLowerCase());
        const selectedCover = deptEducator || freeEducators[0] || null;

        return {
          ...slot,
          freeTeachers: freeEducators,
          assignedCoverTeacherId: selectedCover?.id || '',
          assignedCoverTeacherName: selectedCover?.name || 'Unassigned',
          coverTeacherPhone: selectedCover?.phone || '9876543210'
        };
      });

      setAiAbsencePlans(plans);
    } catch (err) {
      console.error('Error analyzing absence:', err);
    } finally {
      setAiAnalyzingAbsence(false);
    }
  };

  const handleExecuteAiSubstitution = async (planItem) => {
    if (!planItem || !planItem.assignedCoverTeacherId) {
      alert('Please select a substitute teacher for this period.');
      return;
    }
    setSubmittingAiCover(true);
    try {
      const coverTeacher = teachers.find(t => t.id === planItem.assignedCoverTeacherId);
      const absentTeacher = teachers.find(t => t.id === absentTeacherId);
      const periodObj = periods.find(p => p.periodNumber === planItem.periodNumber);
      const timeStr = periodObj ? `${periodObj.startTime} - ${periodObj.endTime}` : 'Scheduled Time';

      // 1. Update timetable schedule
      await apiClient.post('/academics/timetable/schedule', {
        classId: planItem.classId,
        dayOfWeek: planItem.dayOfWeek,
        periodNumber: planItem.periodNumber,
        subjectId: planItem.subjectId,
        teacherId: planItem.assignedCoverTeacherId,
        remark: `Substitution: Covering for ${absentTeacher?.name || 'Absent Faculty'}`
      });

      // 2. Dispatch in-app notice / notification
      try {
        await apiClient.post('/notices', {
          title: `⚠️ Substitution Notice: Period ${planItem.periodNumber}`,
          content: `Namaste ${coverTeacher?.name}. Today ${absentTeacher?.name || 'Educator'} is absent. You are assigned to supervise Period ${planItem.periodNumber} (${planItem.subjectName}) for ${planItem.className} (${timeStr}).`,
          targetRole: 'teacher',
          priority: 'HIGH'
        });
      } catch (e) {}

      // 3. Prepare formatted WhatsApp message
      const whatsAppMsg = `🏫 *EduVault School - Substitution Alert*\n━━━━━━━━━━━━━━━━━━━━\nNamaste *${coverTeacher?.name || 'Educator'}*,\nToday *${absentTeacher?.name || 'Faculty'}* is on leave.\nYou have been assigned as the substitute teacher for:\n📚 *Subject:* ${planItem.subjectName}\n👥 *Class:* ${planItem.className}\n⏰ *Period:* Period ${planItem.periodNumber} (${timeStr})\n🚪 *Classroom:* Room 3\n\nPlease supervise this class and mark attendance on EduVault.\n- *Academic Office*`;

      setWhatsAppPreviewData({
        teacherName: coverTeacher?.name,
        teacherPhone: coverTeacher?.phone || '9876543210',
        message: whatsAppMsg
      });

      setSuccess(`🎉 Substitution confirmed for ${planItem.className} (Period ${planItem.periodNumber})! In-app notification dispatched.`);
      setTimeout(() => setSuccess(''), 6000);

      // Refresh absence analysis
      handleAnalyzeTeacherAbsence(absentTeacherId);
      setShowWhatsAppModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply substitution.');
    } finally {
      setSubmittingAiCover(false);
    }
  };

  const handleOpenEditTeacher = (cs) => {
    setEditingClassSubject(cs);
    setEditTeacherForm({
      teacherId: cs.teacherId || ''
    });
    if (!teachers || teachers.length === 0) {
      fetchClassSubjectsData();
    }
    setShowEditTeacherModal(true);
  };

  const handleSaveEditTeacher = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editingClassSubject || !mappingClassId) return;

    setSavingTeacher(true);
    setError('');
    setSuccess('');
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [mappingClassId];
      const teacherIdToSave = editTeacherForm.teacherId ? editTeacherForm.teacherId : null;

      for (const clsId of targetClassIds) {
        try {
          await apiClient.post('/academics/class-subjects', {
            classId: clsId,
            subjectId: editingClassSubject.subjectId,
            teacherId: teacherIdToSave
          });
        } catch (err) {
          console.error('Error updating class subject teacher:', err);
        }
      }

      const assignedTeacher = teachers.find(t => (t.id || t.Id) === teacherIdToSave);
      const gradeTitle = activeGradeGroup?.formattedGrade || 'Class';
      const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';

      if (assignedTeacher) {
        setSuccess(`🎉 Teacher "${assignedTeacher.name || assignedTeacher.Name}" assigned to ${editingClassSubject.subjectName} for ${gradeTitle}${secInfo}!`);
      } else {
        setSuccess(`Teacher unassigned from ${editingClassSubject.subjectName} for ${gradeTitle}${secInfo}.`);
      }
      setTimeout(() => setSuccess(''), 5000);
      setShowEditTeacherModal(false);
      setEditingClassSubject(null);
      await fetchClassSubjects(mappingClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update teacher assignment.');
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleDeleteClassSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to remove this subject from this class?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [mappingClassId];
      for (const clsId of targetClassIds) {
        try {
          await apiClient.delete(`/academics/class-subjects/${clsId}/${subjectId}`);
        } catch (e) {}
      }
      setSuccess('Subject mapping removed successfully across all sections!');
      fetchClassSubjects(mappingClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove subject mapping.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mappingClassId) {
      fetchClassSubjects(mappingClassId);
    }
  }, [mappingClassId]);


  useEffect(() => {
    fetchInfrastructure();
    fetchTimetableMeta();
    fetchActiveAlerts();
    fetchFeeSetupData();
    fetchSubscriptionInfo();
    fetchSchoolSettings();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassSchedule(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (feeForm.classId && studentsList.length > 0) {
      const filtered = studentsList.filter(s => s.classId === feeForm.classId);
      if (filtered.length > 0) {
        setFeeForm(f => ({ ...f, studentId: filtered[0].id }));
      } else {
        setFeeForm(f => ({ ...f, studentId: '' }));
      }
    }
  }, [feeForm.classId, studentsList]);

  // Tab 1 handlers
  const handleAddSection = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newSection.trim()) return;
    setLoadingSec(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/sections', { name: newSection.trim() });
      setNewSection('');
      setSuccess('Section added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add section.');
    } finally {
      setLoadingSec(false);
    }
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm('Are you sure you want to delete this section?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/sections/${id}`);
      setSuccess('Section deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete section.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newRoom.trim()) return;
    setLoadingRm(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/rooms', { name: newRoom.trim() });
      setNewRoom('');
      setSuccess('Room added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add room.');
    } finally {
      setLoadingRm(false);
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm('Are you sure you want to delete this room?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/rooms/${id}`);
      setSuccess('Room deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete room.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGradeLevel = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newGradeLevel.trim()) return;
    setLoadingGl(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/enrollment-classes', { name: newGradeLevel.trim() });
      setNewGradeLevel('');
      setSuccess('Grade level added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add grade level.');
    } finally {
      setLoadingGl(false);
    }
  };

  const handleDeleteGradeLevel = async (id) => {
    if (!window.confirm('Are you sure you want to delete this grade level?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/enrollment-classes/${id}`);
      setSuccess('Grade level deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete grade level.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCapacity = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const val = parseInt(newCapacity);
    if (isNaN(val) || val <= 0) return;
    setLoadingCap(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/capacities', { value: val });
      setNewCapacity('');
      setSuccess('Capacity option added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add capacity.');
    } finally {
      setLoadingCap(false);
    }
  };

  const handleDeleteCapacity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this capacity option?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/capacities/${id}`);
      setSuccess('Capacity option deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete capacity option.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDepartment.trim()) return;
    setLoadingDept(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/departments', { name: newDepartment.trim() });
      setNewDepartment('');
      setSuccess('Department added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add department.');
    } finally {
      setLoadingDept(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/departments/${id}`);
      setSuccess('Department deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete department.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newSubName.trim()) {
      setError('Subject name is required.');
      return;
    }
    setLoadingSub(true);
    setError('');
    setSuccess('');
    try {
      const name = newSubName.trim();
      const code = name.toUpperCase().replace(/\s+/g, '') || `SUB-${Math.floor(1000 + Math.random() * 9000)}`;
      await apiClient.post('/academics/subjects', {
        name,
        code
      });
      setNewSubName('');
      setSuccess('Subject added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add subject.');
    } finally {
      setLoadingSub(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/subjects/${id}`);
      setSuccess('Subject deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete subject.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExamType = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newExamType.trim()) return;
    setLoadingExamTypes(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/exam-types', { name: newExamType.trim() });
      setNewExamType('');
      setSuccess('Examination type added successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add examination type.');
    } finally {
      setLoadingExamTypes(false);
    }
  };

  const handleDeleteExamType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this examination type?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/exam-types/${id}`);
      setSuccess('Examination type deleted successfully!');
      fetchInfrastructure();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete examination type.');
    } finally {
      setLoading(false);
    }
  };

  // --- Bulk Master Data Setup & Import Handlers ---
  const DEFAULT_MASTER_DATA = {
    sections: ['A', 'B', 'C', 'D', 'E', 'F'],
    rooms: ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5', 'Room 6', 'Room 7', 'Room 8', 'Room 9', 'Room 10'],
    grades: [
      'Play Group', 'Nursery', 'LKG', 'UKG',
      'Class 1', 'Class 2', 'Class 3', 'Class 4',
      'Class 5', 'Class 6', 'Class 7', 'Class 8',
      'Class 9', 'Class 10', 'Class 11', 'Class 12'
    ],
    capacities: [10, 20, 30, 40, 50, 60, 70, 80],
    departments: [
      'Languages', 'Science', 'Mathematics', 'Social Sciences',
      'Commerce', 'Arts & Humanities', 'Computer Science & IT',
      'Physical Education & Sports'
    ],
    subjects: [
      { name: 'Hindi', code: 'HIN' },
      { name: 'English', code: 'ENG' },
      { name: 'Mathematics', code: 'MATH' },
      { name: 'Science', code: 'SCI' },
      { name: 'Social Studies', code: 'SST' },
      { name: 'Physics', code: 'PHY' },
      { name: 'Chemistry', code: 'CHEM' },
      { name: 'Biology', code: 'BIO' },
      { name: 'Computer Science', code: 'CS' },
      { name: 'Economics', code: 'ECO' },
      { name: 'Accountancy', code: 'ACC' },
      { name: 'Business Studies', code: 'BST' },
      { name: 'History', code: 'HIST' },
      { name: 'Geography', code: 'GEO' },
      { name: 'Political Science', code: 'POL' },
      { name: 'Sanskrit', code: 'SAN' },
      { name: 'General Knowledge', code: 'GK' },
      { name: 'Drawing & Art', code: 'ART' },
      { name: 'Physical Education', code: 'PHE' },
      { name: 'Game', code: 'GAME' }
    ],
    examTypes: [
      'Unit Test 1',
      'Mid Term / Half Yearly Examination',
      'Unit Test 2',
      'Pre-Board Examination',
      'Final Annual Examination'
    ]
  };

  const handleOneClickSetup = async () => {
    if (!window.confirm('Are you sure you want to auto-configure standard Sections (A-F), Rooms (1-10), Grades (Playgroup-12), Capacities (10-80), Departments, Subjects, and Examination Types all at once?')) return;
    setBulkImporting(true);
    setBulkImportStatus('Starting 1-Click Master Data Setup...');
    setError('');
    setSuccess('');
    try {
      // 1. Sections
      const existingSecNames = new Set((sections || []).map(s => s.name?.toUpperCase()));
      for (const sec of DEFAULT_MASTER_DATA.sections) {
        if (!existingSecNames.has(sec.toUpperCase())) {
          setBulkImportStatus(`Configuring Section: ${sec}...`);
          try { await apiClient.post('/academics/sections', { name: sec }); } catch (e) {}
        }
      }

      // 2. Rooms
      const existingRoomNames = new Set((rooms || []).map(r => r.name?.toUpperCase()));
      for (const rm of DEFAULT_MASTER_DATA.rooms) {
        if (!existingRoomNames.has(rm.toUpperCase())) {
          setBulkImportStatus(`Configuring Room: ${rm}...`);
          try { await apiClient.post('/academics/rooms', { name: rm }); } catch (e) {}
        }
      }

      // 3. Grade Levels
      const existingGradeNames = new Set((gradeLevels || []).map(g => g.name?.toUpperCase()));
      for (const gr of DEFAULT_MASTER_DATA.grades) {
        if (!existingGradeNames.has(gr.toUpperCase())) {
          setBulkImportStatus(`Configuring Grade: ${gr}...`);
          try { await apiClient.post('/academics/enrollment-classes', { name: gr }); } catch (e) {}
        }
      }

      // 4. Capacities
      const existingCapValues = new Set((capacities || []).map(c => c.value));
      for (const cap of DEFAULT_MASTER_DATA.capacities) {
        if (!existingCapValues.has(cap)) {
          setBulkImportStatus(`Configuring Capacity: ${cap}...`);
          try { await apiClient.post('/academics/capacities', { value: cap }); } catch (e) {}
        }
      }

      // 5. Departments
      const existingDeptNames = new Set((departments || []).map(d => d.name?.toUpperCase()));
      for (const dep of DEFAULT_MASTER_DATA.departments) {
        if (!existingDeptNames.has(dep.toUpperCase())) {
          setBulkImportStatus(`Configuring Department: ${dep}...`);
          try { await apiClient.post('/academics/departments', { name: dep }); } catch (e) {}
        }
      }

      // 6. Subjects
      const existingSubjNames = new Set((subjects || []).map(s => s.name?.toUpperCase()));
      for (const sub of DEFAULT_MASTER_DATA.subjects) {
        if (!existingSubjNames.has(sub.name.toUpperCase())) {
          setBulkImportStatus(`Configuring Subject: ${sub.name}...`);
          try { await apiClient.post('/academics/subjects', { name: sub.name, code: sub.code }); } catch (e) {}
        }
      }

      // 7. Exam Types
      const existingExamNames = new Set((examTypes || []).map(e => e.name?.toUpperCase()));
      for (const ex of DEFAULT_MASTER_DATA.examTypes) {
        if (!existingExamNames.has(ex.toUpperCase())) {
          setBulkImportStatus(`Configuring Exam Type: ${ex}...`);
          try { await apiClient.post('/academics/exam-types', { name: ex }); } catch (e) {}
        }
      }

      setBulkImportStatus('Refreshing school infrastructure data...');
      await fetchInfrastructure();
      setSuccess('🎉 1-Click Master Setup Completed! All Sections, Rooms, Grades, Capacities, Departments, Subjects & Exams are now configured.');
      setTimeout(() => setSuccess(''), 7000);
    } catch (err) {
      console.error('Auto setup error:', err);
      setError(err.response?.data?.error || 'Encountered an issue during bulk setup.');
    } finally {
      setBulkImporting(false);
      setBulkImportStatus('');
    }
  };

  const handleDownloadMasterTemplate = () => {
    const headers = ['Section', 'Room', 'GradeLevel', 'RoomCapacity', 'Department', 'Subject', 'ExamType'];
    const maxRows = Math.max(
      DEFAULT_MASTER_DATA.sections.length,
      DEFAULT_MASTER_DATA.rooms.length,
      DEFAULT_MASTER_DATA.grades.length,
      DEFAULT_MASTER_DATA.capacities.length,
      DEFAULT_MASTER_DATA.departments.length,
      DEFAULT_MASTER_DATA.subjects.length,
      DEFAULT_MASTER_DATA.examTypes.length
    );

    const rows = [];
    for (let i = 0; i < maxRows; i++) {
      const sec = DEFAULT_MASTER_DATA.sections[i] || '';
      const rm = DEFAULT_MASTER_DATA.rooms[i] || '';
      const gr = DEFAULT_MASTER_DATA.grades[i] || '';
      const cap = DEFAULT_MASTER_DATA.capacities[i] !== undefined ? DEFAULT_MASTER_DATA.capacities[i] : '';
      const dep = DEFAULT_MASTER_DATA.departments[i] || '';
      const sub = DEFAULT_MASTER_DATA.subjects[i]?.name || '';
      const ex = DEFAULT_MASTER_DATA.examTypes[i] || '';
      rows.push([sec, rm, gr, cap, dep, sub, ex].map(val => `"${val}"`).join(','));
    }

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EduVault_School_Master_Setup_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const splitCsvRow = (row) => {
    const result = [];
    let curr = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(curr.trim());
        curr = '';
      } else {
        curr += char;
      }
    }
    result.push(curr.trim());
    return result.map(s => s.replace(/^["']|["']$/g, '').trim());
  };

  const handleParseCsvFile = (file) => {
    if (!file) return;
    setBulkImportFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        alert('File is empty or has no data rows.');
        return;
      }

      const headerRow = splitCsvRow(lines[0]).map(h => h.toLowerCase());

      const colMap = {
        section: headerRow.findIndex(h => h.includes('section')),
        room: headerRow.findIndex(h => h.includes('room') && !h.includes('capacity')),
        grade: headerRow.findIndex(h => h.includes('grade') || h.includes('class')),
        capacity: headerRow.findIndex(h => h.includes('capacity')),
        department: headerRow.findIndex(h => h.includes('department') || h.includes('dept')),
        subject: headerRow.findIndex(h => h.includes('subject')),
        examType: headerRow.findIndex(h => h.includes('exam') || h.includes('test'))
      };

      const parsed = {
        sections: new Set(),
        rooms: new Set(),
        grades: new Set(),
        capacities: new Set(),
        departments: new Set(),
        subjects: new Set(),
        examTypes: new Set()
      };

      for (let r = 1; r < lines.length; r++) {
        const cols = splitCsvRow(lines[r]);
        if (colMap.section >= 0 && cols[colMap.section]) parsed.sections.add(cols[colMap.section]);
        if (colMap.room >= 0 && cols[colMap.room]) parsed.rooms.add(cols[colMap.room]);
        if (colMap.grade >= 0 && cols[colMap.grade]) parsed.grades.add(cols[colMap.grade]);
        if (colMap.capacity >= 0 && cols[colMap.capacity]) {
          const cNum = parseInt(cols[colMap.capacity]);
          if (!isNaN(cNum) && cNum > 0) parsed.capacities.add(cNum);
        }
        if (colMap.department >= 0 && cols[colMap.department]) parsed.departments.add(cols[colMap.department]);
        if (colMap.subject >= 0 && cols[colMap.subject]) parsed.subjects.add(cols[colMap.subject]);
        if (colMap.examType >= 0 && cols[colMap.examType]) parsed.examTypes.add(cols[colMap.examType]);
      }

      setBulkImportParsed({
        sections: Array.from(parsed.sections),
        rooms: Array.from(parsed.rooms),
        grades: Array.from(parsed.grades),
        capacities: Array.from(parsed.capacities),
        departments: Array.from(parsed.departments),
        subjects: Array.from(parsed.subjects),
        examTypes: Array.from(parsed.examTypes)
      });
    };
    reader.readAsText(file);
  };

  const handleExecuteCsvImport = async () => {
    if (!bulkImportParsed) return;
    setBulkImporting(true);
    setBulkImportStatus('Starting file bulk import...');
    try {
      const existingSec = new Set((sections || []).map(s => s.name?.toUpperCase()));
      for (const s of bulkImportParsed.sections) {
        if (!existingSec.has(s.toUpperCase())) {
          setBulkImportStatus(`Importing section: ${s}...`);
          try { await apiClient.post('/academics/sections', { name: s }); } catch (e) {}
        }
      }

      const existingRm = new Set((rooms || []).map(r => r.name?.toUpperCase()));
      for (const r of bulkImportParsed.rooms) {
        if (!existingRm.has(r.toUpperCase())) {
          setBulkImportStatus(`Importing room: ${r}...`);
          try { await apiClient.post('/academics/rooms', { name: r }); } catch (e) {}
        }
      }

      const existingGr = new Set((gradeLevels || []).map(g => g.name?.toUpperCase()));
      for (const g of bulkImportParsed.grades) {
        if (!existingGr.has(g.toUpperCase())) {
          setBulkImportStatus(`Importing grade: ${g}...`);
          try { await apiClient.post('/academics/enrollment-classes', { name: g }); } catch (e) {}
        }
      }

      const existingCap = new Set((capacities || []).map(c => c.value));
      for (const c of bulkImportParsed.capacities) {
        if (!existingCap.has(c)) {
          setBulkImportStatus(`Importing capacity: ${c}...`);
          try { await apiClient.post('/academics/capacities', { value: c }); } catch (e) {}
        }
      }

      const existingDep = new Set((departments || []).map(d => d.name?.toUpperCase()));
      for (const d of bulkImportParsed.departments) {
        if (!existingDep.has(d.toUpperCase())) {
          setBulkImportStatus(`Importing department: ${d}...`);
          try { await apiClient.post('/academics/departments', { name: d }); } catch (e) {}
        }
      }

      const existingSub = new Set((subjects || []).map(s => s.name?.toUpperCase()));
      for (const sub of bulkImportParsed.subjects) {
        if (!existingSub.has(sub.toUpperCase())) {
          setBulkImportStatus(`Importing subject: ${sub}...`);
          const code = sub.toUpperCase().replace(/\s+/g, '').slice(0, 6) || 'SUB';
          try { await apiClient.post('/academics/subjects', { name: sub, code }); } catch (e) {}
        }
      }

      const existingEx = new Set((examTypes || []).map(e => e.name?.toUpperCase()));
      for (const ex of bulkImportParsed.examTypes) {
        if (!existingEx.has(ex.toUpperCase())) {
          setBulkImportStatus(`Importing exam type: ${ex}...`);
          try { await apiClient.post('/academics/exam-types', { name: ex }); } catch (e) {}
        }
      }

      await fetchInfrastructure();
      setShowBulkImportModal(false);
      setBulkImportParsed(null);
      setBulkImportFile(null);
      setSuccess('🎉 Master data successfully imported from file into school infrastructure!');
      setTimeout(() => setSuccess(''), 7000);
    } catch (err) {
      console.error('Import error:', err);
      setError('Import encountered an error.');
    } finally {
      setBulkImporting(false);
      setBulkImportStatus('');
    }
  };

  const getSubjectTheme = (name = '') => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('math')) return { bg: 'bg-emerald-50/90 hover:bg-emerald-100/90', border: 'border-emerald-200', text: 'text-emerald-950', badge: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' };
    if (lower.includes('sci') || lower.includes('phy') || lower.includes('chem') || lower.includes('bio')) return { bg: 'bg-cyan-50/90 hover:bg-cyan-100/90', border: 'border-cyan-200', text: 'text-cyan-950', badge: 'bg-cyan-100 text-cyan-800', dot: 'bg-cyan-500' };
    if (lower.includes('eng')) return { bg: 'bg-violet-50/90 hover:bg-violet-100/90', border: 'border-violet-200', text: 'text-violet-950', badge: 'bg-violet-100 text-violet-800', dot: 'bg-violet-500' };
    if (lower.includes('hin') || lower.includes('sans')) return { bg: 'bg-amber-50/90 hover:bg-amber-100/90', border: 'border-amber-200', text: 'text-amber-950', badge: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500' };
    if (lower.includes('pe') || lower.includes('phys') || lower.includes('sport')) return { bg: 'bg-orange-50/90 hover:bg-orange-100/90', border: 'border-orange-200', text: 'text-orange-950', badge: 'bg-orange-100 text-orange-800', dot: 'bg-orange-500' };
    if (lower.includes('art') || lower.includes('draw') || lower.includes('music')) return { bg: 'bg-pink-50/90 hover:bg-pink-100/90', border: 'border-pink-200', text: 'text-pink-950', badge: 'bg-pink-100 text-pink-800', dot: 'bg-pink-500' };
    if (lower.includes('comp') || lower.includes('it') || lower.includes('tech')) return { bg: 'bg-blue-50/90 hover:bg-blue-100/90', border: 'border-blue-200', text: 'text-blue-950', badge: 'bg-blue-100 text-blue-800', dot: 'bg-blue-500' };
    if (lower.includes('soc') || lower.includes('hist') || lower.includes('geo') || lower.includes('civ')) return { bg: 'bg-teal-50/90 hover:bg-teal-100/90', border: 'border-teal-200', text: 'text-teal-950', badge: 'bg-teal-100 text-teal-800', dot: 'bg-teal-500' };
    return { bg: 'bg-indigo-50/70 hover:bg-indigo-100/80', border: 'border-indigo-200', text: 'text-indigo-950', badge: 'bg-indigo-100 text-indigo-800', dot: 'bg-indigo-500' };
  };

  const handleClearAllTimetable = async () => {
    if (!selectedClassId) return;
    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
    const gradeTitle = activeGradeGroup?.formattedGrade || 'Selected Class';
    const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';

    if (!window.confirm(`Are you sure you want to clear ALL timetable slots for ${gradeTitle}${secInfo}?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/timetable/class/${selectedClassId}`);
      await fetchClassSchedule(selectedClassId);
      setSuccess(`🧹 All timetable slots cleared successfully for ${gradeTitle}${secInfo}.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear class timetable.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearPeriodRow = async (periodNumber) => {
    if (!selectedClassId) return;
    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
    const gradeTitle = activeGradeGroup?.formattedGrade || 'Selected Class';

    if (!window.confirm(`Are you sure you want to clear all slots for Period ${periodNumber} across all days for ${gradeTitle}?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/timetable/class/${selectedClassId}/period/${periodNumber}`);
      await fetchClassSchedule(selectedClassId);
      setSuccess(`🧹 All slots for Period ${periodNumber} cleared successfully.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear period row.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearDayColumn = async (dayOfWeek) => {
    if (!selectedClassId) return;
    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
    const gradeTitle = activeGradeGroup?.formattedGrade || 'Selected Class';

    if (!window.confirm(`Are you sure you want to clear all period slots on ${dayOfWeek} for ${gradeTitle}?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/timetable/class/${selectedClassId}/day/${dayOfWeek}`);
      await fetchClassSchedule(selectedClassId);
      setSuccess(`🧹 All periods on ${dayOfWeek} cleared successfully.`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to clear day column.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSingleSlot = async (e, day, periodNumber) => {
    e.stopPropagation();
    if (!selectedClassId) return;
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [selectedClassId];
      for (const clsId of targetClassIds) {
        await apiClient.post('/academics/timetable/schedule', {
          classId: clsId,
          dayOfWeek: day,
          periodNumber: periodNumber,
          subjectId: null,
          teacherId: null,
          remark: ''
        });
      }
      await fetchClassSchedule(selectedClassId);
    } catch (err) {
      console.error('Failed to clear slot:', err);
    }
  };

  // Tab 2 grid handlers
  const handleCellClick = (day, periodNo) => {
    setModalError('');
    const item = scheduleItems.find(s => s.dayOfWeek === day && s.periodNumber === periodNo);
    setSelectedCell({ day, periodNo, item });

    const subjectObj = item?.subjectId ? subjects.find(s => s.id === item.subjectId) : null;
    const initialDept = subjectObj?.department || '';

    setCellForm({
      departmentName: initialDept,
      subjectId: item?.subjectId || '',
      teacherId: item?.teacherId || '',
      remark: item?.remark || ''
    });
    setShowCellModal(true);
  };

  const handleSaveCell = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const isClearing = !cellForm.subjectId || !cellForm.teacherId;
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : (selectedClassId ? [selectedClassId] : []);

      for (const cId of targetClassIds) {
        await apiClient.post('/academics/timetable/schedule', {
          classId: cId,
          subjectId: isClearing ? null : cellForm.subjectId,
          customSubjectName: null,
          teacherId: isClearing ? null : cellForm.teacherId,
          periodNumber: selectedCell.periodNo,
          dayOfWeek: selectedCell.day
        });
      }

      // If there's an existing item and we saved a remark
      if (selectedCell.item && cellForm.remark !== (selectedCell.item.remark || '')) {
        await apiClient.post(`/academics/timetable/remark/${selectedCell.item.id}`, {
          remark: cellForm.remark
        });
      }

      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
      fetchActiveAlerts();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to save timetable configuration.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleClearSlot = async () => {
    setModalError('');
    setModalLoading(true);
    try {
      const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
      const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : (selectedClassId ? [selectedClassId] : []);

      for (const cId of targetClassIds) {
        await apiClient.post('/academics/timetable/schedule', {
          classId: cId,
          subjectId: null,
          customSubjectName: null,
          teacherId: null,
          periodNumber: selectedCell.periodNo,
          dayOfWeek: selectedCell.day
        });
      }
      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
      fetchActiveAlerts();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to clear timetable cell.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleCellAddRemark = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedCell.item) return;
    setModalError('');
    setModalLoading(true);
    try {
      await apiClient.post(`/academics/timetable/remark/${selectedCell.item.id}`, {
        remark: cellForm.remark
      });
      setShowCellModal(false);
      fetchClassSchedule(selectedClassId);
      fetchActiveAlerts();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to post remark.');
    } finally {
      setModalLoading(false);
    }
  };

  // Tab 3 Substitution handlers
  const handleSelectAlert = async (alertItem) => {
    setSelectedAlertItem(alertItem);
    setSelectedSubTeacherId('');
    setAvailableSubstitutes([]);
    try {
      const res = await apiClient.get(`/academics/timetable/substitutes/${alertItem.id}`);
      setAvailableSubstitutes(res.data);
    } catch (err) {
      console.error('Error fetching free teachers:', err);
    }
  };

  const handleConfirmSubstitute = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedSubTeacherId || !selectedAlertItem) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post(`/academics/timetable/reassign/${selectedAlertItem.id}`, {
        teacherId: selectedSubTeacherId
      });
      setSuccess('Class rescheduled to substitute teacher successfully!');
      setSelectedAlertItem(null);
      fetchActiveAlerts();
      if (selectedClassId) {
        fetchClassSchedule(selectedClassId);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reassign substitute.');
    } finally {
      setLoading(false);
    }
  };

  const evaluateLivePreview = (pattern, role) => {
    if (!pattern) return '';
    const yr = new Date().getFullYear().toString();
    const cleanSampleName = role === 'teacher' ? 'rohan' : role === 'receptionist' ? 'priya' : role === 'accountant' ? 'amit' : 'shashi';
    const name3 = cleanSampleName.slice(0, 3);
    const last3 = role === 'teacher' ? 'sha' : role === 'receptionist' ? 'ver' : role === 'accountant' ? 'pat' : 'kum';
    const birthYear = role === 'student' ? '2015' : '1990';
    const school3 = 'edu';

    let res = pattern;
    res = res.replace(/\{name3\}|\{first3\}/gi, name3);
    res = res.replace(/\{name\}|\{firstname\}/gi, cleanSampleName);
    res = res.replace(/\{lastname3\}|\{last3\}/gi, last3);
    res = res.replace(/\{school3\}/gi, school3);
    res = res.replace(/\{currentyear\}|\{year\}/gi, yr);
    res = res.replace(/\{birthyear\}|\{dobyear\}/gi, birthYear);
    res = res.replace(/\{stu\}|\{tea\}|\{rec\}|\{acc\}|\{role3\}/gi, name3);
    res = res.replace(/(?<=[\W_]|^)currentyear(?=[\W_]|$)/gi, yr);
    res = res.replace(/(?<=[\W_]|^)birthyear(?=[\W_]|$)/gi, birthYear);

    if (role === 'student' && /^stu(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^stu/i, name3);
    } else if (role === 'teacher' && /^tea(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^tea/i, name3);
    } else if (role === 'receptionist' && /^rec(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^rec/i, name3);
    } else if (role === 'accountant' && /^acc(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^acc/i, name3);
    }

    if (res.length < 6) {
      res = `${res}!${yr}`;
    }
    return res;
  };

  const fetchPasswordRules = async () => {
    setLoadingPasswordRules(true);
    try {
      const res = await apiClient.get('/academics/settings/password-rules');
      if (res.data) {
        setPasswordRules({
          studentPasswordPattern: res.data.studentPasswordPattern || 'stu@currentyear!',
          teacherPasswordPattern: res.data.teacherPasswordPattern || 'tea@currentyear!',
          receptionistPasswordPattern: res.data.receptionistPasswordPattern || 'rec@currentyear!',
          accountantPasswordPattern: res.data.accountantPasswordPattern || 'acc@currentyear!'
        });
        if (res.data.previews) {
          setPasswordPreviews(res.data.previews);
        }
      }
    } catch (err) {
      console.warn('Could not load password rules:', err);
    } finally {
      setLoadingPasswordRules(false);
    }
  };

  const handleSavePasswordRules = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSavingPasswordRules(true);
    setError('');
    setSuccess('');
    try {
      const res = await apiClient.post('/academics/settings/password-rules', passwordRules);
      setSuccess(res.data?.message || 'Password pattern rules saved successfully.');
      if (res.data?.previews) {
        setPasswordPreviews(res.data.previews);
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save password rules.');
    } finally {
      setSavingPasswordRules(false);
    }
  };

  const handleResetPasswordRules = () => {
    setPasswordRules({
      studentPasswordPattern: 'stu@currentyear!',
      teacherPasswordPattern: 'tea@currentyear!',
      receptionistPasswordPattern: 'rec@currentyear!',
      accountantPasswordPattern: 'acc@currentyear!'
    });
  };

  const groupedSubjects = subjects.reduce((groups, s) => {
    const dept = s.department || 'Other Subjects';
    if (!groups[dept]) {
      groups[dept] = [];
    }
    groups[dept].push(s);
    return groups;
  }, {});

  return (
    <div>
      <Topbar title="Academic Setup & Configurations" subtitle="Dashboard › Academics › Setup" />

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 mt-4 px-6 overflow-x-auto whitespace-nowrap scrollbar-none gap-6">
        {[
          { id: 'infrastructure', label: 'Infrastructure Setup', icon: '📂' },
          { id: 'timetable', label: 'Weekly Timetable Config', icon: '📅', action: fetchTimetableMeta },
          { id: 'substitutions', label: 'Substitution & Cover Alerts', icon: '👩‍🏫', badge: activeAlerts.length, action: fetchActiveAlerts },
          { id: 'fees', label: 'Fee Rules Setup', icon: '💰', action: fetchFeeSetupData },
          { id: 'class-subjects', label: 'Class Subjects Mapping', icon: '📚', action: fetchClassSubjectsData },
          { id: 'promotion-setup', label: 'Student Promotion Setup', icon: '🚀', action: fetchPromotionSetupData },
          { id: 'password-rules', label: 'Password Rules Setup', icon: '🔐', action: fetchPasswordRules },
          { id: 'billing', label: 'Billing & Subscription', icon: '💳', action: fetchSubscriptionInfo }
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError('');
                setSuccess('');
                if (tab.action) tab.action();
              }}
              className={`flex items-center gap-2 pb-3.5 text-xs font-bold transition-all relative border-b-2 ${
                isActive
                  ? 'text-primary border-primary'
                  : 'text-gray-400 border-transparent hover:text-gray-700'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500 text-white ml-0.5">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3.5">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-600 text-xs font-semibold rounded-lg p-3.5">{success}</div>}

        {/* Tab 1 Content */}
        {activeTab === 'infrastructure' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* School Timing & GPS Geofence Settings */}
            {(() => {
              const isAppModeEnabled = (schoolSettings.attendanceModes || ['app', 'biometric']).includes('app');
              return (
                <div className="card col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/20 border border-blue-100/80 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-gray-100">
                    <div>
                      <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                        {isAppModeEnabled ? '⏰ School Timings & 📍 Geofence GPS Radius Setup' : '⏰ School Timings Setup'}
                      </h3>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {isAppModeEnabled 
                          ? 'Configure official school operating hours, grace period, and 300m GPS radius for teacher punch-in / punch-out location validation.' 
                          : 'Configure official school operating hours, grace period, and working hour thresholds for teacher attendance.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAppModeEnabled && (
                        <button
                          type="button"
                          onClick={handleDetectSchoolGps}
                          disabled={detectingGps}
                          className="px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all flex items-center gap-1.5 shadow-xs"
                        >
                          {detectingGps ? '📡 Locating...' : '📍 Auto-Detect Current GPS'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveSchoolSettings}
                        disabled={savingSettings}
                        className="btn-primary text-xs py-2 px-5 rounded-xl font-bold flex items-center gap-1.5 shadow-md"
                      >
                        {savingSettings ? 'Saving...' : '💾 Save Settings'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">School Start Time *</label>
                      <input
                        type="time"
                        value={schoolSettings.schoolStartTime}
                        onChange={e => setSchoolSettings(s => ({ ...s, schoolStartTime: e.target.value }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Official daily opening time</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Grace Period (Minutes) *</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={schoolSettings.gracePeriodMinutes}
                        onChange={e => setSchoolSettings(s => ({ ...s, gracePeriodMinutes: parseInt(e.target.value) || 0 }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-amber-600 font-bold mt-1 block">Late marked after {schoolSettings.schoolStartTime} + {schoolSettings.gracePeriodMinutes} mins</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Half-Day (Hours) *</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        step="0.5"
                        value={schoolSettings.minHalfDayHours}
                        onChange={e => setSchoolSettings(s => ({ ...s, minHalfDayHours: parseFloat(e.target.value) || 4 }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Punches &lt; {schoolSettings.minHalfDayHours} hrs marked Half Day</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">School End Time *</label>
                      <input
                        type="time"
                        value={schoolSettings.schoolEndTime}
                        onChange={e => setSchoolSettings(s => ({ ...s, schoolEndTime: e.target.value }))}
                        className="input text-xs font-semibold"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block">Punch-out window start</span>
                    </div>

                    {isAppModeEnabled && (
                      <>
                        <div className="lg:col-span-2">
                          <label className="block text-xs font-bold text-gray-700 mb-1">School Campus Address</label>
                          <input
                            type="text"
                            placeholder="Enter official school building address..."
                            value={schoolSettings.address}
                            onChange={e => setSchoolSettings(s => ({ ...s, address: e.target.value }))}
                            className="input text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">GPS Latitude *</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={schoolSettings.latitude}
                            onChange={e => setSchoolSettings(s => ({ ...s, latitude: parseFloat(e.target.value) || 0 }))}
                            className="input text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">GPS Longitude *</label>
                          <input
                            type="number"
                            step="0.000001"
                            value={schoolSettings.longitude}
                            onChange={e => setSchoolSettings(s => ({ ...s, longitude: parseFloat(e.target.value) || 0 }))}
                            className="input text-xs font-mono"
                          />
                        </div>

                        <div className="lg:col-span-4 bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                              🎯
                            </div>
                            <div>
                              <span className="font-black text-emerald-950">300m Geofence Radius Active: </span>
                              <span className="text-emerald-800">Teachers must be within <strong>{schoolSettings.geofenceRadiusMeters || 300} meters</strong> radius of coordinates ({schoolSettings.latitude}, {schoolSettings.longitude}) to punch in or out.</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="font-bold text-emerald-950 whitespace-nowrap">Radius (meters):</label>
                            <input
                              type="number"
                              min="50"
                              max="2000"
                              value={schoolSettings.geofenceRadiusMeters}
                              onChange={e => setSchoolSettings(s => ({ ...s, geofenceRadiusMeters: parseInt(e.target.value) || 300 }))}
                              className="w-24 input text-xs py-1.5 px-2 text-center bg-white font-extrabold text-emerald-900 border border-emerald-300 rounded-lg focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Master Data Setup & Import Hub */}
            <div className="card col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-slate-900 via-primary-dark to-slate-900 text-white p-6 rounded-2xl shadow-xl border border-primary/20 relative overflow-hidden">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      ⚡ Quick Infrastructure Hub
                    </span>
                    <span className="text-xs text-slate-300">Sections, Rooms, Grades, Capacities, Depts, Subjects & Exams</span>
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">
                    School Master Setup & Bulk Excel Import
                  </h3>
                  <p className="text-xs text-slate-300/80 max-w-2xl leading-relaxed">
                    No need to enter records manually one by one. Use <strong>1-Click Complete School Setup</strong> to instantly configure all standard Sections (A-F), Rooms (1-10), Grades (Playgroup to 12th), Capacities (10-80), Departments, Subjects, and Exam types, or upload your custom Excel / CSV template.
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300 font-semibold">
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">📂 {sections.length} Sections</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">🏫 {rooms.length} Rooms</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">🎓 {gradeLevels.length} Grades</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">👥 {capacities.length} Capacities</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">🏢 {departments.length} Depts</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">📖 {subjects.length} Subjects</span>
                    <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10">📝 {examTypes.length} Exams</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={handleOneClickSetup}
                    disabled={bulkImporting}
                    className="px-5 py-3 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{bulkImporting ? 'Configuring...' : '⚡ 1-Click Complete School Setup'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowBulkImportModal(true); setBulkImportParsed(null); setBulkImportFile(null); }}
                    disabled={bulkImporting}
                    className="px-5 py-3 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>📥 Import Excel / CSV</span>
                  </button>
                </div>
              </div>

              {bulkImportStatus && (
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-2 text-xs font-semibold text-amber-300 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  <span>{bulkImportStatus}</span>
                </div>
              )}
            </div>

            {/* Section Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                📂 School Sections
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and organize sections for your school classes.</p>

              <form onSubmit={handleAddSection} className="flex gap-2 mb-5">
                <input
                  required
                  value={newSection}
                  onChange={e => setNewSection(e.target.value)}
                  placeholder="e.g. Section D"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingSec} className="btn-primary text-xs py-2">
                  {loadingSec ? 'Adding...' : '+ Add Section'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Section Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{s.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteSection(s.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Section"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sections.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No sections registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Room Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                Classrooms & Rooms
              </h3>
              <p className="text-gray-400 text-xs mb-4">Manage room codes and locations for educational scheduling.</p>

              <form onSubmit={handleAddRoom} className="flex gap-2 mb-5">
                <input
                  required
                  value={newRoom}
                  onChange={e => setNewRoom(e.target.value)}
                  placeholder="e.g. Room 205"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingRm} className="btn-primary text-xs py-2">
                  {loadingRm ? 'Adding...' : '+ Add Room'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Room Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rooms.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{r.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteRoom(r.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Room"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {rooms.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No rooms registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grade Level Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                🎓 Grade Levels
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage class grades configured for your school.</p>

              <form onSubmit={handleAddGradeLevel} className="flex gap-2 mb-5">
                <input
                  required
                  value={newGradeLevel}
                  onChange={e => setNewGradeLevel(e.target.value)}
                  placeholder="e.g. Class 10"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingGl} className="btn-primary text-xs py-2">
                  {loadingGl ? 'Adding...' : '+ Add Grade'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Grade Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradeLevels.map(gl => (
                      <tr key={gl.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{gl.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteGradeLevel(gl.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Grade Level"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {gradeLevels.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No grade levels registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Capacity Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                👥 Classroom Capacities
              </h3>
              <p className="text-gray-400 text-xs mb-4">Set standard class enrollment thresholds.</p>

              <form onSubmit={handleAddCapacity} className="flex gap-2 mb-5">
                <input
                  required
                  type="number"
                  value={newCapacity}
                  onChange={e => setNewCapacity(e.target.value)}
                  placeholder="e.g. 35"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingCap} className="btn-primary text-xs py-2">
                  {loadingCap ? 'Adding...' : '+ Add Capacity'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Student Capacity</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capacities.map(c => (
                      <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{c.value} students</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteCapacity(c.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Capacity Option"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {capacities.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No capacity limits registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Department Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                🏢 Academic Departments
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage departments for teacher profiles.</p>

              <form onSubmit={handleAddDepartment} className="flex gap-2 mb-5">
                <input
                  required
                  value={newDepartment}
                  onChange={e => setNewDepartment(e.target.value)}
                  placeholder="e.g. Science & Mathematics"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingDept} className="btn-primary text-xs py-2">
                  {loadingDept ? 'Adding...' : '+ Add Dept'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Department Name</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(d => (
                      <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{d.name}</td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="badge badge-success text-xs">Active</span>
                            <button
                              onClick={() => handleDeleteDepartment(d.id)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Department"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {departments.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No departments registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Subjects Management */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                📚 School Subjects
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage subjects for classrooms and exam configurations.</p>

              <div className="flex gap-2 mb-5">
                <input
                  required
                  value={newSubName}
                  onChange={e => setNewSubName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleAddSubject();
                    }
                  }}
                  placeholder="e.g. Hindi"
                  className="input text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => handleAddSubject()}
                  disabled={loadingSub}
                  className="btn-primary text-xs py-2"
                >
                  {loadingSub ? 'Adding...' : '+ Add Subject'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Subject</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{s.name}</td>
                        <td className="py-3 text-sm text-right">
                          <button
                            onClick={() => handleDeleteSubject(s.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Subject"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {subjects.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No subjects registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Examinations Setup Card */}
            <div className="card flex flex-col h-[420px]">
              <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                📋 Examinations Setup
              </h3>
              <p className="text-gray-400 text-xs mb-4">Add and manage examination types/cycles for scheduling and report cards.</p>

              <form onSubmit={handleAddExamType} className="flex gap-2 mb-5">
                <input
                  required
                  value={newExamType}
                  onChange={e => setNewExamType(e.target.value)}
                  placeholder="e.g. Mid-term assessment"
                  className="input text-sm flex-1"
                />
                <button type="submit" disabled={loadingExamTypes} className="btn-primary text-xs py-2">
                  {loadingExamTypes ? 'Adding...' : '+ Add Exam'}
                </button>
              </form>

              <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase bg-white">Examination Type</th>
                      <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right bg-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examTypes.map(et => (
                      <tr key={et.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-3 text-sm font-semibold text-primary">{et.name}</td>
                        <td className="py-3 text-sm text-right">
                          <button
                            onClick={() => handleDeleteExamType(et.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Examination Type"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {examTypes.length === 0 && (
                      <tr>
                        <td colSpan="2" className="text-center py-4 text-gray-400 text-xs">No examination types registered yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2 Content */}
        {activeTab === 'timetable' && (
          <div className="space-y-6">
            {/* Periods Configuration Section */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-display font-bold text-primary text-base flex items-center gap-1.5">
                    ⚙️ Manage School Timetable Periods
                  </h3>
                  <p className="text-gray-400 text-xxs">Add or remove period rows, and adjust the start/end times displayed in the scheduler.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoSetupPeriods}
                    disabled={loadingPeriods}
                    className="btn-outline text-xxs py-1.5 px-3 border-amber-500/30 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold flex items-center gap-1"
                  >
                    ⚡ Auto Standard 6 Periods
                  </button>
                  <button
                    onClick={handleAddPeriod}
                    className="btn-outline text-xxs py-1.5 px-3 border-primary/20 text-primary hover:bg-primary/5 font-semibold"
                  >
                    + Add Period
                  </button>
                  <button
                    onClick={handleSavePeriods}
                    disabled={loadingPeriods}
                    className="btn-primary text-xxs py-1.5 px-3 font-semibold"
                  >
                    {loadingPeriods ? 'Saving...' : 'Save Periods'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {periods.map((p, idx) => (
                  <div key={p.id || idx} className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2 relative group">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-xs">Period {idx + 1}</span>
                      <button
                        onClick={() => handleDeletePeriod(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-100 rounded transition-colors"
                        title="Delete Period"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xxs font-semibold text-gray-500">
                      <div>
                        <label className="block mb-0.5">Start Time</label>
                        <input
                          type="time"
                          value={p.startTime}
                          onChange={e => handlePeriodTimeChange(idx, 'startTime', e.target.value)}
                          className="input py-1 px-2 text-xs w-full font-medium"
                        />
                      </div>
                      <div>
                        <label className="block mb-0.5">End Time</label>
                        <input
                          type="time"
                          value={p.endTime}
                          onChange={e => handlePeriodTimeChange(idx, 'endTime', e.target.value)}
                          className="input py-1 px-2 text-xs w-full font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {periods.length === 0 && (
                  <div className="col-span-full text-center py-4 text-gray-400 text-xs italic">
                    No periods defined. Click "+ Add Period" to begin.
                  </div>
                )}
              </div>
            </div>

            {/* Timetable Scheduler Grid */}
            <div className="card space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                <div>
                  <h3 className="font-display font-bold text-primary text-lg">Weekly Class Timetable Scheduler</h3>
                  <p className="text-gray-400 text-xs">Configure subjects, times, and teacher assignments. Double-bookings are automatically prevented.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Selected Class:</label>
                  <select
                    value={(() => {
                      const active = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                      return active ? active.primaryClassId : selectedClassId;
                    })()}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="input flex-1 sm:w-60 text-sm font-semibold text-slate-800"
                  >
                    <option value="">Select Class</option>
                    {uniqueGradeClasses.map(g => (
                      <option key={g.formattedGrade} value={g.primaryClassId}>
                        {g.formattedGrade} {g.sections.length > 0 ? `(Sections: ${g.sections.join(', ')})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      setAiTimetableScope(selectedClassId ? 'selected' : 'all');
                      setShowAiTimetableModal(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
                    title="Generate intelligent conflict-free timetable using AI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>🤖 AI Smart Timetable Generator</span>
                  </button>

                  {selectedClassId && (
                    <button
                      type="button"
                      onClick={() => handleGenerateAiTimetable('selected')}
                      disabled={aiGeneratingTimetable}
                      className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                      title="Regenerate timetable for selected class"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${aiGeneratingTimetable ? 'animate-spin' : ''}`} />
                      <span>{aiGeneratingTimetable ? 'Regenerating...' : '🔄 Regenerate Class'}</span>
                    </button>
                  )}

                  {selectedClassId && (
                    <button
                      type="button"
                      onClick={handleClearAllTimetable}
                      disabled={loading || scheduleItems.length === 0}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Clear all timetable slots for selected class"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Clear All Slots</span>
                    </button>
                  )}

                  {selectedClassId && (
                    <button
                      type="button"
                      onClick={handleAutoFillClassTimetable}
                      disabled={loading}
                      className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 font-bold text-xs flex items-center gap-1.5 transition"
                      title="Quick-fill sample schedule for this class"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>⚡ Quick Sample</span>
                    </button>
                  )}

                  <a
                    href="/demo-templates/06_timetable_schedule_demo.csv"
                    download="06_timetable_schedule_demo.csv"
                    className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition"
                    title="Download Timetable CSV template"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Demo CSV</span>
                  </a>
                </div>
              </div>

              {selectedClassId ? (() => {
                const totalSlots = periods.length * days.length;
                const scheduledSlots = scheduleItems.filter(s => s.teacherId || (s.subjectName && s.subjectName !== 'Free Period')).length;
                const pct = totalSlots > 0 ? Math.round((scheduledSlots / totalSlots) * 100) : 0;
                const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                const activeGradeTitle = activeGradeGroup?.formattedGrade || 'This Class';

                return (
                  <div className="space-y-3">
                    {/* Notice if Class has No Subjects Mapped */}
                    {selectedClassMappedSubjects.length === 0 && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                        <div className="flex items-start gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-sm">
                            ⚠️
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-display font-extrabold text-amber-950 text-sm">
                                Subjects Not Mapped: Timetable Not Created
                              </h4>
                              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                                Action Required
                              </span>
                            </div>
                            <p className="text-amber-900 text-xs mt-1 leading-relaxed">
                              No subjects are linked to <strong>{activeGradeTitle}</strong> in <em>Subjects Curriculum</em>. Due to this, the timetable schedule cannot be generated. Please first map subjects to this class.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setMappingClassId(selectedClassId);
                            setActiveTab('class-subjects');
                            fetchClassSubjectsData();
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition cursor-pointer shrink-0 hover:scale-105 active:scale-95 whitespace-nowrap"
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>👉 Map Subjects for {activeGradeTitle}</span>
                        </button>
                      </div>
                    )}

                    {/* Status Strip & Legend */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <span className={`w-2.5 h-2.5 rounded-full ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                          <span>Status: {scheduledSlots} / {totalSlots} Slots Scheduled ({pct}%)</span>
                        </div>
                        <div className="w-28 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-indigo-600' : 'bg-amber-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Subject Color Legend */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600 font-medium">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Legend:</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Math
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Science
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-50 text-violet-800 border border-violet-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" /> English
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Hindi
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Sports/PE
                        </span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-pink-50 text-pink-800 border border-pink-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Art
                        </span>
                      </div>
                    </div>

                    {/* Timetable Grid Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                            <th className="p-3 text-center text-xs font-bold uppercase tracking-wider w-36 border-r border-slate-200">
                              Period / Time
                            </th>
                            {days.map(d => {
                              const dayCount = scheduleItems.filter(s => s.dayOfWeek === d && (s.teacherId || (s.subjectName && s.subjectName !== 'Free Period'))).length;
                              return (
                                <th key={d} className="p-3 text-center border-r border-slate-200 last:border-r-0 min-w-[170px]">
                                  <div className="flex items-center justify-between gap-1 px-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">{d}</span>
                                      <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${dayCount > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-500'}`}>
                                        {dayCount}/{periods.length}
                                      </span>
                                    </div>
                                    {dayCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClearDayColumn(d);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-md transition-colors cursor-pointer"
                                        title={`Clear all periods on ${d}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {periods.map(p => {
                            const periodCount = scheduleItems.filter(s => s.periodNumber === p.periodNumber && (s.teacherId || (s.subjectName && s.subjectName !== 'Free Period'))).length;
                            return (
                              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                                {/* Period Row Header with quick clear */}
                                <td className="p-3 bg-slate-50/70 border-r border-slate-200 align-middle">
                                  <div className="flex items-center justify-between gap-1">
                                    <div>
                                      <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1">
                                        <span>Period {p.periodNumber}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                                        <span>{p.startTime} - {p.endTime}</span>
                                      </div>
                                    </div>
                                    {periodCount > 0 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleClearPeriodRow(p.periodNumber);
                                        }}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-100/70 rounded-md transition-colors cursor-pointer"
                                        title={`Clear Period ${p.periodNumber} across all days`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Period Days Slots */}
                                {days.map(day => {
                                  const cell = scheduleItems.find(s => s.dayOfWeek === day && s.periodNumber === p.periodNumber);
                                  const isAssigned = cell && (cell.teacherId || (cell.subjectName && cell.subjectName !== 'Free Period'));
                                  const theme = isAssigned ? getSubjectTheme(cell.subjectName) : null;

                                  return (
                                    <td
                                      key={day}
                                      className="p-2 border-r border-slate-200 last:border-r-0 align-top transition-colors min-w-[170px]"
                                    >
                                      {isAssigned ? (
                                        <div
                                          onClick={() => handleCellClick(day, p.periodNumber)}
                                          className={`group/card relative p-2.5 rounded-xl border transition-all duration-150 cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 ${theme.bg} ${theme.border}`}
                                        >
                                          {/* Hover quick clear button */}
                                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                            <button
                                              type="button"
                                              onClick={(e) => handleClearSingleSlot(e, day, p.periodNumber)}
                                              className="p-1 rounded-md bg-white/90 hover:bg-rose-100 text-slate-400 hover:text-rose-600 shadow-xs transition cursor-pointer"
                                              title="Clear this slot"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>

                                          <div className="flex items-center gap-1.5 pr-5">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot}`} />
                                            <span className={`font-bold text-xs leading-tight truncate ${theme.text}`}>
                                              {cell.subjectName || 'Subject'}
                                            </span>
                                          </div>

                                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-600 font-medium truncate">
                                            <span className="opacity-70">👤</span>
                                            <span className="truncate">{cell.teacherName || 'Unassigned'}</span>
                                          </div>

                                          {cell.isRescheduled && (
                                            <span className="mt-1.5 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-800 border border-amber-300">
                                              ⚡ COVER ASSIGNED
                                            </span>
                                          )}

                                          {cell.remark && (
                                            <div
                                              title={cell.remark}
                                              className="bg-rose-100/70 border border-rose-200/80 text-rose-700 text-[10px] p-1 rounded-md mt-1 font-medium truncate"
                                            >
                                              ⚠️ {cell.remark}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleCellClick(day, p.periodNumber)}
                                          className="w-full h-full min-h-[64px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 p-2 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-indigo-600 transition-all cursor-pointer group/empty"
                                          title={`Click to schedule Period ${p.periodNumber} on ${day}`}
                                        >
                                          <span className="text-xs font-semibold group-hover/empty:scale-110 transition-transform">+ Assign</span>
                                        </button>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-12 text-gray-400 text-sm">Please select a class/section above to manage its timetable schedule.</div>
              )}
            </div>
          </div>
        )}



        {/* Tab 3 Content */}
        {activeTab === 'substitutions' && (
          <div className="space-y-6">
            {/* AI Smart Absenteeism Cover & WhatsApp Engine */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-lg border border-indigo-800/40">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <span>🤖 AI Smart Teacher Absenteeism & WhatsApp Substitution Engine</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    When a teacher is absent, AI scans all their scheduled periods for the day, auto-detects free teachers, reassigns coverage, and dispatches in-app and WhatsApp notifications.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto shrink-0">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                    <span className="text-xs font-bold text-amber-300 whitespace-nowrap">Absent Educator:</span>
                    <select
                      value={absentTeacherId}
                      onChange={e => handleAnalyzeTeacherAbsence(e.target.value)}
                      className="bg-slate-800 text-white font-semibold text-xs rounded-lg px-2.5 py-1 border border-white/20 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">Select Absent Teacher...</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.department || 'Faculty'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Absence Analysis Results */}
              {aiAnalyzingAbsence && (
                <div className="py-6 flex items-center justify-center gap-2 text-xs font-semibold text-amber-300 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  <span>AI analyzing today's timetable periods & free teacher availability...</span>
                </div>
              )}

              {absentTeacherId && !aiAnalyzingAbsence && (
                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-bold text-white">
                      Affected Teaching Periods for {teachers.find(t => t.id === absentTeacherId)?.name}: ({aiAbsencePlans.length} Classes Found Today)
                    </span>
                    <span className="text-amber-400 text-xxs font-semibold">⚡ AI Auto-Matched Free Period Faculty</span>
                  </div>

                  {aiAbsencePlans.length === 0 ? (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-slate-400 italic">
                      No scheduled teaching periods found for this teacher today.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {aiAbsencePlans.map((plan, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-white/10 border border-white/15 flex flex-col justify-between gap-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px] uppercase">
                                Period {plan.periodNumber} ({plan.dayOfWeek})
                              </span>
                              <h4 className="font-bold text-sm text-white mt-1.5">{plan.className}</h4>
                              <p className="text-xxs text-slate-300">
                                Subject: <span className="font-semibold text-indigo-300">{plan.subjectName}</span>
                              </p>
                            </div>

                            <div className="text-right">
                              <span className="text-xxs text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                                {plan.freeTeachers.length} Teachers Free
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] text-slate-400 mb-0.5">AI Proposed Substitute:</label>
                              <select
                                value={plan.assignedCoverTeacherId}
                                onChange={e => {
                                  const val = e.target.value;
                                  setAiAbsencePlans(prev => prev.map((p, i) => i === idx ? {
                                    ...p,
                                    assignedCoverTeacherId: val,
                                    assignedCoverTeacherName: teachers.find(t => t.id === val)?.name || 'Unassigned',
                                    coverTeacherPhone: teachers.find(t => t.id === val)?.phone || '9876543210'
                                  } : p));
                                }}
                                className="w-full bg-slate-900 border border-white/20 text-white text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none"
                              >
                                <option value="">Select Free Teacher...</option>
                                {plan.freeTeachers.map(ft => (
                                  <option key={ft.id} value={ft.id}>
                                    {ft.name} ({ft.department || 'Faculty'})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
                              <button
                                type="button"
                                onClick={() => handleExecuteAiSubstitution(plan)}
                                disabled={submittingAiCover || !plan.assignedCoverTeacherId}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition shadow-sm cursor-pointer disabled:opacity-50"
                                title="Confirm Substitution and dispatch in-app alert"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Assign Cover</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const coverTeacher = teachers.find(t => t.id === plan.assignedCoverTeacherId);
                                  const absentTeacher = teachers.find(t => t.id === absentTeacherId);
                                  const periodObj = periods.find(p => p.periodNumber === plan.periodNumber);
                                  const timeStr = periodObj ? `${periodObj.startTime} - ${periodObj.endTime}` : 'Scheduled Time';
                                  const whatsAppMsg = `🏫 *EduVault School - Substitution Alert*\n━━━━━━━━━━━━━━━━━━━━\nNamaste *${coverTeacher?.name || 'Educator'}*,\nToday *${absentTeacher?.name || 'Faculty'}* is on leave.\nYou have been assigned as the substitute teacher for:\n📚 *Subject:* ${plan.subjectName}\n👥 *Class:* ${plan.className}\n⏰ *Period:* Period ${plan.periodNumber} (${timeStr})\n🚪 *Classroom:* Room 3\n\nPlease supervise this class and mark attendance on EduVault.\n- *Academic Office*`;
                                  setWhatsAppPreviewData({
                                    teacherName: coverTeacher?.name,
                                    teacherPhone: coverTeacher?.phone || '9876543210',
                                    message: whatsAppMsg
                                  });
                                  setShowWhatsAppModal(true);
                                }}
                                disabled={!plan.assignedCoverTeacherId}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                                title="Preview and send WhatsApp Alert"
                              >
                                <span>💬 WhatsApp</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 card">
                <h3 className="font-display font-bold text-primary text-lg mb-2">Teacher Cover Requests & Remarks</h3>
                <p className="text-gray-400 text-xs mb-4">View notifications of schedule conflicts or teacher absences. Re-assign periods to free educators.</p>

              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => handleSelectAlert(alert)}
                    className={`p-4 border rounded-xl transition-all cursor-pointer ${selectedAlertItem?.id === alert.id ? 'border-primary bg-indigo-50/20 ring-1 ring-primary' : 'border-gray-100 hover:bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="badge badge-danger text-xxs mr-2">ABSENCE ALERT</span>
                        <span className="font-bold text-primary text-sm">{alert.className}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{alert.dayOfWeek} · Period {alert.periodNumber}</span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      Subject: <span className="font-semibold text-primary">{alert.subjectName}</span> · Current Teacher: <span className="font-semibold text-primary">{alert.teacherName}</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 text-xs p-2 rounded-lg font-medium flex items-center gap-1.5">
                      <span>⚠️ Teacher Remark:</span>
                      <span>"{alert.remark}"</span>
                    </div>
                  </div>
                ))}
                {activeAlerts.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm">No teacher absence remarks or reschedule alerts posted.</div>
                )}
              </div>
            </div>

            {/* Substitution Actions */}
            <div className="card">
              <h3 className="font-display font-bold text-primary text-lg mb-1">Cover Re-assignment</h3>
              <p className="text-gray-400 text-xs mb-4">Select an alert to view free educators and schedule coverage.</p>

              {selectedAlertItem ? (
                <form onSubmit={handleConfirmSubstitute} className="space-y-4">
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100 space-y-1 text-xs">
                    <div className="text-gray-400 uppercase tracking-wide font-bold">Reschedule Target</div>
                    <div className="font-semibold text-primary text-sm">{selectedAlertItem.className}</div>
                    <div className="text-gray-500">{selectedAlertItem.dayOfWeek} at Period {selectedAlertItem.periodNumber}</div>
                    <div className="text-gray-500">Subject: {selectedAlertItem.subjectName}</div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Free Substitute Teacher *</label>
                    <select
                      required
                      value={selectedSubTeacherId}
                      onChange={e => setSelectedSubTeacherId(e.target.value)}
                      className="input text-xs"
                    >
                      <option value="">Choose Substitute</option>
                      {availableSubstitutes.map(sub => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}{sub.department ? ` (${sub.department})` : ''}
                        </option>
                      ))}
                    </select>
                    {availableSubstitutes.length === 0 && (
                      <p className="text-xxs text-amber-600 font-semibold mt-1">⚠️ No other teachers are free during this period.</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedSubTeacherId}
                    className="w-full btn-primary justify-center font-bold text-xs py-3 rounded-xl transition-all"
                  >
                    {loading ? 'Rescheduling...' : 'Confirm Substitution Cover'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-12 text-gray-300 italic text-xs">Please select an alert from the left panel to execute re-assignment.</div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Tab 4 Content */}
        {activeTab === 'fees' && (() => {
          const totalVal = parseFloat(feeForm.amount) || 0;
          const sumComponents = feeComponents.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
          const unassignedAmount = totalVal - sumComponents;
          const isBreakdownValid = feeComponents.length === 0 || Math.abs(unassignedAmount) < 0.01;

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Fee Setup Rule Form */}
              <div className="card h-fit">
                <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                  💰 Define Fee Rule
                </h3>
                <p className="text-gray-400 text-xs mb-4">Set up class-wide or student-specific fee structures and divide into installment steps.</p>

                <form onSubmit={handleCreateFeeRule} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Class *</label>
                    <select
                      value={(() => {
                        const active = uniqueGradeClasses.find(g => g.classIds.includes(feeForm.classId));
                        return active ? active.primaryClassId : feeForm.classId;
                      })()}
                      onChange={e => setFeeForm(f => ({ ...f, classId: e.target.value, studentId: '' }))}
                      className="input text-xs"
                      required
                    >
                      <option value="">Choose Class</option>
                      {uniqueGradeClasses.map(g => (
                        <option key={g.formattedGrade} value={g.primaryClassId}>
                          {g.formattedGrade} {g.sections.length > 0 ? `(Sections: ${g.sections.join(', ')})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Rule Scope *</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          checked={feeForm.type === 'class'}
                          onChange={() => setFeeForm(f => ({ ...f, type: 'class' }))}
                        />
                        Class-wide
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          checked={feeForm.type === 'student'}
                          onChange={() => setFeeForm(f => ({ ...f, type: 'student' }))}
                        />
                        Specific Student
                      </label>
                    </div>
                  </div>

                  {feeForm.type === 'student' && (() => {
                    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(feeForm.classId));
                    const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [feeForm.classId];
                    const gradeStudents = studentsList.filter(s => targetClassIds.includes(s.classId));
                    return (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Student *</label>
                        <select
                          value={feeForm.studentId}
                          onChange={e => setFeeForm(f => ({ ...f, studentId: e.target.value }))}
                          className="input text-xs"
                          required
                        >
                          <option value="">Choose Student</option>
                          {gradeStudents.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.studentId})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  {feeForm.classId && (() => {
                    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(feeForm.classId));
                    const targetClassIds = activeGradeGroup ? activeGradeGroup.classIds : [feeForm.classId];
                    const gradeStudents = studentsList.filter(s => targetClassIds.includes(s.classId));
                    return (
                      <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 text-xs">
                        <div className="font-bold text-gray-500 mb-2 uppercase text-[10px]">
                          Students in selected class ({gradeStudents.length})
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                          {gradeStudents.map(s => {
                            const isSelected = feeForm.type === 'student' && feeForm.studentId === s.id;
                            return (
                              <div key={s.id} className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 font-bold text-primary' : 'bg-white border-gray-100'}`}>
                                <span>{s.name}</span>
                                <span className="text-[10px] text-gray-400 font-mono">{s.studentId}</span>
                              </div>
                            );
                          })}
                          {gradeStudents.length === 0 && (
                            <div className="text-gray-400 italic text-2xs text-center py-2">No students enrolled in this class.</div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fee Name *</label>
                    <input
                      required
                      value={feeForm.name}
                      onChange={e => setFeeForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Tuition Fee Term 1"
                      className="input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Total Amount (Rs.) *</label>
                    <input
                      type="number"
                      required
                      value={feeForm.amount}
                      onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))}
                      placeholder="e.g. 15000"
                      className="input text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Divide into Stagered Steps (Installments) *</label>
                    <select
                      value={feeForm.installments}
                      onChange={e => setFeeForm(f => ({ ...f, installments: e.target.value }))}
                      className="input text-xs"
                      required
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                        <option key={n} value={n}>
                          {n === 1 ? '1 Step (Full Payment)' : `${n} Installments (Stagered Steps)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Submission Timeline (Interval) *</label>
                    <select
                      value={feeForm.submissionTime}
                      onChange={e => setFeeForm(f => ({ ...f, submissionTime: e.target.value }))}
                      className="input text-xs"
                      required
                    >
                      <option>Monthly</option>
                      <option>Quarterly</option>
                      <option>Semiannually</option>
                      <option>One-time / Termly</option>
                    </select>
                  </div>

                  {/* Dynamic Components Breakdown */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Fee Components Breakdown (Optional)</label>
                      {feeComponents.length < 8 && (
                        <button
                          type="button"
                          onClick={() => setFeeComponents([...feeComponents, { id: Date.now() + Math.random(), category: 'Tuition Fee', amount: '' }])}
                          className="text-2xs font-semibold text-blue-600 hover:underline"
                        >
                          + Add Component
                        </button>
                      )}
                    </div>

                    {feeComponents.map((c, idx) => (
                      <div key={c.id} className="flex gap-2 items-center mb-2">
                        <select
                          value={c.category}
                          onChange={e => {
                            const updated = feeComponents.map((item, i) => i === idx ? { ...item, category: e.target.value } : item);
                            setFeeComponents(updated);
                          }}
                          className="input text-xs py-1.5 flex-1"
                        >
                          <option>Tuition Fee</option>
                          <option>Exam Fee</option>
                          <option>Extra Classes Fee</option>
                          <option>Computer Classes Fee</option>
                          <option>Library Fee</option>
                          <option>Sports Fee</option>
                          <option>Transport Fee</option>
                          <option>Other Fee</option>
                        </select>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={c.amount}
                          onChange={e => {
                            const updated = feeComponents.map((item, i) => i === idx ? { ...item, amount: e.target.value } : item);
                            setFeeComponents(updated);
                          }}
                          className="input text-xs py-1.5 w-24"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = feeComponents.filter((_, i) => i !== idx);
                            setFeeComponents(updated);
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        >
                          ✖
                        </button>
                      </div>
                    ))}

                    {feeComponents.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-xl text-xxs font-medium space-y-1">
                        <div className="flex justify-between text-gray-500">
                          <span>Sum of Components:</span>
                          <span className="font-bold text-primary">Rs. {sumComponents.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unassigned Balance:</span>
                          <span className={`font-bold ${unassignedAmount === 0 ? 'text-green-600' : 'text-amber-600'}`}>
                            Rs. {unassignedAmount.toLocaleString()}
                          </span>
                        </div>
                        {Math.abs(unassignedAmount) >= 0.01 && (
                          <p className="text-[10px] text-amber-500 mt-1">⚠️ Sum of components must equal the Total Amount (difference must be 0).</p>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loadingFees || !isBreakdownValid}
                    className={`w-full btn-primary justify-center font-bold text-xs py-3 rounded-xl transition-all ${(!isBreakdownValid) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    {loadingFees ? 'Creating rule...' : 'Apply & Generate Invoices'}
                  </button>
                </form>
              </div>

              {/* Active Fee Setup Rules List */}
              <div className="card col-span-2">
                <h3 className="font-display font-bold text-primary text-lg mb-2 flex items-center gap-2">
                  📋 Configured Fee Rules
                </h3>
                <p className="text-gray-400 text-xs mb-4">View and delete established fee rules. Deleting a rule deletes any unpaid stagered invoices associated with it.</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-2 text-xs font-bold text-gray-500 uppercase min-w-[150px]">Rule Description</th>
                        <th className="py-2 text-xs font-bold text-gray-500 uppercase min-w-[120px]">Scope / Target</th>
                        <th className="py-2 text-xs font-bold text-gray-500 uppercase min-w-[100px]">Total Amount</th>
                        <th className="py-2 text-xs font-bold text-gray-500 uppercase min-w-[80px]">Steps</th>
                        <th className="py-2 text-xs font-bold text-gray-500 uppercase min-w-[120px]">Timeline</th>
                        <th className="py-2 text-xs font-bold text-gray-500 uppercase text-right w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeRules.map(fr => (
                        <tr key={fr.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 text-sm font-semibold text-primary">
                            <div className="font-semibold text-sm">{fr.name}</div>
                            {fr.breakdown && (() => {
                              try {
                                const parsed = JSON.parse(fr.breakdown);
                                if (!Array.isArray(parsed)) return null;
                                return (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {parsed.map((item, idx) => (
                                      <span key={idx} className="inline-block px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                                        {item.category}: Rs. {Number(item.amount || 0).toLocaleString()}
                                      </span>
                                    ))}
                                  </div>
                                );
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </td>
                          <td className="py-3 text-sm text-gray-600 font-medium">
                            {fr.studentName ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                👤 {fr.studentName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-3xs font-bold bg-primary/5 text-primary border border-primary/10">
                                🏫 {fr.grade}
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-sm font-bold text-gray-700">Rs. {Number(fr.amount || 0).toLocaleString()}</td>
                          <td className="py-3 text-sm font-semibold text-primary">{fr.installments} {fr.installments === 1 ? 'step' : 'steps'}</td>
                          <td className="py-3 text-sm text-gray-400 font-medium">{fr.submissionTime}</td>
                          <td className="py-3 text-sm text-right">
                            <button
                              onClick={() => handleDeleteFeeRule(fr.id)}
                              disabled={loadingFees}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Delete Fee Rule"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {feeRules.length === 0 && (
                        <tr>
                          <td colSpan="6" className="text-center py-6 text-gray-400 text-xs">No fee setup rules defined yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'class-subjects' && (() => {
          const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
          return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Panel: Class Selector */}
              <div className="card md:col-span-1 h-fit">
                <h3 className="font-display font-bold text-primary text-base mb-2 flex items-center gap-2">
                  🏫 Select Class
                </h3>
                <p className="text-gray-400 text-xxs mb-4">Choose a class to view and map its subjects.</p>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {uniqueGradeClasses.map(g => {
                    const isActive = g.classIds.includes(mappingClassId);
                    return (
                      <button
                        key={g.formattedGrade}
                        onClick={() => setMappingClassId(g.primaryClassId)}
                        className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-between ${isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/25'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-primary'
                          }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold truncate text-xs">{g.formattedGrade}</div>
                          {g.sections.length > 0 && (
                            <div className={`text-[10px] mt-0.5 truncate ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                              Sections: {g.sections.join(', ')}
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          Go
                        </span>
                      </button>
                    );
                  })}
                  {uniqueGradeClasses.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs italic">No classes found.</div>
                  )}
                </div>
              </div>

              {/* Right Panel: Class-Subjects Mapping */}
              <div className="card md:col-span-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                      📚 Subjects Curriculum
                    </h3>
                    <p className="text-gray-400 text-xs mt-1">
                      Manage subjects taught in <span className="font-semibold text-gray-700">{activeGradeGroup?.formattedGrade || 'the selected class'}</span>
                      {activeGradeGroup?.sections.length > 0 && (
                        <span className="ml-1 text-primary font-medium">(Syncs across Sections: {activeGradeGroup.sections.join(', ')})</span>
                      )}.
                    </p>
                  </div>

                  {mappingClassId && (
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleAutoMapStandardCurriculum}
                        disabled={loading}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition hover:scale-105 active:scale-95 cursor-pointer"
                        title="Auto-map age-appropriate standard curriculum for this class across all its sections"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>⚡ 1-Click Standard Curriculum</span>
                      </button>

                      <button
                        onClick={() => {
                          const existingSubjIds = (classSubjectsList || []).map(cs => cs.subjectId || cs.id);
                          setMappingForm({ subjectId: '', selectedSubjectIds: existingSubjIds, teacherId: '' });
                          setSubjectSearchQuery('');
                          setShowMappingModal(true);
                        }}
                        className="btn-primary text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5"
                      >
                        <span>+ Link Subject(s)</span>
                      </button>
                    </div>
                  )}
                </div>

              {mappingClassId ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Subject Code</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Subject Name</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Assigned Teacher</th>
                        <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classSubjectsList.map(cs => (
                        <tr key={cs.subjectId} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-sm font-semibold text-primary">
                            <span className="bg-primary/5 text-primary px-2.5 py-1 rounded-lg border border-primary/10 uppercase text-xs">
                              {cs.subjectCode || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-sm font-semibold text-gray-700">
                            {cs.subjectName}
                          </td>
                          <td className="py-3.5 px-4 text-sm text-gray-600 font-medium">
                            {cs.teacherName && cs.teacherName !== 'Unassigned' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacher(cs)}
                                className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 font-semibold transition-all cursor-pointer shadow-2xs"
                                title="Click to change teacher"
                              >
                                <span>👤 {cs.teacherName}</span>
                                <Pencil className="w-3 h-3 text-blue-400 group-hover:text-blue-700 transition-colors ml-0.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacher(cs)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-amber-50 hover:bg-amber-100/80 text-amber-800 border border-amber-200 font-medium transition-all cursor-pointer"
                                title="Click to assign teacher"
                              >
                                <UserPlus className="w-3.5 h-3.5 text-amber-600" />
                                <span>+ Assign Teacher</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditTeacher(cs)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                                title="Edit / Assign Teacher"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClassSubject(cs.subjectId)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                                title="Remove Subject"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {classSubjectsList.length === 0 && (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-400 text-xs italic">
                            No subjects linked to this class yet. Click "+ Link Subject" to customize its curriculum.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-xs italic">
                  Select a class from the left panel to manage subjects.
                </div>
              )}
            </div>
          </div>
        );
      })()}

        {activeTab === 'promotion-setup' && (() => {
          const promoUniqueSections = [...new Set(promoClassSections.map(c => c.section))].filter(Boolean).sort();
          const promoUniqueGrades = sortGrades([...new Set(promoClassSections.map(c => c.grade))].filter(Boolean));
          const filteredPromo = promoStudents.filter(s => {
            const nameStr = s.name || '';
            const matchesName = !promoSearch || nameStr.toLowerCase().includes(promoSearch.toLowerCase());
            const matchesClass = !promoSelectedClass || normalizePromoClass(s.class) === normalizePromoClass(promoSelectedClass);
            const matchesSection = !promoSelectedSection || normalizePromoSection(s.section) === normalizePromoSection(promoSelectedSection);
            const statusStr = s.status || '';
            const matchesStatus = !promoSelectedStatus || statusStr.toUpperCase() === promoSelectedStatus.toUpperCase();

            if (promoDateFrom) {
              const from = new Date(promoDateFrom);
              from.setHours(0, 0, 0, 0);
              if (new Date(s.createdAt) < from) return false;
            }
            if (promoDateTo) {
              const to = new Date(promoDateTo);
              to.setHours(23, 59, 59, 999);
              if (new Date(s.createdAt) > to) return false;
            }

            return matchesName && matchesClass && matchesSection && matchesStatus;
          });

          const sc = { ACTIVE: 'badge-success', WITHDRAWN: 'badge-gray', SUSPENDED: 'badge-danger' };

          return (
            <div className="space-y-6">
              {/* Card 1: Academic Session & Promotion Timeline Setup */}
              <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>Academic Session & Promotion Timeline</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Configure your school's annual session cycle. One-Click Batch Promotion remains locked until the promotion window opens.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {sessionTimeline.isScheduleLocked && (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-full shadow-xs">
                        <Lock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Schedule Active & Locked</span>
                      </span>
                    )}
                    {sessionTimeline.isPromotionWindowOpen ? (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full shadow-xs">
                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Promotion Window OPEN</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1.5 px-3.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full shadow-xs">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Promotion Window LOCKED ({sessionTimeline.daysUntilOpens > 0 ? `Opens in ${sessionTimeline.daysUntilOpens} days` : 'Before Window Date'})</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration / Gap Visual Meter */}
                {(() => {
                  const s = sessionTimeline.sessionStartDate ? new Date(sessionTimeline.sessionStartDate) : null;
                  const e = sessionTimeline.sessionEndDate ? new Date(sessionTimeline.sessionEndDate) : null;
                  const hasBoth = s && e && !isNaN(s.getTime()) && !isNaN(e.getTime());
                  const days = hasBoth ? Math.round((e - s) / (1000 * 60 * 60 * 24)) : null;
                  const months = hasBoth ? Math.round(days / 30.4) : null;
                  const isValidGap = days !== null && days >= 330 && e > s;

                  return (
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs px-3 py-2 bg-gray-50/80 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">Annual Session Duration:</span>
                        {hasBoth ? (
                          isValidGap ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 text-[11px]">
                              ✓ {months} Months ({days} Days) — Valid Academic Session
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 text-[11px]">
                              ⚠️ {days < 0 ? 'Invalid: End Date is before Start Date' : `${months} Months (${days} Days) — Minimum 11 months (~330 days) required!`}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">Set Start and End dates to calculate session span</span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400">Standard CBSE / State Board Cycle: 12 Months</span>
                    </div>
                  );
                })()}

                {/* Lock banner & Emergency Override Controls */}
                {sessionTimeline.isScheduleLocked && !sessionScheduleUnlocked && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>
                        <strong>Timeline Protection Active:</strong> To avoid accidental disruption to student exams and fee collection, this session schedule is locked.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSessionScheduleUnlocked(true)}
                      className="btn-outline text-xs px-3 py-1.5 font-bold text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100/80 rounded-xl shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unlock to Edit (Admin Override)</span>
                    </button>
                  </div>
                )}

                {/* Emergency Override Input Box */}
                {sessionTimeline.isScheduleLocked && sessionScheduleUnlocked && (
                  <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2.5 text-xs text-amber-950">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>School Admin Emergency Override Mode Active</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSessionScheduleUnlocked(false);
                          setSessionScheduleOverrideReason('');
                        }}
                        className="text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
                      >
                        Cancel & Keep Locked
                      </button>
                    </div>
                    <p className="text-amber-800 text-xxs leading-relaxed">
                      You are editing an active academic session schedule. Changes to dates directly affect batch promotion gates and fee structures. A mandatory reason is required for audit logs.
                    </p>
                    <div>
                      <label className="block font-bold text-amber-900 mb-1">
                        Mandatory Reason for Editing Active Schedule *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. State Govt / Education Board notification for session date extension"
                        value={sessionScheduleOverrideReason}
                        onChange={e => setSessionScheduleOverrideReason(e.target.value)}
                        className="input text-xs w-full py-2 px-3 bg-white border border-amber-300 rounded-xl font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                {(() => {
                  const isFieldsDisabled = sessionTimeline.isScheduleLocked && !sessionScheduleUnlocked;
                  const minEnd = sessionTimeline.sessionStartDate ? (() => {
                    const d = new Date(sessionTimeline.sessionStartDate);
                    if (isNaN(d.getTime())) return '';
                    d.setMonth(d.getMonth() + 11);
                    return d.toISOString().split('T')[0];
                  })() : '';

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Current Session</label>
                        <input
                          type="text"
                          placeholder="e.g. 2025-26"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.currentAcademicSession || ''}
                          onChange={e => setSessionTimeline(s => ({ ...s, currentAcademicSession: e.target.value }))}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl font-semibold ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Session Start Date</label>
                        <input
                          type="date"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.sessionStartDate ? sessionTimeline.sessionStartDate.split('T')[0] : ''}
                          onChange={e => {
                            const newStart = e.target.value;
                            setSessionTimeline(s => {
                              let updatedEnd = s.sessionEndDate;
                              if (newStart) {
                                const d = new Date(newStart);
                                d.setFullYear(d.getFullYear() + 1);
                                d.setDate(d.getDate() - 1);
                                updatedEnd = d.toISOString().split('T')[0];
                              }
                              return { ...s, sessionStartDate: newStart, sessionEndDate: updatedEnd };
                            });
                          }}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Session End Date <span className="text-gray-400 font-normal">(Min +11 mo)</span>
                        </label>
                        <input
                          type="date"
                          disabled={isFieldsDisabled}
                          min={minEnd}
                          value={sessionTimeline.sessionEndDate ? sessionTimeline.sessionEndDate.split('T')[0] : ''}
                          onChange={e => setSessionTimeline(s => ({ ...s, sessionEndDate: e.target.value }))}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Promotion Window Opens</label>
                        <input
                          type="date"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.promotionOpensDate ? sessionTimeline.promotionOpensDate.split('T')[0] : ''}
                          onChange={e => setSessionTimeline(s => ({ ...s, promotionOpensDate: e.target.value }))}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Next Session (Target)</label>
                        <input
                          type="text"
                          placeholder="e.g. 2026-27"
                          disabled={isFieldsDisabled}
                          value={sessionTimeline.nextAcademicSession || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setSessionTimeline(s => ({ ...s, nextAcademicSession: val }));
                            setBatchTargetYear(val);
                          }}
                          className={`input text-xs w-full py-2 px-3 border border-gray-200 rounded-xl font-semibold ${
                            isFieldsDisabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50/50'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })()}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                  <span className="text-[11px] text-gray-500">
                    💡 <em>Mid-session batch promotions remain strictly locked until the Promotion Window Opens date to safeguard against premature grade advancement.</em>
                  </span>

                  {(!sessionTimeline.isScheduleLocked || sessionScheduleUnlocked) && (
                    <button
                      type="button"
                      onClick={handleSaveSessionTimeline}
                      disabled={savingSession}
                      className="btn-primary text-xs font-bold py-2.5 px-5 rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs hover:shadow"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{savingSession ? 'Saving Timeline...' : 'Save & Lock Session Schedule'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Card 2: 1-Click Smart Class Batch Promotion Dashboard */}
              <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      <span>1-Click Smart Class Batch Promotion</span>
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Select a source class to automatically audit 40%+ final exam marks across subjects, calculate fee arrears rollover, and advance the whole class in a single click.
                    </p>
                  </div>
                </div>

                {/* Lock banner if promotion window is closed */}
                {!sessionTimeline.isPromotionWindowOpen && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-950">
                      <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Mid-Session Promotion Lock Active</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      The academic session is currently in progress. Normal batch promotion will automatically unlock on{' '}
                      <strong>{sessionTimeline.promotionOpensDate ? new Date(sessionTimeline.promotionOpensDate).toLocaleDateString() : 'session end'}</strong>.
                      This ensures no student is accidentally bumped to the next class during an ongoing academic term.
                    </p>
                    <div className="flex items-center gap-3 pt-1 border-t border-amber-200/60">
                      <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 select-none">
                        <input
                          type="checkbox"
                          checked={batchAdminOverride}
                          onChange={e => setBatchAdminOverride(e.target.checked)}
                          className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                        />
                        <span>School Admin Direct Emergency Override</span>
                      </label>
                      {batchAdminOverride && (
                        <input
                          type="text"
                          placeholder="State reason (e.g. Early Board transfer, Special batch)"
                          value={batchOverrideReason}
                          onChange={e => setBatchOverrideReason(e.target.value)}
                          className="input text-xs py-1 px-3 bg-white border border-amber-300 rounded-lg flex-1"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">1. Select Source Class</label>
                    <select
                      value={batchSourceClassId}
                      onChange={e => handleFetchBatchPreview(e.target.value)}
                      className="input text-xs font-semibold w-full py-2 px-3 bg-white border border-gray-200 rounded-xl"
                    >
                      <option value="">-- Choose Class to Promote --</option>
                      {sortClasses(promoClassSections).map(c => (
                        <option key={c.id} value={c.id}>
                          {formatGrade(c.grade)} - {formatSection(c.section)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">2. Target Destination Class</label>
                    <select
                      value={batchTargetClassId}
                      onChange={e => setBatchTargetClassId(e.target.value)}
                      className="input text-xs font-semibold w-full py-2 px-3 bg-white border border-gray-200 rounded-xl"
                    >
                      <option value="">-- Choose Target Next Class --</option>
                      {sortClasses(promoClassSections).map(c => (
                        <option key={c.id} value={c.id}>
                          {formatGrade(c.grade)} - {formatSection(c.section)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">3. Target Academic Session</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026-27"
                      value={batchTargetYear}
                      onChange={e => setBatchTargetYear(e.target.value)}
                      className="input text-xs font-semibold w-full py-2 px-3 bg-white border border-gray-200 rounded-xl"
                    />
                  </div>
                </div>

                {/* Loading state */}
                {loadingBatchPreview && (
                  <div className="py-8 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Auditing class students, final exam marks, and pending arrears...</span>
                  </div>
                )}

                {/* Batch Preview Results */}
                {batchPreview && !loadingBatchPreview && (
                  <div className="space-y-4">
                    {/* Stat Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-gray-500 block">Total Students in Class</span>
                        <strong className="text-base font-bold text-gray-900">{batchPreview.totalStudents}</strong>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-emerald-700 block">Eligible to Advance (40%+)</span>
                        <strong className="text-base font-bold text-emerald-700">{batchPreview.eligibleCount}</strong>
                      </div>
                      <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-amber-800 block">Review / Retain Required</span>
                        <strong className="text-base font-bold text-amber-800">{batchPreview.ineligibleCount}</strong>
                      </div>
                      <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3">
                        <span className="text-[11px] text-blue-700 block">Total Arrears to Rollover</span>
                        <strong className="text-base font-bold text-blue-800">₹{(batchPreview.totalClassArrears || 0).toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Table of Students */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between border-b border-gray-200">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={
                              (batchPreview.students || []).length > 0 &&
                              selectedBatchStudentIds.length === (batchPreview.students || []).length
                            }
                            onChange={e => {
                              if (e.target.checked) {
                                setSelectedBatchStudentIds((batchPreview.students || []).map(s => s.id));
                              } else {
                                setSelectedBatchStudentIds([]);
                              }
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-bold text-gray-700">
                            Select All ({selectedBatchStudentIds.length} of {batchPreview.totalStudents} selected)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const eligibleOnly = (batchPreview.students || [])
                              .filter(s => s.eligibleForAutoPromote)
                              .map(s => s.id);
                            setSelectedBatchStudentIds(eligibleOnly);
                          }}
                          className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                        >
                          Select Only Eligible (Passed 40%+)
                        </button>
                      </div>

                      <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-gray-50/50 sticky top-0 z-10 border-b border-gray-100">
                            <tr>
                              <th className="py-2.5 px-3 w-10"></th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Student Name & Roll No</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Final Exam Status</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Pending Fee Arrears</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Enrollment / TC</th>
                              <th className="py-2.5 px-3 font-bold text-gray-600">Promotion Verdict</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {(batchPreview.students || []).map(st => {
                              const isChecked = selectedBatchStudentIds.includes(st.id);
                              return (
                                <tr
                                  key={st.id}
                                  className={`hover:bg-gray-50/60 transition-colors ${
                                    st.eligibleForAutoPromote ? 'bg-white' : 'bg-amber-50/20'
                                  }`}
                                >
                                  <td className="py-2.5 px-3">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        if (e.target.checked) {
                                          setSelectedBatchStudentIds(prev => [...prev, st.id]);
                                        } else {
                                          setSelectedBatchStudentIds(prev => prev.filter(id => id !== st.id));
                                        }
                                      }}
                                      className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-bold text-gray-800">{st.name}</div>
                                    <div className="text-[10px] text-gray-400">Roll: {st.rollNumber || 'N/A'}</div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {st.examStatus === 'PASSED' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        ✓ Passed ({st.gpa?.toFixed(1) || '40%+'}%)
                                      </span>
                                    ) : st.examStatus === 'FAILED' ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        ✗ Failed (&lt;40% in subjects)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                                        No Marks Recorded
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-gray-700">
                                    {st.unpaidBalance > 0 ? (
                                      <span className="text-amber-700">₹{st.unpaidBalance.toLocaleString()} (Will Rollover)</span>
                                    ) : (
                                      <span className="text-emerald-700">₹0 (All Clear)</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {st.hasTC ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                        TC ISSUED
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                        {st.enrollmentStatus || 'ACTIVE'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {st.eligibleForAutoPromote ? (
                                      <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                                        ✓ Ready to Promote
                                      </span>
                                    ) : (
                                      <span className="text-amber-700 font-medium text-[11px]">
                                        {st.hasTC ? 'Blocked (TC Issued)' : 'Needs Retain / Review'}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Batch Promotion Execution Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
                      <div>
                        {!sessionTimeline.isPromotionWindowOpen && !batchAdminOverride ? (
                          <div className="text-xs text-amber-800 flex items-center gap-1.5 font-medium">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Execution locked until promotion window opens. Use Emergency Override if needed.</span>
                          </div>
                        ) : (
                          <div className="text-xs text-emerald-700 font-medium">
                            ✨ Ready to advance {selectedBatchStudentIds.length} selected students to {promoClassSections.find(c => c.id === batchTargetClassId)?.grade ? formatGrade(promoClassSections.find(c => c.id === batchTargetClassId)?.grade) : 'Target Class'}.
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleExecuteBatchPromote}
                        disabled={
                          executingBatch ||
                          selectedBatchStudentIds.length === 0 ||
                          (!sessionTimeline.isPromotionWindowOpen && !batchAdminOverride)
                        }
                        className="btn-primary text-xs font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {executingBatch
                            ? 'Processing Batch Promotion...'
                            : `🚀 Execute 1-Click Class Promotion (${selectedBatchStudentIds.length})`}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Batch Result Report */}
                {batchResult && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Batch Promotion Completed Successfully!</span>
                    </div>
                    <div className="text-xs text-emerald-800 grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>🎓 <strong>Promoted:</strong> {batchResult.promotedCount} Students</div>
                      <div>📋 <strong>Invoices Rolled Over:</strong> {batchResult.unpaidInvoicesRolledOver} Unpaid Invoices</div>
                      <div>📱 <strong>WhatsApp Alerts:</strong> Sent to registered parents</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 3: Student Promotion Setup Directory (Individual Management) */}
              <div className="card">
                <h3 className="font-display font-bold text-primary text-lg mb-1 flex items-center gap-2">
                  🚀 Student Promotion Setup Directory
                </h3>
                <p className="text-xs text-gray-400 mb-4">Manage, filter, and manually advance student records across all grade levels.</p>

                <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-5">
                  <div className="flex-1 relative">
                    <input placeholder="Search students by name..." value={promoSearch} onChange={e => setPromoSearch(e.target.value)} className="input pl-9 text-sm" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <DateFilterInput label="From:" value={promoDateFrom} onChange={setPromoDateFrom} />
                    <DateFilterInput label="To:" value={promoDateTo} onChange={setPromoDateTo} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 shrink-0 w-full xl:w-auto">
                    <select className="input w-full text-xs sm:text-sm" value={promoSelectedClass} onChange={e => setPromoSelectedClass(e.target.value)}>
                      <option value="">Class All</option>
                      {promoUniqueGrades.map(grade => (
                        <option key={grade} value={grade}>{formatGrade(grade)}</option>
                      ))}
                    </select>

                    <select className="input w-full text-xs sm:text-sm" value={promoSelectedSection} onChange={e => setPromoSelectedSection(e.target.value)}>
                      <option value="">Section All</option>
                      {promoUniqueSections.map(sec => (
                        <option key={sec} value={sec}>{formatSection(sec)}</option>
                      ))}
                    </select>

                    <select className="input w-full text-xs sm:text-sm" value={promoSelectedStatus} onChange={e => setPromoSelectedStatus(e.target.value)}>
                      <option value="">Status All</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="WITHDRAWN">WITHDRAWN</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>

                {loadingPromo ? (
                  <div className="py-12 text-center text-gray-400 text-sm">Loading promotion directory...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Roll No</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Student Name</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Class</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Section</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Parent Name</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Contact</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                          <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPromo.map(s => (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 text-sm font-semibold text-primary">{s.rollNumber || 'N/A'}</td>
                            <td className="py-3.5 px-4 text-sm font-semibold text-gray-700">{s.name}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{formatGrade(s.class)}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{formatSection(s.section)}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{s.parentName || 'N/A'}</td>
                            <td className="py-3.5 px-4 text-sm text-gray-600">{s.parentPhone || 'N/A'}</td>
                            <td className="py-3.5 px-4">
                              <span className={`badge ${sc[s.status] || 'badge-gray'}`}>{s.status}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => handlePromoViewClick(s)} className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105" title="View Details">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button onClick={() => handlePromoPromoteClick(s)} className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105" title="Promote Student">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
                                  </svg>
                                </button>
                                <button onClick={() => handlePromoDeleteClick(s.id)} className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105" title="Delete Profile">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredPromo.length === 0 && (
                          <tr>
                            <td colSpan="8" className="text-center py-6 text-gray-400 text-sm">No students found matching current filters.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Top overview card of school's active subscription status */}
            <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="font-display font-bold text-primary text-lg">Platform Service Subscription</h3>
                <p className="text-gray-400 text-xs mt-1">Configure and manage your school's EduVault subscription tier.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {subInfo?.status === 'success' ? (
                      <span className="badge badge-success text-xxs">Active / Paid</span>
                    ) : (
                      <span className="badge badge-warning text-xxs animate-pulse">Pending Payment</span>
                    )}
                  </div>
                </div>
                {subInfo?.status === 'success' && (
                  <div className="border-l border-gray-100 pl-3">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Validity Period</div>
                    <div className="text-xs font-semibold text-primary mt-0.5">
                      {subInfo.startDate && subInfo.endDate
                        ? `from ${subInfo.startDate} to ${subInfo.endDate}`
                        : '1 Year Recurring'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {subInfo?.pendingUpgradeRequest && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-5 text-xs font-semibold flex flex-col gap-3 shadow-sm animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="animate-pulse">🔔</span>
                  <span className="font-bold text-amber-900">
                    Pending {subInfo.pendingUpgradeRequest.requestedPlanType === 'Custom' ? 'Custom Modification' : 'Plan Upgrade'} Request
                  </span>
                </div>
                <div className="text-gray-700 bg-white/70 p-3.5 rounded-xl border border-amber-100/50 font-normal">
                  <span className="font-bold text-gray-700 block mb-1 text-3xs uppercase tracking-wider text-gray-400">Your Submitted Requirements:</span>
                  <p className="text-xs whitespace-pre-wrap leading-relaxed">{subInfo.pendingUpgradeRequest.requirements || 'No specific requirements listed.'}</p>
                </div>
                <div className="text-amber-700 text-[10px] uppercase font-extrabold tracking-wider mt-1 flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  Status: Waiting for Super Admin Review and Price Customization
                </div>
              </div>
            )}

            {/* Plans List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {platformPlans.map(p => {
                const isCurrent = subInfo && (p.planName.toLowerCase().includes(subInfo.planType.toLowerCase()) || subInfo.planType.toLowerCase().includes(p.planName.toLowerCase()));
                return (
                  <div
                    key={p.id}
                    className={`card relative transition-all duration-300 flex flex-col justify-between min-h-[350px] border-2 ${isCurrent
                        ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20 bg-primary/[0.01]'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                      }`}
                  >
                    {p.isTopRevenue && (
                      <div className="absolute -top-3 right-4 bg-accent text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                        TOP REVENUE
                      </div>
                    )}

                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{p.tierLabel}</div>

                      <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-2">
                        <div className="font-display font-bold text-primary text-xl">{p.planName}</div>
                        {isCurrent && (
                          <span className="bg-primary/10 text-primary border border-primary/25 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Current Tier
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 mb-6 text-xs">
                        <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                          <span className="text-gray-400">Implementation Cost</span>
                          <span className="font-bold text-primary">${p.implementationCost.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                          <span className="text-gray-400">Student Capacity</span>
                          <span className="font-bold text-primary">{p.studentCapacity}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                          <span className="text-gray-400">Storage Limit</span>
                          <span className="font-bold text-primary">{p.storageLimit}</span>
                        </div>
                        <div className="flex items-center justify-between py-1 border-b border-gray-50/50">
                          <span className="text-gray-400">Support Level</span>
                          <span className="font-bold text-primary">{p.planName.toLowerCase().includes('enterprise') ? '24/7 Priority Support' : 'Standard Support'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-50 pt-4 mt-auto">
                      <div className="flex items-baseline justify-between mb-4">
                        <div>
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Plan Cost</span>
                          <span className="text-2xl font-black text-primary">
                            {p.monthlyPrice.startsWith('$') || p.monthlyPrice.startsWith('₹') || p.monthlyPrice.toLowerCase().includes('per') || p.monthlyPrice.toLowerCase().includes('custom')
                              ? p.monthlyPrice
                              : p.monthlyPrice.includes('Rs.') ? p.monthlyPrice.replace('Rs.', '$') : `$${p.monthlyPrice}`}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        subInfo.status === 'success' ? (
                          <div className="space-y-2 w-full animate-in fade-in duration-200">
                            <div className="w-full bg-green-50 border border-green-100 text-green-700 text-center rounded-xl py-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm">
                              <span>✅ Plan Active & Fully Paid</span>
                            </div>
                            {getRemainingDays(subInfo.endDate) <= 30 && (
                              <button
                                onClick={() => handlePaySetupSubscription(true)}
                                disabled={payingSub}
                                className="w-full bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-center rounded-xl py-3 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 animate-in slide-in-from-bottom duration-300"
                              >
                                {payingSub ? 'Processing...' : '🔄 Renew Subscription'}
                              </button>
                            )}
                            {p.planName.toLowerCase().includes('enterprise') && (
                              <button
                                onClick={() => handleRequestUpgrade('Custom')}
                                disabled={payingSub || (subInfo.pendingUpgradeRequest && subInfo.pendingUpgradeRequest.requestedPlanType === 'Custom')}
                                className="w-full bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-center rounded-xl py-3 text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                              >
                                📝 Request Custom Modification
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePaySetupSubscription(false)}
                            disabled={payingSub}
                            className="w-full btn-primary justify-center font-bold text-xs py-3 rounded-xl transition-all shadow-md shadow-primary/10 flex items-center gap-2"
                          >
                            {payingSub ? 'Processing...' : `💳 Accept & Pay $${subInfo.amount}`}
                          </button>
                        )
                      ) : (() => {
                        const isPendingThisPlan = subInfo?.pendingUpgradeRequest &&
                          (subInfo.pendingUpgradeRequest.requestedPlanType.toLowerCase().includes(p.planName.toLowerCase()) ||
                            p.planName.toLowerCase().includes(subInfo.pendingUpgradeRequest.requestedPlanType.toLowerCase()));

                        if (isPendingThisPlan) {
                          return (
                            <button
                              disabled
                              className="w-full bg-amber-50 border border-amber-200 text-amber-600 text-center rounded-xl py-3 text-xs font-bold cursor-not-allowed animate-pulse"
                            >
                              Upgrade Request Pending Approval
                            </button>
                          );
                        } else {
                          return (
                            <button
                              onClick={() => handleRequestUpgrade(p.planName.toLowerCase().includes('enterprise') ? 'Enterprise' : p.planName)}
                              disabled={payingSub || (subInfo?.pendingUpgradeRequest)}
                              className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-center rounded-xl py-3 text-xs font-bold transition-all shadow-sm"
                            >
                              {p.planName.toLowerCase().includes('enterprise') ? 'Contact Support to Upgrade' : 'Select Standard Plan'}
                            </button>
                          );
                        }
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'password-rules' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Overview & Subsystem Banner */}
            <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
                    🔐
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                      Dynamic Password Generation Rules
                      <span className="badge badge-success text-[10px] font-bold py-0.5 px-2">Active & Enforced</span>
                    </h3>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Configure unified auto-generation formulas applied automatically across all 3 school onboarding workflows.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetPasswordRules}
                    className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-xs transition"
                  >
                    ↺ Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePasswordRules}
                    disabled={savingPasswordRules}
                    className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-md shadow-primary/20"
                  >
                    {savingPasswordRules ? (
                      <>
                        <span className="animate-spin text-sm">⏳</span> Saving Rules...
                      </>
                    ) : (
                      <>
                        <span>💾</span> Save Password Rules
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Subsystems Sync Indicator */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/70 flex items-center gap-3">
                  <span className="text-xl">📁</span>
                  <div>
                    <div className="text-[11px] font-bold text-blue-900">Bulk CSV Data Import</div>
                    <div className="text-[10px] text-blue-600">/school-admin/data-import</div>
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100/70 flex items-center gap-3">
                  <span className="text-xl">👥</span>
                  <div>
                    <div className="text-[11px] font-bold text-emerald-900">Quick Student CSV Roster</div>
                    <div className="text-[10px] text-emerald-600">/school-admin/students</div>
                  </div>
                </div>
                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100/70 flex items-center gap-3">
                  <span className="text-xl">📝</span>
                  <div>
                    <div className="text-[11px] font-bold text-purple-900">Admission Inquiry Approvals</div>
                    <div className="text-[10px] text-purple-600">/school-admin/admissions</div>
                  </div>
                </div>
              </div>

              {/* Dynamic Tokens Legend */}
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>💡 Available Dynamic Substitution Tokens:</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
                    <b className="text-primary font-bold">{"{name3}"}</b>: First 3 letters of first name (e.g. Shashi → sha)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
                    <b className="text-primary font-bold">{"{lastname3}"}</b>: First 3 letters of last name (e.g. Kumar → kum)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
                    <b className="text-primary font-bold">{"{currentyear}"}</b>: Current calendar year ({new Date().getFullYear()})
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
                    <b className="text-primary font-bold">{"{birthyear}"}</b>: Birth year from student DOB
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
                    <b className="text-primary font-bold">{"stu@currentyear!"}</b>: Shorthand prefix formula
                  </span>
                </div>
              </div>
            </div>

            {/* 4 Role Configuration Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 1. Student Password Rule */}
              <div className="card bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-blue-200 transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                      🎒
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Student Login Pattern</h4>
                      <p className="text-[11px] text-gray-400">Used for all new student admissions & imports</p>
                    </div>
                  </div>
                  <span className="badge bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[11px]">
                    Role: student
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Pattern Formula
                  </label>
                  <input
                    type="text"
                    value={passwordRules.studentPasswordPattern}
                    onChange={e => setPasswordRules(r => ({ ...r, studentPasswordPattern: e.target.value }))}
                    placeholder="stu@currentyear!"
                    className="input font-mono text-sm py-2.5 px-3 bg-white border border-gray-200 focus:border-blue-500 rounded-xl w-full"
                  />
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-medium">Quick Insert:</span>
                    {['{name3}', '{currentyear}', '{birthyear}', '!', '@', '#'].map(tok => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setPasswordRules(r => ({ ...r, studentPasswordPattern: (r.studentPasswordPattern || '') + tok }))}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold transition"
                      >
                        +{tok}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Dynamic Preview */}
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-blue-700">
                      Live Sample Preview
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Sample: <span className="font-semibold text-gray-800">Shashi Kumar</span> (DOB: 2015)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-blue-700 bg-white px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm inline-block">
                      {evaluateLivePreview(passwordRules.studentPasswordPattern, 'student') || passwordPreviews.student}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Teacher Password Rule */}
              <div className="card bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-emerald-200 transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold">
                      👩‍🏫
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Teacher & Faculty Pattern</h4>
                      <p className="text-[11px] text-gray-400">Used for teacher directory imports & invitations</p>
                    </div>
                  </div>
                  <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px]">
                    Role: teacher
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Pattern Formula
                  </label>
                  <input
                    type="text"
                    value={passwordRules.teacherPasswordPattern}
                    onChange={e => setPasswordRules(r => ({ ...r, teacherPasswordPattern: e.target.value }))}
                    placeholder="tea@currentyear!"
                    className="input font-mono text-sm py-2.5 px-3 bg-white border border-gray-200 focus:border-emerald-500 rounded-xl w-full"
                  />
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-medium">Quick Insert:</span>
                    {['{name3}', '{currentyear}', '{lastname3}', '!', '@', '#'].map(tok => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setPasswordRules(r => ({ ...r, teacherPasswordPattern: (r.teacherPasswordPattern || '') + tok }))}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold transition"
                      >
                        +{tok}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Dynamic Preview */}
                <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-700">
                      Live Sample Preview
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Sample: <span className="font-semibold text-gray-800">Rohan Sharma</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-emerald-700 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm inline-block">
                      {evaluateLivePreview(passwordRules.teacherPasswordPattern, 'teacher') || passwordPreviews.teacher}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Accountant Password Rule */}
              <div className="card bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-purple-200 transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg font-bold">
                      💼
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Accountant Staff Pattern</h4>
                      <p className="text-[11px] text-gray-400">Used for finance and accountant onboarding</p>
                    </div>
                  </div>
                  <span className="badge bg-purple-50 text-purple-700 border border-purple-200 font-mono text-[11px]">
                    Role: accountant
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Pattern Formula
                  </label>
                  <input
                    type="text"
                    value={passwordRules.accountantPasswordPattern}
                    onChange={e => setPasswordRules(r => ({ ...r, accountantPasswordPattern: e.target.value }))}
                    placeholder="acc@currentyear!"
                    className="input font-mono text-sm py-2.5 px-3 bg-white border border-gray-200 focus:border-purple-500 rounded-xl w-full"
                  />
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-medium">Quick Insert:</span>
                    {['{name3}', '{currentyear}', '!', '@', '#'].map(tok => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setPasswordRules(r => ({ ...r, accountantPasswordPattern: (r.accountantPasswordPattern || '') + tok }))}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold transition"
                      >
                        +{tok}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Dynamic Preview */}
                <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-purple-700">
                      Live Sample Preview
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Sample: <span className="font-semibold text-gray-800">Amit Patel</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-purple-700 bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm inline-block">
                      {evaluateLivePreview(passwordRules.accountantPasswordPattern, 'accountant') || passwordPreviews.accountant}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Receptionist Password Rule */}
              <div className="card bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-amber-200 transition-all">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-lg font-bold">
                      📋
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Receptionist & Front-Desk Pattern</h4>
                      <p className="text-[11px] text-gray-400">Used for front office staff accounts</p>
                    </div>
                  </div>
                  <span className="badge bg-amber-50 text-amber-700 border border-amber-200 font-mono text-[11px]">
                    Role: receptionist
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Pattern Formula
                  </label>
                  <input
                    type="text"
                    value={passwordRules.receptionistPasswordPattern}
                    onChange={e => setPasswordRules(r => ({ ...r, receptionistPasswordPattern: e.target.value }))}
                    placeholder="rec@currentyear!"
                    className="input font-mono text-sm py-2.5 px-3 bg-white border border-gray-200 focus:border-amber-500 rounded-xl w-full"
                  />
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] text-gray-400 font-medium">Quick Insert:</span>
                    {['{name3}', '{currentyear}', '!', '@', '#'].map(tok => (
                      <button
                        key={tok}
                        type="button"
                        onClick={() => setPasswordRules(r => ({ ...r, receptionistPasswordPattern: (r.receptionistPasswordPattern || '') + tok }))}
                        className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold transition"
                      >
                        +{tok}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Dynamic Preview */}
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase font-extrabold tracking-wider text-amber-700">
                      Live Sample Preview
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5">
                      Sample: <span className="font-semibold text-gray-800">Priya Verma</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-amber-700 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm inline-block">
                      {evaluateLivePreview(passwordRules.receptionistPasswordPattern, 'receptionist') || passwordPreviews.receptionist}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Notification Bar */}
            <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span>🛡️</span>
                <span>All passwords created dynamically enforce bcrypt/PBKDF2 salted encryption before being stored in the database.</span>
              </div>
              <button
                type="button"
                onClick={handleSavePasswordRules}
                disabled={savingPasswordRules}
                className="btn-primary text-xs py-2.5 px-6 flex items-center gap-2 shadow-md shadow-primary/20 shrink-0 w-full sm:w-auto justify-center"
              >
                {savingPasswordRules ? 'Saving Changes...' : 'Save Password Rules'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid Cell Edit Modal */}
      {showCellModal && selectedCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">Schedule: Period {selectedCell.periodNo}</h3>
                {(() => {
                  const active = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                  const label = active ? active.formattedGrade : 'Class';
                  const sec = active && active.sections.length > 0 ? ` (Syncs to Sections: ${active.sections.join(', ')})` : '';
                  return <p className="text-blue-200 text-xxs">{selectedCell.day} • {label}{sec}</p>;
                })()}
              </div>
              <button onClick={() => setShowCellModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <div className="p-6 space-y-4">
              {modalError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{modalError}</div>}

              {/* Assignment Form */}
              <form onSubmit={handleSaveCell} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Department</label>
                  <select
                    value={cellForm.departmentName}
                    onChange={e => setCellForm(f => ({ ...f, departmentName: e.target.value, subjectId: '', teacherId: '' }))}
                    className="input text-xs"
                  >
                    <option value="">All Departments</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Subject</label>
                  <select
                    value={cellForm.subjectId}
                    onChange={e => setCellForm(f => ({ ...f, subjectId: e.target.value }))}
                    className="input text-xs"
                  >
                    <option value="">Free / Unassigned Period</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code && s.code.toUpperCase() !== s.name.toUpperCase().replace(/\s+/g, '') ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Teacher Assignment</label>
                  <select
                    value={cellForm.teacherId}
                    onChange={e => setCellForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="input text-xs"
                  >
                    <option value="">Free / Unassigned Period</option>
                    {(() => {
                      const filtered = teachers.filter(t => !cellForm.departmentName || t.department === cellForm.departmentName);
                      const list = filtered.length > 0 ? filtered : teachers;
                      return list.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.employeeId}){t.department ? ` - ${t.department}` : ''}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                <div className="flex justify-between gap-3 pt-2">
                  {selectedCell.item && (
                    <button
                      type="button"
                      onClick={handleClearSlot}
                      disabled={modalLoading}
                      className="btn-outline border-rose-200 text-rose-600 hover:bg-rose-50 text-xs py-2 px-4"
                    >
                      Clear Slot
                    </button>
                  )}
                  <div className="flex-1 flex justify-end gap-2">
                    <button type="button" onClick={() => setShowCellModal(false)} className="btn-outline text-xs py-2">Cancel</button>
                    <button type="submit" disabled={modalLoading} className="btn-primary text-xs py-2">
                      {modalLoading ? 'Saving...' : 'Save Schedule'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Add Teacher Remark Section (if slot has schedule already) */}
              {selectedCell.item && (
                <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
                  <h4 className="font-semibold text-xs text-primary uppercase tracking-wide">⚠️ Teacher Remark / Reschedule Alert</h4>
                  <p className="text-xxs text-gray-400 leading-normal">Simulate a teacher absence notification or class warning alert to prompt school admin coverage workflows.</p>

                  <form onSubmit={handleCellAddRemark} className="flex gap-2">
                    <input
                      value={cellForm.remark}
                      onChange={e => setCellForm(f => ({ ...f, remark: e.target.value }))}
                      placeholder="e.g. Leave today - request cover"
                      className="input text-xs flex-1"
                    />
                    <button
                      type="submit"
                      disabled={modalLoading || !cellForm.remark}
                      className="btn-outline text-xs py-2 whitespace-nowrap"
                    >
                      Post Alert
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Multi-Select Class Subject Mapping Modal */}
      {showMappingModal && mappingClassId && (() => {
        const currentClass = classes.find(c => c.id === mappingClassId);
        const existingSubjIds = new Set((classSubjectsList || []).map(cs => cs.subjectId || cs.id));
        const filteredSubjects = subjects.filter(s => {
          if (!subjectSearchQuery.trim()) return true;
          const q = subjectSearchQuery.toLowerCase();
          return s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || s.department?.toLowerCase().includes(q);
        });

        const toggleSubject = (id) => {
          setMappingForm(prev => {
            const cur = prev.selectedSubjectIds || [];
            if (cur.includes(id)) {
              return { ...prev, selectedSubjectIds: cur.filter(x => x !== id) };
            } else {
              return { ...prev, selectedSubjectIds: [...cur, id] };
            }
          });
        };

        const selectCoreSubjects = () => {
          const coreNames = ['hindi', 'english', 'mathematics', 'science', 'social'];
          const coreIds = subjects
            .filter(s => coreNames.some(cn => s.name?.toLowerCase().includes(cn)))
            .map(s => s.id);
          setMappingForm(prev => ({
            ...prev,
            selectedSubjectIds: Array.from(new Set([...(prev.selectedSubjectIds || []), ...coreIds]))
          }));
        };

        const selectAllFiltered = () => {
          setMappingForm(prev => ({
            ...prev,
            selectedSubjectIds: Array.from(new Set([...(prev.selectedSubjectIds || []), ...filteredSubjects.map(s => s.id)]))
          }));
        };

        const clearSelection = () => {
          setMappingForm(prev => ({ ...prev, selectedSubjectIds: [] }));
        };

        const selectedCount = (mappingForm.selectedSubjectIds || []).length;

        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <form onSubmit={handleSaveClassSubject} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col max-h-[90vh]">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-5 flex justify-between items-center text-white">
                <div>
                  {(() => {
                    const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
                    const gradeTitle = activeGradeGroup ? activeGradeGroup.formattedGrade : formatClassLabel(currentClass?.grade, currentClass?.section);
                    const sectionsNote = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';
                    return (
                      <>
                        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span>Link Subject(s) to {gradeTitle}</span>
                        </h3>
                        <p className="text-slate-300 text-xxs mt-0.5">
                          Saving only once automatically syncs all selected subjects to {gradeTitle}{sectionsNote}!
                        </p>
                      </>
                    );
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Search & Quick Action Chips */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={subjectSearchQuery}
                      onChange={e => setSubjectSearchQuery(e.target.value)}
                      placeholder="Search subject by name or code..."
                      className="input text-xs flex-1 py-1.5 px-3"
                    />
                    {subjectSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setSubjectSearchQuery('')}
                        className="text-gray-400 hover:text-gray-600 text-xs px-2"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={selectCoreSubjects}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer"
                    >
                      ⚡ + Core (Hindi, Eng, Math, Sci, SST)
                    </button>
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 transition cursor-pointer"
                    >
                      Reset
                    </button>
                    <span className="ml-auto text-xxs font-semibold text-gray-500">
                      {selectedCount} Selected
                    </span>
                  </div>
                </div>

                {/* Multi-Select Subject Checkbox List */}
                <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
                  {filteredSubjects.map(s => {
                    const isSelected = (mappingForm.selectedSubjectIds || []).includes(s.id);
                    const isAlreadyLinked = existingSubjIds.has(s.id);

                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-2.5 transition-colors cursor-pointer select-none ${
                          isAlreadyLinked
                            ? 'bg-gray-50/80 opacity-70 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-50/50 hover:bg-indigo-50'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected || isAlreadyLinked}
                            disabled={isAlreadyLinked}
                            onChange={() => !isAlreadyLinked && toggleSubject(s.id)}
                            className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                              <span>{s.name}</span>
                              <span className="text-[10px] font-mono font-normal bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                {s.code}
                              </span>
                            </div>
                            {s.department && (
                              <div className="text-[10px] text-gray-400">{s.department}</div>
                            )}
                          </div>
                        </div>

                        {isAlreadyLinked ? (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            ✓ Linked
                          </span>
                        ) : isSelected ? (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            Selected
                          </span>
                        ) : null}
                      </label>
                    );
                  })}
                  {filteredSubjects.length === 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 italic">No subjects match search.</div>
                  )}
                </div>

                {/* Optional Teacher Assignment */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assign Faculty Teacher (Optional)
                  </label>
                  <select
                    value={mappingForm.teacherId}
                    onChange={e => setMappingForm(f => ({ ...f, teacherId: e.target.value }))}
                    className="input text-xs"
                  >
                    <option value="">Leave Unassigned (Assign Later)</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.department ? `(${t.department})` : ''} - {t.employeeId}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    If you do not wish to assign a teacher right now, leave as "Leave Unassigned". You can assign a teacher at any time.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedCount === 0}
                  className="btn-primary text-xs px-5 py-2 font-bold disabled:opacity-50"
                >
                  {loading ? 'Linking...' : `Link ${selectedCount} Subject(s) to Class`}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* Assign / Edit Teacher Modal */}
      {showEditTeacherModal && editingClassSubject && (() => {
        const activeGradeGroup = uniqueGradeClasses.find(g => g.classIds.includes(mappingClassId));
        const gradeTitle = activeGradeGroup?.formattedGrade || 'Class';
        const secInfo = activeGradeGroup && activeGradeGroup.sections.length > 0 ? ` (Sections: ${activeGradeGroup.sections.join(', ')})` : '';

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <form onSubmit={handleSaveEditTeacher} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-6 py-5 flex justify-between items-center text-white">
                <div>
                  <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-400" />
                    <span>Assign / Change Teacher</span>
                  </h3>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {gradeTitle}{secInfo}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditTeacherModal(false)}
                  className="text-slate-300 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Subject Details Box */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <div className="text-xxs font-bold text-gray-400 uppercase tracking-wider">Subject</div>
                    <div className="text-sm font-bold text-gray-800 mt-0.5">{editingClassSubject.subjectName}</div>
                  </div>
                  <span className="bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-lg border border-primary/20 uppercase text-xs">
                    {editingClassSubject.subjectCode || 'N/A'}
                  </span>
                </div>

                {/* Current Assignment Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">
                    Current Assignment
                  </label>
                  <div className="text-xs">
                    {editingClassSubject.teacherName && editingClassSubject.teacherName !== 'Unassigned' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                        👤 {editingClassSubject.teacherName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 italic">
                        No teacher currently assigned
                      </span>
                    )}
                  </div>
                </div>

                {/* Teacher Dropdown Selection */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Select Teacher to Assign
                  </label>
                  <select
                    value={editTeacherForm.teacherId}
                    onChange={e => setEditTeacherForm({ teacherId: e.target.value })}
                    className="input text-xs sm:text-sm w-full py-2.5"
                    autoFocus
                  >
                    <option value="">-- None / Unassigned (Remove Teacher) --</option>
                    {teachers.map(t => (
                      <option key={t.id || t.Id} value={t.id || t.Id}>
                        {t.name || t.Name} {t.department ? `(${t.department})` : ''} {t.employeeId ? `[ID: ${t.employeeId}]` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-2">
                    💡 Assigning or changing a teacher automatically syncs across all sections of this class.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowEditTeacherModal(false)}
                  className="btn-outline text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <div className="flex items-center gap-2">
                  {editTeacherForm.teacherId && (
                    <button
                      type="button"
                      onClick={() => setEditTeacherForm({ teacherId: '' })}
                      className="text-xs text-rose-600 hover:text-rose-800 hover:underline px-2 py-1"
                    >
                      Clear Selection
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={savingTeacher}
                    className="btn-primary text-xs px-5 py-2 font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {savingTeacher ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Save Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        );
      })()}

      {/* AI Timetable Generator Modal */}
      {showAiTimetableModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col">
            <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>🤖 AI Smart Timetable Generator</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Automated constraint-based timetable scheduling with zero teacher clashes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAiTimetableModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Scheduling Scope:</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="scope"
                      value="selected"
                      checked={aiTimetableScope === 'selected'}
                      onChange={e => setAiTimetableScope(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-bold text-gray-800">
                        {(() => {
                          const active = uniqueGradeClasses.find(g => g.classIds.includes(selectedClassId));
                          const label = active ? active.formattedGrade : (classes.find(c => c.id === selectedClassId) ? formatGrade(classes.find(c => c.id === selectedClassId).grade) : 'Choose Class');
                          const sec = active && active.sections.length > 0 ? ` (Sections: ${active.sections.join(', ')})` : '';
                          return `Selected Class: ${label}${sec}`;
                        })()}
                      </div>
                      <div className="text-[11px] text-gray-400">Generates schedule once and syncs across all sections of this class without teacher clashes.</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-200 hover:bg-gray-50 cursor-pointer text-xs font-semibold">
                    <input
                      type="radio"
                      name="scope"
                      value="all"
                      checked={aiTimetableScope === 'all'}
                      onChange={e => setAiTimetableScope(e.target.value)}
                      className="text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-bold text-gray-800">Whole School Classes ({classes.length} Classes)</div>
                      <div className="text-[11px] text-gray-400">Globally balances all class timetables & prevents faculty double-booking.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/80 rounded-xl p-3.5 text-xs text-indigo-950 space-y-2">
                <div className="font-extrabold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>AI Timetable Generator & Regeneration Rules:</span>
                </div>
                <div className="text-[11px] space-y-1.5 text-indigo-900">
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Curriculum-Mapped Subjects Only:</strong> Schedules are strictly generated using only the subjects linked to each class in <em>Subjects Curriculum</em>.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Strict Faculty Preservation:</strong> The specific teacher assigned to each subject in Curriculum is strictly retained for all its scheduled periods.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-rose-600 font-bold">!</span>
                    <span><strong>Unmapped Class Validation:</strong> If no subjects are linked to a class, the AI will halt and notify: <em>"Please first map subjects with classes."</em></span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span><strong>Free & Extra Periods:</strong> Any spare or open periods are automatically scheduled as <strong>Game / Physical Activity</strong> periods.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span><strong>Zero Clash Guarantee:</strong> Double-booking of any faculty across multiple classes or periods is strictly prevented.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAiTimetableModal(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleGenerateAiTimetable()}
                disabled={aiGeneratingTimetable}
                className="btn-primary text-xs px-5 py-2.5 font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{aiGeneratingTimetable ? 'AI Regenerating...' : '🔄 Regenerate AI Timetable Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Substitution Alert Modal */}
      {showWhatsAppModal && whatsAppPreviewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-scale-up flex flex-col">
            <div className="p-5 bg-emerald-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <span>💬 WhatsApp Official Substitution Alert</span>
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Recipient: {whatsAppPreviewData.teacherName} ({whatsAppPreviewData.teacherPhone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="text-xs font-bold text-gray-700">Official WhatsApp Message Preview:</div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-slate-800 font-sans whitespace-pre-line leading-relaxed shadow-xs">
                {whatsAppPreviewData.message}
              </div>
              <p className="text-[11px] text-gray-400">
                Click "Open in WhatsApp" to deliver this official substitution notice to the teacher via WhatsApp Web or mobile app.
              </p>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowWhatsAppModal(false)}
                className="btn-outline text-xs"
              >
                Close
              </button>

              <a
                href={`https://api.whatsapp.com/send?phone=${whatsAppPreviewData.teacherPhone.replace(/[^0-9]/g, '')}&text=${encodeURIComponent(whatsAppPreviewData.message)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowWhatsAppModal(false)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition"
              >
                <span>💬 Open in WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Requirements Collection Modal */}
      {showUpgradeRequirementsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSubUpgradeRequirements} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary px-6 py-5 text-white">
              <h3 className="font-display font-bold text-base">
                {upgradeRequirementsPlanType === 'Custom' ? '📝 Submit Modification Requirements' : '🚀 Request Enterprise Upgrade'}
              </h3>
              <p className="text-blue-200 text-xxs mt-1">
                {upgradeRequirementsPlanType === 'Custom'
                  ? 'Specify new requirements/features to change in your custom plan.'
                  : 'Specify requirements to customize and scale your platform to Enterprise Plan.'}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">
                  Describe all your custom features, integration requirements, or modifications *
                </label>
                <textarea
                  required
                  rows={6}
                  value={upgradeRequirementsText}
                  onChange={e => setUpgradeRequirementsText(e.target.value)}
                  placeholder="e.g., We need integrations with our legacy biometric attendance devices, 2TB storage space, and customized student report card templates..."
                  className="input text-xs py-2 px-3 focus:ring-primary/20 w-full"
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xxs text-blue-700 leading-normal flex items-start gap-2">
                <span>💡</span>
                <span>
                  After submission, the Super Admin will review your requirements. Once approved, the customized pricing details (minimum charges + any requirement fees) will be shown, and you can pay to activate them.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowUpgradeRequirementsModal(false)}
                  disabled={payingSub}
                  className="btn-outline text-xs py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingSub || !upgradeRequirementsText.trim()}
                  className="btn-primary text-xs py-2 px-4"
                >
                  {payingSub ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Promotion setup: View Details Modal */}
      {showPromoViewModal && promoViewStudentData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Student Profile Details</h3>
                <p className="text-blue-200 text-xs">Profile overview for {promoViewStudentData.firstName} {promoViewStudentData.lastName}</p>
              </div>
              <button onClick={() => setShowPromoViewModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-5 text-sm max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Student ID</div>
                  <div className="font-mono font-semibold text-primary">{promoViewStudentData.studentId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Status</div>
                  <div>
                    <span className="badge badge-success text-xs">
                      {promoViewStudentData.status}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Email Address</div>
                  <div className="text-primary font-medium">{promoViewStudentData.email}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase mb-0.5">Blood Group</div>
                  <div className="text-primary font-medium">{promoViewStudentData.bloodGroup || 'Not Specified'}</div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="font-semibold text-primary text-xs uppercase mb-3 tracking-wide">👪 Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Guardian Name</div>
                    <div className="text-primary font-medium">{promoViewStudentData.guardianName}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Relationship</div>
                    <div className="text-primary font-medium">{promoViewStudentData.guardianRelationship}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-gray-400 font-semibold mb-0.5">Contact Number</div>
                    <div className="text-primary font-medium">{promoViewStudentData.guardianPhone}</div>
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase mb-1">Residential Address</div>
                <div className="text-primary font-medium bg-gray-50 p-3 rounded-lg border border-gray-100">{promoViewStudentData.address || 'No address registered.'}</div>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setShowPromoViewModal(false)} className="btn-primary text-xs py-2">Close Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion setup: Promote Student Modal */}
      {showPromoPromoteModal && promoPromotingStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 shadow-2xl animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Promote Student</h3>
                <p className="text-blue-200 text-xs">Advance student to the next academic grade level</p>
              </div>
              <button onClick={() => setShowPromoPromoteModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>
            <div className="p-6 space-y-4">
              {promoPromoteError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3">{promoPromoteError}</div>}
              <div>
                <div className="text-xs text-gray-400 font-bold uppercase mb-1">Student Details</div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="font-semibold text-primary">{promoPromotingStudent.name}</div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5">ID: {promoPromotingStudent.studentId}</div>
                  <div className="text-xs text-gray-500 mt-1">Current Class: <span className="font-semibold text-primary">{promoPromotingStudent.class} - {promoPromotingStudent.section}</span></div>
                  <div className="text-xs mt-2 flex items-center gap-1.5">
                    <span>Exam Status:</span>
                    {promoPromotingStudent.finalResult === "Pass" ? (
                      <span className="badge badge-success text-[10px] py-0.5 px-2 font-bold">✅ Pass (GPA: {promoPromotingStudent.gpa})</span>
                    ) : promoPromotingStudent.finalResult === "Fail" ? (
                      <span className="badge badge-danger text-[10px] py-0.5 px-2 font-bold">⚠️ Fail (GPA: {promoPromotingStudent.gpa})</span>
                    ) : (
                      <span className="badge badge-gray text-[10px] py-0.5 px-2 font-bold">No Exam Records</span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Promotion Class *</label>
                <select
                  value={promoPromoteNextClassId}
                  onChange={e => setPromoPromoteNextClassId(e.target.value)}
                  className="input w-full text-xs"
                  required
                >
                  <option value="">Select Target Class</option>
                  {promoClassSections.map(c => (
                    <option key={c.id} value={c.id}>
                      {formatClassLabel(c.grade, c.section)} {c.teacher ? `(Teacher: ${c.teacher})` : '(No Teacher)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button onClick={() => setShowPromoPromoteModal(false)} className="btn-outline text-xs">Cancel</button>
              <button
                onClick={handlePromoPromoteSubmit}
                disabled={promoPromoting || !promoPromoteNextClassId}
                className="btn-primary text-xs"
              >
                {promoPromoting ? 'Promoting...' : 'Promote Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Master Data Excel / CSV Import Modal */}
      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-up max-h-[90vh] flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                  <span>Import School Infrastructure from Excel / CSV</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Upload a spreadsheet to bulk-register Sections, Rooms, Grades, Capacities, Departments, Subjects & Exam Types.
                </p>
              </div>
              <button
                onClick={() => setShowBulkImportModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Step 1: Download Template */}
              <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-primary">Need the pre-formatted Excel template?</h4>
                  <p className="text-xxs text-gray-500 mt-0.5">
                    Download our ready-made CSV template pre-filled with standard Sections, Rooms, Class 1-12, Capacities, Subjects & Exams.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadMasterTemplate}
                  className="btn-outline text-xs px-3.5 py-1.5 flex items-center gap-1.5 shrink-0 bg-white border-blue-300 text-primary font-bold hover:bg-blue-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Step 2: Upload Zone */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-primary transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="masterCsvInput"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={(e) => e.target.files?.[0] && handleParseCsvFile(e.target.files[0])}
                  className="hidden"
                />
                <label htmlFor="masterCsvInput" className="cursor-pointer flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-primary">
                    {bulkImportFile ? bulkImportFile.name : 'Click to select CSV file, or drag & drop here'}
                  </span>
                  <span className="text-xxs text-gray-400">
                    Supports .csv files with headers: Section, Room, GradeLevel, RoomCapacity, Department, Subject, ExamType
                  </span>
                </label>
              </div>

              {/* Step 3: Preview */}
              {bulkImportParsed && (
                <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Parsed Summary Preview (Ready to Import)</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Sections</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.sections.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.sections.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Rooms</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.rooms.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.rooms.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Grade Levels</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.grades.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.grades.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Capacities</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.capacities.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.capacities.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Departments</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.departments.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.departments.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-gray-400 block">Subjects</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.subjects.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.subjects.join(', ')}</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100 col-span-2">
                      <span className="text-[10px] text-gray-400 block">Examination Types</span>
                      <strong className="text-primary font-bold">{bulkImportParsed.examTypes.length}</strong> items
                      <div className="text-[9px] text-gray-500 truncate mt-0.5">{bulkImportParsed.examTypes.join(', ')}</div>
                    </div>
                  </div>
                </div>
              )}

              {bulkImportStatus && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>{bulkImportStatus}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                disabled={bulkImporting}
                className="btn-outline text-xs px-4 py-2 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteCsvImport}
                disabled={bulkImporting || !bulkImportParsed}
                className="btn-primary text-xs px-6 py-2.5 font-bold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{bulkImporting ? 'Importing Master Data...' : '🚀 Start Bulk Import'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Setup;
