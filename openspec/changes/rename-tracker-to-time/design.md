## Context

The monorepo houses multiple apps ("trackers" for various domains). The time tracking app is one of these, and its internal identity has been "tracker" — a generic label that made sense when it was the only app. With the multi-app structure established, each app needs a specific identity. The time app is served at `time.branam.us`, and aligning its internal names to "time" removes the ambiguity.

The rename touches: a directory, an npm workspace package name, build script names, an API route prefix, hardcoded `app_id` string literals in SQL, and Caddyfile paths. The only operation with production data risk is the `app_id` column migration.

## Goals / Non-Goals

**Goals:**
- Rename all "tracker" identifiers to "time" with no behavior change
- Migrate existing `time_entries` rows from `app_id = 'tracker'` → `app_id = 'time'`
- Keep the rename atomic from the user's perspective (single deploy, no phased rollout)

**Non-Goals:**
- Changing any user-visible behavior, UI text, or app functionality
- Updating `openspec/changes/archive/` historical records (these are frozen snapshots)

## Decisions

### 1. Use `git mv` for directory rename
Renaming `client-tracker/` → `client-time/` with `git mv` rather than a plain filesystem rename preserves git blame and history continuity. After `git mv`, all internal path references are updated before committing.

**Alternative considered**: Plain `mv` + `git add`. Works but creates a delete + add in history, losing file-level blame context on a frequently-edited directory.

### 2. Inline DB migration for `app_id` rename
`src/db.ts` uses sequential try/catch migration blocks. A new migration block will run:
```sql
UPDATE time_entries SET app_id = 'time' WHERE app_id = 'tracker'
```
This executes once on first startup after deploy. A guard column/flag is not needed because the UPDATE is idempotent — re-running it on already-renamed rows is a no-op.

The existing `ALTER TABLE ... DEFAULT 'tracker'` migration code is also updated to `DEFAULT 'time'`. This only affects fresh database installs (the ALTER is skipped on existing databases since the column already exists).

**Alternative considered**: A separate migration script run manually before deploy. Unnecessary overhead for a single-table, single-user app with no concurrent users.

### 3. No phased API route rollout
The API prefix change (`/api/tracker/` → `/api/time/`) and frontend URL change happen together in one deploy. No compatibility shim for `/api/tracker/` is added.

**Rationale**: This is a single-user, self-hosted app. No external consumers depend on the API. A simultaneous frontend + backend deploy has zero downtime risk.

**Alternative considered**: Temporary alias route for `/api/tracker/` pointing to the same handlers. Adds dead code with no benefit.

### 4. Regenerate `package-lock.json` rather than hand-edit
The lock file references `@repo/tracker` package name and `client-tracker` workspace path. After updating source `package.json` files, running `npm install` from the repo root regenerates the lock file cleanly.

**Alternative considered**: Manually editing the lock file. Error-prone; `npm install` is the correct tool.

## Risks / Trade-offs

- **DB migration is one-way** → The UPDATE has no automatic rollback. If a revert is needed, a reverse migration (`app_id = 'tracker'` WHERE `app_id = 'time'`) must be run manually. Since this is a self-hosted single-user app with no external dependents, this risk is acceptable.

- **Brief deploy window** → If the backend restarts (running the DB migration) before the newly-built frontend is served, any in-flight request to the old `/api/tracker/` route will 404. Window is sub-second for a PM2 restart; acceptable for a single-user app.

- **`packages/auth` dependency** → `client-tracker/package.json` may reference `@repo/tracker` in ways that `packages/auth` or `client-movies` depend on indirectly. Verify `packages/auth/package.json` and `client-movies/package.json` for any `@repo/tracker` references before committing.

## Migration Plan

1. `git mv client-tracker client-time`
2. Update all source files (package names, route strings, SQL literals, config paths)
3. `npm install` from repo root → regenerates `package-lock.json`
4. `npm run build` → confirm all three targets succeed (time, movies, server)
5. Deploy: push to server, `npm install`, `npm run build`, `pm2 restart` (migration runs on startup)
6. Smoke-test: start timer → stop timer → check log; verify `/api/time/entries` in network tab

**Rollback** (if needed):
- Revert code changes and redeploy
- Manually run: `UPDATE time_entries SET app_id = 'tracker' WHERE app_id = 'time'`

## Open Questions

_(none — rename scope is fully defined)_
