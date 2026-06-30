import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Download, 
  Bell, 
  ChevronRight 
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-100/80 p-3 rounded-2xl shadow-[0_12px_30px_-5px_rgba(0,0,0,0.08)] transition-all">
        <p className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-2xs text-slate-550 font-semibold">{item.name}:</span>
            <span className="text-xs font-black text-slate-800 font-mono">
              Rs. {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
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
        className={className || "input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl"}
        style={style || { width: '135px' }}
      />
    </div>
  );
};

const Fees = () => {
  const [invoices, setInvoices] = useState([]);
  const [structures, setStructures] = useState([]);
  const [studentLedger, setStudentLedger] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');
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

      const ledgerRes = await apiClient.get('/billing/student-ledger');
      setStudentLedger(ledgerRes.data);

      const txnRes = await apiClient.get('/billing/transactions');
      setTransactions(txnRes.data);
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

  // Filtered lists for rendering and statistics based on date ranges
  const filteredInvoices = invoices.filter(t => {
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.date) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.date) > to) return false;
    }
    return true;
  });

  const filteredLedger = studentLedger.filter(sl => {
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(sl.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(sl.createdAt) > to) return false;
    }
    return true;
  });

  const filteredTransactions = transactions.filter(t => {
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.date) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.date) > to) return false;
    }
    return true;
  });

  // Calculations
  const totalRevenue = filteredInvoices.reduce((sum, i) => sum + i.amount, 0);
  const collectedFees = filteredInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingDues = filteredInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
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

    filteredInvoices.forEach(inv => {
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
    <div className="space-y-6">
      <Topbar
        title="Fees & Payments Overview"
        actions={
          <div className="flex gap-2">
            <button className="btn-primary text-xs">
              <Bell className="w-3.5 h-3.5" />
              <span>Send Bulk Reminders</span>
            </button>
            <button className="btn-outline text-xs">
              <Download className="w-3.5 h-3.5" />
              <span>Export Report</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        {[
          { l: 'Total Revenue', v: `Rs. ${totalRevenue.toLocaleString()}`, s: 'All Invoiced', color: 'text-blue-500', bgColor: 'bg-blue-50/50', icon: TrendingUp },
          { l: 'Collected Fees', v: `Rs. ${collectedFees.toLocaleString()}`, s: 'Cleared payments', color: 'text-emerald-500', bgColor: 'bg-emerald-50/50', icon: CheckCircle2 },
          { l: 'Pending Dues', v: `Rs. ${pendingDues.toLocaleString()}`, s: 'Outstanding invoice totals', color: 'text-rose-500', bgColor: 'bg-rose-50/50', icon: AlertCircle },
          { l: 'Late Fees Collected', v: `Rs. ${lateFees.toLocaleString()}`, s: 'Simulated 2% MRR rate', color: 'text-amber-500', bgColor: 'bg-amber-50/50', icon: DollarSign }
        ].map(s => (
          <div key={s.l} className="stat-card flex items-center justify-between p-5 hover:shadow-md transition-all">
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-400">{s.l}</div>
              <div className="font-display text-xl font-bold text-primary">{s.v}</div>
              <div className="text-xs text-gray-405 font-light">{s.s}</div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bgColor}`}>
              <s.icon className={`w-6 h-6 ${s.color} stroke-[1.75]`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-primary text-sm m-0">Collected vs. Pending Fees</h3>
              <p className="text-xs text-gray-405">Fee payments cleared vs outstanding dues</p>
            </div>
            <select className="border border-gray-200 text-xs px-2.5 py-1.5 rounded-lg text-gray-505 outline-none bg-white">
              <option>Last 6 Months</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="collectedFeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.85}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.55}/>
                  </linearGradient>
                  <linearGradient id="pendingFeeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.85}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.55}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', opacity: 0.55 }} transitionDuration={180} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar 
                  dataKey="collected" 
                  name="Collected" 
                  fill="url(#collectedFeeGrad)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={24} 
                  activeBar={{ filter: 'brightness(1.08)', stroke: '#fff', strokeWidth: 1.5 }}
                />
                <Bar 
                  dataKey="pending" 
                  name="Pending" 
                  fill="url(#pendingFeeGrad)" 
                  radius={[4, 4, 0, 0]} 
                  barSize={24} 
                  activeBar={{ filter: 'brightness(1.08)', stroke: '#fff', strokeWidth: 1.5 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
        <div className="flex border-b border-gray-100 mb-6 gap-6">
          {[
            { id: 'invoices', label: 'Recent Invoices' },
            { id: 'ledger', label: 'Student Dues Ledger' },
            { id: 'transactions', label: 'Payment Transactions Log' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 p-3 bg-gray-50 border border-gray-100 rounded-xl">
          <span className="text-xs font-semibold text-gray-500">📅 Filter Active Tab by Date Range:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl" style={{ width: '135px' }} />
            <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl" style={{ width: '135px' }} />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
            )}
          </div>
        </div>

        {activeTab === 'invoices' && (
          <div>
            <h3 className="font-display font-semibold text-primary mb-4">Invoiced School Fees</h3>
            <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
                <table className="w-full text-left" style={{ minWidth: '700px', borderCollapse: 'collapse' }}>
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
                    {filteredInvoices.map((t, idx) => (
                      <tr key={t.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {t.studentName ? t.studentName[0] : '?'}
                            </div>
                            <span className="font-semibold text-sm">{t.studentName}</span>
                          </div>
                        </td>
                        <td className="table-td text-sm text-gray-500 font-medium">{t.type}</td>
                        <td className="table-td font-bold text-primary">Rs. {t.amount.toLocaleString()}</td>
                        <td className="table-td text-sm text-gray-400 font-medium">{t.date}</td>
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
                    {filteredInvoices.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No billing invoices recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div>
            <h3 className="font-display font-semibold text-primary mb-4">Student-wise Dues Ledger</h3>
            <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
                <table className="w-full text-left" style={{ minWidth: '700px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th text-left">Student Name</th>
                      <th className="table-th text-left">Class/Grade</th>
                      <th className="table-th text-left">Total Billed</th>
                      <th className="table-th text-left">Total Paid</th>
                      <th className="table-th text-left">Remaining Due</th>
                      <th className="table-th text-left">Dues Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map((sl, idx) => (
                      <tr key={sl.studentId || idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {sl.studentName ? sl.studentName[0] : '?'}
                            </div>
                            <span className="font-semibold text-sm">{sl.studentName}</span>
                          </div>
                        </td>
                        <td className="table-td text-sm text-gray-500 font-medium">{sl.className}</td>
                        <td className="table-td font-semibold text-gray-700">Rs. {sl.totalBilled.toLocaleString()}</td>
                        <td className="table-td font-semibold text-green-600">Rs. {sl.totalPaid.toLocaleString()}</td>
                        <td className={`table-td font-bold ${sl.remainingDue > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                          Rs. {sl.remainingDue.toLocaleString()}
                        </td>
                        <td className="table-td">
                          <span className={
                            sl.status === 'Paid' ? 'badge-success' :
                            sl.status === 'Partial' ? 'badge-info bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-2xs font-bold' :
                            sl.status === 'Pending' ? 'badge-warning' : 'badge-gray'
                          }>
                            {sl.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredLedger.length === 0 && (
                      <tr>
                        <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No student ledger data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <h3 className="font-display font-semibold text-primary mb-4">Razorpay Payment Transaction Logs</h3>
            <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
                <table className="w-full text-left" style={{ minWidth: '800px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="table-th text-left">Reference Number</th>
                      <th className="table-th text-left">Student Name</th>
                      <th className="table-th text-left">Fee Description</th>
                      <th className="table-th text-left">Date</th>
                      <th className="table-th text-left">Method</th>
                      <th className="table-th text-left">Amount</th>
                      <th className="table-th text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx, idx) => (
                      <tr key={tx.id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td font-mono text-xs text-primary font-bold">{tx.referenceNumber}</td>
                        <td className="table-td text-sm font-semibold">{tx.studentName}</td>
                        <td className="table-td text-sm text-gray-500 font-medium">{tx.feeName}</td>
                        <td className="table-td text-sm text-gray-400 font-medium">{tx.date}</td>
                        <td className="table-td text-sm text-gray-500 font-medium">{tx.paymentMethod}</td>
                        <td className="table-td font-bold text-primary">Rs. {tx.amount.toLocaleString()}</td>
                        <td className="table-td">
                          <span className={tx.status === 'success' ? 'badge-success' : 'badge-danger'}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan="7" className="text-center py-6 text-gray-400 text-sm">No payment transactions recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
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