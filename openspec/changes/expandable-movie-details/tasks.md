## 1. Shared Components

- [ ] 1.1 Create `client-watch/src/components/MovieCard.tsx` — accepts `movie: Movie`, `isExpanded: boolean`, `onToggle: () => void`, and `actions?: React.ReactNode` for context-specific affordances
- [ ] 1.2 Create `client-watch/src/components/TvSeriesCard.tsx` — accepts `series: TvSeries`, `isExpanded: boolean`, `onToggle: () => void`, and `actions?: React.ReactNode`
- [ ] 1.3 Implement the expanded detail panel inside `MovieCard`: show description, streaming, and runtime when non-null; omit null fields; add chevron indicator to title button
- [ ] 1.4 Implement the expanded detail panel inside `TvSeriesCard`: show description, streaming, episode runtime, and season count when non-null; add chevron indicator
- [ ] 1.5 Ensure title is wrapped in a `<button>` element with appropriate accessible label

## 2. Movie Catalog Page

- [ ] 2.1 Add `expandedId: number | null` state to `MoviesCatalogPage`
- [ ] 2.2 Replace inline movie card JSX with `<MovieCard>`, passing `isExpanded`, `onToggle`, and the existing Edit + "+ Watchlist" buttons as `actions`
- [ ] 2.3 Verify opening one card collapses any previously open card
- [ ] 2.4 Verify Edit and "+ Watchlist" buttons remain independently tappable when a card is expanded

## 3. TV Catalog Page

- [ ] 3.1 Add `expandedId: number | null` state to `TvCatalogPage`
- [ ] 3.2 Replace inline TV series card JSX with `<TvSeriesCard>`, passing `isExpanded`, `onToggle`, and the Edit button as `actions`
- [ ] 3.3 Verify one-at-a-time behavior and that Edit remains independently tappable

## 4. Movie Watchlist Page

- [ ] 4.1 Add `expandedId: number | null` state to `MoviesWatchlistPage`
- [ ] 4.2 Replace inline movie card JSX with `<MovieCard>`, passing the state selector and Remove button as `actions`
- [ ] 4.3 Verify state selector and Remove button remain functional when expanded

## 5. TV Watchlist Page

- [ ] 5.1 Add `expandedId: number | null` state to `TvWatchlistPage`
- [ ] 5.2 Replace inline TV series card JSX with `<TvSeriesCard>`, passing the state selector, episode progress controls, and Remove button as `actions`
- [ ] 5.3 Verify state selector, episode progress, and Remove button remain functional when expanded

## 6. Event Candidate Cards

- [ ] 6.1 Add `expandedCandidateId: number | null` state to `EventDetailPage`
- [ ] 6.2 Add a `detailCache: Record<number, Movie | TvSeries>` ref (or state) to `EventDetailPage` for caching fetched detail
- [ ] 6.3 On first expand of a candidate, call `GET /api/watch/movies/:movieId` or `GET /api/watch/tv/:seriesId` based on `itemType`; store result in cache
- [ ] 6.4 Show an inline loading indicator within the candidate card while the detail fetch is in progress
- [ ] 6.5 On subsequent expand, use cached result without a new network request
- [ ] 6.6 Render the fetched detail (description, streaming, runtime/seasons) in the expanded panel within the candidate card
- [ ] 6.7 Verify vote buttons and remove affordance remain independently tappable when a candidate card is expanded

## 7. Build Verification

- [ ] 7.1 Run `npm run build:watch` and confirm zero TypeScript errors in `client-watch`
