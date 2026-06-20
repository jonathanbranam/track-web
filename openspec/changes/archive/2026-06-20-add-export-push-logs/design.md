## Context

The admin Logs viewer (`admin-logs` capability) reads server logs from the app's `logs/` directory through a fixed allowlist in `src/routes/admin/logs.ts` — `output → out.log`, `error → error.log`, `deploy → deploy.log`. The front-end (`client-admin/src/pages/LogsPage.tsx`) hard-codes the same three keys in `LOG_KEYS` and renders one tab per key.

The scheduled backup cron job (`scripts/export-push.sh` → `db:export-push`) already appends its run output to `logs/export-push.log` (per the documented crontab in `setup.md` / `README.md`). That file lives in the very directory the viewer reads, but it is absent from the allowlist, so it can only be inspected over SSH.

## Goals / Non-Goals

**Goals:**
- Make the scheduled backup log viewable in the admin Logs page using the existing tail/refresh machinery.
- Keep server and client allowlists in lock-step.

**Non-Goals:**
- No change to backup logic, the cron command, or where the log is written.
- No new logging from the in-process admin-triggered backups (`/api/admin/backups/*` still returns JSON only) — that is a separate, larger concern.
- No new API routes or env vars.

## Decisions

- **Add one allowlist entry, key `backup` → `export-push.log`.** The server `LOGS` map and the client `LOG_KEYS` array each gain `backup`. Everything else (the `GET /api/admin/logs` listing, the `GET /api/admin/logs/:name` tail, line bounding, refresh, auto-refresh) already iterates over the allowlist/keys, so no other logic changes.
  - *Key name:* `backup` (UI tab "Backup") over `export-push`. The user-facing concept is "the backup log"; the filename is an implementation detail. Chosen per user direction.
  - *Filename:* `export-push.log` — matches the documented crontab redirect target in `setup.md:234` / `README.md:209`. The stale `/var/log/export-push.log` example in `scripts/export-push.sh:9` is not the convention and is not used here.
- **Tolerate a missing file.** The reader already returns empty content when a log file does not exist, so on servers where the cron job has not yet run (or redirects elsewhere) the tab simply shows `(empty)` rather than erroring.

## Risks / Trade-offs

- [The on-server crontab might redirect the backup log to a different path than `logs/export-push.log`] → The viewer reads only `logs/export-push.log`; if the operator pointed cron elsewhere the tab shows empty. Mitigation: the documented setup (`setup.md`) already standardizes on `logs/export-push.log`; aligning cron to it is an ops step, not a code change.
- [Allowlist drift between server and client] → Low impact (an unlisted client key just can't be selected; an unlisted server key 404s), but both files must be edited together. Mitigation: covered by the keep-in-sync note already implicit in the `admin-logs` spec and by the test asserting the new key.
