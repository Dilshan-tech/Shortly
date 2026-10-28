# Shortly — Full-Stack URL Shortener & Click Analytics

**Shortly** is a modern, high-performance URL shortening and click analytics application built with Node.js, Express, React, and Tailwind CSS. It provides fast link redirection, customizable aliases, QR code generation, click-limit and expiration controls, optional password protection, and live visitor telemetry—including device classification, browser detection, and referrer tracking.

---

## Features

- **High-Performance Redirection (`GET /:code`)**: In-memory indexed lookup with asynchronous click telemetry logging for sub-millisecond redirect processing.
- **Dynamic QR Code Generation**: Instant QR code preview with high-resolution PNG and SVG download options, encoding the exact public link.
- **Link Security & Controls**:
  - Optional custom aliases with collision and reserved-keyword validation.
  - Expiration timestamps (auto-deactivation after date).
  - Click limits (auto-deactivation after reaching target visit count).
  - One-time use links (consumes and disables immediately upon first visit).
  - Bcrypt-hashed password protection with server-side validation and brute-force rate limiting.
- **Real Analytics (No Fabricated Data)**:
  - Clicks-over-time trend chart (7-day, 14-day, 30-day views).
  - Automatic visitor classification (Mobile, Desktop, Tablet, Bots) via User-Agent parsing.
  - Browser and Operating System distribution.
  - Traffic source and referrer tracking (Direct, Google, X/Twitter, LinkedIn, GitHub, etc.).
  - Privacy-preserving visitor hashing (no raw IP addresses persisted).
  - Optional auto-polling toggle (every 7 seconds without overlapping requests).
- **Link Management Library**:
  - Search by destination URL, alias, or title.
  - Filtering by Active, Disabled, and Expired states.
  - Multi-select bulk actions (bulk enable, disable, and delete).
  - Responsive desktop data table and mobile-optimized card layout.
- **Zero-Database Local Storage**:
  - Uses serialized atomic JSON file writes (`urls.json` and `clicks.json`) with an in-memory queue and `.tmp` rename pattern to prevent corruption.
  - Decoupled repository architecture (`UrlRepository` and `ClickRepository`) ready for drop-in MongoDB / PostgreSQL replacement.

---

## Technology Stack

### Frontend
- **React 18** with **Vite**
- **Tailwind CSS** (dark SaaS theme with indigo/violet accents)
- **React Router 6** (client-side routing)
- **Recharts** (Area charts, bar distributions)
- **qrcode.react** (SVG and canvas QR generation)
- **lucide-react** (UI icons)
- **Axios** (API communication)

### Backend
- **Node.js** (v20+ / ES Modules)
- **Express 4**
- **Helmet** (HTTP security headers)
- **express-rate-limit** (endpoint rate limiting & brute-force defense)
- **ua-parser-js** (client device, OS, and browser categorization)
- **bcryptjs** (link password hashing)
- **zod** (request schema validation)
- **vitest** & **supertest** (automated test suite)

---

## Project Structure

```text
shortly/
├── backend/
│   ├── data/                 # JSON file storage (urls.json, clicks.json)
│   ├── src/
│   │   ├── config/           # Environment defaults & validation (env.js)
│   │   ├── controllers/      # Route controllers (url, analytics, redirect)
│   │   ├── middleware/       # Error handling, rate limiting, Zod validation
│   │   ├── repositories/     # Storage abstraction (UrlRepository, ClickRepository)
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business logic & tracking
│   │   ├── utils/            # Atomic file storage, code generator, device parser
│   │   ├── app.js            # Express app assembly & static asset serving
│   │   └── server.js         # HTTP server bootstrap & graceful shutdown
│   └── vitest.config.js
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios client & endpoint wrappers
│   │   ├── components/       # Common controls, layout, analytics, URL tables
│   │   ├── pages/            # Overview, CreateLink, LinkLibrary, Analytics, Settings
│   │   ├── utils/            # Date, number, and clipboard formatters
│   │   ├── App.jsx           # Main routing & Toast provider
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── tests/
│   └── e2e-verification.js   # Full end-to-end integration and restart test
├── package.json              # Root workspace orchestrator
├── README.md
└── .gitignore
```

---

## Installation & Startup

### Prerequisites
- Node.js version 18.0.0 or higher
- npm 9+

### 1. Install Dependencies
Run the install command across root, backend, and frontend:
```bash
npm install
npm install --prefix backend
npm install --prefix frontend
```

### 2. Start Local Development
Start both backend (port 5000) and frontend (port 5173) concurrently:
```bash
npm run dev
```

Open your browser to:
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Redirect Base**: [http://localhost:5000](http://localhost:5000)

Alternatively, run each service independently:
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### 3. Production Build & Execution
Build the frontend and run the standalone server:
```bash
npm run build
npm start
```
When built, the Express backend automatically serves the production frontend SPA from `frontend/dist/` on port 5000!

---

## Configuration & Environment Variables

Shortly requires **no manual `.env` file** to run locally. All settings fall back to sensible development defaults.

To override settings, set environment variables in your terminal or hosting provider:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `5000` | Port for Express backend HTTP server |
| `HOST` | `0.0.0.0` | Bind host (0.0.0.0 enables LAN access) |
| `PUBLIC_URL` | `http://localhost:5000` | Public base URL used for generating short links and QR codes |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed origin for CORS in development |
| `DATA_DIR` | `./backend/data` | Directory where persistent JSON files are written |
| `ALLOW_LOCAL_URLS` | `true` (dev) / `false` (prod) | Whether to permit loopback/localhost destination URLs |
| `RATE_LIMIT_MAX` | `100` | Max API requests per 15-minute window per IP |
| `IP_SALT` | `shortly-privacy-salt-v1` | Salt used to hash visitor IPs for unique visitor calculation |

---

## REST API Reference

### Health
- `GET /api/health` — Service health check, uptime, and configuration summary.

### URLs
- `GET /api/urls` — Paginated list of URLs. Supports query params: `search`, `status` (`all|active|disabled|expired`), `sortBy` (`createdAt|clicks`), `sortOrder` (`asc|desc`), `page`, `limit`.
- `POST /api/urls` — Create a new short URL.
  ```json
  {
    "longUrl": "https://example.com/target-page",
    "title": "Campaign Link",
    "customAlias": "spring-sale",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "clickLimit": 100,
    "password": "optionalPassword",
    "isOneTimeUse": false
  }
  ```
- `GET /api/urls/:id` — Get link details by ID.
- `GET /api/urls/code/:code` — Look up link metadata by short code.
- `PATCH /api/urls/:id` — Update link properties (`title`, `longUrl`, `isActive`, `clickLimit`, `expiresAt`, `password`).
- `DELETE /api/urls/:id` — Delete link and its click history.
- `POST /api/urls/bulk-status` — Enable or disable multiple links (`{ "ids": [...], "isActive": boolean }`).
- `POST /api/urls/bulk-delete` — Bulk delete links (`{ "ids": [...] }`).
- `POST /api/urls/:code/verify` — Verify password for a password-protected link (`{ "password": "..." }`).

### Analytics
- `GET /api/analytics/summary` — Overview metrics: total links, active links, total clicks, clicks today, top links, recent click stream.
- `GET /api/analytics/timeseries?days=7` — Daily click volume and unique visitors over the last N days.
- `GET /api/analytics/devices` — Breakdown by device category (`desktop`, `mobile`, `tablet`, `bot`).
- `GET /api/analytics/browsers` — Breakdown by browser (`Chrome`, `Safari`, `Firefox`, etc.).
- `GET /api/analytics/referrers` — Breakdown by referral source (`Direct`, `Google`, `X / Twitter`, etc.).
- `GET /api/urls/:id/analytics?days=30` — Complete analytics suite for a single link.

### Redirection
- `GET /:code` — Redirects to destination URL (HTTP 302). If expired or limit reached, returns HTTP 410. If disabled, returns HTTP 403. If password protected without token, prompts for password.

---

## Testing

### Unit and Integration Tests (Vitest + Supertest)
Runs 20 automated tests covering validation, creation, custom alias conflicts, password verification, redirects, expiration, device categorization, and analytics aggregation:
```bash
npm test
```

### End-to-End Workflow Verification
Runs an automated end-to-end integration test (`tests/e2e-verification.js`):
1. Spawns an in-process HTTP server.
2. Creates a short link.
3. Simulates iPhone (mobile) visit with Twitter referrer.
4. Simulates Desktop Chrome visit with Google search referrer.
5. Verifies 302 redirects and HTTP response headers.
6. Asserts exact device classification (Mobile=1, Desktop=1).
7. Shuts down the server and boots a second server instance against the same data files.
8. Confirms 100% data persistence across server restarts.

```bash
npm run test:e2e
```

---

## LAN & Mobile Testing

To test Shortly on your smartphone via local Wi-Fi:

1. **Find your computer's local IP address**:
   - Windows: Run `ipconfig` in PowerShell (e.g. `192.168.1.105`).
   - macOS / Linux: Run `ifconfig` or `ip a`.
2. **Start the backend with your LAN IP**:
   ```powershell
   $env:PUBLIC_URL="http://192.168.1.105:5000"
   npm run dev:backend
   ```
3. **Start the frontend**:
   ```bash
   npm run dev:frontend
   ```
4. **Open the dashboard on your phone or scan the QR code**:
   Any link created will now generate short URLs using `http://192.168.1.105:5000/<code >`. Scanning the QR code with your phone camera will redirect through your laptop, registering a genuine mobile visit in your dashboard analytics!

---

## Storage Architecture & Future MongoDB Migration

### Current File Storage (`backend/data/`)
- Links and click records are persisted in `urls.json` and `clicks.json`.
- Writes are serialized through an in-memory queue and written using atomic `.tmp` file replacement to prevent data corruption during crashes.
- Lookups for redirects are $O(1)$ from an in-memory cache synchronized with disk writes.

### Concurrency & Scalability Limitations
- File-based JSON storage is optimized for single-instance Node.js deployments.
- Ephemeral container filesystems (e.g., standard free-tier containers without persistent storage) will lose data on restart. Persistent disk volumes should be mounted if staying on JSON storage.

### MongoDB Transition Path
The application follows a clean Repository pattern:
- `urlRepository.js` implements `findAll`, `findById`, `findByCode`, `create`, `update`, `delete`.
- `clickRepository.js` implements `recordClick`, `getSummary`, `getTimeseries`, `getDeviceBreakdown`.

To switch to MongoDB:
1. Install `mongoose`.
2. Create Mongoose models for `Url` and `Click`.
3. Swap the JSON storage methods inside `backend/src/repositories/urlRepository.js` and `clickRepository.js` to execute Mongoose queries.
4. The service layer, controllers, rate limiters, and frontend require **zero code changes**.

---

## Security Highlights

- **HTTP Headers**: Enforced via Helmet.
- **SSRF Protection**: Destructive internal network / loopback destination targets (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `169.254.0.0/16`) are blocked in production environments.
- **Privacy-Preserving Visitor Identification**: Raw IP addresses are never saved to disk. Hashes (`sha256(ip + salt)`) are used solely to deduce unique visitor counts.
- **Rate Limiting**: Tiered abuse prevention for API endpoints, link generation (30/min), password attempts (10/min), and redirects (300/min).
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` to flush in-flight disk writes before process termination.

---

## License

MIT License. Crafted as an educational full-stack software product prototype.
