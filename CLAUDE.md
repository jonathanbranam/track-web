# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (runs backend tsx watch + Vite frontend concurrently)
npm run dev

# Build
npm run build           # builds both client and server
npm run build:client    # client only (Vite)
npm run build:server    # server only (tsc)

# Production
npm start               # runs compiled server from out/index.js

# Utilities
npm run hash-password   # generate bcrypt hash for user setup
```

No lint or test commands are configured.

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

### Frontend (`client/src/`)

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
- **Build output**: server → `out/src/`, client → `client/dist/` (served as SPA fallback)
- **Production**: PM2 (`ecosystem.config.cjs`) + Caddy reverse proxy (`Caddyfile`)
