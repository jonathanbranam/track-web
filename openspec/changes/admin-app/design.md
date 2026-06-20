## Context

The app is single-user and self-hosted; the owner account is **user 1** (the first user created, `dev@branam.us`). Today, admin operations are scattered:

- **Deploy**: `POST /api/deploy/trigger` (session + `userId === 1`) invoked by a button in the time app's nav bar; the GitHub webhook `POST /api/deploy` (HMAC-verified) is separate and stays.
- **Backup/restore**: only via CLI — `scripts/export-db.ts` (`npm run db:export`, writes per-table JSON/CSV + `schema.json` + `summary.json` to `exports/<stamp>`) and `scripts/import-db.ts` (`npm run db:import --from <folder>`, with a migration-compatibility check).
- **User management**: only via the admin CLI (`scripts/admin.ts` — `users:create/list/delete/update-password/set-name`), which talks directly to the repositories.
- **Logs**: three files written on the server — `logs/out.log` and `logs/error.log` (PM2 stdout/stderr per `ecosystem.config.cjs`) and `logs/deploy.log` (deploy output).

This change introduces a dedicated `client-admin` app and an `/api/admin/*` surface so these operations have a real home, and removes admin UI from the consumer apps.

## Goals / Non-Goals

**Goals:**
- A `client-admin` app at `admin.branam.us` (dev port 6040) usable **only by user 1**; other authenticated users get "Access Denied".
- Move the manual deploy trigger off the time app into the admin app behind `POST /api/admin/deploy`.
- Backup, restore, user management, API-token management, and a server-log viewer, all in the admin app.
- Every admin operation remains accessible without the UI. This is already satisfied by existing CLI/scripts (`scripts/admin.ts` user commands, `db:export`/`db:import`, `server-deploy.sh`) and by reading log files on the server, so no new CLI commands are required by this change.
- Server-side enforcement of admin-only access on every `/api/admin/*` route (not just a client gate).

**Non-Goals:**
- No multi-admin roles or `is_admin` column — admin is exactly `userId === 1` (single-owner convention).
- No live log streaming/tailing — a snapshot of the most recent lines is enough.
- No scheduled, offsite, or cloud backups; no backup download-to-browser (server-side create/restore only).
- No new database tables (so no `TABLE_NAMES` change).

## Decisions

### Admin identity = `userId === 1`, enforced server-side
A shared `requireAdmin` middleware (session auth + `userId === 1`, else `403`) guards the whole `/api/admin` router; the client also gates the UI for UX. Rationale: the app is single-owner and user 1 is the established owner (the existing deploy trigger already uses this exact check). *Alternative considered:* an `is_admin`/role column — rejected as over-engineering for a single-user app; if multi-admin is ever needed, the middleware is the single place to change.

### One `/api/admin` router with sub-routes
New `src/routes/admin/index.ts` mounts `deploy.ts`, `backups.ts`, `users.ts`, and `logs.ts` under `/api/admin`, all behind `requireAdmin`, registered in `app.ts`. Keeps admin surface cohesive and uniformly guarded.

### Deploy: reuse `runDeploy`, drop the old trigger
Extract `runDeploy()` from `src/routes/deploy.ts` into a small shared module so both the GitHub webhook and `POST /api/admin/deploy` call it. Remove `POST /api/deploy/trigger` and its session middleware; remove the time-app button (`client-time` `NavBar.tsx` + `api.deploy`). `POST /api/admin/deploy` returns **202** on trigger. Non-UI access already exists via `server-deploy.sh` / `deploy.sh`; no new CLI command is required.

### Backup/restore: reuse the existing `exports/` mechanism unchanged
The admin app SHALL be **fully compatible with existing backup behavior** — it reuses the existing scripts and the `exports/` layout rather than introducing a new directory. The two backup forms already exist: the **rolling/scheduled** backup at `exports/backup/` (written by `db:export --backup`, then committed and pushed to the standalone `exports/` git repo by `export-push.sh`, normally via cron), and **timestamped** snapshots at `exports/export-<UTC-stamp>/` (written by `db:export`). Restore is `db:import --from <folder>` with its migration-compatibility check. The admin routes are thin wrappers that invoke these same scripts/logic, so server and UI stay in lock-step.

Four operations are exposed, mapping 1:1 to existing behavior:
- `POST /api/admin/backups/scheduled` → runs `export-push.sh` (rolling backup to `exports/backup/` + git commit/push only when changed); reports whether it pushed.
- `POST /api/admin/backups/scheduled/restore` → imports from `exports/backup/` after explicit confirmation.
- `POST /api/admin/backups/timestamped` → runs `db:export`, returns the new `export-<stamp>` folder name.
- `GET /api/admin/backups/timestamped` → lists the **10 most recent** `exports/export-*` folders; `POST /api/admin/backups/timestamped/:name/restore` imports a selected one after explicit confirmation (name validated against the listed set).

Restores require an explicit `confirm: true`. Non-UI access already exists via `db:export[-push]` / `db:import`; no new CLI commands are required. To share logic cleanly the route handlers may shell out to the existing scripts or call a small extracted module they both use — either way the on-disk format and `exports/` location are unchanged.

### Logs: allowlisted, read-only tail
`GET /api/admin/logs` lists the three known logs (key, filename, size, mtime). `GET /api/admin/logs/:name?lines=N` returns the **last N lines** (default 200, capped, e.g. 1000) of one log. `:name` is mapped through a fixed allowlist — `output → out.log`, `error → error.log`, `deploy → deploy.log` — so no user-supplied path ever reaches the filesystem (prevents path traversal). Reading the tail seeks from the end rather than loading whole files. Non-UI access already exists by reading/tailing the files under `logs/` directly on the server; no new CLI command is required.

**Refresh:** logs are a point-in-time snapshot — the response is whatever the file held at request time. The log page provides a **manual Refresh button** that re-fetches the current tail (the simplest mechanism, and the baseline requirement). It also offers an optional **auto-refresh** toggle that polls the same endpoint on an interval (e.g. every 5s) while enabled, off by default so it never holds the connection or wastes requests. No streaming/websocket — polling the tail endpoint is sufficient. (The viewer shows the most-recent lines; whether to keep scroll pinned to the bottom on refresh is a UI detail for implementation.)

### client-admin app shell
Mirror the other client workspaces (`@repo/admin`, React 19 + Vite + Tailwind + PWA, `@repo/auth`). An `AdminGuard` wraps `AuthGuard`: once authenticated it checks `userId === 1`; if not, it renders an **Access Denied** view instead of the requested page. The shared `LoginPage` is reused with "Admin" branding; on successful login user 1 lands on the admin home (`/`). Port 6040, `admin.branam.us`, with the standard Caddyfile/deploy wiring.

## Risks / Trade-offs

- **Destructive restore overwrites live data.** → Require explicit `confirm: true` and run the existing migration-compatibility check before importing. Because a fresh timestamped backup is one click away, the UI can prompt the user to take one first rather than the server forcing it.
- **Path traversal via log/backup names.** → Fixed allowlist for logs; backup names validated against the set returned by the list endpoint (no raw paths from the client).
- **Backups contain sensitive data (bcrypt password hashes).** → This is existing behavior: the scheduled backup commits and pushes `exports/` to a **separate git remote**, which must be kept private. The admin app does not change that; it only triggers the same routine, reachable only by user 1, with no browser download in scope.
- **`userId === 1` is a hardcoded convention.** → Centralized in one middleware; documented; swappable for a flag later without touching routes.
- **Large log files.** → Tail the last N lines with a cap rather than returning whole files.
- **Removing the time-app deploy button is cross-app.** → Ship the `client-time` rebuild together with the backend route removal so there's no window where the button calls a missing endpoint.

## Migration Plan

Additive for the new app and routes; the only removals are `POST /api/deploy/trigger` and the time-app deploy button, deployed together. Add `client-admin` to workspaces, `build:admin`, and the `admin.branam.us` / port 6040 entries in Caddyfile, Caddyfile.local, server-deploy.sh, dev-local.sh. No new backup directory or `.gitignore` change — the existing `exports/` mechanism is reused unchanged. No database migration (no schema changes). Rollback: revert the change; the `exports/` backups remain valid and restorable via the existing scripts.

## Open Questions

- **Backup directory** — resolved: the admin app reuses the existing `exports/` layout (`exports/backup/` for scheduled, `exports/export-<stamp>/` for timestamped); no separate `backup/` directory is introduced.
- **Wrap scripts vs. extract a module?** — handlers may shell out to `export-push.sh`/`export-db.ts`/`import-db.ts` directly, or call a small shared module those scripts also use. Either keeps the on-disk format identical; decide at implementation time.
- **Safety-backup-before-restore** default on always, or opt-out via a flag?
- **Log filtering** — is plain tail enough, or do we want level/substring filtering and pagination later?
- **Backup retention** — prune old backups automatically, or leave manual?
