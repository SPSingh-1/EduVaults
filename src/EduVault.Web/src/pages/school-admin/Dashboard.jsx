import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';

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

const generateMockPaymentId = () => {
  return `sub_pay_mock_${Math.random().toString(36).substring(7)}`;
};

const SchoolAdminDashboard=()=>{
  const navigate=useNavigate();
  const [showOnboardChoice, setShowOnboardChoice] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/academics/stats');
        setStats(res.data);
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
      const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!scriptLoaded) {
        alert('Failed to load Razorpay SDK. Please check your internet connection.');
        setPaying(false);
        return;
      }

      // 1. Create order
      const orderRes = await apiClient.post('/billing/create-subscription-order');
      const { orderId, amount, currency, keyId, isMock } = orderRes.data;

      const userProfile = JSON.parse(localStorage.getItem('eduvault_user') || '{}');

      // 2. Options
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
            // 3. Verify signature
            await apiClient.post('/billing/verify-subscription-payment', {
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature || 'mock_signature'
            });
            alert('Platform subscription payment successful! All features unlocked.');
            // Refetch stats to update the dashboard banner
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
        theme: {
          color: "#1a2744"
        }
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
    } catch (err) {
      alert(err.response?.data?.error || 'Order creation failed.');
    } finally {
      setPaying(false);
    }
  };

  return(
    <div>
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
      } subtitle="Welcome back, Principal. Here is your school's performance today." actions={
        <button onClick={() => setShowOnboardChoice(true)} className="btn-primary">+ Register User</button>
      }/>

      {stats?.subscriptionStatus === 'pending' && (
        <div className="mb-6 p-3 rounded-xl bg-red-50/75 border border-red-200/60 text-red-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-bold text-xs">Platform Subscription Pending</div>
              <div className="text-[10px] text-red-600 font-light mt-0.5">
                Your school's platform subscription is currently pending payment. Pay the annual fee of <b>${stats.subscriptionAmount}</b> to activate all administrator tools.
              </div>
            </div>
          </div>
          <button 
            onClick={handlePaySubscription} 
            disabled={paying}
            className="btn-primary bg-red-600 hover:bg-red-700 border-none text-white font-bold py-1.5 px-4 rounded-lg transition-all shadow-sm shrink-0 text-xs"
          >
            {paying ? 'Processing...' : '💳 Pay Subscription'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {label:"Total Students",value: stats?.totalStudents ?? '0',sub:'Active enrollments',icon:'👥'},
          {label:'Total Teachers',value: stats?.totalTeachers ?? '0',sub:'Staff members',icon:'👩‍🏫'},
          {label:'Total Classes',value: stats?.totalClasses ?? '0',sub:'Sections defined',icon:'🏫'},
          {label:'Pending Dues',value: stats?.pendingFees ? `Rs. ${stats.pendingFees.toLocaleString()}` : 'Rs. 0',sub:'OVERDUE',icon:'💳',subColor:'text-red-500'},
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{s.label}</span>
              <span className="text-xl">{s.icon}</span>
            </div>
            <div className="font-display text-2xl font-bold text-primary">{s.value}</div>
            <div className={`text-xs mt-0.5 ${s.subColor||'text-gray-400'}`}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="card col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-primary">Recent Activity</h3>
            <button className="text-xs text-blue-600 font-semibold hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {stats?.recentAdmissions && stats.recentAdmissions.map((a,i)=>(
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                <span className="text-xl text-blue-500">👤</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-primary">{a.name}</div>
                    <div className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">New Student enrolled: {a.email}</div>
                </div>
              </div>
            ))}
            {(!stats?.recentAdmissions || stats.recentAdmissions.length === 0) && (
              <div className="text-xs text-gray-400 py-4 text-center">No recent admissions found.</div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-display font-semibold text-primary mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                {icon:'👤',title:'New Admission',desc:'Register a new student',path:'/school-admin/students?openAddModal=true'},
                {icon:'👩‍🏫',title:'Onboard Teacher',desc:'Register new faculty',path:'/school-admin/teachers?openAddModal=true'},
              ].map(a=>(
                <button key={a.title} onClick={()=>navigate(a.path)} className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left">
                  <span className="text-xl">{a.icon}</span>
                  <div><div className="text-sm font-semibold text-primary">{a.title}</div><div className="text-xs text-gray-400">{a.desc}</div></div>
                </button>
              ))}
            </div>
          </div>
          <div className="bg-primary rounded-xl p-5 text-white">
            <div className="text-xs text-blue-300 mb-1 flex items-center gap-1">🗓 Term Schedule</div>
            <div className="font-semibold">Academic Year 2023-24</div>
            <button className="mt-3 w-full bg-white text-primary font-semibold py-2 rounded-lg text-sm hover:bg-blue-50 transition-all">View Academic Calendar</button>
          </div>
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
