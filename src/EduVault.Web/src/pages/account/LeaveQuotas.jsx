import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  Layers, 
  Edit, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  User,
  Sparkles,
  RotateCcw
} from 'lucide-react';

const LeaveQuotas = () => {
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    clAllotted: 12,
    slAllotted: 10,
    elAllotted: 15,
    mlAllotted: 90
  });

  const fetchQuotas = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/account/quotas?academicYear=${selectedYear}`);
      setQuotas(res.data || []);
    } catch (err) {
      console.error('Failed to load leave quotas:', err);
      setError('Failed to load teacher leave quotas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotas();
  }, [selectedYear]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingTeacher) return;
    try {
      await apiClient.put(`/account/quotas/${editingTeacher.teacherId}`, {
        academicYear: selectedYear,
        casualLeaveAllotted: parseInt(form.clAllotted),
        sickLeaveAllotted: parseInt(form.slAllotted),
        earnedLeaveAllotted: parseInt(form.elAllotted),
        maternityLeaveAllotted: parseInt(form.mlAllotted)
      });
      setSuccess(`Quota updated for ${editingTeacher.teacherName}.`);
      setEditingTeacher(null);
      fetchQuotas();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update leave quota.');
    }
  };

  const filtered = quotas.filter(q => {
    const s = search.toLowerCase();
    return (
      (q.teacherName || '').toLowerCase().includes(s) ||
      (q.teacherEmail || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Teacher Leave Quotas" subtitle="Annual Leave Allotment (CL, SL, EL/PL, ML) per Teacher" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
              <Layers className="w-8 h-8 text-indigo-400 shrink-0" />
              Annual Leave Balance & Quotas
            </h1>
            <p className="text-sm text-indigo-200/90 max-w-xl">
              Configured quotas set the maximum paid leaves per category before automatic Leave Without Pay (LWP) deductions trigger in monthly salary.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20">
            <Calendar className="w-4 h-4 text-indigo-300 ml-2" />
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-white font-bold text-sm px-2 py-1 focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y} className="bg-slate-900 text-white">Year {y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700 shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="font-semibold">{success}</p>
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Teacher Quota Allocations ({quotas.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Showing balances for academic year {selectedYear}</p>
            </div>

            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search teacher by name..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center"><Loader /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <p className="text-sm font-semibold">No teachers found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-3xs font-black text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-6">TEACHER</th>
                    <th className="py-3.5 px-4 text-center">CASUAL (CL)</th>
                    <th className="py-3.5 px-4 text-center">SICK (SL)</th>
                    <th className="py-3.5 px-4 text-center">EARNED (EL)</th>
                    <th className="py-3.5 px-4 text-center">MATERNITY (ML)</th>
                    <th className="py-3.5 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filtered.map(q => (
                    <tr key={q.teacherId} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{q.teacherName}</div>
                        <div className="text-xs text-slate-400 font-mono">{q.teacherEmail}</div>
                      </td>
                      
                      {/* CL */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-purple-700 font-mono text-sm">
                          {q.clAllotted - q.clUsed}
                        </span>
                        <span className="text-3xs text-slate-400 block">
                          of {q.clAllotted} left ({q.clUsed} used)
                        </span>
                      </td>

                      {/* SL */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-teal-700 font-mono text-sm">
                          {q.slAllotted - q.slUsed}
                        </span>
                        <span className="text-3xs text-slate-400 block">
                          of {q.slAllotted} left ({q.slUsed} used)
                        </span>
                      </td>

                      {/* EL */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-indigo-700 font-mono text-sm">
                          {q.elAllotted - q.elUsed}
                        </span>
                        <span className="text-3xs text-slate-400 block">
                          of {q.elAllotted} left ({q.elUsed} used)
                        </span>
                      </td>

                      {/* ML */}
                      <td className="py-4 px-4 text-center">
                        <span className="font-bold text-rose-700 font-mono text-sm">
                          {q.mlAllotted - q.mlUsed}
                        </span>
                        <span className="text-3xs text-slate-400 block">
                          of {q.mlAllotted} left
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingTeacher(q);
                            setForm({
                              clAllotted: q.clAllotted,
                              slAllotted: q.slAllotted,
                              elAllotted: q.elAllotted,
                              mlAllotted: q.mlAllotted
                            });
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Edit Quota
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Quota Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 text-left">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">Edit Annual Leave Quota</h3>
                <p className="text-xs text-purple-200 mt-0.5">{editingTeacher.teacherName} ({selectedYear})</p>
              </div>
              <button onClick={() => setEditingTeacher(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Casual Leave (CL)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.clAllotted}
                    onChange={e => setForm(p => ({ ...p, clAllotted: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Sick Leave (SL)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.slAllotted}
                    onChange={e => setForm(p => ({ ...p, slAllotted: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Earned Leave (EL/PL)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.elAllotted}
                    onChange={e => setForm(p => ({ ...p, elAllotted: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Maternity Leave (ML)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.mlAllotted}
                    onChange={e => setForm(p => ({ ...p, mlAllotted: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingTeacher(null)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase rounded-xl">Update Allotment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveQuotas;
