import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';
import DateFilterInput from '../../components/common/DateFilterInput';
import { getTodayStr } from '../../utils/dateUtils';

export default function Notices() {
  const { toast } = useToast();
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

  // Manage Holidays Directory State
  const [showManageHolidaysModal, setShowManageHolidaysModal] = useState(false);
  const [holidayDirectory, setHolidayDirectory] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [holidayFilterCategory, setHolidayFilterCategory] = useState('ALL');
  const [holidaySearchQuery, setHolidaySearchQuery] = useState('');

  const fetchHolidayDirectory = async () => {
    setLoadingDirectory(true);
    try {
      const res = await expressClient.get('/holidays');
      setHolidayDirectory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Failed to load holidays:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  const handleOpenManageHolidays = () => {
    setShowManageHolidaysModal(true);
    fetchHolidayDirectory();
  };

  const handleDeleteHoliday = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove the holiday "${title}"?`)) return;
    try {
      await expressClient.delete(`/holidays/${id}`);
      setHolidayDirectory(prev => prev.filter(h => h._id !== id));
      toast.success(`Holiday "${title}" removed successfully.`);
    } catch (err) {
      toast.error('Failed to delete holiday: ' + (err.response?.data?.error || err.message));
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
      toast.success(`🎉 Holiday "${holidayTitle}" declared successfully! Real-time notification broadcasted to all students.`);
      setShowHolidayModal(false);
      setHolidayTitle('');
      setHolidayDescription('');
      fetchNotices();
      fetchHolidayDirectory();
    } catch (err) {
      toast.error('Failed to declare holiday: ' + (err.response?.data?.error || err.message));
    } finally {
      setSavingHoliday(false);
    }
  };


  return (
    <div>
      <Topbar title="Notices & Announcements" actions={
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={handleOpenManageHolidays} className="btn-outline text-xs border-amber-300 text-amber-800 hover:bg-amber-50 font-bold">
            📅 <span className="hidden sm:inline">School Holidays Directory</span><span className="sm:hidden">Holidays</span>
          </button>
          <button onClick={() => setShowHolidayModal(true)} className="btn-outline text-xs border-purple-300 text-purple-700 hover:bg-purple-50">
            🎉 <span className="hidden sm:inline">Declare School Holiday</span><span className="sm:hidden">Holiday</span>
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary text-xs">+ <span className="hidden sm:inline">New </span>Notice</button>
        </div>
      } />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          {/* Filtering Tabs */}
          <div className="overflow-x-auto scrollbar-none -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex border-b border-gray-100 mb-4 gap-2 sm:gap-4 min-w-max sm:min-w-0">
            {[
              { id: 'all', label: 'All Announcements', icon: '📢' },
              { id: 'school', label: 'School Notices', icon: '🏫' },
              { id: 'system', label: 'System Alerts', icon: '🛡️' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id)}
                className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${activeFilterTab === tab.id
                    ? 'border-primary text-primary font-black'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 flex-wrap bg-gray-50 p-2 border border-gray-100 rounded-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search notice..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input text-xs py-1 px-2.5 bg-white border border-gray-200 focus:border-primary rounded-xl w-full sm:w-[150px]"
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
              <DateFilterInput label="From:" value={dateFrom} onChange={setDateFrom} className="input text-xs py-1 px-2 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary w-28 sm:w-[130px]" />
              <DateFilterInput label="To:" value={dateTo} onChange={setDateTo} className="input text-xs py-1 px-2 bg-white border border-gray-200 focus:border-primary rounded-xl text-primary w-28 sm:w-[130px]" />
              {(dateFrom || dateTo || search || targetFilter) && (
                <button onClick={() => { setDateFrom(''); setDateTo(''); setSearch(''); setTargetFilter(''); }} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear</button>
              )}
            </div>
          </div>

          {filteredNotices.map((n, i) => (
            <div key={n._id || i} className={`card ${n.type === 'URGENT' ? 'border-l-4 border-red-500 shadow-md' : ''}`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-2 gap-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={n.type === 'URGENT' ? 'badge-danger' : n.type === 'EVENT' ? 'badge-info' : 'badge-gray'}>{n.type}</span>
                  <span className="badge badge-info">Audience: {n.recipientId === 'SCHOOLADMINS' ? 'Admins' : n.recipientId}</span>
                  <span className="text-[10px] text-gray-400 font-medium">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                {n.senderRole === 'superadmin' ? (
                  <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded border border-red-200/50 self-start shrink-0">🛡️ Platform Admin</span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded self-start shrink-0">👤 {n.senderName || 'School System'} ({n.senderRole === 'schooladmin' ? 'Admin' : n.senderRole === 'teacher' ? 'Teacher' : n.senderRole})</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

      {/* Manage Holidays Directory Modal */}
      {showManageHolidaysModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-xl font-bold">
                  📅
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">School Holidays Directory</h3>
                  <p className="text-xs text-slate-300">View, search, and manage statutory and declared school holidays</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowManageHolidaysModal(false);
                    setShowHolidayModal(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow transition-all"
                >
                  + Declare Holiday
                </button>
                <button
                  type="button"
                  onClick={() => setShowManageHolidaysModal(false)}
                  className="text-slate-400 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  placeholder="Search holiday name or detail..."
                  value={holidaySearchQuery}
                  onChange={e => setHolidaySearchQuery(e.target.value)}
                  className="input text-xs w-64 bg-white"
                />
                <select
                  value={holidayFilterCategory}
                  onChange={e => setHolidayFilterCategory(e.target.value)}
                  className="input text-xs w-40 bg-white font-semibold"
                >
                  <option value="ALL">All Categories</option>
                  <option value="NATIONAL">🇮🇳 National</option>
                  <option value="FESTIVAL">🎉 Festival</option>
                  <option value="ACADEMIC">📚 Academic</option>
                  <option value="RESTRICTED">✝️ Restricted</option>
                  <option value="EMERGENCY">🚨 Emergency</option>
                </select>
              </div>
              <div className="text-xs font-bold text-slate-600">
                Total: <span className="text-primary font-black">{holidayDirectory.length}</span> Holidays
              </div>
            </div>

            {/* Modal Body: Holidays Table */}
            <div className="p-4 overflow-y-auto flex-1 max-h-[55vh]">
              {loadingDirectory ? (
                <div className="py-12 text-center text-slate-400 text-xs font-semibold animate-pulse">
                  Loading school holidays directory...
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3">Date / Duration</th>
                      <th className="py-2.5 px-3">Title</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {holidayDirectory
                      .filter(h => {
                        const matchCat = holidayFilterCategory === 'ALL' || h.category === holidayFilterCategory;
                        const matchQuery = !holidaySearchQuery ||
                          h.title?.toLowerCase().includes(holidaySearchQuery.toLowerCase()) ||
                          h.description?.toLowerCase().includes(holidaySearchQuery.toLowerCase());
                        return matchCat && matchQuery;
                      })
                      .map(h => (
                        <tr key={h._id || h.date} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {formatDateDDMMYYYY(h.date)}{h.endDate && h.endDate !== h.date ? ` → ${formatDateDDMMYYYY(h.endDate)}` : ''}
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-900">{h.title}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                              {h.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 max-w-xs truncate" title={h.description}>
                            {h.description || 'Official school holiday'}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDeleteHoliday(h._id, h.title)}
                              className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    {holidayDirectory.length === 0 && (
                      <tr>
                        <td colSpan="5" className="text-center py-10 text-slate-400 text-xs italic">
                          No holidays recorded yet. Click "+ Declare Holiday" to announce a holiday.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowManageHolidaysModal(false)}
                className="btn-outline text-xs px-5 py-2 font-bold"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

