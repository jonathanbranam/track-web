## Context

`MoviesCatalogPage.tsx` contains an inline "Add Movie" form that only collects `title` and `streaming`. The `api.movies.create` call already accepts `runtimeMinutes`, `description`, and `tagIds`, and `api.movies.update` supports all fields via `PUT /api/watch/movies/:id`. No backend changes are required for the UI expansion — this is purely surfacing what the API already offers.

The `tags` table (category `'genre'`) is created by the migration in `src/db.ts` but **never seeded** — the table is always empty on a fresh install or existing deployment. Genre tag selection in the form is only useful if tags exist, so this change also adds a seed migration.

## Goals / Non-Goals

**Goals:**
- Seed the `tags` table with a standard set of genre tags on startup (idempotent `INSERT OR IGNORE`)
- Add `runtimeMinutes`, `description`, and genre tag selection to the Add Movie inline form
- Add an edit flow so any catalog movie's metadata can be updated after the fact

**Non-Goals:**
- TV series editing (separate concern)
- Adding or creating new genre tags from within the movie form
- Paginated or virtualized tag lists

## Decisions

**Inline forms over modals or separate pages**
Both the add and edit forms will render inline (expanded within the page) rather than using a modal or navigating away. This is consistent with the existing add form pattern already in `MoviesCatalogPage` and avoids introducing a modal primitive that doesn't exist in the shared UI library yet.

**Edit form replaces the movie card in-place**
When the user taps "Edit" on a movie card, that card is replaced by an edit form pre-populated with the movie's current data. On save or cancel, the card is restored. This avoids a separate edit route while keeping the interaction local to the list item.

**Tag selection via toggle chips, not a `<select multiple>`**
Genre tags are already loaded into state as a flat array. Rendering them as toggleable `<Badge>` chips (active = filled violet, inactive = outlined) is consistent with the app's design language and works well on small touch screens. The selected tag IDs are tracked in local state and sent as `tagIds` on submit.

**Runtime as a text input, not a number spinner**
`<input type="number">` spinners are awkward on mobile. A plain text input with numeric keyboard hint (`inputMode="numeric"`) and a client-side parse to integer before submission is more usable and matches the app's existing pattern for numeric fields.

**Genre tag seed migration**
A new `db.exec` block is added to `src/db.ts` immediately after the `tags` table creation, using `INSERT OR IGNORE INTO tags (name, category) VALUES ...` so it is safe to run on existing databases that already have some tags. The migration runs on every server start (same pattern as all other migrations in this file).

Proposed genre tags (20 total — covers both movies and TV):

| Tag | Notes |
|---|---|
| Action | |
| Adventure | |
| Animation | |
| Anime | Distinct enough from Animation to warrant its own tag |
| Biography | Biopics and docudramas |
| Comedy | |
| Crime | |
| Documentary | |
| Drama | |
| Fantasy | |
| Historical | Period pieces |
| Horror | |
| Musical | |
| Mystery | |
| Romance | |
| Sci-Fi | |
| Sport | |
| Superhero | Common enough to separate from Action/Fantasy |
| Thriller | |
| Western | |

## Risks / Trade-offs

- **Stale tag list after add**: Tags loaded at page mount won't reflect new tags created in another session. Acceptable for now; a refresh resolves it.
- **In-place edit loses scroll position**: Replacing a card mid-list with a taller form shifts content. No mitigation needed — this is acceptable for a small catalog list.
- **No optimistic updates**: The list reloads after add/edit via the existing `load()` call. Adds a round-trip but keeps state simple.
