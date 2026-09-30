import { useState, useEffect, useRef } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  BookMarked, 
  RotateCcw, 
  Search, 
  User, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  BookOpen,
  Sparkles,
  Check,
  Scan,
  Zap
} from 'lucide-react';

const IssueReturn = () => {
  const [activeTab, setActiveTab] = useState('issue'); // 'issue', 'return'
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [searchLoan, setSearchLoan] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Continuous Barcode Scan Mode State
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scanLog, setScanLog] = useState([]);
  const barcodeInputRef = useRef(null);

  // Issue Form State
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Keep barcode input focused in Scan Mode
  useEffect(() => {
    if (barcodeMode && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [barcodeMode, scannedBarcode]);

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!scannedBarcode.trim()) return;
    const code = scannedBarcode.trim();
    setScannedBarcode('');

    const matchedLoan = activeLoans.find(l =>
      (l.bookISBN && l.bookISBN.toLowerCase() === code.toLowerCase()) ||
      (l.id && l.id.toLowerCase() === code.toLowerCase()) ||
      (l.bookTitle && l.bookTitle.toLowerCase().includes(code.toLowerCase()))
    );

    if (matchedLoan) {
      try {
        const res = await apiClient.put(`/library/transactions/${matchedLoan.id}/return`, { finePaid: true });
        const fineText = res.data?.fineAmount > 0 ? ` • Fine ₹${res.data.fineAmount} recorded` : ' • No Fine';
        const msg = `Returned: "${matchedLoan.bookTitle}" (${matchedLoan.memberName})${fineText}`;
        setSuccess(msg);
        setScanLog(prev => [{ time: new Date().toLocaleTimeString(), text: msg, success: true }, ...prev.slice(0, 9)]);
        await fetchData();
        setTimeout(() => setSuccess(''), 4000);
      } catch (err) {
        const errMsg = `Return failed for "${matchedLoan.bookTitle}": ${err.response?.data?.error || err.message}`;
        setError(errMsg);
        setScanLog(prev => [{ time: new Date().toLocaleTimeString(), text: errMsg, success: false }, ...prev.slice(0, 9)]);
      }
    } else {
      const matchedBook = books.find(b =>
        (b.isbn && b.isbn.toLowerCase() === code.toLowerCase()) ||
        (b.title && b.title.toLowerCase().includes(code.toLowerCase()))
      );

      if (matchedBook) {
        const infoMsg = `Book "${matchedBook.title}" is already on shelf (not issued).`;
        setError(infoMsg);
        setScanLog(prev => [{ time: new Date().toLocaleTimeString(), text: infoMsg, success: false }, ...prev.slice(0, 9)]);
      } else {
        const notFoundMsg = `No book or active loan found with barcode "${code}".`;
        setError(notFoundMsg);
        setScanLog(prev => [{ time: new Date().toLocaleTimeString(), text: notFoundMsg, success: false }, ...prev.slice(0, 9)]);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [booksRes, loansRes] = await Promise.all([
        apiClient.get('/library/books'),
        apiClient.get('/library/transactions?status=Issued')
      ]);
      setBooks(booksRes.data || []);
      setActiveLoans(loansRes.data || []);
    } catch (err) {
      console.error('Failed to load issue/return data:', err);
      setError('Failed to load library records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Search members on query
  useEffect(() => {
    if (searchMember.length >= 2) {
      const search = async () => {
        try {
          const res = await apiClient.get(`/library/members?search=${searchMember}`);
          setMembers(res.data || []);
        } catch (err) {
          console.error('Failed to search members:', err);
        }
      };
      search();
    } else {
      setMembers([]);
    }
  }, [searchMember]);

  const handleIssue = async (e) => {
    e.preventDefault();
    if (!selectedBookId || !selectedMemberId) {
      setError('Please select both a book and a member.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/library/transactions/issue', {
        bookId: selectedBookId,
        memberId: selectedMemberId,
        dueDate: dueDate ? new Date(dueDate) : undefined
      });
      setSuccess('Book issued successfully!');
      setSelectedBookId('');
      setSelectedMemberId('');
      setSearchMember('');
      setDueDate('');
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to issue book.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturn = async (loanId, finePaid = true) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.put(`/library/transactions/${loanId}/return`, { finePaid });
      if (res.data.fineAmount > 0) {
        setSuccess(`Book returned! Overdue fine of ₹${res.data.fineAmount} recorded.`);
      } else {
        setSuccess('Book returned successfully! Copy restored to shelf.');
      }
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to return book.');
    } finally {
      setSubmitting(false);
    }
  };

  const availableBooks = books.filter(b => b.availableCopies > 0);

  const filteredLoans = activeLoans.filter(l => {
    const s = searchLoan.toLowerCase();
    return (
      (l.bookTitle || '').toLowerCase().includes(s) ||
      (l.memberName || '').toLowerCase().includes(s) ||
      (l.bookISBN || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Book Issue & Return Operations" subtitle="Process Student & Faculty Book Loans with Automated Overdue Calculation" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Tab Switcher Bar */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab('issue')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activeTab === 'issue'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookMarked className="w-4 h-4" />
              Issue Book to Member
            </button>
            <button
              onClick={() => setActiveTab('return')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black transition flex items-center gap-2 ${
                activeTab === 'return'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              Return & Check-in ({activeLoans.length} Active Loans)
            </button>
          </div>

          {/* Barcode Continuous Scan Mode Toggle */}
          <button
            onClick={() => setBarcodeMode(!barcodeMode)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              barcodeMode
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/40 animate-pulse'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>{barcodeMode ? '⚡ Continuous Scan Mode: ACTIVE' : 'Enable Barcode Scan Mode'}</span>
          </button>
        </div>

        {/* Continuous Barcode Scanner Station */}
        {barcodeMode && (
          <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white p-5 sm:p-6 rounded-3xl border border-emerald-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Rapid Continuous Barcode Check-In</h3>
                  <p className="text-2xs text-emerald-300/80">Scan books with hardware scanner gun • Instant auto-return on enter</p>
                </div>
              </div>
              <span className="text-3xs font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold w-fit">
                Scanner Gun Listening (Auto-Focused)
              </span>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Scan className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={scannedBarcode}
                  onChange={e => setScannedBarcode(e.target.value)}
                  placeholder="Scan ISBN or accession barcode number here..."
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border-2 border-emerald-500/60 rounded-2xl text-sm font-mono text-emerald-300 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 placeholder-slate-600"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg transition"
              >
                Return
              </button>
            </form>

            {/* Scan Activity Log */}
            {scanLog.length > 0 && (
              <div className="pt-2 border-t border-white/10 space-y-1.5">
                <span className="text-3xs uppercase font-bold text-slate-400 tracking-wider">Recent Scans (Last 10):</span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {scanLog.map((item, idx) => (
                    <div
                      key={idx}
                      className={`text-2xs font-mono px-2.5 py-1 rounded-lg flex items-center justify-between ${
                        item.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <span className="truncate mr-2">{item.text}</span>
                      <span className="text-3xs text-slate-500 shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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

        {/* TAB 1: ISSUE BOOK */}
        {activeTab === 'issue' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm max-w-2xl mx-auto space-y-6 text-left">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-cyan-600" />
                Issue Book
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Select an available copy and assign to a student or teacher.</p>
            </div>

            <form onSubmit={handleIssue} className="space-y-5">
              {/* Select Book */}
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Select Book from Shelf *
                </label>
                <select
                  required
                  value={selectedBookId}
                  onChange={e => setSelectedBookId(e.target.value)}
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="">-- Choose Book ({availableBooks.length} available) --</option>
                  {availableBooks.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.title} (by {b.author}) — Shelf {b.shelfLocation} • [{b.availableCopies} left]
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Member */}
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Find Student or Teacher *
                </label>
                <input
                  type="text"
                  value={searchMember}
                  onChange={e => setSearchMember(e.target.value)}
                  placeholder="Type name or email to search..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500"
                />

                {members.length > 0 && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-xl max-h-40 overflow-y-auto space-y-1">
                    {members.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setSearchMember(`${m.name} (${m.role})`);
                          setMembers([]);
                        }}
                        className="w-full text-left p-2 hover:bg-cyan-50 rounded-lg text-xs flex items-center justify-between transition"
                      >
                        <span className="font-bold text-slate-900">{m.name}</span>
                        <span className="text-3xs px-2 py-0.5 bg-slate-200 text-slate-700 rounded capitalize font-bold">{m.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Due Date (Optional override) */}
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Custom Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-3xs text-slate-400 mt-1">Leave blank to use default policy loan duration.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition disabled:opacity-50"
              >
                {submitting ? 'Issuing...' : 'Confirm Book Issue'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: RETURN BOOK */}
        {activeTab === 'return' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Active Book Loans ({activeLoans.length})</h2>
                <p className="text-xs text-slate-400 mt-0.5">Process book return and collect overdue fines</p>
              </div>

              <div className="relative min-w-[280px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchLoan}
                  onChange={e => setSearchLoan(e.target.value)}
                  placeholder="Search book or borrower..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:bg-white"
                />
              </div>
            </div>

            {loading ? (
              <div className="py-24 text-center"><Loader /></div>
            ) : filteredLoans.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Active Loans Pending Return</p>
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
                      <th className="py-3.5 px-4">STATUS & FINE</th>
                      <th className="py-3.5 px-4 text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm font-medium">
                    {filteredLoans.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{l.bookTitle}</div>
                          <div className="text-xs text-slate-400 font-mono">{l.bookISBN}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-900">{l.memberName}</div>
                          <span className="text-3xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded capitalize font-bold">
                            {l.memberType}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-xs text-slate-600">
                          {new Date(l.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        <td className="py-4 px-4 text-xs font-semibold text-slate-800">
                          {new Date(l.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        <td className="py-4 px-4">
                          {l.status === 'Overdue' ? (
                            <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full text-3xs font-black uppercase border border-rose-200 flex items-center gap-1 w-fit">
                              Overdue ({l.overdueDays}d) • ₹{l.fineAmount} Fine
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full text-3xs font-black uppercase border border-cyan-200">
                              Active Loan
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <button
                            onClick={() => handleReturn(l.id, true)}
                            disabled={submitting}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition flex items-center gap-1.5 ml-auto"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Return Book
                          </button>
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
  );
};

export default IssueReturn;
