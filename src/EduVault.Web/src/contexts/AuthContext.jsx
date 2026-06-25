import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';

const AuthContext = createContext(null);

const adjustColor = (hex, percent) => {
  if (!hex || hex[0] !== '#') return hex;
  let color = hex.replace(/^\s*#|\s*$/g, '');
  if (color.length === 3) {
    color = color.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(color.substr(0, 2), 16);
  let g = parseInt(color.substr(2, 2), 16);
  let b = parseInt(color.substr(4, 2), 16);

  r = Math.max(0, Math.min(255, r + percent));
  g = Math.max(0, Math.min(255, g + percent));
  b = Math.max(0, Math.min(255, b + percent));

  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
};

const hexToRgbSpace = (hex) => {
  if (!hex || hex[0] !== '#') return hex;
  let color = hex.replace(/^\s*#|\s*$/g, '');
  if (color.length === 3) {
    color = color.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(color.substr(0, 2), 16);
  let g = parseInt(color.substr(2, 2), 16);
  let b = parseInt(color.substr(4, 2), 16);
  return `${r} ${g} ${b}`;
};

const getContrastColor = (hex) => {
  if (!hex || hex[0] !== '#') return '#ffffff';
  let color = hex.replace(/^\s*#|\s*$/g, '');
  if (color.length === 3) {
    color = color.replace(/(.)/g, '$1$1');
  }
  let r = parseInt(color.substr(0, 2), 16);
  let g = parseInt(color.substr(2, 2), 16);
  let b = parseInt(color.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 145) ? '#1a2744' : '#ffffff';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('eduvault_token');
    const savedUser = localStorage.getItem('eduvault_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      // Dynamically fetch and sync the latest branding (themeColor) from database
      const syncBranding = async () => {
        try {
          if (parsedUser.role === 'superadmin') {
            const res = await apiClient.get('/auth/settings');
            if (res.data && res.data.primaryColor) {
              const updatedUser = { ...parsedUser, themeColor: res.data.primaryColor };
              setUser(updatedUser);
              localStorage.setItem('eduvault_user', JSON.stringify(updatedUser));
            }
          } else {
            const domain = parsedUser.emailDomain || parsedUser.email?.split('@')[1];
            if (domain) {
              const res = await apiClient.get(`/auth/school-branding?domain=${domain}`);
              if (res.data && res.data.themeColor) {
                const updatedUser = { ...parsedUser, themeColor: res.data.themeColor };
                setUser(updatedUser);
                localStorage.setItem('eduvault_user', JSON.stringify(updatedUser));
              }
            }
          }
        } catch (err) {
          console.error('Failed to sync branding on initialization:', err);
        }
      };
      syncBranding();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const applyColorVars = (color) => {
      const contrast = getContrastColor(color);
      root.style.setProperty('--color-primary', hexToRgbSpace(color));
      root.style.setProperty('--color-primary-light', hexToRgbSpace(adjustColor(color, 20)));
      root.style.setProperty('--color-primary-dark', hexToRgbSpace(adjustColor(color, -20)));
      root.style.setProperty('--color-primary-contrast', contrast);
      
      if (contrast === '#1a2744') {
        // Light primary theme
        root.style.setProperty('--sidebar-text', 'rgba(26, 39, 68, 0.7)');
        root.style.setProperty('--sidebar-text-hover', '#1a2744');
        root.style.setProperty('--sidebar-bg-hover', 'rgba(26, 39, 68, 0.06)');
        root.style.setProperty('--sidebar-bg-active', 'rgba(26, 39, 68, 0.12)');
      } else {
        // Dark primary theme
        root.style.setProperty('--sidebar-text', 'rgba(255, 255, 255, 0.7)');
        root.style.setProperty('--sidebar-text-hover', '#ffffff');
        root.style.setProperty('--sidebar-bg-hover', 'rgba(255, 255, 255, 0.08)');
        root.style.setProperty('--sidebar-bg-active', 'rgba(255, 255, 255, 0.15)');
      }
    };

    if (user && user.themeColor) {
      applyColorVars(user.themeColor);
    } else {
      applyColorVars('#1a2744');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(async () => {
      try {
        if (user.role === 'superadmin') {
          const res = await apiClient.get('/auth/settings');
          if (res.data && res.data.primaryColor && res.data.primaryColor !== user.themeColor) {
            setUser(prevUser => {
              if (!prevUser) return prevUser;
              const updated = { ...prevUser, themeColor: res.data.primaryColor };
              localStorage.setItem('eduvault_user', JSON.stringify(updated));
              return updated;
            });
          }
        } else {
          const domain = user.emailDomain || user.email?.split('@')[1];
          if (domain) {
            const res = await apiClient.get(`/auth/school-branding?domain=${domain}`);
            if (res.data && res.data.themeColor && res.data.themeColor !== user.themeColor) {
              setUser(prevUser => {
                if (!prevUser) return prevUser;
                const updated = { ...prevUser, themeColor: res.data.themeColor };
                localStorage.setItem('eduvault_user', JSON.stringify(updated));
                return updated;
              });
            }
          }
        }
      } catch (err) {
        console.error('Error syncing branding periodically:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const [maintenanceActive, setMaintenanceActive] = useState(false);

  const checkMaintenance = async () => {
    try {
      const res = await apiClient.get('/auth/settings');
      if (res.data && res.data.maintenanceMode) {
        setMaintenanceActive(true);
      } else {
        setMaintenanceActive(false);
      }
    } catch (err) {
      console.error('Error loading settings in AuthContext:', err);
    }
  };

  useEffect(() => {
    checkMaintenance();
  }, [user]);

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = response.data;
      
      localStorage.setItem('eduvault_token', jwtToken);
      localStorage.setItem('eduvault_user', JSON.stringify(userData));
      
      setToken(jwtToken);
      setUser(userData);
      
      // Recheck maintenance status on login
      if (userData.role !== 'superadmin' && userData.role !== 'schooladmin') {
        const settingsRes = await apiClient.get('/auth/settings');
        if (settingsRes.data && settingsRes.data.maintenanceMode) {
          setMaintenanceActive(true);
        }
      }
      
      return { success: true, role: userData.role };
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg = error.response?.data?.error || 'Invalid credentials. Please try again.';
      return { success: false, error: errorMsg };
    }
  };

  const registerSchool = async (formData) => {
    try {
      const response = await apiClient.post('/auth/register-school', formData);
      return { success: true, data: response.data };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Registration failed.';
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('eduvault_token');
    localStorage.removeItem('eduvault_user');
    sessionStorage.removeItem('eduvault_welcome_shown');
    setToken(null);
    setUser(null);
    setMaintenanceActive(false);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, logout, registerSchool, maintenanceActive, checkMaintenance }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
