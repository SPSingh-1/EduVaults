import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  BookOpen, 
  BookMarked, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  Sparkles,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const LibraryDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/library/dashboard');
      setStats(res.data || {});
    } catch (err) {
      console.error('Failed to load library dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Library Management Dashboard" subtitle="Book Inventory, Active Loans, Returns & Fine Records" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Books */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Total Inventory</span>
              <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-600">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              {(stats?.totalBooks || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-cyan-600 font-bold">{stats?.availableBooks || 0}</span> copies available on shelf
            </p>
          </div>

          {/* Issued Books */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Active Loans</span>
              <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                <BookMarked className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-blue-600 font-mono">
              {stats?.issuedBooks || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1">Currently with students & teachers</p>
          </div>

          {/* Overdue Books */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Overdue Books</span>
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600 font-mono">
              {stats?.overdueBooks || 0}
            </div>
            <p className="text-xs text-amber-600 font-semibold mt-1">Past return due date</p>
          </div>

          {/* Fines Collected */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Fines Collected</span>
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-600 font-mono">
              ₹{(stats?.totalFineCollected || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              ₹{stats?.finePerDay || 2}/day overdue rate
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Daily Issuance Trend */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-600" />
                Book Issuance Trend (Last 7 Days)
              </h3>
              <p className="text-2xs text-slate-400">Daily number of books checked out</p>
            </div>

            <div className="h-72 w-full pt-4">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.dailyIssuanceTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val) => [`${val} books`, 'Issued']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="issued" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                Category Distribution
              </h3>
              <p className="text-2xs text-slate-400">Total books categorized by subject</p>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              {loading ? (
                <Loader />
              ) : (stats?.categoryBreakdown || []).length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <p className="text-xs font-semibold">No categorized books</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="total"
                    >
                      {stats.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`${val} copies`, 'Total']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryDashboard;
