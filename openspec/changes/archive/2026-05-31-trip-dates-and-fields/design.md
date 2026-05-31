## Context

The `trips` table currently stores only integer counts (`nights`, `full_days`) — no calendar dates. All subsequent phases (Days tab auto-generation, "Today" card, Info tab) require actual dates. This change adds `start_date`, `end_date`, and `info_markdown` as nullable columns so existing trips are unaffected, and threads them through the full stack: migration → types → Zod schemas → repository → API response → frontend types → Overview display.

## Goals / Non-Goals

**Goals:**
- Add `start_date TEXT`, `end_date TEXT`, and `info_markdown TEXT` nullable columns to `trips`
- Persist and return new fields through all create/update API paths
- Display formatted `startDate` / `endDate` on the Overview page when present
- Extend admin CLI `trips:create` and `trips:update` to accept the new fields

**Non-Goals:**
- Auto-generating `trip_days` records from the date range (Spec 4)
- Adding the `trip_members` table (Spec 2)
- Building the Info tab UI (Spec 3)
- Adding `packing_items` or any packing infrastructure (Spec 6)

## Decisions

### Use PRAGMA table_info guard for ALTER TABLE
SQLite has no `ADD COLUMN IF NOT EXISTS` syntax. The existing migration pattern (migrations 0002–0004, 0009–0010, 0013–0016) uses `PRAGMA table_info(...)` to check for column existence before running `ALTER TABLE`. This change follows the same pattern in a new migration `0020_trip_dates_and_info`.

**Alternative considered:** A separate migration version table with schema version integers — rejected because the project already uses the `schema_migrations` string-ID approach and adding a second versioning system would be inconsistent.

### Retain `nights` and `full_days`
The new date columns do not replace `nights` and `full_days`. Existing API consumers and the Overview display continue to work unchanged. The design doc explicitly notes these columns "can remain for display purposes or be derived."

### Date format on Overview: "Mon, Jun 3" via date-fns
`date-fns` is already a project dependency (used in `client-time`). Use `format(parseISO(date), 'EEE, MMM d')`. Since dates are stored as YYYY-MM-DD (no time component), parse with `parseISO` — no timezone conversion needed.

### `info_markdown` is stored and returned but not rendered in this spec
The Info tab UI is deferred to Spec 3. This change only threads `infoMarkdown` through the data layer so Spec 3 has nothing to plumb. The Overview page does not render it.

## Risks / Trade-offs

- **Risk:** Two existing migrations share the prefix `0019` (`0019_trips`, `0019_api_tokens`). → The migration system keys on the full string ID, so both have already applied successfully. The new migration uses `0020_trip_dates_and_info` to avoid collision.
- **Risk:** `start_date` / `end_date` are stored as plain `TEXT` with no DB-level format validation. → Validated at the API layer via Zod (`z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()`). The `YYYY-MM-DD` format sorts correctly as text, which is sufficient for the Days tab range queries.

## Migration Plan

1. Add migration `0020_trip_dates_and_info` to `src/db.ts` using `PRAGMA table_info(trips)` guards for each column.
2. Restart the server — `runMigrations` applies the new migration on startup.
3. No data backfill needed; new columns default to `NULL`.
4. Rollback: if the migration needs to be reverted, the columns remain but are null. No app logic depends on them being absent — removing the UI display and schema fields is sufficient to restore prior behavior without a destructive `DROP COLUMN`.
