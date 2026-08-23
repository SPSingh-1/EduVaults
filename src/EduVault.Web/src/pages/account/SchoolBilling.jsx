import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  Receipt, 
  Plus, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Bell, 
  Download, 
  DollarSign,
  Send,
  Edit,
  Trash2,
  Filter,
  CreditCard,
  Building,
  User
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const SchoolBilling = () => {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices', 'structures', 'transactions'
  const [invoices, setInvoices] = useState([]);
  const [structures, setStructures] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals state
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [structureForm, setStructureForm] = useState({
    name: '',
    grade: '',
    amount: '',
    frequency: 'Monthly'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, strRes, txnRes] = await Promise.all([
        apiClient.get('/billing/invoices'),
        apiClient.get('/billing/structures'),
        apiClient.get('/billing/transactions')
      ]);
      setInvoices(invRes.data || []);
      setStructures(strRes.data || []);
      setTransactions(txnRes.data || []);
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError('Failed to load billing records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveStructure = async (e) => {
    e.preventDefault();
    if (!structureForm.name || !structureForm.amount) {
      setError('Fee name and amount are required.');
      return;
    }
    setError('');
    try {
      if (editingStructure) {
        await apiClient.put(`/billing/structures/${editingStructure.id}`, {
          name: structureForm.name,
          grade: structureForm.grade,
          amount: parseFloat(structureForm.amount),
          frequency: structureForm.frequency
        });
        setSuccess('Fee structure updated successfully.');
      } else {
        await apiClient.post('/billing/structures', {
          name: structureForm.name,
          grade: structureForm.grade,
          amount: parseFloat(structureForm.amount),
          frequency: structureForm.frequency
        });
        setSuccess('New fee structure created.');
      }
      setShowStructureModal(false);
      setEditingStructure(null);
      setStructureForm({ name: '', grade: '', amount: '', frequency: 'Monthly' });
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save fee structure.');
    }
  };

  const handleDeleteStructure = async (id) => {
    if (!window.confirm('Delete this fee structure?')) return;
    try {
      await apiClient.delete(`/billing/structures/${id}`);
      setSuccess('Fee structure deleted.');
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete structure.');
    }
  };

  const handleSendReminder = async (invoiceId) => {
    try {
      await apiClient.post(`/billing/invoices/${invoiceId}/reminder`);
      setSuccess('Payment reminder sent to student guardian.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reminder.');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const s = search.toLowerCase();
    const matchesSearch = 
      (inv.studentName || '').toLowerCase().includes(s) ||
      (inv.studentCode || '').toLowerCase().includes(s) ||
      (inv.feeStructureName || '').toLowerCase().includes(s);
    
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && (inv.status || '').toLowerCase() === statusFilter.toLowerCase();
  });

  const totalBilled = invoices.reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalCollected = invoices.filter(i => i.status === 'Paid').reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalPending = invoices.filter(i => i.status !== 'Paid').reduce((acc, i) => acc + (i.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="School Billing & Student Fees" subtitle="Manage Fee Structures, Invoices & Payment Receipts" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Total Invoiced</span>
              <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{totalBilled.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">{invoices.length} invoices generated</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Fee Collected</span>
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              ₹{totalCollected.toLocaleString()}
            </div>
            <p className="text-xs text-emerald-600/80 mt-1 font-semibold">
              {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% recovery rate
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Outstanding Dues</span>
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600 font-mono">
              ₹{totalPending.toLocaleString()}
            </div>
            <p className="text-xs text-rose-500 mt-1">{invoices.filter(i => i.status !== 'Paid').length} pending invoices</p>
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

        {/* Main Workspace Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          {/* Tabs & Search Header */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                  activeTab === 'invoices'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Invoices ({invoices.length})
              </button>
              <button
                onClick={() => setActiveTab('structures')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                  activeTab === 'structures'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Fee Structures ({structures.length})
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                  activeTab === 'transactions'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Transactions ({transactions.length})
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-3">
              {activeTab === 'invoices' && (
                <>
                  <div className="relative min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search student or fee..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="ALL">All Status</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </>
              )}

              {activeTab === 'structures' && (
                <button
                  onClick={() => {
                    setEditingStructure(null);
                    setStructureForm({ name: '', grade: '', amount: '', frequency: 'Monthly' });
                    setShowStructureModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm transition flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Fee Structure
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center"><Loader /></div>
          ) : (
            <div>
              {/* TAB 1: Invoices */}
              {activeTab === 'invoices' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-3.5 px-6">STUDENT</th>
                        <th className="py-3.5 px-4">FEE HEAD</th>
                        <th className="py-3.5 px-4">AMOUNT</th>
                        <th className="py-3.5 px-4">DUE DATE</th>
                        <th className="py-3.5 px-4">STATUS</th>
                        <th className="py-3.5 px-4 text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                      {filteredInvoices.map(inv => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900">{inv.studentName || 'Student'}</div>
                            <div className="text-xs text-slate-400 font-mono">{inv.studentCode || 'N/A'} • {inv.grade || ''}</div>
                          </td>
                          <td className="py-4 px-4 font-semibold text-slate-700">
                            {inv.feeStructureName || 'Tuition Fee'}
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-slate-900">
                            ₹{(inv.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500 font-medium">
                            {new Date(inv.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-3xs font-black uppercase tracking-wider border ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {inv.status || 'Pending'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            {inv.status !== 'Paid' && (
                              <button
                                onClick={() => handleSendReminder(inv.id)}
                                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg transition inline-flex items-center gap-1.5"
                              >
                                <Bell className="w-3.5 h-3.5" />
                                Send Reminder
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: Fee Structures */}
              {activeTab === 'structures' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-3.5 px-6">STRUCTURE NAME</th>
                        <th className="py-3.5 px-4">APPLICABLE GRADE</th>
                        <th className="py-3.5 px-4">FREQUENCY</th>
                        <th className="py-3.5 px-4">AMOUNT</th>
                        <th className="py-3.5 px-4 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                      {structures.map(s => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-6 font-bold text-slate-900">{s.name}</td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-2xs font-bold">
                              {s.grade || 'All Grades'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-600 font-semibold">{s.frequency || 'Monthly'}</td>
                          <td className="py-4 px-4 font-mono font-bold text-purple-700 text-base">
                            ₹{(s.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingStructure(s);
                                setStructureForm({
                                  name: s.name,
                                  grade: s.grade || '',
                                  amount: s.amount,
                                  frequency: s.frequency || 'Monthly'
                                });
                                setShowStructureModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStructure(s.id)}
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

              {/* TAB 3: Transactions */}
              {activeTab === 'transactions' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                        <th className="py-3.5 px-6">REFERENCE #</th>
                        <th className="py-3.5 px-4">STUDENT</th>
                        <th className="py-3.5 px-4">PAYMENT METHOD</th>
                        <th className="py-3.5 px-4">AMOUNT</th>
                        <th className="py-3.5 px-4">TRANSACTION DATE</th>
                        <th className="py-3.5 px-4">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm font-medium">
                      {transactions.map(txn => (
                        <tr key={txn.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-4 px-6 font-mono text-xs font-bold text-slate-800">
                            {txn.referenceNumber || `TXN-${txn.id.substring(0, 8)}`}
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-900">{txn.studentName || 'Student'}</td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-2xs font-semibold">
                              {txn.paymentMethod || 'Online'}
                            </span>
                          </td>
                          <td className="py-4 px-4 font-mono font-bold text-emerald-700">
                            ₹{(txn.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-4 px-4 text-xs text-slate-500">
                            {new Date(txn.transactionDate).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-3xs font-black uppercase border border-emerald-200">
                              {txn.status || 'Success'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fee Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
              <h3 className="font-extrabold text-base">
                {editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
              </h3>
              <button onClick={() => setShowStructureModal(false)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveStructure} className="p-6 space-y-4">
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Fee Head Name *</label>
                <input
                  type="text"
                  required
                  value={structureForm.name}
                  onChange={e => setStructureForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Annual Tuition Fee"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={structureForm.amount}
                    onChange={e => setStructureForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="5000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Frequency</label>
                  <select
                    value={structureForm.frequency}
                    onChange={e => setStructureForm(p => ({ ...p, frequency: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-Yearly">Half-Yearly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Applicable Grade</label>
                <input
                  type="text"
                  value={structureForm.grade}
                  onChange={e => setStructureForm(p => ({ ...p, grade: e.target.value }))}
                  placeholder="Leave empty for all grades"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowStructureModal(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase rounded-xl">Save Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolBilling;
