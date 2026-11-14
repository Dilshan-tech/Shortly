/**
 * Format timestamp to friendly string e.g. "Oct 26, 2026, 11:30 AM"
 */
export function formatDate(isoString) {
  if (!isoString) return 'Never';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Invalid date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(d);
}

/**
 * Format relative time (e.g., "5m ago", "2h ago", "yesterday")
 */
export function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoString);
}

/**
 * Format numbers with commas (e.g., 12,450)
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Safely copy text to clipboard with modern navigator.clipboard and robust mobile fallback
 */
export async function copyToClipboard(text) {
  if (!text) return false;

  // 1. Try modern navigator.clipboard first if available
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function'
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Modern Clipboard API can reject in insecure contexts (e.g. testing over LAN HTTP on mobile)
      // or if permission is denied. Fall through to execCommand fallback.
      console.warn('navigator.clipboard.writeText failed, trying mobile fallback:', err);
    }
  }

  // 2. Fallback using invisible textarea and execCommand('copy') for mobile Safari, insecure context, etc.
  if (typeof document !== 'undefined' && document.body) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Prevent screen zoom on iOS Safari by ensuring font size >= 16px
      textarea.style.fontSize = '16px';
      // Prevent scrolling to bottom of page on iOS/Android
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      // Prevent keyboard popup on mobile
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);

      // Support iOS Safari selection
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Boolean(success);
    } catch (err) {
      console.error('Failed fallback execCommand copy:', err);
      return false;
    }
  }

  return false;
}

import { appConfig } from '../config/appConfig.js';

/**
 * Returns the complete short URL from a URL object without constructing invalid domains or localhost.
 * Prioritizes backend's shortUrl value, then configured appConfig.publicUrl, then relative /code.
 */
export function getShortUrl(url) {
  if (!url) return '';
  if (url.shortUrl) return url.shortUrl;
  if (url.code) {
    if (appConfig?.publicUrl) {
      return `${appConfig.publicUrl}/${url.code}`;
    }
    return `/${url.code}`;
  }
  return '';
}

/**
 * Truncate long strings neatly
 */
export function truncate(str, maxLen = 45) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}
