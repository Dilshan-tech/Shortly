import { urlService } from '../services/urlService.js';
import { config } from '../config/env.js';

function renderHtmlPage({ title, heading, message, badge, badgeColor, formAction = null, showPasswordInput = false, code = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Shortly</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 2.5rem;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 1.25rem;
      background: ${badgeColor || '#475569'};
      color: #fff;
    }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #fff; }
    p { font-size: 0.95rem; line-height: 1.5; color: #94a3b8; margin-bottom: 1.5rem; }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 0.75rem 1.25rem;
      background-color: #6366f1;
      color: #fff;
      font-weight: 600;
      font-size: 0.95rem;
      border-radius: 0.5rem;
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .btn:hover { background-color: #4f46e5; }
    input[type="password"] {
      width: 100%;
      padding: 0.75rem 1rem;
      border-radius: 0.5rem;
      border: 1px solid #475569;
      background-color: #0f172a;
      color: #fff;
      font-size: 1rem;
      margin-bottom: 1rem;
      outline: none;
    }
    input[type="password"]:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
    }
    .footer { margin-top: 1.5rem; font-size: 0.8rem; color: #64748b; }
    .footer a { color: #818cf8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${badge}</div>
    <h1>${heading}</h1>
    <p>${message}</p>
    ${
      showPasswordInput
        ? `<form action="/${code}/unlock" method="POST">
             <input type="password" name="password" placeholder="Enter link password" required autofocus />
             <button type="submit" class="btn">Unlock & Continue</button>
           </form>`
        : `<a href="${config.frontendUrl}" class="btn">Go to Shortly Dashboard</a>`
    }
    <div class="footer">Powered by <a href="${config.frontendUrl}">Shortly Analytics</a></div>
  </div>
</body>
</html>`;
}

export const redirectController = {
  async handleRedirect(req, res, next) {
    try {
      const { code } = req.params;
      const result = await urlService.resolveRedirect(code, req);

      const acceptsHtml = req.accepts(['html', 'json']) === 'html';

      if (result.status === 'not_found') {
        if (acceptsHtml) {
          return res.status(404).send(
            renderHtmlPage({
              title: 'Link Not Found',
              heading: 'Link Not Found',
              badge: '404 Error',
              badgeColor: '#ef4444',
              message: `The short URL <code>/${code}</code> does not exist or has been removed.`
            })
          );
        }
        return res.status(404).json({ success: false, error: 'Link not found' });
      }

      if (result.status === 'disabled') {
        if (acceptsHtml) {
          return res.status(403).send(
            renderHtmlPage({
              title: 'Link Disabled',
              heading: 'Link Disabled',
              badge: 'Inactive',
              badgeColor: '#f59e0b',
              message: 'This link has been temporarily disabled by its owner and cannot be accessed.'
            })
          );
        }
        return res.status(403).json({ success: false, error: 'This link is currently inactive' });
      }

      if (result.status === 'expired') {
        const msg =
          result.reason === 'limit_reached'
            ? 'This link has reached its maximum allowed click limit.'
            : 'This short link has expired and is no longer available.';

        if (acceptsHtml) {
          return res.status(410).send(
            renderHtmlPage({
              title: 'Link Expired',
              heading: 'Link Expired',
              badge: 'Expired',
              badgeColor: '#dc2626',
              message: msg
            })
          );
        }
        return res.status(410).json({ success: false, error: msg });
      }

      if (result.status === 'password_required') {
        if (acceptsHtml) {
          return res.status(401).send(
            renderHtmlPage({
              title: 'Password Protected',
              heading: 'Password Protected Link',
              badge: 'Protected',
              badgeColor: '#6366f1',
              message: `This destination is password-protected. Please enter the password to proceed.`,
              showPasswordInput: true,
              code
            })
          );
        }
        return res.status(401).json({
          success: false,
          error: 'Password required',
          passwordRequired: true,
          code
        });
      }

      if (result.status === 'redirect') {
        return res.redirect(302, result.destinationUrl);
      }

      res.status(500).json({ success: false, error: 'Unexpected redirect resolution status' });
    } catch (err) {
      next(err);
    }
  },

  async handleUnlock(req, res, next) {
    try {
      const { code } = req.params;
      const { password } = req.body;
      const verification = await urlService.verifyPassword(code, password);
      // Redirect to the verified short link with token
      return res.redirect(302, `/${code}?token=${verification.token}`);
    } catch (err) {
      const acceptsHtml = req.accepts(['html', 'json']) === 'html';
      if (acceptsHtml) {
        return res.status(401).send(
          renderHtmlPage({
            title: 'Incorrect Password',
            heading: 'Incorrect Password',
            badge: 'Access Denied',
            badgeColor: '#ef4444',
            message: 'The password entered was incorrect. Please try again.',
            showPasswordInput: true,
            code: req.params.code
          })
        );
      }
      next(err);
    }
  }
};
