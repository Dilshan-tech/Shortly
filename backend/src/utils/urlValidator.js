import { config } from '../config/env.js';

// Regex for private and loopback IPv4 ranges (RFC 1918, RFC 3927, RFC 5737)
const PRIVATE_IPV4_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8 Loopback
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,  // 10.0.0.0/8 Private
  /^192\.168\.\d{1,3}\.\d{1,3}$/,     // 192.168.0.0/16 Private
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12 Private
  /^169\.254\.\d{1,3}\.\d{1,3}$/,    // 169.254.0.0/16 Link-local & Cloud Metadata (AWS, Azure, GCP, DO)
  /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, // RFC 6598 Carrier-grade NAT
  /^0\.0\.0\.0$/
];

// Blocked metadata & internal hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
  'host.docker.internal',
  'gateway.docker.internal',
  'kubernetes.default',
  'kubernetes.default.svc'
]);

/**
 * Checks if a hostname or IP string represents an IPv6 loopback, link-local, or private address
 */
function isPrivateIpv6(hostname) {
  const clean = hostname.replace(/^\[|\]$/g, '').toLowerCase();

  // Loopback
  if (clean === '::1' || clean === '::' || clean === '0:0:0:0:0:0:0:1' || clean === '0:0:0:0:0:0:0:0') {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (clean.startsWith('::ffff:')) {
    const ipv4Part = clean.slice(7);
    if (PRIVATE_IPV4_PATTERNS.some((p) => p.test(ipv4Part))) {
      return true;
    }
  }

  // Unique Local (fc00::/7) or Link-Local (fe80::/10)
  if (clean.startsWith('fe8') || clean.startsWith('fe9') || clean.startsWith('fea') || clean.startsWith('feb') ||
      clean.startsWith('fc') || clean.startsWith('fd')) {
    return true;
  }

  return false;
}

/**
 * Checks if a hostname is an integer, hex, or octal encoded IP (common SSRF bypass attempts)
 */
function isNumericOrHexIp(hostname) {
  // Pure integer / dword IP (e.g. 2130706433 for 127.0.0.1)
  if (/^\d{8,10}$/.test(hostname)) {
    const intVal = parseInt(hostname, 10);
    if (!isNaN(intVal) && intVal >= 0 && intVal <= 4294967295) {
      const b1 = (intVal >>> 24) & 255;
      const b2 = (intVal >>> 16) & 255;
      if (b1 === 127 || b1 === 10 || (b1 === 172 && b2 >= 16 && b2 <= 31) || (b1 === 192 && b2 === 168) || (b1 === 169 && b2 === 254)) {
        return true;
      }
    }
  }

  // Hex encoded IP (e.g. 0x7f000001)
  if (/^0x[0-9a-f]{8}$/i.test(hostname)) {
    const intVal = parseInt(hostname, 16);
    if (!isNaN(intVal)) {
      const b1 = (intVal >>> 24) & 255;
      if (b1 === 127 || b1 === 10 || (b1 === 169 && ((intVal >>> 16) & 255) === 254)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate and normalize a destination URL.
 * Enforces strict protocol checks, SSRF prevention, and self-referencing loop prevention.
 *
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

  // Strictly allow ONLY http and https protocols (prevents javascript:, data:, file:, vbscript:, etc.)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: `Unsupported protocol "${parsed.protocol}". Only http:// and https:// URLs are allowed`
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Self-referencing loop check: prevent shortening a URL that redirects to Shortly itself
  if (config.publicUrl) {
    try {
      const publicParsed = new URL(config.publicUrl);
      if (parsed.host === publicParsed.host) {
        return {
          valid: false,
          error: 'Cannot create a short link pointing to the Shortly service itself.'
        };
      }
    } catch {}
  }

  // If local / private destinations are restricted (Production or strict mode)
  if (!allowLocal) {
    // 1. Hostname blacklist
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost')) {
      return {
        valid: false,
        error: 'Destination cannot point to localhost or internal network services.'
      };
    }

    // 2. IPv4 private / loopback patterns
    if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(hostname))) {
      return {
        valid: false,
        error: 'Destination cannot point to localhost, private LAN, or cloud metadata IP addresses.'
      };
    }

    // 3. IPv6 private / loopback / link-local
    if (isPrivateIpv6(hostname)) {
      return {
        valid: false,
        error: 'Destination cannot point to IPv6 loopback or private network addresses.'
      };
    }

    // 4. Numeric / hex IP bypasses
    if (isNumericOrHexIp(hostname)) {
      return {
        valid: false,
        error: 'Destination cannot point to numeric/hex loopback or private addresses.'
      };
    }
  }

  // Normalize: ensure href
  return {
    valid: true,
    normalizedUrl: parsed.href
  };
}
