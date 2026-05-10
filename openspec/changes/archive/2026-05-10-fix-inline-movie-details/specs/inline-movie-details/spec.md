**App**: client-watch

## MODIFIED Requirements

### Requirement: Tap title to expand inline detail panel
Each movie and TV card in the catalog, watchlist, and event candidate list SHALL display the title as a tappable element. Tapping the title SHALL expand an inline detail panel below the title row within the same card, revealing all available catalog fields not already visible in the collapsed card: description, streaming platform, runtime (movies) or episode runtime and season count (TV). Tapping the title again SHALL collapse the panel.

#### Scenario: Tapping title expands detail panel
- **WHEN** the user taps the title on a collapsed movie or TV card
- **THEN** an inline detail panel appears below the title within the card, showing description, streaming platform, runtime (or episode runtime / season count for TV), and any other catalog fields not already shown

#### Scenario: Tapping title again collapses detail panel
- **WHEN** the user taps the title on a card whose detail panel is already expanded
- **THEN** the detail panel is hidden and the card returns to its collapsed state

#### Scenario: Fields with no data are omitted from the panel
- **WHEN** the detail panel is expanded for a movie or TV entry that has null values for optional fields
- **THEN** only fields with non-null values are rendered in the panel; no empty labels or blank rows are shown
