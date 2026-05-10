## Context

The `movies` and `tv_series` tables were created in migrations `0007` and `0008`. Subsequent migrations (`0009`, `0010`) added columns via `ALTER TABLE`. The latest migration is `0012_watch_events`. The repository layer in `src/repositories/sqlite/watch.ts` (or similar) maps DB rows to typed objects returned by the API. The watch client (`client-watch/`) renders Add and Edit forms for both movies and TV series.

TMDB uses release year as a primary disambiguator — two movies with identical titles (e.g., two remakes) are distinguished by year. Without a stored year, future import tooling would have no place to put this data.

## Goals / Non-Goals

**Goals:**
- Add `release_year` (optional integer) to `movies` and `tv_series` tables
- Expose `release_year` in all read responses for both types
- Accept `release_year` in create and update API requests for both types
- Surface `release_year` as an optional numeric input in all Add/Edit UI forms
- Add admin CLI commands for `release_year` on both movies and TV series

**Non-Goals:**
- Validation that `release_year` is a realistic year (e.g., 1888–present) — treated as a free integer
- Displaying or filtering by year in catalog browse/search views (future TMDB work)
- Backfilling existing rows with year data

## Decisions

**Two `ALTER TABLE` migrations over a schema rewrite**
Adding nullable `release_year INTEGER` columns via `ALTER TABLE` is the minimal, safe approach for an existing SQLite database with live data. Migrations `0013_movies_release_year` and `0014_tv_series_release_year` follow the pattern established by `0009` and `0010`. No data migration is needed since the column is nullable.

**Integer type, no format constraint**
`release_year` is stored as `INTEGER` (4-digit year like `2024`). No CHECK constraint is added — the app is single-user and correctness is the caller's responsibility. This keeps the schema simple and matches how runtime/season_count fields are handled.

**Reuse existing form field pattern**
Both Add and Edit forms already handle optional numeric fields (runtime, season count). The `release_year` input follows the same pattern: numeric input, parsed with `parseInt` / treated as `null` if empty or non-numeric.

**Admin CLI**
Per project rules, every API operation must have an admin CLI command. `release_year` will be settable via the existing `update-movie` and `update-tv` commands (or new flags on them) and returned in `get-movie` / `get-tv` output.

## Risks / Trade-offs

- **SQLite `ALTER TABLE` is non-transactional per column add** → Mitigation: use `PRAGMA table_info` guard (same as migrations 0009/0010) to make the migration idempotent
- **UI form field ordering** → New field placement needs to be consistent across Add/Edit forms; add it after streaming platform and before description (natural metadata order)

## Migration Plan

1. Add migration `0013_movies_release_year`: `ALTER TABLE movies ADD COLUMN release_year INTEGER`
2. Add migration `0014_tv_series_release_year`: `ALTER TABLE tv_series ADD COLUMN release_year INTEGER`
3. Update repository read/write methods to include `release_year`
4. Update API route handlers to accept and return `release_year`
5. Update watch client Add/Edit forms for movies and TV series
6. Update admin CLI commands

Rollback: migrations are additive and nullable; removing the column is not supported in SQLite but the column being null causes no harm. No rollback strategy needed for single-user self-hosted app.

## Open Questions

*(none)*
