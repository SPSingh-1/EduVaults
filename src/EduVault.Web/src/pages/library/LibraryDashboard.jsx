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

const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

const LibraryDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChartType, setActiveChartType] = useState('bar');

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

  const configuredWidgets = stats?.configuredWidgets || [];

  const mainWidget = configuredWidgets.find(w => w.chartType?.startsWith('MainGraph') || w.chartType === 'MainGraph') || configuredWidgets[0];

  useEffect(() => {
    if (mainWidget?.chartType) {
      const typeStr = mainWidget.chartType.toLowerCase();
      if (typeStr.includes('area')) setActiveChartType('area');
      else if (typeStr.includes('pie')) setActiveChartType('pie');
      else if (typeStr.includes('line')) setActiveChartType('line');
      else setActiveChartType('bar');
    }
  }, [mainWidget?.chartType]);

  const getWidgetInfo = (key, defaultTitle, defaultFreq = 'Daily') => {
    const found = configuredWidgets.find(w => w.widgetKey === key);
    return {
      isVisible: found ? found.isEnabled : true,
      title: found?.title || defaultTitle,
      timeRange: found?.timeRange || defaultFreq
    };
  };

  const totalBooksWidget = getWidgetInfo('card.library.total_books', 'Total Book Inventory');
  const activeLoansWidget = getWidgetInfo('card.library.active_loans', 'Active Book Loans');
  const overdueWidget = getWidgetInfo('card.library.overdue_books', 'Overdue Books');
  const finesWidget = getWidgetInfo('card.library.fines_collected', 'Fines Collected', 'Monthly');

  const chartData = stats?.dailyIssuanceTrend || [];

  return (
    <div className="space-y-6">
      <Topbar title="Library Management Dashboard" subtitle="Book Inventory, Active Loans, Returns & Fine Records" />

      <div className="space-y-6">
        {/* Dynamic KPI Strip (Controlled by Super Admin Configurator) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Books */}
          {totalBooksWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{totalBooksWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-600">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">
                {(stats?.totalBooks || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span><span className="text-cyan-600 font-bold">{stats?.availableBooks || 0}</span> copies available</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{totalBooksWidget.timeRange}</span>
              </p>
            </div>
          )}

          {/* Issued Books */}
          {activeLoansWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{activeLoansWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600">
                  <BookMarked className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-600 font-mono">
                {stats?.issuedBooks || 0}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>Active borrower loans</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{activeLoansWidget.timeRange}</span>
              </p>
            </div>
          )}

          {/* Overdue Books */}
          {overdueWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{overdueWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 font-mono">
                {stats?.overdueBooks || 0}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span className="text-amber-600 font-semibold">Past return date</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{overdueWidget.timeRange}</span>
              </p>
            </div>
          )}

          {/* Fines Collected */}
          {finesWidget.isVisible && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xs font-black text-slate-400 uppercase tracking-widest">{finesWidget.title}</span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-600 font-mono">
                ₹{(stats?.totalFineCollected || 0).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                <span>₹{stats?.finePerDay || 2}/day overdue</span>
                <span className="text-[10px] font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-500">{finesWidget.timeRange}</span>
              </p>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Daily Issuance Trend with Multi-Format Switcher */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-600" />
                  Book Issuance Trend (Last 7 Days)
                </h3>
                <p className="text-2xs text-slate-400">Daily number of books checked out</p>
              </div>

              {/* Chart Format Switcher Buttons */}
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

            <div className="h-52 sm:h-72 w-full pt-4">
              {loading ? (
                <div className="h-full flex items-center justify-center"><Loader /></div>
              ) : (
                <>
                  {activeChartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
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

                  {activeChartType === 'area' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="libraryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(val) => [`${val} books`, 'Issued']}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="issued" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#libraryAreaGrad)" dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {activeChartType === 'line' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(val) => [`${val} books`, 'Issued']}
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                        />
                        <Line type="monotone" dataKey="issued" stroke="#06b6d4" strokeWidth={3.5} dot={{ r: 4, fill: '#06b6d4', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  )}

                  {activeChartType === 'pie' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="issued"
                          nameKey="date"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val) => [`${val} books`, 'Issued']}
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

          {/* Category Distribution */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-600" />
                Category Distribution
              </h3>
              <p className="text-2xs text-slate-400">Total books categorized by subject</p>
            </div>

            <div className="h-52 sm:h-72 w-full flex items-center justify-center">
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
                      data={stats?.categoryBreakdown || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="total"
                    >
                      {(stats?.categoryBreakdown || []).map((entry, index) => (
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
