**App**: watch

## MODIFIED Requirements

### Requirement: Suggestion search excludes already-added titles
The suggestion search UI in the event detail view SHALL filter out any movie or TV series that is already present in the event's suggestion list, so that users cannot attempt to add a duplicate. This filtering applies to both the local catalog results and the TMDB results sections.

#### Scenario: Already-added movie hidden from search results
- **WHEN** a user types a search query in the suggestion search field and a movie in the results is already added as a suggestion for the event
- **THEN** that movie SHALL NOT appear in the search dropdown

#### Scenario: Already-added TV series hidden from search results
- **WHEN** a user types a search query in the suggestion search field and a TV series in the results is already added as a suggestion for the event
- **THEN** that TV series SHALL NOT appear in the search dropdown

#### Scenario: Titles not yet suggested still appear
- **WHEN** a user types a search query and matching titles are not yet suggested for the event
- **THEN** those titles SHALL appear in the search dropdown as normal

#### Scenario: Already-added title suppressed from TMDB results
- **WHEN** a TMDB search returns a result for a title that has `isDuplicate: true` (already in local catalog) and that local title is already added as a suggestion for the event
- **THEN** that result SHALL NOT appear in the TMDB section of the dropdown
