## 1. Project Scaffold

- [ ] 1.1 Initialize monorepo structure: `src/` (backend), `client/` (frontend), shared `package.json` with workspaces
- [ ] 1.2 Configure TypeScript (tsconfig.json) for backend with strict mode
- [ ] 1.3 Add backend dependencies: hono, better-sqlite3, zod, bcrypt, date-fns-tz, hono-sessions, hono-rate-limiter (or equivalent)
- [ ] 1.4 Add frontend dependencies: react, react-dom, vite, vite-plugin-pwa, tailwindcss, postcss, autoprefixer
- [ ] 1.5 Create `.env.example` with keys: EMAIL, PASSWORD_HASH, SESSION_SECRET, PORT, SQLITE_PATH
- [ ] 1.6 Configure Vite to build into `dist/` at project root and proxy `/api/*` to backend in dev mode

## 2. Database & Repository Layer

- [ ] 2.1 Define `IEntryRepository` and `IUserRepository` interfaces in `src/repositories/interfaces.ts`
- [ ] 2.2 Create SQLite schema migration: `users` and `time_entries` tables with correct columns and indexes
- [ ] 2.3 Implement `SqliteUserRepository` (get user by email, seed user from env on startup)
- [ ] 2.4 Implement `SqliteEntryRepository` (create, stop, get running, list by date range)
- [ ] 2.5 Implement date-range query using 4am US/Eastern boundary via `date-fns-tz`
- [ ] 2.6 Add tag parsing utility: extract `#hashtags` from description, normalize to lowercase comma-separated string

## 3. Authentication

- [ ] 3.1 Create `npm run hash-password` CLI script that prompts for plaintext and outputs bcrypt hash
- [ ] 3.2 Add startup validation: exit with error if EMAIL or PASSWORD_HASH env vars are missing
- [ ] 3.3 Seed user row from env vars on startup (upsert by email)
- [ ] 3.4 Implement `POST /api/auth/login` with bcrypt compare, session cookie creation
- [ ] 3.5 Implement `POST /api/auth/logout` that invalidates the session
- [ ] 3.6 Implement `GET /api/auth/me` returning current user (or 401)
- [ ] 3.7 Add auth middleware protecting all `/api/entries/*` routes
- [ ] 3.8 Add in-memory rate limiter: 5 failed attempts per IP per 15 minutes → 429
- [ ] 3.9 Log server-side when "Forgot Login" endpoint is hit (IP + timestamp)

## 4. Time Entry API

- [ ] 4.1 Implement `POST /api/entries` — create new entry, enforce no running entry + no overlap with previous
- [ ] 4.2 Implement `PATCH /api/entries/:id` — update started_at or ended_at; validate bounds
- [ ] 4.3 Implement `GET /api/entries/running` — return current running entry or null
- [ ] 4.4 Implement `GET /api/entries?date=YYYY-MM-DD` — return completed entries for day (4am boundary, default today)
- [ ] 4.5 Add zod schemas for all request bodies; return 422 with field errors on validation failure
- [ ] 4.6 Wire repository injection into all route handlers (no direct SQLite calls in routes)

## 5. Static File Serving & Server Entry

- [ ] 5.1 Configure Hono to serve `dist/` static files for all non-API routes
- [ ] 5.2 Add SPA fallback: serve `dist/index.html` for any unmatched route (React Router support)
- [ ] 5.3 Create `src/index.ts` server entry point with startup sequence: env validation → DB init → seed user → start server
- [ ] 5.4 Add `npm run build` script that builds frontend then compiles backend TypeScript
- [ ] 5.5 Add `npm start` script that runs the compiled server

## 6. React Frontend — Shell & Routing

- [ ] 6.1 Set up React app with client-side routing (React Router): routes for `/login`, `/` (home), `/log`
- [ ] 6.2 Add auth guard: redirect to `/login` if no valid session; redirect to `/` if already logged in
- [ ] 6.3 Create bottom navigation bar with two tabs: Home (running task) and Log (today's entries)
- [ ] 6.4 Set up Tailwind CSS with mobile-first base styles and a dark-friendly color palette

## 7. Login UI

- [ ] 7.1 Build login screen with email + password fields, "Sign In" button, "Forgot Login?" and "Create Account" links
- [ ] 7.2 Wire "Forgot Login?" to call a server endpoint (POST /api/auth/forgot) that logs the attempt, show generic message in UI
- [ ] 7.3 Wire "Create Account" to navigate to a `/beta` screen with the closed beta message
- [ ] 7.4 Show inline error on failed login (wrong credentials) and 429 lockout message
- [ ] 7.5 On successful login, redirect to `/`

## 8. Time Picker Component

- [ ] 8.1 Build `TimePicker` component with hour/minute scroll or input, and -5m/-10m/-30m quick-offset buttons
- [ ] 8.2 Accept `min` prop (lower bound constraint) and disable confirm/clamp values below it
- [ ] 8.3 Show inline error or disable confirm button when selected time violates constraint
- [ ] 8.4 Offset buttons clamp to lower bound rather than going below it

## 9. Home Screen — Running Task & Start Task

- [ ] 9.1 Build `RunningTask` component: show description, tag chips, elapsed time (live updating), started_at
- [ ] 9.2 Build "Stop Task" flow: tap Stop → show `TimePicker` (default: now) → confirm → PATCH entry → open Start Task screen
- [ ] 9.3 Build `StartTask` screen: description text field with inline #hashtag rendering, `TimePicker` (default: previous ended_at or now), Start button
- [ ] 9.4 On Start: POST /api/entries, navigate back to home showing new running task
- [ ] 9.5 Show empty state on home screen when no running task with prompt to start first task

## 10. Today's Log View

- [ ] 10.1 Build log list showing each completed entry: description, tag chips, start time, end time, duration formatted as "Xh Ym"
- [ ] 10.2 Fetch entries from GET /api/entries (default today) on tab focus
- [ ] 10.3 Show empty state when no entries for the day

## 11. PWA Configuration

- [ ] 11.1 Configure vite-plugin-pwa with manifest: name, short_name, icons (192×192 and 512×512 PNG), display: standalone, theme_color, background_color
- [ ] 11.2 Create and add PNG icons at required sizes
- [ ] 11.3 Add `<meta name="apple-mobile-web-app-capable">` and apple-touch-icon tags to index.html
- [ ] 11.4 Verify service worker registers without errors in iOS Safari
- [ ] 11.5 Test "Add to Home Screen" on iOS and confirm standalone launch

## 12. Deployment

- [ ] 12.1 Create `Caddyfile` with DuckDNS domain and `reverse_proxy localhost:PORT`
- [ ] 12.2 Create `ecosystem.config.js` for pm2 with app name, script path, env file
- [ ] 12.3 Write `deploy.sh`: validate EC2_HOST, ssh in, git pull, npm ci, npm run build, pm2 restart
- [ ] 12.4 Create `docs/setup.md` with first-time EC2 setup steps: install Node, pm2, Caddy; configure DuckDNS; first deploy
- [ ] 12.5 Verify end-to-end on EC2: HTTPS cert provisioned, app loads, login works, start/stop task works, PWA installs on iOS
