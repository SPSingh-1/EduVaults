import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const Subscriptions = () => {
  const [data, setData] = useState({
    totalMrr: 0,
    activeSubscribers: 0,
    renewals: []
  });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  
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

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, []);

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
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
          ✅ {saveSuccess}
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total MRR', value: `$${totalMrr.toLocaleString()}`, change: 'Real-time' },
          { label: 'Active Subscribers', value: activeSubscribers.toString(), change: 'Platform Stats' },
          { label: 'Avg. Revenue / User', value: `$${avgArpu.toLocaleString()}`, change: 'Computed' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-green-500 font-semibold">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Plan Configurations */}
      <div className="card mb-6">
        <h3 className="font-display font-semibold text-primary mb-4">Active Plan Configuration</h3>
        <div className="grid grid-cols-2 gap-6">
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
    </div>
  );
};

export default Subscriptions;