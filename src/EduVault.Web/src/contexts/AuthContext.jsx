import { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/apiClient';

const AuthContext = createContext(null);

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

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = response.data;
      
      localStorage.setItem('eduvault_token', jwtToken);
      localStorage.setItem('eduvault_user', JSON.stringify(userData));
      
      setToken(jwtToken);
      setUser(userData);
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
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, registerSchool }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
