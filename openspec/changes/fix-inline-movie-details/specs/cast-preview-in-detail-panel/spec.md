**App**: client-watch

## ADDED Requirements

### Requirement: Cast preview shown in event candidate expanded panel
When an event candidate card's detail panel is open on the event detail page, the panel SHALL display the same cast preview section as catalog and watchlist cards: the director's name (labeled "Director") and the names of the top 3 billed actors (by billing order). The cast data is available from the lazy-fetched detail payload already retrieved on first expand. If cast data is not available for the title, the cast preview section SHALL be omitted entirely — no empty labels or placeholder rows are shown.

#### Scenario: Director and top actors shown when candidate data is available
- **WHEN** the user expands an event candidate card that has cast data
- **THEN** the detail panel shows a "Director" label with the director's name, followed by up to 3 actor names in billing order

#### Scenario: Cast section omitted when no cast data for candidate
- **WHEN** the user expands an event candidate card for a title that has no stored cast
- **THEN** no cast section, director label, or actor list appears in the candidate detail panel

#### Scenario: Cast preview appears after lazy fetch completes
- **WHEN** the user expands an event candidate card for the first time and the detail fetch completes
- **THEN** the expanded panel shows cast preview (director + top actors) alongside the other catalog fields

#### Scenario: Full cast toggle available on candidate cards
- **WHEN** the user expands an event candidate card that has cast data
- **THEN** a "Full cast" affordance is displayed and tapping it reveals all cached cast members in billing order, consistent with catalog and watchlist card behavior
