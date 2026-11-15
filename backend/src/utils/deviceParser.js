import crypto from 'crypto';
import { UAParser } from 'ua-parser-js';

const KNOWN_BOT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /duckduckbot/i,
  /slurp/i,
  /twitterbot/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /slackbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /curl\b/i,
  /wget\b/i,
  /postman/i,
  /python-requests/i,
  /python\//i,
  /headlesschrome/i,
  /axios\b/i,
  /node-fetch/i,
  /go-http-client/i,
  /apache-httpclient/i,
  /scrapy/i
];

/**
 * Anonymize an IP address by zeroing the host portion.
 * Raw IP addresses are NEVER stored in persistent storage.
 */
export function anonymizeIp(ip = '') {
  if (!ip || typeof ip !== 'string') return 'unknown';
  const cleanIp = ip.trim().replace(/^::ffff:/, ''); // strip IPv4-mapped IPv6 prefix

  // IPv4
  if (cleanIp.includes('.')) {
    const parts = cleanIp.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
  }

  // IPv6
  if (cleanIp.includes(':')) {
    const parts = cleanIp.split(':');
    return `${parts.slice(0, 3).join(':')}::/48`;
  }

  return 'unknown';
}

/**
 * Generate a privacy-preserving one-way visitor hash.
 * Combines IP, User-Agent, and a server salt so that unique visitors
 * can be counted across links without ever storing personally identifiable information.
 */
export function hashVisitorId(ip = '', uaString = '') {
  if (!ip && !uaString) return 'anonymous';
  const salt = process.env.IP_SALT || 'shortly-privacy-salt-v2';
  const cleanIp = (ip || '').trim().replace(/^::ffff:/, '');
  return crypto
    .createHash('sha256')
    .update(`${cleanIp}|${(uaString || '').trim()}|${salt}`)
    .digest('hex')
    .slice(0, 16);
}

/**
 * Backward compatibility alias for hashVisitorId
 */
export function hashVisitorIp(ip = '') {
  return hashVisitorId(ip, '');
}

/**
 * Extract country code from edge/CDN/reverse-proxy headers.
 * Does NOT fabricate geographic information; defaults to "Unknown".
 */
export function extractCountry(headers = {}) {
  const code =
    headers['cf-ipcountry'] ||
    headers['x-country-code'] ||
    headers['cloudfront-viewer-country'] ||
    headers['x-vercel-ip-country'] ||
    headers['fastly-client-ip-country'] ||
    '';

  if (typeof code === 'string' && code.trim().length === 2) {
    const upper = code.trim().toUpperCase();
    if (upper !== 'XX' && upper !== 'T1' && /^[A-Z]{2}$/.test(upper)) {
      return upper;
    }
  }

  return 'Unknown';
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
    if (host.includes('bing.com')) return 'Bing';
    if (host.includes('yahoo.com')) return 'Yahoo';
    if (host.includes('duckduckgo.com')) return 'DuckDuckGo';

    return host;
  } catch {
    return 'Other';
  }
}

/**
 * Parse a User-Agent string and request headers into structured client metadata.
 * @param {string} uaString
 * @param {string} [ip]
 * @param {string} [referrer]
 * @param {object} [headers]
 */
export function parseClientMetadata(uaString = '', ip = '', referrer = '', headers = {}) {
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
    visitorId: hashVisitorId(ip, ua),
    anonymizedIp: anonymizeIp(ip),
    country: extractCountry(headers),
    city: 'Unknown',
    isBot
  };
}
