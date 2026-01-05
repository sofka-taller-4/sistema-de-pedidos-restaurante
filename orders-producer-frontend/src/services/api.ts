import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ✅ Always send cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// ✅ Response interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If we get 401 and haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        console.log('🔄 Access token expired, attempting refresh...');
        
        // Try to refresh the token
        await axios.post(`${API_BASE_URL}/api/admin/auth/refresh`, {}, {
          withCredentials: true
        });
        
        console.log('✅ Token refreshed successfully');
        
        // Retry the original request
        return api(originalRequest);
        
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Refresh failed - redirect to login
        // Clear any auth state
        const { useAuth } = await import('../store/auth');
        useAuth.getState().clear();
        
        // Redirect to login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// ✅ Request interceptor for debugging (with sensitive data obfuscation)
api.interceptors.request.use(
  (config) => {
    const method = config.method?.toUpperCase();
    const url = config.url;
    
    // ✅ Ofuscar datos sensibles en logs
    let logData = `🌐 API Request: ${method} ${url}`;
    if (config.data && typeof config.data === 'string') {
      try {
        const parsedData = JSON.parse(config.data);
        if (parsedData.password) {
          logData += ` [password: ${'*'.repeat(parsedData.password.length)}]`;
        }
      } catch {
        // Si no se puede parsear, no mostrar el body
        logData += ' [body: hidden]';
      }
    }
    
    console.log(logData);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error.message);
    return Promise.reject(error);
  }
);

export default api;