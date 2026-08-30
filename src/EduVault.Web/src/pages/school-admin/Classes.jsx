import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';

export default function Classes() {
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
        <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
            <table className="w-full" style={{ minWidth: '720px', borderCollapse: 'collapse' }}>
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
                        <div className={`h-full rounded-full ${c.pct >= 90 ? 'bg-red-400' : c.pct >= 70 ? 'bg-yellow-400' : 'bg-green-400'}`} style={{ width: `${c.pct}%` }} />
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
        </div>
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
}
