import { config } from '../config/env.js';

// Regex for private and loopback IPv4 ranges
const PRIVATE_IPV4_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // 10.0.0.0/8
  /^192\.168\.\d{1,3}\.\d{1,3}$/,     // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
  /^169\.254\.\d{1,3}\.\d{1,3}$/,    // 169.254.0.0/16 (link-local)
  /^0\.0\.0\.0$/
];

/**
 * Validate and normalize a destination URL.
 * @param {string} urlString
 * @param {boolean} [allowLocal]
 * @returns {{ valid: boolean, normalizedUrl?: string, error?: string }}
 */
export function validateUrl(urlString, allowLocal = config.allowLocalhostDestinations) {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'Destination URL is required' };
  }

  const trimmed = urlString.trim();

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Malformed URL format. Must be a valid web address' };
  }

  // Only allow http and https protocols
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: `Unsupported protocol "${parsed.protocol}". Only http:// and https:// URLs are allowed`
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // If local/private destinations are restricted
  if (!allowLocal) {
    if (
      hostname === 'localhost' ||
      hostname === '::1' ||
      PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))
    ) {
      return {
        valid: false,
        error: 'Destination cannot point to localhost or private network IP addresses'
      };
    }
  }

  // Normalize: ensure href without redundant trailing slashes if only path is "/"
  return {
    valid: true,
    normalizedUrl: parsed.href
  };
}
