## Context

`src/db.ts` previously contained a single `migrate()` function that ran all DDL as one idempotent block using `CREATE TABLE IF NOT EXISTS` and per-column `PRAGMA table_info` guards. This approach worked for a single environment but offered no audit trail: there was no way to know which schema version a given database was at, or to detect divergence between an export and the current schema.

PR #5 introduced Rails-style numbered migrations to fix this.

## Goals / Non-Goals

**Goals:**
- Record which migrations have been applied so each runs exactly once
- Provide a queryable "schema version" (the latest applied migration ID)
- Surface that version in exports so import can validate compatibility
- Support safe forward-only migration on every server start

**Non-Goals:**
- Down migrations / rollback (SQLite ALTER TABLE support is limited; rollback is out of scope)
- Migration CLI commands (migrations run automatically on startup)
- Multi-environment coordination or distributed locking

## Decisions

### Migration object shape

```ts
type Migration = {
  id: string                         // e.g. "0012_watch_events"
  up: (db: Database.Database) => void
}
export const MIGRATIONS: Migration[] = [ ... ]
```

IDs use a 4-digit zero-padded prefix so lexicographic order matches application order. The descriptive suffix makes diffs and error messages self-explanatory without looking up a changelog.

**Alternative considered:** separate `.sql` files per migration. Rejected — would require a file loader, complicate the TypeScript build, and lose the ability to use the `Database` API directly in complex migrations (e.g., read-modify-write for data migrations).

### schema_migrations tracking table

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id         TEXT NOT NULL PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

Created by `runMigrations()` on every startup (idempotent). Stores the migration ID as the primary key so duplicate-application is blocked at the DB level as a safety net.

### runMigrations() algorithm

1. `CREATE TABLE IF NOT EXISTS schema_migrations`
2. Query all applied IDs into a `Set<string>`
3. Iterate `MIGRATIONS` in order; for each not in the Set: call `up(db)`, insert ID into `schema_migrations`

Each migration's `up()` is called outside an explicit transaction (the migration itself manages its own transaction if needed). The ID is recorded immediately after `up()` completes, so a crash mid-migration leaves the ID unrecorded and the migration will re-run on next start — `up()` functions must be idempotent or use `IF NOT EXISTS` guards where applicable.

**Alternative considered:** wrapping the entire runner in one transaction. Rejected — a failing migration would roll back all previous ones, leaving the DB in a state that would re-run already-applied work.

### getLatestMigration()

```ts
export function getLatestMigration(db: Database.Database): string | null {
  try {
    const row = db.prepare('SELECT id FROM schema_migrations ORDER BY id DESC LIMIT 1').get()
    return row?.id ?? null
  } catch { return null }
}
```

Returns `null` on error to handle databases that predate migration tracking (the `schema_migrations` table won't exist). This makes the function safe to call during export even on old DBs.

### Export integration

`export-db.ts` calls `getLatestMigration()` and writes the result as `latestMigration` in `summary.json`. `null` is serialized as-is; importers treat a missing or null field as a pre-tracking export.

### Import compatibility check

`import-db.ts` compares `summary.latestMigration` (from the export) against `getLatestMigration(currentDb)`:

| Export | Current | Outcome |
|--------|---------|---------|
| matches | — | Proceed |
| known ID | known ID (different) | Error with index-based diff showing which migrations are ahead/behind |
| null / missing | any | Error with plain labels (pre-tracking export) |
| any | any | `--force` flag → warn and proceed |

The index-based diff uses `MIGRATIONS.findIndex()` to compute ordinal positions, making it easy to read: "DB is 2 migration(s) ahead of the export."

## Risks / Trade-offs

**Re-run on crash mid-migration** → each `up()` must be idempotent (use `IF NOT EXISTS`, `IF col NOT IN …`, etc.). Existing migrations already follow this pattern; new migrations must do the same.

**Lexicographic ID ordering** → IDs with more than 9999 entries would break ordering. Extremely unlikely at this scale.

**No down migrations** → a bad migration requires manual SQLite intervention to fix. Mitigation: test migrations against a dev DB before merging; keep migrations small and focused.

**Pre-tracking exports** → existing exports without `latestMigration` will always trigger a mismatch warning. `--force` is required to import them. Mitigation: re-export from a migrated DB after upgrading.

## Migration Plan

Already deployed in PR #5. On first server start after the upgrade:
1. `runMigrations()` creates `schema_migrations`
2. All 12 migrations are applied (or skipped if their DDL is already present via the old `IF NOT EXISTS` guards)
3. `schema_migrations` is populated; future starts skip all existing IDs

No manual intervention required. Rollback: revert to the previous `db.ts` commit; the `schema_migrations` table will be ignored (it doesn't affect app behavior).

### Adding future migrations

1. Append a new object to `MIGRATIONS` in `src/db.ts`:
   ```ts
   {
     id: '0013_<descriptive_name>',
     up: (db) => { db.exec(`...`) },
   }
   ```
2. If a new table is added, update `TABLE_NAMES` in the same file.
3. The runner applies it on next server start.
