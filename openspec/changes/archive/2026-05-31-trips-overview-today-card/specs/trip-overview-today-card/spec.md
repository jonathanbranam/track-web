**App**: trips

## ADDED Requirements

### Requirement: Today card displayed when trip is active
When the current trip is active (today's UTC date falls between `startDate` and `endDate` inclusive, both dates set), the OverviewPage SHALL fetch the trip's day records and, if a record matching today's date exists, render a "Today" card above the Departure section.

#### Scenario: Active trip with a day record for today
- **WHEN** the current trip has `startDate` and `endDate` set, today falls within that range, and a `trip_days` record exists for today's date
- **THEN** the OverviewPage renders a "Today" card at the top of the page, above the Departure section, showing the day's content

#### Scenario: Active trip with no day record for today
- **WHEN** the current trip is active but no `trip_days` record exists for today's date
- **THEN** no Today card is rendered and the page content is otherwise unchanged

#### Scenario: Trip dates not set
- **WHEN** the current trip has null `startDate` or null `endDate`
- **THEN** no Today card is rendered and no secondary days fetch is made

#### Scenario: Trip not yet started
- **WHEN** today's date is before `startDate`
- **THEN** no Today card is rendered and no secondary days fetch is made

#### Scenario: Trip already ended
- **WHEN** today's date is after `endDate`
- **THEN** no Today card is rendered and no secondary days fetch is made

#### Scenario: Days fetch fails
- **WHEN** the trip is active but the `GET /api/trips/:id/days` request returns an error
- **THEN** no Today card is rendered, no error state is shown, and the rest of the Overview content is unaffected

### Requirement: Today card content
The Today card SHALL display the day's `title` (falling back to the formatted date when title is empty) and `body` rendered as markdown via `<MarkdownContent>`. The main trip content (departure notes, return notes, etc.) SHALL still be visible below the card.

#### Scenario: Day has a title and body
- **WHEN** the matching day record has a non-empty `title` and `body`
- **THEN** the card shows the title and the body rendered as markdown

#### Scenario: Day has no title
- **WHEN** the matching day record has an empty `title`
- **THEN** the card shows the formatted date (e.g., "Tue, Jun 3") as the heading instead

#### Scenario: Day has no body
- **WHEN** the matching day record has an empty `body`
- **THEN** the card shows only the title (or date fallback) with no body content

### Requirement: Today card navigates to Days tab
The Today card SHALL be interactive. Tapping or clicking it SHALL navigate to the `/days` route, which auto-scrolls to today's card.

#### Scenario: User taps Today card
- **WHEN** an authenticated user taps the Today card on the Overview page
- **THEN** the app navigates to the `/days` route

#### Scenario: Today card styled as tappable
- **WHEN** the Today card is rendered
- **THEN** it has a visual affordance indicating it is tappable (e.g., chevron or arrow icon)
