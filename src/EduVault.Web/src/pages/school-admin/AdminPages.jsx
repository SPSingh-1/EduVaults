import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { io } from 'socket.io-client';
import { useNotifications } from '../../contexts/NotificationContext';

// --- Classes Page ---
export const Classes = () => {
  const [classesList, setClassesList] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrollmentClasses, setEnrollmentClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [capacities, setCapacities] = useState([]);

  // Form State
  const [form, setForm] = useState({
    grade: '',
    section: '',
    level: 'Secondary Education',
    room: '',
    capacity: ''
  });

  const fetchClassesData = async () => {
    try {
      const clsRes = await apiClient.get('/academics/classes');
      setClassesList(clsRes.data);

      const teachRes = await apiClient.get('/academics/teachers');
      setTeachers(teachRes.data);

      const encRes = await apiClient.get('/academics/enrollment-classes');
      setEnrollmentClasses(encRes.data);

      const secRes = await apiClient.get('/academics/sections');
      setSections(secRes.data);

      const rmRes = await apiClient.get('/academics/rooms');
      setRooms(rmRes.data);

      const capRes = await apiClient.get('/academics/capacities');
      setCapacities(capRes.data);
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  useEffect(() => {
    fetchClassesData();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!form.grade || !form.section || !form.room) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/academics/classes', form);
      setShowNew(false);
      setForm({ grade: '', section: '', level: 'Secondary Education', room: '', capacity: '' });
      fetchClassesData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create class.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) return;
    setLoading(true);
    try {
      // Find user id corresponding to selected teacher (employee record ID is t.id, but database maps by teacherId which is the guid user ID)
      await apiClient.post(`/academics/classes/${selectedClassId}/assign-teacher`, JSON.stringify(selectedTeacherId), {
        headers: { 'Content-Type': 'application/json' }
      });
      setShowAssign(false);
      fetchClassesData();
    } catch (err) {
      console.error('Error assigning teacher:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Class & Section Management" subtitle="Dashboard › Academics › Classes"
        actions={<button onClick={() => { setError(''); setShowNew(true); }} className="btn-primary">⊕ Create New Class/Section</button>} />
      
      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Class & Section', 'Class Teacher', 'Room', 'Occupancy', 'Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {classesList.map((c, i) => (
              <tr key={c.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-td">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${c.grade === '12' ? 'bg-red-500' : c.grade === '11' ? 'bg-yellow-500' : 'bg-primary'}`}>{c.grade}</div>
                    <div><div className="font-semibold text-sm text-primary">Class {c.grade} - {c.section}</div><div className="text-xs text-gray-400">{c.level}</div></div>
                  </div>
                </td>
                <td className="table-td">
                  {c.teacher ? (
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent">{c.teacher[0]}</div>
                      <div><div className="text-sm font-medium">{c.teacher}</div><div className="text-xs text-gray-400">{c.email}</div></div>
                    </div>
                  ) : <span className="text-xs text-red-500 font-semibold">TEACHER UNASSIGNED</span>}
                </td>
                <td className="table-td text-sm text-gray-500">{c.room}</td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <div className="text-sm">{c.enrolled}/{c.capacity} Students</div>
                    {c.enrolled >= c.capacity && <span className="badge badge-danger text-xs">FULL</span>}
                    <span className={`text-xs font-semibold ${c.pct >= 90 ? 'text-red-500' : c.pct >= 70 ? 'text-yellow-500' : 'text-green-500'}`}>{c.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full w-32">
                    <div className={`h-full rounded-full ${c.pct >= 90 ? 'bg-red-400' : c.pct >= 70 ? 'bg-yellow-400' : 'bg-green-400'}`} style={{width: `${c.pct}%`}} />
                  </div>
                </td>
                <td className="table-td">
                  <div className="flex gap-2 items-center">
                    {!c.teacher && (
                      <button 
                        onClick={() => { setSelectedClassId(c.id); setSelectedTeacherId(''); setShowAssign(true); }} 
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Assign Teacher
                      </button>
                    )}
                    <button 
                      onClick={() => { setSelectedClassId(c.id); setSelectedTeacherId(c.teacherId || ''); setShowAssign(true); }}
                      className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" 
                      title="Edit Teacher Assignment"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {classesList.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-400 text-sm">No classes registered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateClass} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="text-xs font-semibold text-primary/60 uppercase tracking-wider mb-1">⊕ Setup New Academic Unit</div>
              <h3 className="font-display font-bold text-primary text-xl mb-1">Create New Class & Section</h3>
              <p className="text-gray-400 text-sm mb-5 font-light">Configure the classroom environment and set enrollment limits.</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">{error}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Grade Level *</label>
                  <select required value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))} className="input">
                    <option value="">Select Grade Level</option>
                    {enrollmentClasses.map(c => {
                      const num = c.name.replace("Class ", "").trim();
                      return <option key={c.id} value={num}>{c.name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Section Name *</label>
                  <select required value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} className="input">
                    <option value="">Select Section</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Room *</label>
                  <select required value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} className="input">
                    <option value="">Select Room</option>
                    {rooms.map(r => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Student Capacity *</label>
                  <select required value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: parseInt(e.target.value) }))} className="input">
                    <option value="">Select Capacity</option>
                    {capacities.map(c => (
                      <option key={c.id} value={c.value}>{c.value}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setShowNew(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating...' : '⊕ Create Class'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAssignTeacher} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <h3 className="font-display font-bold text-primary text-xl mb-3">Assign Class Teacher</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Educator</label>
                <select required value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)} className="input">
                  <option value="">Choose Teacher</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.employeeId})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2">
              <button type="button" onClick={() => setShowAssign(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">Confirm Assignment</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Notices Page ---
export const Notices = () => {
  const { markAllAsRead } = useNotifications();
  const [noticesList, setNoticesList] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [target, setTarget] = useState('ALL');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('GENERAL');
  const [loading, setLoading] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('all'); // 'all', 'school', 'system'

  const filteredNotices = noticesList.filter(n => {
    if (activeFilterTab === 'school') {
      return n.senderRole !== 'superadmin';
    }
    if (activeFilterTab === 'system') {
      return n.senderRole === 'superadmin';
    }
    return true; // 'all'
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
      setShowNew(false);
      setTitle('');
      setBody('');
      fetchNotices();
    } catch (err) {
      console.error('Error publishing notice:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Notices & Announcements" actions={
        <button onClick={() => setShowNew(true)} className="btn-primary">+ New Notice</button>
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
                className={`pb-2.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${
                  activeFilterTab === tab.id
                    ? 'border-primary text-primary font-black'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
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
    </div>
  );
};

// --- Exams Page ---
export const Exams = () => {
  const [examsList, setExamsList] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [examTypes, setExamTypes] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [filterClassId, setFilterClassId] = useState('');
  const [filterExamType, setFilterExamType] = useState('Semester Examination');

  const [modalError, setModalError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editExamId, setEditExamId] = useState(null);

  // Form State
  const [form, setForm] = useState({
    subjectId: '',
    classId: '',
    proctorId: '',
    date: '',
    time: '09:00',
    examType: 'Semester Examination',
    status: 'Scheduled'
  });

  const [sendingSchedule, setSendingSchedule] = useState(false);

  const resetForm = () => {
    setForm({
      classId: filterClassId || classes[0]?.id || '',
      subjectId: subjects[0]?.id || '',
      proctorId: teachers[0]?.id || '',
      date: '',
      time: '09:00',
      examType: filterExamType || examTypes[0]?.name || 'Semester Examination',
      status: 'Scheduled'
    });
    setEditMode(false);
    setEditExamId(null);
    setModalError('');
  };

  const handleSendSchedule = async () => {
    if (!filterClassId) return;
    setSendingSchedule(true);
    try {
      const res = await apiClient.post('/exams/schedule/publish', {
        classId: filterClassId,
        examType: filterExamType
      });

      const { className, recipients } = res.data;

      if (!recipients || recipients.length === 0) {
        alert("No class teacher or active students found in this class to receive the schedule notification.");
        return;
      }

      const title = `Exam Schedule Published: ${filterExamType}`;
      const body = `The exam schedule for ${className} during the ${filterExamType} cycle has been published. Please check your Exams dashboard.`;
      
      await expressClient.post('/notifications', {
        recipientId: recipients,
        title,
        body,
        type: 'GENERAL'
      });

      alert(`Exam schedule successfully sent to ${recipients.length} class members (class teacher & students) of ${className}!`);
    } catch (err) {
      console.error('Error sending schedule:', err);
      alert(err.response?.data?.error || 'Failed to send schedule.');
    } finally {
      setSendingSchedule(false);
    }
  };

  const fetchExamsData = async () => {
    try {
      const scheduleRes = await apiClient.get('/exams/schedule');
      setExamsList(scheduleRes.data);

      const clsRes = await apiClient.get('/academics/classes');
      setClasses(clsRes.data);

      const teachRes = await apiClient.get('/academics/teachers');
      setTeachers(teachRes.data);

      const subjRes = await apiClient.get('/academics/subjects');
      setSubjects(subjRes.data);

      const etRes = await apiClient.get('/academics/exam-types');
      setExamTypes(etRes.data);

      if (etRes.data.length > 0) {
        setFilterExamType(etRes.data[0].name);
        setForm(f => ({ ...f, examType: etRes.data[0].name }));
      }

      if (clsRes.data.length > 0) {
        setForm(f => ({ ...f, classId: clsRes.data[0].id }));
        setFilterClassId(clsRes.data[0].id);
      }
      if (teachRes.data.length > 0) {
        setForm(f => ({ ...f, proctorId: teachRes.data[0].id }));
      }
      if (subjRes.data.length > 0) {
        setForm(f => ({ ...f, subjectId: subjRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExamsData();
  }, []);

  const handleScheduleExam = async (e) => {
    e.preventDefault();
    if (!form.classId || !form.proctorId || !form.subjectId || !form.date || !form.time) return;
    setLoading(true);
    setModalError('');
    try {
      const body = {
        classId: form.classId,
        subjectId: form.subjectId,
        proctorId: form.proctorId,
        date: new Date(form.date).toISOString(),
        time: form.time,
        examType: form.examType,
        status: form.status || 'Scheduled'
      };
      if (editMode) {
        await apiClient.put(`/exams/schedule/${editExamId}`, body);
      } else {
        await apiClient.post('/exams/schedule', body);
      }
      setShowNew(false);
      resetForm();
      fetchExamsData();
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to schedule exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (exam) => {
    setModalError('');
    
    // Parse rawDate or date reliably to YYYY-MM-DD
    const d = new Date(exam.rawDate || exam.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    setForm({
      classId: exam.classId || '',
      subjectId: exam.subjectId || '',
      proctorId: exam.proctorId || '',
      date: dateStr,
      time: exam.time || '09:00',
      examType: exam.examType || 'Semester Examination',
      status: exam.status || 'Scheduled'
    });

    setEditExamId(exam.id);
    setEditMode(true);
    setShowNew(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this exam schedule? This will also clear all entered student marks for this exam.")) {
      try {
        await apiClient.delete(`/exams/schedule/${id}`);
        fetchExamsData();
      } catch (err) {
        console.error("Error deleting exam:", err);
      }
    }
  };

  const selectedClassObj = classes.find(c => c.id === filterClassId);
  const selectedClassName = selectedClassObj ? `Class ${selectedClassObj.grade} - ${selectedClassObj.section}` : '';

  const cycleExams = examsList
    .filter(e => {
      const classMatch = !filterClassId || (selectedClassObj && e.grade === `Grade ${selectedClassObj.grade}` && e.section === selectedClassObj.section);
      const typeMatch = !filterExamType || e.examType === filterExamType;
      return classMatch && typeMatch;
    })
    .sort((a, b) => new Date(a.rawDate || a.date) - new Date(b.rawDate || b.date));

  const getWeekdayAndDay = (dateStr) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { weekday: 'Day', dayNum: '—', month: '' };
      return {
        weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
        dayNum: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' })
      };
    } catch (e) {
      return { weekday: 'Day', dayNum: '—', month: '' };
    }
  };

  return (
    <div>
      <Topbar title="Exams & Assessment Schedule" actions={
        <button onClick={() => { resetForm(); setShowNew(true); }} className="btn-primary">+ Schedule Exam</button>
      } />
      
      {/* Visual Timeline Section */}
      <div className="card mb-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-0 shadow-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
          <div>
            <h3 className="font-display font-bold text-lg text-white">🗓 Chronological Exam Timeline</h3>
            <p className="text-blue-200 text-xs">Viewing schedule for {selectedClassName || 'Selected Class'} ({filterExamType})</p>
          </div>
          <div className="flex gap-2 items-center">
            {filterClassId && (
              <button
                type="button"
                onClick={handleSendSchedule}
                disabled={sendingSchedule || cycleExams.length === 0}
                className="btn-primary text-xs py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed border-0 font-semibold flex items-center gap-1.5 whitespace-nowrap shadow-sm shrink-0"
              >
                {sendingSchedule ? 'Sending...' : '📢 Send Schedule'}
              </button>
            )}
            <select
              value={filterClassId}
              onChange={e => setFilterClassId(e.target.value)}
              className="input bg-white/10 border-white/20 text-white text-xs w-40"
            >
              <option value="" className="text-primary">All Classes</option>
              {classes.map(c => (
                <option key={c.id} value={c.id} className="text-primary">Class {c.grade} - {c.section}</option>
              ))}
            </select>
            <select
              value={filterExamType}
              onChange={e => setFilterExamType(e.target.value)}
              className="input bg-white/10 border-white/20 text-white text-xs w-48"
            >
              {examTypes.map(et => (
                <option key={et.id} value={et.name} className="text-primary">{et.name}</option>
              ))}
            </select>
          </div>
        </div>

        {cycleExams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cycleExams.map((e, idx) => {
              const { weekday, dayNum, month } = getWeekdayAndDay(e.rawDate || e.date);
              return (
                <div key={e.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 hover:bg-white/10 transition-all">
                  <div className="flex flex-col items-center justify-center bg-indigo-500/20 rounded-lg px-3 py-2 border border-indigo-500/30 w-16 h-16 shrink-0">
                    <span className="text-xxs uppercase tracking-wider text-indigo-300 font-bold">{weekday.slice(0, 3)}</span>
                    <span className="text-xl font-bold leading-none my-0.5">{dayNum}</span>
                    <span className="text-xxs uppercase text-indigo-300 font-semibold">{month}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-xxs text-accent font-bold uppercase tracking-wider mb-0.5">Exam #{idx + 1}</div>
                    <div className="font-bold text-sm truncate" title={e.subject}>{e.subject}</div>
                    <div className="text-xxs text-blue-200 truncate mt-1">⏱️ Time: {e.time || 'N/A'}</div>
                    <div className="text-xxs text-blue-200 truncate">👨‍🏫 Proctor: {e.proctor}</div>
                    {e.subjectCode && e.subjectCode.toUpperCase() !== e.subject.toUpperCase().replace(/\s+/g, '') && (
                      <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{e.subjectCode}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-blue-200 text-sm italic">
            No exams scheduled for {selectedClassName || 'this class'} during the {filterExamType} cycle.
          </div>
        )}
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Subject', 'Grade Level', 'Exam Date', 'Time', 'Proctor', 'Status', 'Actions'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {cycleExams.map((e, i) => (
              <tr key={e.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-td">
                  <div className="font-semibold text-sm text-primary">{e.subject}</div>
                  {e.subjectCode && e.subjectCode.toUpperCase() !== e.subject.toUpperCase().replace(/\s+/g, '') && (
                    <div className="text-xs text-gray-400">{e.subjectCode}</div>
                  )}
                </td>
                <td className="table-td text-sm text-gray-500">{e.grade} {e.section}</td>
                <td className="table-td text-sm">📅 {e.date}</td>
                <td className="table-td text-sm font-semibold text-primary">⏱️ {e.time || 'N/A'}</td>
                <td className="table-td"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{e.proctor ? e.proctor[0] : '?'}</div><span className="text-sm">{e.proctor}</span></div></td>
                <td className="table-td"><span className={e.status === 'Completed' ? 'badge-success' : 'badge-warning'}>{e.status}</span></td>
                <td className="table-td">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleEdit(e)} className="p-2 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Edit Schedule">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button type="button" onClick={() => handleDelete(e.id)} className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow hover:scale-105 active:scale-95" title="Delete Schedule">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cycleExams.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-400 text-sm">No exams scheduled yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleScheduleExam} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6 text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-primary text-xl">{editMode ? 'Edit Scheduled Assessment' : 'Schedule Assessment'}</h3>
                <button type="button" onClick={() => { resetForm(); setShowNew(false); }} className="text-gray-400 hover:text-gray-600 text-lg">✖</button>
              </div>
              {modalError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">{modalError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Class *</label>
                  <select required value={form.classId} onChange={e => setForm(f => ({ ...f, classId: e.target.value }))} className="input">
                    <option value="">Choose Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>Class {c.grade} - {c.section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Subject *</label>
                  <select required value={form.subjectId} onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))} className="input">
                    <option value="">Choose Subject</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code && s.code.toUpperCase() !== s.name.toUpperCase().replace(/\s+/g, '') ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Select Proctoring Teacher *</label>
                  <select required value={form.proctorId} onChange={e => setForm(f => ({ ...f, proctorId: e.target.value }))} className="input">
                    <option value="">Choose Teacher</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Exam Cycle *</label>
                  <select required value={form.examType} onChange={e => setForm(f => ({ ...f, examType: e.target.value }))} className="input">
                    {examTypes.map(et => (
                      <option key={et.id} value={et.name}>{et.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Exam Date *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Exam Start Time *</label>
                  <input required type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="input" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => { resetForm(); setShowNew(false); }} className="btn-outline">Cancel</button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving...' : editMode ? 'Save Changes' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Admission Page ---
export const Admission = () => {
  const [admissions, setAdmissions] = useState([]);

  useEffect(() => {
    const fetchAdmissions = async () => {
      try {
        const res = await apiClient.get('/academics/students');
        setAdmissions(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAdmissions();
  }, []);

  return (
    <div>
      <Topbar title="Admission Registry" subtitle="Manage incoming application cycles." />
      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Student ID', 'Student Name', 'Class / Section', 'Status'].map(h => <th key={h} className="table-th">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {admissions.map((a, i) => (
              <tr key={a.id || i} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="table-td text-xs font-mono text-gray-500">#{a.studentId}</td>
                <td className="table-td font-semibold text-primary">{a.name}</td>
                <td className="table-td text-sm">{a.class} - {a.section}</td>
                <td className="table-td"><span className="badge-success">{a.status}</span></td>
              </tr>
            ))}
            {admissions.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-400 text-sm">No student admissions registered yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
