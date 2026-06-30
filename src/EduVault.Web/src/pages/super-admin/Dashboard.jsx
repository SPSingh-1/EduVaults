import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Topbar from '../../components/layout/Topbar';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';
import { 
  School, 
  CheckCircle2, 
  DollarSign, 
  TrendingUp, 
  Info, 
  Plus, 
  Download, 
  ArrowUpRight 
} from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-100/80 p-3 rounded-2xl shadow-[0_12px_30px_-5px_rgba(0,0,0,0.08)] transition-all">
        <p className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-2xs text-slate-500 font-semibold">{item.name}:</span>
            <span className="text-xs font-black text-slate-800">
              {item.value} {item.value === 1 ? 'school' : 'schools'}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(6); // 6 months or 12 months (1 Year)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/super/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching superadmin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const trendData = stats?.onboardingTrend
    ? (range === 6 ? stats.onboardingTrend.slice(-6) : stats.onboardingTrend)
    : [];

  return (
    <div className="space-y-6">
      {/* Topbar */}
      <Topbar title="Dashboard Overview" subtitle="EduFlow Platform" actions={
        <div className="flex gap-2">
          <button className="btn-outline text-xs">
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
          </button>
          <button onClick={() => navigate('/super-admin/schools')} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" />
            <span>Add New School</span>
          </button>
        </div>
      } />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Total Schools',value: stats?.totalSchools ?? '0',change:'Real-time',icon: School,color:'text-blue-500',bgColor:'bg-blue-50/50'},
          {label:'Active Subscriptions',value: stats?.activeSubscriptions ?? '0',change:'Active',icon: CheckCircle2,color:'text-emerald-500',bgColor:'bg-emerald-50/50'},
          {label:'Monthly Revenue',value: `$${stats?.monthlyRevenue?.toLocaleString() ?? '0'}`,change:'MRR',icon: DollarSign,color:'text-violet-500',bgColor:'bg-violet-50/50'},
          {label:'Platform Growth',value: stats?.platformGrowth ?? 'Stable',change:'Steady',icon: TrendingUp,color:'text-orange-500',bgColor:'bg-orange-50/50'},
        ].map(s=>(
          <div key={s.label} className="stat-card flex items-center justify-between p-5 hover:shadow-md transition-all">
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-400">{s.label}</div>
              <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
              <div className="text-2xs font-semibold text-gray-400 uppercase tracking-wider">{s.change}</div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bgColor}`}>
              <s.icon className={`w-6 h-6 ${s.color} stroke-[1.75]`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-semibold text-primary text-sm">School Onboarding Trend</h3>
              <p className="text-xs text-gray-400">Net new schools added per month</p>
            </div>
            <div className="flex bg-gray-50 border border-gray-150 p-1 rounded-lg">
              <button 
                onClick={() => setRange(6)} 
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${range === 6 ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-650"}`}
              >
                6 Months
              </button>
              <button 
                onClick={() => setRange(12)} 
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${range === 12 ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-650"}`}
              >
                1 Year
              </button>
            </div>
          </div>
          
          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="schoolOnboardingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.24}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} transitionDuration={180} />
                  <Area 
                    type="monotone" 
                    name="Schools Onboarded" 
                    dataKey="schools" 
                    stroke="#3b82f6" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#schoolOnboardingGrad)" 
                    dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5, r: 4 }}
                    activeDot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-xs">No onboarding trend data available.</div>
            )}
          </div>
        </div>

        <div className="card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
              <h3 className="font-display font-semibold text-primary text-sm m-0">Recent Activity</h3>
              <button onClick={() => navigate('/super-admin/schools')} className="text-2xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                <span>View Schools</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-4">
              {stats?.recentActivity && stats.recentActivity.map((a,i)=>(
                <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50/50 flex items-center justify-center text-blue-500 shrink-0">
                    <School className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-primary truncate">{a.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-light">Joined the platform ({a.status})</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{new Date(a.createdAt).toLocaleDateString('en-GB')}</div>
                  </div>
                </div>
              ))}
              {(!stats?.recentActivity || stats.recentActivity.length === 0) && (
                <div className="text-xs text-gray-400 py-8 text-center">No recent school additions.</div>
              )}
            </div>
          </div>
          <button onClick={() => navigate('/super-admin/notices')} className="text-xs text-blue-600 font-semibold hover:underline w-full text-center pt-4 border-t border-gray-50">
            View System Notices
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
