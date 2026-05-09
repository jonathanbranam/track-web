## Why

The TV series catalog currently only supports title and streaming platform in the add form and has no edit capability, while the movie catalog supports full metadata (runtime, description, genre tags) and in-place editing. This change brings TV series to feature parity with movies.

## What Changes

- Add `description` column to the `tv_series` database table (migration)
- Add `season_count` column to the `tv_series` database table (migration)
- Expose `season_count` in the TV series backend routes (POST/PUT validators and repository)
- Add `season_count` to the `TvSeries` TypeScript interface in `client-watch/src/api.ts`
- Include `season_count` in the TV catalog add and edit forms
- Expose `description` in the TV series backend routes (POST/PUT validators and repository)
- Add `description` to the `TvSeries` TypeScript interface in `client-watch/src/api.ts`
- Expand the TV catalog add form to include `episodeRuntimeMinutes`, `description`, and genre tag toggles
- Add in-place edit capability to `TvCatalogPage` with the same fields (title, streaming, episodeRuntimeMinutes, description, genre tags), following the exact pattern of `MoviesCatalogPage`

## Capabilities

### New Capabilities

None — no new API capabilities are introduced; this change adds a field to an existing resource and extends the UI.

### Modified Capabilities

- `watch-catalog`: TV series CREATE and UPDATE requirements gain a `description` field. The UI requirements for adding and editing TV series also change to include all fields and edit-in-place support.

## Impact

- `src/db.ts` — add `description TEXT` and `season_count INTEGER` columns to `tv_series` via `ALTER TABLE ... ADD COLUMN` migrations
- `src/routes/watch/tv.ts` — add `season_count` to POST and PUT Zod validators
- `src/repositories/interfaces.ts` and `src/repositories/sqlite/` TV repository — include `season_count` in create/update data types and SQL
- `client-watch/src/api.ts` — add `seasonCount: number | null` to `TvSeries` interface
- `src/routes/watch/tv.ts` — add `description` to POST and PUT Zod validators
- `src/repositories/interfaces.ts` and `src/repositories/sqlite/` TV repository — include `description` in create/update data types and SQL
- `client-watch/src/api.ts` — add `description: string | null` to `TvSeries` interface
- `client-watch/src/pages/TvCatalogPage.tsx` — add runtime, description, tag toggle fields to add form; add full edit-in-place pattern mirroring `MoviesCatalogPage`
