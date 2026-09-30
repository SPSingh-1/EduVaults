import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../../api/apiClient';

// ─── Color tokens (EduVault Native Light Theme) ──────────────────────────────
const COLORS = {
  primary:   '#7C3AED', // EduVault Purple
  secondary: '#10B981', // Emerald
  accent:    '#EF4444', // Rose
  warning:   '#F59E0B', // Amber
  info:      '#3B82F6', // Blue
  surface1:  '#FFFFFF',
  surface2:  '#F8FAFC',
  border:    '#E2E8F0',
  text:      '#0F172A',
  muted:     '#64748B',
};

const LEAVE_TYPE_COLORS = {
  CL:  '#3B82F6', SL: '#F59E0B', EL: '#10B981', ML: '#EC4899',
  PL:  '#7C3AED', CO: '#8B5CF6', LWP: '#EF4444', WFH: '#06B6D4',
  OD:  '#D97706', COMP: '#F43F5E', DEFAULT: '#64748B',
};

const STATUS_COLORS = {
  Pending:             { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' },
  ForwardedToAccounts: { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE' },
  Approved:            { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' },
  Rejected:            { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' },
  Cancelled:           { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
  Revoked:             { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' },
};

// ─── Utility ──────────────────────────────────────────────────────────────────
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtNum  = n => typeof n === 'number' ? n.toFixed(1) : (n || '0.0');

// ─── Sub-components ──────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display:'flex', justifyContent:'center', alignItems:'center', padding:'60px' }}>
    <div style={{ width:40, height:40, borderRadius:'50%', border:`3px solid ${COLORS.border}`, borderTopColor:COLORS.primary, animation:'spin 0.8s linear infinite' }} />
  </div>
);

const Badge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  const label = status === 'ForwardedToAccounts' ? 'Forwarded to Accounts' : status;
  return (
    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:s.bg, color:s.text, border:`1px solid ${s.border}` }}>
      {label}
    </span>
  );
};

const LeaveTypeDot = ({ code }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontWeight:600, color:COLORS.text }}>
    <span style={{ width:8, height:8, borderRadius:'50%', background: LEAVE_TYPE_COLORS[code] || LEAVE_TYPE_COLORS.DEFAULT }} />
    {code}
  </span>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: '#FFFFFF',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: '24px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    ...style
  }}>
    {children}
  </div>
);

const StatCard = ({ label, value, color, icon, sub }) => (
  <div style={{
    background: '#FFFFFF',
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: '20px 22px',
    display:'flex', alignItems:'center', gap:16,
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0,0,0,0.05)'; }}
  >
    <div style={{ width:48, height:48, borderRadius:12, background:`${color}15`, color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize:24, fontWeight:700, color:COLORS.text, letterSpacing:-0.5 }}>{value}</div>
      <div style={{ fontSize:12, color:COLORS.muted, marginTop:2, fontWeight:500 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:COLORS.secondary, marginTop:2, fontWeight:600 }}>{sub}</div>}
    </div>
  </div>
);

const Btn = ({ children, onClick, variant='primary', size='md', disabled, style={} }) => {
  const variants = {
    primary:  { background:`linear-gradient(135deg,${COLORS.primary},#6D28D9)`, color:'#fff', border:'none', boxShadow:'0 1px 2px rgba(0,0,0,0.05)' },
    secondary:{ background:`#ECFDF5`, color:'#065F46', border:`1px solid #A7F3D0` },
    danger:   { background:`#FFF1F2`, color:'#9F1239', border:`1px solid #FECDD3` },
    ghost:    { background:'transparent', color:COLORS.muted, border:`1px solid ${COLORS.border}` },
    success:  { background:`#ECFDF5`, color:'#065F46', border:`1px solid #A7F3D0` },
    warning:  { background:`#FFFBEB`, color:'#92400E', border:`1px solid #FDE68A` },
  };
  const sizes = { sm:{padding:'6px 14px', fontSize:12, borderRadius:8}, md:{padding:'10px 20px', fontSize:13, borderRadius:10}, lg:{padding:'13px 28px', fontSize:14, borderRadius:12} };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...variants[variant], ...sizes[size], fontWeight:600, cursor:disabled?'not-allowed':'pointer', opacity:disabled?0.5:1, transition:'all 0.2s', ...style }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = '0.85')}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  );
};

const Input = ({ label, value, onChange, type='text', placeholder, style={}, required, min, max, step }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:6, ...style }}>
    {label && <label style={{ fontSize:12, color:COLORS.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{label}{required && <span style={{color:COLORS.accent}}> *</span>}</label>}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min} max={max} step={step}
      style={{
        background: '#FFFFFF',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 10,
        padding: '10px 14px',
        color: COLORS.text,
        fontSize: 13,
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = COLORS.primary}
      onBlur={e => e.target.style.borderColor = COLORS.border}
    />
  </div>
);

const Select = ({ label, value, onChange, options = [], style={}, required }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:6, ...style }}>
    {label && <label style={{ fontSize:12, color:COLORS.muted, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{label}{required && <span style={{color:COLORS.accent}}> *</span>}</label>}
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background:'#FFFFFF', border:`1px solid ${COLORS.border}`, borderRadius:10,
        padding:'10px 14px', color:COLORS.text, fontSize:13, outline:'none',
        width:'100%', cursor:'pointer',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const Toggle = ({ label, checked, onChange, desc }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0', borderBottom:`1px solid ${COLORS.border}` }}>
    <div>
      <div style={{ fontSize:13, color:COLORS.text, fontWeight:500 }}>{label}</div>
      {desc && <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>{desc}</div>}
    </div>
    <div
      onClick={() => onChange(!checked)}
      style={{
        width:44, height:24, borderRadius:12, cursor:'pointer', transition:'all 0.3s',
        background: checked ? COLORS.primary : '#E2E8F0',
        border: `1px solid ${checked ? COLORS.primary : COLORS.border}`,
        position:'relative', flexShrink:0,
      }}
    >
      <div style={{
        position:'absolute', top:2, left: checked ? 22 : 2,
        width:18, height:18, borderRadius:'50%', background:'#fff',
        transition:'left 0.3s', boxShadow:'0 2px 4px rgba(0,0,0,0.15)',
      }} />
    </div>
  </div>
);

// ─── Balance Progress Bar ─────────────────────────────────────────────────────
const LeaveBalanceBar = ({ bal }) => {
  const pct = bal.totalAvailable > 0 ? Math.min(100, (bal.totalUsed / bal.totalAvailable) * 100) : 0;
  const color = LEAVE_TYPE_COLORS[bal.leaveTypeCode] || LEAVE_TYPE_COLORS.DEFAULT;
  return (
    <div style={{ background:COLORS.surface2, border:`1px solid ${COLORS.border}`, borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:color, flexShrink:0 }} />
          <span style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>{bal.leaveTypeName}</span>
          <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, background:`${color}20`, color, border:`1px solid ${color}40` }}>{bal.leaveTypeCode}</span>
          {!bal.isPaid && <span style={{ fontSize:10, color:COLORS.warning }}>Unpaid</span>}
        </div>
        <span style={{ fontSize:18, fontWeight:700, color }}>{fmtNum(bal.remaining)}</span>
      </div>
      <div style={{ height:6, borderRadius:3, background:COLORS.border, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:3, background:color, transition:'width 0.8s ease' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:COLORS.muted }}>
        <span>Accrued: <b style={{color:COLORS.text}}>{fmtNum(bal.totalAccrued)}</b></span>
        <span>Used: <b style={{color:COLORS.accent}}>{fmtNum(bal.totalUsed)}</b></span>
        <span>Pending: <b style={{color:COLORS.warning}}>{fmtNum(bal.pendingUsed)}</b></span>
        <span style={{color:COLORS.secondary}}>Remaining: <b>{fmtNum(bal.remaining)}</b></span>
      </div>
      {bal.carryForward > 0 && (
        <div style={{ fontSize:11, color:COLORS.info }}>↩ Carry Forward: {fmtNum(bal.carryForward)} days</div>
      )}
    </div>
  );
};

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id:'dashboard',   label:'Dashboard',       icon:'📊' },
  { id:'policies',    label:'Leave Policies',  icon:'📋' },
  { id:'holidays',    label:'Holiday Calendar',icon:'🗓️' },
  { id:'balances',    label:'Staff Balances',  icon:'⚖️' },
  { id:'requests',    label:'Leave Requests',  icon:'📨' },
  { id:'analytics',   label:'Analytics',       icon:'📈' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HRM MODULE
// ═══════════════════════════════════════════════════════════════════════════════
export default function HRMModule({ roleContext = 'accountant' }) {
  const [tab, setTab] = useState('dashboard');
  const [year, setYear] = useState(new Date().getFullYear());
  const [notification, setNotification] = useState(null);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const styles = {
    root: {
      minHeight: '100vh',
      background: 'transparent',
      color: COLORS.text,
      fontFamily: "'Inter', sans-serif",
      padding: '0',
    },
    header: {
      padding: '0 0 16px 0',
      borderBottom: `1px solid ${COLORS.border}`,
      marginBottom: 0,
    },
    title: {
      fontSize: 24,
      fontWeight: 800,
      color: COLORS.text,
      marginBottom: 4,
    },
    tabs: {
      display: 'flex',
      gap: 4,
      marginTop: 18,
      overflowX: 'auto',
    },
    tab: (active) => ({
      padding: '10px 18px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: active ? 700 : 500,
      color: active ? '#FFFFFF' : COLORS.muted,
      background: active ? COLORS.primary : 'transparent',
      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      whiteSpace: 'nowrap',
    }),
    content: {
      padding: '24px 0',
    },
  };

  return (
    <div style={styles.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:6px; height:6px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.3); border-radius:3px; }
      `}</style>

      {/* Notification */}
      {notification && (
        <div style={{
          position:'fixed', top:20, right:20, zIndex:9999,
          background: notification.type === 'success' ? '#ECFDF5' : '#FFF1F2',
          border: `1px solid ${notification.type === 'success' ? '#A7F3D0' : '#FECDD3'}`,
          borderRadius:12, padding:'14px 20px',
          color: notification.type === 'success' ? '#065F46' : '#9F1239',
          animation:'slideIn 0.3s ease', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)',
          maxWidth:360, fontSize:13, fontWeight:500,
        }}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={styles.title}>🏢 Enterprise HRM Studio</div>
            <div style={{ fontSize:13, color:COLORS.muted }}>
              {roleContext === 'schooladmin'
                ? 'School Admin Operational Overview — Policies, Calendars & Leave Recommendations'
                : 'Centralized Human Resource Management & Policy Configuration Studio'}
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:12, color:COLORS.muted, fontWeight:600 }}>Academic Year</span>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ background:'#FFFFFF', border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'7px 14px', color:COLORS.text, fontSize:13, fontWeight:600, outline:'none' }}
            >
              {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {roleContext === 'schooladmin' && (
          <div style={{ marginTop:14, padding:'10px 16px', background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:12, fontSize:12, color:'#1E40AF', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span>💡 <b>Operational Tip:</b> For daily staff punch roll-call & quick leave forwarding, check the <b>Staff Attendance & Leave Desk</b> tab.</span>
          </div>
        )}

        <div style={styles.tabs}>
          {TABS.map(t => (
            <div key={t.id} style={styles.tab(tab === t.id)} onClick={() => setTab(t.id)}>
              <span>{t.icon}</span> {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {tab === 'dashboard'  && <HRMDashboard year={year} onNavigate={setTab} notify={notify} />}
        {tab === 'policies'   && <LeavePolicyStudio year={year} notify={notify} />}
        {tab === 'holidays'   && <HolidayCalendar year={year} notify={notify} />}
        {tab === 'balances'   && <StaffBalances year={year} notify={notify} />}
        {tab === 'requests'   && <LeaveRequests year={year} notify={notify} roleContext={roleContext} />}
        {tab === 'analytics'  && <LeaveAnalytics year={year} notify={notify} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function HRMDashboard({ year, onNavigate, notify }) {
  const [analytics, setAnalytics]   = useState(null);
  const [policies, setPolicies]     = useState([]);
  const [holidays, setHolidays]     = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiClient.get(`/hrm/leave/analytics?year=${year}`),
      apiClient.get(`/hrm/leave-policies?activeOnly=true`),
      apiClient.get(`/hrm/holidays?year=${year}`),
    ]).then(([a, p, h]) => {
      setAnalytics(a.data);
      setPolicies(p.data);
      setHolidays(h.data?.holidays || []);
    }).catch(() => notify('Failed to load dashboard data', 'error'))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <Spinner />;

  const pending  = analytics?.statusBreakdown?.find(s => s.status === 'Pending')?.count || 0;
  const approved = analytics?.statusBreakdown?.find(s => s.status === 'Approved')?.count || 0;
  const total    = analytics?.totalRequests || 0;

  const upcomingHolidays = holidays.filter(h => new Date(h.date) >= new Date()).slice(0, 5);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24, animation:'fadeIn 0.4s ease' }}>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16 }}>
        <StatCard label="Active Leave Policies" value={analytics?.activePolicies || policies.length} color={COLORS.primary} icon="📋" />
        <StatCard label="Total Requests (Year)" value={total} color={COLORS.info} icon="📨" sub={`${year}`} />
        <StatCard label="Pending Approval" value={pending} color={COLORS.warning} icon="⏳" />
        <StatCard label="Approved Leaves" value={approved} color={COLORS.secondary} icon="✅" />
        <StatCard label="Holidays This Year" value={analytics?.totalHolidays || 0} color={COLORS.accent} icon="🗓️" />
      </div>

      {/* Two-column layout */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Leave Type Breakdown */}
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700, color:COLORS.text }}>Top Leave Types (Approved)</h3>
          {analytics?.typeBreakdown?.length > 0 ? analytics.typeBreakdown.map(t => {
            const maxDays = Math.max(...analytics.typeBreakdown.map(x => x.totalDays));
            const pct = maxDays > 0 ? (t.totalDays / maxDays) * 100 : 0;
            const color = LEAVE_TYPE_COLORS[t.leaveType] || COLORS.primary;
            return (
              <div key={t.leaveType} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <LeaveTypeDot code={t.leaveType} />
                  <span style={{ fontSize:12, color:COLORS.muted }}>{t.count} req · <b style={{color:COLORS.text}}>{fmtNum(t.totalDays)} days</b></span>
                </div>
                <div style={{ height:6, borderRadius:3, background:COLORS.border }}>
                  <div style={{ height:'100%', width:`${pct}%`, borderRadius:3, background:color, transition:'width 0.8s ease' }} />
                </div>
              </div>
            );
          }) : <div style={{ color:COLORS.muted, fontSize:13 }}>No approved leaves recorded for {year}.</div>}
        </Card>

        {/* Upcoming Holidays */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h3 style={{ margin:0, fontSize:16, fontWeight:700, color:COLORS.text }}>Upcoming Holidays</h3>
            <Btn variant="ghost" size="sm" onClick={() => onNavigate('holidays')}>Manage →</Btn>
          </div>
          {upcomingHolidays.length > 0 ? upcomingHolidays.map(h => (
            <div key={h.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${COLORS.border}` }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>{h.name}</div>
                <div style={{ fontSize:11, color:COLORS.muted }}>{h.holidayType}{h.isOptional ? ' · Optional' : ''}</div>
              </div>
              <div style={{ fontSize:12, color:COLORS.secondary, fontWeight:600 }}>{fmtDate(h.date)}</div>
            </div>
          )) : <div style={{ color:COLORS.muted, fontSize:13 }}>No upcoming holidays. <span style={{color:COLORS.primary,cursor:'pointer'}} onClick={() => onNavigate('holidays')}>Add holidays →</span></div>}
        </Card>
      </div>

      {/* Top Absentees */}
      {analytics?.topAbsentees?.length > 0 && (
        <Card>
          <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700, color:COLORS.text }}>Top Absentees ({year})</h3>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  {['#','Employee','Code','Leaves Taken','Days Used'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:COLORS.muted, fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.topAbsentees.map((a, i) => (
                  <tr key={a.employeeId || i} style={{ borderBottom:`1px solid ${COLORS.border}20` }}>
                    <td style={{ padding:'10px 12px', color:COLORS.muted }}>{i+1}</td>
                    <td style={{ padding:'10px 12px', fontWeight:600 }}>{a.name || '—'}</td>
                    <td style={{ padding:'10px 12px', color:COLORS.muted }}>{a.code || '—'}</td>
                    <td style={{ padding:'10px 12px' }}>{a.count}</td>
                    <td style={{ padding:'10px 12px', color:COLORS.accent, fontWeight:700 }}>{fmtNum(a.totalDays)} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:13, color:COLORS.muted, fontWeight:600 }}>Quick Actions:</span>
        <Btn variant="primary" size="sm" onClick={() => onNavigate('policies')}>+ Add Leave Policy</Btn>
        <Btn variant="secondary" size="sm" onClick={() => onNavigate('holidays')}>+ Add Holiday</Btn>
        <Btn variant="ghost" size="sm" onClick={() => onNavigate('requests')}>Review Pending ({pending})</Btn>
        <Btn variant="ghost" size="sm" onClick={() => onNavigate('balances')}>View Staff Balances</Btn>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: LEAVE POLICY STUDIO
// ═══════════════════════════════════════════════════════════════════════════════
function LeavePolicyStudio({ notify }) {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'create' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving]     = useState(false);

  const blankForm = {
    leaveTypeCode: '', leaveTypeName: '', description: '', colorHex: '#6C63FF',
    annualAllotment: 12, accrualFrequency: 'Annual', accrualUnitsPerPeriod: 1,
    joiningRule: 'NextMonth', joiningCutoffDay: 15,
    genderEligibility: 'All', probationEligible: false, minimumServiceDays: 0,
    staffTypeEligibilityJson: '["Teaching","NonTeaching","Administrative","Support","Transport","Security"]',
    isPaid: true, requiresAttachment: false, minAttachmentAfterDays: 0,
    allowHalfDay: true, maxConsecutiveDays: 0, maxApplicationsPerYear: 0,
    noticePeriodDays: 0, sandwichRuleApplied: false,
    carryForwardAllowed: false, maxCarryForwardDays: 0, carryForwardExpiryMonths: 12,
    encashmentAllowed: false, maxEncashmentDays: 0,
    approvalSequenceJson: '["Principal"]', sortOrder: 0,
  };
  const [form, setForm] = useState(blankForm);

  const load = useCallback(() => {
    setLoading(true);
    apiClient.get('/hrm/leave-policies?activeOnly=false')
      .then(r => setPolicies(r.data))
      .catch(() => notify('Failed to load leave policies', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(blankForm); setEditTarget(null); setModal('create'); };
  const openEdit   = p  => {
    setForm({ ...blankForm, ...p, leaveTypeCode: p.leaveTypeCode || '', annualAllotment: p.annualAllotment || 12 });
    setEditTarget(p);
    setModal('edit');
  };

  const save = async () => {
    if (!form.leaveTypeCode || !form.leaveTypeName) return notify('Leave Type Code and Name are required.', 'error');
    setSaving(true);
    try {
      if (modal === 'create') {
        await apiClient.post('/hrm/leave-policies', form);
        notify('Leave policy created successfully.');
      } else {
        await apiClient.put(`/hrm/leave-policies/${editTarget.id}`, form);
        notify('Leave policy updated.');
      }
      setModal(null);
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to save policy.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id) => {
    if (!window.confirm('Deactivate this leave policy?')) return;
    try {
      await apiClient.delete(`/hrm/leave-policies/${id}`);
      notify('Policy deactivated.');
      load();
    } catch { notify('Failed to deactivate.', 'error'); }
  };

  const sf = (key) => (val) => setForm(f => ({ ...f, [key]: val }));

  const GENDER_OPTIONS = [
    { value:'All', label:'All Employees' },
    { value:'Male', label:'Male Only' },
    { value:'Female', label:'Female Only' },
  ];
  const FREQ_OPTIONS = [
    { value:'Annual', label:'Annual (Full year grant)' },
    { value:'Monthly', label:'Monthly Accrual' },
    { value:'Quarterly', label:'Quarterly Accrual' },
    { value:'None', label:'None (Fixed quota only)' },
  ];
  const JOINING_OPTIONS = [
    { value:'Immediate', label:'Immediate (from DOJ)' },
    { value:'CurrentMonth', label:'Current Month (if joined before cutoff)' },
    { value:'NextMonth', label:'Next Month (safest default)' },
  ];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:COLORS.text }}>Leave Policy Studio</h2>
          <p style={{ margin:'4px 0 0', fontSize:13, color:COLORS.muted }}>Define school-specific leave types with full eligibility rules, accrual engine, and approval workflows</p>
        </div>
        <Btn variant="primary" onClick={openCreate}>+ Create Policy</Btn>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(360px, 1fr))', gap:16 }}>
          {policies.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:COLORS.muted }}>
              No leave policies configured. <span style={{ color:COLORS.primary, cursor:'pointer' }} onClick={openCreate}>Create your first policy →</span>
            </div>
          )}
          {policies.map(p => (
            <div key={p.id} style={{
              background: COLORS.surface2,
              border: `1px solid ${p.isActive ? COLORS.border : COLORS.border+'80'}`,
              borderLeft: `4px solid ${p.colorHex || COLORS.primary}`,
              borderRadius: 14,
              padding: 20,
              opacity: p.isActive ? 1 : 0.6,
              transition:'transform 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontSize:11, padding:'3px 8px', borderRadius:20, background:`${p.colorHex || COLORS.primary}20`, color:p.colorHex || COLORS.primary, fontWeight:700 }}>{p.leaveTypeCode}</span>
                    {!p.isActive && <span style={{ fontSize:10, color:COLORS.accent }}>Inactive</span>}
                    {!p.isPaid && <span style={{ fontSize:10, color:COLORS.warning }}>Unpaid</span>}
                  </div>
                  <div style={{ fontSize:15, fontWeight:700, color:COLORS.text }}>{p.leaveTypeName}</div>
                  {p.description && <div style={{ fontSize:12, color:COLORS.muted, marginTop:2 }}>{p.description}</div>}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <Btn variant="ghost" size="sm" onClick={() => openEdit(p)}>Edit</Btn>
                  {p.isActive && <Btn variant="danger" size="sm" onClick={() => deactivate(p.id)}>✕</Btn>}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, fontSize:12 }}>
                {[
                  { label:'Entitlement', val:`${p.annualAllotment} days/yr` },
                  { label:'Accrual', val: p.accrualFrequency },
                  { label:'Gender', val: p.genderEligibility },
                  { label:'Probation', val: p.probationEligible ? '✅ Allowed' : '❌ Not allowed' },
                  { label:'Half Day', val: p.allowHalfDay ? '✅' : '❌' },
                  { label:'Carry Fwd', val: p.carryForwardAllowed ? `✅ Max ${p.maxCarryForwardDays}d` : '❌' },
                  { label:'Encashment', val: p.encashmentAllowed ? `✅ Max ${p.maxEncashmentDays}d` : '❌' },
                  { label:'Min Service', val: p.minimumServiceDays > 0 ? `${p.minimumServiceDays} days` : 'None' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background:COLORS.surface1, borderRadius:8, padding:'7px 10px' }}>
                    <div style={{ fontSize:10, color:COLORS.muted, textTransform:'uppercase', letterSpacing:0.5, marginBottom:2 }}>{label}</div>
                    <div style={{ color:COLORS.text, fontWeight:500 }}>{val}</div>
                  </div>
                ))}
              </div>

              {p.sandwichRuleApplied && (
                <div style={{ marginTop:10, fontSize:11, color:COLORS.warning }}>⚠ Sandwich Rule Applied (weekends count)</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{
          position:'fixed', inset:0, zIndex:1000,
          background:'rgba(15, 23, 42, 0.45)', backdropFilter:'blur(4px)',
          display:'flex', alignItems:'flex-start', justifyContent:'center',
          padding:'20px', overflowY:'auto',
        }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{
            background:'#FFFFFF', border:`1px solid ${COLORS.border}`,
            borderRadius:20, padding:32, width:'100%', maxWidth:700,
            boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            animation:'slideIn 0.3s ease', margin:'auto',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:COLORS.text }}>
                {modal === 'create' ? '✨ Create Leave Policy' : `✏️ Edit: ${editTarget?.leaveTypeName}`}
              </h3>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', color:COLORS.muted, cursor:'pointer', fontSize:22 }}>×</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <Input label="Leave Type Code *" value={form.leaveTypeCode} onChange={v => sf('leaveTypeCode')(v.toUpperCase())} placeholder="e.g. CL, SL, ML, EL" required />
              <Input label="Leave Type Name *" value={form.leaveTypeName} onChange={sf('leaveTypeName')} placeholder="e.g. Casual Leave" required />
              <Input label="Description" value={form.description || ''} onChange={sf('description')} placeholder="Brief description..." style={{ gridColumn:'1/-1' }} />
              <Input label="Badge Color" type="color" value={form.colorHex || '#6C63FF'} onChange={sf('colorHex')} />
              <Input label="Sort Order" type="number" value={form.sortOrder} onChange={v => sf('sortOrder')(Number(v))} min={0} />
            </div>

            <h4 style={{ margin:'0 0 12px', color:COLORS.secondary, fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>Entitlement & Accrual</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <Input label="Annual Allotment (days)" type="number" value={form.annualAllotment} onChange={v => sf('annualAllotment')(Number(v))} min={0} step={0.5} />
              <Select label="Accrual Frequency" value={form.accrualFrequency} onChange={sf('accrualFrequency')} options={FREQ_OPTIONS} />
              {(form.accrualFrequency === 'Monthly' || form.accrualFrequency === 'Quarterly') && (
                <Input label="Units Per Period (days)" type="number" value={form.accrualUnitsPerPeriod} onChange={v => sf('accrualUnitsPerPeriod')(Number(v))} min={0.5} step={0.5} />
              )}
            </div>

            <h4 style={{ margin:'0 0 12px', color:COLORS.secondary, fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>Joining & Cutoff Rules</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <Select label="Joining Rule" value={form.joiningRule} onChange={sf('joiningRule')} options={JOINING_OPTIONS} />
              {form.joiningRule === 'CurrentMonth' && (
                <Input label="Cutoff Day of Month (1-28)" type="number" value={form.joiningCutoffDay} onChange={v => sf('joiningCutoffDay')(Number(v))} min={1} max={28} />
              )}
            </div>

            <h4 style={{ margin:'0 0 12px', color:COLORS.secondary, fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>Eligibility</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
              <Select label="Gender Eligibility" value={form.genderEligibility} onChange={sf('genderEligibility')} options={GENDER_OPTIONS} />
              <Input label="Min. Service Days (0 = none)" type="number" value={form.minimumServiceDays} onChange={v => sf('minimumServiceDays')(Number(v))} min={0} />
            </div>

            <h4 style={{ margin:'0 0 12px', color:COLORS.secondary, fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>Behavior Rules</h4>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:8 }}>
              <Input label="Max Consecutive Days (0=unlimited)" type="number" value={form.maxConsecutiveDays} onChange={v => sf('maxConsecutiveDays')(Number(v))} min={0} />
              <Input label="Notice Period (days)" type="number" value={form.noticePeriodDays} onChange={v => sf('noticePeriodDays')(Number(v))} min={0} />
              <Input label="Max Applications/Year (0=unlimited)" type="number" value={form.maxApplicationsPerYear} onChange={v => sf('maxApplicationsPerYear')(Number(v))} min={0} />
              <Input label="Attachment required after (days, 0=never)" type="number" value={form.minAttachmentAfterDays} onChange={v => sf('minAttachmentAfterDays')(Number(v))} min={0} />
            </div>

            <div style={{ marginBottom:16 }}>
              <Toggle label="Paid Leave" checked={form.isPaid} onChange={sf('isPaid')} desc="Employee receives salary during this leave" />
              <Toggle label="Allow Half Day" checked={form.allowHalfDay} onChange={sf('allowHalfDay')} desc="Employee can apply for morning or afternoon half day" />
              <Toggle label="Probation Eligible" checked={form.probationEligible} onChange={sf('probationEligible')} desc="Employees on probation can take this leave" />
              <Toggle label="Requires Attachment" checked={form.requiresAttachment} onChange={sf('requiresAttachment')} desc="Medical certificate / supporting document required" />
              <Toggle label="Sandwich Rule" checked={form.sandwichRuleApplied} onChange={sf('sandwichRuleApplied')} desc="Weekends and holidays sandwiched between leave days are counted" />
            </div>

            <h4 style={{ margin:'8px 0 12px', color:COLORS.secondary, fontSize:13, textTransform:'uppercase', letterSpacing:1 }}>Carry Forward & Encashment</h4>
            <Toggle label="Allow Carry Forward" checked={form.carryForwardAllowed} onChange={sf('carryForwardAllowed')} />
            {form.carryForwardAllowed && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, margin:'12px 0' }}>
                <Input label="Max Carry Forward Days" type="number" value={form.maxCarryForwardDays} onChange={v => sf('maxCarryForwardDays')(Number(v))} min={0} step={0.5} />
                <Input label="Expiry (months after year end)" type="number" value={form.carryForwardExpiryMonths} onChange={v => sf('carryForwardExpiryMonths')(Number(v))} min={1} max={24} />
              </div>
            )}
            <Toggle label="Allow Encashment" checked={form.encashmentAllowed} onChange={sf('encashmentAllowed')} />
            {form.encashmentAllowed && (
              <div style={{ marginTop:12 }}>
                <Input label="Max Encashment Days" type="number" value={form.maxEncashmentDays} onChange={v => sf('maxEncashmentDays')(Number(v))} min={0} step={0.5} />
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:24, paddingTop:20, borderTop:`1px solid ${COLORS.border}` }}>
              <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : (modal === 'create' ? 'Create Policy' : 'Save Changes')}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: HOLIDAY CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════
function HolidayCalendar({ year, notify }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({ name:'', date:'', holidayType:'School', isOptional:false, description:'', isRecurringYearly:false });

  const load = () => {
    setLoading(true);
    apiClient.get(`/hrm/holidays?year=${year}`)
      .then(r => setHolidays(r.data?.holidays || []))
      .catch(() => notify('Failed to load holidays', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [year]);

  const save = async () => {
    if (!form.name || !form.date) return notify('Name and Date are required.', 'error');
    setSaving(true);
    try {
      await apiClient.post('/hrm/holidays', { ...form });
      notify('Holiday added.');
      setModal(false);
      setForm({ name:'', date:'', holidayType:'School', isOptional:false, description:'', isRecurringYearly:false });
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to add holiday.', 'error');
    } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await apiClient.delete(`/hrm/holidays/${id}`);
      notify('Holiday removed.');
      load();
    } catch { notify('Failed to delete.', 'error'); }
  };

  const TYPE_COLORS = { National:'#FF6B6B', Regional:'#FFB84D', School:COLORS.primary, Optional:'#8B92A8' };
  const months = [...new Set(holidays.map(h => new Date(h.date).getMonth()))].sort((a,b) => a-b);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Holiday Calendar {year}</h2>
          <p style={{ margin:'4px 0 0', fontSize:13, color:COLORS.muted }}>{holidays.length} holidays configured</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <Btn variant="ghost" size="sm" onClick={() => {
            const preset = [
              { name:'Republic Day', date:`${year}-01-26`, holidayType:'National' },
              { name:'Holi', date:`${year}-03-25`, holidayType:'National' },
              { name:'Good Friday', date:`${year}-04-18`, holidayType:'National' },
              { name:'Independence Day', date:`${year}-08-15`, holidayType:'National' },
              { name:'Gandhi Jayanti', date:`${year}-10-02`, holidayType:'National' },
              { name:'Dussehra', date:`${year}-10-02`, holidayType:'National' },
              { name:'Diwali', date:`${year}-10-20`, holidayType:'National' },
              { name:'Christmas', date:`${year}-12-25`, holidayType:'National' },
            ];
            apiClient.post('/hrm/holidays/bulk', preset.map(p => ({ ...p, isOptional:false, isRecurringYearly:true })))
              .then(() => { notify(`${preset.length} national holidays imported.`); load(); })
              .catch(() => notify('Import failed.', 'error'));
          }}>⚡ Import National Holidays</Btn>
          <Btn variant="primary" onClick={() => setModal(true)}>+ Add Holiday</Btn>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          {holidays.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:COLORS.muted }}>
              No holidays configured for {year}. <span style={{ color:COLORS.primary, cursor:'pointer' }} onClick={() => setModal(true)}>Add holidays →</span>
            </div>
          )}
          {months.map(m => (
            <Card key={m}>
              <h4 style={{ margin:'0 0 14px', color:COLORS.secondary, fontSize:14, fontWeight:700 }}>{monthNames[m]} {year}</h4>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
                {holidays.filter(h => new Date(h.date).getMonth() === m).map(h => (
                  <div key={h.id} style={{
                    background:COLORS.surface1, border:`1px solid ${COLORS.border}`,
                    borderLeft:`3px solid ${TYPE_COLORS[h.holidayType] || COLORS.primary}`,
                    borderRadius:10, padding:'12px 14px',
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                  }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:COLORS.text }}>{h.name}</div>
                      <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>
                        {fmtDate(h.date)} · <span style={{ color:TYPE_COLORS[h.holidayType] }}>{h.holidayType}</span>
                        {h.isOptional && <span style={{ marginLeft:6, color:COLORS.warning }}>Optional</span>}
                      </div>
                    </div>
                    <button onClick={() => del(h.id)} style={{ background:'none', border:'none', color:COLORS.muted, cursor:'pointer', fontSize:16, padding:'4px 6px' }}>✕</button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginTop:20, flexWrap:'wrap' }}>
        {Object.entries(TYPE_COLORS).map(([t, c]) => (
          <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:COLORS.muted }}>
            <span style={{ width:10, height:10, background:c, borderRadius:2 }} /> {t}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15, 23, 42, 0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ background:'#FFFFFF', border:`1px solid ${COLORS.border}`, borderRadius:20, padding:32, width:480, boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation:'slideIn 0.3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:17, fontWeight:700 }}>🗓️ Add Holiday</h3>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', color:COLORS.muted, cursor:'pointer', fontSize:22 }}>×</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Input label="Holiday Name *" value={form.name} onChange={v => setForm(f => ({...f, name:v}))} placeholder="e.g. Diwali, Republic Day" required />
              <Input label="Date *" type="date" value={form.date} onChange={v => setForm(f => ({...f, date:v}))} required />
              <Select label="Type" value={form.holidayType} onChange={v => setForm(f => ({...f, holidayType:v}))}
                options={[{value:'National',label:'National'},{value:'Regional',label:'Regional'},{value:'School',label:'School'},{value:'Optional',label:'Optional'}]} />
              <Input label="Description (optional)" value={form.description} onChange={v => setForm(f => ({...f, description:v}))} placeholder="Brief note..." />
              <Toggle label="Optional Holiday" checked={form.isOptional} onChange={v => setForm(f => ({...f, isOptional:v}))} desc="Employee may choose to work on this day" />
              <Toggle label="Recurring Yearly" checked={form.isRecurringYearly} onChange={v => setForm(f => ({...f, isRecurringYearly:v}))} desc="Auto-add this holiday next year" />
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:24 }}>
              <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Adding...' : 'Add Holiday'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: STAFF BALANCES
// ═══════════════════════════════════════════════════════════════════════════════
function StaffBalances({ year, notify }) {
  const [employees, setEmployees] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pageSize]                = useState(20);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [staffType, setStaffType] = useState('ALL');
  const [selected, setSelected]   = useState(null);
  const [adjModal, setAdjModal]   = useState(null);
  const [policies, setPolicies]   = useState([]);
  const [adjForm, setAdjForm]     = useState({ leavePolicyId:'', days:0, reason:'', academicYear:year });
  const [adjSaving, setAdjSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ year, page, pageSize, ...(staffType !== 'ALL' ? { staffType } : {}) });
    apiClient.get(`/hrm/leave-balance/summary?${params}`)
      .then(r => { setEmployees(r.data.employees || []); setTotal(r.data.totalCount || 0); })
      .catch(() => notify('Failed to load balances', 'error'))
      .finally(() => setLoading(false));
  }, [year, page, staffType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiClient.get('/hrm/leave-policies?activeOnly=true').then(r => setPolicies(r.data || [])).catch(() => {});
  }, []);

  const openAdj = (emp) => {
    setAdjModal(emp);
    setAdjForm({ leavePolicyId: policies[0]?.id || '', days:1, reason:'', academicYear:year });
  };

  const saveAdj = async () => {
    if (!adjForm.leavePolicyId) return notify('Select a leave policy.', 'error');
    if (adjForm.days === 0) return notify('Days cannot be zero.', 'error');
    setAdjSaving(true);
    try {
      await apiClient.post(`/hrm/employees/${adjModal.employeeId}/leave-adjustment`, adjForm);
      notify(`Adjustment recorded for ${adjModal.employeeName}.`);
      setAdjModal(null);
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to save adjustment.', 'error');
    } finally { setAdjSaving(false); }
  };

  const filtered = search
    ? employees.filter(e => e.employeeName?.toLowerCase().includes(search.toLowerCase()) || e.employeeCode?.toLowerCase().includes(search.toLowerCase()))
    : employees;

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Staff Leave Balances — {year}</h2>
        <div style={{ fontSize:13, color:COLORS.muted }}>{total} employees</div>
      </div>

      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or code..."
          style={{ background:COLORS.surface2, border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'10px 14px', color:COLORS.text, fontSize:13, outline:'none', flex:'1', minWidth:200 }} />
        <Select value={staffType} onChange={v => { setStaffType(v); setPage(1); }}
          options={[{value:'ALL',label:'All Staff'},{value:'Teaching',label:'Teaching'},{value:'NonTeaching',label:'Non-Teaching'},{value:'Administrative',label:'Administrative'},{value:'Support',label:'Support'}]} />
      </div>

      {loading ? <Spinner /> : (
        <>
          {filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:COLORS.muted }}>No employees found.</div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map(emp => (
              <div key={emp.employeeId} style={{
                background:COLORS.surface2, border:`1px solid ${COLORS.border}`,
                borderRadius:14, overflow:'hidden',
                transition:'border-color 0.2s',
              }}>
                <div
                  onClick={() => setSelected(selected?.employeeId === emp.employeeId ? null : emp)}
                  style={{ padding:'16px 20px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ width:42, height:42, borderRadius:12, background:`${COLORS.primary}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:COLORS.primary }}>
                      {(emp.employeeName || 'E')[0]}
                    </div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>{emp.employeeName}</div>
                      <div style={{ fontSize:12, color:COLORS.muted }}>{emp.employeeCode} · {emp.staffType} · <span style={{ color: emp.status === 'Active' ? COLORS.secondary : COLORS.warning }}>{emp.status}</span></div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                    <div style={{ display:'flex', gap:8 }}>
                      {(emp.balances || []).slice(0, 4).map(b => (
                        <div key={b.leaveTypeCode} style={{ textAlign:'center' }}>
                          <div style={{ fontSize:16, fontWeight:700, color:LEAVE_TYPE_COLORS[b.leaveTypeCode] || COLORS.primary }}>{fmtNum(b.remaining)}</div>
                          <div style={{ fontSize:9, color:COLORS.muted, textTransform:'uppercase' }}>{b.leaveTypeCode}</div>
                        </div>
                      ))}
                    </div>
                    <span style={{ color:COLORS.muted, fontSize:18 }}>{selected?.employeeId === emp.employeeId ? '▲' : '▼'}</span>
                  </div>
                </div>

                {selected?.employeeId === emp.employeeId && (
                  <div style={{ padding:'0 20px 20px', borderTop:`1px solid ${COLORS.border}` }}>
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:10, margin:'12px 0' }}>
                      <Btn variant="secondary" size="sm" onClick={() => openAdj(emp)}>± Manual Adjustment</Btn>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
                      {(emp.balances || []).map(bal => <LeaveBalanceBar key={bal.leaveTypeCode} bal={bal} />)}
                      {(!emp.balances || emp.balances.length === 0) && (
                        <div style={{ color:COLORS.muted, fontSize:13, padding:20 }}>No leave policies eligible for this employee.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:24 }}>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</Btn>
              <span style={{ color:COLORS.muted, fontSize:13, alignSelf:'center' }}>Page {page} of {Math.ceil(total/pageSize)}</span>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/pageSize)}>Next →</Btn>
            </div>
          )}
        </>
      )}

      {/* Adjustment Modal */}
      {adjModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15, 23, 42, 0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target === e.currentTarget && setAdjModal(null)}>
          <div style={{ background:'#FFFFFF', border:`1px solid ${COLORS.border}`, borderRadius:20, padding:32, width:480, boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation:'slideIn 0.3s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <h3 style={{ margin:0, fontSize:17, fontWeight:700 }}>± Manual Leave Adjustment</h3>
              <button onClick={() => setAdjModal(null)} style={{ background:'none', border:'none', color:COLORS.muted, cursor:'pointer', fontSize:22 }}>×</button>
            </div>
            <div style={{ marginBottom:16, padding:12, background:`${COLORS.primary}10`, borderRadius:10, fontSize:13 }}>
              Employee: <b>{adjModal.employeeName}</b> ({adjModal.employeeCode})
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <Select label="Leave Policy *" value={adjForm.leavePolicyId} onChange={v => setAdjForm(f => ({...f, leavePolicyId:v}))}
                options={policies.map(p => ({ value:p.id, label:`${p.leaveTypeCode} – ${p.leaveTypeName}` }))} />
              <Input label="Days (positive=credit, negative=debit)" type="number" step={0.5}
                value={adjForm.days} onChange={v => setAdjForm(f => ({...f, days:Number(v)}))} />
              <Input label="Reason *" value={adjForm.reason} onChange={v => setAdjForm(f => ({...f, reason:v}))} placeholder="Reason for adjustment..." />
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:24 }}>
              <Btn variant="ghost" onClick={() => setAdjModal(null)}>Cancel</Btn>
              <Btn variant="primary" onClick={saveAdj} disabled={adjSaving}>{adjSaving ? 'Saving...' : 'Save Adjustment'}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: LEAVE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════
function LeaveRequests({ year, notify, roleContext = 'accountant' }) {
  const [requests, setRequests]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [status, setStatus]       = useState('Pending');
  const [leaveType, setLeaveType] = useState('ALL');
  const [actionModal, setActionModal] = useState(null); // { type, req }
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ year, page, pageSize:20, ...(status !== 'ALL' ? {status} : {}), ...(leaveType !== 'ALL' ? {leaveType} : {}) });
    apiClient.get(`/hrm/leave-requests?${params}`)
      .then(r => { setRequests(r.data.requests || []); setTotal(r.data.totalCount || 0); })
      .catch(() => notify('Failed to load requests', 'error'))
      .finally(() => setLoading(false));
  }, [year, page, status, leaveType]);

  useEffect(() => { load(); }, [load]);

  const doAction = async () => {
    setSaving(true);
    try {
      const { type, req } = actionModal;
      if (type === 'approve') await apiClient.post(`/hrm/leave-requests/${req.id}/approve`, { note });
      else if (type === 'forward') await apiClient.post(`/hrm/leave-requests/${req.id}/forward`, { note });
      else if (type === 'reject') await apiClient.post(`/hrm/leave-requests/${req.id}/reject`, { note });
      else if (type === 'revoke') await apiClient.post(`/hrm/leave-requests/${req.id}/revoke`, { note });
      notify(`Leave ${type === 'forward' ? 'forwarded' : type + 'd'} successfully.`);
      setActionModal(null);
      setNote('');
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Action failed.', 'error');
    } finally { setSaving(false); }
  };

  const STATUS_OPTIONS = ['ALL','Pending','ForwardedToAccounts','Approved','Rejected','Cancelled','Revoked'];

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Leave Requests — {year}</h2>
          <p style={{ margin:'4px 0 0', fontSize:12, color:COLORS.muted }}>
            {roleContext === 'schooladmin'
              ? 'Review pending staff requests and forward recommended leaves to Accounts for payroll deduction & quota debit.'
              : 'Accounts Department Approval Desk — Final financial approval with automatic balance ledger updates.'}
          </p>
        </div>
        <div style={{ fontSize:13, color:COLORS.muted }}>{total} total</div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        {STATUS_OPTIONS.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            style={{
              padding:'8px 16px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
              background: status === s ? COLORS.primary : COLORS.surface2,
              color: status === s ? '#fff' : COLORS.muted,
              border: `1px solid ${status === s ? COLORS.primary : COLORS.border}`,
              transition:'all 0.2s',
            }}>
            {s === 'ForwardedToAccounts' ? 'Forwarded to Accounts' : s}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {requests.length === 0 && (
            <div style={{ textAlign:'center', padding:60, color:COLORS.muted }}>No {status !== 'ALL' ? status.toLowerCase() : ''} leave requests found.</div>
          )}
          {requests.map(r => (
            <div key={r.id} style={{
              background:'#FFFFFF', border:`1px solid ${COLORS.border}`,
              borderRadius:14, padding:'18px 22px',
              display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'center',
              boxShadow:'0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10 }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:COLORS.text }}>{r.employeeName || 'Employee'}</div>
                  <div style={{ fontSize:11, color:COLORS.muted }}>{r.employeeCode || '—'}</div>
                </div>
                <div>
                  <LeaveTypeDot code={r.leaveType} />
                  <div style={{ fontSize:11, color:COLORS.muted, marginTop:2 }}>{r.leaveTypeName || r.leaveType}</div>
                </div>
                <div>
                  <div style={{ fontSize:13, color:COLORS.text }}>{fmtDate(r.fromDate)} → {fmtDate(r.toDate)}</div>
                  <div style={{ fontSize:11, color:COLORS.muted }}>{r.dayType} · <b style={{color:COLORS.text}}>{fmtNum(r.totalDays)} day(s)</b></div>
                </div>
                <div>
                  <Badge status={r.status} />
                  <div style={{ fontSize:11, color:COLORS.muted, marginTop:4 }}>Applied: {fmtDate(r.appliedAt)}</div>
                </div>
                {r.reason && <div style={{ fontSize:12, color:COLORS.muted, fontStyle:'italic', gridColumn:'1/-1' }}>"{r.reason}"</div>}
                {r.forwardNote && (
                  <div style={{ fontSize:11, color:'#4338CA', background:'#EEF2FF', padding:'6px 10px', borderRadius:8, border:'1px solid #C7D2FE', gridColumn:'1/-1' }}>
                    📤 <b>Forwarded by {r.forwardedByName || 'School Admin'}:</b> "{r.forwardNote}"
                  </div>
                )}
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:120 }}>
                {roleContext === 'schooladmin' ? (
                  <>
                    {r.status === 'Pending' && (
                      <>
                        <Btn variant="primary" size="sm" onClick={() => { setActionModal({type:'forward', req:r}); setNote('Verified and recommended for approval.'); }}>📤 Forward</Btn>
                        <Btn variant="danger" size="sm" onClick={() => { setActionModal({type:'reject', req:r}); setNote(''); }}>❌ Reject</Btn>
                      </>
                    )}
                    {r.status === 'ForwardedToAccounts' && (
                      <span style={{ fontSize:11, color:COLORS.primary, fontWeight:600 }}>🕒 In Accounts Review</span>
                    )}
                  </>
                ) : (
                  <>
                    {(r.status === 'Pending' || r.status === 'ForwardedToAccounts') && (
                      <>
                        <Btn variant="success" size="sm" onClick={() => { setActionModal({type:'approve', req:r}); setNote(''); }}>✅ Approve</Btn>
                        <Btn variant="danger" size="sm" onClick={() => { setActionModal({type:'reject', req:r}); setNote(''); }}>❌ Reject</Btn>
                      </>
                    )}
                    {r.status === 'Approved' && (
                      <Btn variant="warning" size="sm" onClick={() => { setActionModal({type:'revoke', req:r}); setNote(''); }}>↩ Revoke</Btn>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {total > 20 && (
            <div style={{ display:'flex', justifyContent:'center', gap:10, marginTop:16 }}>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>← Prev</Btn>
              <span style={{ color:COLORS.muted, fontSize:13, alignSelf:'center' }}>Page {page} of {Math.ceil(total/20)}</span>
              <Btn variant="ghost" size="sm" onClick={() => setPage(p => p+1)} disabled={page >= Math.ceil(total/20)}>Next →</Btn>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(15, 23, 42, 0.45)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center' }}
          onClick={e => e.target === e.currentTarget && setActionModal(null)}>
          <div style={{ background:'#FFFFFF', border:`1px solid ${COLORS.border}`, borderRadius:20, padding:32, width:460, boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1)', animation:'slideIn 0.3s ease' }}>
            <h3 style={{ margin:'0 0 16px', fontWeight:700, color:COLORS.text }}>
              {actionModal.type === 'approve' ? '✅ Final Financial Approval' : actionModal.type === 'forward' ? '📤 Forward to Accounts' : actionModal.type === 'reject' ? '❌ Reject Leave' : '↩ Revoke Leave'}
            </h3>
            <div style={{ marginBottom:16, padding:14, background:COLORS.surface2, border:`1px solid ${COLORS.border}`, borderRadius:10, fontSize:13 }}>
              <div style={{ fontWeight:600, color:COLORS.text, marginBottom:4 }}>{actionModal.req.employeeName} — {actionModal.req.leaveType}</div>
              <div style={{ color:COLORS.muted }}>{fmtDate(actionModal.req.fromDate)} to {fmtDate(actionModal.req.toDate)} ({fmtNum(actionModal.req.totalDays)} days)</div>
              {actionModal.req.reason && <div style={{ color:COLORS.muted, marginTop:6, fontStyle:'italic' }}>"{actionModal.req.reason}"</div>}
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={actionModal.type === 'forward' ? 'Recommendation note for Accounts department...' : actionModal.type === 'approve' ? 'Approval note (optional)...' : 'Reason for rejection/revocation...'}
              style={{ width:'100%', background:'#FFFFFF', border:`1px solid ${COLORS.border}`, borderRadius:10, padding:'10px 14px', color:COLORS.text, fontSize:13, outline:'none', resize:'vertical', minHeight:90, boxSizing:'border-box' }}
            />
            <div style={{ display:'flex', gap:12, justifyContent:'flex-end', marginTop:20 }}>
              <Btn variant="ghost" onClick={() => setActionModal(null)}>Cancel</Btn>
              <Btn
                variant={actionModal.type === 'approve' || actionModal.type === 'forward' ? 'primary' : 'danger'}
                onClick={doAction}
                disabled={saving}
              >
                {saving ? 'Processing...' : `Confirm ${actionModal.type.charAt(0).toUpperCase() + actionModal.type.slice(1)}`}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: LEAVE ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
function LeaveAnalytics({ year, notify }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth]   = useState(0);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ year, ...(month > 0 ? { month } : {}) });
    apiClient.get(`/hrm/leave/analytics?${params}`)
      .then(r => setData(r.data))
      .catch(() => notify('Failed to load analytics', 'error'))
      .finally(() => setLoading(false));
  }, [year, month]);

  const months = ['All Year','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if (loading) return <Spinner />;

  const maxTrend = data?.monthlyTrend?.length > 0 ? Math.max(...data.monthlyTrend.map(t => t.totalDays)) : 1;

  return (
    <div style={{ animation:'fadeIn 0.4s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
        <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>Leave Analytics — {year}</h2>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {months.map((m, i) => (
            <button key={i} onClick={() => setMonth(i)}
              style={{
                padding:'6px 14px', borderRadius:20, fontSize:11, fontWeight:600, cursor:'pointer',
                background: month === i ? COLORS.primary : COLORS.surface2,
                color: month === i ? '#fff' : COLORS.muted,
                border: `1px solid ${month === i ? COLORS.primary : COLORS.border}`,
              }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:16, marginBottom:24 }}>
        <StatCard label="Total Requests" value={data?.totalRequests || 0} color={COLORS.info} icon="📨" />
        <StatCard label="Active Policies" value={data?.activePolicies || 0} color={COLORS.primary} icon="📋" />
        <StatCard label="Total Holidays" value={data?.totalHolidays || 0} color={COLORS.accent} icon="🗓️" />
        {data?.statusBreakdown?.map(s => (
          <StatCard key={s.status} label={`${s.status} Leaves`} value={s.count} color={STATUS_COLORS[s.status]?.text || COLORS.primary} icon={s.status === 'Approved' ? '✅' : s.status === 'Pending' ? '⏳' : '❌'} sub={`${fmtNum(s.totalDays)} days`} />
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>

        {/* Monthly Trend Chart */}
        <Card>
          <h3 style={{ margin:'0 0 20px', fontSize:16, fontWeight:700 }}>Monthly Trend (Approved Leaves)</h3>
          {data?.monthlyTrend?.length > 0 ? (
            <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
              {months.slice(1).map((m, i) => {
                const t = data.monthlyTrend.find(x => x.month === i+1);
                const h = t ? (t.totalDays / maxTrend) * 100 : 0;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                    <div style={{ width:'100%', height:`${h}%`, minHeight:2, borderRadius:'3px 3px 0 0', background:COLORS.primary, transition:'height 0.8s ease', position:'relative' }}>
                      {t && <div style={{ position:'absolute', top:-22, left:'50%', transform:'translateX(-50%)', fontSize:10, color:COLORS.text, whiteSpace:'nowrap' }}>{fmtNum(t.totalDays)}</div>}
                    </div>
                    <div style={{ fontSize:9, color:COLORS.muted }}>{m}</div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color:COLORS.muted, fontSize:13 }}>No data available.</div>}
        </Card>

        {/* Leave Type Breakdown */}
        <Card>
          <h3 style={{ margin:'0 0 20px', fontSize:16, fontWeight:700 }}>Leave Type Distribution</h3>
          {data?.typeBreakdown?.length > 0 ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {data.typeBreakdown.map(t => {
                const maxD = Math.max(...data.typeBreakdown.map(x => x.totalDays));
                const pct = maxD > 0 ? (t.totalDays / maxD) * 100 : 0;
                const color = LEAVE_TYPE_COLORS[t.leaveType] || COLORS.primary;
                return (
                  <div key={t.leaveType}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                      <LeaveTypeDot code={t.leaveType} />
                      <span style={{ fontSize:12, color:COLORS.muted }}>{t.count} req · {fmtNum(t.totalDays)} days</span>
                    </div>
                    <div style={{ height:6, borderRadius:3, background:COLORS.border }}>
                      <div style={{ height:'100%', width:`${pct}%`, borderRadius:3, background:color, transition:'width 0.8s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ color:COLORS.muted, fontSize:13 }}>No approved leaves this period.</div>}
        </Card>

      </div>

      {/* Top Absentees */}
      {data?.topAbsentees?.length > 0 && (
        <Card style={{ marginTop:20 }}>
          <h3 style={{ margin:'0 0 16px', fontSize:16, fontWeight:700 }}>Top 10 Absentees</h3>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${COLORS.border}` }}>
                  {['Rank','Employee','Code','Requests','Total Days'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'8px 12px', color:COLORS.muted, fontWeight:600, fontSize:11, textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.topAbsentees.map((a, i) => (
                  <tr key={i} style={{ borderBottom:`1px solid ${COLORS.border}20` }}>
                    <td style={{ padding:'10px 12px', color: i < 3 ? COLORS.warning : COLORS.muted, fontWeight:700 }}>#{i+1}</td>
                    <td style={{ padding:'10px 12px', fontWeight:600 }}>{a.name || '—'}</td>
                    <td style={{ padding:'10px 12px', color:COLORS.muted }}>{a.code || '—'}</td>
                    <td style={{ padding:'10px 12px' }}>{a.count}</td>
                    <td style={{ padding:'10px 12px', color:COLORS.accent, fontWeight:700 }}>{fmtNum(a.totalDays)} days</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
