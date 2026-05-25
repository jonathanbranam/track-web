**App**: client-watch

## MODIFIED Requirements

### Requirement: Ratings page with filter bar
The system SHALL provide a `/ratings` route rendering a `RatingsPage` with a filter bar. The filter bar SHALL include two independent pill-style toggle buttons (Movies, TV) — both active by default — and a separate Seen pill on the right. The Seen pill controls whether items with `seen = true AND again = false AND watching = false` are included; it is off by default. When the Seen pill is off its label SHALL include a count of actively hidden items in parentheses. A search input (defined by the `ratings-search` capability) SHALL be rendered above the filter bar. When the search input is non-empty the filter bar and the add-to dropdown row SHALL be hidden and replaced by the search result view; clearing the search SHALL restore the filter bar and add-to row instantly.

#### Scenario: Default view shows all non-seen content
- **WHEN** the user navigates to `/ratings`
- **THEN** both Movies and TV pills are active, the Seen pill is off, and all items not matching `seen = true AND again = false AND watching = false` are displayed

#### Scenario: Movies pill toggles movie visibility
- **WHEN** the user taps the Movies pill to deactivate it
- **THEN** no movie items appear in the list; TV items remain visible

#### Scenario: TV pill toggles TV series visibility
- **WHEN** the user taps the TV pill to deactivate it
- **THEN** no TV series appear in the list; movie items remain visible

#### Scenario: Seen pill label shows hidden count when off
- **WHEN** the Seen pill is off and at least one item has `seen = true AND again = false AND watching = false`
- **THEN** the Seen pill label shows that count in parentheses

#### Scenario: Seen pill includes all seen items when on
- **WHEN** the user activates the Seen pill
- **THEN** all items (including those with `seen = true AND again = false AND watching = false`) are shown, subject to the Movies/TV filter

#### Scenario: Currently-watching and seen-but-again always visible
- **WHEN** the Seen pill is off
- **THEN** items with `watching = true` or `again = true` are always shown regardless of the Seen filter

#### Scenario: Filter bar hidden while search is active
- **WHEN** the user types into the search input so it is non-empty
- **THEN** the Movies/TV/Seen filter bar and the add-to dropdown row are hidden and replaced by the search result view

#### Scenario: Clearing search restores the filter bar
- **WHEN** the user clears the search input
- **THEN** the filter bar and add-to dropdown row are shown again and the normal filtered list is restored
