**App**: trips

## Requirements

### Requirement: DaysPage fetches and renders day cards
The DaysPage SHALL fetch the current trip and then fetch its day records from `GET /api/trips/:id/days`. It SHALL render one card per day ordered by date ascending.

#### Scenario: Days exist
- **WHEN** an authenticated member navigates to `/days`
- **THEN** the page renders one card per day record, ordered by date ascending

#### Scenario: API returns empty list
- **WHEN** `GET /api/trips/:id/days` returns an empty `days` array
- **THEN** the page shows the empty state: "Set trip dates to generate the day plan."

#### Scenario: No active trip
- **WHEN** `GET /api/trips/current` returns 404
- **THEN** the page shows "No active trip" and no day cards are rendered

### Requirement: Day card displays formatted date header
Each day card SHALL display the day's date formatted as "Tue, Jun 3" (weekday abbreviated, month abbreviated, day numeric). The date SHALL be interpreted in UTC to avoid timezone-offset display errors.

#### Scenario: Date header format
- **WHEN** a day record has `date: "2026-07-01"`
- **THEN** the card header shows "Wed, Jul 1"

### Requirement: Day card displays title with date fallback
Each day card SHALL display the day's `title` field. When `title` is empty or absent, the card SHALL fall back to displaying the formatted date string as the title.

#### Scenario: Title set
- **WHEN** a day record has `title: "Travel to Paris"`
- **THEN** the card shows "Travel to Paris" as the title

#### Scenario: Title empty
- **WHEN** a day record has `title: ""`
- **THEN** the card shows the formatted date string in place of the title

### Requirement: Day card displays weather when present
Each day card SHALL display the `weather` field as a plain text line beneath the title when `weather` is set. When `weather` is null or empty, the weather line SHALL be omitted.

#### Scenario: Weather set
- **WHEN** a day record has `weather: "⛅ 84°F, partly cloudy"`
- **THEN** the card shows that string as a plain text line

#### Scenario: Weather absent
- **WHEN** a day record has `weather: null`
- **THEN** no weather line is rendered

### Requirement: Day card renders markdown body
Each day card SHALL render the `body` field as markdown via `<MarkdownContent>`. When `body` is empty, the markdown area SHALL be omitted.

#### Scenario: Body with markdown
- **WHEN** a day record has a `body` containing markdown text
- **THEN** the card renders it as formatted HTML

#### Scenario: Empty body
- **WHEN** a day record has `body: ""`
- **THEN** no markdown content area is rendered for that card

### Requirement: Day cards are read-only for all users
All day card content (date, title, weather, body) SHALL be read-only. No edit controls SHALL appear for any user role.

#### Scenario: Member views days
- **WHEN** any authenticated member views the Days tab
- **THEN** all cards are displayed without edit controls

### Requirement: Auto-scroll to today's card when trip is active
When the trip is active (today's date falls between `startDate` and `endDate` inclusive), the DaysPage SHALL scroll to today's card after the day list renders, using `scrollIntoView({ behavior: 'instant' })`.

#### Scenario: Trip active, today has a card
- **WHEN** today falls between `startDate` and `endDate` and a day record exists for today
- **THEN** the page scrolls to today's card immediately after render (no animation)

#### Scenario: Trip not yet started
- **WHEN** today is before `startDate`
- **THEN** no auto-scroll occurs; the list renders from the top

#### Scenario: Trip ended
- **WHEN** today is after `endDate`
- **THEN** no auto-scroll occurs; the list renders from the top
