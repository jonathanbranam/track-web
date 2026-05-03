## Why

The time tracking app is named "tracker" throughout its codebase (directory,
package name, API routes, database values) but is served at `time.branam.us` and
referred to as the "time" app. Aligning the internal name with the public-facing
identity removes the inconsistency. The entire suite of applications are
"trackers" for various things, and this tracker is for time in particular.

## What Changes

- Rename `client-tracker/` directory to `client-time/`
- Rename npm package `@repo/tracker` → `@repo/time`
- Rename build script `build:tracker` → `build:time` and update all references
- Change API route prefix `/api/tracker/` → `/api/time/`
- **BREAKING**: Migrate existing database rows from `app_id = 'tracker'` to `app_id = 'time'` via a new inline migration
- Change `app_id` default value in schema from `'tracker'` to `'time'`
- Update all hardcoded `'tracker'` string literals in backend repositories, routes, and tests
- Update `Caddyfile` static root path from `client-tracker/dist` to `client-time/dist`
- Update `server-deploy.sh` and `CLAUDE.md` references

## Capabilities

### New Capabilities
_(none — this is a pure rename refactor)_

### Modified Capabilities
- `multi-app-hosting`: Scenario examples reference `build:tracker`, `client-tracker/dist/`, and `/api/tracker/entries` — all must be updated to reflect the new `time` names

## Impact

- **Directories**: `client-tracker/` renamed to `client-time/`
- **Backend**: `src/app.ts`, `src/db.ts`, `src/routes/entries.ts`, `src/routes/entries.test.ts`, `src/repositories/sqlite/entry.repository.ts`
- **Frontend**: `client-time/src/api.ts`, `client-time/package.json`
- **Config/infra**: `package.json`, `package-lock.json` (regenerated), `Caddyfile`, `server-deploy.sh`
- **Database**: One-time `UPDATE time_entries SET app_id = 'time' WHERE app_id = 'tracker'` migration (data-destructive if rolled back)
- **Dependencies**: Any workspace package depending on `@repo/tracker` must be updated to `@repo/time`
