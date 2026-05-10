## Why

Adding a release year field to movies and TV series prepares the catalog for TMDB (The Movie Database) import, where year is a standard identifier used to disambiguate titles. Without it, imported titles can't be matched or displayed with accurate metadata.

## What Changes

- Add optional `release_year` integer column to the `movies` table
- Add optional `release_year` integer column to the `tv_series` table
- Expose `release_year` in movie and TV series API responses
- Accept optional `release_year` in `POST /api/watch/movies` and `PUT /api/watch/movies/:id`
- Accept optional `release_year` in `POST /api/watch/tv` and `PUT /api/watch/tv/:id`
- Add optional "Release Year" input to the Add Movie form in the UI
- Add optional "Release Year" input to the Add Series form in the UI
- Add optional "Release Year" input to the Edit Movie form in the UI
- Add optional "Release Year" input to the Edit Series form in the UI

## Capabilities

### New Capabilities
*(none — this change extends existing capabilities only)*

### Modified Capabilities
- `watch-catalog`: Adding `release_year` as an optional field for movies and TV series — affects add and update API requirements and UI form requirements for both types

## Impact

- **Database**: Two migrations (one per table) adding `release_year INTEGER` column, nullable
- **Backend**: `src/repositories/sqlite/watch.ts` (or equivalent) — read/write `release_year` for movies and TV series; API route handlers for movies and TV
- **Frontend**: `client-watch/src/` — Add and Edit forms for movies and TV series
- **Specs**: `openspec/specs/watch-catalog/spec.md` updated with release year requirements
