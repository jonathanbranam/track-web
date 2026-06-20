## Why

Admin-only functionality currently leaks into end-user interfaces: the deploy trigger lives as a button in the time app's nav bar (visible only to user 1, but shipped in everyone's bundle), and the rest of administration — backups, restores, user management, API tokens — is reachable only via the CLI on the server. A dedicated admin app, gated to the single owner account (user 1), gives these operations a proper home and removes admin concerns from the consumer apps.

## What Changes

- **New `client-admin` app** at `admin.branam.us` (dev port 6040), accessible **only to user 1**. After login, user 1 is redirected to the admin home; any other authenticated user sees an **"Access Denied"** screen instead of admin functionality.
- **Deploy** moves to the admin app behind a new `POST /api/admin/deploy` route (user-1-only, returns **202**). **BREAKING**: the old `POST /api/deploy/trigger` endpoint and the **Deploy button in the time app** (`client-time` nav bar + `api.deploy.trigger`) are **removed**. The GitHub auto-deploy webhook (`POST /api/deploy`) is unaffected.
- **Backup & restore**, fully compatible with the existing `exports/` mechanism — four operations: (1) **run the scheduled backup now** (the same rolling `exports/backup/` + git push as the cron `export-push.sh`); (2) **restore from the last scheduled backup** (`exports/backup/`); (3) **run a timestamped backup now** (`exports/export-<stamp>/`, shows the new folder name); (4) **restore from a timestamped backup**, choosing from the 10 most recent. Both restores require explicit confirmation and reuse the existing import + migration-compatibility check.
- **User management**: list users, add a user, remove a user, and change a user's password — via new user-1-only API routes (this behavior exists today only in the admin CLI).
- **API tokens**: a management page in the admin app to create, list, and revoke API tokens, consuming the existing `/api/auth/tokens` endpoints.
- **Server logs**: a page to view the server's log files — the **output** log (`logs/out.log`), the **error** log (`logs/error.log`), and the **deploy** log (`logs/deploy.log`) — read-only, showing the most recent lines, via new user-1-only routes.

## Capabilities

### New Capabilities

- `admin-app-shell`: The `client-admin` workspace — an auth-gated React 19 + Vite + Tailwind + PWA app at `admin.branam.us` restricted to user 1 (login redirects user 1 to the admin home; other users see "Access Denied"), its nav/layout, the API-tokens management page (consuming existing `/api/auth/tokens`), and the deployment wiring required for a new client app.
- `admin-deploy`: A user-1-only `POST /api/admin/deploy` route that triggers a server deploy and returns 202, plus the admin UI control. Replaces the removed `POST /api/deploy/trigger` endpoint and the time-app deploy button.
- `admin-backup-restore`: User-1-only routes that wrap the existing `exports/` backup mechanism — run the scheduled backup (`export-push.sh`: rolling `exports/backup/` + git push), restore from the last scheduled backup, run a timestamped backup (`exports/export-<stamp>/`), list the 10 most recent timestamped backups, and restore from a selected one (confirmed; reuses the import + migration-compatibility check).
- `admin-users`: User-1-only routes to list, create, and delete users and change a user's password, surfaced as an admin UI.
- `admin-logs`: User-1-only routes to read the server's log files (output, error, and deploy logs), returning the most recent lines, surfaced as an admin log viewer with a manual Refresh button (and an optional auto-refresh poll).

### Modified Capabilities

- _None._ The new admin routes reuse `user-auth` session auth and the `api-tokens` endpoints without changing their requirements. The removed `/api/deploy/trigger` endpoint and the time-app deploy button are not described by any existing spec, so their removal is captured in `admin-deploy` and Impact rather than as a spec modification.

## Impact

- `client-admin/` — new workspace: `index.html`, `vite.config.ts` (port 6040, PWA, `/api` proxy), `package.json` (`@repo/admin`, depends on `@repo/auth`), `tsconfig*.json`, `src/` (App router + admin-only guard, home, deploy/backup/restore/users/tokens/logs pages, NavBar, "Access Denied" view).
- `src/routes/admin/` — new route module registered under `/api/admin/` in `app.ts`, with a user-1-only middleware: `deploy.ts`, `backups.ts`, `users.ts`, `logs.ts` (reads `logs/out.log`, `logs/error.log`, `logs/deploy.log`).
- `src/routes/deploy.ts` — remove the `POST /trigger` handler (and its session middleware); keep the GitHub webhook.
- `client-time/src/components/NavBar.tsx`, `client-time/src/api.ts` — remove the deploy button, its handler/state, and `api.deploy`.
- `src/lib/backup.ts` (new) — single shared module holding all export/import/list/push logic. `scripts/export-db.ts`, `scripts/import-db.ts`, and the `export-push` entry are refactored into thin wrappers over it; the admin API calls the same functions. No duplicated logic; the `exports/` layout and on-disk format are unchanged.
- `src/repositories/` — user create/delete/update-password reused by `admin-users` routes (already implemented for the CLI).
- Root `package.json` — add `client-admin` to `workspaces`; add `build:admin` and include it in `build`.
- `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh` — add `admin.branam.us` / port 6040 entries and a `build:admin` step.
- `openapi.yaml` — add `/api/admin/*` routes; remove `/api/deploy/trigger`.
- `llm-context.md` — add the admin app to the app inventory; note deploy moved out of the time app.
- No new backup directory: the existing `exports/` location (already a standalone git repo, git-ignored by the main repo) is reused as-is.
