import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const FeeRules = () => {
  const [activeTab, setActiveTab] = useState('standard'); // 'standard', 'supplementary', 'latefee', 'partial'
  const [loading, setLoading] = useState(true);
  const [rulesSummary, setRulesSummary] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Supplementary Fee Form State
  const [suppForm, setSuppForm] = useState({
    name: 'Supplementary / Compartment Exam Fee',
    amountPerSubject: 500,
    grade: 'All Grades',
    gracePeriodDays: 3,
    lateFeePerDay: 50,
    isCustomPaymentAllowed: true
  });
  const [creatingSupp, setCreatingSupp] = useState(false);
  const [assigningSupp, setAssigningSupp] = useState(false);

  // Late Fee Form State
  const [lateFeeForm, setLateFeeForm] = useState({
    gracePeriodDays: 5,
    lateFeePerDay: 50
  });
  const [savingLateFee, setSavingLateFee] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/billing/rules/summary');
      setRulesSummary(res.data);
      if (res.data.defaultGraceDays !== undefined) {
        setLateFeeForm({
          gracePeriodDays: res.data.defaultGraceDays,
          lateFeePerDay: res.data.defaultLateFeePerDay
        });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch financial rules summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleCreateSupplementaryFee = async (e) => {
    e.preventDefault();
    setCreatingSupp(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/billing/structures/supplementary', suppForm);
      setSuccessMsg(res.data.message || 'Supplementary fee structure created successfully.');
      fetchRules();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create supplementary fee structure.');
    } finally {
      setCreatingSupp(false);
    }
  };

  const handleAssignToAllCompartment = async () => {
    if (!window.confirm('Generate Supplementary Exam Fee invoices for all eligible compartment students?')) return;
    setAssigningSupp(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.post('/billing/assign-supplementary-fee', { dueDays: 15 });
      setSuccessMsg(res.data.message || 'Assigned supplementary exam invoices.');
      fetchRules();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign supplementary fee invoices.');
    } finally {
      setAssigningSupp(false);
    }
  };

  const handleSaveLateFeeRules = async (e) => {
    e.preventDefault();
    setSavingLateFee(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.put('/billing/rules/late-fee', lateFeeForm);
      setSuccessMsg(res.data.message || 'Late fee rules updated successfully across all structures.');
      fetchRules();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update late fee rules.');
    } finally {
      setSavingLateFee(false);
    }
  };

  return (
    <div>
      <Topbar 
        title="Fee & Financial Rules Master" 
        subtitle="Central controller for school fee structures, compartment fee scheduling, late fines, and partial payment rules." 
      />

      <div className="p-6 space-y-6">
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selector */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'standard' 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🎓 Standard Fee Structures
          </button>
          <button
            onClick={() => setActiveTab('supplementary')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'supplementary' 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⚖️ Supplementary / Compartment Exam Desk
          </button>
          <button
            onClick={() => setActiveTab('latefee')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'latefee' 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⏳ Late Fee & Grace Period Rules
          </button>
          <button
            onClick={() => setActiveTab('partial')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'partial' 
                ? 'bg-primary text-white shadow-md' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            💸 Custom / Partial Payment Policies
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="inline-block animate-spin text-2xl mb-2">⏳</div>
            <div>Loading financial rules and ledger masters...</div>
          </div>
        ) : (
          <div>
            {/* 1. Standard Fee Structures Tab */}
            {activeTab === 'standard' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-display font-bold text-base text-primary">Active Institutional Fee Structures</h3>
                  <span className="text-xs text-gray-500">Total Structures: {rulesSummary?.feeStructures?.length || 0}</span>
                </div>

                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-100 text-left font-bold text-gray-600">
                          <th className="p-3">Fee Name</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Applicable Grade</th>
                          <th className="p-3">Frequency / Installments</th>
                          <th className="p-3">Amount (₹)</th>
                          <th className="p-3">Grace Period</th>
                          <th className="p-3">Late Fine / Day</th>
                          <th className="p-3">Partial Allowed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rulesSummary?.feeStructures?.map((fs) => (
                          <tr key={fs.id} className="hover:bg-slate-50/60 transition">
                            <td className="p-3 font-semibold text-primary">{fs.name}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                fs.feeCategory === 'SupplementaryExam' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : fs.feeCategory === 'Arrears' 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {fs.feeCategory || 'Standard'}
                              </span>
                            </td>
                            <td className="p-3 font-mono">{fs.grade || 'All Grades'}</td>
                            <td className="p-3">{fs.frequency} ({fs.installments} Inst.)</td>
                            <td className="p-3 font-bold text-emerald-700">₹{fs.amount?.toLocaleString()}</td>
                            <td className="p-3 text-gray-600">{fs.gracePeriodDays || 0} Days</td>
                            <td className="p-3 text-amber-700 font-semibold">₹{fs.lateFeePerDay || 0}/day</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                fs.isCustomPaymentAllowed ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {fs.isCustomPaymentAllowed ? 'Yes (Aanshik)' : 'Full Only'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Supplementary / Compartment Exam Desk Tab */}
            {activeTab === 'supplementary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Configure Supplementary Fee Rule */}
                  <div className="card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">⚖️</span>
                      <h4 className="font-display font-bold text-sm text-primary">Configure Compartment Fee Rule</h4>
                    </div>

                    <form onSubmit={handleCreateSupplementaryFee} className="space-y-3 text-xs">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Fee Rule Title *</label>
                        <input 
                          value={suppForm.name} 
                          onChange={e => setSuppForm(f => ({ ...f, name: e.target.value }))}
                          className="input w-full text-xs" 
                          required 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Fee Per Subject (₹) *</label>
                          <input 
                            type="number"
                            value={suppForm.amountPerSubject} 
                            onChange={e => setSuppForm(f => ({ ...f, amountPerSubject: parseFloat(e.target.value) || 0 }))}
                            className="input w-full text-xs font-mono font-bold" 
                            required 
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Applicable Grade</label>
                          <input 
                            value={suppForm.grade} 
                            onChange={e => setSuppForm(f => ({ ...f, grade: e.target.value }))}
                            className="input w-full text-xs" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Grace Period (Days)</label>
                          <input 
                            type="number"
                            value={suppForm.gracePeriodDays} 
                            onChange={e => setSuppForm(f => ({ ...f, gracePeriodDays: parseInt(e.target.value, 10) || 0 }))}
                            className="input w-full text-xs font-mono" 
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Late Fine / Day (₹)</label>
                          <input 
                            type="number"
                            value={suppForm.lateFeePerDay} 
                            onChange={e => setSuppForm(f => ({ ...f, lateFeePerDay: parseFloat(e.target.value) || 0 }))}
                            className="input w-full text-xs font-mono" 
                          />
                        </div>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input 
                          type="checkbox" 
                          checked={suppForm.isCustomPaymentAllowed} 
                          onChange={e => setSuppForm(f => ({ ...f, isCustomPaymentAllowed: e.target.checked }))}
                          className="rounded text-primary focus:ring-primary" 
                        />
                        <span className="font-semibold text-gray-700">Allow Custom / Partial Fee Payment</span>
                      </label>

                      <button 
                        type="submit" 
                        disabled={creatingSupp}
                        className="btn-primary w-full text-xs py-2 mt-2"
                      >
                        {creatingSupp ? 'Saving Rule...' : '💾 Save Supplementary Fee Rule'}
                      </button>
                    </form>
                  </div>

                  {/* Right: Compartment Students List & Quick Assign */}
                  <div className="lg:col-span-2 card p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🧑‍🎓</span>
                        <div>
                          <h4 className="font-display font-bold text-sm text-primary">Eligible Compartment Students</h4>
                          <p className="text-[11px] text-gray-500">Students with 1–2 failed subjects in annual assessments.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleAssignToAllCompartment}
                        disabled={assigningSupp || !rulesSummary?.compartmentStudents?.length}
                        className="btn-primary text-xs px-3 py-1.5 bg-purple-700 hover:bg-purple-800"
                      >
                        {assigningSupp ? 'Assigning Invoices...' : '⚡ 1-Click Generate Invoices'}
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-gray-100 text-left font-bold text-gray-600">
                            <th className="p-2.5">Student Name</th>
                            <th className="p-2.5">Class</th>
                            <th className="p-2.5">Failed Subjects</th>
                            <th className="p-2.5">Academic Remark</th>
                            <th className="p-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {rulesSummary?.compartmentStudents?.map((s) => (
                            <tr key={s.studentId} className="hover:bg-slate-50/60 transition">
                              <td className="p-2.5 font-semibold text-primary">{s.studentName}</td>
                              <td className="p-2.5">{s.className}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  {s.failedSubjectsCount} Subject(s)
                                </span>
                              </td>
                              <td className="p-2.5 text-gray-600 text-[11px]">{s.remark}</td>
                              <td className="p-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  COMPARTMENT
                                </span>
                              </td>
                            </tr>
                          ))}
                          {(!rulesSummary?.compartmentStudents || rulesSummary.compartmentStudents.length === 0) && (
                            <tr>
                              <td colSpan="5" className="text-center py-6 text-gray-400">
                                No students currently pending supplementary examinations.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Late Fee & Grace Period Rules Tab */}
            {activeTab === 'latefee' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏳</span>
                    <h4 className="font-display font-bold text-sm text-primary">School-Wide Late Fine Configuration</h4>
                  </div>
                  <p className="text-xs text-gray-500">
                    Late fee fines are automatically calculated in real-time when an invoice passes its due date plus grace days.
                  </p>

                  <form onSubmit={handleSaveLateFeeRules} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Grace Period Days *</label>
                      <input 
                        type="number"
                        value={lateFeeForm.gracePeriodDays} 
                        onChange={e => setLateFeeForm(f => ({ ...f, gracePeriodDays: parseInt(e.target.value, 10) || 0 }))}
                        className="input w-full text-xs font-mono font-bold" 
                        required 
                      />
                      <span className="text-[11px] text-gray-400">Number of days past due date before late fine starts accruing.</span>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Daily Late Fine Rate (₹/day) *</label>
                      <input 
                        type="number"
                        value={lateFeeForm.lateFeePerDay} 
                        onChange={e => setLateFeeForm(f => ({ ...f, lateFeePerDay: parseFloat(e.target.value) || 0 }))}
                        className="input w-full text-xs font-mono font-bold" 
                        required 
                      />
                      <span className="text-[11px] text-gray-400">Amount added to student invoice for each overdue day past grace period.</span>
                    </div>

                    <button 
                      type="submit" 
                      disabled={savingLateFee}
                      className="btn-primary w-full text-xs py-2"
                    >
                      {savingLateFee ? 'Applying Rules...' : '💾 Apply Late Fee Rules to All Structures'}
                    </button>
                  </form>
                </div>

                <div className="card p-6 space-y-4 bg-slate-50 border border-slate-200">
                  <h4 className="font-display font-bold text-sm text-primary">📊 Live Late Fine Calculator Preview</h4>
                  <div className="space-y-3 text-xs text-gray-700">
                    <div className="p-3 bg-white rounded-xl border border-slate-100 space-y-1.5">
                      <div className="font-bold text-slate-900">Example Scenario:</div>
                      <div>• Invoice Due Date: <strong>10th August</strong></div>
                      <div>• Payment Date: <strong>20th August (10 days overdue)</strong></div>
                      <div>• Grace Period: <strong>{lateFeeForm.gracePeriodDays} Days</strong></div>
                      <div>• Billable Overdue Days: <strong>{Math.max(0, 10 - lateFeeForm.gracePeriodDays)} Days</strong></div>
                      <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-amber-800">
                        <span>Calculated Late Fine Penalty:</span>
                        <span>₹{Math.max(0, 10 - lateFeeForm.gracePeriodDays) * lateFeeForm.lateFeePerDay}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Custom / Partial Payment Policies Tab */}
            {activeTab === 'partial' && (
              <div className="card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">💸</span>
                  <h4 className="font-display font-bold text-sm text-primary">Aanshik Shulk Bhugtan (Partial Fee Payment) Policies</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Reception Counter Spot Cash</span>
                    </div>
                    <div className="text-emerald-800 text-[11px]">
                      Receptionist can collect any partial amount (e.g. ₹2,000 out of ₹10,000) and issue an instant receipt with remaining dues.
                    </div>
                  </div>

                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                    <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Student Online Payment Gateway</span>
                    </div>
                    <div className="text-indigo-800 text-[11px]">
                      Parents can choose between "Pay Full Balance" or enter a custom amount to pay via Razorpay / UPI.
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                    <div className="font-bold text-purple-900 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Automated WhatsApp Ledgers</span>
                    </div>
                    <div className="text-purple-800 text-[11px]">
                      After every partial payment, parent receives a WhatsApp alert with Paid Today and Current Outstanding Balance.
                    </div>
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

export default FeeRules;
