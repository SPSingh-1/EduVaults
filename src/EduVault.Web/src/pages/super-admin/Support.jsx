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

const Support = () => {
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [events, setEvents] = useState([]);
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
    schoolName: '',
    priority: 'MEDIUM'
  });

  // Password reset utility state
  const [resetEmail, setResetEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const res = await apiClient.get('/support');
      setTickets(res.data.tickets || []);
      setCategories(res.data.categories || []);
      setEvents(res.data.events || []);
      setStats({
        openTickets: res.data.stats?.openTickets || '00',
        avgResponse: res.data.stats?.avgResponse || '1.5h',
        systemUptime: res.data.stats?.systemUptime || '99.9%',
        criticalIssues: res.data.stats?.criticalIssues || '00'
      });
      setSystemStatus(res.data.systemStatus || 'Healthy');
      setError('');
    } catch (err) {
      console.error('Error fetching support data:', err);
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
    if (!newTicket.title || !newTicket.schoolName) {
      alert('Please enter a ticket title and school name.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/support/tickets', newTicket);
      setNewTicket({ title: '', schoolName: '', priority: 'MEDIUM' });
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Error creating ticket:', err);
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      setResetError('Please enter a valid school admin email.');
      setResetSuccess(false);
      return;
    }
    setResetLoading(true);
    setResetError('');
    setTempPassword('');
    try {
      const res = await apiClient.post('/support/reset-password', { email: resetEmail });
      setTempPassword(res.data.tempPassword);
      setResetSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      setResetError(err.response?.data?.error || 'User not found or password reset failed.');
      setResetSuccess(false);
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(tempPassword);
    alert('Copied temporary password to clipboard!');
  };

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
      <Topbar title="Support & Help Desk" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open Tickets', value: stats.openTickets, note: '-5%', color: 'text-blue-600' },
          { label: 'Avg. Response', value: stats.avgResponse, note: '-10%', color: 'text-green-600' },
          { label: 'System Uptime', value: stats.systemUptime, note: 'Stable', color: 'text-purple-600' },
          { label: 'Critical Issues', value: stats.criticalIssues, note: 'Low Risk', color: 'text-red-600' }
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-primary">Active Support Tickets</h3>
            <button onClick={() => setShowModal(true)} className="btn-primary text-xs">
              + New Ticket
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Ticket</th>
                  <th className="table-th">Submitter/School</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Priority</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="font-semibold text-primary text-xs">#{t.ticketNumber}</div>
                      <div className="text-xs text-gray-500">{t.title}</div>
                    </td>
                    <td className="table-td text-xs text-gray-500">{t.schoolName}</td>
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
                  </tr>
                ))}
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-400 text-sm">
                      No active support tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Knowledge Base */}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="font-semibold text-primary text-sm mb-3">Knowledge Base Management</h4>
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
                  No knowledge base categories seeded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-4">
          {/* Quick Utility - Reset Password */}
          <div className="card">
            <h3 className="font-semibold text-primary text-sm mb-3">Quick Utility — Reset Password</h3>
            
            {resetError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-[11px] p-2 rounded-lg mb-2">
                {resetError}
              </div>
            )}
            
            {resetSuccess && tempPassword && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-xs p-3 rounded-lg mb-3">
                <div className="font-semibold mb-1">Generated Temp Password:</div>
                <div className="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-green-100 font-mono text-[13px] font-bold">
                  <span>{tempPassword}</span>
                  <button 
                    onClick={copyToClipboard} 
                    className="text-[10px] bg-green-600 text-white font-sans px-1.5 py-0.5 rounded hover:bg-green-700 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <input
              type="email"
              placeholder="admin@school.edu"
              className="input text-xs mb-2"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <button
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="w-full bg-primary text-white py-2 rounded-lg text-xs font-semibold hover:bg-primary-light transition-all disabled:opacity-50"
            >
              {resetLoading ? 'GENERATING...' : 'GENERATE TEMP PASSWORD'}
            </button>
          </div>

          {/* Recent System Events */}
          <div className="card">
            <h3 className="font-semibold text-primary text-sm mb-3">Recent System Events</h3>
            <div className="space-y-3">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-2">
                  <span className="text-sm">{e.icon}</span>
                  <div>
                    <div className="text-xs font-medium text-primary">{e.title}</div>
                    <div className="text-[11px] text-gray-400">{e.description}</div>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center py-2 text-gray-400 text-xs">No recent events.</div>
              )}
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
              System uptime: {stats.systemUptime} — All services operational
            </div>
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-primary px-6 py-4">
              <h3 className="font-display font-bold text-white text-base">Submit Support Ticket</h3>
              <p className="text-blue-200 text-xs">Add a new internal ticket to the tracking queue.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">School / Submitter *</label>
                <input
                  value={newTicket.schoolName}
                  onChange={(e) => setNewTicket((p) => ({ ...p, schoolName: e.target.value }))}
                  placeholder="e.g. Lincoln High School"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ticket Description *</label>
                <input
                  value={newTicket.title}
                  onChange={(e) => setNewTicket((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. SSO Login failure for faculty staff"
                  className="input text-xs"
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

export default Support;
