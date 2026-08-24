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
  Users,
  LineChart as LineChartIcon,
  BarChart3,
  Check
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  LineChart as RechartsLineChart,
  Line,
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
  const [activeChartType, setActiveChartType] = useState('bar');

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

  // Widgets & Graph Driver Config
  const configuredWidgets = stats?.configuredWidgets || [];
  
  // Find which widget is configured as the Main Graph Driver
  const mainGraphWidget = configuredWidgets.find(w => w.chartType?.startsWith('MainGraph') || w.chartType === 'MainGraph')
    || configuredWidgets.find(w => w.widgetKey?.includes('fee') && w.isEnabled)
    || configuredWidgets[0];

  useEffect(() => {
    if (mainGraphWidget?.chartType) {
      const typeStr = mainGraphWidget.chartType.toLowerCase();
      if (typeStr.includes('area')) setActiveChartType('area');
      else if (typeStr.includes('pie')) setActiveChartType('pie');
      else if (typeStr.includes('line')) setActiveChartType('line');
      else setActiveChartType('bar');
    }
  }, [mainGraphWidget?.chartType]);

  let graphTitle = 'Monthly Fee Collection Trend (Last 6 Months)';
  let graphSubtitle = 'Total student fee revenue received per month';
  let graphData = stats?.monthlyFeeTrend || [];
  let graphColor = '#10b981'; // Emerald
  let graphTooltipLabel = 'Fee Collected';

  if (mainGraphWidget?.metricSource === 'SalaryDisbursed' || mainGraphWidget?.widgetKey?.includes('salary')) {
    graphTitle = `${mainGraphWidget.title || 'Monthly Salary Outflow'} (Last 6 Months)`;
    graphSubtitle = 'Total net payroll disbursed per month';
    graphData = stats?.monthlySalaryTrend || [];
    graphColor = '#8b5cf6'; // Purple
    graphTooltipLabel = 'Salary Disbursed';
  } else if (mainGraphWidget?.metricSource === 'ExpenseTotal' || mainGraphWidget?.widgetKey?.includes('expense')) {
    graphTitle = `${mainGraphWidget.title || 'Monthly School Expenses'} (Last 6 Months)`;
    graphSubtitle = 'Total school operational spending per month';
    graphData = stats?.monthlyExpenseTrend || [];
    graphColor = '#f43f5e'; // Rose
    graphTooltipLabel = 'Expenses';
  } else {
    // Fee Collection
    graphTitle = `${mainGraphWidget?.title || 'Monthly Fee Collection'} (Last 6 Months)`;
    graphSubtitle = 'Total student fee revenue received per month';
    graphData = stats?.monthlyFeeTrend || [];
    graphColor = '#10b981'; // Emerald
    graphTooltipLabel = 'Fee Collected';
  }

  // Helpers to check widget visibility and custom titles
  const getWidgetInfo = (key, defaultTitle, defaultFreq = 'Monthly') => {
    const found = configuredWidgets.find(w => w.widgetKey === key);
    return {
      isVisible: found ? found.isEnabled : true,
      title: found?.title || defaultTitle,
      timeRange: found?.timeRange || defaultFreq
    };
  };

  const salaryWidget = getWidgetInfo('card.account.salary_disbursed', 'Salaries Disbursed');
  const pendingSalaryWidget = getWidgetInfo('card.account.pending_payroll', 'Pending Payroll');
  const feeWidget = getWidgetInfo('card.account.fee_collection', 'Fee Collection');
  const expenseWidget = getWidgetInfo('card.account.school_expenses', 'School Expenses');

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

        {/* Dynamic KPI Strip (Controlled by Super Admin Configurator) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Salaries Disbursed */}
          {salaryWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{salaryWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{(stats?.totalSalariesDisbursedThisMonth || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span><span className="text-purple-600 font-bold">{stats?.teachersPaidThisMonthCount || 0}</span> teachers paid</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{salaryWidget.timeRange}</span>
              </p>
            </div>
          )}

          {/* Pending Payroll */}
          {pendingSalaryWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{pendingSalaryWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{(stats?.totalPendingSalariesAmount || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span><span className="text-amber-600 font-bold">{stats?.pendingSalariesCount || 0}</span> teachers pending</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{pendingSalaryWidget.timeRange}</span>
              </p>
            </div>
          )}

          {/* Fee Collections */}
          {feeWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{feeWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{(stats?.totalFeeCollectedThisMonth || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span><span className="text-purple-600 font-bold">Student fees</span> received</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{feeWidget.timeRange}</span>
              </p>
            </div>
          )}

          {/* Monthly Expenses */}
          {expenseWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{expenseWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                ₹{(stats?.totalExpenses || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span><span className="text-rose-600 font-bold">{stats?.pendingLeavesCount || 0}</span> leaves pending</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{expenseWidget.timeRange}</span>
              </p>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Dynamic Graph (Driven by Configurator Selection & Interactive Chart Type Switcher) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: graphColor }} />
                  {graphTitle}
                </h3>
                <p className="text-2xs text-slate-400">{graphSubtitle}</p>
              </div>

              {/* Chart Format Switcher Buttons (Bar, Area, Pie, Line) */}
              <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200 shadow-2xs">
                {[
                  { id: 'bar', label: '📊 Bar' },
                  { id: 'area', label: '📈 Area' },
                  { id: 'pie', label: '🥧 Pie' },
                  { id: 'line', label: '📉 Line' }
                ].map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setActiveChartType(type.id)}
                    className={`px-3 py-1 rounded-lg text-2xs font-bold transition-all ${
                      activeChartType === type.id
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader /></div>
              ) : (
                <>
                  {activeChartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={graphData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(val) => [`₹${val.toLocaleString()}`, graphTooltipLabel]}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        />
                        <Bar dataKey="amount" fill={graphColor} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {activeChartType === 'area' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={graphData}>
                        <defs>
                          <linearGradient id="mainAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={graphColor} stopOpacity={0.45} />
                            <stop offset="95%" stopColor={graphColor} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(val) => [`₹${val.toLocaleString()}`, graphTooltipLabel]}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke={graphColor} strokeWidth={3} fillOpacity={1} fill="url(#mainAreaGrad)" dot={{ r: 4, fill: graphColor, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {activeChartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={graphData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(val) => [`₹${val.toLocaleString()}`, graphTooltipLabel]}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        />
                        <Line type="monotone" dataKey="amount" stroke={graphColor} strokeWidth={3.5} dot={{ r: 4, fill: graphColor, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  )}

                  {activeChartType === 'pie' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={graphData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="amount"
                          nameKey="month"
                        >
                          {graphData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => [`₹${val.toLocaleString()}`, graphTooltipLabel]}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </>
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
              ) : (stats?.expenseCategoryBreakdown || []).length === 0 ? (
                <div className="text-center text-slate-400 py-8">
                  <p className="text-xs font-semibold">No recorded expenses for this month</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.expenseCategoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="amount"
                      nameKey="category"
                    >
                      {stats.expenseCategoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [`₹${val.toLocaleString()}`, 'Spent']}
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
