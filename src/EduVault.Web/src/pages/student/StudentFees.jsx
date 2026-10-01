import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import Topbar from '../../components/layout/Topbar';
import Loader from '../../components/common/Loader';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY, formatDateRangeDDMMYYYY, getTodayStr } from '../../utils/dateUtils';
import DateFilterInput from '../../components/common/DateFilterInput';
import { loadScript } from '../../utils/scriptLoader';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { useToast } from '../../contexts/ToastContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Trophy,
  Award,
  ClipboardList,
  PenTool,
  Wallet,
  Megaphone,
  User,
  CreditCard,
  Lock,
  MessageSquare,
  Printer,
  Building,
  GraduationCap,
  Mail,
  Fingerprint,
  MapPin,
  HeartPulse,
  BookOpen,
  ChevronDown,
  CalendarDays,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  X
} from 'lucide-react';
import { printRenderedDocument } from '../../components/print/PrintIframe';
import { CustomStudentTooltip, executePaymentFlow } from './studentUtils';

export const StudentFees = () => {
  const [invoices, setInvoices] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoicesAndStructures = async () => {
    try {
      const res = await apiClient.get('/billing/invoices');
      setInvoices(res.data);

      const structRes = await apiClient.get('/billing/my-fee-structures');
      setFeeStructures(structRes.data);

      const txnRes = await apiClient.get('/billing/transactions');
      setTransactions(txnRes.data);
    } catch (err) {
      console.error('Error loading fees data:', err);
    } finally {
      setLoading(false);
    }
  };

  const [payModalInvoice, setPayModalInvoice] = useState(null);
  const [payCustomMode, setPayCustomMode] = useState('full'); // 'full' or 'partial'
  const [payCustomAmount, setPayCustomAmount] = useState('');

  const handleOpenPayDialog = (inv) => {
    setPayModalInvoice(inv);
    setPayCustomMode('full');
    setPayCustomAmount(String(inv.amount || 0));
  };

  const handleConfirmStudentPay = async () => {
    if (!payModalInvoice) return;
    const amountToPay = payCustomMode === 'partial' ? (parseFloat(payCustomAmount) || 0) : payModalInvoice.amount;
    if (amountToPay <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }
    const invId = payModalInvoice.id;
    setPayModalInvoice(null);
    await executePaymentFlow(invId, setLoading, fetchInvoicesAndStructures, amountToPay);
  };

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredInvoices = invoices.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = (t.title || t.name || '').toLowerCase().includes(q);
      const invMatch = (t.invoiceNo || t.id || '').toLowerCase().includes(q);
      if (!titleMatch && !invMatch) return false;
    }
    if (statusFilter && (t.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.due || t.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.due || t.createdAt) > to) return false;
    }
    return true;
  });

  const filteredTransactions = transactions.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = (t.title || t.payerName || '').toLowerCase().includes(q);
      const txnMatch = (t.transactionId || t.id || '').toLowerCase().includes(q);
      if (!titleMatch && !txnMatch) return false;
    }
    if (statusFilter && (t.status || '').toLowerCase() !== statusFilter.toLowerCase()) return false;

    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.date || t.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.date || t.createdAt) > to) return false;
    }
    return true;
  });

  const pendingAmount = filteredInvoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = filteredInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const paidInvoices = filteredInvoices.filter(i => i.status === 'Paid');
  const lastPaymentVal = paidInvoices.length > 0 ? paidInvoices[0].amount : 0;

  useEffect(() => {
    fetchInvoicesAndStructures();
  }, []);

  if (loading) {
    return <Loader message="Accessing student ledger & invoices" />;
  }

  return (
    <div>
      {payModalInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h3 className="font-bold text-lg">Process Payment</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={payCustomMode === 'full'} onChange={() => setPayCustomMode('full')} />
                <span className="text-sm">Pay Full Amount (Rs. {payModalInvoice.amount})</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={payCustomMode === 'partial'} onChange={() => { setPayCustomMode('partial'); setPayCustomAmount(''); }} />
                <span className="text-sm">Partial Payment</span>
              </label>
              {payCustomMode === 'partial' && (
                <input type="number" value={payCustomAmount} onChange={(e) => setPayCustomAmount(e.target.value)} placeholder="Amount" className="w-full border rounded-lg p-2 text-sm" />
              )}
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <button onClick={() => setPayModalInvoice(null)} className="px-4 py-2 text-sm font-semibold text-gray-500">Cancel</button>
              <button onClick={handleConfirmStudentPay} className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}
      <Topbar title="Fees & Payments" subtitle="Review your financial standing and manage school dues." />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search invoice..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl"
            style={{ width: '150px' }}
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl"
          >
            <option value="">Status: All</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Partially Paid">Partially Paid</option>
          </select>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1.5 px-3 bg-white border border-gray-200 focus:border-primary focus:ring-primary focus:ring-1 rounded-xl text-primary" style={{ width: '135px' }} />
          {(dateFrom || dateTo || search || statusFilter) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setStatusFilter(''); }} className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { l: 'Total Billed', v: `Rs. ${Number((pendingAmount || 0) + (totalPaid || 0)).toLocaleString()}`, c: 'text-primary' },
          { l: 'Total Paid', v: `Rs. ${Number(totalPaid || 0).toLocaleString()}`, c: 'text-emerald-600' },
          { l: 'Pending Dues', v: `Rs. ${Number(pendingAmount || 0).toLocaleString()}`, c: pendingAmount > 0 ? 'text-rose-600' : 'text-slate-400' },
          { l: 'Last Payment', v: `Rs. ${Number(lastPaymentVal || 0).toLocaleString()}`, c: 'text-primary' },
        ].map(s => (
          <div key={s.l} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.l}</div>
            <div className={`font-display text-xl font-bold ${s.c}`}>{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-2">
          <h3 className="font-display font-semibold text-primary mb-4">Pending & Recent Invoices</h3>
          <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50/50">
                <tr className="border-b border-slate-150">
                  <th className="table-th text-left">Fee Description</th>
                  <th className="table-th text-center">Due Date</th>
                  <th className="table-th text-center">Amount</th>
                  <th className="table-th text-center">Status</th>
                  <th className="table-th text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((f, i) => (
                  <tr key={f.id || i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="table-td"><div className="font-semibold text-sm text-primary">{f.desc}</div><div className="text-2xs text-gray-400">{f.sub}</div></td>
                    <td className="table-td text-center text-sm font-medium text-slate-650">{f.due}</td>
                    <td className="table-td text-center font-bold text-slate-800">Rs. {Number(f.amount || 0).toLocaleString()}</td>
                    <td className="table-td text-center"><span className={f.status === 'Paid' ? 'badge-success' : 'badge-warning'}>{f.status}</span></td>
                    <td className="table-td text-center">
                      {f.status !== 'Paid' && (
                        <button onClick={() => handleOpenPayDialog(f)} disabled={loading} className="btn-primary text-xs px-3 py-1 bg-primary hover:bg-primary/90">
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-gray-400 text-sm">No fee structures invoiced yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3 className="font-display font-semibold text-primary mb-4">🏫 Yearly Fee Schedule</h3>
          <p className="text-xs text-gray-400 mb-4">Fee structures configured by school administration for your grade level.</p>
          <div className="space-y-3">
            {feeStructures.map((fs, idx) => (
              <div key={fs.id || idx} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-primary">{fs.name}</div>
                  <div className="text-xs text-gray-400">{fs.frequency} · Grade {fs.grade}</div>
                </div>
                <div className="font-bold text-primary text-sm">Rs. {Number(fs.amount || 0).toLocaleString()}</div>
              </div>
            ))}
            {feeStructures.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-xs">No applicable fee structures set.</div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="card mt-6">
        <h3 className="font-display font-semibold text-primary mb-4">📋 Payment Transaction History</h3>
        <div className="overflow-hidden border border-slate-100/80 rounded-xl bg-white shadow-3xs">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-150">
                <th className="table-th text-left">Reference Number</th>
                <th className="table-th text-left">Fee Description</th>
                <th className="table-th text-center">Date</th>
                <th className="table-th text-center">Payment Method</th>
                <th className="table-th text-center">Amount</th>
                <th className="table-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t, i) => (
                <tr key={t.id || i} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="table-td font-mono text-xs text-primary font-bold">{t.referenceNumber}</td>
                  <td className="table-td text-sm font-semibold text-slate-700">{t.feeName}</td>
                  <td className="table-td text-center text-xs text-gray-400 font-medium">{t.date}</td>
                  <td className="table-td text-center text-xs text-gray-500 font-medium">{t.paymentMethod}</td>
                  <td className="table-td text-center text-sm font-bold text-primary">Rs. {Number(t.amount || 0).toLocaleString()}</td>
                  <td className="table-td text-center">
                    <span className={t.status === 'success' ? 'badge-success' : 'badge-danger'}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No transactions completed yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Student Notices ---
export default StudentFees;
