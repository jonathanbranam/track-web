**App**: games

## ADDED Requirements

### Requirement: Score persistence
The system SHALL persist every completed Ball Merge game session to a `game_scores` table in SQLite, recording the authenticated user's id, the game slug (`ball-merge`), mode (`classic`), level (`box`), score, and the UTC timestamp of achievement. A score SHALL be submitted automatically on game-over with no action required from the player. A failed submission (network or server error) SHALL be silently ignored on the client; the game-over overlay SHALL still render normally.

#### Scenario: Score recorded on game-over
- **WHEN** a Ball Merge game ends (ball overflows the container)
- **THEN** the server inserts a row into `game_scores` with the authenticated user's id, `game_slug = 'ball-merge'`, `mode = 'classic'`, `level = 'box'`, the final score, and `achieved_at` set to the current UTC time, and returns HTTP 201

#### Scenario: Unauthenticated submission rejected
- **WHEN** a `POST /api/scores` request arrives without a valid session cookie or bearer token
- **THEN** the server returns HTTP 401 and inserts no row

#### Scenario: Invalid payload rejected
- **WHEN** a `POST /api/scores` request arrives with a missing or non-integer score, or a missing game slug
- **THEN** the server returns HTTP 422 and inserts no row

#### Scenario: User cannot submit on behalf of another user
- **WHEN** a `POST /api/scores` request is made by an authenticated user
- **THEN** the `user_id` recorded is always taken from the session, regardless of any user id in the request body

### Requirement: Leaderboard API
The system SHALL expose a `GET /api/scores/leaderboard` endpoint, protected by the existing auth middleware, that returns each user's personal best score for a given `game`, `mode`, and `level` combination, ranked highest-to-lowest, limited to at most `limit` entries (default 10, max 50). The response SHALL include rank, player name (display name if set, otherwise the local-part of the user's email), and best score. Full email addresses SHALL NOT be included in the leaderboard response.

#### Scenario: Top-10 leaderboard returned
- **WHEN** `GET /api/scores/leaderboard?game=ball-merge&mode=classic&level=box` is requested by an authenticated user
- **THEN** the server returns HTTP 200 with a JSON array of up to 10 entries, each with `rank`, `playerName`, and `score`, ordered by score descending

#### Scenario: Each user appears at most once
- **WHEN** a user has multiple score records for the same game/mode/level combination
- **THEN** only their highest score appears in the leaderboard response

#### Scenario: Custom limit respected
- **WHEN** `GET /api/scores/leaderboard?game=ball-merge&mode=classic&level=box&limit=5` is requested
- **THEN** the server returns at most 5 entries

#### Scenario: Limit capped at 50
- **WHEN** `GET /api/scores/leaderboard?game=ball-merge&mode=classic&level=box&limit=200` is requested
- **THEN** the server returns at most 50 entries

#### Scenario: Empty leaderboard
- **WHEN** no scores have been recorded for the requested game/mode/level combination
- **THEN** the server returns HTTP 200 with an empty array

#### Scenario: Unauthenticated leaderboard request rejected
- **WHEN** `GET /api/scores/leaderboard` is requested without a valid session
- **THEN** the server returns HTTP 401

### Requirement: Leaderboard UI — game-over panel
The games app SHALL display a leaderboard panel automatically when a Ball Merge game ends. The panel SHALL show the top-10 arcade-style ranking (rank, player name, score) for the current mode and level combination. The authenticated player's own entry SHALL be visually highlighted if they appear in the top 10. The panel SHALL appear alongside the existing game-over overlay (final score, best score, restart control).

#### Scenario: Leaderboard shown on game-over
- **WHEN** a Ball Merge game ends
- **THEN** the game-over overlay renders and the leaderboard panel fetches and displays the current top-10 for `classic`/`box`

#### Scenario: Player's own row highlighted
- **WHEN** the authenticated player appears in the top-10 leaderboard
- **THEN** their row is visually distinguished (e.g. highlighted background or text color) from other entries

#### Scenario: Leaderboard loading state
- **WHEN** the leaderboard fetch is in progress after game-over
- **THEN** a loading indicator is shown in the leaderboard panel area

#### Scenario: Leaderboard fetch failure handled gracefully
- **WHEN** the leaderboard fetch fails (network error or server error)
- **THEN** the game-over overlay still renders and the leaderboard panel shows an error or empty state without crashing

### Requirement: Leaderboard UI — mid-game HUD access
The Ball Merge HUD SHALL include a trophy icon button that opens the leaderboard panel while a game is in progress. Opening the leaderboard SHALL NOT pause or end the game.

#### Scenario: Trophy button opens leaderboard
- **WHEN** the player taps the trophy button in the HUD during an active game
- **THEN** the leaderboard panel appears showing the current top-10 for `classic`/`box`

#### Scenario: Game continues while leaderboard is open
- **WHEN** the leaderboard panel is open during an active game
- **THEN** physics and ball movement continue uninterrupted

#### Scenario: Leaderboard panel can be dismissed
- **WHEN** the leaderboard panel is open
- **THEN** the player can close it and return to the active game

### Requirement: Admin CLI — score inspection and reset
The `scripts/admin.ts` CLI SHALL provide two commands for managing game scores.

`scores:list` lists raw score rows with user email, game slug, mode, level, score, and achieved_at. Optional filters: `--game <slug>`, `--mode <mode>`, `--level <level>`. Supports `--json` for script-friendly output.

`scores:clear` deletes all scores for a specific game/mode/level combination and requires `--game`, `--mode`, `--level`, and `--confirm` flags. Without `--confirm` the command SHALL print a warning and exit without deleting anything.

#### Scenario: List all scores
- **WHEN** the admin runs `npm run admin -- scores:list`
- **THEN** all rows in `game_scores` are printed in table form with user email, game, mode, level, score, and achieved_at

#### Scenario: Filter scores by game
- **WHEN** the admin runs `npm run admin -- scores:list --game ball-merge`
- **THEN** only rows with `game_slug = 'ball-merge'` are printed

#### Scenario: JSON output
- **WHEN** the admin runs `npm run admin -- scores:list --json`
- **THEN** the output is a JSON array, one object per row

#### Scenario: Clear requires --confirm
- **WHEN** the admin runs `npm run admin -- scores:clear --game ball-merge --mode classic --level box` without `--confirm`
- **THEN** the command prints a warning message and exits without deleting any rows

#### Scenario: Clear with --confirm deletes rows
- **WHEN** the admin runs `npm run admin -- scores:clear --game ball-merge --mode classic --level box --confirm`
- **THEN** all rows matching that game/mode/level are deleted and a count is printed
