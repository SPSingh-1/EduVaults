import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { registerSchool } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    schoolName: '',
    address: '',
    city: '',
    website: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    adminPhone: '',
    jobTitle: 'Principal / Headmaster'
  });
  const [done, setDone] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setLoading(true);
    setError('');
    const res = await registerSchool(form);
    setLoading(false);
    if (res.success) {
      setSchoolCode(res.data.schoolCode);
      setDone(true);
    } else {
      setError(res.error || 'Registration failed.');
    }
  };

  if (done) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center border-t-4 border-orange-500">
        <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✅</div>
        <h2 className="font-display text-2xl font-bold text-primary mb-2">School Successfully Registered!</h2>
        <p className="text-gray-500 text-sm mb-4">The registration for <strong>{form.schoolName || 'Oakwood International Academy'}</strong> has been completed.</p>
        <div className="bg-orange-50 rounded-xl p-4 mb-6 border border-orange-200">
          <div className="text-xs text-orange-600 font-semibold mb-1">GENERATED SCHOOL ID</div>
          <div className="font-display text-2xl font-bold text-orange-600">{schoolCode}</div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/login')} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl transition-all text-sm">📧 Back to Login</button>
          <button onClick={() => navigate('/login')} className="flex-1 border-2 border-primary text-primary font-semibold py-3 rounded-xl hover:bg-primary/5 transition-all text-sm">🏫 Sign In</button>
        </div>
        <p className="text-xs text-gray-400 mt-4">Use your administrator email and password to log in.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-primary px-8 py-6">
            <div className="flex items-center gap-3 text-white mb-4">
              <span className="text-2xl"><img src="/logo.jpeg" alt="EduVault Logo" className="w-12 h-12 rounded-full" /></span>
              <span className="font-display font-bold text-xl">EduVault</span>
              <span className="text-sm text-blue-300 ml-2">Admin Portal</span>
            </div>
            <h2 className="font-display text-2xl font-bold text-white mb-1">Register New School</h2>
            <p className="text-blue-200 text-sm">Enter the required information to onboard a new educational institution.</p>
          </div>
          <div className="p-8">
            <div className="mb-6">
              <div className="flex items-center gap-4 text-sm">
                {['School Details','Primary Administrator','Subscription'].map((s,i)=>(
                  <div key={s} className={`flex items-center gap-2 ${step > i+1 ? 'text-green-600' : step === i+1 ? 'text-primary font-semibold' : 'text-gray-400'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > i+1 ? 'bg-green-100 text-green-600' : step === i+1 ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>{step > i+1 ? '✓' : i+1}</div>
                    {s}
                    {i < 2 && <span className="text-gray-300">—</span>}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">
                ⚠️ {error}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-primary flex items-center gap-2">🏢 School Details</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Name *</label>
                  <input value={form.schoolName} onChange={e => update('schoolName', e.target.value)} placeholder="e.g. Greenwood Academy" className="input" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address Line 1 *</label>
                    <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Street address, P.O. box" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">City / State *</label>
                    <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="City, State, Zip" className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Website</label>
                  <input value={form.website} onChange={e => update('website', e.target.value)} placeholder="https://www.schoolname.edu" className="input" />
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-primary flex items-center gap-2">👤 Primary Administrator</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                    <input value={form.adminName} onChange={e => update('adminName', e.target.value)} placeholder="e.g. Dr. Sarah Jenkins" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Work Email *</label>
                    <input type="email" value={form.adminEmail} onChange={e => update('adminEmail', e.target.value)} placeholder="admin@schoolname.edu" className="input" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password *</label>
                    <input type="password" value={form.adminPassword} onChange={e => update('adminPassword', e.target.value)} placeholder="••••••••" className="input" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                    <input value={form.adminPhone} onChange={e => update('adminPhone', e.target.value)} placeholder="+1 (555) 000-0000" className="input" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Job Title</label>
                  <select value={form.jobTitle} onChange={e => update('jobTitle', e.target.value)} className="input">
                    <option>Principal / Headmaster</option>
                    <option>Vice Principal</option>
                    <option>Administrator</option>
                  </select>
                </div>
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-primary flex items-center gap-2">💳 Choose Subscription Plan</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[['Standard','$499/mo','Up to 500 students, All core features'],['Enterprise','Custom','Unlimited students, Premium features + API']].map(([p,price,desc])=>(
                    <div key={p} className="border-2 border-primary/20 rounded-xl p-4 cursor-pointer hover:border-primary bg-primary/5 transition-all">
                      <div className="font-display font-bold text-primary text-lg">{p}</div>
                      <div className="text-accent font-bold">{price}</div>
                      <div className="text-xs text-gray-500 mt-1">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              <button onClick={() => step > 1 ? setStep(s => s-1) : navigate('/login')} className="btn-outline">← {step > 1 ? 'Previous' : 'Back to Login'}</button>
              {step < 3
                ? <button onClick={() => setStep(s => s+1)} className="btn-primary">Next Step →</button>
                : <button onClick={submit} disabled={loading} className="btn-primary bg-green-600 hover:bg-green-700 flex items-center gap-2">
                    {loading ? <span className="animate-spin">⟳</span> : null}
                    {loading ? 'Registering...' : '✓ Register School'}
                  </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
