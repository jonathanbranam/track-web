**App**: trips

## Requirements

### Requirement: Overview page is the default landing page
The trips app SHALL route `/` to the overview page. The overview page SHALL be the first tab in the bottom nav.

#### Scenario: Root navigation
- **WHEN** an authenticated user opens the trips app
- **THEN** the overview page is displayed

### Requirement: Display trip name and destination
The overview page SHALL display the current trip's `name` and `destination` (if set) as the page heading.

#### Scenario: Name and destination present
- **WHEN** the current trip has both a name and destination
- **THEN** both are shown in the heading area

#### Scenario: Destination not set
- **WHEN** the current trip has no destination
- **THEN** only the trip name is shown

### Requirement: Display departure information
The overview page SHALL display `departure_notes` in a clearly labeled section. If `departure_notes` is null or empty, the section SHALL indicate no departure info has been entered.

#### Scenario: Departure notes present
- **WHEN** the current trip has departure_notes
- **THEN** the text is displayed verbatim in the departure section

#### Scenario: No departure notes
- **WHEN** departure_notes is null or empty
- **THEN** the departure section shows an empty/placeholder state

### Requirement: Display return information
The overview page SHALL display `return_notes` in a clearly labeled section. If `return_notes` is null or empty, the section SHALL indicate no return info has been entered.

#### Scenario: Return notes present
- **WHEN** the current trip has return_notes
- **THEN** the text is displayed verbatim in the return section

#### Scenario: No return notes
- **WHEN** return_notes is null or empty
- **THEN** the return section shows an empty/placeholder state

### Requirement: Display trip length
The overview page SHALL display `nights` and `full_days` when set, in a trip length summary area.

#### Scenario: Both nights and full_days set
- **WHEN** the current trip has both nights and full_days values
- **THEN** both are shown (e.g., "5 nights · 4 full days")

#### Scenario: Trip length not set
- **WHEN** both nights and full_days are null
- **THEN** the trip length area is omitted or shows a placeholder

### Requirement: Display trip dates
The overview page SHALL display `startDate` and `endDate` when both are present, formatted as "Mon, Jun 3" (e.g., `EEE, MMM d`). The date range SHALL be shown in a dedicated row near the trip length summary. If either date is absent, the date row SHALL be omitted.

#### Scenario: Both dates present
- **WHEN** the current trip has `startDate: "2026-07-01"` and `endDate: "2026-07-10"`
- **THEN** the overview shows the formatted date range, e.g., "Wed, Jul 1 – Fri, Jul 10"

#### Scenario: Only one date set
- **WHEN** the current trip has `startDate` but no `endDate` (or vice versa)
- **THEN** the date range row is omitted

#### Scenario: No dates set
- **WHEN** the current trip has null `startDate` and `endDate`
- **THEN** the date range row is omitted and the page renders as before

### Requirement: Empty state when no current trip
When no current trip is set, the overview page SHALL display an informational empty state rather than an error.

#### Scenario: No active trip
- **WHEN** GET /api/trips/current returns 404
- **THEN** the page shows a message indicating no trip is currently active (e.g., "No active trip")

### Requirement: Info tab in NavBar
The trips app NavBar SHALL include an "Info" tab entry that navigates to `/info`. The Info tab SHALL appear after the Overview tab. The active tab SHALL be highlighted using the existing active-state style (indigo color).

#### Scenario: Info tab is visible
- **WHEN** an authenticated user is on any page of the trips app
- **THEN** the NavBar shows both an "Overview" tab and an "Info" tab

#### Scenario: Info tab is active when on /info
- **WHEN** the current route is `/info`
- **THEN** the Info tab is highlighted as active and the Overview tab is not

#### Scenario: Overview tab is active when on /
- **WHEN** the current route is `/`
- **THEN** the Overview tab is highlighted as active and the Info tab is not

### Requirement: App.tsx routes include /info
`App.tsx` SHALL include a `/info` route wrapped in `<AuthGuard>` that renders `<InfoPage>`. The catch-all `*` route SHALL continue to redirect to `/`.

#### Scenario: Direct navigation to /info
- **WHEN** an authenticated user navigates directly to `/info`
- **THEN** the Info page is rendered

#### Scenario: Unauthenticated access to /info
- **WHEN** an unauthenticated user navigates to `/info`
- **THEN** `AuthGuard` redirects them to the login page
