## Why

The TMDB API already returns rich credits data (cast and crew) for every title we import, but we currently discard it. Storing director and top cast members at import time makes that data available for future browsing and catalog search features without requiring additional API calls later.

## What Changes

- Add a `people` table to the SQLite database: stores a person's name and their TMDB person ID (for deduplication across imports)
- Add a `title_cast` join table: links people to movies or TV series with their role type (`cast` or `director`) and billing order
- During `POST /api/watch/external/import`, make an additional TMDB credits fetch (`GET /3/movie/{id}/credits` or `GET /3/tv/{id}/credits`) and store the director (from `crew` where `job === "Director"`) and up to top 30 cast members (sorted by `cast.order`)
- Upsert people by TMDB person ID so reimporting a title does not create duplicate person rows
- No new API endpoints; no UI changes in this change

## Capabilities

### New Capabilities
- `watch-cast`: Database schema and storage logic for people and title cast roles — `people` table, `title_cast` join table, upsert-on-import behavior, and billing order tracking

### Modified Capabilities
- `tmdb-catalog-search`: The import requirement is extended — `POST /api/watch/external/import` must fetch credits from TMDB after creating the local title record and persist them via the new cast storage logic

## Impact

- **Database**: Two new tables (`people`, `title_cast`) added via inline migration in `db.ts`
- **TMDB import route**: `src/routes/watch-external.ts` (or similar) extended to call the TMDB credits endpoint and invoke cast storage after the movie/series row is created
- **Repository layer**: New repository interface and SQLite implementation for people and cast roles
- **TMDB API**: One additional API call per import (credits endpoint); not cached separately in this change
