import { useState } from 'react';
import Topbar from '../../components/layout/Topbar';
const logs=[
  {time:'2025-03-15 14:32:01',user:'Super Admin',action:'Login',category:'SECURITY',status:'Success'},
  {time:'2025-03-15 11:20:15',user:'Super Admin',action:'Settings Update',category:'SETTINGS',status:'Success'},
  {time:'2025-03-14 23:55:40',user:'System Bot',action:'Auto-backup completed',category:'SYSTEM',status:'Success'},
  {time:'2025-03-14 16:45:12',user:'Security Lead',action:'Access Denied — Audit Export',category:'SECURITY',status:'Failed'},
];
const catColor={SECURITY:'bg-red-100 text-red-600',SETTINGS:'bg-blue-100 text-blue-600',SYSTEM:'bg-purple-100 text-purple-600'};
const Settings=()=>{
  const [orgName,setOrgName]=useState('SuperAdmin Global');
  const [maintenance,setMaintenance]=useState(false);
  return(
    <div>
      <Topbar title="Platform Settings" />
      <div className="card mb-6">
        <h3 className="font-display font-semibold text-primary mb-1">Branding Configuration</h3>
        <p className="text-xs text-gray-400 mb-5">Customize the look and feel of your platform.</p>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Platform Logo</label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">🖼</div>
              <div className="text-xs text-gray-400 mb-2">PNG, SVG or JPG (max. 2MB)</div>
              <button className="text-xs text-blue-600 font-semibold hover:underline">Change Logo</button>
            </div>
          </div>
          <div className="space-y-4">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Organization Name</label><input value={orgName} onChange={e=>setOrgName(e.target.value)} className="input" /></div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Primary Brand Color</label>
              <div className="flex gap-2">{['#1a2744','#2563eb','#16a34a','#dc2626','#d97706','#9333ea'].map(c=>(
                <div key={c} className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow-sm hover:scale-110 transition-transform" style={{background:c}}></div>
              ))}<div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 cursor-pointer">+</div></div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="font-semibold text-primary mb-1">Maintenance Mode</h3>
          <p className="text-xs text-gray-400 mb-4">Prevent users from accessing the platform</p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-primary">Enable Maintenance</span>
            <button onClick={()=>setMaintenance(!maintenance)} className={`w-12 h-6 rounded-full transition-all ${maintenance?'bg-primary':'bg-gray-200'} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${maintenance?'left-6.5 left-[26px]':'left-0.5'}`}></div>
            </button>
          </div>
          <textarea rows={3} defaultValue="Scheduled maintenance in progress. We'll be back shortly." className="input text-xs resize-none mb-2" />
          {maintenance && <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-700">⚠ Enabling this will log out all current users except admins.</div>}
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-1"><h3 className="font-semibold text-primary">Backup Schedule</h3><button className="btn-outline text-xs py-1">Manual Backup</button></div>
          <p className="text-xs text-gray-400 mb-4">Automated system and database backups</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Frequency</label>
              <select className="input text-xs"><option>Daily</option><option>Weekly</option></select></div>
            <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">Time (UTC)</label><input defaultValue="02:00 AM" className="input text-xs" /></div>
          </div>
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2"><span>☁</span><span className="text-xs font-medium text-blue-700">Amazon S3: production-vault-01</span></div>
            <button className="text-xs text-blue-600 font-semibold hover:underline">Edit</button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div><h3 className="font-semibold text-primary">Audit Logs</h3><p className="text-xs text-gray-400">Recent system-wide administrative actions</p></div>
          <div className="flex gap-2"><input placeholder="Search logs..." className="input text-xs w-40" /><button className="btn-outline text-xs py-1.5">↓ Export CSV</button></div>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-100"><th className="table-th">Timestamp</th><th className="table-th">User</th><th className="table-th">Action</th><th className="table-th">Category</th><th className="table-th">Status</th></tr></thead>
          <tbody>{logs.map((l,i)=>(
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="table-td text-xs text-gray-500 font-mono">{l.time}</td>
              <td className="table-td font-medium text-primary text-xs">{l.user}</td>
              <td className="table-td text-xs text-gray-600">{l.action}</td>
              <td className="table-td"><span className={`badge ${catColor[l.category]||'badge-gray'}`}>{l.category}</span></td>
              <td className="table-td"><span className={l.status==='Success'?'badge-success':'badge-danger'}>{l.status}</span></td>
            </tr>
          ))}</tbody>
        </table>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          <button className="btn-outline text-xs py-1.5">Discard Changes</button>
          <button className="btn-primary text-xs py-1.5">Save Changes</button>
        </div>
      </div>
    </div>
  );
};
export default Settings;
