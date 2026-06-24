import axios from 'axios';

const API_BASE_URL = 
  import.meta.env.VITE_API_URL || 
  "https://edtech-college-website.onrender.com";

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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
