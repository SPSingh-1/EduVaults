import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5265/api';
const EXPRESS_BASE_URL = import.meta.env.VITE_EXPRESS_URL || 'http://localhost:5000/api'; // Express runs on 5000

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const expressClient = axios.create({
  baseURL: EXPRESS_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT token in both clients
const injectToken = (config) => {
  const token = localStorage.getItem('eduvault_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(injectToken, (error) => Promise.reject(error));
expressClient.interceptors.request.use(injectToken, (error) => Promise.reject(error));

// Global response error handler
const handleResponseError = (error) => {
  if (error.response && (error.response.status === 401 || error.response.status === 403)) {
    // Clear credentials and redirect to login if session expires
    localStorage.removeItem('eduvault_token');
    localStorage.removeItem('eduvault_user');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use((res) => res, handleResponseError);
expressClient.interceptors.response.use((res) => res, handleResponseError);
