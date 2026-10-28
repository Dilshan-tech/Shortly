import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';

const KNOWN_BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /curl/i,
  /wget/i,
  /postman/i,
  /python-requests/i,
  /headlesschrome/i,
  /axios/i,
  /node-fetch/i,
  /go-http-client/i
];

/**
 * Generate a privacy-preserving one-way visitor hash.
 * Does NOT persist or leak the raw IP address.
 */
export function hashVisitorIp(ip = '') {
  if (!ip) return 'anonymous';
  const salt = process.env.IP_SALT || 'shortly-privacy-salt-v1';
  return crypto.createHash('sha256').update(`${ip}-${salt}`).digest('hex').slice(0, 16);
}

/**
 * Categorize raw referrer header into a clean display label.
 */
export function parseReferrer(rawReferrer = '') {
  if (!rawReferrer || typeof rawReferrer !== 'string') {
    return 'Direct';
  }

  const trimmed = rawReferrer.trim();
  if (!trimmed || trimmed === 'direct') {
    return 'Direct';
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    
    if (host.includes('google.')) return 'Google';
    if (host.includes('t.co') || host.includes('twitter.com') || host.includes('x.com')) return 'X / Twitter';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('facebook.com') || host.includes('fb.com')) return 'Facebook';
    if (host.includes('reddit.com')) return 'Reddit';
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('youtube.com')) return 'YouTube';
    if (host.includes('slack.com')) return 'Slack';

    return host;
  } catch {
    return 'Other';
  }
}

/**
 * Parse a User-Agent string into structured client metadata.
 * @param {string} uaString
 * @param {string} [ip]
 * @param {string} [referrer]
 */
export function parseClientMetadata(uaString = '', ip = '', referrer = '') {
  const ua = (uaString || '').trim();
  const isBot = KNOWN_BOT_PATTERNS.some((pattern) => pattern.test(ua));

  const parser = new UAParser(ua);
  const result = parser.getResult();

  let deviceCategory = 'desktop';
  if (isBot) {
    deviceCategory = 'bot';
  } else if (result.device.type === 'mobile') {
    deviceCategory = 'mobile';
  } else if (result.device.type === 'tablet') {
    deviceCategory = 'tablet';
  } else if (!ua) {
    deviceCategory = 'unknown';
  }

  const browserName = result.browser.name || (isBot ? 'Bot/Crawler' : 'Other');
  const browserVersion = result.browser.version ? result.browser.version.split('.')[0] : '';
  const osName = result.os.name || 'Other';
  const osVersion = result.os.version || '';

  return {
    userAgent: ua.slice(0, 500),
    deviceCategory,
    browser: browserName,
    browserVersion,
    os: osName,
    osVersion,
    referrer: parseReferrer(referrer),
    visitorId: hashVisitorIp(ip),
    isBot
  };
}
