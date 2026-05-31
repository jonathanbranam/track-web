**App**: trips

## Requirements

### Requirement: Info page renders trip info markdown
The trips app SHALL include an `/info` route that renders the current trip's `infoMarkdown` field as a full-page markdown document via `<MarkdownContent>`. The page SHALL be read-only for all users. No edit mode SHALL exist in the app.

#### Scenario: Info markdown is present
- **WHEN** the current trip has a non-null `infoMarkdown` value
- **THEN** the Info page renders it as formatted markdown

#### Scenario: Info markdown is null
- **WHEN** the current trip has `infoMarkdown: null`
- **THEN** the Info page shows an empty state message: "No info added yet."

#### Scenario: Info markdown is empty string
- **WHEN** the current trip has `infoMarkdown: ""`
- **THEN** the Info page shows the empty state message: "No info added yet."

#### Scenario: No current trip
- **WHEN** `GET /api/trips/current` returns 404
- **THEN** the Info page shows a message indicating no trip is currently active (consistent with OverviewPage empty state)

### Requirement: Info page data source
The Info page SHALL fetch the current trip via `GET /api/trips/current` and read the `infoMarkdown` field from the response. No additional API route is needed.

#### Scenario: Fetch on mount
- **WHEN** a user navigates to `/info`
- **THEN** the page fetches `/api/trips/current` and displays `infoMarkdown` once loaded
