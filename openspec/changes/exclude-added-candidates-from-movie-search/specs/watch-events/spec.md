**App**: client-watch

## ADDED Requirements

### Requirement: Candidate search excludes already-nominated titles
The candidate search UI in the event detail view SHALL filter out any movie or TV series that is already present in the event's candidate list, so that users cannot attempt to nominate a duplicate.

#### Scenario: Already-nominated movie hidden from search results
- **WHEN** a user types a search query in the candidate search field and a movie in the results is already nominated as a candidate for the event
- **THEN** that movie SHALL NOT appear in the search dropdown

#### Scenario: Already-nominated TV series hidden from search results
- **WHEN** a user types a search query in the candidate search field and a TV series in the results is already nominated as a candidate for the event
- **THEN** that TV series SHALL NOT appear in the search dropdown

#### Scenario: Un-nominated titles still appear
- **WHEN** a user types a search query and matching titles are not yet nominated as candidates for the event
- **THEN** those titles SHALL appear in the search dropdown as normal
