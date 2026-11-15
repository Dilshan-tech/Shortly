import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { extractAuthTokens } from '../utils/cookieHelper.js';

/**
 * Authentication middleware: enforces a valid JWT access token
 * via Bearer header or HttpOnly cookie.
 */
export function authenticate(req, res, next) {
  const { accessToken } = extractAuthTokens(req);

  if (!accessToken) {
    const error = new Error('Authentication required. Please log in.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  try {
    const payload = jwt.verify(accessToken, config.jwtSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'user'
    };
    next();
  } catch (err) {
    const error = new Error(
      err.name === 'TokenExpiredError'
        ? 'Access token expired. Please refresh your session.'
        : 'Invalid authentication token.'
    );
    error.statusCode = 401;
    error.code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    next(error);
  }
}

/**
 * Optional authentication: attaches user if a valid token exists,
 * but allows unauthenticated visitors to proceed with req.user = null.
 */
export function optionalAuthenticate(req, res, next) {
  const { accessToken } = extractAuthTokens(req);

  if (!accessToken) {
    req.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(accessToken, config.jwtSecret);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role || 'user'
    };
  } catch {
    req.user = null;
  }

  next();
}

/**
 * Require specific role (e.g., admin)
 */
export function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user) {
      const error = new Error('Authentication required.');
      error.statusCode = 401;
      return next(error);
    }
    if (req.user.role !== requiredRole && req.user.role !== 'admin') {
      const error = new Error('Insufficient permissions to perform this action.');
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
}

/**
 * CSRF protection for state-changing requests utilizing cookie-based auth
 */
export function protectCsrf(req, res, next) {
  // Safe HTTP read methods do not need CSRF verification
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // If using Authorization Bearer header, browser cross-origin requests cannot attach it without CORS
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return next();
  }

  // For cookie-based state changes, verify custom client header or origin match
  const customHeader = req.headers['x-requested-with'] || req.headers['x-shortly-client'];
  const origin = req.headers['origin'] || req.headers['referer'];

  if (customHeader) {
    return next();
  }

  if (origin) {
    const isFrontendOrigin =
      origin.startsWith(config.frontendUrl) ||
      (config.isDev && (origin.includes('localhost') || origin.includes('127.0.0.1')));
    if (isFrontendOrigin) {
      return next();
    }
  }

  // In development, permit tests and curl if no cookies are passed
  if (!req.cookies?.token && !req.cookies?.refreshToken) {
    return next();
  }

  const error = new Error('Cross-site request forgery validation failed.');
  error.statusCode = 403;
  error.code = 'CSRF_BLOCKED';
  next(error);
}
