import { authService } from '../services/authService.js';
import { setAuthCookies, clearAuthCookies, extractAuthTokens } from '../utils/cookieHelper.js';

export const authController = {
  /**
   * User Registration
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;
      const result = await authService.register({
        email,
        password,
        name,
        req
      });

      // Set secure HttpOnly cookies
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });

      res.status(201).json({
        success: true,
        message: 'Account registered successfully.',
        data: {
          user: result.user,
          token: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * User Login
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({
        email,
        password,
        req
      });

      // Set secure HttpOnly cookies
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });

      res.status(200).json({
        success: true,
        message: 'Logged in successfully.',
        data: {
          user: result.user,
          token: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Session Restoration / Token Rotation
   * POST /api/auth/refresh
   */
  async refresh(req, res, next) {
    try {
      const { refreshToken: rawRefreshToken } = extractAuthTokens(req);
      const result = await authService.refreshSession(rawRefreshToken, req);

      // Rotate cookies with newly generated tokens
      setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });

      res.status(200).json({
        success: true,
        message: 'Session refreshed successfully.',
        data: {
          user: result.user,
          token: result.accessToken,
          refreshToken: result.refreshToken
        }
      });
    } catch (err) {
      // If refresh fails, clear invalid cookies
      clearAuthCookies(res);
      next(err);
    }
  },

  /**
   * Logout (Current Device)
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken: rawRefreshToken } = extractAuthTokens(req);
      if (rawRefreshToken) {
        await authService.logout(rawRefreshToken);
      }

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully.'
      });
    } catch (err) {
      clearAuthCookies(res);
      next(err);
    }
  },

  /**
   * Logout (All Devices)
   * POST /api/auth/logout-all
   */
  async logoutAll(req, res, next) {
    try {
      await authService.logoutAll(req.user.id);
      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Logged out from all active sessions successfully.'
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get Current Logged-In User Profile
   * GET /api/auth/me
   */
  async me(req, res, next) {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update Profile Name
   * PATCH /api/auth/profile
   */
  async updateProfile(req, res, next) {
    try {
      const { name } = req.body;
      const user = await authService.updateProfile(req.user.id, { name });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: user
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Update Account Email
   * PATCH /api/auth/email
   */
  async updateEmail(req, res, next) {
    try {
      const { newEmail, currentPassword } = req.body;
      const user = await authService.updateEmail(req.user.id, {
        newEmail,
        currentPassword
      });

      res.status(200).json({
        success: true,
        message: 'Email address updated successfully.',
        data: user
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Change Password
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await authService.changePassword(req.user.id, {
        currentPassword,
        newPassword
      });

      // Generate fresh token pair for this device
      const tokens = await authService.generateTokens(user, {
        userAgent: req.headers['user-agent'] || '',
        ip: req.ip || ''
      });

      setAuthCookies(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. All other sessions have been logged out.',
        data: {
          user,
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken
        }
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Delete Account & Cascade URLs
   * DELETE /api/auth/account
   */
  async deleteAccount(req, res, next) {
    try {
      const { currentPassword } = req.body;
      await authService.deleteAccount(req.user.id, { currentPassword });

      clearAuthCookies(res);

      res.status(200).json({
        success: true,
        message: 'Account and all associated links have been permanently deleted.'
      });
    } catch (err) {
      next(err);
    }
  }
};
