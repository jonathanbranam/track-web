## ADDED Requirements

### Requirement: In-game feedback button
Every game except Dungeon Tactics SHALL offer a feedback button in the game chrome, outside the play area, and on its game-over or pause screen. Activating it SHALL open a dialog with one free-text field and no required categories, and SHALL pause active-time counting while open.

#### Scenario: Open from a game
- **WHEN** a player taps the feedback button during a game
- **THEN** a dialog with a single text field and a Send button opens

#### Scenario: Submit
- **WHEN** the player enters text and sends
- **THEN** it is submitted with the game slug, current level or state, and a confirmation is shown

#### Scenario: Failed submit keeps text
- **WHEN** the submission fails
- **THEN** the dialog stays open with the text intact and an error shown

### Requirement: Suggest a new game
The games home page SHALL offer a "Suggest a game" entry that opens the same dialog as an `idea` submission with no game slug.

#### Scenario: Idea submitted
- **WHEN** a player submits text from "Suggest a game"
- **THEN** it is stored with type `idea` and no game slug

### Requirement: Automatic context
Submissions SHALL carry user, game slug, level or state, app version, user agent, viewport and timestamp, with user, version, user agent and timestamp stamped by the server.

#### Scenario: Context stored
- **WHEN** feedback is stored
- **THEN** the row contains the user id, game slug, level, app version, user agent, viewport and created time

### Requirement: Feedback ingest and limits
The system SHALL provide `POST /api/games/feedback` for authenticated users, accepting `type` `feedback` or `idea` and `text` of 1 to 2000 characters after trimming, rate limited to 5 submissions per user per hour, storing rows in `game_feedback`.

#### Scenario: Valid feedback
- **WHEN** a player posts text of valid length
- **THEN** the response is `201` with the new id

#### Scenario: Empty or too long
- **WHEN** the text is empty or longer than 2000 characters
- **THEN** the response is `400` and nothing is stored

#### Scenario: Rate limited
- **WHEN** a player exceeds 5 submissions in an hour
- **THEN** the response is `429`
