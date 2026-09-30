import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  Search,
  UserCheck,
  Plus,
  Clock,
  Printer,
  Phone,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X
} from 'lucide-react';
import { printRenderedDocument } from '../../components/print/PrintIframe';

const VisitorRegister = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Active' | 'Checked Out'
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [printableVisitor, setPrintableVisitor] = useState(null);

  const [form, setVisitorForm] = useState({
    visitorName: '',
    phone: '',
    purpose: 'Fee Submission / Inquiry',
    studentName: '',
    classSection: '',
    whomToMeet: 'Front Desk Officer'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/receptionist/visitors');
      setVisitors(res.data || []);
    } catch (err) {
      console.error('Failed to load visitors:', err);
      showToast('Could not load visitor list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisitors();
  }, []);

  const handleAddVisitor = async (e) => {
    e.preventDefault();
    if (!form.visitorName || !form.phone) {
      showToast('Visitor name and contact phone number are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post('/receptionist/visitors', form);
      showToast(`Visitor ${form.visitorName} logged successfully!`);
      setShowModal(false);
      setVisitorForm({
        visitorName: '',
        phone: '',
        purpose: 'Fee Submission / Inquiry',
        studentName: '',
        classSection: '',
        whomToMeet: 'Front Desk Officer'
      });
      fetchVisitors();
      if (res.data?.visitor) {
        setPrintableVisitor(res.data.visitor);
      }
    } catch (err) {
      console.error('Failed to log visitor:', err);
      showToast('Failed to record visitor.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutVisitor = async (id) => {
    try {
      await apiClient.post(`/receptionist/visitors/${id}/checkout`);
      showToast('Visitor marked as Checked Out.');
      fetchVisitors();
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Failed to checkout visitor.');
    }
  };

  const filtered = visitors.filter(v => {
    const s = search.toLowerCase();
    const matchesSearch = !search ||
      (v.visitorName || '').toLowerCase().includes(s) ||
      (v.phone || '').toLowerCase().includes(s) ||
      (v.purpose || '').toLowerCase().includes(s) ||
      (v.whomToMeet || '').toLowerCase().includes(s) ||
      (v.studentName || '').toLowerCase().includes(s);

    const matchesStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeVisitorsCount = visitors.filter(v => v.status === 'Active').length;
  const checkedOutCount = visitors.filter(v => v.status === 'Checked Out').length;

  return (
    <div>
      <Topbar
        title="Visitor Logbook & Gate Register"
        subtitle="Manage Walk-in Guests, Parent Meetings & Visitor Passes"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Log New Visitor</span>
          </button>
        }
      />

      <div className="space-y-6">
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl p-3.5 flex items-center justify-between shadow-xs">
            <span>✅ {toastMessage}</span>
            <button onClick={() => setToastMessage('')} className="text-emerald-600 font-bold">✕</button>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xl shrink-0">
              👥
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Logged Today</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">{visitors.length}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
              🟢
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Currently Inside Campus</div>
              <div className="text-2xl font-bold font-display text-emerald-600 mt-0.5">{activeVisitorsCount}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
              🚪
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Checked Out</div>
              <div className="text-2xl font-bold font-display text-gray-700 mt-0.5">{checkedOutCount}</div>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {[
                { id: 'ALL', label: `All Visitors (${visitors.length})` },
                { id: 'Active', label: `Active Inside (${activeVisitorsCount})` },
                { id: 'Checked Out', label: `Checked Out (${checkedOutCount})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === tab.id
                      ? 'bg-primary text-white shadow-xs font-bold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search visitor, phone, purpose..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9 text-xs py-1.5"
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 flex justify-center"><Loader small /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="table-th">Visitor Details</th>
                    <th className="table-th">Contact Phone</th>
                    <th className="table-th">Meeting With</th>
                    <th className="table-th">Purpose</th>
                    <th className="table-th">Check-in Time</th>
                    <th className="table-th">Status</th>
                    <th className="table-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(v => (
                    <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {v.visitorName ? v.visitorName[0] : 'V'}
                          </div>
                          <div>
                            <div className="font-semibold text-primary text-sm">{v.visitorName}</div>
                            {v.studentName && (
                              <div className="text-[11px] text-gray-400">Student: {v.studentName} {v.classSection && `(${v.classSection})`}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-td font-mono text-xs text-gray-600">{v.phone}</td>
                      <td className="table-td text-xs text-gray-700 font-medium">{v.whomToMeet || 'Front Desk'}</td>
                      <td className="table-td text-xs text-gray-600">{v.purpose}</td>
                      <td className="table-td text-xs text-gray-500 font-mono">
                        {v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </td>
                      <td className="table-td">
                        <span className={v.status === 'Active' ? 'badge-success' : 'badge-gray'}>
                          {v.status}
                        </span>
                      </td>
                      <td className="table-td text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setPrintableVisitor(v)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
                            title="Print Visitor Pass"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {v.status === 'Active' && (
                            <button
                              onClick={() => handleCheckoutVisitor(v.id)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition"
                            >
                              Check Out
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-400 text-xs">
                        No visitor records found. Click "+ Log New Visitor" to record visitors.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Log Visitor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-primary px-6 py-5 rounded-t-2xl flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Log Walk-In Visitor</h3>
                <p className="text-blue-200 text-xs">Records guest entry and issues instant campus pass</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <form onSubmit={handleAddVisitor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Visitor Name *</label>
                  <input
                    type="text"
                    required
                    value={form.visitorName}
                    onChange={e => setVisitorForm({ ...form, visitorName: e.target.value })}
                    placeholder="e.g. Rajesh Gupta"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Phone (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={form.phone}
                    onChange={e => setVisitorForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="e.g. 9876543210"
                    className="input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Purpose of Visit</label>
                  <select
                    value={form.purpose}
                    onChange={e => setVisitorForm({ ...form, purpose: e.target.value })}
                    className="input"
                  >
                    <option value="Fee Submission / Inquiry">Fee Submission / Inquiry</option>
                    <option value="Parent-Teacher Meeting">Parent-Teacher Meeting</option>
                    <option value="Principal Meeting">Principal Meeting</option>
                    <option value="New Admission Inquiry">New Admission Inquiry</option>
                    <option value="Document Submission / TC">Document Submission / TC</option>
                    <option value="Vendor / Delivery / Maintenance">Vendor / Delivery / Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Whom To Meet</label>
                  <input
                    type="text"
                    value={form.whomToMeet}
                    onChange={e => setVisitorForm({ ...form, whomToMeet: e.target.value })}
                    placeholder="e.g. Class Teacher / Principal"
                    className="input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student Name (If Parent)</label>
                  <input
                    type="text"
                    value={form.studentName}
                    onChange={e => setVisitorForm({ ...form, studentName: e.target.value })}
                    placeholder="e.g. Rohan Gupta"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Class / Section</label>
                  <input
                    type="text"
                    value={form.classSection}
                    onChange={e => setVisitorForm({ ...form, classSection: e.target.value })}
                    placeholder="e.g. Class 8-B"
                    className="input"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs px-5 py-2">
                  {submitting ? 'Logging...' : 'Check-In Visitor & Generate Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Visitor Pass Modal */}
      {printableVisitor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl font-bold">
              🎫
            </div>
            <div>
              <h4 className="font-display font-bold text-lg text-primary">VISITOR PASS</h4>
              <p className="text-xs text-gray-400 mt-0.5">EduVault Security Counter</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-left text-xs space-y-2 border border-gray-100">
              <div className="flex justify-between"><span className="text-gray-500">Visitor:</span> <strong className="text-gray-900">{printableVisitor.visitorName}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone:</span> <span className="font-mono text-gray-700">{printableVisitor.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Purpose:</span> <span className="text-gray-800">{printableVisitor.purpose}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Meeting:</span> <span className="text-gray-800">{printableVisitor.whomToMeet}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Check-In:</span> <span className="text-gray-800 font-mono">{new Date(printableVisitor.checkInTime || Date.now()).toLocaleTimeString()}</span></div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const fallback = `
                    <div class="print-zone-thermal" style="padding: 10px; font-size: 11px; text-align: center;">
                      <h3 style="margin: 0; font-size: 15px; font-weight: bold;">EduVault Campus</h3>
                      <p style="margin: 2px 0 8px; font-size: 10px; color: #555;">Official Visitor Pass</p>
                      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin-bottom: 8px; text-align: left;">
                        <div><strong>Visitor:</strong> ${printableVisitor?.visitorName || ''}</div>
                        <div><strong>Phone:</strong> ${printableVisitor?.phone || ''}</div>
                        <div><strong>Purpose:</strong> ${printableVisitor?.purpose || ''}</div>
                        <div><strong>Whom to Meet:</strong> ${printableVisitor?.whomToMeet || ''}</div>
                        <div><strong>Check-In:</strong> ${new Date(printableVisitor?.checkInTime || Date.now()).toLocaleTimeString()}</div>
                      </div>
                      <p style="margin-top: 12px; font-size: 9px; color: #777;">Wear badge visibly at all times on campus.<br/>Return badge to reception upon checkout.</p>
                    </div>
                  `;
                  printRenderedDocument('VisitorPass', printableVisitor?.id || '', fallback);
                }}
                className="btn-primary text-xs py-2 flex-1 justify-center"
              >
                🖨️ Print Pass
              </button>
              <button
                onClick={() => setPrintableVisitor(null)}
                className="btn-outline text-xs py-2 flex-1 justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorRegister;
