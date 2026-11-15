import axios from 'axios';
import { appConfig } from '../config/appConfig.js';
import { tokenStorage } from '../utils/tokenStorage.js';

// Centralized API client: uses appConfig.apiBaseUrl (defaults to '' for relative /api proxy)
export const apiClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: true, // Send and receive secure HttpOnly session cookies
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF prevention header
    'X-Shortly-Client': 'web'
  },
  timeout: 15000
});

// Request interceptor: attach Authorization header and refresh token if present
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccessToken();
    if (token && !config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken && !config.headers['x-refresh-token']) {
      config.headers['x-refresh-token'] = refreshToken;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent infinite retry loops during token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: automatically refresh expired access token and retry request
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only retry 401 on non-refresh and non-login requests
    const isAuthEndpoint =
      originalRequest?.url?.includes('/api/auth/refresh') ||
      originalRequest?.url?.includes('/api/auth/login');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      // If we don't even have a refresh token or cookies, don't attempt loop
      const hasRefreshToken = Boolean(tokenStorage.getRefreshToken());
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            if (newToken && originalRequest?.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const storedRefreshToken = tokenStorage.getRefreshToken();
        const refreshPayload = storedRefreshToken ? { refreshToken: storedRefreshToken } : {};
        const res = await apiClient.post('/api/auth/refresh', refreshPayload);
        
        const newToken = res.data?.data?.token;
        const newRefreshToken = res.data?.data?.refreshToken;
        const newUser = res.data?.data?.user;

        if (newToken) {
          tokenStorage.setAuthData({
            accessToken: newToken,
            refreshToken: newRefreshToken,
            user: newUser
          });
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          if (originalRequest?.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }
        }

        processQueue(null, newToken);
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        tokenStorage.clearAuthData();
        // If refresh fails, session is expired/invalid -> redirect to login if currently on protected page
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Format error message from backend
export function extractErrorMessage(err) {
  if (err.response?.data?.error) {
    return err.response.data.error;
  }
  if (err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err.message === 'Network Error') {
    return 'Cannot connect to Shortly backend server. Please verify it is running.';
  }
  return err.message || 'An unexpected error occurred';
}
