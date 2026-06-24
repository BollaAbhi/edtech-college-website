import axios from 'axios';

const api = axios.create({
  baseURL: 'https://edtech-college-website.onrender.com',
});

// Attach JWT token to every request and normalize paths to prepend /api if missing
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.url && !config.url.startsWith('http') && !config.url.startsWith('/api') && !config.url.startsWith('api')) {
    config.url = '/api' + (config.url.startsWith('/') ? '' : '/') + config.url;
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
