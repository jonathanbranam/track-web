## 1. State and Timer Setup

- [ ] 1.1 Add `tmdbResults` state (`ExternalResult[]`) and `tmdbLoading` state (`boolean`) to `EventDetailPage`
- [ ] 1.2 Add `tmdbError` state (`string | null`) for import failure messaging
- [ ] 1.3 Add a second debounce ref (`tmdbDebounceRef`) for the 500 ms TMDB timer, separate from the existing 300 ms local search timer
- [ ] 1.4 Extract the significance-check helper: strip leading "a ", "an ", "the " (case-insensitive) and all spaces, return `stripped.length >= 3`

## 2. TMDB Search Trigger Logic

- [ ] 2.1 In the search `useEffect`, after setting the local search debounce, set up the 500 ms TMDB debounce that calls the significance check and fires `api.external.search` for both `movie` and `tv` in parallel when met
- [ ] 2.2 Merge the two `ExternalResult[]` arrays (movies first, then TV), filter out entries where `isDuplicate: true`, and set `tmdbResults`
- [ ] 2.3 On TMDB search start set `tmdbLoading = true`; on completion (success or error) set `tmdbLoading = false`
- [ ] 2.4 On TMDB search error set `tmdbResults = []` (no results shown)
- [ ] 2.5 Clear `tmdbResults` and cancel the TMDB debounce timer when `searchQuery` becomes empty (mirror the existing local clear behavior)

## 3. Enter Key and Search Button Triggers

- [ ] 3.1 Add `onKeyDown` handler to the search input: on Enter, cancel the TMDB debounce timer and immediately fire the TMDB search if significance check passes
- [ ] 3.2 Add a search icon button (magnifying glass) to the right inside the search input container; clicking it cancels the TMDB debounce and immediately fires the TMDB search if significance check passes
- [ ] 3.3 Style the button to be small and visually inset at the right of the input field (matching the dark Tailwind theme)

## 4. Result List Rendering

- [ ] 4.1 Below the existing local results `<ul>`, add a TMDB section: when `tmdbLoading` is true, show a small spinner with a "TMDB" label; when false and `tmdbResults.length > 0`, render a `<hr>` separator followed by a `<ul>` of TMDB result items
- [ ] 4.2 Each TMDB result item shows a type badge (movie/TV), title, release year, and a per-item loading spinner when that item's import is in-flight
- [ ] 4.3 While any import is in-flight, disable all other TMDB result buttons to prevent double-submit

## 5. Import-then-Nominate Flow

- [ ] 5.1 Add `importingTmdbId` state (`number | null`) to track which result is being imported
- [ ] 5.2 On TMDB result click: set `importingTmdbId` to the result's `tmdbId`, call `api.external.import(type, result)`, await the returned `Movie | TvSeries`
- [ ] 5.3 On import success: set `pickedCandidate` using the returned record's `id` (as `movieId` or `seriesId`), clear `searchQuery`, `searchResults`, `tmdbResults`, and reset `importingTmdbId` to null
- [ ] 5.4 On import error: set `tmdbError` to a user-facing message, reset `importingTmdbId` to null, preserve `searchQuery`
- [ ] 5.5 Render `tmdbError` as an inline message below the search field; clear it when `searchQuery` changes

## 6. Verification

- [ ] 6.1 Build the watch client (`npm run build:watch`) and confirm zero TypeScript errors
- [ ] 6.2 Manual test: local search returns results on every keystroke; TMDB results appear ~500 ms after pausing
- [ ] 6.3 Manual test: "the g" (article-only significance) does not trigger TMDB; "godfather" does
- [ ] 6.4 Manual test: Enter key and search button both trigger TMDB immediately
- [ ] 6.5 Manual test: clicking a TMDB result imports, sets picked candidate, and the Add button submits it as an event nominee
- [ ] 6.6 Manual test: imported title does not appear in the want-to-watch list
- [ ] 6.7 Manual test: TMDB section absent when API key is not configured (503 response handled silently)
