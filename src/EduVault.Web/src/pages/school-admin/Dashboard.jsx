import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { useNavigate } from 'react-router-dom';
import { apiClient, expressClient } from '../../api/apiClient';
import { formatDateDDMMYYYY } from '../../utils/dateUtils';
import Loader from '../../components/common/Loader';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  Users, 
  UserCheck, 
  Building, 
  CreditCard, 
  UserPlus, 
  AlertTriangle, 
  ChevronRight, 
  ArrowUpRight, 
  Calendar 
} from 'lucide-react';

const generateMockPaymentId = () => {
  return `sub_pay_mock_${Math.random().toString(36).substring(7)}`;
};

const CustomTooltip = ({ active, payload, label, mode }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-slate-100/80 p-3 rounded-2xl shadow-[0_12px_30px_-5px_rgba(0,0,0,0.08)] transition-all">
        <p className="text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ backgroundColor: item.color || item.fill }} />
            <span className="text-2xs text-slate-500 font-semibold">{item.name}:</span>
            <span className="text-xs font-black text-slate-800">
              {mode === 'revenue' ? `Rs. ${item.value.toLocaleString()}` : `${item.value} ${item.value === 1 ? 'record' : 'students'}`}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const SchoolAdminDashboard = () => {
  const navigate = useNavigate();
  const [showOnboardChoice, setShowOnboardChoice] = useState(false);
  const [stats, setStats] = useState(null);
  const [teacherSummary, setTeacherSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [chartMode, setChartMode] = useState('attendance'); // 'attendance', 'enrollment', 'revenue'

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [res, tRes] = await Promise.all([
          apiClient.get('/academics/stats'),
          expressClient.get('/teacher-attendance/today-summary').catch(() => ({ data: { presentCount: 0 } }))
        ]);
        setStats(res.data);
        setTeacherSummary(tRes.data);
      } catch (err) {
        console.error('Error fetching school stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const handlePaySubscription = async () => {
    setPaying(true);
    try {
      const orderRes = await apiClient.post('/billing/create-subscription-order');
      const { 
        orderId, 
        amount, 
        currency, 
        keyId, 
        isMock, 
        paymentProvider, 
        instructions 
      } = orderRes.data;

      const provider = paymentProvider ? paymentProvider.toLowerCase() : 'razorpay';
      const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

      if (provider === 'razorpay') {
        const loadScript = (src) => {
          return new Promise((resolve) => {
            if (document.querySelector(`script[src="${src}"]`)) {
              resolve(true);
              return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
          });
        };

        const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
        if (!scriptLoaded) {
          alert('Failed to load Razorpay SDK. Please check your internet connection.');
          setPaying(false);
          return;
        }

        const options = {
          key: keyId,
          amount: amount,
          currency: currency,
          name: "EduVault Subscription",
          description: `${stats?.subscriptionPlanType || 'Standard'} Plan Platform Fees`,
          order_id: isMock ? undefined : orderId,
          handler: async function (response) {
            setPaying(true);
            try {
              await apiClient.post('/billing/verify-subscription-payment', {
                razorpayOrderId: response.razorpay_order_id || orderId,
                razorpayPaymentId: response.razorpay_payment_id || '',
                razorpaySignature: response.razorpay_signature || 'mock_signature',
                paymentProvider: 'razorpay'
              });
              alert('Platform subscription payment successful! All features unlocked.');
              const res = await apiClient.get('/academics/stats');
              setStats(res.data);
            } catch (err) {
              alert('Payment verification failed: ' + (err.response?.data?.error || err.message));
            } finally {
              setPaying(false);
            }
          },
          prefill: {
            name: userProfile.firstName || 'School Admin',
            email: userProfile.email || '',
          },
          theme: { color: "#1a2744" }
        };

        if (isMock) {
          if (window.confirm("Razorpay credentials not configured. Proceed with simulated subscription payment?")) {
            await options.handler({
              razorpay_order_id: orderId,
              razorpay_payment_id: generateMockPaymentId(),
              razorpay_signature: 'mock_signature'
            });
          } else {
            setPaying(false);
          }
        } else {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (response){
            alert("Payment failed: " + response.error.description);
          });
          rzp.open();
        }
      }
      else if (provider === 'cashless') {
        const confirmMsg = `🏦 Platform Cashless / Bank Transfer Instructions:\n\n${instructions || 'Please transfer the platform fees to the admin account.'}\n\nAmount: Rs. ${amount}\n\nHave you completed the bank transfer? Click OK to submit subscription verification.`;
        if (window.confirm(confirmMsg)) {
          setPaying(true);
          try {
            const txRef = `cashless_sub_${Math.random().toString(36).substring(7)}`;
            await apiClient.post('/billing/verify-subscription-payment', {
              razorpayOrderId: orderId,
              paymentProvider: 'cashless',
              transactionReference: txRef
            });
            alert('Platform subscription payment submitted! The admin will verify it shortly.');
            const res = await apiClient.get('/academics/stats');
            setStats(res.data);
          } catch (err) {
            alert('Failed to submit cashless transaction: ' + (err.response?.data?.error || err.message));
          } finally {
            setPaying(false);
          }
        } else {
          setPaying(false);
        }
      }
      else {
        const providerName = provider === 'stripe' ? 'Stripe' : provider === 'paypal' ? 'PayPal' : provider === 'phonepe' ? 'PhonePe' : provider;
        const confirmMsg = `💳 Active Platform Gateway: ${providerName}\n\nAmount: Rs. ${amount}\n\nWould you like to proceed with the simulated checkout?`;
        
        if (window.confirm(confirmMsg)) {
          setPaying(true);
          try {
            const txRef = `${provider}_sub_${Math.random().toString(36).substring(7)}`;
            await apiClient.post('/billing/verify-subscription-payment', {
              razorpayOrderId: orderId,
              paymentProvider: provider,
              transactionReference: txRef
            });
            alert('Platform subscription payment successful! All features unlocked.');
            const res = await apiClient.get('/academics/stats');
            setStats(res.data);
          } catch (err) {
            alert('Payment verification failed: ' + (err.response?.data?.error || err.message));
          } finally {
            setPaying(false);
          }
        } else {
          setPaying(false);
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Order creation failed.');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <Loader message="Assembling school statistics & overview" />;
  }

  const studentPresentPct = stats?.totalStudents > 0 
    ? Math.round(((stats?.todayStudentsPresent ?? 0) / stats.totalStudents) * 100) 
    : 0;

  const staffPresentPct = stats?.totalTeachers > 0 
    ? Math.round(((teacherSummary?.presentCount ?? 0) / stats.totalTeachers) * 100) 
    : 0;

  return(
    <div className="space-y-6">
      <Topbar title={
        <div className="flex items-center gap-2 flex-wrap">
          <span>Dashboard Overview</span>
          {stats?.subscriptionStatus === 'success' ? (
            <span className="text-[9px] font-extrabold bg-green-500/10 text-green-700 border border-green-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
              ● {stats?.subscriptionPlanType || 'Standard'} Plan Active
            </span>
          ) : (
            <span className="text-[9px] font-extrabold bg-amber-500/10 text-amber-700 border border-amber-200/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
              ● Pending Payment
            </span>
          )}
        </div>
      } subtitle="Welcome back, Principal. Here is your school's live performance today." actions={
        <button onClick={() => setShowOnboardChoice(true)} className="btn-primary text-xs">
          <UserPlus className="w-3.5 h-3.5" />
          <span>Register User</span>
        </button>
      }/>

      {stats?.subscriptionStatus === 'pending' && (
        <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200/50 text-red-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-750 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs">Platform Subscription Pending</div>
              <div className="text-[10px] text-red-650 font-light mt-0.5">
                Your school's platform subscription is currently pending payment. Pay the annual fee of <b>${stats.subscriptionAmount}</b> to activate all administrator tools.
              </div>
            </div>
          </div>
          <button 
            onClick={handlePaySubscription} 
            disabled={paying}
            className="btn-primary bg-red-600 hover:bg-red-700 border-none text-white font-bold py-2 px-4 rounded-xl transition-all shadow-sm shrink-0 text-xs"
          >
            {paying ? 'Processing...' : '💳 Pay Subscription'}
          </button>
        </div>
      )}

      {/* Real-time Daily Varying School Action Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Students Present",
            value: `${stats?.todayStudentsPresent ?? 0} / ${stats?.totalStudents ?? 0}`,
            sub: `${studentPresentPct}% Present Today (${stats?.todayStudentsAbsent ?? 0} Absent)`,
            icon: Users,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50/60',
            subColor: 'text-emerald-600 font-bold'
          },
          {
            label: "Today's Teachers Present",
            value: `${teacherSummary?.presentCount ?? 0} / ${stats?.totalTeachers ?? 0}`,
            sub: `${staffPresentPct}% Staff Attendance Today`,
            icon: UserCheck,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50/60',
            subColor: 'text-purple-600 font-bold'
          },
          {
            label: "Today's Fee Collections",
            value: stats?.todayFeesCollected ? `Rs. ${stats.todayFeesCollected.toLocaleString()}` : 'Rs. 0',
            sub: `Fee Receipts Collected Today`,
            icon: CreditCard,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50/60',
            subColor: 'text-blue-600 font-bold'
          },
          {
            label: "Overdue Pending Fees",
            value: stats?.pendingFees ? `Rs. ${stats.pendingFees.toLocaleString()}` : 'Rs. 0',
            sub: 'Outstanding Overdue Dues',
            icon: Building,
            color: 'text-rose-500',
            bgColor: 'bg-rose-50/50',
            subColor: 'text-rose-500 font-bold'
          },
        ].map(s=>(
          <div key={s.label} className="stat-card flex items-center justify-between p-5 hover:shadow-md transition-all">
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-400">{s.label}</div>
              <div className="font-display text-xl font-bold text-primary">{s.value}</div>
              <div className={`text-xs mt-0.5 ${s.subColor||'text-gray-400'}`}>{s.sub}</div>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${s.bgColor}`}>
              <s.icon className={`w-6 h-6 ${s.color} stroke-[1.75]`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Real Data Graph and Action Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
            <div>
              <h3 className="font-display font-semibold text-primary text-sm m-0">
                {chartMode === 'attendance' ? '7-Day Daily Attendance Trend' : chartMode === 'enrollment' ? 'Student Enrollment Trend' : 'Monthly Fee Collection Trend'}
              </h3>
              <p className="text-xs text-gray-400">
                {chartMode === 'attendance' ? 'Real-time daily presence vs absence counts' : chartMode === 'enrollment' ? 'Net new students registered per month' : 'Total fee receipts collected per month'}
              </p>
            </div>
            <select 
              value={chartMode} 
              onChange={e => setChartMode(e.target.value)} 
              className="border border-gray-200 text-xs px-3 py-1.5 rounded-lg text-gray-700 outline-none bg-white font-semibold cursor-pointer shadow-xs hover:border-blue-300 transition-all"
            >
              <option value="attendance">🗓️ Last 7 Days Attendance (Daily)</option>
              <option value="enrollment">🎒 Monthly Admissions Trend</option>
              <option value="revenue">💳 Monthly Fee Collection</option>
            </select>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'attendance' ? (
                <AreaChart data={stats?.dailyAttendanceTrend || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip mode="attendance" />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} transitionDuration={180} />
                  <Area type="monotone" name="Present Students" dataKey="present" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#presentGrad)" dot={{ fill: '#10b981', stroke: '#fff', strokeWidth: 1.5, r: 4 }} activeDot={{ fill: '#10b981', stroke: '#fff', strokeWidth: 2, r: 6 }} />
                  <Area type="monotone" name="Absent Students" dataKey="absent" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#absentGrad)" dot={{ fill: '#ef4444', stroke: '#fff', strokeWidth: 1.5, r: 3 }} activeDot={{ fill: '#ef4444', stroke: '#fff', strokeWidth: 2, r: 5 }} />
                </AreaChart>
              ) : chartMode === 'enrollment' ? (
                <AreaChart data={stats?.enrollmentTrend || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="enrollmentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip mode="enrollment" />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} transitionDuration={180} />
                  <Area type="monotone" name="Enrolled Students" dataKey="admissions" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#enrollmentGrad)" dot={{ fill: '#6366f1', stroke: '#fff', strokeWidth: 1.5, r: 4 }} activeDot={{ fill: '#6366f1', stroke: '#fff', strokeWidth: 2, r: 6 }} />
                </AreaChart>
              ) : (
                <AreaChart data={stats?.monthlyFeeTrend || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <YAxis tick={{fontSize:10, fill:'#94a3b8'}} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip mode="revenue" />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} transitionDuration={180} />
                  <Area type="monotone" name="Fee Receipts (Rs.)" dataKey="collected" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 1.5, r: 4 }} activeDot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 6 }} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display font-semibold text-primary mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                {icon:UserPlus,title:'New Admission',desc:'Register a new student',path:'/school-admin/students?openAddModal=true',color:'text-blue-500',bgColor:'bg-blue-50/50'},
                {icon:UserCheck,title:'Onboard Teacher',desc:'Register new faculty',path:'/school-admin/teachers?openAddModal=true',color:'text-emerald-500',bgColor:'bg-emerald-50/50'},
              ].map(a=>(
                <button key={a.title} onClick={()=>navigate(a.path)} className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all text-left group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${a.bgColor}`}>
                    <a.icon className={`w-5 h-5 ${a.color} stroke-[1.75]`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-primary truncate">{a.title}</div>
                    <div className="text-[10px] text-gray-400 truncate">{a.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-350 group-hover:translate-x-0.5 transition-transform" />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-primary rounded-xl p-5 text-white flex flex-col justify-between h-40 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-white/5 font-black text-6xl">AY</div>
            <div>
              <div className="text-[10px] text-blue-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Term Schedule</span>
              </div>
              <div className="font-semibold text-base">Academic Year 2023-24</div>
              <div className="text-2xs text-blue-200 font-light mt-0.5">Active semester schedules initialized.</div>
            </div>
            <button className="mt-3 w-full bg-white text-primary font-semibold py-2 rounded-lg text-sm hover:bg-blue-50 transition-all z-10">
              View Academic Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Recent Admissions Block */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-50">
          <h3 className="font-display font-semibold text-primary m-0 text-sm">Recent Activity</h3>
          <button onClick={() => navigate('/school-admin/students')} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
            <span>View All Students</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-3">
          {stats?.recentAdmissions && stats.recentAdmissions.map((a,i)=>(
            <div key={i} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {a.name ? a.name[0] : 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-primary truncate">{a.name}</div>
                  <div className="text-[10px] text-gray-400">{formatDateDDMMYYYY(a.createdAt)}</div>
                </div>
                <div className="text-xs text-gray-500 truncate">New Student enrolled: {a.email}</div>
              </div>
            </div>
          ))}
          {(!stats?.recentAdmissions || stats.recentAdmissions.length === 0) && (
            <div className="text-xs text-gray-400 py-4 text-center">No recent admissions found.</div>
          )}
        </div>
      </div>

      {showOnboardChoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h3 className="font-display font-bold text-primary text-lg mb-2">Register New User</h3>
            <p className="text-gray-500 text-xs mb-6">Choose which type of user credentials you want to create and register for your school.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => { setShowOnboardChoice(false); navigate('/school-admin/teachers?openAddModal=true'); }} className="flex flex-col items-center gap-3 p-5 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-center">
                <span className="text-3xl">👩‍🏫</span>
                <span className="text-sm font-semibold text-primary">Teacher</span>
                <span className="text-2xs text-gray-400">Register faculty member</span>
              </button>
              <button onClick={() => { setShowOnboardChoice(false); navigate('/school-admin/students?openAddModal=true'); }} className="flex flex-col items-center gap-3 p-5 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-center">
                <span className="text-3xl">🎒</span>
                <span className="text-sm font-semibold text-primary">Student</span>
                <span className="text-2xs text-gray-400">Register student record</span>
              </button>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setShowOnboardChoice(false)} className="btn-outline text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SchoolAdminDashboard;
