**App**: games

## Purpose

Leaderboard preview embedded in the Ball Merge level picker. Each level card shows the current top player name and score fetched from the existing leaderboard API. Players can tap the score area to open the full leaderboard panel for that level without leaving the picker.

## Requirements

### Requirement: Level picker shows top score per level
The level picker SHALL display the current top player name and score for each level card. The scores SHALL be fetched in parallel on picker mount using the existing leaderboard API (limit=1 per level). If no scores exist for a level, the card SHALL show a "No scores yet" placeholder. If the fetch fails, the card SHALL show no score indicator without crashing.

#### Scenario: Top score shown on level card
- **WHEN** the level picker is displayed and the leaderboard API returns a top entry for a level
- **THEN** the level card shows the top player's name and score

#### Scenario: No scores placeholder shown
- **WHEN** the level picker is displayed and no scores exist for a level
- **THEN** the level card shows "No scores yet" or equivalent placeholder text

#### Scenario: Fetch failure handled gracefully
- **WHEN** the leaderboard fetch for a level fails
- **THEN** the level card shows no score data and no error is surfaced to the user

#### Scenario: Scores fetched fresh on every picker visit
- **WHEN** the level picker is shown (on first load, after "Change Level", or after navigating back to the game)
- **THEN** the top-score fetches are issued again so scores reflect any games played since the last visit

#### Scenario: Scores load asynchronously
- **WHEN** the level picker mounts
- **THEN** the cards are shown immediately and score data populates as each fetch resolves

### Requirement: Level picker leaderboard tap
Each level card's score area SHALL be tappable to open the full leaderboard panel for that level. Tapping SHALL trigger the same leaderboard panel used during and after gameplay, showing the top-10 for that level. The level picker remains visible behind the panel; closing the panel returns the player to the picker.

#### Scenario: Tapping score area opens leaderboard panel
- **WHEN** the player taps the score area on a level card in the picker
- **THEN** the full leaderboard panel opens showing the top-10 for that level

#### Scenario: Leaderboard panel closes back to picker
- **WHEN** the player closes the leaderboard panel while the level picker is visible
- **THEN** the level picker is shown again and the player can continue selecting a level

#### Scenario: Tap on level card body still selects level
- **WHEN** the player taps the main body of a level card (not the score area)
- **THEN** that level is selected and the picker proceeds normally
