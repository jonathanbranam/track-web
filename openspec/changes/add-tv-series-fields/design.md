## Context

The TV series catalog was implemented without a `description` field (unlike movies), and the `TvCatalogPage` add form only exposes `title` and `streaming`. The `MoviesCatalogPage` has since been updated with full metadata fields (runtime, description, genre tags) and in-place editing. This change closes that gap by mirroring the movie catalog pattern exactly.

The `tv_series` table exists in production and has data, so the description column must be added via a safe `ALTER TABLE ... ADD COLUMN` migration.

## Goals / Non-Goals

**Goals:**
- Add `description` to the `tv_series` DB table and propagate through backend, API type, and UI
- Add `season_count` to the `tv_series` DB table, API, and UI create/edit forms
- Expand the TV catalog add form to include `episodeRuntimeMinutes`, `description`, and genre tag toggles
- Add in-place edit capability to `TvCatalogPage` matching `MoviesCatalogPage` exactly

**Non-Goals:**
- Season selection UI (a future change will use `season_count` to drive season picker)
- Per-episode counts (deferred indefinitely per original design)
- Any changes to the TV watchlist, watch events, or other TV routes

## Decisions

### 1. Description added via safe ALTER TABLE migration

`src/db.ts` already uses `ALTER TABLE ... ADD COLUMN` guarded by a column existence check for other tables (e.g. `groups.description`). The same pattern applies here:

```ts
if (!tvCols.some(c => c.name === 'description')) {
  db.exec(`ALTER TABLE tv_series ADD COLUMN description TEXT`)
}
if (!tvCols.some(c => c.name === 'season_count')) {
  db.exec(`ALTER TABLE tv_series ADD COLUMN season_count INTEGER`)
}
```

Both are safe to run against an existing database — SQLite fills new rows with NULL. `season_count` is a simple nullable integer — no constraints needed. A future change will use it to drive a season selection UI.

**Alternative considered**: `CREATE TABLE IF NOT EXISTS` with the column included. Rejected because the table already exists in production; the migration path is required.

### 2. No new routes — extend existing validators

`POST /api/watch/tv` and `PUT /api/watch/tv/:id` already accept `episodeRuntimeMinutes` and `tagIds`. Adding `description` is a one-line addition to each Zod schema and the repository create/update methods. No new routes or route structure changes needed.

### 3. UI mirrors MoviesCatalogPage exactly

`TvCatalogPage` will be refactored to match `MoviesCatalogPage` state-for-state: separate state variables for each field in both add and edit forms, `editingSeriesId` for in-place edit mode, `startEdit()` helper, and `toggleTag()` helpers. Only one series can be in edit mode at a time (same constraint as movies). No shared component abstraction is introduced — the two pages remain independent.

**Alternative considered**: Extract a shared `CatalogItemForm` component. Rejected because the two forms have minor differences (runtime label, field names) and the added abstraction complexity isn't justified for two instances.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| `ALTER TABLE` migration runs on every server start | Guarded by `PRAGMA table_info` column check — no-op if column exists |
| TV series added before this change have `description = NULL` | Correct behavior; description is optional |

## Migration Plan

1. Deploy server with updated `src/db.ts` — migration runs automatically on startup, adding `description TEXT` and `season_count INTEGER` to `tv_series`
2. Deploy updated frontend — new fields appear in the add/edit forms
3. No rollback concern: the column is nullable and ignored by the old frontend
