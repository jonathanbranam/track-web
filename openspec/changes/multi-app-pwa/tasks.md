## 1. Monorepo Restructure

- [x] 1.1 Rename `client/` → `client-tracker/` and update all internal path references
- [x] 1.2 Update root `package.json` with npm workspaces: `["client-tracker", "client-movies", "packages/ui"]`
- [x] 1.3 Rename `client-tracker` package name in its `package.json` to `@repo/tracker`
- [x] 1.4 Update root `package.json` scripts: add `build:tracker`, `build:movies`; update `build` to run all in parallel
- [x] 1.5 Update `client-tracker/vite.config.ts` `base` to `'/'` and confirm `outDir` is `dist`
- [x] 1.6 Scaffold `packages/ui/` with a minimal `package.json` (`@repo/ui`) and empty index export
- [x] 1.7 Scaffold `client-movies/` as an empty Vite + React workspace (package.json, vite.config.ts, index.html, src/main.tsx)

## 2. Database: Multi-user Schema

- [x] 2.1 Add `users` table migration to `src/db.ts` (`id`, `email`, `password_hash`, `created_at`)
- [x] 2.2 Add `user_id` (FK → users) and `app_id` columns to `time_entries` via migration; backfill existing rows with a default seed user
- [x] 2.3 Add `groups` and `group_members` table migrations to `src/db.ts`
- [x] 2.4 Create `scripts/create-user.ts` CLI that accepts email + password, bcrypt-hashes the password, and inserts a `users` row
- [x] 2.5 Add `"create-user": "tsx scripts/create-user.ts"` to root `package.json` scripts
- [x] 2.6 Remove `EMAIL` and `PASSWORD_HASH` from `src/env.ts`; add `SESSION_SECRET` (already present or rename as needed)

## 3. Authentication: Database-backed Multi-user

- [x] 3.1 Update `src/routes/auth.ts` login handler to look up user in the `users` table instead of comparing env vars
- [x] 3.2 Set session cookie `Domain` to `.branam.us` in the login response (keep `Secure; HttpOnly; SameSite=Lax`)
- [x] 3.3 Update `src/middleware/auth.ts` to attach `userId` (from DB lookup of session) to Hono context
- [x] 3.4 Update `/api/auth/me` to return `userId` from the authenticated session

## 4. Backend: Route Prefixes & Multi-user Queries

- [x] 4.1 Move time entry routes from `/api/entries/*` to `/api/tracker/entries/*`
- [x] 4.2 Apply shared auth middleware to all `/api/*` routes at the app level (not per-router)
- [x] 4.3 Update all time entry repository queries to filter by `user_id` and `app_id = 'tracker'`

## 5. Frontend: Time Tracker API Update

- [x] 5.1 Update all `fetch` calls in `client-tracker/src/api.ts` (and anywhere else) from `/api/entries/*` to `/api/tracker/entries/*`
- [x] 5.2 Verify the time tracker dev server starts and the full flow (start, stop, log) works against the updated routes

## 6. Infrastructure: Caddy & PM2

- [x] 6.1 Update `Caddyfile` to add a `tracker.branam.us` block: static files from `client-tracker/dist`, SPA fallback, `/api/*` proxy to `localhost:3000`
- [x] 6.2 Update `Caddyfile` to add a placeholder `movies.branam.us` block pointing to `client-movies/dist`
- [x] 6.3 Verify `ecosystem.config.cjs` paths are correct after `client/` rename; update if needed
- [x] 6.4 Run `npm run build` end-to-end and confirm all client and server builds succeed
