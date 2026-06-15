import Topbar from '../../components/layout/Topbar';
const tickets=[
  {id:'#TK-8821',title:'SSO Login failure for faculty staff',school:'Lincoln High School',status:'IN PROGRESS',priority:'HIGH'},
  {id:'#TK-8794',title:'Bulk student data import error',school:'Westside Academy',status:'OPEN',priority:'MEDIUM'},
  {id:'#TK-8750',title:'Billing period update request',school:'Elite Grove Prep',status:'RESOLVED',priority:'LOW'},
];
const statusColor={OPEN:'badge-warning','IN PROGRESS':'badge-info',RESOLVED:'badge-success'};
const priorityColor={HIGH:'text-red-600 bg-red-50',MEDIUM:'text-yellow-600 bg-yellow-50',LOW:'text-gray-600 bg-gray-100'};
const Support=()=>(
  <div>
    <Topbar title="Support & Help Desk" />
    <div className="grid grid-cols-4 gap-4 mb-6">
      {[{label:'Open Tickets',value:'42',note:'-5%',color:'text-blue-600'},{label:'Avg. Response',value:'1.5h',note:'-10%',color:'text-green-600'},{label:'System Uptime',value:'99.9%',note:'Stable',color:'text-purple-600'},{label:'Critical Issues',value:'02',note:'Low Risk',color:'text-red-600'}].map(s=>(
        <div key={s.label} className="stat-card"><div className="text-xs text-gray-500 mb-1">{s.label}</div><div className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-gray-400">{s.note}</div></div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-6">
      <div className="card col-span-2">
        <div className="flex items-center justify-between mb-4"><h3 className="font-display font-semibold text-primary">Active Support Tickets</h3><button className="btn-primary text-xs">+ New Ticket</button></div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-100"><th className="table-th">Ticket</th><th className="table-th">Submitter/School</th><th className="table-th">Status</th><th className="table-th">Priority</th></tr></thead>
          <tbody>{tickets.map(t=>(
            <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="table-td"><div className="font-semibold text-primary text-xs">{t.id}</div><div className="text-xs text-gray-500">{t.title}</div></td>
              <td className="table-td text-xs text-gray-500">{t.school}</td>
              <td className="table-td"><span className={statusColor[t.status]}>{t.status}</span></td>
              <td className="table-td"><span className={`badge ${priorityColor[t.priority]}`}>{t.priority}</span></td>
            </tr>
          ))}</tbody>
        </table>
        <div className="mt-4 border-t border-gray-100 pt-4">
          <h4 className="font-semibold text-primary text-sm mb-3">Knowledge Base Management</h4>
          <div className="grid grid-cols-3 gap-3">
            {[['📋','Onboarding Guide','51 Articles'],['💳','Billing & Licenses','8 Articles'],['🔧','Troubleshooting','34 Articles']].map(([i,t,c])=>(
              <div key={t} className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-all"><div className="text-xl mb-1">{i}</div><div className="text-xs font-semibold text-primary">{t}</div><div className="text-xs text-gray-400">{c}</div></div>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="card">
          <h3 className="font-semibold text-primary text-sm mb-3">Quick Utility — Reset Password</h3>
          <input placeholder="admin@school.edu" className="input text-xs mb-2" />
          <button className="w-full bg-primary text-white py-2 rounded-lg text-xs font-semibold hover:bg-primary-light transition-all">GENERATE TEMP PASSWORD</button>
        </div>
        <div className="card">
          <h3 className="font-semibold text-primary text-sm mb-3">Recent System Events</h3>
          <div className="space-y-2">
            {[['🟢','Backup Completed','Weekly snapshot stored'],['🟡','New School Admin','Lakeside Academy registered'],['🔴','API Latency Spike','Auth service slow response']].map(([i,t,d])=>(
              <div key={t} className="flex items-start gap-2"><span>{i}</span><div><div className="text-xs font-medium text-primary">{t}</div><div className="text-xs text-gray-400">{d}</div></div></div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-xs font-semibold text-green-700">SYSTEM STATUS: Healthy</span></div>
          <div className="text-xs text-gray-400">System uptime: 99.9% — All services operational</div>
        </div>
      </div>
    </div>
  </div>
);
export default Support;
