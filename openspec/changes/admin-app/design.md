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
- Every new API operation has a matching admin CLI command (data-returning ones support `--json`), so nothing is UI-only.
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
Extract `runDeploy()` from `src/routes/deploy.ts` into a small shared module so both the GitHub webhook and `POST /api/admin/deploy` call it. Remove `POST /api/deploy/trigger` and its session middleware; remove the time-app button (`client-time` `NavBar.tsx` + `api.deploy`). `POST /api/admin/deploy` returns **202** on trigger. *CLI parity:* an `admin deploy` command runs the same deploy (the underlying `server-deploy.sh` already exists).

### Backup/restore: shared library, `backup/` directory, confirmed restore
Refactor the export/import internals into a shared module (e.g. `src/lib/backup.ts`) used by both the CLI and the API, so logic isn't duplicated. Admin-created backups are written to **`backup/<UTC-stamp>/`** (per the acceptance criteria) using the existing per-table JSON/CSV + `summary.json` (with `latestMigration` + `schemaHash`) format.
- `POST /api/admin/backups` → creates a backup, returns the new folder name.
- `GET /api/admin/backups` → lists existing backups (name, timestamp, row/total counts from `summary.json`).
- `POST /api/admin/backups/:name/restore` → restores after an **explicit confirmation** (a `confirm: true` in the body), reusing the migration-compatibility check. Before overwriting, it first writes a **safety backup** of current data so a mistaken restore is recoverable.
*CLI parity:* `admin backups:create`, `admin backups:list --json`, `admin backups:restore <name>` wrap the same module. (The legacy `db:export`/`db:import` scripts remain; aligning them onto the shared module/`backup/` dir is an open question below.)

### Logs: allowlisted, read-only tail
`GET /api/admin/logs` lists the three known logs (key, filename, size, mtime). `GET /api/admin/logs/:name?lines=N` returns the **last N lines** (default 200, capped, e.g. 1000) of one log. `:name` is mapped through a fixed allowlist — `output → out.log`, `error → error.log`, `deploy → deploy.log` — so no user-supplied path ever reaches the filesystem (prevents path traversal). Reading the tail seeks from the end rather than loading whole files. *CLI parity:* `admin logs:list --json`, `admin logs:show <name> [--lines N]`.

### client-admin app shell
Mirror the other client workspaces (`@repo/admin`, React 19 + Vite + Tailwind + PWA, `@repo/auth`). An `AdminGuard` wraps `AuthGuard`: once authenticated it checks `userId === 1`; if not, it renders an **Access Denied** view instead of the requested page. The shared `LoginPage` is reused with "Admin" branding; on successful login user 1 lands on the admin home (`/`). Port 6040, `admin.branam.us`, with the standard Caddyfile/deploy wiring.

## Risks / Trade-offs

- **Destructive restore overwrites live data.** → Require explicit `confirm: true`, run the existing migration-compatibility check, and take an automatic safety backup immediately before restoring.
- **Path traversal via log/backup names.** → Fixed allowlist for logs; backup names validated against the set returned by the list endpoint (no raw paths from the client).
- **Backups contain sensitive data (bcrypt password hashes).** → `backup/` is written server-side only, git-ignored, and reachable only by user 1; no browser download in scope.
- **`userId === 1` is a hardcoded convention.** → Centralized in one middleware; documented; swappable for a flag later without touching routes.
- **Large log files.** → Tail the last N lines with a cap rather than returning whole files.
- **Removing the time-app deploy button is cross-app.** → Ship the `client-time` rebuild together with the backend route removal so there's no window where the button calls a missing endpoint.

## Migration Plan

Additive for the new app and routes; the only removals are `POST /api/deploy/trigger` and the time-app deploy button, deployed together. Add `client-admin` to workspaces, `build:admin`, and the `admin.branam.us` / port 6040 entries in Caddyfile, Caddyfile.local, server-deploy.sh, dev-local.sh. Add `backup/` to `.gitignore`. No database migration (no schema changes). Rollback: revert the change; restore's safety backup covers an erroneous restore.

## Open Questions

- **Unify `exports/` and `backup/`?** Should the legacy `db:export`/`db:import` scripts be re-pointed onto the shared module and `backup/` directory, or stay independent for the dev workflow? (Leaning: re-point later; keep both working now.)
- **Safety-backup-before-restore** default on always, or opt-out via a flag?
- **Log filtering** — is plain tail enough, or do we want level/substring filtering and pagination later?
- **Backup retention** — prune old backups automatically, or leave manual?
