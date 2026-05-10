## Context

The `store-tmdb-cast` change added `people`, `movie_cast`, and `tv_cast` tables plus `ICastRepository.listCast(titleType, titleId)` — it returns up to 30 cast members (sorted by billing order) and the director. The inline detail panel (implemented in `MovieCard` and `TvSeriesCard`) already expands on title tap; the detail endpoints (`GET /api/watch/movies/:id`, `GET /api/watch/tv/:id`) return catalog fields but no cast. This change wires cast into the existing expand flow.

## Goals / Non-Goals

**Goals:**
- Extend the two detail endpoints to include `director` (name | null) and `cast` (array of `{ name, billingOrder }`) in their JSON responses
- Show director + top 3 billed actors in the first-level inline detail panel
- Offer a "Full cast" affordance in that panel that expands a second-level list of all cached cast members
- Provide an admin CLI command (`watch cast <movie|tv> <id>`) to query cast for any title

**Non-Goals:**
- Fetching cast for titles imported before `store-tmdb-cast` (graceful null)
- Searching/filtering by cast member
- Displaying headshots or TMDB person links
- Any changes to watchlist, event candidate, or edit flows

## Decisions

### Embed cast in the existing detail endpoint response, not a separate endpoint

Both `GET /api/watch/movies/:id` and `GET /api/watch/tv/:id` are already called when the inline panel opens for event candidates (per the `inline-movie-details` spec). Embedding cast in the same response adds zero extra round-trips. A dedicated `/cast` sub-endpoint would require a second fetch and more client state.

**Alternative considered:** `GET /api/watch/movies/:id/cast` as a lazy fetch triggered only when the user taps "Full cast". Rejected — the preview (top 3) is shown at first expand, so a fetch is needed at that point anyway. Sending the full array upfront costs negligible bandwidth (≤ 30 names).

### Pass `castRepo` into `createMoviesRouter` and `createTvRouter`

The two route factories currently take only their respective repos. Adding `castRepo` as a second argument keeps the same construction pattern as `createExternalRouter` and avoids a module-level singleton. The call sites in `app.ts` already inject repos; adding one more is trivial.

### Frontend: second-level expansion is local component state, not shared page state

The existing "at most one card expanded" rule applies to the first-level panel. The "Full cast" toggle is a sub-state within a card's own expanded detail panel — it doesn't need to coordinate with other cards. Local `useState` in `MovieCard` / `TvSeriesCard` handles it.

**Alternative considered:** Lifting the full-cast toggle into the page-level expanded state. Rejected — overcomplicates the existing state model for no benefit.

### Director displayed separately from actors

TMDB returns director in `crew` with `role: 'director'` and `billingOrder: 0` in the repository. Separating "Director: Name" from the actor list in the UI is clearer for the user and avoids the director appearing as "Actor #1". The frontend filters by `role` field.

## Risks / Trade-offs

- **Titles without cast data**: Any title imported before `store-tmdb-cast` will return `director: null, cast: []`. The UI must handle this gracefully — omit the cast section entirely rather than showing empty labels.
- **`castRepo` injection**: Introducing `castRepo` into the movie/TV routers couples those routes to a new dependency. If the cast tables are missing (e.g., running on an old DB without the migration), `listCast` will throw. → Mitigation: ensure `store-tmdb-cast` migration runs before this change is deployed; `db.ts` migrations are sequential and additive.
- **Response size**: Returning up to 30 names adds ~1–2 KB to detail responses. Acceptable for the use case.

## Migration Plan

- No DB schema changes (relies on tables from `store-tmdb-cast`)
- `store-tmdb-cast` must be applied first; this change's tasks should note that dependency
- Rollback: revert route and component changes; the cast tables remain but are unused

## Open Questions

- None — scope and data model are well-defined by the existing repository interface.
