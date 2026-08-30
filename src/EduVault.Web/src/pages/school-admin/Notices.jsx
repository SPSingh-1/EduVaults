import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
      {label && <span className="text-xs font-semibold whitespace-nowrap">{label}</span>}
      <input
        type={focused ? 'date' : 'text'}
        value={focused ? value : formatDisplay(value)}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="dd/mm/yyyy"
        className={className}
        style={style}
      />
    </div>
  );
};

export default function Notices() {
  const { markAllAsRead } = useNotifications();
  const [noticesList, setNoticesList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [target, setTarget] = useState('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('GENERAL');
  const [loading, setLoading] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState('');

  const filteredNotices = noticesList.filter(n => {
    if (activeFilterTab === 'school' && n.senderRole === 'superadmin') return false;
    if (activeFilterTab === 'system' && n.senderRole !== 'superadmin') return false;
    if (targetFilter && n.targetGroup && n.targetGroup !== targetFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const titleMatch = (n.title || '').toLowerCase().includes(q);
      const bodyMatch = (n.body || n.message || '').toLowerCase().includes(q);
      if (!titleMatch && !bodyMatch) return false;
    }
    
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (new Date(n.createdAt) < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(n.createdAt) > to) return false;
    }
    return true;
  });

  const fetchNotices = async () => {
    try {
      const res = await expressClient.get('/notifications');
      setNoticesList(res.data);
    } catch (err) {
      console.error('Error fetching notices:', err);
    }
  };

  useEffect(() => {
    fetchNotices();

    const token = localStorage.getItem('eduvault_token');
    if (token) {
      const expressUrl = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:5005/api';
      const socketUrl = expressUrl.replace(/\/api$/, '');
      const socket = io(socketUrl, {
        auth: { token }
      });
      socket.on('notification', (notif) => {
        setNoticesList(prev => [notif, ...prev]);
      });
      return () => {
        socket.disconnect();
      };
    }
  }, []);

  useEffect(() => {
    if (noticesList.length > 0) {
      markAllAsRead();
    }
  }, [noticesList]);

  // Holiday Modal State
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayTitle, setHolidayTitle] = useState('');
  const [holidayDate, setHolidayDate] = useState(getTodayStr());
  const [holidayEndDate, setHolidayEndDate] = useState(getTodayStr());
  const [holidayCategory, setHolidayCategory] = useState('FESTIVAL');
  const [holidayDescription, setHolidayDescription] = useState('');
  const [notifyHoliday, setNotifyHoliday] = useState(true);
  const [savingHoliday, setSavingHoliday] = useState(false);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setLoading(true);
    try {
      await expressClient.post('/notifications', {
        recipientId: target,
        title,
        body,
        type
      });
      if (sendWhatsApp) {
        await apiClient.post('/academics/whatsapp/send-broadcast', {
          title,
          body
        });
      }
      setShowNew(false);
      setTitle('');
      setBody('');
      setSendWhatsApp(false);
      fetchNotices();
    } catch (err) {
      console.error('Error publishing notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateHoliday = async (e) => {
    e.preventDefault();
    if (!holidayTitle || !holidayDate) return;
    setSavingHoliday(true);
    try {
      await expressClient.post('/holidays', {
        title: holidayTitle,
        date: holidayDate,
        endDate: holidayEndDate || holidayDate,
        category: holidayCategory,
        description: holidayDescription,
        notifyUsers: notifyHoliday
      });
      alert(`🎉 Holiday "${holidayTitle}" declared successfully! Real-time notification broadcasted to all students.`);
      setShowHolidayModal(false);
      setHolidayTitle('');
      setHolidayDescription('');
      fetchNotices();
    } catch (err) {
      alert('Failed to declare holiday: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingHoliday(false);
    }
  };

  return (
    <div>
      <Topbar title="Notices & Announcements" actions={
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHolidayModal(true)} className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50">
            🎉 Declare School Holiday
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary text-xs py-2 px-4">+ New Notice</button>
        </div>
      } />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          {/* Filtering Tabs */}
          <div className="flex border-b border-gray-100 mb-4 gap-4">
            {[
              { id: 'all', label: 'All Announcements', icon: '📢' },
              { id: 'school', label: 'School Notices', icon: '🏫' },
              { id: 'system', label: 'System Alerts', icon: '🛡️' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id)}
                className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${activeFilterTab === tab.id
                    ? 'border-primary text-primary font-black'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap bg-gray-50 p-2 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search notice..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input text-xs py-1 px-2.5 bg-white border border-gray-200 focus:border-primary rounded-xl"
                style={{ width: '150px' }}
              />
              <select
                value={targetFilter}
                onChange={e => setTargetFilter(e.target.value)}
                className="input text-xs py-1 px-2 bg-white border border-gray-200 focus:border-primary rounded-xl"
              >
                <option value="">All Audiences</option>
                <option value="ALL">All Users</option>
                <option value="TEACHERS">Teachers</option>
                <option value="STUDENTS">Students</option>
              </select>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1 px-2 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary" style={{ width: '130px' }} />
              <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1 px-2 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary" style={{ width: '130px' }} />
              {(dateFrom || dateTo || search || targetFilter) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setTargetFilter(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear</button>
              )}
            </div>
          </div>

          {filteredNotices.map((n, i) => (
            <div key={n._id || i} className={`card ${n.type === 'URGENT' ? 'border-l-4 border-red-500 shadow-md' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={n.type === 'URGENT' ? 'badge-danger' : n.type === 'EVENT' ? 'badge-info' : 'badge-gray'}>{n.type}</span>
                  <span className="badge badge-info">Audience: {n.recipientId === 'SCHOOLADMINS' ? 'Admins' : n.recipientId}</span>
                  <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                {n.senderRole === 'superadmin' ? (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded border border-red-200/50">🛡️ Platform Admin</span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">👤 {n.senderName || 'School System'} ({n.senderRole === 'schooladmin' ? 'Admin' : n.senderRole === 'teacher' ? 'Teacher' : n.senderRole})</span>
                )}
              </div>
              <h3 className="font-display font-bold text-primary mb-1">{n.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{n.body}</p>
            </div>
          ))}
          {filteredNotices.length === 0 && (
            <div className="card text-center py-6 text-gray-400 text-sm">No notices posted.</div>
          )}
        </div>

        <div className="card">
          <h3 className="font-display font-semibold text-primary mb-4">⊕ Quick Broadcast</h3>
          <form onSubmit={handlePostNotice} className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">TARGET AUDIENCE</div>
              <select value={target} onChange={e => setTarget(e.target.value)} className="input text-xs">
                <option value="ALL">All Users (ALL)</option>
                <option value="TEACHERS">Teachers Only</option>
                <option value="STUDENTS">Students Only</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Category</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input text-xs">
                <option value="GENERAL">General Notice</option>
                <option value="URGENT">Urgent Announcement</option>
                <option value="EVENT">School Event</option>
              </select>
            </div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Title</label><input required placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} className="input" /></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Message Body</label><textarea required placeholder="Type announcement here..." value={body} onChange={e => setBody(e.target.value)} className="input h-28 resize-none" /></div>
            <div className="flex items-center gap-2 py-1">
              <input type="checkbox" id="whatsAppModalAdminSidebar" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer" />
              <label htmlFor="whatsAppModalAdminSidebar" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">Send WhatsApp to Parents</label>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all">
              {loading ? 'Publishing...' : 'Send Now'}
            </button>
          </form>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handlePostNotice} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-primary text-xl">Create New Notice</h3>
                <button type="button" onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 text-lg">✖</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Audience</label>
                  <select value={target} onChange={e => setTarget(e.target.value)} className="input">
                    <option value="ALL">All Users (ALL)</option>
                    <option value="TEACHERS">Teachers Only</option>
                    <option value="STUDENTS">Students Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Category</label>
                  <select value={type} onChange={e => setType(e.target.value)} className="input">
                    <option value="GENERAL">General Notice</option>
                    <option value="URGENT">Urgent Announcement</option>
                    <option value="EVENT">School Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Title</label>
                  <input required placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message Body</label>
                  <textarea required placeholder="Type announcement here..." value={body} onChange={e => setBody(e.target.value)} className="input h-28 resize-none" />
                </div>
                <div className="flex items-center gap-2 py-1">
                  <input type="checkbox" id="whatsAppModalAdmin" checked={sendWhatsApp} onChange={e => setSendWhatsApp(e.target.checked)} className="rounded text-primary focus:ring-primary h-4 w-4 cursor-pointer" />
                  <label htmlFor="whatsAppModalAdmin" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">Send WhatsApp to Parents</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setShowNew(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Declare School Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateHoliday} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-purple-100">
            <div className="bg-gradient-to-r from-purple-900 via-primary to-purple-900 text-white p-6">
              <div className="flex justify-between items-center">
                <h3 className="font-display font-bold text-xl flex items-center gap-2">
                  🎉 Declare School Holiday
                </h3>
                <button type="button" onClick={() => setShowHolidayModal(false)} className="text-white/80 hover:text-white text-lg">✖</button>
              </div>
              <p className="text-xs text-purple-200 mt-1">
                Announce an official holiday or vacation break. It will be posted to the student holiday calendar and broadcasted in real-time.
              </p>
            </div>

            <div className="p-6 text-left space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Holiday Title *</label>
                <input
                  required
                  placeholder="e.g. Diwali Vacation / Republic Day"
                  value={holidayTitle}
                  onChange={e => setHolidayTitle(e.target.value)}
                  className="input text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={holidayDate}
                    onChange={e => {
                      setHolidayDate(e.target.value);
                      if (!holidayEndDate || holidayEndDate < e.target.value) {
                        setHolidayEndDate(e.target.value);
                      }
                    }}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={holidayEndDate}
                    onChange={e => setHolidayEndDate(e.target.value)}
                    className="input text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                <select
                  value={holidayCategory}
                  onChange={e => setHolidayCategory(e.target.value)}
                  className="input text-xs font-semibold"
                >
                  <option value="FESTIVAL">🎉 Festival Holiday</option>
                  <option value="NATIONAL">🇮🇳 National Holiday</option>
                  <option value="ACADEMIC">📚 Academic Break / Vacation</option>
                  <option value="RESTRICTED">✝️ Restricted Holiday</option>
                  <option value="EMERGENCY">🚨 Emergency Leave</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Reason</label>
                <textarea
                  placeholder="Enter holiday details, school re-opening notes, homework guidelines..."
                  value={holidayDescription}
                  onChange={e => setHolidayDescription(e.target.value)}
                  className="input text-xs h-20 resize-none"
                />
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200/60 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notifyHolidayBroadcast"
                  checked={notifyHoliday}
                  onChange={e => setNotifyHoliday(e.target.checked)}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="notifyHolidayBroadcast" className="text-xs font-bold text-purple-900 cursor-pointer select-none">
                  📢 Send instant real-time notification broadcast to all students & staff
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 pb-6 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setShowHolidayModal(false)} className="btn-outline text-xs">Cancel</button>
              <button type="submit" disabled={savingHoliday} className="btn-primary text-xs py-2.5 px-6 font-bold bg-purple-700 hover:bg-purple-800">
                {savingHoliday ? 'Publishing...' : '📢 Declare & Broadcast Holiday'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
