import axios from 'axios';

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? "" : "https://edtech-college-website.onrender.com");

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach JWT token to every request and normalize paths to prepend /api if missing
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (config.url && !config.url.startsWith('http')) {
    const baseHasApi = API_BASE_URL.includes('/api');
    const urlHasApi = config.url.startsWith('/api') || config.url.startsWith('api');
    
    if (!baseHasApi && !urlHasApi) {
      config.url = '/api' + (config.url.startsWith('/') ? '' : '/') + config.url;
    } else if (baseHasApi && urlHasApi) {
      config.url = config.url.replace(/^\/?api/, '');
    }
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const msg = error.response.data?.message;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (msg === 'Logged in from another device') {
        alert('Logged in from another device. This session is no longer active.');
      }
      window.location.href = '/login';
    }
    if (error.response?.status === 403) {
      const msg = error.response.data?.message;
      if (msg === 'Password expired') {
        const expiredEmail = error.response.data?.email;
        if (expiredEmail) {
          localStorage.setItem('expired_email', expiredEmail);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Your password has expired (90 days). You must change it to proceed.');
        window.location.href = '/change-password';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
