## 1. Backend: Genre Tag Seed

- [x] 1.1 Add `INSERT OR IGNORE INTO tags (name, category) VALUES ...` block in `src/db.ts` immediately after the `tags` table creation, seeding all 20 genre tags with `category = 'genre'`
- [x] 1.2 Start the server and verify the 20 tags are returned by `GET /api/watch/tags`

## 2. UI: Expand the Add Movie Form

- [x] 2.1 Add `newRuntime`, `newDescription`, and `newTagIds` state variables to `MoviesCatalogPage`
- [x] 2.2 Add a `TextInput` for runtime (`inputMode="numeric"`, placeholder "Runtime (min, optional)") to the Add Movie form
- [x] 2.3 Add a `TextInput` (or `<textarea>`) for description to the Add Movie form
- [x] 2.4 Render genre tag toggles below description — map over `tags`, render each as a `<Badge>` that fills violet when selected and is outlined when not; clicking toggles the ID in `newTagIds`
- [x] 2.5 Update `handleAddMovie` to pass `runtimeMinutes: parseInt(newRuntime) || null`, `description: newDescription || null`, and `tagIds: newTagIds` to `api.movies.create`
- [x] 2.6 Reset `newRuntime`, `newDescription`, and `newTagIds` on successful submit or cancel

## 3. UI: Movie Edit Flow

- [x] 3.1 Add `editingMovieId` state (number | null) to `MoviesCatalogPage`; add per-edit-form state: `editTitle`, `editStreaming`, `editRuntime`, `editDescription`, `editTagIds`
- [x] 3.2 Add an "Edit" button to each movie card that sets `editingMovieId` to that movie's ID and pre-populates the edit state from the movie's current data
- [x] 3.3 When `editingMovieId === m.id`, render an edit form in place of the movie card — same field layout as the Add form (title, streaming, runtime, description, tag toggles) pre-populated with current values
- [x] 3.4 Implement `handleEditMovie` that calls `api.movies.update(editingMovieId, { ... })` with all current edit state, then clears `editingMovieId` and calls `load()`
- [x] 3.5 Cancel button on the edit form sets `editingMovieId` to null with no API call
- [x] 3.6 Verify only one edit form is open at a time — activating Edit on a second movie closes the first (naturally handled by single `editingMovieId` state)

## 4. Manual Verification

- [x] 4.1 Add a movie using all fields; confirm it appears with tags and runtime in the catalog list
- [x] 4.2 Add a movie with title only; confirm it appears without metadata
- [x] 4.3 Edit a movie; change its title, streaming, runtime, description, and tags; confirm the card updates correctly
- [x] 4.4 Cancel an edit; confirm no changes were persisted
- [x] 4.5 Open two edit forms in sequence; confirm the first closes when the second opens

