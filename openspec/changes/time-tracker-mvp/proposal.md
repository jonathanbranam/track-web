## Why

Personal time tracking is most effective when switching tasks is so fast it creates no friction—otherwise you stop doing it. This is an MVP web app (PWA) to replace a previous React Native app, delivering the same continuous-timeline tracking experience from any browser or iOS home screen, self-hosted on an existing EC2 instance.

## What Changes

- New application: a full-stack time tracking PWA built with Hono (backend) + React/Vite (frontend)
- Single Node.js process serves both the REST API and compiled frontend static files
- Continuous timeline model: no gaps allowed between time entries; every moment is accounted for
- Inline tag prefixes (`#tag` or `:tag`) within free-text task descriptions; `:` accepted as a single-tap iOS alternative to `#`
- Time adjustment UX (start/stop) with -5m/-10m/-30m shortcuts and manual time picker
- Honeypot-style login UI with a single hard-coded user; rate-limited auth endpoints
- HTTPS via Caddy + Let's Encrypt on a DuckDNS subdomain
- SSH-based deploy script for EC2 deployment with pm2 process management
- Persistence layer abstracted behind repository interfaces for future storage backend swaps

## Capabilities

### New Capabilities

- `time-entries`: Core time tracking — create, start, stop, and list time entries with continuous timeline enforcement
- `tags`: Inline tag parsing (`#tag` or `:tag`) from entry descriptions into searchable tag fields
- `time-adjustment`: Time picker UI with quick-offset buttons for retroactively correcting start/end times
- `user-auth`: Single-user authentication with bcrypt password, session cookie, rate limiting, and honeypot login UI
- `daily-log`: Day boundary logic (4am–4am US/Eastern), today's log view showing completed entries
- `pwa-shell`: PWA manifest + service worker for iOS "Add to Home Screen" installability
- `deployment`: EC2 deployment with Caddy (HTTPS), pm2, and deploy.sh script

### Modified Capabilities

## Impact

- **New project**: no existing code affected
- **Dependencies**: Hono, better-sqlite3, zod, bcrypt, hono-session (or cookie-session), React, Vite, vite-plugin-pwa, Tailwind CSS, Caddy, pm2
- **Infrastructure**: EC2 instance (existing), DuckDNS domain, Let's Encrypt TLS cert (auto-managed by Caddy)
- **APIs introduced**: `/api/auth/*`, `/api/entries/*`
- **Data**: SQLite file stored alongside application code; repository interface abstraction required
