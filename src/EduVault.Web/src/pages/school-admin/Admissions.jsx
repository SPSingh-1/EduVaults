import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { UserPlus, Search, Plus, Phone, MessageSquare, CheckCircle2, AlertCircle, X, Download, Filter } from 'lucide-react';

const statusBadgeClasses = {
  Inquiry: 'badge-warning',
  Pending: 'badge-warning',
  FollowUp: 'badge-info',
  'Under Review': 'badge-info',
  Registered: 'badge-info',
  Approved: 'badge-success',
  Enrolled: 'badge-success',
  Rejected: 'badge-danger',
  Lost: 'badge-danger'
};

const Admissions = () => {
  const [tab, setTab] = useState('All Applications');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    childName: '',
    targetClass: 'Class 1',
    parentName: '',
    phone: '',
    address: '',
    notes: 'Direct application submission for academic enrollment.'
  });

  const [updateStatus, setUpdateStatus] = useState('Enrolled');
  const [updateNotes, setUpdateNotes] = useState('');

  const tabs = ['All Applications', 'Pending Review', 'Registered', 'Enrolled', 'Rejected'];

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/receptionist/inquiries');
      setApplications(res.data || []);
    } catch (err) {
      console.error('Failed to fetch admissions:', err);
      showToast('Could not load admissions inquiries.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleCreateApplication = async (e) => {
    e.preventDefault();
    if (!form.childName || !form.parentName || !form.phone) {
      showToast('Child name, parent name, and contact phone are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/receptionist/inquiries', form);
      showToast('Admission application registered successfully.');
      setShowCreateModal(false);
      setForm({
        childName: '',
        targetClass: 'Class 1',
        parentName: '',
        phone: '',
        address: '',
        notes: ''
      });
      fetchApplications();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit admission application.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;

    setSubmitting(true);
    try {
      await apiClient.put(`/receptionist/inquiries/${selectedApp.id}/status`, {
        status: updateStatus,
        notes: updateNotes || selectedApp.notes
      });
      showToast(`Application status updated to ${updateStatus}.`);
      setShowReviewModal(false);
      fetchApplications();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const sanitizeCsvCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  };

  const exportCSV = () => {
    if (applications.length === 0) {
      showToast('No admission records to export.', 'error');
      return;
    }

    const headers = ['ID,Child Name,Target Class,Parent Name,Phone,Address,Status,Date'];
    const rows = applications.map(a => 
      `"${sanitizeCsvCell(a.id)}","${sanitizeCsvCell(a.childName)}","${sanitizeCsvCell(a.targetClass)}","${sanitizeCsvCell(a.parentName)}","${sanitizeCsvCell(a.phone)}","${sanitizeCsvCell(a.address || '')}","${sanitizeCsvCell(a.status)}","${new Date(a.createdAt).toLocaleDateString()}"`
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `admissions_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Admissions exported to CSV.');
  };

  // KPIs
  const totalApps = applications.length;
  const pendingCount = applications.filter(a => a.status === 'Inquiry' || a.status === 'FollowUp' || a.status === 'Pending').length;
  const enrolledCount = applications.filter(a => a.status === 'Enrolled' || a.status === 'Registered' || a.status === 'Approved').length;
  const rejectedCount = applications.filter(a => a.status === 'Lost' || a.status === 'Rejected').length;

  // Filtered List
  const filtered = applications.filter(a => {
    const matchesSearch = !searchQuery || 
      (a.childName && a.childName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.parentName && a.parentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.phone && a.phone.includes(searchQuery)) ||
      (a.targetClass && a.targetClass.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (tab === 'All Applications') return true;
    if (tab === 'Pending Review') return a.status === 'Inquiry' || a.status === 'FollowUp' || a.status === 'Pending';
    if (tab === 'Registered') return a.status === 'Registered' || a.status === 'Approved';
    if (tab === 'Enrolled') return a.status === 'Enrolled';
    if (tab === 'Rejected') return a.status === 'Lost' || a.status === 'Rejected';
    return true;
  });

  return (
    <div>
      <Topbar
        title="Application Overview"
        subtitle="Admission Management & Student Intake"
        actions={
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Manual Entry
            </button>
          </div>
        }
      />

      {toastMessage && (
        <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          toastType === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {toastType === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          {toastMessage}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Total Inquiries</div>
          <div className="font-display text-2xl font-bold text-blue-600">{totalApps}</div>
          <div className="text-xs text-gray-400">Total admission inquiries</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Pending Reviews</div>
          <div className="font-display text-2xl font-bold text-yellow-600">{pendingCount}</div>
          <div className="text-xs text-gray-400">Inquiry / Follow-up</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Enrolled / Confirmed</div>
          <div className="font-display text-2xl font-bold text-green-600">{enrolledCount}</div>
          <div className="text-xs text-gray-400">Converted students</div>
        </div>

        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Lost / Inactive</div>
          <div className="font-display text-2xl font-bold text-red-600">{rejectedCount}</div>
          <div className="text-xs text-gray-400">Closed inquiries</div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by student name, parent name, phone, or grade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 text-xs"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1 mb-4 border-b border-gray-100 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-all whitespace-nowrap ${
                tab === t
                  ? 'text-primary border-b-2 border-primary font-semibold'
                  : 'text-gray-500 hover:text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Loader /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
            <UserPlus className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h4 className="font-semibold text-gray-700 text-sm">No applications found</h4>
            <p className="text-xs text-gray-400 mb-4">No matching admission records under this category.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-xs"
            >
              + Create Admission Entry
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase font-semibold">
                  <th className="table-th">Candidate & Parent</th>
                  <th className="table-th">Applied Grade</th>
                  <th className="table-th">Contact Info</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">Status</th>
                  <th className="table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {(a.childName || 'S')[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-primary text-sm">{a.childName}</div>
                          <div className="text-xs text-gray-400">Parent: {a.parentName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-sm font-medium text-gray-700">{a.targetClass}</td>
                    <td className="table-td text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{a.phone}</span>
                      </div>
                      {a.address && <div className="text-xs text-gray-400 truncate max-w-xs">{a.address}</div>}
                    </td>
                    <td className="table-td text-xs text-gray-400">
                      {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="table-td">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses[a.status] || 'badge-info'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="table-td text-right">
                      <button
                        onClick={() => {
                          setSelectedApp(a);
                          setUpdateStatus(a.status);
                          setUpdateNotes(a.notes || '');
                          setShowReviewModal(true);
                        }}
                        className="text-xs text-primary font-semibold hover:underline bg-primary/5 px-2.5 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                      >
                        Review / Update ›
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
          <div>Showing {filtered.length} of {applications.length} applications</div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="font-display font-bold text-primary text-lg">New Admission Lead / Application</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Student / Child Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={form.childName}
                  onChange={e => setForm({ ...form, childName: e.target.value })}
                  className="input text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Target Class *</label>
                  <input
                    type="text"
                    placeholder="e.g. Grade 10"
                    value={form.targetClass}
                    onChange={e => setForm({ ...form, targetClass: e.target.value })}
                    className="input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={form.parentName}
                    onChange={e => setForm({ ...form, parentName: e.target.value })}
                    className="input text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 9876543210"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="input text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="City, State"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })}
                  className="input text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  placeholder="Special instructions or notes..."
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input text-xs h-20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Saving...' : 'Register Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedApp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-display font-bold text-primary text-lg">Review Admission Record</h3>
                <p className="text-xs text-gray-500">{selectedApp.childName} — {selectedApp.targetClass}</p>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Update Status</label>
                <select
                  value={updateStatus}
                  onChange={e => setUpdateStatus(e.target.value)}
                  className="input text-xs font-semibold"
                >
                  <option value="Inquiry">Inquiry (Open)</option>
                  <option value="FollowUp">Follow-up Scheduled</option>
                  <option value="Registered">Registered (Documents Submitted)</option>
                  <option value="Enrolled">Enrolled / Confirmed</option>
                  <option value="Lost">Lost / Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Administrative Notes</label>
                <textarea
                  value={updateNotes}
                  onChange={e => setUpdateNotes(e.target.value)}
                  placeholder="Record outcome or remarks..."
                  className="input text-xs h-24"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs py-2 px-5"
                >
                  {submitting ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admissions;
