import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/apiClient';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [logo, setLogo] = useState('/logo.jpeg');
  const [orgName, setOrgName] = useState('EduVault');
  const [themeColor, setThemeColor] = useState('#1a2744');
  const [globalSettings, setGlobalSettings] = useState(null);

  const roleRoutes = {
    superadmin: '/super-admin/dashboard',
    schooladmin: '/school-admin/dashboard',
    teacher: '/teacher/dashboard',
    student: '/student/dashboard',
  };

  const applyTheme = (color) => {
    const root = document.documentElement;
    
    const hexToRgbSpace = (hex) => {
      if (!hex || hex[0] !== '#') return hex;
      let colorStr = hex.replace(/^\s*#|\s*$/g, '');
      if (colorStr.length === 3) {
        colorStr = colorStr.replace(/(.)/g, '$1$1');
      }
      let r = parseInt(colorStr.substr(0, 2), 16);
      let g = parseInt(colorStr.substr(2, 2), 16);
      let b = parseInt(colorStr.substr(4, 2), 16);
      return `${r} ${g} ${b}`;
    };

    const adjustColorLocal = (hex, percent) => {
      if (!hex || hex[0] !== '#') return hex;
      let colorStr = hex.replace(/^\s*#|\s*$/g, '');
      if (colorStr.length === 3) {
        colorStr = colorStr.replace(/(.)/g, '$1$1');
      }
      let r = parseInt(colorStr.substr(0, 2), 16);
      let g = parseInt(colorStr.substr(2, 2), 16);
      let b = parseInt(colorStr.substr(4, 2), 16);

      r = Math.max(0, Math.min(255, r + percent));
      g = Math.max(0, Math.min(255, g + percent));
      b = Math.max(0, Math.min(255, b + percent));

      const rHex = r.toString(16).padStart(2, '0');
      const gHex = g.toString(16).padStart(2, '0');
      const bHex = b.toString(16).padStart(2, '0');

      return `#${rHex}${gHex}${bHex}`;
    };
    
    root.style.setProperty('--color-primary', hexToRgbSpace(color));
    root.style.setProperty('--color-primary-light', hexToRgbSpace(adjustColorLocal(color, 20)));
    root.style.setProperty('--color-primary-dark', hexToRgbSpace(adjustColorLocal(color, -20)));
  };

  const resetToGlobal = () => {
    if (globalSettings) {
      setLogo(globalSettings.logoUrl || '/logo.jpeg');
      setOrgName(globalSettings.orgName || 'EduVault');
      if (globalSettings.primaryColor) {
        setThemeColor(globalSettings.primaryColor);
        applyTheme(globalSettings.primaryColor);
      }
    } else {
      setLogo('/logo.jpeg');
      setOrgName('EduVault');
      setThemeColor('#1a2744');
      applyTheme('#1a2744');
    }
  };

  useEffect(() => {
    const fetchGlobalBranding = async () => {
      try {
        const res = await apiClient.get('/auth/settings');
        if (res.data) {
          setGlobalSettings(res.data);
          setLogo(res.data.logoUrl || '/logo.jpeg');
          setOrgName(res.data.orgName || 'EduVault');
          if (res.data.primaryColor) {
            setThemeColor(res.data.primaryColor);
            applyTheme(res.data.primaryColor);
          }
        }
      } catch (err) {
        console.error('Error loading global branding:', err);
      }
    };
    fetchGlobalBranding();
  }, []);

  const handleEmailChange = async (val) => {
    setEmail(val);
    if (!val) {
      resetToGlobal();
      return;
    }
    const parts = val.split('@');
    if (parts.length === 2 && parts[1]) {
      const domain = parts[1].toLowerCase();
      const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
      if (genericDomains.includes(domain) || domain.length < 4 || !domain.includes('.')) {
        resetToGlobal();
        return;
      }
      
      try {
        const res = await apiClient.get(`/auth/school-branding?domain=${domain}`);
        if (res.data) {
          setLogo(res.data.logoUrl || '/logo.jpeg');
          setOrgName(res.data.name || 'EduVault');
          if (res.data.themeColor) {
            setThemeColor(res.data.themeColor);
            applyTheme(res.data.themeColor);
          }
        }
      } catch (err) {
        resetToGlobal();
      }
    } else {
      resetToGlobal();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(email, password);
    setLoading(false);
    if (res.success) {
      navigate(roleRoutes[res.role]);
    } else {
      setError(res.error || 'Invalid email or password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full mb-4 shadow-xl overflow-hidden border-2 border-white">
            <img src={logo} alt="EduVault Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-2xl font-bold text-primary">{orgName}</h1>
          <p className="text-gray-500 text-sm">Manage your institution with ease</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="font-display font-bold text-primary text-xl mb-1">Welcome back</h2>
          <p className="text-gray-500 text-sm mb-6">Please enter your details to sign in</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-lg p-3 mb-4">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email Address</label>
              <input type="email" placeholder="name@school.edu" value={email} onChange={e => handleEmailChange(e.target.value)} className="input" required />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-gray-600">Password</label>
                <Link to="/forgot-password" className="text-xs text-blue-600 cursor-pointer hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="input pr-10" required />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="rounded" />
              <label htmlFor="remember" className="text-sm text-gray-600">Remember my session</label>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-light text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
              {loading ? <span className="animate-spin">⟳</span> : null}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">© 2026 EduFlow Systems Inc. · Privacy Policy · Terms</p>
      </div>
    </div>
  );
};

export default Login;
