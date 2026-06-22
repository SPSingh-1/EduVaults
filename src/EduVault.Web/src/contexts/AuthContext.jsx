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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('eduvault_token');
    const savedUser = localStorage.getItem('eduvault_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (user && user.themeColor) {
      const mainColor = user.themeColor;
      root.style.setProperty('--color-primary', mainColor);
      root.style.setProperty('--color-primary-light', adjustColor(mainColor, 20));
      root.style.setProperty('--color-primary-dark', adjustColor(mainColor, -20));
    } else {
      root.style.setProperty('--color-primary', '#1a2744');
      root.style.setProperty('--color-primary-light', '#243457');
      root.style.setProperty('--color-primary-dark', '#111b33');
    }
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
    <AuthContext.Provider value={{ user, token, loading, login, logout, registerSchool, maintenanceActive, checkMaintenance }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
