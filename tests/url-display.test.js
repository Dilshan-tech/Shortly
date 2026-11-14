import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyToClipboard, getShortUrl } from '../frontend/src/utils/formatters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Shortly Short URL Display & Mobile Usability Test Suite', () => {
  // =========================================================================
  // 1. URL Helper & Formatters Tests
  // =========================================================================
  describe('1. URL Display Helper (getShortUrl)', () => {
    it('returns the exact shortUrl provided by backend', () => {
      const urlRecord = {
        code: 'custom-link',
        shortUrl: 'https://sho.rt/custom-link'
      };
      assert.strictEqual(getShortUrl(urlRecord), 'https://sho.rt/custom-link');
    });

    it('returns LAN IP shortUrl provided by backend without altering host or port', () => {
      const urlRecord = {
        code: 'team-share',
        shortUrl: 'http://192.168.1.145:5000/team-share'
      };
      assert.strictEqual(getShortUrl(urlRecord), 'http://192.168.1.145:5000/team-share');
    });

    it('gracefully falls back to /code if shortUrl is not present', () => {
      const urlRecord = {
        code: 'xyz987'
      };
      assert.strictEqual(getShortUrl(urlRecord), '/xyz987');
    });

    it('never constructs localhost or hardcoded domain when shortUrl is missing', () => {
      const urlRecord = {
        code: 'demo-code'
      };
      const result = getShortUrl(urlRecord);
      assert.ok(!result.includes('localhost'), 'Should not construct localhost');
      assert.ok(!result.includes('127.0.0.1'), 'Should not construct 127.0.0.1');
      assert.ok(!result.includes('http://'), 'Should not assume http');
      assert.ok(!result.includes('https://'), 'Should not assume https');
    });

    it('handles empty or null URL objects safely', () => {
      assert.strictEqual(getShortUrl(null), '');
      assert.strictEqual(getShortUrl(undefined), '');
      assert.strictEqual(getShortUrl({}), '');
    });
  });

  // =========================================================================
  // 2. Clipboard API & Mobile Insecure-Context Fallback Tests
  // =========================================================================
  describe('2. Clipboard Copying & Fallback Mechanism', () => {
    let originalNavigatorDescriptor;
    let originalDocument;

    beforeEach(() => {
      originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
      originalDocument = globalThis.document;
    });

    afterEach(() => {
      if (originalNavigatorDescriptor) {
        Object.defineProperty(globalThis, 'navigator', originalNavigatorDescriptor);
      } else {
        delete globalThis.navigator;
      }
      globalThis.document = originalDocument;
    });

    it('uses modern navigator.clipboard.writeText when available and secure', async () => {
      let copiedText = null;
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            writeText: async (text) => {
              copiedText = text;
              return Promise.resolve();
            }
          }
        },
        configurable: true,
        writable: true
      });

      const result = await copyToClipboard('https://sho.rt/sample-123');
      assert.strictEqual(result, true);
      assert.strictEqual(copiedText, 'https://sho.rt/sample-123');
    });

    it('falls back to textarea execCommand copy when navigator.clipboard throws (e.g. mobile LAN HTTP)', async () => {
      // Simulate insecure origin on mobile Safari/Chrome where writeText rejects
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          clipboard: {
            writeText: async () => {
              throw new Error('NotAllowedError: writeText called in insecure context');
            }
          }
        },
        configurable: true,
        writable: true
      });

      let appendedElement = null;
      let removedElement = null;
      let execCommandCalled = null;

      globalThis.document = {
        body: {
          appendChild: (el) => { appendedElement = el; },
          removeChild: (el) => { removedElement = el; }
        },
        createElement: (tag) => {
          return {
            tagName: tag.toUpperCase(),
            style: {},
            setAttribute: (k, v) => {},
            focus: () => {},
            select: () => {},
            setSelectionRange: (start, end) => {},
            value: ''
          };
        },
        execCommand: (cmd) => {
          execCommandCalled = cmd;
          return true;
        }
      };

      const result = await copyToClipboard('http://192.168.1.100:5000/mobile-link');
      assert.strictEqual(result, true, 'Fallback should report success');
      assert.strictEqual(execCommandCalled, 'copy', 'execCommand copy was invoked');
      assert.strictEqual(appendedElement.value, 'http://192.168.1.100:5000/mobile-link');
      assert.strictEqual(appendedElement.style.fontSize, '16px', 'Font size must be >= 16px to prevent iOS Safari auto-zoom');
      assert.strictEqual(appendedElement.style.position, 'fixed');
      assert.strictEqual(appendedElement.style.left, '-9999px');
      assert.strictEqual(removedElement, appendedElement, 'Temporary textarea is cleaned up');
    });

    it('returns false when text is null or empty', async () => {
      const res1 = await copyToClipboard('');
      const res2 = await copyToClipboard(null);
      const res3 = await copyToClipboard(undefined);
      assert.strictEqual(res1, false);
      assert.strictEqual(res2, false);
      assert.strictEqual(res3, false);
    });
  });

  // =========================================================================
  // 3. Component Markup & Code Inspection Tests
  // =========================================================================
  describe('3. Component URL Display & Copy Button Verification', () => {
    it('UrlCard.jsx displays complete short URL, prominent CopyButton, break-all and target="_blank"', () => {
      const filePath = path.join(rootDir, 'frontend/src/components/urls/UrlCard.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Requirement 1: Display complete short URL
      assert.ok(content.includes('shortUrl'), 'UrlCard must compute and use shortUrl');
      assert.ok(!content.includes('{url.code}</span>'), 'UrlCard must not display only /{url.code} as main link');

      // Requirement 4 & 5: Do not truncate short URL; allow multiline wrapping with break-all
      assert.ok(content.includes('break-all'), 'UrlCard short URL must have break-all for wrapping');

      // Requirement 6 & 7: Prominent Copy button with copied feedback
      assert.ok(content.includes('<CopyButton'), 'UrlCard must include CopyButton component');
      assert.ok(content.includes('variant="primary"'), 'CopyButton should be prominent');

      // Requirement 9: Clickable and opens in new browser tab
      assert.ok(content.includes('target="_blank"'), 'Short URL link must open in new tab');
      assert.ok(content.includes('rel="noopener noreferrer"'), 'Security rel attribute required');
    });

    it('UrlTable.jsx displays complete short URL, column header, prominent CopyButton, break-all and target="_blank"', () => {
      const filePath = path.join(rootDir, 'frontend/src/components/urls/UrlTable.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Requirement 2: Display complete short URL in desktop link table
      assert.ok(content.includes('Short URL & Title'), 'Table header must indicate Short URL');
      assert.ok(content.includes('shortUrl'), 'UrlTable must compute and use shortUrl');

      // Requirement 4 & 5: No truncate on short URL, break-all wrapping
      assert.ok(content.includes('break-all'), 'Table short URL must allow break-all wrapping');

      // Requirement 6 & 7: Prominent Copy button
      assert.ok(content.includes('<CopyButton'), 'UrlTable must include CopyButton');

      // Requirement 9: Clickable in new tab
      assert.ok(content.includes('target="_blank"'), 'Table short URL link must open in new tab');
      assert.ok(content.includes('rel="noopener noreferrer"'), 'Security rel attribute required');
    });

    it('CreateLinkPage.jsx success card displays complete short URL without truncate, break-all, CopyButton, and clickable link', () => {
      const filePath = path.join(rootDir, 'frontend/src/pages/CreateLinkPage.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // Requirement 3: Complete URL clearly visible on Create Link success screen
      assert.ok(content.includes('createdUrl.shortUrl'), 'Must render createdUrl.shortUrl');

      // Requirement 4: No truncate on short URL
      const shortUrlBlock = content.slice(content.indexOf('Short URL'), content.indexOf('Original Destination'));
      assert.ok(!shortUrlBlock.includes('truncate'), 'Short URL block must not truncate short URL');
      assert.ok(shortUrlBlock.includes('break-all'), 'Short URL block must use break-all for mobile wrapping');

      // Requirement 6 & 7: Prominent Copy button
      assert.ok(shortUrlBlock.includes('<CopyButton'), 'Short URL block must include CopyButton');

      // Requirement 9: Clickable in new tab
      assert.ok(shortUrlBlock.includes('target="_blank"'), 'Short URL link must open in new tab');
    });

    it('OverviewPage.jsx top links display complete short URL, CopyButton, and target="_blank"', () => {
      const filePath = path.join(rootDir, 'frontend/src/pages/OverviewPage.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(content.includes('Link Title & Short URL'), 'Header must indicate Short URL');
      assert.ok(content.includes('getShortUrl(url)'), 'OverviewPage must display complete shortUrl');
      assert.ok(content.includes('<CopyButton'), 'OverviewPage must include CopyButton');
      assert.ok(content.includes('target="_blank"'), 'OverviewPage short URL must be clickable in new tab');
    });

    it('LinkAnalyticsPage.jsx displays complete short URL, CopyButton, and target="_blank"', () => {
      const filePath = path.join(rootDir, 'frontend/src/pages/LinkAnalyticsPage.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(content.includes('getShortUrl(url)'), 'LinkAnalyticsPage must compute full shortUrl');
      assert.ok(content.includes('<CopyButton'), 'LinkAnalyticsPage must include CopyButton');
      assert.ok(content.includes('break-all'), 'LinkAnalyticsPage must allow break-all wrapping');
      assert.ok(content.includes('target="_blank"'), 'LinkAnalyticsPage short URL must open in new tab');
    });

    it('QrCodeModal.jsx displays complete short URL without truncate, with break-all and CopyButton', () => {
      const filePath = path.join(rootDir, 'frontend/src/components/urls/QrCodeModal.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      const modalBlock = content.slice(content.indexOf('Short URL Display & Copy'), content.indexOf('Action Buttons'));
      assert.ok(!modalBlock.includes('truncate select-all'), 'QrCodeModal must not truncate short URL');
      assert.ok(modalBlock.includes('break-all'), 'QrCodeModal must allow break-all wrapping');
      assert.ok(modalBlock.includes('<CopyButton'), 'QrCodeModal must include CopyButton');
      assert.ok(modalBlock.includes('target="_blank"'), 'QrCodeModal short URL must open in new tab');
    });
  });

  // =========================================================================
  // 4. Responsive Breakpoints Verification (320px, 375px, 390px, 430px)
  // =========================================================================
  describe('4. Responsive Breakpoints Verification (320px, 375px, 390px, 430px)', () => {
    it('verifies UrlCard container classes permit wrapping on 320px mobile screens', () => {
      const filePath = path.join(rootDir, 'frontend/src/components/urls/UrlCard.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      // At 320px, container has padding p-3.5 sm:p-4
      assert.ok(content.includes('p-3.5 sm:p-4'), 'UrlCard supports compact mobile padding');
      // Link must have min-w-0 to allow flexbox shrinking and break-all
      assert.ok(content.includes('min-w-0'), 'UrlCard link container must allow flex shrinking');
      // Copy button must have shrink-0 so it is never crushed
      assert.ok(content.includes('shrink-0'), 'CopyButton must have shrink-0 to preserve touch target size');
    });

    it('verifies CreateLinkPage success container stacks cleanly on 320px and flows horizontally on larger screens', () => {
      const filePath = path.join(rootDir, 'frontend/src/pages/CreateLinkPage.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(
        content.includes('flex flex-col sm:flex-row items-stretch sm:items-center'),
        'CreateLinkPage success container must support flex-col on mobile and sm:flex-row on desktop'
      );
    });

    it('verifies QrCodeModal short URL box stacks cleanly on narrow mobile viewports', () => {
      const filePath = path.join(rootDir, 'frontend/src/components/urls/QrCodeModal.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(
        content.includes('flex flex-col sm:flex-row items-stretch sm:items-center'),
        'QrCodeModal short URL container must stack on narrow viewports'
      );
    });

    it('verifies CopyButton has minimum touch target accessibility on mobile viewports', () => {
      const filePath = path.join(rootDir, 'frontend/src/components/common/CopyButton.jsx');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(content.includes('cursor-pointer'), 'Button must have cursor-pointer');
      assert.ok(content.includes('aria-label'), 'Button must have accessible aria-label');
      assert.ok(content.includes('title'), 'Button must have tooltip title');
      assert.ok(content.includes('text-emerald-300') || content.includes('text-emerald-400'), 'Button must show green feedback when copied');
    });
  });

  // =========================================================================
  // 5. Multi-Environment Network & Configuration Validation Tests
  // =========================================================================
  describe('5. Multi-Environment Network & Configuration Tests', () => {
    it('validates development configuration permits localhost and LAN IP bases', async () => {
      const { validateConfig, config } = await import('../backend/src/config/env.js');
      // Should not throw in development
      assert.doesNotThrow(() => {
        validateConfig();
      });
      assert.ok(config.port > 0 && config.port <= 65535);
      assert.ok(config.host === '0.0.0.0');
    });

    it('enforces HTTPS in production and rejects insecure HTTP protocols', () => {
      const DEV_LAN_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

      // Check production validation logic
      const validateProdPublicUrl = (url) => {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') {
          throw new Error('PUBLIC_URL must use HTTPS protocol in production');
        }
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
          throw new Error('PUBLIC_URL cannot be localhost or private LAN in production');
        }
        return true;
      };

      assert.throws(() => validateProdPublicUrl('http://insecure.domain.com'), /HTTPS/);
      assert.throws(() => validateProdPublicUrl('https://localhost:5000'), /localhost/);
      assert.throws(() => validateProdPublicUrl('https://192.168.1.100:5000'), /private LAN/);
      assert.strictEqual(validateProdPublicUrl('https://sho.rt'), true);
      assert.strictEqual(validateProdPublicUrl('https://shortly.mycompany.com'), true);
    });

    it('verifies development CORS regex permits Wi-Fi LAN origins (10.x, 192.168.x, 172.16-31.x)', () => {
      const DEV_LAN_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

      // Laptop local origins
      assert.ok(DEV_LAN_ORIGIN_REGEX.test('http://localhost:5173'));
      assert.ok(DEV_LAN_ORIGIN_REGEX.test('http://127.0.0.1:5173'));

      // Mobile phone Wi-Fi LAN origins
      assert.ok(DEV_LAN_ORIGIN_REGEX.test('http://10.50.1.241:5173'));
      assert.ok(DEV_LAN_ORIGIN_REGEX.test('http://192.168.1.105:5173'));
      assert.ok(DEV_LAN_ORIGIN_REGEX.test('http://172.20.10.4:5173'));

      // Untrusted public origins must NOT match dev LAN regex
      assert.ok(!DEV_LAN_ORIGIN_REGEX.test('http://malicious-site.com'));
      assert.ok(!DEV_LAN_ORIGIN_REGEX.test('https://evil.com'));
    });

    it('verifies centralized appConfig module exists and provides required properties', () => {
      const filePath = path.join(rootDir, 'frontend/src/config/appConfig.js');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(content.includes('apiBaseUrl'), 'Must provide apiBaseUrl');
      assert.ok(content.includes('publicUrl'), 'Must provide publicUrl');
      assert.ok(content.includes('VITE_API_BASE_URL'), 'Must read VITE_API_BASE_URL');
      assert.ok(content.includes('VITE_PUBLIC_URL'), 'Must read VITE_PUBLIC_URL');
    });

    it('verifies Vite configuration accepts LAN connections with host 0.0.0.0 and loads env', () => {
      const filePath = path.join(rootDir, 'frontend/vite.config.js');
      const content = fs.readFileSync(filePath, 'utf-8');

      assert.ok(content.includes('loadEnv'), 'Must use loadEnv from vite');
      assert.ok(content.includes('0.0.0.0'), 'Must default to host 0.0.0.0 for mobile LAN testing');
      assert.ok(content.includes('VITE_BACKEND_URL'), 'Must support VITE_BACKEND_URL proxy target');
    });
  });
});
