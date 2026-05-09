## 1. Database Migration

- [x] 1.1 In `src/db.ts`, read `tv_series` column list with `PRAGMA table_info(tv_series)` and add `ALTER TABLE tv_series ADD COLUMN description TEXT` if the column is absent
- [x] 1.2 In `src/db.ts`, add `ALTER TABLE tv_series ADD COLUMN season_count INTEGER` if the column is absent

## 2. Repository Interface

- [x] 2.1 Add `description: string | null` and `seasonCount: number | null` to the `TvSeries` interface in `src/repositories/interfaces.ts`
- [x] 2.2 Add `description?: string | null` and `seasonCount?: number | null` to the `createSeries` data parameter in `ITvRepository`
- [x] 2.3 Add `description?: string | null` and `seasonCount?: number | null` to the `updateSeries` data parameter in `ITvRepository`

## 3. Repository Implementation

- [x] 3.1 In the SQLite TV repository, update the row-mapping function to include `description` and `season_count` → `seasonCount`
- [x] 3.2 Update the `createSeries` INSERT statement to include `description` and `season_count` columns and bind the new values
- [x] 3.3 Update the `updateSeries` UPDATE statement to set `description` and `season_count` when provided

## 4. Backend Routes

- [x] 4.1 In `src/routes/watch/tv.ts`, add `description: z.string().nullable().optional()` and `seasonCount: z.number().int().positive().nullable().optional()` to the POST `/` Zod validator
- [x] 4.2 Add the same two fields to the PUT `/:id` Zod validator

## 5. API Type

- [x] 5.1 Add `description: string | null` and `seasonCount: number | null` to the `TvSeries` interface in `client-watch/src/api.ts`

## 6. UI — Add Form

- [x] 6.1 In `TvCatalogPage.tsx`, add state variables for `newRuntime`, `newSeasonCount`, `newDescription`, and `newTagIds`
- [x] 6.2 Update `handleAddSeries` to pass `episodeRuntimeMinutes`, `seasonCount`, `description`, and `tagIds` to `api.tv.create`; reset all new fields on success
- [x] 6.3 Add a `handleCancelAdd` function that resets all add-form state and closes the form
- [x] 6.4 Add `toggleNewTag` helper (toggle id in/out of `newTagIds`)
- [x] 6.5 Add episode runtime (numeric input), season count (numeric input), and description fields to the add form
- [x] 6.6 Add genre tag toggle buttons to the add form (same pattern as `MoviesCatalogPage`)
- [x] 6.7 Wire Cancel button to `handleCancelAdd`

## 7. UI — Edit In-Place

- [x] 7.1 Add state variables for `editingSeriesId`, `editTitle`, `editStreaming`, `editRuntime`, `editSeasonCount`, `editDescription`, and `editTagIds`
- [x] 7.2 Add `startEdit(s: TvSeries)` helper that sets all edit state from the series and sets `editingSeriesId`
- [x] 7.3 Add `toggleEditTag` helper (toggle id in/out of `editTagIds`)
- [x] 7.4 Add `handleEditSeries` submit handler that calls `api.tv.update`, clears `editingSeriesId`, and reloads
- [x] 7.5 In the series list, replace each `<li>` with a conditional: show the edit form when `editingSeriesId === s.id`, otherwise show the card
- [x] 7.6 Add an Edit button to the card view that calls `startEdit(s)`
- [x] 7.7 Build the edit form with title, streaming, episode runtime, season count, description, genre tag toggles, Cancel, and Save buttons — mirroring the add form layout
