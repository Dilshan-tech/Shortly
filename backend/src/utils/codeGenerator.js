import crypto from 'crypto';

// High-entropy, unambiguous URL-safe character set (no 0/O, 1/l/I)
const SAFE_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

// System reserved keywords that cannot be used as short codes or custom aliases
export const RESERVED_WORDS = new Set([
  'api',
  'health',
  'analytics',
  'admin',
  'auth',
  'login',
  'logout',
  'signup',
  'settings',
  'urls',
  'url',
  'dashboard',
  'shortly',
  'static',
  'assets',
  'public',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'p',
  'verify',
  'preview'
]);

/**
 * Generate a cryptographically secure random short code.
 * @param {number} length Default 7 characters (~62^7 combinations)
 * @returns {string} Unpredictable URL-safe code
 */
export function generateShortCode(length = 7) {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  }
  return code;
}

/**
 * Validate custom alias format and uniqueness from reserved list.
 * @param {string} alias
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCustomAlias(alias) {
  if (!alias || typeof alias !== 'string') {
    return { valid: false, error: 'Custom alias must be a non-empty string' };
  }

  const trimmed = alias.trim();
  if (trimmed.length < 3 || trimmed.length > 30) {
    return { valid: false, error: 'Custom alias must be between 3 and 30 characters long' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Custom alias can only contain letters, numbers, hyphens, and underscores'
    };
  }

  if (RESERVED_WORDS.has(trimmed.toLowerCase())) {
    return {
      valid: false,
      error: `"${trimmed}" is a reserved system keyword and cannot be used as an alias`
    };
  }

  return { valid: true };
}
