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
  const [activeTab, setActiveTab] = useState('board'); // 'board', 'pending', 'inquiries'
  const [inquiries, setInquiries] = useState([]);
  const [activatingSchool, setActivatingSchool] = useState(null);
  const [actEmail, setActEmail] = useState('');
  const [actPassword, setActPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchNoticesAndSchools = async () => {
    try {
      // 1. Fetch Super Admin broadcast history
      const noticesRes = await expressClient.get('/notifications');
      setNoticesList(noticesRes.data);

      // 2. Fetch list of schools to populate the dropdown
      const schoolsRes = await apiClient.get('/super/schools');
      setSchools(schoolsRes.data || []);

      // 3. Fetch public inquiries
      const inquiriesRes = await apiClient.get('/super/inquiries');
      setInquiries(inquiriesRes.data || []);
    } catch (err) {
      console.error('Error fetching notices/schools/inquiries:', err);
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

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button 
          onClick={() => setActiveTab('board')} 
          className={`pb-3 font-semibold text-xs transition-all border-b-2 px-1 ${
            activeTab === 'board' 
              ? 'border-primary text-primary font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          📢 Announcement Board
        </button>
        <button 
          onClick={() => setActiveTab('pending')} 
          className={`pb-3 font-semibold text-xs transition-all border-b-2 px-1 flex items-center gap-1.5 ${
            activeTab === 'pending' 
              ? 'border-primary text-primary font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          💳 Pending Credentials
          {schools.filter(s => s.status === 'Pending').length > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {schools.filter(s => s.status === 'Pending').length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('inquiries')} 
          className={`pb-3 font-semibold text-xs transition-all border-b-2 px-1 flex items-center gap-1.5 ${
            activeTab === 'inquiries' 
              ? 'border-primary text-primary font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          ✉️ Inquiries & Demo Requests
          {inquiries.filter(i => i.status === 'OPEN').length > 0 && (
            <span className="bg-blue-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {inquiries.filter(i => i.status === 'OPEN').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
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
                <label htmlFor="quick-target-school" className="block text-xs font-semibold text-gray-600 mb-1.5">Target School</label>
                <select id="quick-target-school" value={targetSchoolId} onChange={e => setTargetSchoolId(e.target.value)} className="input text-xs">
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
                <label htmlFor="quick-notice-category" className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Category</label>
                <select id="quick-notice-category" value={type} onChange={e => setType(e.target.value)} className="input text-xs">
                  <option value="GENERAL">General Notice</option>
                  <option value="URGENT">Urgent Announcement</option>
                  <option value="EVENT">School Event</option>
                </select>
              </div>
              <div>
                <label htmlFor="quick-notice-title" className="block text-xs font-semibold text-gray-600 mb-1.5">Notice Title</label>
                <input required id="quick-notice-title" placeholder="Enter title..." value={title} onChange={e => setTitle(e.target.value)} className="input text-xs" />
              </div>
              <div>
                <label htmlFor="quick-notice-body" className="block text-xs font-semibold text-gray-600 mb-1.5">Message Body</label>
                <textarea required id="quick-notice-body" placeholder="Type announcement here..." value={body} onChange={e => setBody(e.target.value)} className="input h-28 resize-none text-xs" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all text-xs">
                {loading ? 'Publishing...' : 'Broadcast Now'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="card text-left">
          <h3 className="font-display font-semibold text-primary mb-4">💳 Schools Awaiting Login Credentials</h3>
          <p className="text-xs text-gray-400 mb-6 font-sans">These schools have completed payment and are waiting for their admin credentials to be generated.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-bold">
                  <th className="py-2.5 px-3">School Name</th>
                  <th className="py-2.5 px-3">Admin Person</th>
                  <th className="py-2.5 px-3">Contact Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {schools.filter(s => s.status === 'Pending').map(s => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 text-gray-700">
                    <td className="py-3 px-3 font-semibold text-primary">{s.name}</td>
                    <td className="py-3 px-3">{s.adminName || 'Pending'}</td>
                    <td className="py-3 px-3 font-medium">{s.adminEmail || 'Pending'}</td>
                    <td className="py-3 px-3">{s.adminPhone || 'Pending'}</td>
                    <td className="py-3 px-3">
                      <button 
                        onClick={() => {
                          setActEmail(s.adminEmail || '');
                          setActPassword('');
                          setActivatingSchool(s);
                        }} 
                        className="btn bg-primary hover:bg-primary-light text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                      >
                        Generate Credentials & Activate
                      </button>
                    </td>
                  </tr>
                ))}
                {schools.filter(s => s.status === 'Pending').length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-gray-400 text-sm">No schools awaiting credentials.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inquiries' && (
        <div className="card text-left">
          <h3 className="font-display font-semibold text-primary mb-4">✉️ Public Inquiries & Demo Requests</h3>
          <p className="text-xs text-gray-400 mb-6 font-sans">List of contact form messages and live demo requests submitted on the landing page.</p>
          <div className="space-y-4">
            {inquiries.map(inq => (
              <div key={inq.id} className={`p-4 rounded-xl border transition-all text-left ${inq.status === 'RESOLVED' ? 'bg-gray-50/50 border-gray-100 opacity-60' : 'bg-blue-50/10 border-blue-100/45'}`}>
                <div className="flex items-center justify-between gap-3 mb-2 font-sans">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full ${inq.title === 'Demo Request' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {inq.title}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[9px] font-bold rounded-full ${inq.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {inq.status}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">{inq.ticketNumber}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(inq.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-3 bg-white p-3 rounded-lg border border-gray-100 font-sans">
                  <div className="md:col-span-1">
                    <div className="text-gray-400 font-semibold mb-0.5 uppercase tracking-wider text-[9px]">Sender Info</div>
                    <div className="font-bold text-gray-700">{inq.details.split('\n')[0].replace('Name: ', '')}</div>
                    <div className="text-gray-500 font-medium">{inq.details.split('\n')[1].replace('Email: ', '')}</div>
                    {inq.contactNumber && <div className="text-gray-500 font-medium">Phone: {inq.contactNumber}</div>}
                  </div>
                  <div className="md:col-span-2 max-w-lg w-full">
                    <div className="text-gray-400 font-semibold mb-0.5 uppercase tracking-wider text-[9px]">Message Details</div>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed break-words">
                      {inq.details.includes('Message: ') ? inq.details.substring(inq.details.indexOf('Message: ') + 9) : inq.details}
                    </p>
                  </div>
                </div>
                {inq.status !== 'RESOLVED' && (
                  <div className="flex justify-end mt-3 font-sans">
                    <button 
                      onClick={async () => {
                        try {
                          await apiClient.post(`/super/inquiries/${inq.id}/resolve`);
                          alert('Inquiry marked as resolved.');
                          fetchNoticesAndSchools();
                        } catch (err) {
                          console.error('Error resolving inquiry:', err);
                        }
                      }}
                      className="btn bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all"
                    >
                      ✓ Mark as Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
            {inquiries.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">No inquiries or demo requests found.</div>
            )}
          </div>
        </div>
      )}

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

      {activatingSchool && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left">
            <div className="bg-primary px-6 py-5">
              <h3 className="font-display font-bold text-white text-lg font-sans">Generate Credentials</h3>
              <p className="text-blue-200 text-xs mt-0.5 font-sans">Activate {activatingSchool.name} and configure their admin credentials.</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 font-sans">Admin Email * (For login)</label>
                <input type="email" value={actEmail} onChange={e => setActEmail(e.target.value)} placeholder="admin@school.com" className="input text-black font-sans" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 font-sans">Admin Password *</label>
                <input type="password" value={actPassword} onChange={e => setActPassword(e.target.value)} placeholder="Minimum 6 characters" className="input text-black font-sans" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setActivatingSchool(null)} className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-4 py-2 rounded-xl transition-all font-sans">Cancel</button>
                <button 
                  onClick={async () => {
                    if (!actEmail || !actPassword) {
                      alert('Please fill in both email and password.');
                      return;
                    }
                    try {
                      await apiClient.put(`/super/schools/${activatingSchool.id}/status`, {
                        status: 'Active',
                        adminEmail: actEmail,
                        adminPassword: actPassword
                      });
                      setActivatingSchool(null);
                      setActEmail('');
                      setActPassword('');
                      fetchNoticesAndSchools();
                      alert('School credentials generated and activated successfully.');
                    } catch (err) {
                      console.error('Error activating school:', err);
                      alert(err.response?.data?.error || 'Failed to activate school.');
                    }
                  }} 
                  className="btn-primary text-xs px-4 py-2 rounded-xl font-sans"
                >
                  Activate & Save Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminNotices;
