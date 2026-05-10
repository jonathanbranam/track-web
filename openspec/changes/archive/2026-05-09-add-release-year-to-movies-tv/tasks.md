## 1. Database Migrations

- [x] 1.1 Add migration `0013_movies_release_year` to `src/db.ts` — `ALTER TABLE movies ADD COLUMN release_year INTEGER` (guard with `PRAGMA table_info` check)
- [x] 1.2 Add migration `0014_tv_series_release_year` to `src/db.ts` — `ALTER TABLE tv_series ADD COLUMN release_year INTEGER` (guard with `PRAGMA table_info` check)

## 2. Movie Repository

- [x] 2.1 Update `src/repositories/sqlite/movie.repository.ts` — include `release_year` in SELECT queries and map it to `releaseYear` in the returned object
- [x] 2.2 Update `createMovie` in movie repository to accept and write `releaseYear`
- [x] 2.3 Update `updateMovie` in movie repository to accept and write `releaseYear` (including null to clear)

## 3. TV Repository

- [x] 3.1 Update `src/repositories/sqlite/tv.repository.ts` — include `release_year` in SELECT queries and map it to `releaseYear` in the returned object
- [x] 3.2 Update `createTvSeries` in TV repository to accept and write `releaseYear`
- [x] 3.3 Update `updateTvSeries` in TV repository to accept and write `releaseYear` (including null to clear)

## 4. API Routes

- [x] 4.1 Update `src/routes/watch/movies.ts` — accept optional `releaseYear` in `POST /api/watch/movies` body and pass to repository
- [x] 4.2 Update `src/routes/watch/movies.ts` — accept optional `releaseYear` in `PUT /api/watch/movies/:id` body and pass to repository
- [x] 4.3 Update `src/routes/watch/tv.ts` — accept optional `releaseYear` in `POST /api/watch/tv` body and pass to repository
- [x] 4.4 Update `src/routes/watch/tv.ts` — accept optional `releaseYear` in `PUT /api/watch/tv/:id` body and pass to repository

## 5. Admin CLI

- [x] 5.1 Update `scripts/admin.ts` — add `--release-year` flag to the `add-movie` command
- [x] 5.2 Update `scripts/admin.ts` — add `--release-year` flag to the `update-movie` command; include `releaseYear` in `get-movie` and list output
- [x] 5.3 Update `scripts/admin.ts` — add `--release-year` flag to the `add-tv` (or equivalent) command
- [x] 5.4 Update `scripts/admin.ts` — add `--release-year` flag to the `update-tv` command; include `releaseYear` in `get-tv` and list output

## 6. Movie UI — Add Form

- [x] 6.1 Add "Release Year" numeric input to the Add Movie form in `client-watch/src/` (after streaming, before description)
- [x] 6.2 Parse the release year field as integer (null if empty/non-numeric) and include `releaseYear` in the `POST /api/watch/movies` payload

## 7. Movie UI — Edit Form

- [x] 7.1 Add "Release Year" numeric input to the Edit Movie form, pre-populated from the movie's current `releaseYear`
- [x] 7.2 Include `releaseYear` in the `PUT /api/watch/movies/:id` payload on save

## 8. TV UI — Add Form

- [x] 8.1 Add "Release Year" numeric input to the Add Series form in `client-watch/src/` (after season count, before description)
- [x] 8.2 Parse the release year field as integer (null if empty/non-numeric) and include `releaseYear` in the `POST /api/watch/tv` payload

## 9. TV UI — Edit Form

- [x] 9.1 Add "Release Year" numeric input to the Edit Series form, pre-populated from the series' current `releaseYear`
- [x] 9.2 Include `releaseYear` in the `PUT /api/watch/tv/:id` payload on save

## 10. Build & Verify

- [x] 10.1 Run `npm run build:watch` and confirm zero TypeScript errors
- [x] 10.2 Run `npm run build:server` and confirm zero TypeScript errors
- [x] 10.3 Smoke test: add a movie with a release year via the UI and verify it persists and displays correctly
- [x] 10.4 Smoke test: add a TV series with a release year via the UI and verify it persists and displays correctly
