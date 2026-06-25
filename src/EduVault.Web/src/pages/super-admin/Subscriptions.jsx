import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import { DollarSign, Users, CreditCard } from 'lucide-react';

const Subscriptions = () => {
  const [data, setData] = useState({
    totalMrr: 0,
    activeSubscribers: 0,
    renewals: []
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab state
  const [activeSubTab, setActiveSubTab] = useState('global'); // global, custom, requests
  
  // Extra data states
  const [schools, setSchools] = useState([]);
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [customPlans, setCustomPlans] = useState([]);
  
  // Custom pricing state
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [customPlansForm, setCustomPlansForm] = useState({
    standard: { implementationCost: 199, studentCapacity: '500 Students', storageLimit: '50 GB', monthlyPrice: '$49/mo' },
    enterprise: { implementationCost: 499, studentCapacity: 'Unlimited', storageLimit: '2 TB', monthlyPrice: 'Custom /mo' }
  });
  const [savingCustom, setSavingCustom] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  
  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [approvalPricing, setApprovalPricing] = useState({
    implementationCost: 499,
    studentCapacity: 'Unlimited',
    storageLimit: '2 TB',
    monthlyPrice: '$499/mo',
    upgradeCharge: 499
  });

  // Filter states
  const [filterUpgradeRequestsSchool, setFilterUpgradeRequestsSchool] = useState('');
  const [filterCustomRequestsSchool, setFilterCustomRequestsSchool] = useState('');

  // Request Details Popup states
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);

  const autoSelectLatestSchool = (requestsList, tab) => {
    const isCustom = tab === 'custom-requests';
    const filtered = requestsList.filter(r => isCustom ? r.requestedPlanType === 'Custom' : r.requestedPlanType !== 'Custom');
    if (filtered.length > 0) {
      const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const latestRequest = sorted[0];
      if (latestRequest && latestRequest.schoolId) {
        if (isCustom) {
          setFilterCustomRequestsSchool(latestRequest.schoolId);
        } else {
          setFilterUpgradeRequestsSchool(latestRequest.schoolId);
        }
      }
    }
  };

  const handleSubTabChange = (tab) => {
    setActiveSubTab(tab);
    if (tab === 'requests' || tab === 'custom-requests') {
      autoSelectLatestSchool(upgradeRequests, tab);
    }
  };

  const handleRowClick = (e, request) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }
    setSelectedRequestDetails(request);
    setShowDetailsPopup(true);
  };

  // Edit state
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState('');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newPlan, setNewPlan] = useState({
    tierLabel: '',
    planName: '',
    implementationCost: 0,
    studentCapacity: '',
    storageLimit: '',
    monthlyPrice: '',
    isTopRevenue: false
  });

  const fetchSubscriptions = async () => {
    try {
      const res = await apiClient.get('/super/subscriptions');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await apiClient.get('/super/plans');
      setPlans(res.data || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await apiClient.get('/super/schools');
      setSchools(res.data || []);
      if (res.data && res.data.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchUpgradeRequests = async () => {
    try {
      const res = await apiClient.get('/super/upgrade-requests');
      const reqs = res.data || [];
      setUpgradeRequests(reqs);
      if (activeSubTab === 'requests' || activeSubTab === 'custom-requests') {
        autoSelectLatestSchool(reqs, activeSubTab);
      }
    } catch (err) {
      console.error('Error fetching upgrade requests:', err);
    }
  };

  const fetchCustomPlans = async () => {
    try {
      const res = await apiClient.get('/super/plans/custom');
      setCustomPlans(res.data || []);
    } catch (err) {
      console.error('Error fetching custom plans:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
    fetchSchools();
    fetchUpgradeRequests();
    fetchCustomPlans();
  }, []);

  useEffect(() => {
    if (!selectedSchoolId) return;
    
    // Find custom configurations for this school
    const schoolConfigs = customPlans.filter(c => c.schoolId === selectedSchoolId);
    
    const standardConfig = schoolConfigs.find(c => c.planType.toLowerCase() === 'standard');
    const enterpriseConfig = schoolConfigs.find(c => c.planType.toLowerCase() === 'enterprise');
    
    setCustomPlansForm({
      standard: {
        implementationCost: standardConfig ? standardConfig.implementationCost : 199,
        studentCapacity: standardConfig ? standardConfig.studentCapacity : '500 Students',
        storageLimit: standardConfig ? standardConfig.storageLimit : '50 GB',
        monthlyPrice: standardConfig ? standardConfig.monthlyPrice : '$49/mo'
      },
      enterprise: {
        implementationCost: enterpriseConfig ? enterpriseConfig.implementationCost : 499,
        studentCapacity: enterpriseConfig ? enterpriseConfig.studentCapacity : 'Unlimited',
        storageLimit: enterpriseConfig ? enterpriseConfig.storageLimit : '2 TB',
        monthlyPrice: enterpriseConfig ? enterpriseConfig.monthlyPrice : 'Custom /mo'
      }
    });
  }, [selectedSchoolId, customPlans]);

  const handleSaveCustomPlans = async (e) => {
    e.preventDefault();
    if (!selectedSchoolId) return;
    setSavingCustom(true);
    try {
      await apiClient.post('/super/plans/custom', {
        schoolId: selectedSchoolId,
        planType: 'Standard',
        implementationCost: parseFloat(customPlansForm.standard.implementationCost) || 0,
        studentCapacity: customPlansForm.standard.studentCapacity,
        storageLimit: customPlansForm.standard.storageLimit,
        monthlyPrice: customPlansForm.standard.monthlyPrice
      });
      
      await apiClient.post('/super/plans/custom', {
        schoolId: selectedSchoolId,
        planType: 'Enterprise',
        implementationCost: parseFloat(customPlansForm.enterprise.implementationCost) || 0,
        studentCapacity: customPlansForm.enterprise.studentCapacity,
        storageLimit: customPlansForm.enterprise.storageLimit,
        monthlyPrice: customPlansForm.enterprise.monthlyPrice
      });

      setSaveSuccess('Custom plan parameters saved successfully for the school!');
      await fetchCustomPlans();
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      console.error('Error saving custom plan settings:', err);
      alert('Failed to save custom plan parameters.');
    } finally {
      setSavingCustom(false);
    }
  };

  const handleApproveRequest = (id) => {
    const request = upgradeRequests.find(r => r.id === id);
    if (!request) return;

    setApprovingRequest(request);

    // Look for preset custom configuration parameters
    const schoolConfigs = customPlans.filter(c => c.schoolId === request.schoolId);
    const enterpriseConfig = schoolConfigs.find(c => c.planType.toLowerCase() === 'enterprise');

    setApprovalPricing({
      implementationCost: enterpriseConfig ? enterpriseConfig.implementationCost : 499,
      studentCapacity: enterpriseConfig ? enterpriseConfig.studentCapacity : 'Unlimited',
      storageLimit: enterpriseConfig ? enterpriseConfig.storageLimit : '2 TB',
      monthlyPrice: enterpriseConfig ? enterpriseConfig.monthlyPrice : '$499/mo',
      upgradeCharge: enterpriseConfig ? (parseFloat(enterpriseConfig.monthlyPrice.replace('$', '').replace('/mo', '')) || 499) : 499
    });

    setShowApprovalModal(true);
  };

  const handleConfirmApproval = async (e) => {
    e.preventDefault();
    if (!approvingRequest) return;

    setProcessingRequestId(approvingRequest.id);
    try {
      await apiClient.post(`/super/upgrade-requests/${approvingRequest.id}/approve`, {
        implementationCost: parseFloat(approvalPricing.implementationCost) || 0,
        studentCapacity: approvalPricing.studentCapacity,
        storageLimit: approvalPricing.storageLimit,
        monthlyPrice: approvalPricing.monthlyPrice,
        upgradeCharge: parseFloat(approvalPricing.upgradeCharge) || 0
      });

      setSaveSuccess('Upgrade request approved and custom pricing applied successfully!');
      setShowApprovalModal(false);
      setApprovingRequest(null);
      await fetchUpgradeRequests();
      await fetchSubscriptions();
      await fetchCustomPlans();
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      console.error('Error approving request:', err);
      alert('Failed to approve upgrade request: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (id) => {
    if (!window.confirm('Are you sure you want to reject this upgrade request?')) {
      return;
    }
    setProcessingRequestId(id);
    try {
      await apiClient.post(`/super/upgrade-requests/${id}/reject`);
      setSaveSuccess('Plan upgrade request rejected.');
      await fetchUpgradeRequests();
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert('Failed to reject upgrade request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handlePlanChange = (id, field, value) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleSavePlan = async (id) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;

    setSavingId(id);
    setSaveSuccess('');
    try {
      const payload = {
        ...plan,
        implementationCost: parseFloat(plan.implementationCost) || 0
      };
      await apiClient.put(`/super/plans/${id}`, payload);
      setSaveSuccess(`Successfully updated configuration for ${plan.planName}!`);
      setEditingPlanId(null); // Exit edit mode
      fetchPlans();
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      console.error('Error saving plan updates:', err);
      alert('Failed to save plan updates. Please check your inputs and try again.');
    } finally {
      setSavingId(null);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.tierLabel || !newPlan.planName) {
      setCreateError('Tier Label and Plan Name are required.');
      return;
    }
    setCreatingPlan(true);
    setCreateError('');
    try {
      const payload = {
        ...newPlan,
        implementationCost: parseFloat(newPlan.implementationCost) || 0
      };
      await apiClient.post('/super/plans', payload);
      setSaveSuccess(`Successfully created new plan: ${newPlan.planName}!`);
      setShowCreateModal(false);
      setNewPlan({
        tierLabel: '',
        planName: '',
        implementationCost: 0,
        studentCapacity: '',
        storageLimit: '',
        monthlyPrice: '',
        isTopRevenue: false
      });
      fetchPlans();
      fetchSubscriptions();
      setTimeout(() => setSaveSuccess(''), 5000);
    } catch (err) {
      console.error('Error creating plan:', err);
      setCreateError(err.response?.data?.error || 'Failed to create plan. Please try again.');
    } finally {
      setCreatingPlan(false);
    }
  };

  const totalMrr = data.totalMrr;
  const activeSubscribers = data.activeSubscribers;
  const avgArpu = activeSubscribers > 0 ? Math.round(totalMrr / activeSubscribers) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500">Loading Subscription Management...</p>
      </div>
    );
  }

  return (
    <div>
      <Topbar
        title="Subscription Management"
        actions={
          <div className="flex gap-2">
            <button className="btn-outline text-xs">Export Report</button>
            <button 
              onClick={() => { setCreateError(''); setShowCreateModal(true); }}
              className="btn-primary text-xs"
            >
              + Create New Plan
            </button>
          </div>
        }
      />

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700 animate-in slide-in-from-top-4 duration-200">
          ✅ {saveSuccess}
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-gray-100 mb-6 gap-x-6 gap-y-2 sticky top-[72px] lg:top-[80px] z-30 bg-[#f4f6fb]/95 backdrop-blur-sm -mx-4 px-4 lg:-mx-6 lg:px-6 py-3 -mt-3 flex-wrap">
        <button 
          onClick={() => handleSubTabChange('global')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeSubTab === 'global' ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-405 hover:text-gray-600'}`}
        >
          📊 Global Plans & Analytics
        </button>
        <button 
          onClick={() => handleSubTabChange('custom')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all ${activeSubTab === 'custom' ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          ⚙️ Client Custom Pricing
        </button>
        <button 
          onClick={() => handleSubTabChange('requests')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === 'requests' ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          🔔 Upgrade Requests
          {upgradeRequests.filter(r => r.requestedPlanType !== 'Custom' && r.status === 'Pending').length > 0 && (
            <span className="bg-rose-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold animate-bounce">
              {upgradeRequests.filter(r => r.requestedPlanType !== 'Custom' && r.status === 'Pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => handleSubTabChange('custom-requests')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${activeSubTab === 'custom-requests' ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
        >
          📝 Custom Update Notifications
          {upgradeRequests.filter(r => r.requestedPlanType === 'Custom' && r.status === 'Pending').length > 0 && (
            <span className="bg-rose-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-bold animate-bounce">
              {upgradeRequests.filter(r => r.requestedPlanType === 'Custom' && r.status === 'Pending').length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'global' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total MRR', value: `$${totalMrr.toLocaleString()}`, change: 'Real-time', icon: DollarSign, color: 'text-violet-500', bgColor: 'bg-violet-50/50' },
              { label: 'Active Subscribers', value: activeSubscribers.toString(), change: 'Platform Stats', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-50/50' },
              { label: 'Avg. Revenue / User', value: `$${avgArpu.toLocaleString()}`, change: 'Computed', icon: CreditCard, color: 'text-orange-500', bgColor: 'bg-orange-50/50' },
            ].map(s => (
              <div key={s.label} className="stat-card flex items-center justify-between p-5 hover:shadow-md transition-all bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-gray-400">{s.label}</div>
                  <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
                  <div className="text-2xs font-semibold text-green-500 uppercase tracking-wider">{s.change}</div>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bgColor}`}>
                  <s.icon className={`w-6 h-6 ${s.color} stroke-[1.75]`} />
                </div>
              </div>
            ))}
          </div>

          {/* Plan Configurations */}
          <div className="card">
            <h3 className="font-display font-semibold text-primary mb-4">Active Plan Configuration</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {plans.map(p => {
                const isEditing = editingPlanId === p.id;
                return (
                  <div key={p.id} className={`border-2 rounded-xl p-5 relative transition-all duration-200 ${p.isTopRevenue ? 'border-accent bg-accent/5' : 'border-gray-200 bg-white'}`}>
                    {p.isTopRevenue && (
                      <div className="absolute -top-3 right-4 bg-accent text-white text-xs font-bold px-3 py-0.5 rounded-full">TOP REVENUE</div>
                    )}
                    
                    <div className="text-xs font-bold text-gray-400 mb-1">{p.tierLabel}</div>
                    
                    {/* Header title area with Edit Toggle Pencil Button */}
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                      <div className="font-display font-bold text-primary text-xl">{p.planName}</div>
                      <button 
                        onClick={() => setEditingPlanId(isEditing ? null : p.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold transition-colors"
                      >
                        {isEditing ? '✕ Cancel' : '✏️ Edit Plan'}
                      </button>
                    </div>

                    {isEditing ? (
                      /* EDIT MODE FORM FIELDS */
                      <div className="space-y-3.5 mb-4 mt-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Plan Name</label>
                          <input 
                            type="text"
                            value={p.planName}
                            onChange={(e) => handlePlanChange(p.id, 'planName', e.target.value)}
                            className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 font-semibold">Implementation Cost ($)</label>
                          <input 
                            type="number"
                            value={p.implementationCost}
                            onChange={(e) => handlePlanChange(p.id, 'implementationCost', e.target.value)}
                            className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Student Capacity</label>
                          <input 
                            type="text"
                            value={p.studentCapacity}
                            onChange={(e) => handlePlanChange(p.id, 'studentCapacity', e.target.value)}
                            className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Storage Limit</label>
                          <input 
                            type="text"
                            value={p.storageLimit}
                            onChange={(e) => handlePlanChange(p.id, 'storageLimit', e.target.value)}
                            className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Pricing Label</label>
                          <input 
                            type="text"
                            value={p.monthlyPrice}
                            onChange={(e) => handlePlanChange(p.id, 'monthlyPrice', e.target.value)}
                            className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 text-primary font-bold"
                          />
                        </div>
                        
                        <button 
                          onClick={() => handleSavePlan(p.id)}
                          disabled={savingId === p.id}
                          className="w-full bg-primary text-white py-2.5 rounded-lg text-xs font-semibold hover:bg-primary-light transition-all disabled:opacity-50 mt-3"
                        >
                          {savingId === p.id ? 'Saving Updates...' : '✓ Save Updates'}
                        </button>
                      </div>
                    ) : (
                      /* READ-ONLY PREMIUM MODE (Original design layout) */
                      <div className="space-y-3 mb-2">
                        <div className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-500 font-semibold">Implementation Cost ($)</span>
                          <span className="font-bold text-primary">${p.implementationCost.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-500">Student Capacity</span>
                          <span className="font-bold text-primary">{p.studentCapacity}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm py-1">
                          <span className="text-gray-500">Storage Limit</span>
                          <span className="font-bold text-primary">{p.storageLimit}</span>
                        </div>
                        <div className="font-display font-bold text-primary text-xl mt-4 pt-3 border-t border-gray-100">
                          {p.monthlyPrice}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {plans.length === 0 && (
                <div className="col-span-2 text-center text-gray-400 py-6 text-sm">
                  No plan configurations seeded or found in the database.
                </div>
              )}
            </div>
          </div>

          {/* Renewals History Table */}
          <div className="card">
            <h3 className="font-display font-semibold text-primary mb-4">Recent Subscription Renewals</h3>
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-th">Institution Name</th>
                    <th className="table-th">Plan Type</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Method</th>
                    <th className="table-th">Renew Date</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.renewals.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="table-td font-semibold text-primary">{r.institutionName}</td>
                      <td className="table-td"><span className="badge badge-gray">{r.planType}</span></td>
                      <td className="table-td font-medium">${r.amount}</td>
                      <td className="table-td text-gray-500">Stripe</td>
                      <td className="table-td text-gray-500">{r.renewDate}</td>
                      <td className="table-td"><span className={r.status === 'success' ? 'badge-success' : r.status === 'pending' ? 'badge-warning' : 'badge-danger'}>{r.status.toUpperCase()}</span></td>
                    </tr>
                  ))}
                  {data.renewals.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No renewals found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'custom' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="card">
            <h3 className="font-display font-semibold text-primary mb-2">Configure Client Plan Pricing</h3>
            <p className="text-gray-400 text-xs mb-4">Set customized subscription fees and limits for individual schools. These settings override global plan prices for that client's dashboard.</p>
            
            <div className="max-w-md mb-6">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Client School *</label>
              <select
                value={selectedSchoolId}
                onChange={e => setSelectedSchoolId(e.target.value)}
                className="input text-xs"
              >
                <option value="">Select a School</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.schoolCode})</option>
                ))}
              </select>
            </div>

            {selectedSchoolId ? (
              <>
                {(() => {
                  const pendingCustomRequestForSchool = selectedSchoolId
                    ? upgradeRequests.find(r => r.schoolId === selectedSchoolId && r.requestedPlanType === 'Custom' && r.status === 'Pending')
                    : null;

                  if (!pendingCustomRequestForSchool) return null;

                  return (
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl p-5 mb-6 text-xs font-semibold flex flex-col gap-3 shadow-sm animate-in slide-in-from-top duration-300">
                      <div className="flex items-center gap-2 text-sm">
                        <span>📝</span>
                        <span className="font-bold text-indigo-900 font-display">Pending Custom Plan Modification Requirements</span>
                      </div>
                      <div className="bg-white/80 border border-indigo-100 p-3.5 rounded-lg text-gray-700 font-normal whitespace-pre-wrap leading-relaxed">
                        {pendingCustomRequestForSchool.requirements}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 items-end mt-2 pt-3 border-t border-indigo-100/50">
                        <div className="flex-1 w-full max-w-xs">
                          <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-wider mb-1">Set Charge for this Modification ($) *</label>
                          <input
                            type="number"
                            placeholder="e.g. 150"
                            value={customPlansForm.enterprise.upgradeCharge || ''}
                            onChange={e => setCustomPlansForm(f => ({
                              ...f,
                              enterprise: { ...f.enterprise, upgradeCharge: e.target.value }
                            }))}
                            className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 text-primary font-bold"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const charge = parseFloat(customPlansForm.enterprise.upgradeCharge);
                              if (!charge || charge <= 0) {
                                alert('Please enter a valid amount to charge.');
                                return;
                              }
                              if (!window.confirm(`Approve custom modifications with charge of $${charge}?`)) return;
                              
                              setProcessingRequestId(pendingCustomRequestForSchool.id);
                              try {
                                await apiClient.post(`/super/upgrade-requests/${pendingCustomRequestForSchool.id}/approve`, {
                                  implementationCost: parseFloat(customPlansForm.enterprise.implementationCost) || 0,
                                  studentCapacity: customPlansForm.enterprise.studentCapacity,
                                  storageLimit: customPlansForm.enterprise.storageLimit,
                                  monthlyPrice: customPlansForm.enterprise.monthlyPrice,
                                  upgradeCharge: charge
                                });
                                
                                setSaveSuccess('Custom modifications approved successfully! Client notified to pay.');
                                await fetchUpgradeRequests();
                                await fetchSubscriptions();
                                await fetchCustomPlans();
                                setTimeout(() => setSaveSuccess(''), 5000);
                              } catch (err) {
                                console.error('Error approving custom request:', err);
                                alert('Failed to approve custom request: ' + (err.response?.data?.error || err.message));
                              } finally {
                                setProcessingRequestId(null);
                              }
                            }}
                            disabled={processingRequestId !== null}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                          >
                            ✓ Approve and Set Charge
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(pendingCustomRequestForSchool.id)}
                            disabled={processingRequestId !== null}
                            className="bg-rose-50 border border-rose-205 hover:bg-rose-100 text-rose-600 text-xs font-bold px-4 py-2.5 rounded-lg transition-all"
                          >
                            Reject Request
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <form onSubmit={handleSaveCustomPlans} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Standard Plan Customization */}
                  <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/30">
                    <div className="text-xs font-bold text-gray-400 mb-1">TIER 1 CUSTOM OVERRIDE</div>
                    <div className="font-display font-bold text-primary text-lg mb-4 border-b border-gray-100 pb-2">Standard Plan</div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Implementation Cost ($)</label>
                        <input
                          type="number"
                          value={customPlansForm.standard.implementationCost}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            standard: { ...f.standard, implementationCost: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Student Capacity</label>
                        <input
                          type="text"
                          value={customPlansForm.standard.studentCapacity}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            standard: { ...f.standard, studentCapacity: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Storage Limit</label>
                        <input
                          type="text"
                          value={customPlansForm.standard.storageLimit}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            standard: { ...f.standard, storageLimit: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pricing Label</label>
                        <input
                          type="text"
                          value={customPlansForm.standard.monthlyPrice}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            standard: { ...f.standard, monthlyPrice: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 text-primary font-bold"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enterprise Plan Customization */}
                  <div className="border border-gray-200 rounded-xl p-5 bg-gray-50/30">
                    <div className="text-xs font-bold text-gray-400 mb-1">TIER 2 CUSTOM OVERRIDE</div>
                    <div className="font-display font-bold text-primary text-lg mb-4 border-b border-gray-100 pb-2">Enterprise Plan</div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Implementation Cost ($)</label>
                        <input
                          type="number"
                          value={customPlansForm.enterprise.implementationCost}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            enterprise: { ...f.enterprise, implementationCost: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Student Capacity</label>
                        <input
                          type="text"
                          value={customPlansForm.enterprise.studentCapacity}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            enterprise: { ...f.enterprise, studentCapacity: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Storage Limit</label>
                        <input
                          type="text"
                          value={customPlansForm.enterprise.storageLimit}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            enterprise: { ...f.enterprise, storageLimit: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pricing Label</label>
                        <input
                          type="text"
                          value={customPlansForm.enterprise.monthlyPrice}
                          onChange={e => setCustomPlansForm(f => ({
                            ...f,
                            enterprise: { ...f.enterprise, monthlyPrice: e.target.value }
                          }))}
                          className="input py-1.5 px-3 text-xs bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 text-primary font-bold"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-50">
                  <button
                    type="submit"
                    disabled={savingCustom}
                    className="btn-primary py-2.5 px-6 rounded-xl font-bold text-xs shadow-md shadow-primary/10 transition-all flex items-center gap-1.5"
                  >
                    {savingCustom ? 'Saving custom overrides...' : '✓ Save Custom Client Pricing'}
                  </button>
                </div>
              </form>
              </>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">Please register a school first.</div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'requests' && (() => {
        const standardRequests = upgradeRequests.filter(r => 
          r.requestedPlanType !== 'Custom' && 
          (!filterUpgradeRequestsSchool || r.schoolId === filterUpgradeRequestsSchool)
        );
        return (
          <div className="card animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-display font-semibold text-primary mb-1">School Upgrade Requests</h3>
                <p className="text-gray-400 text-xs">Review requests from school admins wishing to change their platform subscription service tiers.</p>
              </div>
              <div className="w-full sm:w-64">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Filter by School</label>
                <select
                  value={filterUpgradeRequestsSchool}
                  onChange={e => setFilterUpgradeRequestsSchool(e.target.value)}
                  className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl"
                >
                  <option value="">All Schools</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.schoolCode})</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-155">
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Institution</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Code</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Requested Upgrade</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Submitted At</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {standardRequests.map(r => (
                    <tr 
                      key={r.id} 
                      onClick={(e) => handleRowClick(e, r)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-all"
                    >
                      <td className="py-4 px-4 text-sm font-semibold text-primary">
                        {r.schoolName}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 font-mono text-xs">{r.schoolCode}</td>
                      <td className="py-4 px-4 text-sm font-medium">
                        <span className="badge badge-indigo text-xs">
                          🚀 {r.requestedPlanType} Plan
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-400">{r.createdAt}</td>
                      <td className="py-4 px-4 text-sm font-semibold">
                        <span className={`px-2.5 py-1 rounded-full text-xxs font-bold uppercase ${
                          r.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                          r.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {standardRequests.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-400 text-sm">No upgrade requests received yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {activeSubTab === 'custom-requests' && (() => {
        const customRequests = upgradeRequests.filter(r => 
          r.requestedPlanType === 'Custom' && 
          (!filterCustomRequestsSchool || r.schoolId === filterCustomRequestsSchool)
        );
        return (
          <div className="card animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-display font-semibold text-primary mb-1">Custom Update Notifications & Requests</h3>
                <p className="text-gray-400 text-xs">Review specific customization requirements requested by clients already on a custom plan.</p>
              </div>
              <div className="w-full sm:w-64">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Filter by School</label>
                <select
                  value={filterCustomRequestsSchool}
                  onChange={e => setFilterCustomRequestsSchool(e.target.value)}
                  className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary/40 focus:ring-primary/20 rounded-xl"
                >
                  <option value="">All Schools</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.schoolCode})</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-155">
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Institution</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Code</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Requested Modification</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Submitted At</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customRequests.map(r => (
                    <tr 
                      key={r.id} 
                      onClick={(e) => handleRowClick(e, r)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-all"
                    >
                      <td className="py-4 px-4 text-sm font-semibold text-primary">
                        {r.schoolName}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 font-mono text-xs">{r.schoolCode}</td>
                      <td className="py-4 px-4 text-sm font-medium">
                        <span className="badge badge-amber text-xs">
                          🛠️ Custom Modifications
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-400">{r.createdAt}</td>
                      <td className="py-4 px-4 text-sm font-semibold">
                        <span className={`px-2.5 py-1 rounded-full text-xxs font-bold uppercase ${
                          r.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                          r.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {customRequests.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-400 text-sm">No custom modifications requests received yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Create New Plan Overlay Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="bg-primary px-6 py-4">
              <h3 className="font-display font-bold text-white text-base">Create New Subscription Plan</h3>
              <p className="text-blue-200 text-xs">Configure a new pricing tier for onboarding schools.</p>
            </div>
            <div className="p-6 space-y-4">
              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-[11px] p-2.5 rounded-lg">
                  {createError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tier Label *</label>
                  <input
                    value={newPlan.tierLabel}
                    onChange={(e) => setNewPlan(p => ({ ...p, tierLabel: e.target.value }))}
                    placeholder="e.g. TIER 3"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plan Name *</label>
                  <input
                    value={newPlan.planName}
                    onChange={(e) => setNewPlan(p => ({ ...p, planName: e.target.value }))}
                    placeholder="e.g. Premium Plan"
                    className="input text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Implementation Cost ($)</label>
                  <input
                    type="number"
                    value={newPlan.implementationCost}
                    onChange={(e) => setNewPlan(p => ({ ...p, implementationCost: e.target.value }))}
                    placeholder="e.g. 20000"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student Capacity</label>
                  <input
                    value={newPlan.studentCapacity}
                    onChange={(e) => setNewPlan(p => ({ ...p, studentCapacity: e.target.value }))}
                    placeholder="e.g. 1000 Students"
                    className="input text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Storage Limit</label>
                  <input
                    value={newPlan.storageLimit}
                    onChange={(e) => setNewPlan(p => ({ ...p, storageLimit: e.target.value }))}
                    placeholder="e.g. 100 GB"
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pricing Label</label>
                  <input
                    value={newPlan.monthlyPrice}
                    onChange={(e) => setNewPlan(p => ({ ...p, monthlyPrice: e.target.value }))}
                    placeholder="e.g. $99/mo"
                    className="input text-xs"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isTopRevenue"
                  checked={newPlan.isTopRevenue}
                  onChange={(e) => setNewPlan(p => ({ ...p, isTopRevenue: e.target.checked }))}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="isTopRevenue" className="text-xs font-semibold text-gray-600">Mark as Top Revenue (Featured Accent)</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-outline text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlan}
                disabled={creatingPlan}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {creatingPlan ? 'Creating...' : '✓ Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Request Approval & Pricing Modal */}
      {showApprovalModal && approvingRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <form onSubmit={handleConfirmApproval} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary px-6 py-5 text-white">
              <h3 className="font-display font-bold text-base">Approve Upgrade: {approvingRequest.schoolName}</h3>
              <p className="text-blue-200 text-xxs mt-1">Review requirements and customize pricing parameters for this client.</p>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Requirements review */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs">
                <span className="font-bold text-amber-900 block mb-1">Submitted Requirements:</span>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed italic">{approvingRequest.requirements || 'No specific requirements listed.'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Implementation Cost ($) *</label>
                  <input
                    type="number"
                    value={approvalPricing.implementationCost}
                    onChange={e => setApprovalPricing(p => ({ ...p, implementationCost: e.target.value }))}
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student Capacity *</label>
                  <input
                    type="text"
                    value={approvalPricing.studentCapacity}
                    onChange={e => setApprovalPricing(p => ({ ...p, studentCapacity: e.target.value }))}
                    className="input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Storage Limit *</label>
                  <input
                    type="text"
                    value={approvalPricing.storageLimit}
                    onChange={e => setApprovalPricing(p => ({ ...p, storageLimit: e.target.value }))}
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Monthly Price Label *</label>
                  <input
                    type="text"
                    value={approvalPricing.monthlyPrice}
                    onChange={e => setApprovalPricing(p => ({ ...p, monthlyPrice: e.target.value }))}
                    className="input text-xs"
                    required
                  />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-bold text-indigo-900 mb-1.5">One-time Upgrade Charge / Payment Amount ($) *</label>
                <input
                  type="number"
                  value={approvalPricing.upgradeCharge}
                  onChange={e => setApprovalPricing(p => ({ ...p, upgradeCharge: e.target.value }))}
                  className="input text-xs bg-indigo-50 border border-indigo-200 focus:border-primary/40 focus:ring-primary/20 text-primary font-bold"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-1">This is the exact fee the school admin must pay to activate the upgrade.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => { setShowApprovalModal(false); setApprovingRequest(null); }}
                className="btn-outline text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingRequestId !== null}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {processingRequestId !== null ? 'Approving...' : '✓ Approve & Set Pricing'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details Popup Modal */}
      {showDetailsPopup && selectedRequestDetails && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-primary px-6 py-5 text-white flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-base">Request Details: {selectedRequestDetails.schoolName}</h3>
                <p className="text-blue-200 text-xxs mt-1">Review the client's submitted requirements and manage status.</p>
              </div>
              <button 
                onClick={() => { setShowDetailsPopup(false); setSelectedRequestDetails(null); }}
                className="text-white hover:text-gray-200 text-lg font-bold transition-all focus:outline-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 font-semibold">School Code</span>
                  <span className="font-semibold text-primary font-mono">{selectedRequestDetails.schoolCode}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 font-semibold">Submitted At</span>
                  <span className="font-semibold text-primary">{selectedRequestDetails.createdAt}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 font-semibold">Requested Option</span>
                  <span className="font-bold text-indigo-600">
                    {selectedRequestDetails.requestedPlanType === 'Custom' ? '🛠️ Custom Modifications' : `🚀 ${selectedRequestDetails.requestedPlanType} Plan`}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 font-semibold">Current Status</span>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedRequestDetails.status === 'Approved' ? 'bg-green-50 text-green-700 border border-green-200' :
                    selectedRequestDetails.status === 'Rejected' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                  }`}>
                    {selectedRequestDetails.status}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Submitted Requirements</span>
                <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedRequestDetails.requirements || 'No specific requirements listed.'}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-6 pb-6 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => { setShowDetailsPopup(false); setSelectedRequestDetails(null); }}
                className="btn-outline text-xs py-2 px-4 rounded-xl font-semibold"
              >
                Close
              </button>
              
              {selectedRequestDetails.status === 'Pending' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedRequestDetails.id;
                      setShowDetailsPopup(false);
                      setSelectedRequestDetails(null);
                      handleApproveRequest(id);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all"
                  >
                    {selectedRequestDetails.requestedPlanType === 'Custom' ? 'Approve & Charge' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const id = selectedRequestDetails.id;
                      setShowDetailsPopup(false);
                      setSelectedRequestDetails(null);
                      handleRejectRequest(id);
                    }}
                    className="bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 text-xs font-bold px-4 py-2 rounded-xl transition-all"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subscriptions;