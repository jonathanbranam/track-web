## 1. Database Migrations

- [ ] 1.1 Add migration `0017_people` in `src/db.ts`: create `people` table with `id`, `name`, `tmdb_person_id` (unique, not null)
- [ ] 1.2 Add migration `0018_title_cast` in `src/db.ts`: create `movie_cast` and `tv_cast` tables with `id`, `person_id` (FK → people), `title_id` (FK → movies/tv_series), `role`, `billing_order`; add unique constraint on `(title_id, person_id)` for each table
- [ ] 1.3 Update `TABLE_NAMES` in `src/db.ts` to include `people`, `movie_cast`, `tv_cast`

## 2. Repository Interface

- [ ] 2.1 Add `Person`, `TitleCastEntry` types and `ICastRepository` interface to `src/repositories/interfaces.ts`; interface exposes `upsertPerson(name: string, tmdbPersonId: number): Person` and `upsertTitleCast(titleType: 'movie' | 'tv', titleId: number, entries: CastInput[]): void` (where `CastInput` has `personId`, `role`, `billingOrder`)

## 3. SQLite Cast Repository

- [ ] 3.1 Create `src/repositories/sqlite/cast.repository.ts` implementing `ICastRepository`
- [ ] 3.2 Implement `upsertPerson`: `INSERT OR IGNORE INTO people(name, tmdb_person_id) VALUES (?, ?)` then `SELECT id FROM people WHERE tmdb_person_id = ?`
- [ ] 3.3 Implement `upsertTitleCast`: in a transaction, `DELETE FROM movie_cast/tv_cast WHERE title_id = ?` then bulk-insert new rows

## 4. Wire Cast Repository into App

- [ ] 4.1 Instantiate `CastSqliteRepository` in `src/app.ts` (alongside movie/tv repos) and pass it to `createExternalRouter`

## 5. Extend Import Route

- [ ] 5.1 Update `createExternalRouter` signature in `src/routes/watch/external.ts` to accept `ICastRepository`
- [ ] 5.2 After creating the movie or series row, call `tmdbGet(/3/movie/{tmdbId}/credits or /3/tv/{tmdbId}/credits)` inside a try-catch
- [ ] 5.3 Parse credits response: find the director from `crew` where `job === "Director"`; take the first 30 entries from `cast` sorted by `cast.order`
- [ ] 5.4 For each person (director + cast), call `castRepo.upsertPerson(name, tmdbPersonId)` to get/create their `people` row
- [ ] 5.5 Call `castRepo.upsertTitleCast(type, titleId, entries)` with the resolved `personId`s, roles, and billing orders
- [ ] 5.6 Confirm that a credits fetch failure leaves the import response unchanged (best-effort try-catch)

## 6. Admin CLI Command

- [ ] 6.1 Add `watch:cast` command to `scripts/admin.ts` accepting `--id <title-id>` (required) and `--type movie|tv` (required)
- [ ] 6.2 Implement default table output: query `movie_cast`/`tv_cast` joined with `people`, print name, role, billing order
- [ ] 6.3 Add `--json` flag: output JSON array with `name`, `role`, `billingOrder`, `tmdbPersonId`
- [ ] 6.4 Return empty list (not error) when no cast rows exist for the title

## 7. Verification

- [ ] 7.1 Run `npm run build:server` and confirm zero TypeScript errors
