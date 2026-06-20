# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs backend tsx watch + Vite frontend concurrently)
npm run dev

# Build
npm run build           # builds both clients and server
npm run build:time      # client-time only (Vite)
npm run build:watch     # client-watch only (Vite)
npm run build:server    # server only (tsc)

# Production
npm start               # runs compiled server from out/index.js

# Utilities
npm run hash-password   # generate bcrypt hash for user setup
```

No lint or test commands are configured.

## Local Testing

When testing on a real device, the app is loaded from an iPhone over the local network via HTTP (e.g. `http://10.0.0.113:6035`). This is **not a secure context** (`window.isSecureContext === false`), which has implications:

- `DeviceMotionEvent.requestPermission` on iOS 13+ requires a secure context — it will silently fail (reject) over plain HTTP on a LAN IP.
- Any Web API gated on secure context (e.g. Web Crypto, certain sensor APIs) will be unavailable or broken.
- When working on features that use these APIs, either note the limitation or suggest testing via the production URL (`https://games.branam.us`) where Caddy provides HTTPS.

## Verification

When using `playwright-cli screenshot`, always save to `/tmp/track-verify/` — never the project root. Example:

```bash
mkdir -p /tmp/track-verify
playwright-cli screenshot --filename=/tmp/track-verify/my-screenshot.png
```

> **Keep in sync:** When adding, renaming, or removing client apps or subdomains, update all of these files together:
> - `Caddyfile` — production reverse proxy routes and static file roots
> - `Caddyfile.local` — local dev proxy routes
> - `server-deploy.sh` — build steps (must match the `build:*` scripts in `package.json`)
> - `dev-local.sh` — tmux panes for local dev sessions
> - `openapi.yaml` — OpenAPI spec; update whenever an API route is added, modified, or removed
> - `llm-context.md` — LLM agent context guide; update when feature areas, auth behavior, or key conventions change

> **DNS:** `branam.us` has a wildcard DNS record (`*.branam.us`) pointing to the production server. No new DNS records are needed when adding a new client app subdomain — Caddy handles SSL via Let's Encrypt automatically on first request.

## Planning

Future work is tracked in per-app planning docs. Check these before starting new work, and add items here when identifying future improvements:

- `docs/app/planning.md` — cross-app and shared infrastructure
- `docs/watch/planning.md` — watch app
- `docs/time/planning.md` — time app
- `docs/food/planning.md` — food app

## Architecture

This is a **single-user, self-hosted time tracking PWA** — a monorepo with a Hono (Node.js) backend and React 19 frontend.

### Backend (`src/`)

- **`index.ts`** — entry point, server startup
- **`app.ts`** — Hono app, route registration, static file serving
- **`db.ts`** — SQLite connection via `better-sqlite3`, inline migrations
- **`env.ts`** — environment variable validation
- **`routes/auth.ts`** — login/logout/me endpoints; `/api/auth/forgot` is a honeypot that logs the attempt (timestamp + IP) and returns a generic message
- **`routes/entries.ts`** — time entry CRUD
- **`repositories/sqlite/`** — data access layer (implements interfaces from `repositories/interfaces.ts`)
- **`middleware/auth.ts`** — cookie session authentication
- **`utils/session.ts`** — in-memory session store (lost on restart)
- **`utils/tags.ts`** — tag parsing (`#tag` and `:tag` tokens → normalized in description and tags column)
- **`utils/date.ts`** — timezone logic (4 AM ET day boundary)

### Frontend (`client-time/src/`)

- **`App.tsx`** — React Router v7 setup with `AuthGuard`; PWA service worker registered via `vite-plugin-pwa`
- **`api.ts`** — fetch wrapper (credentials: include)
- **`hooks/useAuth.tsx`** — auth Context (userId, loading, logout)
- **`pages/HomePage.tsx`** — active timer UI, start/stop task
- **`pages/LogPage.tsx`** — today's completed entries
- **`pages/LoginPage.tsx`** — honeypot login UI (email + password fields; "Forgot Login?" logs server-side; "Create Account" shows a closed-beta message)
- **`pages/BetaPage.tsx`** — closed beta / create account honeypot page
- **`components/`** — `NavBar`, `TagChip`, `TimePicker`

### Database Schema

Two tables in SQLite:
- `users` — email + bcrypt password hash (single user)
- `time_entries` — `started_at`/`ended_at` as ISO 8601 UTC strings, `description`, `tags` (comma-separated)

### Key Conventions

- **Timestamps** are always stored as ISO 8601 UTC; displayed in US/Eastern via `date-fns-tz`
- **"Today"** = 4 AM ET to 4 AM ET next day
- **Tags** accept `#tag` or `:tag` prefixes (including hyphens, e.g. `#yard-work`); duplicates are deduplicated. At write time: `:tag` tokens in the description are rewritten to `#tag`, and the `tags` column stores the bare lowercase words (no prefix) as a comma-separated string
- **Sessions** are in-memory (not persisted across restarts); cookie max age 30 days
- **One running entry** per user at a time; new entry start time must be ≥ previous entry's end time
- **Build output**: server → `out/src/`, client → `client-time/dist/` (served as SPA fallback)
- **Production**: PM2 (`ecosystem.config.cjs`) + Caddy reverse proxy (`Caddyfile`)
