**App**: games

## ADDED Requirements

### Requirement: Next ball is queued before it is needed

The Ball Merge game SHALL maintain a queue of one upcoming ball (in addition to the currently held ball), so the next ball is determined at the moment the current ball is dropped — not after. This means the "next" ball is known and fixed the instant a drop occurs.

#### Scenario: Next ball is set at drop time
- **WHEN** the player drops the held ball
- **THEN** the previously queued next ball becomes the new held ball, and a new next ball is randomly selected

#### Scenario: Queue is initialized at game start
- **WHEN** a new game begins or restarts
- **THEN** both a held ball and a next ball are initialized with random sizes in the spawn range (0–4)

### Requirement: "Next" ball preview is shown in the game HUD

The game SHALL display a visual preview of the next ball (the one after the currently held ball) in the Phaser canvas HUD. The preview SHALL show a scaled-down version of the next ball's sprite alongside a "NEXT" label. The preview SHALL update immediately each time the held ball changes.

#### Scenario: Next ball preview is visible during active play
- **WHEN** the game is in progress
- **THEN** a "NEXT" label and a small ball image representing the queued next ball are visible in the HUD

#### Scenario: Preview updates on every drop
- **WHEN** the player drops the held ball
- **THEN** the "NEXT" preview immediately changes to show the newly queued ball

#### Scenario: Preview is hidden on game over
- **WHEN** the game ends (overflow or quit)
- **THEN** the "NEXT" preview is no longer visible
