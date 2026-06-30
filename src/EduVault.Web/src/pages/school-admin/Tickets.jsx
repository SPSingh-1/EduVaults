import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

const statusColor = {
  OPEN: 'badge-warning',
  'IN PROGRESS': 'badge-info',
  RESOLVED: 'badge-success'
};

const priorityColor = {
  HIGH: 'text-red-600 bg-red-50',
  MEDIUM: 'text-yellow-600 bg-yellow-50',
  LOW: 'text-gray-600 bg-gray-100'
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
        className={className || "text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-primary"}
        style={style || { width: '130px' }}
      />
    </div>
  );
};

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    openTickets: '00',
    avgResponse: '1.5h',
    systemUptime: '99.9%',
    criticalIssues: '00'
  });
  const [systemStatus, setSystemStatus] = useState('Healthy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    details: '',
    contactNumber: '',
    priority: 'MEDIUM'
  });

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/support');
      setTickets(res.data.tickets || []);
      setCategories(res.data.categories || []);
      setStats({
        openTickets: res.data.stats?.openTickets || '00',
        avgResponse: res.data.stats?.avgResponse || '1.5h',
        systemUptime: res.data.stats?.systemUptime || '99.9%',
        criticalIssues: res.data.stats?.criticalIssues || '00'
      });
      setSystemStatus(res.data.systemStatus || 'Healthy');
      setError('');
    } catch (err) {
      console.error('Error fetching tickets data:', err);
      const details = err.response ? `${err.response.status} ${err.response.statusText} - ${JSON.stringify(err.response.data)}` : err.message;
      setError('Failed to load support dashboard details: ' + details);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTicket = async () => {
    if (!newTicket.title) {
      alert('Please enter a ticket title.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/support/tickets', newTicket);
      setNewTicket({ title: '', details: '', contactNumber: '', priority: 'MEDIUM' });
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(t.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(t.createdAt) > to) return false;
    }
    return true;
  });

  const openCount = filteredTickets.filter(t => t.status.toUpperCase() === 'OPEN' || t.status.toUpperCase() === 'IN PROGRESS').length;
  const resolvedCount = filteredTickets.filter(t => t.status.toUpperCase() === 'RESOLVED').length;
  const criticalCount = filteredTickets.filter(t => t.priority.toUpperCase() === 'HIGH' && t.status.toUpperCase() !== 'RESOLVED').length;
  const totalCount = filteredTickets.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-sm text-gray-500">Loading Support & Help Desk...</p>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Support Tickets" subtitle="Dashboard › Support Tickets" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open Tickets', value: String(openCount).padStart(2, '0'), note: 'Active school queue', color: 'text-blue-600' },
          { label: 'Resolved Tickets', value: String(resolvedCount).padStart(2, '0'), note: 'Resolved issues', color: 'text-green-600' },
          { label: 'Critical Issues', value: String(criticalCount).padStart(2, '0'), note: criticalCount === 0 ? 'No critical issues' : 'Requires attention', color: 'text-red-600' },
          { label: 'Total Tickets', value: String(totalCount).padStart(2, '0'), note: 'All tickets', color: 'text-purple-600' }
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400">{s.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="card lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="font-display font-semibold text-primary">Your Support Tickets</h3>
            <div className="flex items-center gap-3 flex-wrap">
              <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-primary" style={{ width: '130px' }} />
              <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:border-primary" style={{ width: '130px' }} />
              <button onClick={() => setShowModal(true)} className="btn-primary text-xs flex items-center gap-1.5">
                + Generate Ticket
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th text-left">Ticket</th>
                  <th className="table-th text-left">Contact Info</th>
                  <th className="table-th text-left">Details</th>
                  <th className="table-th text-left">Status</th>
                  <th className="table-th text-left">Priority</th>
                  <th className="table-th text-left">Created At</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="font-semibold text-primary text-xs">#{t.ticketNumber}</div>
                      <div className="text-xs text-gray-500 font-medium">{t.title}</div>
                    </td>
                    <td className="table-td text-xs text-gray-500 font-mono">{t.contactNumber || '—'}</td>
                    <td className="table-td text-xs text-gray-500 max-w-[200px] truncate" title={t.details}>
                      {t.details || '—'}
                    </td>
                    <td className="table-td">
                      <span className={statusColor[t.status.toUpperCase()] || 'badge-gray'}>
                        {t.status}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${priorityColor[t.priority.toUpperCase()] || 'text-gray-600 bg-gray-100'}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="table-td text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString('en-GB')}
                    </td>
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">
                      No active support tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Knowledge Base */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="font-semibold text-primary text-sm mb-3">Knowledge Base & Guides</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-all"
                >
                  <div className="text-xl mb-1">{c.icon}</div>
                  <div className="text-xs font-semibold text-primary">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.articleCount} Articles</div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="col-span-3 text-center py-3 text-gray-400 text-xs">
                  No guides available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          {/* Help widget */}
          <div className="card">
            <h3 className="font-semibold text-primary text-sm mb-3">Need Instant Support?</h3>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              If you have any data issues or bug requests, please fill out the form by generating a new ticket.
              Our technical support team will evaluate and resolve the issues immediately.
            </p>
            <div className="text-[11px] text-gray-400">
              ⚡ Response SLA: Less than 2 hours.
            </div>
          </div>

          {/* System Status Card */}
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${systemStatus.toLowerCase() === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
              <span className={`text-xs font-semibold ${systemStatus.toLowerCase() === 'healthy' ? 'text-green-700' : 'text-yellow-700'}`}>
                SYSTEM STATUS: {systemStatus}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              System operational status. Platform is currently stable.
            </div>
          </div>
        </div>
      </div>

      {/* Generate Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-4">
              <h3 className="font-display font-bold text-white text-base">Generate Support Ticket</h3>
              <p className="text-blue-200 text-xs">Report data issues or software bugs to Super Admin.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ticket Subject *</label>
                <input
                  value={newTicket.title}
                  onChange={(e) => setNewTicket((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Bulk data import failure"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Number *</label>
                <input
                  value={newTicket.contactNumber}
                  onChange={(e) => setNewTicket((p) => ({ ...p, contactNumber: e.target.value }))}
                  placeholder="e.g. +1 555-0199"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bug details / Data issue description *</label>
                <textarea
                  value={newTicket.details}
                  onChange={(e) => setNewTicket((p) => ({ ...p, details: e.target.value }))}
                  placeholder="Describe what occurred, any specific error messages, and what records were affected."
                  className="input text-xs min-h-[100px] py-2 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priority *</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value }))}
                  className="input text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={submitting}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
