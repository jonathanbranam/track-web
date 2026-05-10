## Why

Users browsing the catalog want to quickly identify who made a title — director and lead actors — without leaving the list. When a name rings a bell, they want to see the full cast to confirm it before deciding to watch or add to their watchlist.

## What Changes

- Add director + top 2–3 billed actors to the existing inline detail panel (first expand level)
- Add a second expand level inside the panel — tapping "Full cast" reveals all cached cast members (up to 30) returned from the TMDB import
- Read cast data from the `people` and `title_cast` tables that the `store-tmdb-cast` change populates
- No new API endpoints; cast data is already stored locally

## Capabilities

### New Capabilities
- `cast-preview-in-detail-panel`: Director and top 2–3 actors shown in the inline detail panel; includes a "Full cast" affordance that expands a secondary panel listing all cached cast members

### Modified Capabilities
- `inline-movie-details`: Detail panel requirements extended to include cast preview and the full-cast secondary expansion; the `/api/watch/movies/:movieId` and `/api/watch/tv/:seriesId` detail endpoints must include cast fields in their response

## Impact

- **API**: Movie and TV series detail endpoints extended to return `director` (name string or null) and `cast` (array of `{ name, billingOrder }`) from the `people` / `title_cast` tables
- **Frontend**: `inline-movie-details` component updated to render cast preview row and full-cast toggle; no new pages
- **Data dependency**: Requires `store-tmdb-cast` change to be applied first; titles imported before that change will show no cast (graceful omission)
