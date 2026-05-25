**App**: client-watch

## Purpose

Search capability on the Ratings page. Provides a unified search input that drives three tiers simultaneously: instant in-memory filter of loaded ratings, debounced local catalog query, and debounced TMDB query. Results are presented in labeled sections; selecting a result adds it to the watchlist.

## Requirements

### Requirement: Unified search input on the Ratings page
The Ratings page SHALL render a search input field below the page header and above the filter bar. As the user types, the input SHALL drive three search tiers simultaneously: an instant in-memory filter of the already-loaded ratings, a debounced local catalog query, and a debounced TMDB query. Clearing the input SHALL immediately restore the page's normal filtered view.

#### Scenario: Search input rendered above the filter bar
- **WHEN** the user navigates to `/ratings`
- **THEN** a search input field is shown below the page header and above the filter bar

#### Scenario: Clearing the search restores the normal view
- **WHEN** the user clears the search input so it is empty
- **THEN** the three-section search result view is removed and the page's normal filtered list and filter bar are restored

### Requirement: Instant in-memory ratings filter tier
While the search input is non-empty, the page SHALL instantly filter the already-loaded ratings list by the query — with no debounce and no API call — and display the matches in a section labeled "In Your Ratings". Matching SHALL be case-insensitive against the item title.

#### Scenario: Typing filters the loaded ratings instantly
- **WHEN** the user types a query into the search input
- **THEN** the "In Your Ratings" section immediately shows only the loaded ratings whose title matches the query, without firing any API call for this tier

#### Scenario: Title match is case-insensitive
- **WHEN** the query differs only in letter case from a rated item's title
- **THEN** that item appears in the "In Your Ratings" section

### Requirement: Local catalog search tier
After a 300 ms debounce pause, the page SHALL query the local catalog by firing `GET /api/watch/movies?q=` and `GET /api/watch/tv?q=` in parallel and display the merged results in a section labeled "In Catalog". Results already present in the user's ratings (matched by `id` + `mediaType`) SHALL be excluded so they appear only in the "In Your Ratings" section. The section SHALL display at most a fixed cap of results (10–15); when more results match, a "showing top N" note SHALL be shown.

#### Scenario: Catalog query fires after the debounce pause
- **WHEN** the user has not typed for 300 ms and the search input is non-empty
- **THEN** `GET /api/watch/movies?q=` and `GET /api/watch/tv?q=` are fired in parallel and their merged results populate the "In Catalog" section

#### Scenario: Items already rated are excluded from the catalog section
- **WHEN** a catalog result has the same `id` and `mediaType` as an item in the user's loaded ratings
- **THEN** that result is omitted from the "In Catalog" section and appears only in "In Your Ratings"

#### Scenario: Truncation note shown when results exceed the cap
- **WHEN** the number of matching catalog results exceeds the display cap
- **THEN** the section shows the capped number of results and a "showing top N" note

### Requirement: TMDB search tier
After a 500 ms debounce pause, and only when the query meets the significance threshold, the page SHALL fire `GET /api/watch/external/search` for both `type=movie` and `type=tv` in parallel and merge the results into a single section labeled "On TMDB" with a per-row media-type label. The significance test strips leading articles ("a ", "an ", "the ") and all spaces from the query; the remaining character count MUST be ≥ 3. TMDB results where `isDuplicate: true` SHALL be excluded, since they are already in the local catalog and will appear in the "In Catalog" section.

#### Scenario: TMDB query fires after the debounce pause when significant
- **WHEN** the user has not typed for 500 ms and the significant character count is ≥ 3
- **THEN** `GET /api/watch/external/search` is fired for both `type=movie` and `type=tv` in parallel and the merged results populate the "On TMDB" section with media-type labels

#### Scenario: Short or article-only query does not trigger TMDB search
- **WHEN** the significant character count after stripping leading articles and all spaces is < 3 (e.g., "the g")
- **THEN** no TMDB search is fired

#### Scenario: isDuplicate results are excluded from the TMDB section
- **WHEN** a TMDB search returns results and some have `isDuplicate: true`
- **THEN** those results are not shown in the "On TMDB" section

### Requirement: Three-section search result layout
When the search is active, the page SHALL display the result tiers in a fixed order — "In Your Ratings", then "In Catalog", then "On TMDB" — each under its section label and separated from the next by a horizontal rule.

#### Scenario: Three labeled sections separated by horizontal rules
- **WHEN** the search input is non-empty
- **THEN** the page shows the "In Your Ratings", "In Catalog", and "On TMDB" sections in that order, each with its label and separated by horizontal rules

### Requirement: Add a local catalog result to the watchlist
Selecting a result in the "In Catalog" section SHALL add the title to the user's watchlist via `PUT /api/watch/movies/watchlist/:id` or `PUT /api/watch/tv/watchlist/:id` with a neutral default state (`{ state: 'unseen', rating: null }`), append the item to the in-memory ratings list, and clear the search to return to the normal view. The add SHALL be optimistic; if the request fails, the optimistically-added item SHALL be removed and an inline error shown.

#### Scenario: Selecting a catalog result adds it and clears the search
- **WHEN** the user selects a result in the "In Catalog" section
- **THEN** the appropriate watchlist PUT is called with `{ state: 'unseen', rating: null }`, the item is appended to the in-memory ratings list, and the search is cleared so the newly added item is visible in the normal view

#### Scenario: Failed add rolls back the optimistic item
- **WHEN** the watchlist PUT for a selected catalog result returns a non-2xx response
- **THEN** the optimistically-added item is removed from the in-memory ratings list and an inline error is shown

### Requirement: Import and add a TMDB result to the watchlist
Selecting a result in the "On TMDB" section SHALL import the title via `POST /api/watch/external/import` and then add the returned local record to the user's watchlist with the neutral default state (`{ state: 'unseen', rating: null }`), then clear the search to return to the normal view.

#### Scenario: Selecting a TMDB result imports then adds to the watchlist
- **WHEN** the user selects a result in the "On TMDB" section
- **THEN** the title is imported via `POST /api/watch/external/import`, the returned local record is added to the watchlist with `{ state: 'unseen', rating: null }`, and the search is cleared

#### Scenario: Import failure shows an inline error
- **WHEN** the `POST /api/watch/external/import` call for a selected TMDB result returns a non-2xx response
- **THEN** an inline error is shown near the result, the search query is preserved, and the item is not added to the watchlist
