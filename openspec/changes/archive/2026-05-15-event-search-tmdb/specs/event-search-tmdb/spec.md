**App**: watch

## ADDED Requirements

### Requirement: Two-tier search in event detail nomination
The event detail nomination search SHALL query the local catalog immediately as the user types (debounced 300 ms) and SHALL also query the TMDB API as a second tier. Local results SHALL be displayed at the top of the dropdown. When TMDB results are present, a horizontal rule separator SHALL appear below the local results, followed by the TMDB results. If no local results exist, only TMDB results (with separator) are shown when available.

#### Scenario: Local results appear immediately while typing
- **WHEN** a user types a query in the nomination search field on the event detail page
- **THEN** matching local movies and TV series appear in the dropdown within 300 ms, before any TMDB call is made

#### Scenario: TMDB results appear below local results
- **WHEN** a TMDB search completes and returns results
- **THEN** a horizontal rule separator is shown after the local results (or at the top if no local results), followed by the TMDB results

#### Scenario: No TMDB results shown while loading
- **WHEN** a TMDB search is in-flight
- **THEN** the TMDB section shows a loading indicator; no partial results are rendered

#### Scenario: TMDB section absent when search returns empty
- **WHEN** TMDB search completes with zero results
- **THEN** the separator and TMDB section are not shown

#### Scenario: TMDB section absent on API error
- **WHEN** the TMDB search endpoint returns a non-2xx response
- **THEN** the TMDB section is not shown; local results continue to function normally

### Requirement: TMDB search trigger conditions
The TMDB search SHALL be triggered only when the query meets a minimum significance threshold, and SHALL fire on three distinct triggers: debounce pause, Enter key, and search icon button.

The significance test strips leading articles ("a ", "an ", "the ") and all spaces from the query before counting characters. The remaining character count MUST be ≥ 3 to trigger a TMDB search.

#### Scenario: Debounce triggers TMDB search after pause
- **WHEN** the user has not typed for 500 ms and the significant character count is ≥ 3
- **THEN** a TMDB search is fired automatically

#### Scenario: Short or article-only query does not trigger TMDB search
- **WHEN** the significant character count after stripping articles and spaces is < 3 (e.g., "the g", "a go")
- **THEN** no TMDB search is fired on debounce

#### Scenario: Enter key triggers immediate TMDB search
- **WHEN** the user presses Enter in the nomination search field and the significant character count is ≥ 3
- **THEN** a TMDB search is fired immediately, bypassing the debounce timer

#### Scenario: Search icon button triggers immediate TMDB search
- **WHEN** the user clicks the search icon button to the right of the nomination search input and the significant character count is ≥ 3
- **THEN** a TMDB search is fired immediately, bypassing the debounce timer

#### Scenario: Enter and button do not trigger search below threshold
- **WHEN** the user presses Enter or clicks the search button and the significant character count is < 3
- **THEN** no TMDB search is fired

### Requirement: TMDB duplicate results filtered from event search
TMDB search results where `isDuplicate: true` SHALL be excluded from the TMDB section of the nomination dropdown. These items are already present in the local catalog and will appear in the local results section when the query matches.

#### Scenario: isDuplicate results are excluded from TMDB section
- **WHEN** a TMDB search returns results and some have `isDuplicate: true`
- **THEN** those results are not shown in the TMDB section of the dropdown

#### Scenario: Non-duplicate TMDB results are shown
- **WHEN** a TMDB search returns results where `isDuplicate: false`
- **THEN** those results appear in the TMDB section

### Requirement: Import-then-nominate from TMDB result
When a user selects a TMDB result from the nomination dropdown, the system SHALL import the title into the local catalog via `POST /api/watch/external/import` and then set it as the picked candidate for nomination. The title SHALL NOT be added to the user's want-to-watch list as part of this flow.

#### Scenario: Clicking a TMDB result imports and picks the candidate
- **WHEN** a user clicks a TMDB result in the nomination dropdown
- **THEN** the title is imported via `POST /api/watch/external/import`, the returned local record's ID is set as the picked candidate, and the search field is cleared

#### Scenario: Import failure shows inline error
- **WHEN** the import call returns a non-2xx response
- **THEN** an inline error message is shown near the search field; the search query is preserved and no candidate is picked

#### Scenario: TMDB import does not add to watchlist
- **WHEN** a user imports a TMDB title via the nomination search
- **THEN** no row is inserted into the user's want-to-watch list

#### Scenario: Per-result loading state during import
- **WHEN** a user clicks a TMDB result and the import is in-flight
- **THEN** a loading indicator is shown on that result and other results are disabled to prevent double-submit
