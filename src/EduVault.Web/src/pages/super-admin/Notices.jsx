import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';

const SuperAdminNotices = () => {
  const { markAllAsRead } = useNotifications();
  const [noticesList, setNoticesList] = useState([]);
  const [schools, setSchools] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [targetAudience, setTargetAudience] = useState('SCHOOLADMINS');
  const [targetSchoolId, setTargetSchoolId] = useState('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('GENERAL');
  const [loading, setLoading] = useState(false);

  const fetchNoticesAndSchools = async () => {
    try {
      // 1. Fetch Super Admin broadcast history
      const noticesRes = await expressClient.get('/notifications');
      setNoticesList(noticesRes.data);

      // 2. Fetch list of schools to populate the dropdown
      const schoolsRes = await apiClient.get('/super/schools');
      setSchools(schoolsRes.data || []);
    } catch (err) {
      console.error('Error fetching notices/schools:', err);
    }
  };

  useEffect(() => {
    fetchNoticesAndSchools();

    const token = localStorage.getItem('eduvault_token');
    if (token) {
      const expressUrl = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:5005/api';
      const socketUrl = expressUrl.replace(/\/api$/, '');
      const socket = io(socketUrl, {
        auth: { token }
      });
      socket.on('notification', (notif) => {
        // Refresh feed if notification is from super admin
        if (notif.senderRole === 'superadmin') {
          setNoticesList(prev => [notif, ...prev]);
        }
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

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title || !body) return;
    setLoading(true);
    try {
      await expressClient.post('/notifications', {
        recipientId: targetAudience,
        title,
        body,
        type,
        targetSchoolId: targetSchoolId // 'ALL' or specific school ID
      });
      setShowNew(false);
      setTitle('');
      setBody('');
      fetchNoticesAndSchools();
    } catch (err) {
      console.error('Error publishing super admin notice:', err);
      alert('Failed to publish notice.');
    } finally {
      setLoading(false);
    }
  };

  const getSchoolName = (schoolId) => {
    if (schoolId === 'ALL') return 'All Schools (Global)';
    const school = schools.find(s => s.id === schoolId);
    return school ? school.name : `School (${schoolId})`;
  };

  const getAudienceName = (recipientId) => {
    if (recipientId === 'SCHOOLADMINS') return 'School Administrators';
    if (recipientId === 'ALL') return 'All Users';
    if (recipientId === 'TEACHERS') return 'Teachers';
    if (recipientId === 'STUDENTS') return 'Students';
    return recipientId;
  };

  return (
    <div>
      <Topbar title="Platform Notices & Broadcasts" subtitle="Super Admin › Global Announcements" actions={
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Notice</button>
      } />

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="card">
            <h3 className="font-display font-semibold text-primary mb-4">📢 Announcement History</h3>
            <div className="space-y-4">
              {noticesList.map((n, i) => (
                <div key={n._id || i} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={n.type === 'URGENT' ? 'badge-danger' : n.type === 'EVENT' ? 'badge-info' : 'badge-gray'}>{n.type}</span>
                      <span className="badge badge-info bg-indigo-100 text-indigo-700">School: {getSchoolName(n.schoolId)}</span>
                      <span className="badge badge-success bg-emerald-100 text-emerald-700">Audience: {getAudienceName(n.recipientId)}</span>
                      <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-primary text-sm mb-1">{n.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed">{n.body}</p>
                </div>
              ))}
              {noticesList.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">No notices broadcasted yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="card h-fit">
          <h3 className="font-display font-semibold text-primary mb-4">⊕ Quick Broadcast</h3>
          <form onSubmit={handlePostNotice} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target School</label>
              <select value={targetSchoolId} onChange={e => setTargetSchoolId(e.target.value)} className="input text-xs">
                <option value="ALL">All Schools (Broadcast)</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Audience</label>
              <div className="input text-xs bg-gray-50 text-gray-500 flex items-center h-10 select-none cursor-not-allowed">
                School Administrators
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Category</label>
              <select value={type} onChange={e => setType(e.target.value)} className="input text-xs">
                <option value="GENERAL">General Notice</option>
                <option value="URGENT">Urgent Announcement</option>
                <option value="EVENT">School Event</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Title</label>
              <input required placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} className="input text-xs" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Message Body</label>
              <textarea required placeholder="Type announcement here..." value={body} onChange={e => setBody(e.target.value)} className="input h-28 resize-none text-xs" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all text-xs">
              {loading ? 'Publishing...' : 'Broadcast Now'}
            </button>
          </form>
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handlePostNotice} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-primary text-xl">New Global Broadcast</h3>
                <button type="button" onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600 text-lg">✖</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target School</label>
                  <select value={targetSchoolId} onChange={e => setTargetSchoolId(e.target.value)} className="input">
                    <option value="ALL">All Schools (Broadcast)</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Target Audience</label>
                  <div className="input bg-gray-50 text-gray-500 flex items-center h-10 select-none cursor-not-allowed">
                    School Administrators
                  </div>
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
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setShowNew(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Broadcasting...' : 'Broadcast Notice'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SuperAdminNotices;
