import { useState, useEffect } from 'react';
import { apiClient } from '../../../api/apiClient';
import { useToast } from '../../../contexts/ToastContext';

export default function PasswordRulesTab() {
  const { toast } = useToast();
  const [passwordRules, setPasswordRules] = useState({
    studentPasswordPattern: 'stu@currentyear!',
    teacherPasswordPattern: 'tea@currentyear!',
    receptionistPasswordPattern: 'rec@currentyear!',
    accountantPasswordPattern: 'acc@currentyear!'
  });
  const [passwordPreviews, setPasswordPreviews] = useState({
    student: 'sha@2026!',
    teacher: 'roh@2026!',
    receptionist: 'pri@2026!',
    accountant: 'ami@2026!'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPasswordRules = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/academics/settings/password-rules');
      if (res.data) {
        setPasswordRules({
          studentPasswordPattern: res.data.studentPasswordPattern || 'stu@currentyear!',
          teacherPasswordPattern: res.data.teacherPasswordPattern || 'tea@currentyear!',
          receptionistPasswordPattern: res.data.receptionistPasswordPattern || 'rec@currentyear!',
          accountantPasswordPattern: res.data.accountantPasswordPattern || 'acc@currentyear!'
        });
        if (res.data.previews) {
          setPasswordPreviews(res.data.previews);
        }
      }
    } catch (err) {
      console.warn('Could not load password rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswordRules();
  }, []);

  const evaluateLivePreview = (pattern, role) => {
    if (!pattern) return '';
    const yr = new Date().getFullYear().toString();
    const cleanSampleName = role === 'teacher' ? 'rohan' : role === 'receptionist' ? 'priya' : role === 'accountant' ? 'amit' : 'shashi';
    const name3 = cleanSampleName.slice(0, 3);
    const last3 = role === 'teacher' ? 'sha' : role === 'receptionist' ? 'ver' : role === 'accountant' ? 'pat' : 'kum';
    const birthYear = role === 'student' ? '2015' : '1990';
    const school3 = 'edu';

    let res = pattern;
    res = res.replace(/\{name3\}|\{first3\}/gi, name3);
    res = res.replace(/\{name\}|\{firstname\}/gi, cleanSampleName);
    res = res.replace(/\{lastname3\}|\{last3\}/gi, last3);
    res = res.replace(/\{school3\}/gi, school3);
    res = res.replace(/\{currentyear\}|\{year\}/gi, yr);
    res = res.replace(/\{birthyear\}|\{dobyear\}/gi, birthYear);
    res = res.replace(/\{stu\}|\{tea\}|\{rec\}|\{acc\}|\{role3\}/gi, name3);
    res = res.replace(/(?<=[\W_]|^)currentyear(?=[\W_]|$)/gi, yr);
    res = res.replace(/(?<=[\W_]|^)birthyear(?=[\W_]|$)/gi, birthYear);

    if (role === 'student' && /^stu(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^stu/i, name3);
    } else if (role === 'teacher' && /^tea(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^tea/i, name3);
    } else if (role === 'receptionist' && /^rec(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^rec/i, name3);
    } else if (role === 'accountant' && /^acc(?=[@#!$_\.\d])/i.test(res)) {
      res = res.replace(/^acc/i, name3);
    }
    return res;
  };

  const handleSavePasswordRules = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    try {
      const res = await apiClient.post('/academics/settings/password-rules', passwordRules);
      toast.success(res.data?.message || 'Password pattern rules saved successfully.');
      if (res.data?.previews) {
        setPasswordPreviews(res.data.previews);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save password rules.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPasswordRules = () => {
    setPasswordRules({
      studentPasswordPattern: 'stu@currentyear!',
      teacherPasswordPattern: 'tea@currentyear!',
      receptionistPasswordPattern: 'rec@currentyear!',
      accountantPasswordPattern: 'acc@currentyear!'
    });
    toast.info('Default password rules restored.');
  };

  const rolesConfig = [
    {
      role: 'student',
      title: 'Student Pattern',
      subtitle: 'Used for CSV import & online admissions onboarding',
      icon: '🎓',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      sampleName: 'Shashi Kumar (DOB: 2015)',
      field: 'studentPasswordPattern',
      color: 'blue'
    },
    {
      role: 'teacher',
      title: 'Teacher & Faculty Pattern',
      subtitle: 'Used for teacher directory imports & invitations',
      icon: '👩‍🏫',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      sampleName: 'Rohan Sharma',
      field: 'teacherPasswordPattern',
      color: 'emerald'
    },
    {
      role: 'accountant',
      title: 'Account Manager Pattern',
      subtitle: 'Used for Finance & Fee desk creation',
      icon: '💼',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
      sampleName: 'Amit Patel',
      field: 'accountantPasswordPattern',
      color: 'purple'
    },
    {
      role: 'receptionist',
      title: 'Receptionist & Front Desk Pattern',
      subtitle: 'Used for Receptionist profile generation',
      icon: '🏢',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      sampleName: 'Priya Verma',
      field: 'receptionistPasswordPattern',
      color: 'amber'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Overview & Subsystem Banner */}
      <div className="card bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner shrink-0">
              🔐
            </div>
            <div>
              <h3 className="font-display font-bold text-primary text-lg flex items-center gap-2">
                Dynamic Password Generation Rules
                <span className="badge badge-success text-[10px] font-bold py-0.5 px-2">Active & Enforced</span>
              </h3>
              <p className="text-gray-500 text-xs mt-0.5">
                Configure unified auto-generation formulas applied automatically across all 3 school onboarding workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleResetPasswordRules}
              className="px-3 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold text-xs transition"
            >
              ↺ Reset Defaults
            </button>
            <button
              type="button"
              onClick={handleSavePasswordRules}
              disabled={saving}
              className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-md shadow-primary/20"
            >
              {saving ? (
                <>
                  <span className="animate-spin text-sm">⏳</span> Saving Rules...
                </>
              ) : (
                <>
                  <span>💾</span> Save Password Rules
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subsystems Sync Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100/70 flex items-center gap-3">
            <span className="text-xl">📁</span>
            <div>
              <div className="text-[11px] font-bold text-blue-900">Bulk CSV Data Import</div>
              <div className="text-[10px] text-blue-600">/school-admin/data-import</div>
            </div>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100/70 flex items-center gap-3">
            <span className="text-xl">👥</span>
            <div>
              <div className="text-[11px] font-bold text-emerald-900">Quick Student CSV Roster</div>
              <div className="text-[10px] text-emerald-600">/school-admin/students</div>
            </div>
          </div>
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100/70 flex items-center gap-3">
            <span className="text-xl">📝</span>
            <div>
              <div className="text-[11px] font-bold text-purple-900">Admission Inquiry Approvals</div>
              <div className="text-[10px] text-purple-600">/school-admin/admissions</div>
            </div>
          </div>
        </div>

        {/* Dynamic Tokens Legend */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span>💡 Available Dynamic Substitution Tokens:</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
              <b className="text-primary font-bold">{"{name3}"}</b>: First 3 letters of first name (e.g. Shashi → sha)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
              <b className="text-primary font-bold">{"{lastname3}"}</b>: First 3 letters of last name (e.g. Kumar → kum)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
              <b className="text-primary font-bold">{"{currentyear}"}</b>: Active 4-digit year (e.g. 2026)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
              <b className="text-primary font-bold">{"{birthyear}"}</b>: Year of birth (e.g. 2015)
            </span>
          </div>
        </div>
      </div>

      {/* Rules Config Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rolesConfig.map(cfg => (
          <div key={cfg.role} className="card bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4 hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-lg font-bold">
                  {cfg.icon}
                </span>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{cfg.title}</h4>
                  <p className="text-[11px] text-gray-400">{cfg.subtitle}</p>
                </div>
              </div>
              <span className={`badge ${cfg.badgeColor} font-mono text-[11px]`}>
                Role: {cfg.role}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Pattern Formula
              </label>
              <input
                type="text"
                value={passwordRules[cfg.field] || ''}
                onChange={e => setPasswordRules(r => ({ ...r, [cfg.field]: e.target.value }))}
                placeholder="pattern@currentyear!"
                className="input font-mono text-sm py-2.5 px-3 bg-white border border-gray-200 focus:border-primary rounded-xl w-full"
              />
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[10px] text-gray-400 font-medium">Quick Insert:</span>
                {['{name3}', '{lastname3}', '{currentyear}', '{birthyear}', '!', '@', '#'].map(tok => (
                  <button
                    key={tok}
                    type="button"
                    onClick={() => setPasswordRules(r => ({ ...r, [cfg.field]: (r[cfg.field] || '') + tok }))}
                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold transition"
                  >
                    +{tok}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Dynamic Preview */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500">
                  Live Sample Preview
                </div>
                <div className="text-xs text-gray-600 mt-0.5">
                  Sample: <span className="font-semibold text-gray-800">{cfg.sampleName}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono font-black text-sm text-primary bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm inline-block">
                  {evaluateLivePreview(passwordRules[cfg.field], cfg.role) || passwordPreviews[cfg.role]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Save Bar */}
      <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>🛡️</span>
          <span>All passwords created dynamically enforce salted encryption before being stored in the database.</span>
        </div>
        <button
          type="button"
          onClick={handleSavePasswordRules}
          disabled={saving}
          className="btn-primary text-xs py-2.5 px-6 flex items-center gap-2 shadow-md shadow-primary/20 shrink-0 w-full sm:w-auto justify-center"
        >
          {saving ? 'Saving Changes...' : 'Save Password Rules'}
        </button>
      </div>
    </div>
  );
}
