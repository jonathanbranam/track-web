## Why

The original `migrate()` function used `CREATE TABLE IF NOT EXISTS` and PRAGMA-based column checks throughout — a single idempotent block with no record of what had been applied. Every schema evolution required a new guard clause, making the code fragile, hard to audit, and impossible to diff across environments.

## What Changes

- Replace the monolithic `migrate()` body with an ordered `MIGRATIONS` array of typed `{ id, up }` objects (`0001_initial_schema` through `0012_watch_events`), each encapsulating one schema change
- Add a `schema_migrations` tracking table that records each applied migration ID and its applied timestamp
- Add `runMigrations()`: creates `schema_migrations` on first run, queries applied IDs, and skips any migration already recorded
- Add `getLatestMigration()`: returns the highest applied migration ID, or `null` on a fresh or pre-tracking database
- `scripts/export-db.ts`: include `latestMigration` in `summary.json`
- `scripts/import-db.ts`: compare the export's `latestMigration` against the live DB's; fail with a descriptive diff when mismatched; `--force` overrides the check

## Capabilities

### New Capabilities

_(none — this is internal database infrastructure with no new user-facing API or spec)_

### Modified Capabilities

_(none — no spec-level behavioral requirements changed)_

## Impact

- `src/db.ts` — rewritten migration engine; public API surface unchanged (`migrate()` is still the entry point, now delegates to `runMigrations()`)
- `scripts/export-db.ts` — `summary.json` gains a `latestMigration` field
- `scripts/import-db.ts` — adds migration compatibility check with `--force` bypass; pre-tracking exports (no `latestMigration` field) are flagged but importable with `--force`
