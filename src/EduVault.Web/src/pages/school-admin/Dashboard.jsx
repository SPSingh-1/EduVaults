import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/apiClient';

const SchoolAdminDashboard=()=>{
  const navigate=useNavigate();
  const [showOnboardChoice, setShowOnboardChoice] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return(
    <div>
      <Topbar title="Dashboard Overview" subtitle="Welcome back, Principal. Here is your school's performance today." actions={
        <button onClick={() => setShowOnboardChoice(true)} className="btn-primary">+ Register User</button>
      }/>
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
