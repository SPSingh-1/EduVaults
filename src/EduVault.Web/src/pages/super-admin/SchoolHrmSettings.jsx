import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  Building2, Users, Clock, Calendar, ShieldCheck, 
  Calculator, AlertTriangle, CheckCircle2, Plus, 
  Trash2, RefreshCw, ArrowLeft, Sliders, Briefcase, 
  Award, FileText, ChevronRight, PlayCircle
} from 'lucide-react';

const SchoolHrmSettings = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Tab Data States
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [workSchedule, setWorkSchedule] = useState({
    shiftName: 'Standard Morning Shift',
    startTime: '08:00',
    endTime: '14:30',
    graceMinutes: 15,
    lateCountThresholdForHalfDay: 3,
    halfDayMinutesThreshold: 240,
    workingDaysMask: '1111100',
    saturdayRule: 'FullWorking',
    isOvertimeEnabled: false,
    overtimeRateMultiplier: 1.0
  });
  const [leavePolicies, setLeavePolicies] = useState([]);
  const [salaryComponents, setSalaryComponents] = useState([]);
  const [pfConfig, setPfConfig] = useState({ isEnabled: true, employeeRate: 12.0, employerRate: 12.0, wageCeiling: 15000 });
  const [esiConfig, setEsiConfig] = useState({ isEnabled: true, employeeRate: 0.75, employerRate: 3.25, wageThreshold: 21000 });
  const [ptConfig, setPtConfig] = useState({ isEnabled: true, state: 'Maharashtra', amount: 200 });

  // Modal / Form States
  const [newDeptName, setNewDeptName] = useState('');
  const [newDesig, setNewDesig] = useState({ name: '', code: '', departmentId: '' });
  const [newLeavePolicy, setNewLeavePolicy] = useState({
    leaveTypeCode: 'CL',
    leaveTypeName: 'Casual Leave',
    annualAllotment: 12,
    carryForwardAllowed: false,
    maxCarryForwardDays: 0,
    isPaid: true
  });
  const [newSalaryComp, setNewSalaryComp] = useState({
    code: 'SPECIAL_ALW',
    name: 'Special Allowance',
    type: 'Earning',
    calculationType: 'Fixed',
    defaultValue: 5000,
    isTaxable: true,
    isPfApplicable: true,
    isEsiApplicable: true
  });

  // Preview Sandbox State
  const [previewInput, setPreviewInput] = useState({ grossSalary: 45000, totalWorkingDays: 30, presentDays: 28, lwpDays: 2 });
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [schoolId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError('');
      const [ovRes, deptRes, desigRes, schedRes, leaveRes, salCompRes, pfRes, esiRes, ptRes] = await Promise.all([
        apiClient.get(`/api/super/schools/${schoolId}/hrm/overview`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/departments`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/designations`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/work-schedule`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/leave-policies`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/salary-components`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/statutory/PF`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/statutory/ESI`),
        apiClient.get(`/api/super/schools/${schoolId}/hrm/statutory/PT`)
      ]);

      setOverview(ovRes.data);
      setDepartments(deptRes.data || []);
      setDesignations(desigRes.data || []);
      if (schedRes.data) setWorkSchedule(schedRes.data);
      setLeavePolicies(leaveRes.data || []);
      setSalaryComponents(salCompRes.data || []);

      if (pfRes.data) {
        try {
          const parsed = JSON.parse(pfRes.data.configurationJson || '{}');
          setPfConfig({ isEnabled: pfRes.data.isEnabled, ...parsed });
        } catch (e) {}
      }
      if (esiRes.data) {
        try {
          const parsed = JSON.parse(esiRes.data.configurationJson || '{}');
          setEsiConfig({ isEnabled: esiRes.data.isEnabled, ...parsed });
        } catch (e) {}
      }
      if (ptRes.data) {
        try {
          const parsed = JSON.parse(ptRes.data.configurationJson || '{}');
          setPtConfig({ isEnabled: ptRes.data.isEnabled, state: parsed.state || 'Maharashtra', amount: 200 });
        } catch (e) {}
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load school HRM configuration.');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // Department Handlers
  const handleAddDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      setSaving(true);
      const res = await apiClient.post(`/api/super/schools/${schoolId}/hrm/departments`, { name: newDeptName });
      setDepartments([...departments, res.data]);
      setNewDeptName('');
      showNotification('Department added successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add department');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDept = async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await apiClient.delete(`/api/super/schools/${schoolId}/hrm/departments/${id}`);
      setDepartments(departments.filter(d => d.id !== id));
      showNotification('Department deleted.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete department');
    }
  };

  // Designation Handlers
  const handleAddDesig = async (e) => {
    e.preventDefault();
    if (!newDesig.name.trim()) return;
    try {
      setSaving(true);
      const res = await apiClient.post(`/api/super/schools/${schoolId}/hrm/designations`, newDesig);
      setDesignations([...designations, res.data]);
      setNewDesig({ name: '', code: '', departmentId: '' });
      showNotification('Designation created.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create designation');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDesig = async (id) => {
    if (!confirm('Delete this designation?')) return;
    try {
      await apiClient.delete(`/api/super/schools/${schoolId}/hrm/designations/${id}`);
      setDesignations(designations.filter(d => d.id !== id));
      showNotification('Designation removed.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove designation');
    }
  };

  // Work Schedule Handler
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.put(`/api/super/schools/${schoolId}/hrm/work-schedule`, workSchedule);
      showNotification('Work Schedule and Shift timings saved successfully.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save work schedule');
    } finally {
      setSaving(false);
    }
  };

  // Leave Policy Handler
  const handleSaveLeavePolicy = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await apiClient.post(`/api/super/schools/${schoolId}/hrm/leave-policies`, newLeavePolicy);
      const res = await apiClient.get(`/api/super/schools/${schoolId}/hrm/leave-policies`);
      setLeavePolicies(res.data || []);
      showNotification('Leave policy saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save leave policy');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLeavePolicy = async (id) => {
    try {
      await apiClient.delete(`/api/super/schools/${schoolId}/hrm/leave-policies/${id}`);
      setLeavePolicies(leavePolicies.filter(l => l.id !== id));
      showNotification('Leave policy removed.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete leave policy');
    }
  };

  // Salary Component Handler
  const handleAddSalaryComp = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiClient.post(`/api/super/schools/${schoolId}/hrm/salary-components`, newSalaryComp);
      setSalaryComponents([...salaryComponents, res.data]);
      showNotification('Salary Component created.');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add salary component');
    } finally {
      setSaving(false);
    }
  };

  // Statutory Handler
  const handleSaveStatutory = async (type, isEnabled, dataObj) => {
    try {
      setSaving(true);
      await apiClient.post(`/api/super/schools/${schoolId}/hrm/statutory/${type}`, {
        isEnabled,
        configurationJson: JSON.stringify(dataObj),
        remarks: `Updated via Super Admin console`
      });
      showNotification(`${type} statutory settings updated with new version.`);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to update ${type} config`);
    } finally {
      setSaving(false);
    }
  };

  // Run Safe Preview Simulation
  const handleRunPreview = async () => {
    try {
      setPreviewLoading(true);
      const res = await apiClient.post(`/api/super/schools/${schoolId}/hrm/preview-calculation`, previewInput);
      setPreviewResult(res.data);
    } catch (err) {
      setError('Preview calculation failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) return <Loader fullScreen text="Loading School HRM Configuration Architecture..." />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <Topbar title="Super Admin — School HRM Master Configuration" subtitle={`School ID: ${schoolId}`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/super-admin/schools')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Schools Directory
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
              Multi-Tenant Rule Engine Active
            </span>
            <button 
              onClick={loadAllData}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-700 text-sm shadow-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="flex-1 font-semibold">{successMsg}</span>
          </div>
        )}

        {/* School Overview Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Building2 className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-slate-900">{overview?.school?.name || 'School HRM Center'}</h1>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md border border-slate-200">
                {overview?.school?.schoolCode || 'SCH-CODE'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Configure dynamic statutory rates, work schedules, shifts, leave quotas, and compensation formulas specific to this school tenant.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
            <div className="text-center">
              <span className="block text-2xl font-black text-slate-900">{overview?.metrics?.totalEmployees || 0}</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Employees</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-indigo-600">{overview?.metrics?.departments || 0}</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Depts</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-black text-emerald-600">{overview?.metrics?.leavePolicies || 0}</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Leaves</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Hub */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-2">
          {[
            { id: 'overview', label: '1. Overview & Health', icon: ShieldCheck },
            { id: 'masters', label: '2. HR Masters', icon: Users },
            { id: 'schedule', label: '3. Work & Shifts', icon: Clock },
            { id: 'leaves', label: '4. Leave Policies', icon: Calendar },
            { id: 'statutory', label: '5. Statutory & Pay', icon: Calculator },
            { id: 'preview', label: '6. Sandbox Preview', icon: PlayCircle }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & HEALTH STATUS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {overview?.warnings && overview.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <span>Configuration Health Alerts ({overview.warnings.length})</span>
                </div>
                <ul className="space-y-2">
                  {(overview.warnings || []).map((w, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs font-medium text-amber-700 bg-white/70 px-3 py-2 rounded-xl border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Statutory Compliance</span>
                  <Sliders className="w-4 h-4 text-slate-400" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <span className="text-xs font-bold text-slate-700">Provident Fund (PF)</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${overview?.metrics?.isPfEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {overview?.metrics?.isPfEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <span className="text-xs font-bold text-slate-700">Employee State Insurance (ESI)</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${overview?.metrics?.isEsiEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {overview?.metrics?.isEsiEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                    <span className="text-xs font-bold text-slate-700">Professional Tax (PT)</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${overview?.metrics?.isPtEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {overview?.metrics?.isPtEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm md:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Multi-Tenant Engine Principles</span>
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <strong className="block text-indigo-900 font-bold mb-1">Zero Hardcoded Rules</strong>
                    <p className="text-slate-600 text-[11px]">All payroll calculations, shifts, and leave allocations execute dynamically based on this school's configuration records.</p>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <strong className="block text-indigo-900 font-bold mb-1">Versioned Statutory Audit</strong>
                    <p className="text-slate-600 text-[11px]">Changing PF or ESI settings creates a new effective-dated version. Past payslips remain 100% reproducible.</p>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <strong className="block text-indigo-900 font-bold mb-1">Unified Employee Master</strong>
                    <p className="text-slate-600 text-[11px]">Teachers, Accountants, Receptionists, Drivers, and Security are stored as unified Employees with customized profiles.</p>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <strong className="block text-indigo-900 font-bold mb-1">Deterministic State Machine</strong>
                    <p className="text-slate-600 text-[11px]">Draft $\rightarrow$ Calculated $\rightarrow$ Reviewed $\rightarrow$ Approved $\rightarrow$ Finalized/Locked $\rightarrow$ Paid workflow protects financial integrity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HR MASTERS */}
        {activeTab === 'masters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Departments Master */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Departments Master</h2>
                  <p className="text-xs text-slate-500">Configurable school departments</p>
                </div>
                <Briefcase className="w-5 h-5 text-indigo-600" />
              </div>

              <form onSubmit={handleAddDept} className="flex gap-2 mb-4">
                <input 
                  type="text"
                  placeholder="e.g. Science, Transport, Admin"
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                />
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </form>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {departments.map(d => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{d.name}</span>
                    <button 
                      onClick={() => handleDeleteDept(d.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Department"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {departments.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No custom departments yet.</p>
                )}
              </div>
            </div>

            {/* Designations Master */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Designations Master</h2>
                  <p className="text-xs text-slate-500">Configurable job titles & roles</p>
                </div>
                <Award className="w-5 h-5 text-indigo-600" />
              </div>

              <form onSubmit={handleAddDesig} className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="text"
                    placeholder="Designation Name"
                    value={newDesig.name}
                    onChange={e => setNewDesig({ ...newDesig, name: e.target.value })}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                  />
                  <input 
                    type="text"
                    placeholder="Code (e.g. PGT_MATH)"
                    value={newDesig.code}
                    onChange={e => setNewDesig({ ...newDesig, code: e.target.value })}
                    className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={newDesig.departmentId}
                    onChange={e => setNewDesig({ ...newDesig, departmentId: e.target.value })}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="">-- Optional Department --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </form>

              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
                {designations.map(d => (
                  <div key={d.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{d.name}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{d.code}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteDesig(d.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Designation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {designations.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">No custom designations yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: WORK & SHIFTS */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Work Schedules, Shifts & Grace Rules</h2>
                <p className="text-xs text-slate-500">Define working hours, punch grace periods, and late arrival deductions</p>
              </div>
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift Name</label>
                  <input 
                    type="text"
                    value={workSchedule.shiftName}
                    onChange={e => setWorkSchedule({ ...workSchedule, shiftName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Saturday Policy</label>
                  <select 
                    value={workSchedule.saturdayRule}
                    onChange={e => setWorkSchedule({ ...workSchedule, saturdayRule: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                  >
                    <option value="FullWorking">Full Working Day</option>
                    <option value="HalfDay">Half Day</option>
                    <option value="AlternateOff">Alternate Saturdays Off</option>
                    <option value="Holiday">Always Holiday</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift Start Time</label>
                  <input 
                    type="time"
                    value={workSchedule.startTime}
                    onChange={e => setWorkSchedule({ ...workSchedule, startTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Shift End Time</label>
                  <input 
                    type="time"
                    value={workSchedule.endTime}
                    onChange={e => setWorkSchedule({ ...workSchedule, endTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grace Period (Minutes)</label>
                  <input 
                    type="number"
                    value={workSchedule.graceMinutes}
                    onChange={e => setWorkSchedule({ ...workSchedule, graceMinutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Half-Day Min (Mins)</label>
                  <input 
                    type="number"
                    value={workSchedule.halfDayMinutesThreshold}
                    onChange={e => setWorkSchedule({ ...workSchedule, halfDayMinutesThreshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-900">Late Punch Deduction Rule</span>
                  <span className="text-[11px] text-slate-500">Convert {workSchedule.lateCountThresholdForHalfDay} late punches into 0.5 Day Casual Leave / LWP deduction</span>
                </div>
                <input 
                  type="number"
                  min="1"
                  max="10"
                  value={workSchedule.lateCountThresholdForHalfDay}
                  onChange={e => setWorkSchedule({ ...workSchedule, lateCountThresholdForHalfDay: parseInt(e.target.value) || 3 })}
                  className="w-20 px-3 py-1.5 text-xs text-center border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none bg-white"
                />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                {saving ? 'Saving Changes...' : 'Save Work Schedule Settings'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: LEAVE POLICIES */}
        {activeTab === 'leaves' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Configurable Leave Types & Annual Quotas</h2>
                  <p className="text-xs text-slate-500">Define leave categories, paid/unpaid status, and carry forward rules</p>
                </div>
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>

              <form onSubmit={handleSaveLeavePolicy} className="grid grid-cols-1 sm:grid-cols-6 gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Code</label>
                  <input 
                    type="text" 
                    value={newLeavePolicy.leaveTypeCode}
                    onChange={e => setNewLeavePolicy({ ...newLeavePolicy, leaveTypeCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Leave Name</label>
                  <input 
                    type="text" 
                    value={newLeavePolicy.leaveTypeName}
                    onChange={e => setNewLeavePolicy({ ...newLeavePolicy, leaveTypeName: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Annual Days</label>
                  <input 
                    type="number" 
                    step="0.5"
                    value={newLeavePolicy.annualAllotment}
                    onChange={e => setNewLeavePolicy({ ...newLeavePolicy, annualAllotment: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input 
                    type="checkbox"
                    id="isPaid"
                    checked={newLeavePolicy.isPaid}
                    onChange={e => setNewLeavePolicy({ ...newLeavePolicy, isPaid: e.target.checked })}
                    className="rounded text-indigo-600"
                  />
                  <label htmlFor="isPaid" className="text-xs font-semibold text-slate-700">Paid Leave</label>
                </div>
                <div>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Save Policy
                  </button>
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Leave Type</th>
                      <th className="px-4 py-3">Annual Allotment</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leavePolicies.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{l.leaveTypeCode}</td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{l.leaveTypeName}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{l.annualAllotment} Days</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${l.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {l.isPaid ? 'PAID' : 'UNPAID'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => handleDeleteLeavePolicy(l.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: STATUTORY & COMPENSATION */}
        {activeTab === 'statutory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* PF Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-sm">Provident Fund (PF)</h3>
                    <input 
                      type="checkbox"
                      checked={pfConfig.isEnabled}
                      onChange={e => setPfConfig({ ...pfConfig, isEnabled: e.target.checked })}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Employee Contribution (%)</label>
                      <input 
                        type="number"
                        value={pfConfig.employeeRate}
                        onChange={e => setPfConfig({ ...pfConfig, employeeRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Statutory Wage Cap (₹)</label>
                      <input 
                        type="number"
                        value={pfConfig.wageCeiling}
                        onChange={e => setPfConfig({ ...pfConfig, wageCeiling: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleSaveStatutory('PF', pfConfig.isEnabled, pfConfig)}
                  className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Save PF Version
                </button>
              </div>

              {/* ESI Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-sm">Employee State Insurance (ESI)</h3>
                    <input 
                      type="checkbox"
                      checked={esiConfig.isEnabled}
                      onChange={e => setEsiConfig({ ...esiConfig, isEnabled: e.target.checked })}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Employee Rate (%)</label>
                      <input 
                        type="number"
                        step="0.05"
                        value={esiConfig.employeeRate}
                        onChange={e => setEsiConfig({ ...esiConfig, employeeRate: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Wage Ceiling Threshold (₹)</label>
                      <input 
                        type="number"
                        value={esiConfig.wageThreshold}
                        onChange={e => setEsiConfig({ ...esiConfig, wageThreshold: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleSaveStatutory('ESI', esiConfig.isEnabled, esiConfig)}
                  className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Save ESI Version
                </button>
              </div>

              {/* PT Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-sm">Professional Tax (PT)</h3>
                    <input 
                      type="checkbox"
                      checked={ptConfig.isEnabled}
                      onChange={e => setPtConfig({ ...ptConfig, isEnabled: e.target.checked })}
                      className="rounded text-indigo-600 w-4 h-4"
                    />
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-500 font-medium mb-1">Applicable State Slabs</label>
                      <select 
                        value={ptConfig.state}
                        onChange={e => setPtConfig({ ...ptConfig, state: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl bg-white"
                      >
                        <option value="Maharashtra">Maharashtra (₹200/mo)</option>
                        <option value="Karnataka">Karnataka (₹200/mo)</option>
                        <option value="WestBengal">West Bengal (₹150-₹200/mo)</option>
                        <option value="Delhi">Delhi (Exempt)</option>
                        <option value="Rajasthan">Rajasthan (Exempt)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleSaveStatutory('PT', ptConfig.isEnabled, ptConfig)}
                  className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  Save PT Version
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: SANDBOX PREVIEW */}
        {activeTab === 'preview' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">Deterministic Payroll Preview Simulator</h2>
                <p className="text-xs text-slate-500">Simulate payslip calculations under the current active school configuration without writing to database</p>
              </div>
              <PlayCircle className="w-6 h-6 text-indigo-600" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Base Gross Salary (₹)</label>
                <input 
                  type="number"
                  value={previewInput.grossSalary}
                  onChange={e => setPreviewInput({ ...previewInput, grossSalary: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Month Days</label>
                <input 
                  type="number"
                  value={previewInput.totalWorkingDays}
                  onChange={e => setPreviewInput({ ...previewInput, totalWorkingDays: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Present Days</label>
                <input 
                  type="number"
                  step="0.5"
                  value={previewInput.presentDays}
                  onChange={e => setPreviewInput({ ...previewInput, presentDays: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">LWP / Unpaid Days</label>
                <input 
                  type="number"
                  step="0.5"
                  value={previewInput.lwpDays}
                  onChange={e => setPreviewInput({ ...previewInput, lwpDays: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                />
              </div>
            </div>

            <button 
              onClick={handleRunPreview}
              disabled={previewLoading}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 mb-6"
            >
              <PlayCircle className="w-4 h-4" /> {previewLoading ? 'Evaluating Engine...' : 'Run Simulation Preview'}
            </button>

            {previewResult && (
              <div className="border border-indigo-100 rounded-2xl p-5 bg-indigo-50/30 space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                  <span className="text-xs font-bold text-indigo-900 uppercase">Simulation Breakdown (Pure Math Engine)</span>
                  <span className="text-xs font-mono font-bold text-slate-500">{previewResult.mode}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Earned Gross</span>
                    <span className="text-base font-extrabold text-slate-900">₹{previewResult.computedEarnings.earnedGross.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Basic (50%)</span>
                    <span className="text-base font-extrabold text-slate-900">₹{previewResult.computedEarnings.basicPay.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">PF Deduction (12%)</span>
                    <span className="text-base font-extrabold text-amber-600">₹{previewResult.computedDeductions.pfEmployee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">ESI Deduction</span>
                    <span className="text-base font-extrabold text-amber-600">₹{previewResult.computedDeductions.esiEmployee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Professional Tax</span>
                    <span className="text-base font-extrabold text-amber-600">₹{previewResult.computedDeductions.professionalTax.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Net In-Hand Salary</span>
                    <span className="text-base font-black text-emerald-800">₹{previewResult.netSalary.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolHrmSettings;
