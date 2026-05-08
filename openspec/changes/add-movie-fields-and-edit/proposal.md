## Why

The "Add Movie" form in the watch catalog only collects title and streaming platform, leaving runtime, description, and genre tags inaccessible at creation time. There is also no way to edit a movie definition after it's added. The backend API already supports all of these fields via `POST /api/watch/movies` and `PUT /api/watch/movies/:id` — only the UI is missing.

## What Changes

- Expand the "Add Movie" inline form in `MoviesCatalogPage` to include `runtimeMinutes`, `description`, and genre tag multi-select (using existing tags loaded from the API)
- Add an edit flow to `MoviesCatalogPage` that allows updating all movie fields (title, runtime, description, streaming, tags) for an existing catalog entry

## Capabilities

### New Capabilities

- `movie-catalog-add-fields`: Full-field movie creation UI — title, streaming, runtime, description, and genre tag selection in the Add Movie form
- `movie-catalog-edit`: Edit-movie UI — inline or modal form pre-populated with current movie data, submitting via `PUT /api/watch/movies/:id`

### Modified Capabilities

- `watch-catalog`: Requirements unchanged; the PUT and full-field POST scenarios are already specified — this change implements the missing UI coverage for those scenarios

## Impact

- `client-watch/src/pages/MoviesCatalogPage.tsx` — add fields to the Add form; add edit trigger and edit form
- No backend, schema, or API changes required
- No new routes, packages, or deploy-config updates needed
