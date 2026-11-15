import { config } from '../config/env.js';

const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Configure secure, HttpOnly authentication cookies.
 * Dynamically evaluates HTTPS context to set SameSite=None and Secure=true
 * when served over TLS or reverse proxies (e.g. devtunnels, ngrok, production).
 */
export function setAuthCookies(res, { accessToken, refreshToken }, req = null) {
  const request = req || res.req;
  const isHttps = Boolean(
    config.cookieSecure ||
    request?.secure ||
    request?.headers?.['x-forwarded-proto'] === 'https' ||
    request?.headers?.origin?.startsWith('https://') ||
    request?.headers?.referer?.startsWith('https://')
  );

  const secure = isHttps;
  const sameSite = isHttps ? 'none' : (config.cookieSameSite || 'lax');

  if (accessToken) {
    res.cookie('token', accessToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE
    });
  }

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: REFRESH_COOKIE_MAX_AGE
    });
  }
}

/**
 * Clear authentication cookies on logout or account deletion
 */
export function clearAuthCookies(res, req = null) {
  const request = req || res.req;
  const isHttps = Boolean(
    config.cookieSecure ||
    request?.secure ||
    request?.headers?.['x-forwarded-proto'] === 'https' ||
    request?.headers?.origin?.startsWith('https://') ||
    request?.headers?.referer?.startsWith('https://')
  );

  const secure = isHttps;
  const sameSite = isHttps ? 'none' : (config.cookieSameSite || 'lax');

  res.clearCookie('token', {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  });
}

/**
 * Extract tokens from request cookies, Authorization headers, or custom headers
 */
export function extractAuthTokens(req) {
  let accessToken = null;
  let refreshToken = null;

  // 1. Check Bearer Authorization Header
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.slice(7).trim();
  }

  // 2. Check HttpOnly cookies if header not present
  if (!accessToken && req.cookies?.token) {
    accessToken = req.cookies.token;
  }

  // Refresh token from cookies, headers, or request body
  if (req.cookies?.refreshToken) {
    refreshToken = req.cookies.refreshToken;
  } else if (req.headers?.['x-refresh-token']) {
    refreshToken = req.headers['x-refresh-token'];
  } else if (req.body?.refreshToken) {
    refreshToken = req.body.refreshToken;
  }

  return { accessToken, refreshToken };
}
