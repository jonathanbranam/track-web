## Context

Movie and TV cards exist in five distinct contexts in `client-watch`: movie catalog (`MoviesCatalogPage`), TV catalog (`TvCatalogPage`), movie watchlist (`MoviesWatchlistPage`), TV watchlist (`TvWatchlistPage`), and the event candidate list (`EventDetailPage`). Each page inlines its own card JSX. Adding expand/collapse detail panels without extracting shared components would require duplicating the same interaction logic five times.

The `Movie` and `TvSeries` API types already include all catalog fields (`description`, `streaming`, `runtimeMinutes`, `episodeRuntimeMinutes`, `seasonCount`, `releaseYear`, `tags`). Catalog and watchlist list endpoints return these fully populated. Event candidate responses (`WatchEventCandidate`) carry only `movieTitle`, `movieReleaseYear`, `seriesTitle`, and `seriesReleaseYear` — full detail is not embedded.

## Goals / Non-Goals

**Goals:**
- Add an inline expand/collapse detail panel to movie and TV cards across all five contexts
- Guarantee at most one card is expanded at a time per page
- Show all available catalog fields in the expanded panel, adapting to which fields are present (description, streaming, runtime, seasons, release year)
- Reuse a shared card component so the interaction is implemented once
- No new backend endpoints; no new dependencies

**Non-Goals:**
- Editing from the expanded panel (the Edit affordance stays separate and unchanged)
- Persisting expanded state across navigation
- Eager pre-fetching of full details for event candidates

## Decisions

### Decision 1: Extract `MovieCard` and `TvSeriesCard` shared components

Extract two new components into `client-watch/src/components/MovieCard.tsx` and `TvSeriesCard.tsx`. Each accepts the full domain object (`Movie` / `TvSeries`), an `isExpanded` boolean, and an `onToggle` callback. The parent page tracks a single `expandedId: number | null` and passes it down.

**Alternatives considered:**
- Inline the expand logic in each page — rejected, duplicates state and JSX across five files and makes future changes to the interaction harder.
- A single generic `CatalogCard` component — rejected, movies and TV have different fields (runtime vs episode runtime vs season count) and the divergence makes a single generic component more complex than two focused ones.

### Decision 2: Parent-controlled `expandedId` state

Each page holds `const [expandedId, setExpandedId] = useState<number | null>(null)`. Tapping the title calls `onToggle(id)` which sets `expandedId` to that id, or back to `null` if the same card was already open. This ensures only one card is expanded at a time without requiring inter-component communication.

**Alternatives considered:**
- Self-contained expanded state per card — rejected, no clean mechanism to collapse a card when another opens without lifting state.

### Decision 3: Lazy fetch for event candidate detail

`WatchEventCandidate` does not embed full `Movie`/`TvSeries` objects, only titles and release years. When a candidate card is expanded, the component fetches `GET /api/watch/movies/:movieId` or `GET /api/watch/tv/:seriesId` on first expand and caches the result in local state. Subsequent toggles use the cached data.

**Alternatives considered:**
- Embed full movie/TV data in the `WatchEventCandidate` response (backend change) — possible but adds payload weight to every event detail load; the lazy approach only fetches when the user explicitly requests detail.
- Pre-fetch all candidate details when the event detail page loads — rejected, could be expensive for events with many candidates, and most users won't expand every candidate.

### Decision 4: Title as the expand tap target

The title text is wrapped in a `<button>` element with `cursor-pointer` styling. This provides an accessible interactive element without a separate icon. A small chevron icon (▾/▴) to the right of the title indicates expand state.

**Alternatives considered:**
- Full card tap-to-expand — rejected, cards in the catalog and event page contain other interactive elements (Edit button, vote buttons, Remove affordance) that must remain independently tappable.
- A dedicated expand icon button — keeps the tap target small; pairing it with the title keeps the affordance clear and makes it feel like tapping the title to "read more."

### Decision 5: Conditional render, no animation dependency

The detail panel is conditionally rendered (`{isExpanded && <div>...</div>}`) with a CSS `transition-all` applied to the card container. A `max-height` CSS trick is not used to avoid Tailwind's AOT limitations with arbitrary values. Simple show/hide is sufficient for a functional first pass; animation can be added later if needed.

## Risks / Trade-offs

- **Fetch latency on event candidate expand** — the lazy GET introduces a spinner on first expand. Mitigation: show a small inline spinner within the card; the request is fast (single DB lookup).
- **Expanded state lost on navigation** — if the user taps back and returns, the list resets with all cards collapsed. Acceptable for this interaction; no mitigation needed.
- **Five card contexts, two components** — `MovieCard` and `TvSeriesCard` will be used in contexts with different action affordances (Edit+Watchlist in catalog, State+Remove in watchlist, Vote+Remove in events). Action affordances are passed as render props or children so the shared component stays generic.
