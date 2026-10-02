## ADDED Requirements

### Requirement: Per-game and per-level aggregates
The system SHALL provide `GET /api/admin/games/stats`, restricted to user 1, returning per game the session count, distinct players, median and p90 active and wall time, idle share, and per level the started, won, lost and abandoned counts, median time to finish and median time before abandoning, optionally filtered by game and time window.

#### Scenario: Stats for a game
- **WHEN** user 1 requests stats for a game
- **THEN** per-game and per-level aggregates are returned

#### Scenario: Non-admin refused
- **WHEN** another user requests stats
- **THEN** the response is `403`

### Requirement: Feedback listing and triage
The system SHALL provide admin-only routes to list feedback and ideas (filter by type, game, time, untriaged) and to mark an item triaged.

#### Scenario: Untriaged list
- **WHEN** user 1 lists untriaged feedback
- **THEN** only items without `triaged_at` are returned, newest first

#### Scenario: Mark triaged
- **WHEN** user 1 triages an item
- **THEN** its `triaged_at` is set and it no longer appears in the untriaged list

### Requirement: CLI and markdown export
The admin CLI SHALL provide `games:stats`, `games:feedback`, `games:feedback-triage` and `games:feedback-export`, with `--json` output for agents and a markdown digest grouped by game that includes context and ids.

#### Scenario: Agent reads untriaged feedback
- **WHEN** `games:feedback --untriaged --json` is run
- **THEN** untriaged items are printed as JSON with their context

### Requirement: Insights page (optional)
Once built, the admin app SHALL provide a Games insights page showing per-game aggregates with a level drill-down and a feedback list with a triage action.

#### Scenario: Page lists feedback
- **WHEN** user 1 opens the page
- **THEN** per-game stats and recent feedback are shown
