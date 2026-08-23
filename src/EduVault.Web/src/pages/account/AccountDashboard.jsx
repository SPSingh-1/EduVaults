import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient } from '../../api/apiClient';
import Loader from '../../components/common/Loader';
import { 
  DollarSign, 
  Receipt, 
  CalendarCheck, 
  CreditCard, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowUpRight,
  Layers,
  Sparkles,
  Users
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

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const AccountDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/account/dashboard?month=${selectedMonth}&year=${selectedYear}`);
      setStats(res.data || {});
    } catch (err) {
      console.error('Failed to load account dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Topbar title="Finance & HRM Executive Dashboard" subtitle="School Financial Operations, Teacher Salaries & Quotas" />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Month Selector Bar */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Financial Period Overview</h2>
              <p className="text-xs text-slate-400">Viewing data for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Salary Disbursed */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Salaries Disbursed</span>
              <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{(stats?.totalSalaryPaid || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">Paid Out</span> this period
            </p>
          </div>

          {/* Pending Salaries */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Pending Payroll</span>
              <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{(stats?.pendingSalary || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-amber-600 font-bold">Draft / Unpaid</span> salaries
            </p>
          </div>

          {/* Fee Collected This Month */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">Fee Collection</span>
              <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{(stats?.totalFeeCollectedThisMonth || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-purple-600 font-bold">Student fees</span> received
            </p>
          </div>

          {/* Monthly Expenses */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">School Expenses</span>
              <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 font-mono">
              ₹{(stats?.totalExpenses || 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-rose-600 font-bold">{stats?.pendingLeavesCount || 0}</span> leaves awaiting approval
            </p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Salary Outflow Trend */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Monthly Salary Outflow (Last 6 Months)
                </h3>
                <p className="text-2xs text-slate-400">Total net payroll disbursed per month</p>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader /></div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.monthlySalaryTrend || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(val) => [`₹${val.toLocaleString()}`, 'Disbursed']}
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="amount" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Expenses Category Breakdown */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-rose-500" />
                Expense Distribution
              </h3>
              <p className="text-2xs text-slate-400">Category breakdown for {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}</p>
            </div>

            <div className="h-72 w-full flex items-center justify-center">
              {loading ? (
                <Loader />
              ) : (stats?.expenseCategories || []).length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <CreditCard className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs font-semibold">No expenses recorded this month</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.expenseCategories}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {stats.expenseCategories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`₹${val.toLocaleString()}`, 'Amount']}
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

export default AccountDashboard;
