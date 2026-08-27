import { useState, useEffect, useRef } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  Search,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Printer,
  MessageSquare,
  User,
  AlertCircle
} from 'lucide-react';

const CounterFeeDesk = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentMode, setPaymentMode] = useState('full'); // 'full' or 'partial'
  const [customAmount, setCustomAmount] = useState('');
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState(null);
  const [collectingPayment, setCollectingPayment] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const searchInputRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiClient.get(`/receptionist/search-student?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setLoadingDetails(true);
    try {
      const res = await apiClient.get(`/receptionist/student-details/${student.id}`);
      setFeeSummary(res.data.feeSummary);
    } catch (err) {
      console.error('Failed to load fee details:', err);
      showToast('Could not load student fee records.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleOpenPayModal = (inv) => {
    setSelectedInvoice(inv);
    setPaymentSuccessReceipt(null);
    setPaymentMethod('Cash');
    setPaymentMode('full');
    setCustomAmount(String(inv.balance || inv.amount || 0));
    setShowPaymentModal(true);
  };

  const handleCollectPayment = async () => {
    if (!selectedStudent || !selectedInvoice) return;
    
    const amountToPay = paymentMode === 'partial' 
      ? (parseFloat(customAmount) || 0) 
      : (selectedInvoice.balance || selectedInvoice.amount);

    if (amountToPay <= 0) {
      showToast('Please enter a valid payment amount.');
      return;
    }

    setCollectingPayment(true);
    try {
      const res = await apiClient.post('/receptionist/collect-spot-fee', {
        studentId: selectedStudent.id,
        invoiceId: selectedInvoice.id,
        amount: amountToPay,
        paymentMethod: paymentMethod,
        notes: `Counter spot collection by Front Desk`
      });

      const receiptData = res.data.receipt || {
        referenceNumber: res.data.referenceNumber,
        amount: res.data.amountPaid,
        totalBilled: res.data.totalBilled,
        remainingBalance: res.data.remainingBalance,
        status: res.data.invoiceStatus
      };

      setPaymentSuccessReceipt(receiptData);
      showToast(`Payment of ₹${amountToPay.toLocaleString()} collected successfully!`);

      // Refresh fee summary
      const refreshRes = await apiClient.get(`/receptionist/student-details/${selectedStudent.id}`);
      setFeeSummary(refreshRes.data.feeSummary);
    } catch (err) {
      console.error('Payment collection error:', err);
      showToast(err.response?.data?.error || 'Failed to record spot fee collection.');
    } finally {
      setCollectingPayment(false);
    }
  };

  const sendWhatsAppReceipt = (mobile, studentName, amount, refNo) => {
    const cleanPhone = (mobile || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hello! Payment of ₹${amount} for ${studentName} has been received at the School Front Desk.\nReceipt No: ${refNo}\nThank you!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div>
      <Topbar
        title="Walk-in Spot Fee Counter"
        subtitle="Instant Student Fee Lookup, Cash / UPI Collection & WhatsApp Receipts"
      />

      <div className="space-y-6">
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3.5 flex items-center justify-between shadow-xs">
            <span>✅ {toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-emerald-600 font-bold">✕</button>
          </div>
        )}

        {/* Universal Search Card */}
        <div className="card space-y-3">
          <label className="block text-xs font-semibold text-gray-700">Student Fee Quick Lookup</label>
          <div className="relative">
            <Search className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Type student name, roll number, or guardian mobile..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input pl-10 text-sm py-2.5"
            />
            {searching && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">Searching...</span>}
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-xl divide-y divide-gray-100 max-h-60 overflow-y-auto z-20">
              {searchResults.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectStudent(s)}
                  className="p-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                      {s.name[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-primary text-xs">{s.name}</div>
                      <div className="text-[11px] text-gray-400">{s.className} • Guardian: {s.guardianName} ({s.guardianPhone})</div>
                    </div>
                  </div>
                  <span className="text-xs text-primary font-semibold">Select →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Student Profile & Invoices */}
        {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Student Info Card */}
            <div className="lg:col-span-4 card space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-lg flex items-center justify-center">
                  {selectedStudent.name[0]}
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-primary">{selectedStudent.name}</h3>
                  <p className="text-xs text-gray-500">{selectedStudent.className} • {selectedStudent.studentId}</p>
                </div>
              </div>

              <div className="text-xs space-y-2 text-gray-600">
                <div className="flex justify-between"><span className="text-gray-400">Guardian:</span> <strong className="text-gray-800">{selectedStudent.guardianName}</strong></div>
                <div className="flex justify-between"><span className="text-gray-400">Phone:</span> <span className="font-mono text-gray-800">{selectedStudent.guardianPhone}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Room / Section:</span> <span className="text-gray-800">{selectedStudent.room || 'Room Assigned'}</span></div>
              </div>

              {feeSummary && (
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-center">
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold">Total</div>
                    <div className="text-xs font-bold text-gray-900 mt-0.5">₹{Number(feeSummary.totalFees || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <div className="text-[10px] text-emerald-700 uppercase font-semibold">Paid</div>
                    <div className="text-xs font-bold text-emerald-700 mt-0.5">₹{Number(feeSummary.totalPaid || 0).toLocaleString()}</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                    <div className="text-[10px] text-rose-700 uppercase font-semibold">Due</div>
                    <div className="text-xs font-bold text-rose-700 mt-0.5">₹{Number(feeSummary.totalDue || 0).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Invoices List */}
            <div className="lg:col-span-8 card space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="font-display font-bold text-base text-primary">
                  Outstanding Fee Invoices
                </h3>
                {feeSummary && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    feeSummary.totalDue > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {feeSummary.totalDue > 0 ? `₹${Number(feeSummary.totalDue || 0).toLocaleString()} Due` : 'No Dues Pending'}
                  </span>
                )}
              </div>

              {loadingDetails ? (
                <div className="py-12 flex justify-center text-xs text-gray-400">Loading student fee account...</div>
              ) : !feeSummary || (feeSummary.invoices || []).length === 0 ? (
                <div className="text-center py-10 px-4 bg-emerald-50/40 rounded-2xl border border-emerald-100/60 space-y-2">
                  <div className="w-11 h-11 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
                    ✓
                  </div>
                  <h4 className="font-display font-bold text-gray-900 text-sm">No Pending Fee Dues</h4>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto">
                    This student currently has 0 outstanding invoices. There are no unpaid fees recorded.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(feeSummary.invoices || []).map(inv => (
                    <div key={inv.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-gray-900 text-sm">{inv.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Due Date: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : 'Immediate'}</div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-xs text-gray-400">Balance Due</div>
                          <div className="text-sm font-bold text-rose-600 font-mono">₹{Number(inv.balance ?? inv.amount ?? 0).toLocaleString()}</div>
                        </div>

                        {inv.status === 'Paid' || inv.status === 'PAID' ? (
                          <span className="badge-success">Paid</span>
                        ) : (
                          <button
                            onClick={() => handleOpenPayModal(inv)}
                            className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Collect ₹{(inv.balance ?? inv.amount).toLocaleString()}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Collect Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-primary px-6 py-5 rounded-t-2xl flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Collect Spot Fee</h3>
                <p className="text-blue-200 text-xs">Direct walk-in / Aanshik shulk collection</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <div className="p-6 space-y-4">
              {!paymentSuccessReceipt ? (
                <>
                  <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100 text-xs">
                    <div className="flex justify-between"><span className="text-gray-500">Student:</span> <strong className="text-gray-900">{selectedStudent.name}</strong></div>
                    <div className="flex justify-between"><span className="text-gray-500">Invoice:</span> <span className="text-gray-800">{selectedInvoice.title}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Total Due:</span> <strong className="text-rose-700 text-sm font-mono">₹{(selectedInvoice.balance ?? selectedInvoice.amount).toLocaleString()}</strong></div>
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600">Payment Collection Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode('full');
                          setCustomAmount(String(selectedInvoice.balance ?? selectedInvoice.amount));
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border transition ${
                          paymentMode === 'full' 
                            ? 'bg-primary text-white border-primary shadow-xs' 
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        Full (₹{(selectedInvoice.balance ?? selectedInvoice.amount).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMode('partial');
                          setCustomAmount('');
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border transition ${
                          paymentMode === 'partial' 
                            ? 'bg-primary text-white border-primary shadow-xs' 
                            : 'bg-gray-50 border-gray-200 text-gray-700'
                        }`}
                      >
                        Custom Partial (आंशिक)
                      </button>
                    </div>

                    {paymentMode === 'partial' && (
                      <div className="pt-2 space-y-1.5">
                        <label className="block text-[11px] font-semibold text-gray-600">Enter Partial Amount (₹) *</label>
                        <input
                          type="number"
                          value={customAmount}
                          onChange={e => setCustomAmount(e.target.value)}
                          placeholder="e.g. 2500"
                          max={selectedInvoice.balance ?? selectedInvoice.amount}
                          className="input w-full text-xs font-mono font-bold"
                          autoFocus
                        />
                        {customAmount && (
                          <div className="flex justify-between text-[11px] font-semibold text-gray-500 pt-0.5">
                            <span>Remaining Balance After Payment:</span>
                            <span className="text-amber-800 font-mono font-bold">
                              ₹{Math.max(0, (selectedInvoice.balance ?? selectedInvoice.amount) - (parseFloat(customAmount) || 0)).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Method</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['Cash', 'UPI', 'Card', 'Cheque'].map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 rounded-lg text-xs font-semibold border transition ${paymentMethod === m ? 'bg-primary text-white border-primary shadow-xs font-bold' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-outline text-xs px-4 py-2">
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={collectingPayment || (paymentMode === 'partial' && (!customAmount || parseFloat(customAmount) <= 0))}
                      onClick={handleCollectPayment}
                      className="btn-primary text-xs px-5 py-2"
                    >
                      {collectingPayment ? 'Processing...' : `Confirm ₹${(paymentMode === 'partial' ? (parseFloat(customAmount) || 0) : (selectedInvoice.balance ?? selectedInvoice.amount)).toLocaleString()} (${paymentMethod})`}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-4 py-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-lg text-emerald-800">Fee Received!</h4>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">Receipt: {paymentSuccessReceipt.referenceNumber}</p>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs space-y-1.5">
                    <div className="flex justify-between"><span className="text-gray-600">Paid Today:</span> <strong className="text-emerald-800 font-mono">₹{(paymentSuccessReceipt.amount || 0).toLocaleString()}</strong></div>
                    {paymentSuccessReceipt.remainingBalance !== undefined && (
                      <div className="flex justify-between pt-1 border-t border-emerald-100">
                        <span className="text-gray-600">Remaining Balance:</span>
                        <strong className="text-rose-700 font-mono">₹{(paymentSuccessReceipt.remainingBalance || 0).toLocaleString()}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => sendWhatsAppReceipt(selectedStudent.guardianPhone, selectedStudent.name, paymentSuccessReceipt.amount, paymentSuccessReceipt.referenceNumber)}
                      className="btn-primary text-xs py-2.5 justify-center bg-emerald-600 hover:bg-emerald-700"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Send WhatsApp Receipt to Parent</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="btn-outline text-xs py-2 justify-center"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print Thermal Slip</span>
                    </button>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-semibold py-1"
                    >
                      Done & Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CounterFeeDesk;
