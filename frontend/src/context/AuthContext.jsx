import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/auth.js';
import { extractErrorMessage } from '../api/client.js';
import { tokenStorage } from '../utils/tokenStorage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Instantly restore user from tab sessionStorage on F5 refresh
  const [user, setUser] = useState(() => tokenStorage.getCachedUser());
  // If we already have a restored user, do not block the UI with a full-screen loading spinner
  const [isLoading, setIsLoading] = useState(() => !tokenStorage.getCachedUser());
  const [authError, setAuthError] = useState(null);

  // Check and verify current session on mount / refresh
  const checkAuth = useCallback(async () => {
    try {
      // If we don't have a cached user, show loading indicator
      if (!tokenStorage.getCachedUser()) {
        setIsLoading(true);
      }

      const userData = await authApi.getMe();
      setUser(userData);
      tokenStorage.setAuthData({ user: userData });
      setAuthError(null);
    } catch (err) {
      // If getMe returned 401, check if we can restore via refresh token
      try {
        const refreshRes = await authApi.refresh();
        const refreshedUser = refreshRes?.data?.user;
        const newToken = refreshRes?.data?.token;
        const newRefreshToken = refreshRes?.data?.refreshToken;

        if (refreshedUser) {
          setUser(refreshedUser);
          tokenStorage.setAuthData({
            accessToken: newToken,
            refreshToken: newRefreshToken,
            user: refreshedUser
          });
          setAuthError(null);
          return;
        }
      } catch (refreshErr) {
        // Refresh token is expired or absent
      }

      // No active session -> clean up and mark unauthenticated
      tokenStorage.clearAuthData();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async ({ email, password }) => {
    try {
      setAuthError(null);
      const res = await authApi.login({ email, password });
      const loggedUser = res?.data?.user;
      const token = res?.data?.token;
      const refreshToken = res?.data?.refreshToken;

      tokenStorage.setAuthData({
        accessToken: token,
        refreshToken,
        user: loggedUser
      });

      setUser(loggedUser);
      return { success: true, user: loggedUser };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // Register handler
  const register = async ({ email, password, name }) => {
    try {
      setAuthError(null);
      const res = await authApi.register({ email, password, name });
      const registeredUser = res?.data?.user;
      const token = res?.data?.token;
      const refreshToken = res?.data?.refreshToken;

      tokenStorage.setAuthData({
        accessToken: token,
        refreshToken,
        user: registeredUser
      });

      setUser(registeredUser);
      return { success: true, user: registeredUser };
    } catch (err) {
      const msg = extractErrorMessage(err);
      setAuthError(msg);
      return { success: false, error: msg };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      tokenStorage.clearAuthData();
      setUser(null);
      setAuthError(null);
    }
  };

  // Logout from all devices
  const logoutAll = async () => {
    try {
      await authApi.logoutAll();
    } catch (err) {
      console.warn('LogoutAll warning:', err);
    } finally {
      tokenStorage.clearAuthData();
      setUser(null);
      setAuthError(null);
    }
  };

  // Update profile name
  const updateProfile = async ({ name }) => {
    try {
      const updatedUser = await authApi.updateProfile({ name });
      tokenStorage.setAuthData({ user: updatedUser });
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      const msg = extractErrorMessage(err);
      return { success: false, error: msg };
    }
  };

  // Update email address
  const updateEmail = async ({ newEmail, currentPassword }) => {
    try {
      const updatedUser = await authApi.updateEmail({ newEmail, currentPassword });
      tokenStorage.setAuthData({ user: updatedUser });
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (err) {
      const msg = extractErrorMessage(err);
      return { success: false, error: msg };
    }
  };

  // Change password
  const changePassword = async ({ currentPassword, newPassword }) => {
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      if (res.data?.user) {
        tokenStorage.setAuthData({
          accessToken: res.data.token,
          refreshToken: res.data.refreshToken,
          user: res.data.user
        });
        setUser(res.data.user);
      }
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      return { success: false, error: msg };
    }
  };

  // Delete account
  const deleteAccount = async ({ currentPassword }) => {
    try {
      await authApi.deleteAccount({ currentPassword });
      tokenStorage.clearAuthData();
      setUser(null);
      return { success: true };
    } catch (err) {
      const msg = extractErrorMessage(err);
      return { success: false, error: msg };
    }
  };

  const value = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    logoutAll,
    updateProfile,
    updateEmail,
    changePassword,
    deleteAccount,
    refetchUser: checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
