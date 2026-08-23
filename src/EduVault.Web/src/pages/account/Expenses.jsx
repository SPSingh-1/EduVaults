import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Receipt,
  Download,
  Filter,
  DollarSign
} from 'lucide-react';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    category: 'Supplies',
    title: '',
    amount: '',
    voucherNumber: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/account/expenses');
      setExpenses(res.data || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      setError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount) {
      setError('Title and amount are required.');
      return;
    }
    setError('');
    try {
      await apiClient.post('/account/expenses', {
        category: form.category,
        title: form.title,
        amount: parseFloat(form.amount),
        voucherNumber: form.voucherNumber,
        date: form.date,
        description: form.description
      });
      setSuccess('Expense voucher recorded successfully.');
      setShowModal(false);
      setForm({
        category: 'Supplies',
        title: '',
        amount: '',
        voucherNumber: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      fetchExpenses();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record expense.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense voucher?')) return;
    try {
      await apiClient.delete(`/account/expenses/${id}`);
      setSuccess('Expense voucher deleted.');
      fetchExpenses();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete expense.');
    }
  };

  const filtered = expenses.filter(e => {
    const s = search.toLowerCase();
    const matchesSearch = 
      (e.title || '').toLowerCase().includes(s) ||
      (e.voucherNumber || '').toLowerCase().includes(s) ||
      (e.description || '').toLowerCase().includes(s);
    
    const matchesCategory = categoryFilter === 'ALL' || (e.category || '').toLowerCase() === categoryFilter.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const totalExpenseAmount = filtered.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="School Expenses & Expense Vouchers" subtitle="Track Operational Costs, Utility Bills, Maintenance & Supplies" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner Hero */}
        <div className="bg-gradient-to-r from-rose-900 via-purple-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-rose-400 shrink-0" />
              School Expenses & Outflow
            </h1>
            <p className="text-sm text-rose-200/90 max-w-xl">
              Record vouchers for daily operational expenditures, maintenance bills, equipment supplies, and miscellaneous charges.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-500/25 transition flex items-center gap-2.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Record Expense Voucher
          </button>
        </div>

        {/* Total Metric Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block mb-1">Total Filtered Outflow</span>
            <div className="text-2xl font-black text-rose-600 font-mono">
              ₹{totalExpenseAmount.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">{filtered.length} vouchers in this view</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {['ALL', 'Salary', 'Maintenance', 'Supplies', 'Utility', 'Other'].map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
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

        {/* Expenses Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Expense Vouchers ({filtered.length})</h2>
              <p className="text-xs text-slate-400 mt-0.5">Categorized school spending logs</p>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search voucher # or title..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center"><Loader /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CreditCard className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">No Expenses Recorded</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">VOUCHER #</th>
                    <th className="py-3.5 px-4">EXPENSE TITLE</th>
                    <th className="py-3.5 px-4">CATEGORY</th>
                    <th className="py-3.5 px-4">DATE</th>
                    <th className="py-3.5 px-4 font-mono">AMOUNT</th>
                    <th className="py-3.5 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filtered.map(e => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-800">
                        {e.voucherNumber || 'N/A'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{e.title}</div>
                        {e.description && (
                          <div className="text-2xs text-slate-400 mt-0.5 truncate max-w-xs">{e.description}</div>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-2xs font-bold">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-rose-600 text-base">
                        ₹{(e.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* New Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-rose-900 to-purple-900 px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base">Record Expense Voucher</h3>
              <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Science Lab Chemical Reagents"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Salary">Salary</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Supplies">Supplies</option>
                    <option value="Utility">Utility</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="2500"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Voucher / Bill #</label>
                  <input
                    type="text"
                    value={form.voucherNumber}
                    onChange={e => setForm(p => ({ ...p, voucherNumber: e.target.value }))}
                    placeholder="Auto-generated if empty"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Description (Optional)</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Notes about supplier or item purchase..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl">Save Voucher</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
