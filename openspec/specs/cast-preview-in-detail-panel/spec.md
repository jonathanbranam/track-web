**App**: client-watch

## Purpose

Displays director and top-billed actors inside the inline detail panel when a movie or TV card is expanded. A second expansion level inside the panel reveals the full cached cast for users who want to browse all credited performers.

## Requirements

### Requirement: Cast preview shown in expanded detail panel
When a movie or TV card's detail panel is open, the panel SHALL display a cast preview section showing the director's name (labeled "Director") and the names of the top 3 billed actors (by billing order). The director and actor list are displayed separately. If cast data is not available for a title, the cast preview section SHALL be omitted entirely — no empty labels or placeholder rows are shown.

#### Scenario: Director and top actors shown when data is available
- **WHEN** the user expands a movie or TV card that has cast data
- **THEN** the detail panel shows a "Director" label with the director's name, followed by up to 3 actor names in billing order

#### Scenario: Cast section omitted when no cast data
- **WHEN** the user expands a card for a title that has no stored cast (e.g., imported before cast storage was added)
- **THEN** no cast section, director label, or actor list appears in the detail panel

#### Scenario: Partial actor list shown when fewer than 3 actors stored
- **WHEN** the user expands a card for a title that has a director and fewer than 3 stored cast members
- **THEN** the director and available actor names are shown without padding or empty slots

#### Scenario: Director omitted when only actors are present
- **WHEN** the user expands a card for a title that has cast members but no stored director
- **THEN** only the actor names are shown; the "Director" label row is omitted

### Requirement: Full cast secondary expansion
When the detail panel is open and cast data is present, the panel SHALL display a "Full cast" affordance. Tapping it SHALL expand a secondary list within the panel showing all cached cast members (up to 30) in billing order. Tapping the affordance again SHALL collapse the list. The secondary expansion is independent of the first-level expand/collapse and does not affect other cards.

#### Scenario: Full cast list expands on tap
- **WHEN** the user taps "Full cast" inside an expanded detail panel
- **THEN** a list of all cached cast members (name, in billing order) appears below the preview section

#### Scenario: Full cast list collapses on second tap
- **WHEN** the user taps "Full cast" while the full cast list is already visible
- **THEN** the full cast list is hidden and the panel returns to showing only the preview

#### Scenario: Full cast affordance hidden when no cast data
- **WHEN** the detail panel is open for a title with no stored cast
- **THEN** no "Full cast" affordance is rendered

#### Scenario: Full cast state is local to the card
- **WHEN** the user opens the full cast list on one card and then opens a different card
- **THEN** the first card collapses (per the at-most-one rule) and the full cast state resets; the newly opened card starts with the full cast list hidden
