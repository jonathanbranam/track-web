## 1. Admin API foundation

- [ ] 1.1 Add a `requireAdmin` middleware (session auth + `userId === 1`, else `403`; unauthenticated → `401`) in `src/middleware/` (or alongside `auth.ts`)
- [ ] 1.2 Create `src/routes/admin/index.ts` that applies `requireAdmin` and mounts the sub-routers; register it under `/api/admin` in `src/app.ts`

## 2. Shared backup module (no duplicated logic)

- [ ] 2.1 Create `src/lib/backup.ts` with typed functions: `exportTimestamped()` → `{ folder }`, `exportRolling()` → `{ folder, changed }`, `listTimestampedBackups(limit)` → `string[]`, `restoreFromFolder(folder)` (migration-compat check; in-process atomic restore via the live `getDb()` in a single transaction), and `scheduledBackupAndPush()` → `{ folder, pushed }` (rolling export + `git` commit/push in `exports/` only when changed)
- [ ] 2.2 Refactor `scripts/export-db.ts` and `scripts/import-db.ts` into thin argv wrappers that call `src/lib/backup.ts` (preserve current CLI flags and output)
- [ ] 2.3 Provide an `export-push` entry that calls `scheduledBackupAndPush()` and keep the `npm run db:export-push` interface working (port `scripts/export-push.sh`'s git logic into the module; the cron command is unchanged)
- [ ] 2.4 Confirm the `exports/` on-disk format (per-table JSON/CSV, `schema.json`, `summary.json`) and folder names (`exports/backup/`, `exports/export-<UTC-stamp>/`) are byte-for-byte compatible with the previous scripts

## 3. Admin deploy

- [ ] 3.1 Extract `runDeploy()` from `src/routes/deploy.ts` into a small shared module callable by both the webhook and the admin route
- [ ] 3.2 Create `src/routes/admin/deploy.ts` — `POST /api/admin/deploy` (under `requireAdmin`) runs `runDeploy('admin')` and returns `202`
- [ ] 3.3 Remove `POST /api/deploy/trigger` and its session middleware from `src/routes/deploy.ts`; keep the GitHub webhook (`POST /api/deploy`) unchanged

## 4. Admin backups/restore routes

- [ ] 4.1 `src/routes/admin/backups.ts`: `POST /api/admin/backups/scheduled` → `scheduledBackupAndPush()`, returns `{ folder, pushed }`
- [ ] 4.2 `POST /api/admin/backups/scheduled/restore` → requires `confirm: true`; restores from `exports/backup/`; `404`/reject if it doesn't exist
- [ ] 4.3 `POST /api/admin/backups/timestamped` → `exportTimestamped()`, returns the new folder name
- [ ] 4.4 `GET /api/admin/backups/timestamped` → `listTimestampedBackups(10)` (10 most recent, newest first)
- [ ] 4.5 `POST /api/admin/backups/timestamped/:name/restore` → validate `:name` against the listed set (reject unknown/path-like), require `confirm: true`, then restore

## 5. Admin users routes

- [ ] 5.1 `src/routes/admin/users.ts`: `GET /api/admin/users` (list), `POST /api/admin/users` (create from email/password/displayName, bcrypt hash, reject duplicate email)
- [ ] 5.2 `DELETE /api/admin/users/:id` (delete); change-password endpoint (e.g. `PUT /api/admin/users/:id/password`) — both reuse the existing `UserRepository`

## 6. Admin logs routes

- [ ] 6.1 `src/routes/admin/logs.ts`: `GET /api/admin/logs` lists the three logs with metadata via a fixed allowlist (`output→out.log`, `error→error.log`, `deploy→deploy.log`)
- [ ] 6.2 `GET /api/admin/logs/:name?lines=N` returns the last N lines (default 200, capped) by seeking from the end; reject any `:name` not in the allowlist (no filesystem path from the client)

## 7. Remove deploy UI from the time app

- [ ] 7.1 Remove the deploy button, its handler, and `deploying` state from `client-time/src/components/NavBar.tsx`
- [ ] 7.2 Remove `api.deploy` from `client-time/src/api.ts`

## 8. client-admin workspace scaffold

- [ ] 8.1 Create `client-admin/` (`index.html`, `tsconfig.json`, `tsconfig.app.json`, `package.json` name `@repo/admin`, deps `@repo/auth`/react/react-dom/react-router-dom, devDeps mirroring `client-play`)
- [ ] 8.2 Create `client-admin/vite.config.ts` (port 6040, PWA manifest "Admin", `/api` proxy to `localhost:3000`)
- [ ] 8.3 Add `client-admin` to the root `package.json` `workspaces`; add `"build:admin"` and include it in the `build` concurrently chain
- [ ] 8.4 Add admin icons under `client-admin/public/icons/`

## 9. client-admin app shell

- [ ] 9.1 `src/main.tsx`, `src/index.css` (Tailwind), `src/App.tsx` with React Router v7 + `AuthProvider`/`AuthGuard` from `@repo/auth`; reuse `LoginPage` with "Admin" branding (user 1 lands on `/`)
- [ ] 9.2 `AdminGuard` component: after auth, render children only when `userId === 1`; otherwise render an "Access Denied" view
- [ ] 9.3 `NavBar` linking the admin pages (Deploy, Backups, Users, Tokens, Logs)

## 10. client-admin pages

- [ ] 10.1 Deploy page — button → `POST /api/admin/deploy`; show success on 202
- [ ] 10.2 Backups page — "Run scheduled backup" and "Run timestamped backup" controls (show resulting folder/pushed status); restore section listing the last scheduled backup and the 10 most recent timestamped backups, each restore behind an explicit confirm
- [ ] 10.3 Users page — list users; add-user form; remove and change-password controls
- [ ] 10.4 Tokens page — create/list/revoke via existing `/api/auth/tokens`
- [ ] 10.5 Logs page — log selector (output/error/deploy), tail view, **manual Refresh** button, and an **auto-refresh** toggle (off by default, polls on an interval while on)

## 11. Deployment wiring

- [ ] 11.1 Add `admin.branam.us` handle block to `Caddyfile` (static `client-admin/dist`, `/api/*` reverse-proxied); run `caddy fmt --overwrite Caddyfile`
- [ ] 11.2 Add `admin-branam-us.duckdns.org:80 → localhost:6040` to `Caddyfile.local`; run `caddy fmt --overwrite Caddyfile.local`
- [ ] 11.3 Add a `build:admin` step to `server-deploy.sh`
- [ ] 11.4 Add a tmux pane running `npm run dev -w client-admin` to `dev-local.sh`

## 12. Docs

- [ ] 12.1 Update `openapi.yaml` — add `/api/admin/*` routes (deploy, backups scheduled/timestamped + restores, users, logs); remove `/api/deploy/trigger`
- [ ] 12.2 Update `llm-context.md` — add the admin app (`admin.branam.us`, user-1-only); note the deploy trigger moved out of the time app
- [ ] 12.3 Update `README.md` — document the admin app / `admin.branam.us` and that deploy now lives there (no new env vars; `db:export-push` interface unchanged)

## 13. Tests

- [ ] 13.1 Unit-test `src/lib/backup.ts` — timestamped + rolling export produce the expected folders/format; `listTimestampedBackups` returns the 10 most recent newest-first; `restoreFromFolder` round-trips (export → mutate → restore → data matches) and enforces the migration-compat check
- [ ] 13.2 API tests for `requireAdmin` — user 1 allowed, non-admin `403`, unauthenticated `401`
- [ ] 13.3 API tests — deploy returns `202`; backup endpoints (scheduled pushes when changed / skips when unchanged; timestamped returns folder name; list caps at 10); restores reject missing `confirm` and unknown `:name`
- [ ] 13.4 API tests — users CRUD (create, duplicate-email rejected, delete, change password) and logs (tail returns recent lines, line cap enforced, non-allowlisted name rejected)
- [ ] 13.5 Run `npm test` and confirm existing and new tests pass

## 14. Build & verify

- [ ] 14.1 Run `npm run build:admin` and `npm run build:time` (deploy button removed) and confirm zero TypeScript errors
- [ ] 14.2 Run `npm run build` (all clients + server) and confirm it completes with zero errors
- [ ] 14.3 Manually verify: login as user 1 → admin home; non-admin → Access Denied; deploy 202; scheduled + timestamped backup; restore (last scheduled and a chosen timestamp); user add/remove/password; logs view + refresh
