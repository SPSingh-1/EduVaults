import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  FileText,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  Phone,
  User
} from 'lucide-react';

const GatePassDesk = () => {
  const [gatePasses, setGatePasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [printablePass, setPrintablePass] = useState(null);

  // Student search for gate pass
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [form, setGatePassForm] = useState({
    parentName: '',
    parentPhone: '',
    reason: 'Family Emergency / Doctor Appointment'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchGatePasses = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/receptionist/gate-passes');
      setGatePasses(res.data || []);
    } catch (err) {
      console.error('Failed to load gate passes:', err);
      showToast('Could not load gate pass registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGatePasses();
  }, []);

  // Search student
  useEffect(() => {
    if (!studentQuery.trim() || studentQuery.length < 2) {
      setStudentResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/receptionist/search-student?q=${encodeURIComponent(studentQuery)}`);
        setStudentResults(res.data || []);
      } catch (err) {
        console.error('Search student error:', err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [studentQuery]);

  const handleIssueGatePass = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      showToast('Please select a student.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiClient.post('/receptionist/gate-pass', {
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        classSection: selectedStudent.className,
        parentName: form.parentName || selectedStudent.guardianName,
        parentPhone: form.parentPhone || selectedStudent.guardianPhone,
        reason: form.reason
      });

      showToast(`Gate Pass #${res.data.gatePass.passNumber} issued successfully!`);
      setShowModal(false);
      setSelectedStudent(null);
      setStudentQuery('');
      setGatePassForm({ parentName: '', parentPhone: '', reason: 'Family Emergency / Doctor Appointment' });
      fetchGatePasses();
      setPrintablePass(res.data.gatePass);
    } catch (err) {
      console.error('Issue gate pass error:', err);
      showToast('Failed to issue gate pass.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = gatePasses.filter(g => {
    const s = search.toLowerCase();
    return !search ||
      (g.passNumber || '').toLowerCase().includes(s) ||
      (g.studentName || '').toLowerCase().includes(s) ||
      (g.parentName || '').toLowerCase().includes(s) ||
      (g.classSection || '').toLowerCase().includes(s) ||
      (g.reason || '').toLowerCase().includes(s);
  });

  return (
    <div>
      <Topbar
        title="Early Departure Gate Passes"
        subtitle="Authorize & Track Early Student Pickups by Verified Guardians"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Issue New Gate Pass</span>
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

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl shrink-0">
              🎫
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Gate Passes Issued Today</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">{gatePasses.length}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
              🛡️
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Security Verification</div>
              <div className="text-2xl font-bold font-display text-emerald-600 mt-0.5">Active</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
              🚪
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Authorized Early Exits</div>
              <div className="text-2xl font-bold font-display text-gray-700 mt-0.5">{gatePasses.length}</div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-primary">Issued Gate Pass Registry</h3>
              <p className="text-xs text-gray-400 mt-0.5">Live list of authorized student exit slips for the security gate.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student, pass #, parent..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-9 text-xs py-1.5"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center"><Loader small /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/70">
                    <th className="table-th">Pass #</th>
                    <th className="table-th">Student Details</th>
                    <th className="table-th">Accompanying Guardian</th>
                    <th className="table-th">Exit Reason</th>
                    <th className="table-th">Issued Time</th>
                    <th className="table-th">Security Status</th>
                    <th className="table-th text-right">Print Slip</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(g => (
                    <tr key={g.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="table-td font-mono font-bold text-primary text-xs">{g.passNumber}</td>
                      <td className="table-td">
                        <div className="font-semibold text-primary text-xs">{g.studentName}</div>
                        <div className="text-[11px] text-gray-400">{g.classSection}</div>
                      </td>
                      <td className="table-td">
                        <div className="text-xs text-gray-800 font-medium">{g.parentName}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{g.parentPhone}</div>
                      </td>
                      <td className="table-td text-xs text-gray-600">{g.reason}</td>
                      <td className="table-td text-xs text-gray-500 font-mono">
                        {g.issuedAt ? new Date(g.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </td>
                      <td className="table-td">
                        <span className="badge-warning">Authorized Exit</span>
                      </td>
                      <td className="table-td text-right">
                        <button
                          onClick={() => setPrintablePass(g)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition"
                          title="Print Gate Pass Slip"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-400 text-xs">
                        No gate passes issued today. Click "+ Issue New Gate Pass" when a parent arrives for early pickup.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-primary px-6 py-5 rounded-t-2xl flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Issue Early Departure Pass</h3>
                <p className="text-blue-200 text-xs">Generates verified security slip for main gate</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <form onSubmit={handleIssueGatePass} className="p-6 space-y-4">
              {/* Student Lookup */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Student *</label>
                {!selectedStudent ? (
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Type student name to search..."
                      value={studentQuery}
                      onChange={e => setStudentQuery(e.target.value)}
                      className="input pl-9 text-xs"
                    />
                    {studentResults.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-xl shadow-lg mt-1 divide-y divide-gray-100 max-h-40 overflow-y-auto">
                        {studentResults.map(s => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStudent(s);
                              setGatePassForm(p => ({
                                ...p,
                                parentName: s.guardianName,
                                parentPhone: s.guardianPhone
                              }));
                              setStudentResults([]);
                            }}
                            className="p-2 text-xs hover:bg-primary/5 cursor-pointer flex justify-between items-center"
                          >
                            <span className="font-semibold text-primary">{s.name} ({s.className})</span>
                            <span className="text-gray-400 text-[11px]">{s.guardianName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="text-primary text-xs">{selectedStudent.name}</strong>
                      <div className="text-[11px] text-gray-500">{selectedStudent.className} • Guardian: {selectedStudent.guardianName}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs text-rose-600 font-semibold"
                    >
                      Change
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Accompanying Person *</label>
                  <input
                    type="text"
                    required
                    value={form.parentName}
                    onChange={e => setGatePassForm({ ...form, parentName: e.target.value })}
                    placeholder="e.g. Guardian Name"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    pattern="[0-9]{10}"
                    value={form.parentPhone}
                    onChange={e => setGatePassForm({ ...form, parentPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="e.g. 9876543210"
                    className="input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason for Early Leave</label>
                <select
                  value={form.reason}
                  onChange={e => setGatePassForm({ ...form, reason: e.target.value })}
                  className="input"
                >
                  <option value="Family Emergency / Doctor Appointment">Family Emergency / Doctor Appointment</option>
                  <option value="Medical Sickness / Sick Room Referral">Medical Sickness / Sick Room Referral</option>
                  <option value="Outstation Travel with Parents">Outstation Travel with Parents</option>
                  <option value="Pre-approved Special Leave">Pre-approved Special Leave</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={submitting || !selectedStudent} className="btn-primary text-xs px-5 py-2">
                  {submitting ? 'Generating...' : 'Authorize & Issue Pass'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Slip */}
      {printablePass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl font-bold">
              🚪
            </div>
            <div>
              <h4 className="font-display font-bold text-lg text-primary">STUDENT GATE PASS</h4>
              <p className="text-xs text-amber-700 font-mono font-bold mt-0.5">#{printablePass.passNumber}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-left text-xs space-y-2 border border-gray-100">
              <div className="flex justify-between"><span className="text-gray-500">Student:</span> <strong className="text-gray-900">{printablePass.studentName}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Class:</span> <span className="text-gray-800">{printablePass.classSection}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Guardian:</span> <span className="text-gray-800">{printablePass.parentName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Reason:</span> <span className="text-gray-800">{printablePass.reason}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Issued At:</span> <span className="text-gray-800 font-mono">{new Date(printablePass.issuedAt || Date.now()).toLocaleTimeString()}</span></div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="btn-primary text-xs py-2 flex-1 justify-center"
              >
                🖨️ Print Exit Slip
              </button>
              <button
                onClick={() => setPrintablePass(null)}
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

export default GatePassDesk;
