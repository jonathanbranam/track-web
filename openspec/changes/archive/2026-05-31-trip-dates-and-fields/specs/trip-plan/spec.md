**App**: trips

## ADDED Requirements

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
