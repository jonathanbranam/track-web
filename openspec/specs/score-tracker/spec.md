**App**: play

## Purpose

General score tracking in the Play app (`client-play`) for tabletop and card games. Covers the **Score** tab, game setup (a remembered/seeded game-name picker, players from connected users or free-form names, and an optional round count), per-round score entry allowing any integer including negatives and zero, running and per-round totals, game completion (target reached, early end, or "Done" for unlimited games), permanent retention of completed games, and post-game rematch / edit-setup flows. Backed by the `score_games`, `score_players`, `score_round_scores`, and `score_game_names` tables and the `/api/play/*` endpoints. Games are owned by the creating user (the scorekeeper); there is no leaderboard or cross-game ranking.

## Requirements

### Requirement: Score tab in the Play app
The Play app SHALL present a **Score** tab, reachable from the bottom navigation, that provides general score tracking for tabletop and card games. The tab SHALL be gated behind authentication like the rest of the Play app.

#### Scenario: Score tab is available
- **WHEN** an authenticated user opens `client-play`
- **THEN** the bottom navigation shows a **Score** entry alongside the existing Putt entry
- **AND** selecting it opens the score tracker

#### Scenario: Unauthenticated access is blocked
- **WHEN** an unauthenticated request is made to any `/api/play/score-games` or `/api/play/game-names` endpoint
- **THEN** the server responds with 401 and no data is returned

### Requirement: Game setup with name, players, and round count
The system SHALL allow a user to create a game by supplying a **game name**, a list of **players** (at least one), and an **optional target round count**. Omitting the round count SHALL create an **unlimited** game.

#### Scenario: Create a fixed-round game
- **WHEN** the user submits a setup with a name, two or more players, and a target round count of N (N ≥ 1)
- **THEN** a new game is created with `status = 'active'`, `target_rounds = N`, and the given players in the given order

#### Scenario: Create an unlimited game
- **WHEN** the user submits a setup with a name and players but leaves the round count blank
- **THEN** a new game is created with `target_rounds` unset (unlimited)

#### Scenario: Setup requires at least one player
- **WHEN** the user submits a setup with no players
- **THEN** the server rejects the request with a validation error and no game is created

### Requirement: Game-name picker with remembered and seeded names
The setup SHALL offer a **game-name picker** populated from a remembered list of previously-used game names, while still allowing **free-form** entry of a new name. The remembered list SHALL be seeded with **Sushi Go**, **Tides of Time**, **Pit**, **Farkle**, and **Uno**. When a game is created with a name not already in the list, that name SHALL be added to the list. Name matching for de-duplication SHALL be case-insensitive.

#### Scenario: Seeded names are available
- **WHEN** the user opens the game-name picker for the first time
- **THEN** the list includes Sushi Go, Tides of Time, Pit, Farkle, and Uno

#### Scenario: New name is remembered
- **WHEN** the user creates a game with a name not present in the remembered list
- **THEN** the name is added to the remembered list and appears in the picker for subsequent games

#### Scenario: Duplicate name is not re-added
- **WHEN** the user creates a game with a name that already exists in the list, differing only by letter case or surrounding whitespace
- **THEN** no duplicate entry is added to the remembered list

#### Scenario: Free-form name is accepted
- **WHEN** the user types a game name that is not in the picker and submits setup
- **THEN** the game is created with that name

### Requirement: Player selection from connected users or free-form names
When adding players during setup, the system SHALL allow the user to **select from their connected users** (as returned by the existing social connections list) or to **add a player by free-form name**. Each player SHALL store a display name; players chosen from connected users SHALL additionally retain a reference to that user.

#### Scenario: Add a connected user as a player
- **WHEN** the user picks a connected user from the player selector
- **THEN** a player is added whose name is that user's display name and which references that user's id

#### Scenario: Add a free-form player
- **WHEN** the user types a name that is not a connected user
- **THEN** a player is added with that name and no user reference

#### Scenario: Game record is private to its creator
- **WHEN** a game references another user as a player
- **THEN** that referenced user is granted no access to the game record; only the creating user can read or modify it

### Requirement: Per-round score entry allowing any integer
After each round the system SHALL allow the user to enter a score for every player. A score MAY be any integer, including **negative** values and **zero**. Submitting a round SHALL record one score per player for that round number.

#### Scenario: Enter a round of scores
- **WHEN** the user submits scores for round R with a value for each player
- **THEN** each player's score for round R is stored

#### Scenario: Negative and zero scores are accepted
- **WHEN** the user enters a negative value or zero for a player's round score
- **THEN** the value is stored unchanged

#### Scenario: Editing a previously entered round
- **WHEN** the user re-submits scores for a round number that already has scores
- **THEN** the stored scores for that round are replaced with the new values

#### Scenario: Removing a round
- **WHEN** the user deletes a recorded round
- **THEN** that round's scores are removed and the remaining rounds are unaffected

### Requirement: Running totals and per-round breakdown
While a game is in progress the system SHALL display, for each player, their **per-round scores** and a **running total** equal to the sum of that player's recorded round scores.

#### Scenario: Running total reflects entered rounds
- **WHEN** two or more rounds of scores have been entered
- **THEN** each player's displayed total equals the sum of their round scores, and each round's individual scores are visible

#### Scenario: Totals include negative scores correctly
- **WHEN** a player has a mix of positive and negative round scores
- **THEN** the displayed total is the signed sum of those scores

### Requirement: Game completion
The system SHALL provide paths to complete a game and show final totals. A **fixed-round** game SHALL be completable by reaching its target round count. A game SHALL also be completable **early** — before reaching the target — and an **unlimited** game SHALL be completable via a **"Done"** action. Completing a game SHALL set its status to completed, record a completion timestamp, and present the final totals.

#### Scenario: Fixed-round game reaches its target
- **WHEN** the final round of a fixed-round game is entered
- **THEN** the game shows final totals and can be marked completed

#### Scenario: Done ends an unlimited game
- **WHEN** the user activates "Done" on an unlimited game
- **THEN** the game's status becomes completed, a completion timestamp is recorded, and final totals are shown

#### Scenario: Early end of a fixed-round game
- **WHEN** the user ends a fixed-round game before its target round count is reached
- **THEN** the game's status becomes completed with the scores entered so far and final totals are shown

### Requirement: Completed game persistence
The system SHALL persist completed games permanently, retaining the game name, its players, all per-player round scores and final totals, and the game's created and completed **timestamps**. Completed games SHALL be retrievable as individual game records. This capability SHALL NOT provide any leaderboard or cross-game ranking.

#### Scenario: Completed game is retained
- **WHEN** a game is completed and the app is later reloaded
- **THEN** the game record — name, players, round scores, totals, and timestamps — is still retrievable

#### Scenario: No leaderboard is produced
- **WHEN** completed games are listed
- **THEN** they are presented as individual game records with no aggregated cross-game ranking or standings

### Requirement: Post-game rematch and edit-setup
From the results of a completed game the system SHALL allow the user to **start a new game with the same players and rules** (name and round count), or to **"Edit setup"** which reopens the setup screen pre-filled with the same players and rules for modification before starting.

#### Scenario: New game with same players and rules
- **WHEN** the user chooses "new game" from the results screen
- **THEN** a new active game is created with the same name, target round count, and players as the completed game, with no scores yet

#### Scenario: Edit setup reopens pre-filled setup
- **WHEN** the user chooses "Edit setup" from the results screen
- **THEN** the setup screen opens pre-populated with the completed game's players, name, and round count, allowing changes before a new game is started
