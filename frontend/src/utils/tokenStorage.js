/**
 * Client-Side Token & Session Persistence Helper
 *
 * Implements secure tab-session restoration across page refreshes (F5).
 * Uses sessionStorage (tab-scoped, automatically purged on tab close)
 * and in-memory caching.
 *
 * NOTE: Strictly adheres to security guidelines: Never stores tokens in localStorage.
 */

const TOKEN_KEY = 'shortly_access_token';
const REFRESH_KEY = 'shortly_refresh_token';
const USER_KEY = 'shortly_auth_user';

let inMemoryAccessToken = null;

export const tokenStorage = {
  /**
   * Retrieve current access token (in-memory first, fallback to tab sessionStorage)
   */
  getAccessToken() {
    if (inMemoryAccessToken) return inMemoryAccessToken;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const stored = sessionStorage.getItem(TOKEN_KEY);
        if (stored) {
          inMemoryAccessToken = stored;
          return stored;
        }
      }
    } catch {}
    return null;
  },

  /**
   * Retrieve session refresh token from tab sessionStorage
   */
  getRefreshToken() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return sessionStorage.getItem(REFRESH_KEY);
      }
    } catch {}
    return null;
  },

  /**
   * Retrieve cached user profile for instant optimistic session restoration on F5
   */
  getCachedUser() {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const raw = sessionStorage.getItem(USER_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return null;
  },

  /**
   * Persist session tokens and user profile
   */
  setAuthData({ accessToken, refreshToken, user }) {
    if (accessToken) {
      inMemoryAccessToken = accessToken;
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(TOKEN_KEY, accessToken);
        }
      } catch {}
    }
    if (refreshToken) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(REFRESH_KEY, refreshToken);
        }
      } catch {}
    }
    if (user) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        }
      } catch {}
    }
  },

  /**
   * Clear all session data on logout or session expiration
   */
  clearAuthData() {
    inMemoryAccessToken = null;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_KEY);
        sessionStorage.removeItem(USER_KEY);
      }
    } catch {}
  }
};
