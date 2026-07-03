## MODIFIED Requirements

### Requirement: Game completion
The system SHALL provide paths to complete a game and show final totals. A **fixed-round** game SHALL be completable by reaching its target round count. A game SHALL also be completable **early** — before reaching the target — and an **unlimited** game SHALL be completable via a **"Done"** action. Completing a game SHALL set its status to completed, record a completion timestamp, and present the final totals. Completing a game — whether via "Done", early end, or finishing after the target is reached — SHALL require an explicit **confirmation** before the game is marked completed.

#### Scenario: Fixed-round game reaches its target
- **WHEN** the final round of a fixed-round game is entered
- **THEN** the game shows final totals and can be marked completed

#### Scenario: Done ends an unlimited game
- **WHEN** the user activates "Done" on an unlimited game and confirms
- **THEN** the game's status becomes completed, a completion timestamp is recorded, and final totals are shown

#### Scenario: Early end of a fixed-round game
- **WHEN** the user ends a fixed-round game before its target round count is reached and confirms
- **THEN** the game's status becomes completed with the scores entered so far and final totals are shown

#### Scenario: Ending a game requires confirmation
- **WHEN** the user triggers ending/finishing a game
- **THEN** the system prompts for confirmation and only marks the game completed if the user confirms; cancelling leaves the game active with its scores intact

## ADDED Requirements

### Requirement: Creator is a default player
When a user creates a **new** game, the system SHALL seed the player list with the creating user as a **default player**, identified by their own display name and user reference. The creator SHALL be **removable** like any other player, and SHALL be **re-addable** from the player picker if removed. Reopening an existing game's setup (edit-setup or rematch) SHALL preserve that game's existing players rather than forcibly re-adding the creator.

#### Scenario: New game seeds the creator as a player
- **WHEN** a user opens setup for a new game
- **THEN** the player list already contains the creating user, marked as "you"

#### Scenario: Creator can be removed and re-added
- **WHEN** the creator removes themselves from the player list
- **THEN** they no longer appear as a player, and a picker option is offered to add themselves back

#### Scenario: Editing an existing setup keeps its players
- **WHEN** the user opens edit-setup or rematch for an existing game
- **THEN** the player list is exactly that game's players, without forcibly re-adding the creator

### Requirement: Discard an in-progress game
The system SHALL allow the user to **quit and discard** an in-progress game without saving it, removing the game and any scores entered rather than keeping a partial record. This action SHALL require an explicit **confirmation**.

#### Scenario: Discard removes the game
- **WHEN** the user chooses to quit/discard an in-progress game and confirms
- **THEN** the game and its entered scores are deleted and the user returns to the games list

#### Scenario: Discard requires confirmation
- **WHEN** the user triggers discard
- **THEN** the system prompts for confirmation and only discards if the user confirms; cancelling leaves the game active with its scores intact

### Requirement: Hide the user pill during play
While the user is **viewing or scoring a game** (the play and results views), the floating user-name pill (`UserChip`) SHALL be hidden so it does not overlap the scoreboard. It SHALL be shown again on the games list and setup views.

#### Scenario: Pill hidden while scoring
- **WHEN** the user is in the play or results view of a game
- **THEN** the floating user pill is not shown

#### Scenario: Pill restored on list and setup
- **WHEN** the user is on the games list or the setup screen
- **THEN** the floating user pill is shown

### Requirement: Known-game default configuration
The system SHALL maintain, in code, a set of **default configurations for known games**, keyed by game name. When the user selects a game whose name matches a known-game entry, the system SHALL **autofill** the corresponding default round count. Autofill SHALL only populate an **empty or untouched** round field and SHALL NOT override a value the user has already entered. The known-game set SHALL include **Sushi Go** and **Tides of Time**, each defaulting to **3 rounds**.

#### Scenario: Selecting a known game autofills its round count
- **WHEN** the user picks "Sushi Go" or "Tides of Time" during setup and has not typed a round count
- **THEN** the round count is autofilled to 3

#### Scenario: Autofill does not override a typed value
- **WHEN** the user has already entered a round count and then selects a known game
- **THEN** the user's entered round count is left unchanged

#### Scenario: Unknown game leaves rounds unchanged
- **WHEN** the user picks a game with no known-game entry
- **THEN** the round count is left as-is (blank = unlimited unless the user enters one)

### Requirement: Delete a completed game from history
The system SHALL allow the user to **delete a completed game** from the History list, removing the game and all of its players and round scores. Deletion SHALL be exposed via a **swipe gesture** on the history row and SHALL require a confirmation or provide an undo affordance. The server SHALL provide an owner-scoped delete endpoint; a user SHALL NOT be able to delete another user's game.

#### Scenario: Swipe deletes a history game
- **WHEN** the user swipes a completed game in History and confirms the delete
- **THEN** the game and all its players and round scores are removed and it no longer appears in History

#### Scenario: Delete is owner-scoped
- **WHEN** a delete is requested for a game not owned by the caller
- **THEN** the server responds with 404 and no data is deleted

#### Scenario: Delete requires confirmation or undo
- **WHEN** the user initiates a swipe-delete
- **THEN** the deletion is confirmed by the user or reversible via an undo affordance before it is permanent
