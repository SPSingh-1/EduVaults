import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

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
  const [promoPromoteError, setPromoPromoteError] = useState('');
  const [promoPromoting, setPromoPromoting] = useState(false);

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

  // Subscription state
  const [subInfo, setSubInfo] = useState(null);
  const [payingSub, setPayingSub] = useState(false);
  const [platformPlans, setPlatformPlans] = useState([]);
  const [showUpgradeRequirementsModal, setShowUpgradeRequirementsModal] = useState(false);
  const [upgradeRequirementsPlanType, setUpgradeRequirementsPlanType] = useState('Enterprise');
  const [upgradeRequirementsText, setUpgradeRequirementsText] = useState('');

  // Tab 2: Timetable State
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classSubjectsList, setClassSubjectsList] = useState([]);
  const [mappingClassId, setMappingClassId] = useState('');
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingForm, setMappingForm] = useState({ subjectId: '', teacherId: '' });
  const [scheduleItems, setScheduleItems] = useState([]);
  const [showCellModal, setShowCellModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null); // { day, period }

  // Modal Cell form state
  const [cellForm, setCellForm] = useState({
    departmentName: '',
    subjectId: '',
    teacherId: '',
    remark: ''
  });

  // Tab 3: Substitutions State
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [selectedAlertItem, setSelectedAlertItem] = useState(null);
  const [availableSubstitutes, setAvailableSubstitutes] = useState([]);
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState('');

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
      const scriptLoaded = await loadSubScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        setPayingSub(false);
        return;
      }

      const orderRes = await apiClient.post(`/billing/create-subscription-order?isRenewal=${isRenewal}`);
      const { orderId, amount, currency, keyId, isMock } = orderRes.data;

      const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

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
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature || 'mock_signature'
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
      setGradeLevels(glRes.data);

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
      setClasses(clsRes.data);

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
      const res = await apiClient.get(`/academics/timetable/schedule/${classId}`);
      setScheduleItems(res.data);
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

    const selectedClass = classes.find(c => c.id === feeForm.classId);
    const gradeStr = selectedClass ? `Class ${selectedClass.grade} - ${selectedClass.section}` : '';

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
      setSuccess('Fee rule created and stagered invoices generated successfully!');
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
      const clsRes = await apiClient.get('/academics/classes');
      setClasses(clsRes.data);
      if (clsRes.data.length > 0 && !mappingClassId) {
        setMappingClassId(clsRes.data[0].id);
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
      const studRes = await apiClient.get('/academics/students');
      setPromoStudents(studRes.data);

      const classRes = await apiClient.get('/academics/enrollment-classes');
      setPromoClasses(classRes.data);

      const secRes = await apiClient.get('/academics/classes');
      setPromoClassSections(secRes.data);
    } catch (err) {
      console.error('Error fetching promotion setup data:', err);
    } finally {
      setLoadingPromo(false);
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
    return cls.toString().toLowerCase().replace(/\s+/g, '').replace(/^class/, '');
  };

  const handleSaveClassSubject = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!mappingClassId || !mappingForm.subjectId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.post('/academics/class-subjects', {
        classId: mappingClassId,
        subjectId: mappingForm.subjectId,
        teacherId: mappingForm.teacherId || null
      });
      setSuccess('Subject linked to class successfully!');
      setShowMappingModal(false);
      setMappingForm({ subjectId: '', teacherId: '' });
      fetchClassSubjects(mappingClassId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to map subject to class.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClassSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to remove this subject from this class?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.delete(`/academics/class-subjects/${mappingClassId}/${subjectId}`);
      setSuccess('Subject mapping removed successfully!');
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

      await apiClient.post('/academics/timetable/schedule', {
        classId: selectedClassId,
        subjectId: isClearing ? null : cellForm.subjectId,
        customSubjectName: null,
        teacherId: isClearing ? null : cellForm.teacherId,
        periodNumber: selectedCell.periodNo,
        dayOfWeek: selectedCell.day
      });

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
      await apiClient.post('/academics/timetable/schedule', {
        classId: selectedClassId,
        subjectId: null,
        customSubjectName: null,
        teacherId: null,
        periodNumber: selectedCell.periodNo,
        dayOfWeek: selectedCell.day
      });
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
      <div className="flex gap-2 border-b border-gray-100 pb-4 mt-4 px-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        {[
          { id: 'infrastructure', label: 'Infrastructure Setup', icon: '📂' },
          { id: 'timetable', label: 'Weekly Timetable Config', icon: '📅', action: fetchTimetableMeta },
          { id: 'substitutions', label: 'Substitution & Cover Alerts', icon: '👩‍🏫', badge: activeAlerts.length, action: fetchActiveAlerts },
          { id: 'fees', label: 'Fee Rules Setup', icon: '💰', action: fetchFeeSetupData },
          { id: 'class-subjects', label: 'Class Subjects Mapping', icon: '📚', action: fetchClassSubjectsData },
          { id: 'promotion-setup', label: 'Student Promotion Setup', icon: '🚀', action: fetchPromotionSetupData },
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 border ${isActive
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]'
                  : 'bg-white text-gray-500 border-gray-200/60 hover:text-primary hover:border-primary/20 hover:bg-gray-50'
                }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-rose-500 text-white' : 'bg-rose-500 text-white animate-pulse'
                  }`}>
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
                <div className="flex gap-2">
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
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Selected Class:</label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="input flex-1 sm:w-56 text-sm"
                  >
                    <option value="">Select Class Section</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Class {c.grade} - {c.section}</option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClassId ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase text-center w-28">Period</th>
                        {days.map(d => (
                          <th key={d} className="border border-gray-200 p-3 text-xs font-bold text-gray-500 uppercase text-center">{d}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map(p => (
                        <tr key={p.id}>
                          <td className="border border-gray-200 p-3 text-center bg-gray-50">
                            <div className="font-bold text-primary text-xs">Period {p.periodNumber}</div>
                            <div className="text-xxs text-gray-400">{p.startTime} - {p.endTime}</div>
                          </td>
                          {days.map(day => {
                            const cell = scheduleItems.find(s => s.dayOfWeek === day && s.periodNumber === p.periodNumber);
                            return (
                              <td
                                key={day}
                                onClick={() => handleCellClick(day, p.periodNumber)}
                                className="border border-gray-200 p-3 text-center cursor-pointer hover:bg-indigo-50/30 transition-colors"
                              >
                                {cell && cell.teacherId ? (
                                  <div className="space-y-1">
                                    <div className="font-semibold text-xs text-primary leading-tight">{cell.subjectName || '—'}</div>
                                    <div className="text-xxs text-gray-400">👨‍🏫 {cell.teacherName}</div>
                                    {cell.isRescheduled && (
                                      <span className="badge badge-warning text-xxs py-0.5 mt-0.5 inline-block">COVER ASSIGNED</span>
                                    )}
                                    {cell.remark && (
                                      <div
                                        title={cell.remark}
                                        className="bg-rose-50 border border-rose-100 text-rose-600 text-[10px] p-1 rounded mt-1 font-medium cursor-help"
                                      >
                                        ⚠️ {cell.remark.length > 30 ? cell.remark.slice(0, 30) + '...' : cell.remark}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xxs text-gray-300 italic py-2 hover:text-indigo-600">+ Assign</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400 text-sm">Please select a class/section above to manage its timetable schedule.</div>
              )}
            </div>
          </div>
        )}



        {/* Tab 3 Content */}
        {activeTab === 'substitutions' && (
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
                      value={feeForm.classId}
                      onChange={e => setFeeForm(f => ({ ...f, classId: e.target.value }))}
                      className="input text-xs"
                      required
                    >
                      <option value="">Choose Class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>
                          Class {c.grade} - {c.section}
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

                  {feeForm.type === 'student' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Student *</label>
                      <select
                        value={feeForm.studentId}
                        onChange={e => setFeeForm(f => ({ ...f, studentId: e.target.value }))}
                        className="input text-xs"
                        required
                      >
                        <option value="">Choose Student</option>
                        {studentsList
                          .filter(s => s.classId === feeForm.classId)
                          .map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.studentId})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {feeForm.classId && (
                    <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 text-xs">
                      <div className="font-bold text-gray-500 mb-2 uppercase text-[10px]">
                        Students in selected class
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {studentsList.filter(s => s.classId === feeForm.classId).map(s => {
                          const isSelected = feeForm.type === 'student' && feeForm.studentId === s.id;
                          return (
                            <div key={s.id} className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 font-bold text-primary' : 'bg-white border-gray-100'}`}>
                              <span>{s.name}</span>
                              <span className="text-[10px] text-gray-400 font-mono">{s.studentId}</span>
                            </div>
                          );
                        })}
                        {studentsList.filter(s => s.classId === feeForm.classId).length === 0 && (
                          <div className="text-gray-400 italic text-2xs text-center py-2">No students enrolled in this class.</div>
                        )}
                      </div>
                    </div>
                  )}

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
                                return (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {parsed.map((item, idx) => (
                                      <span key={idx} className="inline-block px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg border border-primary/10">
                                        {item.category}: Rs. {item.amount.toLocaleString()}
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
                          <td className="py-3 text-sm font-bold text-gray-700">Rs. {fr.amount.toLocaleString()}</td>
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

        {activeTab === 'class-subjects' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Left Panel: Class Selector */}
            <div className="card md:col-span-1 h-fit">
              <h3 className="font-display font-bold text-primary text-base mb-2 flex items-center gap-2">
                🏫 Select Class
              </h3>
              <p className="text-gray-400 text-xxs mb-4">Choose a class to view and map its subjects.</p>

              <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
                {classes.map(c => {
                  const isActive = mappingClassId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setMappingClassId(c.id)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-between ${isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/25'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-primary'
                        }`}
                    >
                      <span>Class {c.grade} - {c.section}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>
                        Go
                      </span>
                    </button>
                  );
                })}
                {classes.length === 0 && (
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
                    Manage subjects taught in {classes.find(c => c.id === mappingClassId) ? `Class ${classes.find(c => c.id === mappingClassId).grade} - ${classes.find(c => c.id === mappingClassId).section}` : 'the selected class'}.
                  </p>
                </div>

                {mappingClassId && (
                  <button
                    onClick={() => setShowMappingModal(true)}
                    className="btn-primary text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
                  >
                    <span>+ Link Subject</span>
                  </button>
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
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100 font-semibold">
                                👤 {cs.teacherName}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic text-xs font-normal">No teacher assigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteClassSubject(cs.subjectId)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                              title="Remove Subject"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
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
        )}

        {activeTab === 'promotion-setup' && (() => {
          const promoUniqueSections = [...new Set(promoClassSections.map(c => c.section))].filter(Boolean).sort();
          const filteredPromo = promoStudents.filter(s => {
            const nameStr = s.name || '';
            const matchesName = !promoSearch || nameStr.toLowerCase().includes(promoSearch.toLowerCase());
            const matchesClass = !promoSelectedClass || normalizePromoClass(s.class) === normalizePromoClass(promoSelectedClass);
            const matchesSection = !promoSelectedSection || s.section === promoSelectedSection;
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
                    {promoClasses.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  <select className="input w-full text-xs sm:text-sm" value={promoSelectedSection} onChange={e => setPromoSelectedSection(e.target.value)}>
                    <option value="">Section All</option>
                    {promoUniqueSections.map((sec, idx) => (
                      <option key={idx} value={sec}>{sec}</option>
                    ))}
                  </select>

                  <select className="input w-full text-xs sm:text-sm" value={promoSelectedStatus} onChange={e => setPromoSelectedStatus(e.target.value)}>
                    <option value="">Status: All</option>
                    <option value="ACTIVE">Active</option>
                    <option value="WITHDRAWN">Withdrawn</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              {loadingPromo ? (
                <div className="text-center py-8 text-gray-400 text-sm italic">Loading student setup list...</div>
              ) : (
                <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
                  <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
                    <table className="w-full" style={{ minWidth: '780px', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="table-th">Student Name</th>
                          <th className="table-th">Student ID</th>
                          <th className="table-th">Class</th>
                          <th className="table-th">Section</th>
                          <th className="table-th">Father's Name</th>
                          <th className="table-th">Exam Status / GPA</th>
                          <th className="table-th">Status</th>
                          <th className="table-th">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPromo.map(s => (
                          <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="table-td">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                  {s.name ? s.name[0] : '?'}
                                </div>
                                <div>
                                  <div className="font-semibold text-primary text-sm">{s.name}</div>
                                  <div className="text-xs text-gray-400">{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="table-td text-xs font-mono text-gray-500">{s.studentId}</td>
                            <td className="table-td text-sm">{s.class}</td>
                            <td className="table-td text-sm">{s.section}</td>
                            <td className="table-td text-sm">{s.father}</td>
                            <td className="table-td text-xs">
                              {s.finalResult === "Pass" ? (
                                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-200/50">✅ Pass (GPA: {s.gpa})</span>
                              ) : s.finalResult === "Fail" ? (
                                <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-200/50">❌ Fail (GPA: {s.gpa})</span>
                              ) : (
                                <span className="text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded">—</span>
                              )}
                            </td>
                            <td className="table-td"><span className={sc[s.status] || 'badge-success'}>{s.status}</span></td>
                            <td className="table-td">
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => handlePromoViewClick(s.id)} className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105" title="View Profile">
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
                </div>
              )}
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
                            {p.monthlyPrice.includes('Rs.') ? p.monthlyPrice.replace('Rs.', '$') : p.monthlyPrice.includes('$') ? p.monthlyPrice : `$${p.monthlyPrice}`}
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
      </div>

      {/* Grid Cell Edit Modal */}
      {showCellModal && selectedCell && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">Schedule: Period {selectedCell.periodNo}</h3>
                <p className="text-blue-200 text-xxs">{selectedCell.day} weekly timetable configuration</p>
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
      {/* Class Subject Mapping Modal */}
      {showMappingModal && mappingClassId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveClassSubject} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-5 flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-base">Link Subject to Class</h3>
                <p className="text-blue-200 text-xxs">Configure curriculum details</p>
              </div>
              <button type="button" onClick={() => setShowMappingModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Subject *</label>
                <select
                  required
                  value={mappingForm.subjectId}
                  onChange={e => setMappingForm(f => ({ ...f, subjectId: e.target.value }))}
                  className="input text-xs"
                >
                  <option value="">Choose Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assign Subject Teacher (Optional)</label>
                <select
                  value={mappingForm.teacherId}
                  onChange={e => setMappingForm(f => ({ ...f, teacherId: e.target.value }))}
                  className="input text-xs"
                >
                  <option value="">Unassigned</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                <button type="button" onClick={() => setShowMappingModal(false)} className="btn-outline text-xs py-2">Cancel</button>
                <button type="submit" className="btn-primary text-xs py-2">Link Subject</button>
              </div>
            </div>
          </form>
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
                      Class {c.grade} - {c.section} {c.teacher ? `(Teacher: ${c.teacher})` : '(No Teacher)'}
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
    </div>
  );
};

export default Setup;
