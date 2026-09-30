import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  DollarSign, 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Search, 
  Edit, 
  Download, 
  Printer, 
  Check, 
  Sparkles,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { printRenderedDocument } from '../../components/print/PrintIframe';

const Salaries = () => {
  const [activeTab, setActiveTab] = useState('generate'); // 'generate', 'history'
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workingDays, setWorkingDays] = useState(26);
  const [search, setSearch] = useState('');
  const [editingSalary, setEditingSalary] = useState(null);
  const [viewingSlip, setViewingSlip] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editForm, setEditForm] = useState({
    manualAllowances: 0,
    manualDeductions: 0,
    remarks: '',
    status: 'Draft'
  });

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/account/salary?month=${selectedMonth}&year=${selectedYear}`);
      setSalaries(res.data || []);
    } catch (err) {
      console.error('Failed to load salary records:', err);
      setError('Failed to load salary records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth, selectedYear]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await apiClient.post('/account/salary/generate', {
        month: selectedMonth,
        year: selectedYear,
        totalWorkingDays: parseInt(workingDays)
      });
      setSuccess(`Payroll calculated successfully for ${res.data.generatedCount} teachers!`);
      fetchSalaries();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to auto-calculate salaries.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateSalary = async (e) => {
    e.preventDefault();
    if (!editingSalary) return;
    try {
      await apiClient.put(`/account/salary/${editingSalary.id}`, {
        manualAllowances: parseFloat(editForm.manualAllowances || 0),
        manualDeductions: parseFloat(editForm.manualDeductions || 0),
        remarks: editForm.remarks,
        status: editForm.status
      });
      setSuccess('Salary record updated successfully.');
      setEditingSalary(null);
      fetchSalaries();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update salary.');
    }
  };

  const handleMarkPaid = async (id) => {
    try {
      await apiClient.put(`/account/salary/${id}/mark-paid`);
      setSuccess('Salary disbursed and marked as Paid.');
      fetchSalaries();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark salary paid.');
    }
  };

  const filtered = salaries.filter(s => {
    const q = search.toLowerCase();
    return (
      (s.teacherName || '').toLowerCase().includes(q) ||
      (s.teacherEmail || '').toLowerCase().includes(q) ||
      (s.department || '').toLowerCase().includes(q)
    );
  });

  const totalDisbursed = salaries.filter(s => s.status === 'Paid').reduce((acc, s) => acc + (s.netPay || 0), 0);
  const totalPending = salaries.filter(s => s.status !== 'Paid').reduce((acc, s) => acc + (s.netPay || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Teacher Salary & Payroll Processing" subtitle="Automated HRM Calculation, Quota Adjustments & Salary Slips" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-3xs font-black uppercase tracking-wider">
                HRM Attendance & Leave Linked
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Calculator className="w-8 h-8 text-purple-400 shrink-0" />
              Payroll Calculation Engine
            </h1>
            <p className="text-sm text-purple-200/90 max-w-xl">
              Calculates Net Pay from base salary, present days, approved paid leaves, half days (0.5 deduction), LWP deductions, and salary rules (HRA/PF).
            </p>
          </div>

          {/* Period Selector & Generate Button */}
          <div className="flex flex-wrap items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded-xl focus:outline-none"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-slate-900 text-white font-bold text-xs px-3 py-2 rounded-xl focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              max="31"
              value={workingDays}
              onChange={e => setWorkingDays(e.target.value)}
              title="Total working days in month"
              placeholder="Days"
              className="w-16 bg-slate-900 text-white text-center font-bold text-xs px-2 py-2 rounded-xl border border-white/20"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {generating ? 'Calculating...' : 'Run Auto-Payroll'}
            </button>
            <button
              onClick={async () => {
                try {
                  const from = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                  const to = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                  const response = await apiClient.get(`/tallyexport/download-xml?from=${from}&to=${to}`, {
                    responseType: 'blob'
                  });
                  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/xml' }));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `Tally_Vouchers_${selectedYear}_${selectedMonth}.xml`);
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  setSuccess('Tally XML vouchers exported successfully!');
                  setTimeout(() => setSuccess(''), 4000);
                } catch (err) {
                  setError('Failed to export Tally XML vouchers.');
                }
              }}
              className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 text-xs font-black uppercase tracking-wider rounded-xl transition flex items-center gap-1.5 shadow-sm"
              title="Export Month Vouchers to TallyPrime / Busy XML"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tally XML</span>
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Total Payroll</span>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{(totalDisbursed + totalPending).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">{salaries.length} teachers processed</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Disbursed (Paid)</span>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              ₹{totalDisbursed.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-600 mt-1 font-semibold">{salaries.filter(s => s.status === 'Paid').length} paid out</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Pending Approval / Payout</span>
            <div className="text-2xl font-black text-amber-600 font-mono">
              ₹{totalPending.toLocaleString()}
            </div>
            <p className="text-xs text-amber-600 mt-1 font-semibold">{salaries.filter(s => s.status !== 'Paid').length} pending</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-semibold">{success}</p>
          </div>
        )}

        {/* Main Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Monthly Salary Sheets ({salaries.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search teacher..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center"><Loader /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <DollarSign className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No Salary Records for this Period</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click "Run Auto-Payroll" above to automatically calculate salaries from attendance, leave quotas, and salary rules.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">TEACHER</th>
                    <th className="py-3.5 px-4">BASE (GROSS)</th>
                    <th className="py-3.5 px-4">PRESENT / LEAVE</th>
                    <th className="py-3.5 px-4">LWP</th>
                    <th className="py-3.5 px-4">ALLOWANCES</th>
                    <th className="py-3.5 px-4">DEDUCTIONS</th>
                    <th className="py-3.5 px-4 font-mono">NET PAY</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{s.teacherName}</div>
                        <div className="text-xs text-slate-400 font-mono">{s.employeeId} • {s.department}</div>
                      </td>

                      <td className="py-4 px-4 font-mono font-semibold text-slate-700">
                        ₹{(s.grossSalary || 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600">
                        <div><span className="font-bold text-slate-900">{s.presentDays}</span> / {s.totalWorkingDays} days</div>
                        {s.leaveDaysUsed > 0 && (
                          <span className="text-3xs text-purple-600 font-bold block">{s.leaveDaysUsed} leaves taken</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono text-xs">
                        {s.lwpDays > 0 ? (
                          <span className="text-rose-600 font-bold">-{s.lwpDays}d (-₹{s.lwpDeduction})</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      <td className="py-4 px-4 font-mono text-xs text-emerald-600 font-bold">
                        +₹{(s.ruleBasedAllowances + s.manualAllowances).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 font-mono text-xs text-rose-600 font-bold">
                        -₹{(s.ruleBasedDeductions + s.manualDeductions).toLocaleString()}
                      </td>

                      <td className="py-4 px-4 font-mono font-black text-slate-900 text-base">
                        ₹{(s.netPay || 0).toLocaleString()}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-3xs font-black uppercase tracking-wider border ${
                          s.status === 'Paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {s.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right space-x-2">
                        <button
                          onClick={() => setViewingSlip(s)}
                          title="View Payslip"
                          className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingSalary(s);
                            setEditForm({
                              manualAllowances: s.manualAllowances,
                              manualDeductions: s.manualDeductions,
                              remarks: s.remarks || '',
                              status: s.status
                            });
                          }}
                          title="Edit Adjustments"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {s.status !== 'Paid' && (
                          <button
                            onClick={() => handleMarkPaid(s.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Salary Modal */}
      {editingSalary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Edit Salary Adjustments</h3>
                <p className="text-xs text-purple-200 mt-0.5">{editingSalary.teacherName}</p>
              </div>
              <button onClick={() => setEditingSalary(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdateSalary} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Manual Bonus / Allowance (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.manualAllowances}
                    onChange={e => setEditForm(p => ({ ...p, manualAllowances: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Manual Deduction (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.manualDeductions}
                    onChange={e => setEditForm(p => ({ ...p, manualDeductions: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Remarks / Notes</label>
                <input
                  type="text"
                  value={editForm.remarks}
                  onChange={e => setEditForm(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="e.g. Festival bonus included"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingSalary(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase rounded-xl">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip View Modal */}
      {viewingSlip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-6 text-left border border-slate-100">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <span className="text-3xs font-black text-purple-600 uppercase tracking-widest">Official Salary Payslip</span>
                <h3 className="font-extrabold text-xl text-slate-900">{viewingSlip.teacherName}</h3>
                <p className="text-xs text-slate-400 font-mono">{viewingSlip.employeeId} • {viewingSlip.department}</p>
              </div>
              <button onClick={() => setViewingSlip(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-3xs text-slate-400 font-bold uppercase">Pay Period</span>
                <div className="font-bold text-slate-800">{new Date(viewingSlip.year, viewingSlip.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-3xs text-slate-400 font-bold uppercase">Payment Status</span>
                <div className={`font-bold ${viewingSlip.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {viewingSlip.status} {viewingSlip.paidOn && `on ${new Date(viewingSlip.paidOn).toLocaleDateString('en-GB')}`}
                </div>
              </div>
            </div>

            <div className="space-y-2 border-t border-b border-slate-100 py-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Gross Monthly Base</span>
                <span className="font-mono font-bold text-slate-900">₹{(viewingSlip.grossSalary || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Basic Earned ({viewingSlip.presentDays} days)</span>
                <span className="font-mono font-bold text-slate-900">₹{(viewingSlip.basicEarned || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-emerald-600">
                <span>Allowances & Bonus</span>
                <span className="font-mono font-bold">+₹{(viewingSlip.ruleBasedAllowances + viewingSlip.manualAllowances).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 text-rose-600">
                <span>Deductions & PF</span>
                <span className="font-mono font-bold">-₹{(viewingSlip.ruleBasedDeductions + viewingSlip.manualDeductions).toLocaleString()}</span>
              </div>
              {viewingSlip.lwpDeduction > 0 && (
                <div className="flex justify-between py-1 text-rose-600">
                  <span>LWP Deduction ({viewingSlip.lwpDays} days)</span>
                  <span className="font-mono font-bold">-₹{(viewingSlip.lwpDeduction || 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Total Net Disbursed</span>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  ₹{(viewingSlip.netPay || 0).toLocaleString()}
                </div>
              </div>
              <button
                onClick={() => {
                  const fallback = `
                    <div class="print-zone-a5" style="padding: 16px; font-family: sans-serif; font-size: 12px; color: #1e293b;">
                      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                          <h2 style="margin: 0; font-size: 20px; font-weight: 800; color: #0f172a;">EduVault Academy</h2>
                          <p style="margin: 3px 0 0; font-size: 11px; color: #64748b;">Confidential Monthly Pay Advice</p>
                        </div>
                        <div style="text-align: right; font-size: 11px;">
                          <strong>Payslip #:</strong> PAY-${viewingSlip.id}<br/>
                          <strong>Period:</strong> ${viewingSlip.period || 'Current Month'}
                        </div>
                      </div>

                      <table style="width: 100%; margin-bottom: 16px; font-size: 11px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                        <tr>
                          <td style="padding: 6px 10px;"><strong>Employee:</strong> ${viewingSlip.employeeName || 'Staff Member'}</td>
                          <td style="padding: 6px 10px;"><strong>Emp Code:</strong> ${viewingSlip.employeeCode || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 10px;"><strong>Designation:</strong> ${viewingSlip.designation || 'Staff'}</td>
                          <td style="padding: 6px 10px;"><strong>Disbursed Via:</strong> ${viewingSlip.paymentMode || 'Bank Transfer'}</td>
                        </tr>
                      </table>

                      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px;">
                        <thead>
                          <tr style="background: #f1f5f9; border-bottom: 1px solid #cbd5e1;">
                            <th style="text-align: left; padding: 6px 8px;">Earnings</th>
                            <th style="text-align: right; padding: 6px 8px;">Amount</th>
                            <th style="text-align: left; padding: 6px 8px;">Deductions</th>
                            <th style="text-align: right; padding: 6px 8px;">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 6px 8px;">Basic Salary</td>
                            <td style="text-align: right; padding: 6px 8px; font-family: monospace;">₹${(viewingSlip.basicPay || 0).toLocaleString()}</td>
                            <td style="padding: 6px 8px;">Provident Fund / Tax</td>
                            <td style="text-align: right; padding: 6px 8px; font-family: monospace;">₹${(viewingSlip.deductions || 0).toLocaleString()}</td>
                          </tr>
                          <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 6px 8px;">Allowances</td>
                            <td style="text-align: right; padding: 6px 8px; font-family: monospace;">₹${(viewingSlip.allowances || 0).toLocaleString()}</td>
                            <td style="padding: 6px 8px;">LWP (${viewingSlip.lwpDays || 0} days)</td>
                            <td style="text-align: right; padding: 6px 8px; font-family: monospace; color: #e11d48;">-₹${(viewingSlip.lwpDeduction || 0).toLocaleString()}</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr style="background: #f8fafc; font-weight: bold; border-top: 1px solid #cbd5e1;">
                            <td style="padding: 8px;">Total Gross</td>
                            <td style="text-align: right; padding: 8px; font-family: monospace;">₹${((viewingSlip.basicPay || 0) + (viewingSlip.allowances || 0)).toLocaleString()}</td>
                            <td style="padding: 8px;">Net Disbursed</td>
                            <td style="text-align: right; padding: 8px; font-size: 13px; font-family: monospace; color: #0f172a;">₹${(viewingSlip.netPay || 0).toLocaleString()}</td>
                          </tr>
                        </tfoot>
                      </table>

                      <div style="margin-top: 24px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                        <span>Generated by EduVault ERP</span>
                        <span>Employer Signature: __________________</span>
                      </div>
                    </div>
                  `;
                  printRenderedDocument('SalarySlip', viewingSlip.id, fallback);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Salaries;
