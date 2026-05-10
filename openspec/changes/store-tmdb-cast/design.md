## Context

The TMDB credits endpoint (`GET /3/movie/{id}/credits` and `GET /3/tv/{id}/credits`) returns director and cast data for any title. The import route in `src/routes/watch/external.ts` already makes a follow-up TMDB fetch during import (for runtime/season count), so adding a credits fetch fits the existing pattern. The import handler currently only creates the title row and resolves genre tags — no cast data is stored.

The codebase uses a repository pattern: interfaces in `src/repositories/interfaces.ts`, SQLite implementations in `src/repositories/sqlite/`. Two new tables are needed: `people` (person identity) and a pair of join tables (`movie_cast`, `tv_cast`) linking people to titles with role and billing order.

## Goals / Non-Goals

**Goals:**
- Store director and top 30 cast members (by billing order) for every TMDB-imported title
- Upsert people by TMDB person ID so reimporting a title does not create duplicate person rows
- Replace cast rows for a title on reimport (idempotent)
- Expose cast data via a new repository interface consumed by the import route
- Provide an admin CLI command to view cast for a title

**Non-Goals:**
- API endpoints to return cast to the client (future change)
- UI to display cast (future change)
- Fetching/storing cast for titles already in the catalog before this change
- Caching the credits API response
- Storing crew members other than director

## Decisions

### Separate `movie_cast` and `tv_cast` tables instead of a single polymorphic table

A single `title_cast(person_id, title_type, title_id, ...)` table can't enforce referential integrity since SQLite foreign keys require a concrete table. Two typed join tables (`movie_cast`, `tv_cast`) each carry a proper FK to `movies` or `tv_series`. This matches the existing pattern (`movie_tags`/`tv_series_tags`) and is unambiguous to query.

**Alternative considered:** One table with nullable `movie_id` / `series_id` columns. Rejected — allows invalid rows where both or neither are set, and makes queries noisier.

### Upsert people by `tmdb_person_id`

People are identified by TMDB's person ID, not by name. Names can change (credited differently across titles); TMDB person IDs are stable. `INSERT OR IGNORE INTO people(name, tmdb_person_id) VALUES (?, ?)` followed by `SELECT id FROM people WHERE tmdb_person_id = ?` gives a reliable upsert with a single unique constraint on `tmdb_person_id`.

### Replace cast on reimport via DELETE + INSERT

On import, delete all existing `movie_cast` (or `tv_cast`) rows for the title before inserting the new set. This avoids accumulating stale rows and handles billing-order changes. The operation runs in a transaction with the insert.

**Alternative considered:** `INSERT OR REPLACE`. Rejected — requires the row to have a unique constraint covering all meaningful columns, which is complex here (a person can't appear twice in the same title's cast anyway, so the gain is minimal vs. the DELETE approach's clarity).

### Credits fetch is best-effort in the import handler

The import already wraps the TMDB details fetch in a try-catch and proceeds with cached values on failure. Credits fetch follows the same pattern: if the credits endpoint fails, the title is still created — it just won't have cast data. This prevents a flaky TMDB call from blocking a successful import.

### New `ICastRepository` interface

Matches the existing pattern. The interface exposes two methods: `upsertPerson` and `upsertTitleCast`. The import route receives the cast repo as a constructor argument alongside `movieRepo` and `tvRepo`.

## Risks / Trade-offs

- **Credits API latency**: Each import now makes one additional TMDB HTTP request. Since it is best-effort, a slow response won't block the import, but it adds latency on the happy path. → Mitigation: the credits fetch runs after genre resolution, so the title is ready to return regardless.
- **Reimport resets cast**: DELETE + INSERT means a reimport replaces the full cast list. If billing order changed in TMDB since the original import, the local data updates automatically — which is the desired behavior.
- **No credits cache**: The credits response is not cached in the file-based cache. For the typical single-import flow this is fine; high-volume batch importing would benefit from caching in a later change.

## Migration Plan

- Two new migrations in `db.ts` (`0016_people` and `0017_title_cast`), using `CREATE TABLE IF NOT EXISTS`
- `TABLE_NAMES` updated to include `people`, `movie_cast`, `tv_cast`
- No changes to existing tables; no data migration needed
- Rollback: drop the new tables (existing behavior unchanged)

## Open Questions

- None — scope is fully bounded to storage only.
