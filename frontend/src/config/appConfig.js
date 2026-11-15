/**
 * Centralized Frontend Application Configuration
 *
 * Supports three operating environments:
 * 1. Local development on laptop (relative /api proxy via Vite)
 * 2. Local network testing on mobile phone (LAN IP via Vite on 0.0.0.0)
 * 3. Public production deployment (HTTPS domain with optional separate API base)
 */

// Safe fallback for import.meta.env in non-Vite / test environments
const metaEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof process !== 'undefined' && process.env
    ? process.env
    : {};

function resolveApiBaseUrl() {
  const rawBase = (metaEnv.VITE_API_BASE_URL || metaEnv.VITE_API_BASE || '').trim().replace(/\/+$/, '');

  // In browser runtime: if user is accessing frontend on localhost / 127.0.0.1,
  // do NOT force them to a remote dev tunnel if they are running locally!
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost && rawBase.includes('.devtunnels.ms')) {
      return '';
    }
  }

  return rawBase;
}

export const appConfig = {
  // Base URL for backend API requests.
  // Defaults to '' (relative path) to leverage Vite dev proxy and same-origin production hosting.
  // For separated frontend/backend deployments, set VITE_API_BASE_URL (e.g. 'https://api.yourdomain.com').
  apiBaseUrl: resolveApiBaseUrl(),

  // Configured public URL base for short links (if explicitly configured on the frontend)
  publicUrl: (metaEnv.VITE_PUBLIC_URL || '').replace(/\/+$/, ''),

  // Environment flags
  mode: metaEnv.MODE || metaEnv.NODE_ENV || 'development',
  isDev: metaEnv.DEV ?? (metaEnv.MODE !== 'production' && metaEnv.NODE_ENV !== 'production'),
  isProd: metaEnv.PROD ?? (metaEnv.MODE === 'production' || metaEnv.NODE_ENV === 'production')
};
