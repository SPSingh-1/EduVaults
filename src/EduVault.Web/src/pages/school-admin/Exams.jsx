import Topbar from '../../components/layout/Topbar';
const exams=[
  {id:'MAT-2023-7',subject:'Advanced Mathematics',grade:'Grade 10-A',date:'Oct 24, 2023',proctor:'Mr. Robert Smith',status:'SCHEDULED'},
  {id:'PHY-1204-5',subject:'Theoretical Physics',grade:'Grade 12-C',date:'Oct 25, 2023',proctor:'Mrs. Diane Davis',status:'ONGOING'},
  {id:'HIS-8007-A',subject:'Modern World History',grade:'Grade 9-B',date:'Oct 26, 2023',proctor:'Mr. James Wilson',status:'DRAFT'},
  {id:'BIO-1100-M',subject:'Marine Biology',grade:'Grade 11-A',date:'Oct 27, 2023',proctor:'Ms. Emily Lee',status:'SCHEDULED'},
];
const sc={SCHEDULED:'badge-info',ONGOING:'badge-warning',DRAFT:'badge-gray'};
const Exams=()=>(
  <div>
    <Topbar title="Exams & Report Cards" actions={<div className="flex gap-2"><button className="btn-outline text-xs">⚙ Grade Config</button><button className="btn-primary text-xs">📄 Generate Report Cards</button></div>}/>
    <div className="grid grid-cols-3 gap-4 mb-6">
      {[{l:'Pending Results',v:'14 Classes',s:'-2% vs last term',c:'text-yellow-600'},{l:'Ready for Report Cards',v:'850 Students',s:'+10% vs last term',c:'text-green-600'},{l:'Upcoming Exams',v:'12 Subjects',s:'Active Cycle',c:'text-blue-600'}].map(s=>(
        <div key={s.l} className="stat-card"><div className="text-xs text-gray-500 mb-1">{s.l}</div><div className={`font-display text-2xl font-bold ${s.c}`}>{s.v}</div><div className="text-xs text-gray-400">{s.s}</div></div>
      ))}
    </div>
    <div className="card mb-6">
      <div className="flex gap-4 border-b border-gray-100 mb-4">
        {['Exam Schedule','Result Approvals','Grade Configuration'].map((t,i)=>(
          <button key={t} className={`pb-3 text-sm font-medium flex items-center gap-1.5 transition-all ${i===0?'text-primary border-b-2 border-primary':'text-gray-500 hover:text-primary'}`}>{t}{i===1&&<span className="bg-orange-500 text-white text-xs px-1.5 rounded-full">10</span>}</button>
        ))}
      </div>
      <table className="w-full">
        <thead><tr className="border-b border-gray-100"><th className="table-th">Subject & ID</th><th className="table-th">Grade Level</th><th className="table-th">Exam Date</th><th className="table-th">Proctor</th><th className="table-th">Status</th><th className="table-th">Actions</th></tr></thead>
        <tbody>{exams.map(e=>(
          <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
            <td className="table-td"><div className="font-semibold text-primary">{e.subject}</div><div className="text-xs text-gray-400 font-mono">{e.id}</div></td>
            <td className="table-td text-sm">{e.grade}</td>
            <td className="table-td text-sm text-gray-500">🗓 {e.date}</td>
            <td className="table-td"><div className="flex items-center gap-2 text-sm"><div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">{e.proctor.split(' ')[1][0]}</div>{e.proctor}</div></td>
            <td className="table-td"><span className={sc[e.status]}>{e.status}</span></td>
            <td className="table-td"><div className="flex gap-2"><button className="text-gray-400 text-sm">✏</button><button className="text-gray-400 text-sm">⋮</button></div></td>
          </tr>
        ))}</tbody>
      </table>
      <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <span>Showing 1-4 of 24 assessments</span>
        <div className="flex gap-2"><button className="btn-outline py-1 text-xs">Previous</button><button className="btn-primary py-1 text-xs">Next</button></div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-primary">Recent Result Submissions</h3><button className="text-xs text-blue-600 hover:underline">View All Queue</button></div>
        <div className="space-y-3">
          {[{s:'Chemistry Final - Grade 11',sub:'Dr. Watson',ago:'3h ago'},{s:'Literature Analysis - Grade 9',sub:'Mr. Bennett',ago:'3h ago'}].map(r=>(
            <div key={r.s} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">📄</div>
              <div className="flex-1"><div className="text-sm font-medium text-primary">{r.s}</div><div className="text-xs text-gray-400">Submitted by {r.sub} · {r.ago}</div></div>
              <div className="flex gap-2"><button className="btn-primary text-xs py-1 px-3">APPROVE</button><button className="btn-outline text-xs py-1 px-3">REVIEW</button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold text-primary mb-4">Report Card Hub</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">SELECT TERM</label><select className="input text-xs"><option>Fall Term 2023</option></select></div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1.5">GRADE GROUP</label><select className="input text-xs"><option>Middle School (8-9)</option></select></div>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">ℹ 85% of results for High School have been approved. You can generate partial reports or wait for full compilation.</div>
        <div className="space-y-2">
          <button className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-primary-light transition-all flex items-center justify-center gap-2">🖨 Bulk Generate PDF Reports</button>
          <button className="w-full border border-gray-200 text-primary py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2">📧 Send Digital Reports to Parents</button>
        </div>
      </div>
    </div>
  </div>
);
export default Exams;
