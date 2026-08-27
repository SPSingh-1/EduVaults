import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import {
  UserPlus,
  Search,
  Plus,
  Phone,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Building
} from 'lucide-react';

const AdmissionLeads = () => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [form, setInquiryForm] = useState({
    childName: '',
    targetClass: 'Class 1',
    parentName: '',
    phone: '',
    address: '',
    notes: 'Walk-in parent inquiry for upcoming academic session'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/receptionist/inquiries');
      setInquiries(res.data || []);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
      showToast('Could not load admission leads.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  const handleAddInquiry = async (e) => {
    e.preventDefault();
    if (!form.childName || !form.phone || !form.parentName) {
      showToast('Child name, parent name, and phone are required.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/receptionist/inquiries', form);
      showToast('Admission inquiry recorded successfully!');
      setShowModal(false);
      setInquiryForm({
        childName: '',
        targetClass: 'Class 1',
        parentName: '',
        phone: '',
        address: '',
        notes: 'Walk-in parent inquiry for upcoming academic session'
      });
      fetchInquiries();
    } catch (err) {
      console.error('Inquiry error:', err);
      showToast('Failed to save inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsAppFollowup = (phone, parentName, childName, targetClass) => {
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const message = encodeURIComponent(
      `Hello ${parentName}! Thank you for visiting our school regarding admission for ${childName} in ${targetClass}. Please let us know if you have any questions. Have a wonderful day!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const filtered = inquiries.filter(i => {
    const s = search.toLowerCase();
    return !search ||
      (i.childName || '').toLowerCase().includes(s) ||
      (i.parentName || '').toLowerCase().includes(s) ||
      (i.phone || '').toLowerCase().includes(s) ||
      (i.targetClass || '').toLowerCase().includes(s) ||
      (i.notes || '').toLowerCase().includes(s);
  });

  return (
    <div>
      <Topbar
        title="Walk-In Admission Inquiries & Leads"
        subtitle="Capture Prospect Parent Inquiries, Target Classes & WhatsApp Follow-Ups"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record New Inquiry</span>
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
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl shrink-0">
              📋
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Total Inquiries Received</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">{inquiries.length}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl shrink-0">
              💬
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">WhatsApp Follow-Ups Ready</div>
              <div className="text-2xl font-bold font-display text-blue-600 mt-0.5">{inquiries.length}</div>
            </div>
          </div>

          <div className="stat-card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xl shrink-0">
              🎯
            </div>
            <div>
              <div className="text-xs text-gray-500 font-medium">Pipeline Status</div>
              <div className="text-2xl font-bold font-display text-primary mt-0.5">Prospects</div>
            </div>
          </div>
        </div>

        {/* Table Card */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-display font-bold text-base text-primary">Admission Leads Tracker</h3>
              <p className="text-xs text-gray-400 mt-0.5">Prospect parents who visited the front desk for admissions.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search child, parent, phone..."
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
                    <th className="table-th">Child Name</th>
                    <th className="table-th">Target Class</th>
                    <th className="table-th">Parent Name</th>
                    <th className="table-th">Phone Number</th>
                    <th className="table-th">Inquiry Date</th>
                    <th className="table-th">Notes</th>
                    <th className="table-th text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(i => (
                    <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <td className="table-td">
                        <div className="font-semibold text-primary text-xs">{i.childName}</div>
                      </td>
                      <td className="table-td">
                        <span className="badge-info">{i.targetClass}</span>
                      </td>
                      <td className="table-td text-xs text-gray-800 font-medium">{i.parentName}</td>
                      <td className="table-td text-xs text-gray-600 font-mono">{i.phone}</td>
                      <td className="table-td text-xs text-gray-500 font-mono">
                        {i.createdAt ? new Date(i.createdAt).toLocaleDateString('en-GB') : 'Today'}
                      </td>
                      <td className="table-td text-xs text-gray-600 max-w-xs truncate">{i.notes || 'General Inquiry'}</td>
                      <td className="table-td text-right">
                        <button
                          onClick={() => sendWhatsAppFollowup(i.phone, i.parentName, i.childName, i.targetClass)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs transition flex items-center gap-1 ml-auto"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-10 text-gray-400 text-xs">
                        No admission inquiries recorded yet. Click "+ Record New Inquiry" to log walk-in parents.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-up">
            <div className="bg-primary px-6 py-5 rounded-t-2xl flex justify-between items-center text-white">
              <div>
                <h3 className="font-display font-bold text-lg">Record Admission Inquiry</h3>
                <p className="text-blue-200 text-xs">Captures prospect student details for admissions desk</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-blue-200 text-lg">✖</button>
            </div>

            <form onSubmit={handleAddInquiry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Child Name *</label>
                  <input
                    type="text"
                    required
                    value={form.childName}
                    onChange={e => setInquiryForm({ ...form, childName: e.target.value })}
                    placeholder="e.g. Aarav Sharma"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Class *</label>
                  <select
                    value={form.targetClass}
                    onChange={e => setInquiryForm({ ...form, targetClass: e.target.value })}
                    className="input"
                  >
                    {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    required
                    value={form.parentName}
                    onChange={e => setInquiryForm({ ...form, parentName: e.target.value })}
                    placeholder="e.g. Vikash Sharma"
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
                    onChange={e => setInquiryForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="e.g. 9876543210"
                    className="input font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Residential Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => setInquiryForm({ ...form, address: e.target.value })}
                  placeholder="e.g. Sector 4, Rohini, New Delhi"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes / Parent Inquiries</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setInquiryForm({ ...form, notes: e.target.value })}
                  placeholder="e.g. Interested in science stream / bus transport facility"
                  className="input resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline text-xs px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary text-xs px-5 py-2">
                  {submitting ? 'Saving...' : 'Record Admission Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmissionLeads;
