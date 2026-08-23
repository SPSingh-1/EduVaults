import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck,
  Sparkles,
  HelpCircle
} from 'lucide-react';

const SalaryRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    type: 'Allowance', // Allowance, Deduction
    calculationMode: 'Fixed', // Fixed, Percentage
    value: '',
    isDefault: true
  });

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/account/salary-rules');
      setRules(res.data || []);
    } catch (err) {
      console.error('Failed to load salary rules:', err);
      setError('Failed to load salary rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.value) {
      setError('Rule name and value are required.');
      return;
    }
    setError('');
    try {
      if (editingRule) {
        await apiClient.put(`/account/salary-rules/${editingRule.id}`, {
          name: form.name,
          type: form.type,
          calculationMode: form.calculationMode,
          value: parseFloat(form.value),
          isDefault: form.isDefault
        });
        setSuccess('Salary rule updated successfully.');
      } else {
        await apiClient.post('/account/salary-rules', {
          name: form.name,
          type: form.type,
          calculationMode: form.calculationMode,
          value: parseFloat(form.value),
          isDefault: form.isDefault
        });
        setSuccess('New salary rule added.');
      }
      setShowModal(false);
      setEditingRule(null);
      setForm({ name: '', type: 'Allowance', calculationMode: 'Fixed', value: '', isDefault: true });
      fetchRules();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save salary rule.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this salary rule?')) return;
    try {
      await apiClient.delete(`/account/salary-rules/${id}`);
      setSuccess('Salary rule removed.');
      fetchRules();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete rule.');
    }
  };

  const allowances = rules.filter(r => r.type === 'Allowance');
  const deductions = rules.filter(r => r.type === 'Deduction');

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Salary Rules Engine" subtitle="Configure Auto Allowances (HRA, TA) & Deductions (PF, TDS)" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-3xs font-black uppercase tracking-wider">
                Automated Payroll Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Sliders className="w-8 h-8 text-purple-400 shrink-0" />
              Salary Allowances & Deductions Rules
            </h1>
            <p className="text-sm text-purple-200/90 max-w-2xl">
              Active default rules automatically calculate and apply to all teacher salaries during monthly payroll generation.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingRule(null);
              setForm({ name: '', type: 'Allowance', calculationMode: 'Fixed', value: '', isDefault: true });
              setShowModal(true);
            }}
            className="px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-purple-500/25 transition flex items-center gap-2.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Salary Rule
          </button>
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

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Allowances Column */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Allowances (Additions)</h2>
                  <p className="text-2xs text-slate-400">Added to basic earned pay</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-black">
                {allowances.length} Rules
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center"><Loader /></div>
            ) : allowances.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p className="text-xs font-semibold">No allowances configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allowances.map(r => (
                  <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between hover:bg-slate-100/70 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{r.name}</span>
                        {r.isDefault && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-3xs font-black uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-2xs text-slate-500 font-medium">
                        {r.calculationMode === 'Percentage' ? `${r.value}% of Gross Base` : `Fixed ₹${r.value.toLocaleString()} per month`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-emerald-600 text-sm">
                        +{r.calculationMode === 'Percentage' ? `${r.value}%` : `₹${r.value}`}
                      </span>
                      <button
                        onClick={() => {
                          setEditingRule(r);
                          setForm({ name: r.name, type: r.type, calculationMode: r.calculationMode, value: r.value, isDefault: r.isDefault });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-purple-600 transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deductions Column */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">Deductions (Subtractions)</h2>
                  <p className="text-2xs text-slate-400">Subtracted from salary (PF, TDS, Insurance)</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-black">
                {deductions.length} Rules
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center"><Loader /></div>
            ) : deductions.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <p className="text-xs font-semibold">No deductions configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {deductions.map(r => (
                  <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 flex items-center justify-between hover:bg-slate-100/70 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{r.name}</span>
                        {r.isDefault && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-3xs font-black uppercase">
                            Default
                          </span>
                        )}
                      </div>
                      <span className="text-2xs text-slate-500 font-medium">
                        {r.calculationMode === 'Percentage' ? `${r.value}% of Gross Base` : `Fixed ₹${r.value.toLocaleString()} per month`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-rose-600 text-sm">
                        -{r.calculationMode === 'Percentage' ? `${r.value}%` : `₹${r.value}`}
                      </span>
                      <button
                        onClick={() => {
                          setEditingRule(r);
                          setForm({ name: r.name, type: r.type, calculationMode: r.calculationMode, value: r.value, isDefault: r.isDefault });
                          setShowModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-purple-600 transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rule Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base">
                {editingRule ? 'Edit Salary Rule' : 'Add New Salary Rule'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. House Rent Allowance (HRA) or PF"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Rule Type</label>
                  <select
                    value={form.type}
                    onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Allowance">Allowance (+)</option>
                    <option value="Deduction">Deduction (-)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Calculation Mode</label>
                  <select
                    value={form.calculationMode}
                    onChange={e => setForm(p => ({ ...p, calculationMode: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Fixed">Fixed Amount (₹)</option>
                    <option value="Percentage">Percentage (% of Gross)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  {form.calculationMode === 'Percentage' ? 'Percentage Value (%) *' : 'Amount (₹) *'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={form.value}
                  onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                  placeholder={form.calculationMode === 'Percentage' ? 'e.g. 12' : 'e.g. 2000'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <label htmlFor="isDefault" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Auto-apply to all teachers during payroll calculation
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase rounded-xl">Save Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryRules;
