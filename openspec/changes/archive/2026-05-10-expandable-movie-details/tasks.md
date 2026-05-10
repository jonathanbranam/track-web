## 1. Shared Components

- [x] 1.1 Create `client-watch/src/components/MovieCard.tsx` — accepts `movie: Movie`, `isExpanded: boolean`, `onToggle: () => void`, and `actions?: React.ReactNode` for context-specific affordances
- [x] 1.2 Create `client-watch/src/components/TvSeriesCard.tsx` — accepts `series: TvSeries`, `isExpanded: boolean`, `onToggle: () => void`, and `actions?: React.ReactNode`
- [x] 1.3 Implement the expanded detail panel inside `MovieCard`: show description, streaming, and runtime when non-null; omit null fields; add chevron indicator to title button
- [x] 1.4 Implement the expanded detail panel inside `TvSeriesCard`: show description, streaming, episode runtime, and season count when non-null; add chevron indicator
- [x] 1.5 Ensure title is wrapped in a `<button>` element with appropriate accessible label

## 2. Movie Catalog Page

- [x] 2.1 Add `expandedId: number | null` state to `MoviesCatalogPage`
- [x] 2.2 Replace inline movie card JSX with `<MovieCard>`, passing `isExpanded`, `onToggle`, and the existing Edit + "+ Watchlist" buttons as `actions`
- [x] 2.3 Verify opening one card collapses any previously open card
- [x] 2.4 Verify Edit and "+ Watchlist" buttons remain independently tappable when a card is expanded

## 3. TV Catalog Page

- [x] 3.1 Add `expandedId: number | null` state to `TvCatalogPage`
- [x] 3.2 Replace inline TV series card JSX with `<TvSeriesCard>`, passing `isExpanded`, `onToggle`, and the Edit button as `actions`
- [x] 3.3 Verify one-at-a-time behavior and that Edit remains independently tappable

## 4. Movie Watchlist Page

- [x] 4.1 Add `expandedId: number | null` state to `MoviesWatchlistPage`
- [x] 4.2 Replace inline movie card JSX with `<MovieCard>`, passing the state selector and Remove button as `actions`
- [x] 4.3 Verify state selector and Remove button remain functional when expanded

## 5. TV Watchlist Page

- [x] 5.1 Add `expandedId: number | null` state to `TvWatchlistPage`
- [x] 5.2 Replace inline TV series card JSX with `<TvSeriesCard>`, passing the state selector, episode progress controls, and Remove button as `actions`
- [x] 5.3 Verify state selector, episode progress, and Remove button remain functional when expanded

## 6. Event Candidate Cards

- [x] 6.1 Add `expandedCandidateId: number | null` state to `EventDetailPage`
- [x] 6.2 Add a `detailCache: Record<number, Movie | TvSeries>` ref (or state) to `EventDetailPage` for caching fetched detail
- [x] 6.3 On first expand of a candidate, call `GET /api/watch/movies/:movieId` or `GET /api/watch/tv/:seriesId` based on `itemType`; store result in cache
- [x] 6.4 Show an inline loading indicator within the candidate card while the detail fetch is in progress
- [x] 6.5 On subsequent expand, use cached result without a new network request
- [x] 6.6 Render the fetched detail (description, streaming, runtime/seasons) in the expanded panel within the candidate card
- [x] 6.7 Verify vote buttons and remove affordance remain independently tappable when a candidate card is expanded

## 7. Build Verification

- [x] 7.1 Run `npm run build:watch` and confirm zero TypeScript errors in `client-watch`
