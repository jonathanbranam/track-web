**App**: games

## MODIFIED Requirements

### Requirement: Score persistence
The system SHALL persist every completed Ball Merge game session to a `game_scores` table in SQLite, recording the authenticated user's id, the game slug (`ball-merge`), mode (`classic`), level, score, and the UTC timestamp of achievement. A score SHALL be submitted automatically on game-over with no action required from the player. A score of zero SHALL NOT be submitted — the client SHALL skip the POST entirely when `score <= 0`. The server SHALL reject a score of 0 with HTTP 422. A failed submission (network or server error) SHALL be silently ignored on the client; the game-over overlay SHALL still render normally.

#### Scenario: Score recorded on game-over
- **WHEN** a Ball Merge game ends with a score greater than 0
- **THEN** the server inserts a row into `game_scores` with the authenticated user's id, `game_slug = 'ball-merge'`, `mode = 'classic'`, the level id, the final score, and `achieved_at` set to the current UTC time, and returns HTTP 201

#### Scenario: Zero score not submitted on game-over
- **WHEN** a Ball Merge game ends with a final score of 0
- **THEN** the client does not call `POST /api/scores` and no row is inserted

#### Scenario: Zero score rejected by server
- **WHEN** a `POST /api/scores` request arrives with `score: 0`
- **THEN** the server returns HTTP 422 and inserts no row

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
The system SHALL expose a `GET /api/scores/leaderboard` endpoint, protected by the existing auth middleware, that returns each user's personal best score for a given `game`, `mode`, and `level` combination, ranked highest-to-lowest, limited to at most `limit` entries (default 10, max 50). Only scores greater than 0 SHALL be included. The response SHALL include rank, player name (display name if set, otherwise the local-part of the user's email), and best score. Full email addresses SHALL NOT be included in the leaderboard response.

#### Scenario: Top-10 leaderboard returned
- **WHEN** `GET /api/scores/leaderboard?game=ball-merge&mode=classic&level=box` is requested by an authenticated user
- **THEN** the server returns HTTP 200 with a JSON array of up to 10 entries, each with `rank`, `playerName`, and `score`, ordered by score descending

#### Scenario: Zero scores excluded from leaderboard
- **WHEN** a user has only zero-score records for a given game/mode/level
- **THEN** that user does not appear in the leaderboard response for that combination

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
- **WHEN** no scores greater than 0 have been recorded for the requested game/mode/level combination
- **THEN** the server returns HTTP 200 with an empty array

#### Scenario: Unauthenticated leaderboard request rejected
- **WHEN** `GET /api/scores/leaderboard` is requested without a valid session
- **THEN** the server returns HTTP 401

### Requirement: Leaderboard UI — game-over panel
The games app SHALL display a leaderboard panel automatically when a Ball Merge game ends. The panel SHALL show the top-10 arcade-style ranking for the current mode and level. The authenticated player's own entry SHALL be visually highlighted if they appear in the top 10. The panel SHALL appear after the score has been submitted to the server, so the player's own just-recorded score is included in the display.

#### Scenario: Leaderboard shown after score submitted on game-over
- **WHEN** a Ball Merge game ends with a score greater than 0
- **THEN** the score is submitted first, and only after the submission resolves does the leaderboard fetch begin, ensuring the new score appears in the panel

#### Scenario: Leaderboard shown immediately on game-over with zero score
- **WHEN** a Ball Merge game ends with a score of 0
- **THEN** no submission occurs and the leaderboard fetch begins immediately

#### Scenario: Player's own row highlighted
- **WHEN** the authenticated player appears in the top-10 leaderboard
- **THEN** their row is visually distinguished from other entries

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
- **THEN** the leaderboard panel appears showing the current top-10 for the active level

#### Scenario: Game continues while leaderboard is open
- **WHEN** the leaderboard panel is open during an active game
- **THEN** physics and ball movement continue uninterrupted

#### Scenario: Leaderboard panel can be dismissed
- **WHEN** the leaderboard panel is open
- **THEN** the player can close it and return to the active game

### Requirement: Quit button — voluntary game end with score submission
The Ball Merge HUD SHALL include a quit button that lets the player end an active game voluntarily at any time. Quitting SHALL pause the Phaser scene, submit the current score if greater than 0, await that submission, then fetch and display the leaderboard. The overlay heading SHALL read "You Quit". The quit button SHALL be hidden once a game has ended.

#### Scenario: Quit button visible during active game
- **WHEN** a Ball Merge game is in progress
- **THEN** a quit button is visible in the HUD

#### Scenario: Quit button hidden after game ends
- **WHEN** a Ball Merge game has ended (natural game-over or quit)
- **THEN** the quit button is no longer visible in the HUD

#### Scenario: Quitting with nonzero score submits and awaits
- **WHEN** the player taps the quit button during an active game with score greater than 0
- **THEN** the Phaser physics scene is paused, the score is submitted and awaited, then the leaderboard is fetched and the end-game overlay appears

#### Scenario: Quitting with zero score skips submission
- **WHEN** the player taps the quit button with a score of 0
- **THEN** no POST is made; the leaderboard is fetched immediately and the end-game overlay appears

#### Scenario: Quit overlay shows "You Quit" heading
- **WHEN** the end-game overlay appears as a result of quitting
- **THEN** the overlay heading reads "You Quit"

#### Scenario: Leaderboard shown after quit
- **WHEN** the player quits
- **THEN** the leaderboard panel fetches and displays the current top-10 for the active level

#### Scenario: Play Again resumes from a quit
- **WHEN** the player taps "Play Again" after quitting
- **THEN** the Phaser scene is resumed, all balls are cleared, and a new game starts
