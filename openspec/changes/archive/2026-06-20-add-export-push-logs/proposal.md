## Why

The scheduled backup (the cron `export-push.sh` job) already records each run to `logs/export-push.log` — lines like `Running export-push at …`, `No changes in backup, skipping push.`, and `Backup pushed.`. That file sits in the same `logs/` directory the admin Logs viewer already reads from, but it is not in the viewer's allowlist, so confirming whether nightly backups are running still requires SSHing into the server.

## What Changes

- Add a fourth viewable log to the admin Logs viewer — the export-push (scheduled backup) log — exposed under a new allowlist key (`backup → export-push.log`), alongside the existing `output`, `error`, and `deploy` logs.
- The admin app's Logs page lists and renders the new log using the existing tail/refresh/auto-refresh behavior; no new UI controls are introduced.
- No change to backup logic or to where the cron job writes — the file already exists in the watched `logs/` directory; this change only makes it viewable.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `admin-logs`: the set of viewable logs (and the `:name` allowlist) gains the export-push / scheduled-backup log; the list and tail requirements now cover four logs instead of three.

## Impact

- `src/routes/admin/logs.ts` — add `backup: 'export-push.log'` to the `LOGS` allowlist.
- `client-admin/src/pages/LogsPage.tsx` — add `backup` to `LOG_KEYS`.
- `src/routes/admin/admin.test.ts` — extend log-viewer coverage to the new key.
- `openspec/specs/admin-logs/spec.md` — list and allowlist requirements updated.
- No new env vars, dependencies, or API routes; the `GET /api/admin/logs` and `GET /api/admin/logs/:name` routes are unchanged in shape.
