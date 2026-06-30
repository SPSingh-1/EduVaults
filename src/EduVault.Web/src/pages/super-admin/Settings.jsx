import { useState, useEffect } from 'react';
import Topbar from '../../components/layout/Topbar';
import { apiClient, expressClient } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const { user, setUser } = useAuth();
  const [schools, setSchools] = useState([]);
  const [selectedScope, setSelectedScope] = useState('global'); // 'global' or schoolId

  // Global settings state
  const [globalSettings, setGlobalSettings] = useState(null);
  const [orgName, setOrgName] = useState('SuperAdmin Global');
  const [logoUrl, setLogoUrl] = useState('/logo.jpeg');
  const [primaryColor, setPrimaryColor] = useState('#1a2744');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [backupFrequency, setBackupFrequency] = useState('Daily');
  const [backupTime, setBackupTime] = useState('02:00 AM');
  const [backupTarget, setBackupTarget] = useState('Amazon S3: production-vault-01');

  // School-specific settings state
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState('/logo.jpeg');
  const [schoolEmailDomain, setSchoolEmailDomain] = useState('');
  const [schoolThemeColor, setSchoolThemeColor] = useState('#1a2744');

  // Modals state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Credentials state
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioWhatsAppFromNumber, setTwilioWhatsAppFromNumber] = useState('');

  // Logs state
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // UI status
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const getContrastColor = (hexColor) => {
    if (!hexColor) return '#1a2744';
    let hex = hexColor.trim();
    if (hex.startsWith('#')) {
      hex = hex.substring(1);
    }
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) return '#1a2744';
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 145) ? '#1a2744' : '#ffffff';
  };

  const getActionTypeStyle = (actionType) => {
    let bgColor = '#6b7280';
    
    switch (actionType) {
      case 'SETTINGS_UPDATE':
        bgColor = primaryColor || '#1a2744';
        break;
      case 'SCHOOL_UPDATE':
        bgColor = selectedScope !== 'global' ? schoolThemeColor : '#9333ea';
        break;
      case 'LOGIN':
        bgColor = '#10b981';
        break;
      case 'SECURITY':
        bgColor = '#ef4444';
        break;
      case 'SYSTEM':
        bgColor = '#f59e0b';
        break;
      default:
        bgColor = '#6b7280';
    }

    const textColor = getContrastColor(bgColor);
    
    let r = parseInt(bgColor.substring(1, 3), 16);
    let g = parseInt(bgColor.substring(3, 5), 16);
    let b = parseInt(bgColor.substring(5, 7), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      r = 107; g = 114; b = 128;
    }
    
    const isLight = textColor === '#1a2744';
    const borderColor = isLight 
      ? `rgba(${r}, ${g}, ${b}, 0.25)` 
      : `rgba(255, 255, 255, 0.15)`;

    return {
      backgroundColor: bgColor,
      color: textColor,
      borderColor: borderColor,
      borderWidth: '1px',
      borderStyle: 'solid'
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get global settings
      const settingsRes = await apiClient.get('/super/settings');
      if (settingsRes.data) {
        const d = settingsRes.data;
        setGlobalSettings(d);
        setOrgName(d.orgName || 'SuperAdmin Global');
        setLogoUrl(d.logoUrl || '/logo.jpeg');
        setPrimaryColor(d.primaryColor || '#1a2744');
        setMaintenanceMode(d.maintenanceMode);
        setMaintenanceMessage(d.maintenanceMessage || "Scheduled maintenance in progress. We'll be back shortly.");
        setBackupFrequency(d.backupFrequency || 'Daily');
        setBackupTime(d.backupTime || '02:00 AM');
        setBackupTarget(d.backupTarget || 'Amazon S3: production-vault-01');
      }

      // 2. Get schools list
      const schoolsRes = await apiClient.get('/super/schools');
      setSchools(schoolsRes.data || []);

      // 3. Get Express audit logs
      const logsRes = await expressClient.get('/logs');
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Error fetching settings/schools/logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchSchoolCredentials = async (schoolId) => {
    try {
      const res = await apiClient.get(`/super/schools/${schoolId}/credentials`);
      if (res.data) {
        setRazorpayKeyId(res.data.razorpayKeyId || '');
        setRazorpayKeySecret(res.data.razorpayKeySecret || '');
        setTwilioAccountSid(res.data.twilioAccountSid || '');
        setTwilioAuthToken(res.data.twilioAuthToken || '');
        setTwilioWhatsAppFromNumber(res.data.twilioWhatsAppFromNumber || '');
      }
    } catch (err) {
      console.error('Error fetching credentials:', err);
    }
  };

  const handleScopeChange = (scopeId) => {
    setSelectedScope(scopeId);
    setSaveSuccess(false);
    setSaveError('');
    if (scopeId === 'global') {
      if (globalSettings) {
        setOrgName(globalSettings.orgName || 'SuperAdmin Global');
        setLogoUrl(globalSettings.logoUrl || '/logo.jpeg');
        setPrimaryColor(globalSettings.primaryColor || '#1a2744');
      }
    } else {
      const school = schools.find(s => s.id === scopeId);
      if (school) {
        setSchoolName(school.name || '');
        setSchoolLogoUrl(school.logoUrl || '/logo.jpeg');
        setSchoolEmailDomain(school.emailDomain || school.adminEmail || '');
        setSchoolThemeColor(school.themeColor || '#1a2744');
        fetchSchoolCredentials(scopeId);
      }
    }
  };

  const handleSavePaymentCreds = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/super/schools/${selectedScope}/credentials/razorpay`, {
        keyId: razorpayKeyId,
        keySecret: razorpayKeySecret
      });
      alert('Razorpay credentials updated successfully for this school!');
      setShowPaymentModal(false);
    } catch (err) {
      alert('Failed to update Razorpay credentials: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSaveWhatsAppCreds = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/super/schools/${selectedScope}/credentials/twilio`, {
        accountSid: twilioAccountSid,
        authToken: twilioAuthToken,
        whatsAppFromNumber: twilioWhatsAppFromNumber
      });
      alert('Twilio WhatsApp credentials updated successfully for this school!');
      setShowWhatsAppModal(false);
    } catch (err) {
      alert('Failed to update WhatsApp credentials: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSave = async () => {
    setSaveSuccess(false);
    setSaveError('');
    try {
      if (selectedScope === 'global') {
        const payload = {
          orgName,
          logoUrl,
          primaryColor,
          maintenanceMode,
          maintenanceMessage,
          backupFrequency,
          backupTime,
          backupTarget
        };
        const res = await apiClient.post('/super/settings', payload);
        setGlobalSettings(res.data);
        setSaveSuccess(true);

        // Update local user theme for super admin immediately
        if (user && user.role === 'superadmin') {
          const updatedUser = { ...user, themeColor: primaryColor };
          setUser(updatedUser);
          localStorage.setItem('eduvault_user', JSON.stringify(updatedUser));
        }

        // Record log in MongoDB
        await expressClient.post('/logs', {
          actionType: 'SETTINGS_UPDATE',
          description: 'Updated global platform settings and branding configurations.'
        });
      } else {
        const payload = {
          name: schoolName,
          logoUrl: schoolLogoUrl,
          emailDomain: schoolEmailDomain,
          themeColor: schoolThemeColor
        };
        await apiClient.put(`/super/schools/${selectedScope}`, payload);

        // Refresh schools list
        const schoolsRes = await apiClient.get('/super/schools');
        setSchools(schoolsRes.data || []);
        
        setSaveSuccess(true);

        // Record log in MongoDB
        await expressClient.post('/logs', {
          actionType: 'SCHOOL_UPDATE',
          description: `Updated branding configurations for school: ${schoolName} (${schoolEmailDomain}).`
        });
      }

      // Reload audit logs
      const logsRes = await expressClient.get('/logs');
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Error saving configurations:', err);
      setSaveError(err.response?.data?.error || 'Failed to save configuration settings.');
    }
  };

  const handleDiscard = () => {
    handleScopeChange(selectedScope);
  };

  const exportLogsCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Timestamp', 'User', 'Role', 'Action Type', 'Description', 'IP Address'];
    const rows = filteredLogs.map(l => [
      l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
      l.email || '',
      l.role || '',
      l.actionType || '',
      l.description || '',
      l.ipAddress || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eduvault_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerManualBackup = async () => {
    try {
      await expressClient.post('/logs', {
        actionType: 'SYSTEM',
        description: 'Manual backup triggered by Super Admin.'
      });
      alert('Manual backup successfully initiated!');
      const logsRes = await expressClient.get('/logs');
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error('Backup trigger error:', err);
    }
  };

  const filteredLogs = logs.filter(l => {
    const query = searchQuery.toLowerCase();
    return (
      (l.email && l.email.toLowerCase().includes(query)) ||
      (l.role && l.role.toLowerCase().includes(query)) ||
      (l.actionType && l.actionType.toLowerCase().includes(query)) ||
      (l.description && l.description.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin text-3xl text-primary">⟳</div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Platform Settings" />

      {saveSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
          ✅ Configuration settings saved successfully!
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
          ⚠️ {saveError}
        </div>
      )}

      {/* Scope Selector */}
      <div className="card mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Configure Branding For</label>
        <select 
          value={selectedScope} 
          onChange={e => handleScopeChange(e.target.value)} 
          className="input font-semibold text-primary max-w-md"
        >
          <option value="global">Default Platform Branding (Global)</option>
          {schools.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.emailDomain || s.adminEmail || 'No email domain'})
            </option>
          ))}
        </select>
      </div>

      {/* Branding configurations */}
      <div className="card mb-6">
        <h3 className="font-display font-semibold text-primary mb-1">Branding Configuration</h3>
        <p className="text-xs text-gray-400 mb-5">
          {selectedScope === 'global' 
            ? 'Customize the look and feel of your platform.' 
            : `Customize the branding values for school: ${schoolName}`}
        </p>
        
        {selectedScope === 'global' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Platform Logo</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center bg-gray-50">
                <img 
                  src={logoUrl} 
                  alt="Platform Logo" 
                  className="w-20 h-20 rounded-full object-cover border border-gray-200 shadow-sm mb-3" 
                />
                <input 
                  type="text" 
                  value={logoUrl} 
                  onChange={e => setLogoUrl(e.target.value)} 
                  placeholder="Logo URL (e.g. /logo.jpeg)" 
                  className="input text-xs" 
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Organization Name</label>
                <input value={orgName} onChange={e => setOrgName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Primary Brand Color</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <input 
                      type="color" 
                      value={primaryColor} 
                      onChange={e => setPrimaryColor(e.target.value)} 
                      className="w-10 h-10 rounded-full border-0 cursor-pointer overflow-hidden shadow-sm shrink-0" 
                    />
                    <input 
                      type="text" 
                      value={primaryColor} 
                      onChange={e => setPrimaryColor(e.target.value)} 
                      placeholder="#1a2744" 
                      className="input text-xs w-28 font-mono" 
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {['#1a2744', '#2563EB', '#1E40AF', '#059669', '#4F46E5', '#0284C7', '#334155', '#0F766E', '#7C3AED', '#1E3A8A', '#0EA5A4'].map(c=>(
                      <div 
                        key={c} 
                        onClick={() => setPrimaryColor(c)} 
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all ${primaryColor.toLowerCase() === c.toLowerCase() ? 'border-primary scale-110 shadow-sm' : 'border-white hover:scale-110'}`} 
                        style={{background:c}}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">School Logo</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 flex flex-col items-center justify-center bg-gray-50">
                <img 
                  src={schoolLogoUrl} 
                  alt="School Logo" 
                  className="w-20 h-20 rounded-full object-cover border border-gray-200 shadow-sm mb-3" 
                />
                <input 
                  type="text" 
                  value={schoolLogoUrl} 
                  onChange={e => setSchoolLogoUrl(e.target.value)} 
                  placeholder="Logo URL (e.g. /logo.jpeg)" 
                  className="input text-xs" 
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Name</label>
                  <input value={schoolName} onChange={e => setSchoolName(e.target.value)} className="input" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">School Email Domain</label>
                  <input value={schoolEmailDomain} onChange={e => setSchoolEmailDomain(e.target.value)} className="input" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Primary Brand Color</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 shrink-0">
                    <input 
                      type="color" 
                      value={schoolThemeColor} 
                      onChange={e => setSchoolThemeColor(e.target.value)} 
                      className="w-10 h-10 rounded-full border-0 cursor-pointer overflow-hidden shadow-sm shrink-0" 
                    />
                    <input 
                      type="text" 
                      value={schoolThemeColor} 
                      onChange={e => setSchoolThemeColor(e.target.value)} 
                      placeholder="#1a2744" 
                      className="input text-xs w-28 font-mono" 
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {['#1a2744', '#2563EB', '#1E40AF', '#059669', '#4F46E5', '#0284C7', '#334155', '#0F766E', '#7C3AED', '#1E3A8A', '#0EA5A4'].map(c=>(
                      <div 
                        key={c} 
                        onClick={() => setSchoolThemeColor(c)} 
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 transition-all ${schoolThemeColor.toLowerCase() === c.toLowerCase() ? 'border-primary scale-110 shadow-sm' : 'border-white hover:scale-110'}`} 
                        style={{background:c}}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5 mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-outline font-bold text-xs flex items-center gap-1.5 border-blue-200 text-blue-600 hover:bg-blue-50 py-2.5 px-4"
                >
                  💳 Payment Mode Integration
                </button>
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="btn-outline font-bold text-xs flex items-center gap-1.5 border-emerald-200 text-emerald-600 hover:bg-emerald-50 py-2.5 px-4"
                >
                  💬 WhatsApp Integration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Global settings section (Maintenance & Backup) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 relative">
        {selectedScope !== 'global' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl border border-gray-100">
            <div className="bg-white px-5 py-3 rounded-xl shadow border border-gray-100 text-xs font-semibold text-gray-500">
              ℹ Select "Default Platform Branding (Global)" above to configure Maintenance and Backup parameters.
            </div>
          </div>
        )}

        <div className="card">
          <h3 className="font-semibold text-primary mb-1">Maintenance Mode</h3>
          <p className="text-xs text-gray-400 mb-4">Prevent users from accessing the platform</p>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-primary">Enable Maintenance</span>
            <button 
              onClick={() => setMaintenanceMode(!maintenanceMode)} 
              className={`w-12 h-6 rounded-full transition-all ${maintenanceMode ? 'bg-primary' : 'bg-gray-200'} relative`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${maintenanceMode ? 'left-6.5 left-[26px]' : 'left-0.5'}`}></div>
            </button>
          </div>
          <textarea 
            rows={3} 
            value={maintenanceMessage} 
            onChange={e => setMaintenanceMessage(e.target.value)} 
            className="input text-xs resize-none mb-2" 
          />
          {maintenanceMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-700">
              ⚠ Enabling this will log out all current users except admins.
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-primary">Backup Schedule</h3>
            <button onClick={triggerManualBackup} className="btn-outline text-xs py-1">Manual Backup</button>
          </div>
          <p className="text-xs text-gray-400 mb-4">Automated system and database backups</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Frequency</label>
              <select 
                value={backupFrequency} 
                onChange={e => setBackupFrequency(e.target.value)} 
                className="input text-xs"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Time (UTC)</label>
              <input 
                value={backupTime} 
                onChange={e => setBackupTime(e.target.value)} 
                className="input text-xs" 
              />
            </div>
          </div>
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span>☁</span>
              <span className="text-xs font-medium text-blue-700">{backupTarget}</span>
            </div>
            <input 
              type="text" 
              value={backupTarget} 
              onChange={e => setBackupTarget(e.target.value)} 
              className="bg-transparent text-xs font-semibold text-blue-800 border-b border-dashed border-blue-400 focus:outline-none w-48 text-right" 
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-primary">Audit Logs</h3>
            <p className="text-xs text-gray-400">Recent system-wide administrative actions</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <input 
              placeholder="Search logs..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="input text-xs flex-1 sm:w-52" 
            />
            <button onClick={exportLogsCSV} className="btn-outline text-xs py-1.5 whitespace-nowrap">↓ Export CSV</button>
          </div>
        </div>
        
        <div style={{ overflowX: 'auto', margin: '0 -12px', width: 'calc(100% + 24px)', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'inline-block', minWidth: '100%', verticalAlign: 'middle', padding: '0 12px' }}>
            <div className="max-h-[305px] overflow-y-auto relative border border-gray-100 rounded-lg">
              <table className="w-full" style={{ minWidth: '720px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="border-b border-gray-100 sticky top-0 bg-white z-10">
                    <th className="table-th bg-white">Timestamp</th>
                    <th className="table-th bg-white">User (Email)</th>
                    <th className="table-th bg-white">Role</th>
                    <th className="table-th bg-white">Action Type</th>
                    <th className="table-th bg-white">Description</th>
                    <th className="table-th bg-white">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((l, i) => (
                    <tr key={l._id || i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="table-td text-xs text-gray-500 font-mono">
                        {l.timestamp ? new Date(l.timestamp).toLocaleString() : ''}
                      </td>
                      <td className="table-td font-semibold text-primary text-xs">{l.email}</td>
                      <td className="table-td text-xs text-gray-500 capitalize">{l.role}</td>
                      <td className="table-td">
                        <span 
                          className="badge transition-all shadow-sm"
                          style={getActionTypeStyle(l.actionType || 'SYSTEM')}
                        >
                          {l.actionType || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="table-td text-xs text-gray-600 font-medium">{l.description}</td>
                      <td className="table-td text-xs text-gray-400 font-mono">{l.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                  {filteredLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">No activity logs recorded.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={handleDiscard} className="btn-outline text-xs py-1.5">Discard Changes</button>
          <button onClick={handleSave} className="btn-primary text-xs py-1.5">Save Changes</button>
        </div>
      </div>

      {/* Payment Credentials Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSavePaymentCreds} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-primary text-xl">💳 Payment Integration</h3>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✖</button>
              </div>
              <p className="text-xs text-gray-400 mb-4">Configure custom Razorpay payment keys for {schoolName}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Razorpay Key ID</label>
                  <input 
                    required 
                    placeholder="rzp_test_..." 
                    value={razorpayKeyId} 
                    onChange={e => setRazorpayKeyId(e.target.value)} 
                    className="input" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Razorpay Key Secret</label>
                  <input 
                    required 
                    type="password" 
                    placeholder="••••••••••••" 
                    value={razorpayKeySecret} 
                    onChange={e => setRazorpayKeySecret(e.target.value)} 
                    className="input" 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary">Save Keys</button>
            </div>
          </form>
        </div>
      )}

      {/* WhatsApp Credentials Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveWhatsAppCreds} className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-left">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-display font-bold text-primary text-xl">💬 WhatsApp Integration</h3>
                <button type="button" onClick={() => setShowWhatsAppModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✖</button>
              </div>
              <p className="text-xs text-gray-400 mb-4">Configure custom Twilio WhatsApp credentials for {schoolName}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Twilio Account SID</label>
                  <input 
                    required 
                    placeholder="AC..." 
                    value={twilioAccountSid} 
                    onChange={e => setTwilioAccountSid(e.target.value)} 
                    className="input" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Twilio Auth Token</label>
                  <input 
                    required 
                    type="password" 
                    placeholder="••••••••••••" 
                    value={twilioAuthToken} 
                    onChange={e => setTwilioAuthToken(e.target.value)} 
                    className="input" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">WhatsApp From Number</label>
                  <input 
                    required 
                    placeholder="whatsapp:+14155238886" 
                    value={twilioWhatsAppFromNumber} 
                    onChange={e => setTwilioWhatsAppFromNumber(e.target.value)} 
                    className="input" 
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => setShowWhatsAppModal(false)} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-primary">Save Settings</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
