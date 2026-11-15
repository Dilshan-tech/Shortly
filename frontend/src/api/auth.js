import { apiClient } from './client.js';
import { tokenStorage } from '../utils/tokenStorage.js';

export const authApi = {
  /**
   * Register a new user
   */
  async register({ email, password, name }) {
    const res = await apiClient.post('/api/auth/register', { email, password, name });
    return res.data;
  },

  /**
   * Login user
   */
  async login({ email, password }) {
    const res = await apiClient.post('/api/auth/login', { email, password });
    return res.data;
  },

  /**
   * Refresh session tokens
   */
  async refresh() {
    const refreshToken = tokenStorage.getRefreshToken();
    const res = await apiClient.post('/api/auth/refresh', refreshToken ? { refreshToken } : {});
    return res.data;
  },

  /**
   * Logout current session
   */
  async logout() {
    const refreshToken = tokenStorage.getRefreshToken();
    const res = await apiClient.post('/api/auth/logout', refreshToken ? { refreshToken } : {});
    return res.data;
  },

  /**
   * Logout all sessions across devices
   */
  async logoutAll() {
    const res = await apiClient.post('/api/auth/logout-all');
    return res.data;
  },

  /**
   * Get current user profile
   */
  async getMe() {
    const res = await apiClient.get('/api/auth/me');
    return res.data.data;
  },

  /**
   * Update profile name
   */
  async updateProfile({ name }) {
    const res = await apiClient.patch('/api/auth/profile', { name });
    return res.data.data;
  },

  /**
   * Update email address with password verification
   */
  async updateEmail({ newEmail, currentPassword }) {
    const res = await apiClient.patch('/api/auth/email', { newEmail, currentPassword });
    return res.data.data;
  },

  /**
   * Change account password
   */
  async changePassword({ currentPassword, newPassword }) {
    const res = await apiClient.post('/api/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  /**
   * Delete account with password confirmation
   */
  async deleteAccount({ currentPassword }) {
    const res = await apiClient.delete('/api/auth/account', {
      data: { currentPassword }
    });
    return res.data;
  }
};
