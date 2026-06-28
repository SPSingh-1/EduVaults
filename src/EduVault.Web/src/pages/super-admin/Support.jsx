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

  // School filter state
  const [selectedSchool, setSelectedSchool] = useState('');
  const [schoolsList, setSchoolsList] = useState([]);

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
      setSchoolsList(res.data.schools || []);
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

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      await apiClient.patch(`/support/tickets/${ticketId}/status`, { status: newStatus });
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update ticket status.');
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

  const uniqueSchools = [...new Set(tickets.map((t) => t.schoolName).filter(Boolean))].sort();

  const filteredTickets = selectedSchool
    ? tickets.filter((t) => t.schoolName === selectedSchool)
    : tickets;

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
      <Topbar title="Support & Help Desk" />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open Tickets', value: String(openCount).padStart(2, '0'), note: 'Active queue', color: 'text-blue-600' },
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
            <h3 className="font-display font-semibold text-primary">Active Support Tickets</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Filter by School:</span>
              <select
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none text-primary font-medium focus:border-primary min-w-[160px]"
              >
                <option value="">All Schools</option>
                {uniqueSchools.map((school) => (
                  <option key={school} value={school}>
                    {school}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th text-left">Ticket</th>
                  <th className="table-th text-left">School</th>
                  <th className="table-th text-left">Contact Info</th>
                  <th className="table-th text-left">Details</th>
                  <th className="table-th text-left">Status</th>
                  <th className="table-th text-left">Priority</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="table-td">
                      <div className="font-semibold text-primary text-xs">#{t.ticketNumber}</div>
                      <div className="text-xs text-gray-500 font-medium">{t.title}</div>
                    </td>
                    <td className="table-td text-xs text-gray-600 font-semibold">{t.schoolName}</td>
                    <td className="table-td text-xs text-gray-500 font-mono">{t.contactNumber || '—'}</td>
                    <td className="table-td text-xs text-gray-500 max-w-[200px] truncate" title={t.details}>
                      {t.details || '—'}
                    </td>
                    <td className="table-td">
                      <select
                        value={t.status.toUpperCase()}
                        onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                        className={`text-xs font-semibold rounded-lg px-2 py-1 border outline-none cursor-pointer ${
                          t.status.toUpperCase() === 'OPEN' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          t.status.toUpperCase() === 'IN PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN PROGRESS">IN PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                      </select>
                    </td>
                    <td className="table-td">
                      <span className={`badge ${priorityColor[t.priority.toUpperCase()] || 'text-gray-600 bg-gray-100'}`}>
                        {t.priority}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
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
    </div>
  );
};

export default Support;
