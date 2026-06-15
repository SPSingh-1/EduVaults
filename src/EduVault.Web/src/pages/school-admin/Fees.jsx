import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const Fees = () => {
  const [invoices, setInvoices] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [error, setError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Modal Form State
  const [form, setForm] = useState({
    name: '',
    grade: '',
    amount: '',
    frequency: 'Monthly'
  });

  const [editForm, setEditForm] = useState({
    name: '',
    grade: '',
    amount: '',
    frequency: 'Monthly'
  });

  const fetchData = async () => {
    try {
      const invRes = await apiClient.get('/billing/invoices');
      setInvoices(invRes.data);

      const strRes = await apiClient.get('/billing/structures');
      setStructures(strRes.data);
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateFeeType = async (e) => {
    e.preventDefault();
    if (!form.name || !form.amount) {
      setError('Name and Amount are required.');
      return;
    }
    setError('');
    setFormLoading(true);
    try {
      await apiClient.post('/billing/structures', {
        name: form.name,
        grade: form.grade,
        amount: parseFloat(form.amount),
        frequency: form.frequency
      });
      setShowNewModal(false);
      setForm({ name: '', grade: '', amount: '', frequency: 'Monthly' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create fee type.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditFeeClick = (f) => {
    setEditingFee(f);
    setEditForm({
      name: f.name,
      grade: f.grade === 'All Grades' ? '' : f.grade,
      amount: f.amount,
      frequency: f.frequency
    });
    setError('');
    setShowEditModal(true);
  };

  const handleUpdateFeeType = async (e) => {
    e.preventDefault();
    if (!editForm.name || !editForm.amount) {
      setError('Name and Amount are required.');
      return;
    }
    setError('');
    setFormLoading(true);
    try {
      await apiClient.put(`/billing/structures/${editingFee.id}`, {
        name: editForm.name,
        grade: editForm.grade,
        amount: parseFloat(editForm.amount),
        frequency: editForm.frequency
      });
      setShowEditModal(false);
      setEditingFee(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update fee type.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteFeeType = async (id) => {
    if (!window.confirm('Are you sure you want to delete this fee type?')) return;
    setError('');
    setFormLoading(true);
    try {
      await apiClient.delete(`/billing/structures/${id}`);
      setShowEditModal(false);
      setEditingFee(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete fee type.');
    } finally {
      setFormLoading(false);
    }
  };

  // Calculations
  const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);
  const collectedFees = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingDues = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const lateFees = Math.round(collectedFees * 0.02); // Simulated late fees at 2% of collected

  // Dynamic grouping of invoices by month for the chart
  const getChartData = () => {
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last6.push({
        month: months[d.getMonth()],
        collected: 0,
        pending: 0
      });
    }

    invoices.forEach(inv => {
      const date = new Date(inv.date);
      const mName = months[date.getMonth()];
      const match = last6.find(x => x.month === mName);
      if (match) {
        if (inv.status === 'Paid') {
          match.collected += inv.amount;
        } else {
          match.pending += inv.amount;
        }
      }
    });

    return last6;
  };

  const chartData = getChartData();

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'PAID') return 'badge-success';
    if (s === 'PENDING') return 'badge-warning';
    return 'badge-danger';
  };

  return (
    <div>
      <Topbar
        title="Fees & Payments Overview"
        actions={
          <div className="flex gap-2">
            <button className="btn-primary text-xs">🔔 Send Bulk Reminders</button>
            <button className="btn-outline text-xs">↓ Export Report</button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Total Revenue', v: `Rs. ${totalRevenue.toLocaleString()}`, s: 'All Invoiced', c: 'text-blue-600' },
          { l: 'Collected Fees', v: `Rs. ${collectedFees.toLocaleString()}`, s: 'Cleared payments', c: 'text-green-600' },
          { l: 'Pending Dues', v: `Rs. ${pendingDues.toLocaleString()}`, s: 'Outstanding invoice totals', c: 'text-red-600' },
          { l: 'Late Fees Collected', v: `Rs. ${lateFees.toLocaleString()}`, s: 'Simulated 2% MRR rate', c: 'text-orange-600' }
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.l}</div>
            <div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-xs text-gray-400">{s.s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-primary">Collected vs. Pending Fees</h3>
            <select className="input w-36 text-xs py-1.5">
              <option>Last 6 Months</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="collected" name="Collected" fill="#1a2744" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pending" name="Pending" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-primary">Fee Configuration</h3>
            <button
              onClick={() => {
                if (structures.length > 0) {
                  handleEditFeeClick(structures[0]);
                } else {
                  setError('No fee configurations available to edit.');
                }
              }}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              Edit Rules
            </button>
          </div>
          <div className="space-y-3">
            {structures.map(f => (
              <div key={f.id} onClick={() => handleEditFeeClick(f)} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 cursor-pointer">
                <div>
                  <div className="text-xs text-gray-400">{f.name} ({f.frequency})</div>
                  <div className="font-semibold text-primary text-sm">Rs. {f.amount.toLocaleString()} {f.grade ? `· Grade ${f.grade}` : '· All Grades'}</div>
                </div>
                <span className="text-gray-400">›</span>
              </div>
            ))}
            {structures.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-4">No fee structures configured.</div>
            )}
            <button onClick={() => { setError(''); setShowNewModal(true); }} className="w-full border-2 border-dashed border-gray-200 rounded-xl py-2.5 text-xs text-gray-400 hover:border-primary hover:text-primary transition-all">
              + Add New Fee Type
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-primary mb-4">Recent Transactions</h3>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-th text-left">Student Name</th>
              <th className="table-th text-left">Fee Type</th>
              <th className="table-th text-left">Amount</th>
              <th className="table-th text-left">Date</th>
              <th className="table-th text-left">Status</th>
              <th className="table-th text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((t, idx) => (
              <tr key={t.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                      {t.studentName ? t.studentName[0] : '?'}
                    </div>
                    <span className="font-medium text-sm">{t.studentName}</span>
                  </div>
                </td>
                <td className="table-td text-sm text-gray-500">{t.type}</td>
                <td className="table-td font-bold text-primary">Rs. {t.amount.toLocaleString()}</td>
                <td className="table-td text-sm text-gray-400">{t.date}</td>
                <td className="table-td">
                  <span className={getStatusBadge(t.status)}>
                    {t.status}
                  </span>
                </td>
                <td className="table-td">
                  <button className="text-gray-400 text-lg">⋮</button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No billing invoices recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateFeeType} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <h3 className="font-display font-bold text-primary text-xl mb-3">Add New Fee Type</h3>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fee Name *</label>
                  <input required placeholder="e.g. Monthly Tuition Fee" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Grade (optional)</label>
                  <input placeholder="e.g. 10 (Leave blank for all)" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (Rs.) *</label>
                  <input type="number" required placeholder="e.g. 2000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Frequency</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} className="input">
                    <option>Monthly</option>
                    <option>Annual</option>
                    <option>One-time</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button type="button" onClick={() => setShowNewModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? 'Saving...' : 'Create Fee Type'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditModal && editingFee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUpdateFeeType} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-primary text-xl">Edit Fee Type</h3>
                <button
                  type="button"
                  onClick={() => handleDeleteFeeType(editingFee.id)}
                  className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                  title="Delete Fee Type"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Fee Name *</label>
                  <input required placeholder="e.g. Monthly Tuition Fee" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Grade (optional)</label>
                  <input placeholder="e.g. 10 (Leave blank for all)" value={editForm.grade} onChange={e => setEditForm(f => ({ ...f, grade: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (Rs.) *</label>
                  <input type="number" required placeholder="e.g. 2000" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Frequency</label>
                  <select value={editForm.frequency} onChange={e => setEditForm(f => ({ ...f, frequency: e.target.value }))} className="input">
                    <option>Monthly</option>
                    <option>Annual</option>
                    <option>One-time</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button type="button" onClick={() => { setShowEditModal(false); setEditingFee(null); }} className="btn-outline">Cancel</button>
              <button type="submit" disabled={formLoading} className="btn-primary">
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Fees;