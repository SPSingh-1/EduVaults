import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  History, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  BookOpen, 
  Download,
  Filter 
} from 'lucide-react';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/library/transactions');
      setTransactions(res.data || []);
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handlePayFine = async (id) => {
    try {
      await apiClient.put(`/library/transactions/${id}/pay-fine`);
      setSuccess('Fine marked as Paid.');
      fetchTransactions();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update fine status.');
    }
  };

  const filtered = transactions.filter(t => {
    const s = search.toLowerCase();
    const matchesSearch = 
      (t.bookTitle || '').toLowerCase().includes(s) ||
      (t.memberName || '').toLowerCase().includes(s) ||
      (t.bookISBN || '').toLowerCase().includes(s);

    const matchesStatus = statusFilter === 'ALL' || (t.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Library Loan History & Audit Log" subtitle="Complete Record of All Issued, Returned, and Overdue Book Transactions" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
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

        {/* Transactions Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {['ALL', 'Issued', 'Returned', 'Overdue'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search borrower or book..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center"><Loader /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold">No Transactions Found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">BOOK TITLE</th>
                    <th className="py-3.5 px-4">BORROWER</th>
                    <th className="py-3.5 px-4">ISSUE DATE</th>
                    <th className="py-3.5 px-4">DUE DATE</th>
                    <th className="py-3.5 px-4">RETURN DATE</th>
                    <th className="py-3.5 px-4">STATUS</th>
                    <th className="py-3.5 px-4">FINE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{t.bookTitle}</div>
                        <div className="text-xs text-slate-400 font-mono">{t.bookISBN}</div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900">{t.memberName}</div>
                        <span className="text-3xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize font-bold">
                          {t.memberType}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-600">
                        {new Date(t.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-4 px-4 text-xs font-semibold text-slate-700">
                        {new Date(t.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-500">
                        {t.returnDate ? new Date(t.returnDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-3xs font-black uppercase tracking-wider border ${
                          t.status === 'Returned'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : t.status === 'Overdue'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 font-mono">
                        {t.fineAmount > 0 ? (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-rose-600 text-xs">₹{t.fineAmount}</span>
                            {t.finePaid ? (
                              <span className="text-3xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">Paid</span>
                            ) : (
                              <button
                                onClick={() => handlePayFine(t.id)}
                                className="text-3xs px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded font-bold transition"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">₹0</span>
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
    </div>
  );
};

export default TransactionHistory;
