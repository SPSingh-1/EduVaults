import { useState } from 'react';
import Topbar from '../../components/layout/Topbar';
const apps=[
  {id:'#ADM-2023-001',name:'Jane Cooper',email:'jc@example.com',grade:'Grade 10',date:'Oct 24, 2023',status:'Approved'},
  {id:'#ADM-2023-002',name:'Hanna Wright',email:'hw@example.com',grade:'Grade 8',date:'Oct 26, 2023',status:'Pending'},
  {id:'#ADM-2023-003',name:'Tom Wilson',email:'tw@example.com',grade:'Grade 12',date:'Oct 28, 2023',status:'Under Review'},
  {id:'#ADM-2023-004',name:'Amy Stone',email:'as@example.com',grade:'Grade 9',date:'Oct 30, 2023',status:'Rejected'},
  {id:'#ADM-2023-005',name:'John Doe',email:'jd@example.com',grade:'Grade 1',date:'Nov 01, 2023',status:'Pending'},
];
const sc={Approved:'badge-success',Pending:'badge-warning','Under Review':'badge-info',Rejected:'badge-danger'};
const Admissions=()=>{
  const [tab,setTab]=useState('All Applications');
  const tabs=['All Applications','Pending Review','Approved','Rejected'];
  const filtered=tab==='All Applications'?apps:apps.filter(a=>a.status===(tab==='Pending Review'?'Pending':tab));
  return(
    <div>
      <Topbar title="Application Overview" subtitle="Admission Management" actions={
        <div className="flex gap-2">
          <button className="btn-outline text-xs">↓ Export CSV</button>
          <button className="btn-primary text-xs">+ Manual Entry</button>
        </div>
      }/>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[{l:'Total Applications',v:'1,240',s:'+12%',c:'text-blue-600'},{l:'Pending Reviews',v:'45',s:'4 Pending',c:'text-yellow-600'},{l:'Approved',v:'850',s:'Last 30d',c:'text-green-600'},{l:'Rejected',v:'345',s:'-2%',c:'text-red-600'}].map(s=>(
          <div key={s.l} className="stat-card"><div className="text-xs text-gray-500 mb-1">{s.l}</div><div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-xs text-gray-400">{s.s}</div></div>
        ))}
      </div>
      <div className="card">
        <div className="flex items-center gap-4 mb-5">
          <div className="flex-1 relative"><input placeholder="Search by Student Name or ID..." className="input pl-9"/><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span></div>
          <select className="input w-32"><option>All Status</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
        </div>
        <div className="flex gap-1 mb-4 border-b border-gray-100">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`px-4 py-2 text-sm font-medium transition-all ${tab===t?'text-primary border-b-2 border-primary':'text-gray-500 hover:text-primary'}`}>{t}</button>)}</div>
        <table className="w-full">
          <thead><tr className="border-b border-gray-100"><th className="table-th">Application ID</th><th className="table-th">Student Name</th><th className="table-th">Applied Grade</th><th className="table-th">Submission Date</th><th className="table-th">Status</th><th className="table-th">Actions</th></tr></thead>
          <tbody>{filtered.map(a=>(
            <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="table-td text-xs font-mono text-gray-500">{a.id}</td>
              <td className="table-td"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{a.name.split(' ').map(n=>n[0]).join('')}</div><div><div className="font-medium text-sm">{a.name}</div><div className="text-xs text-gray-400">{a.email}</div></div></div></td>
              <td className="table-td text-sm">{a.grade}</td>
              <td className="table-td text-sm text-gray-400">{a.date}</td>
              <td className="table-td"><span className={sc[a.status]}>{a.status}</span></td>
              <td className="table-td">
                {a.status==='Pending'&&<button className="text-xs text-blue-600 font-semibold hover:underline">Review ›</button>}
                {a.status==='Approved'&&<button className="text-xs text-green-600 font-semibold hover:underline">View Details</button>}
                {a.status==='Rejected'&&<button className="text-xs text-gray-500 font-semibold hover:underline">History</button>}
                {a.status==='Under Review'&&<button className="text-xs text-yellow-600 font-semibold hover:underline">In Review</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">Showing 1 to {filtered.length} of 1,240 applications</div>
          <div className="flex gap-1">{[1,2,3,'...',124].map((p,i)=><button key={i} className={`w-8 h-8 rounded-lg text-xs ${p===1?'bg-primary text-white':'text-gray-500 hover:bg-gray-100'}`}>{p}</button>)}</div>
        </div>
      </div>
    </div>
  );
};
export default Admissions;
