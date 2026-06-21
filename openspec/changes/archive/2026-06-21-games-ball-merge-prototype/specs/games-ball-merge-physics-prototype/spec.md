**App**: games

## Purpose

Defines requirements for the Ball Merge Physics prototype — a Matter.js physics sandbox accessible at `/game/prototypes/ball-merge-physics` via the prototype picker. Exposes live controls for gravity, restitution, friction, and air friction. Includes ball drop mechanic and same-size merge detection; no scoring or game-over logic.

## ADDED Requirements

### Requirement: Prototype registry entry
The prototype registry SHALL include an entry with `slug: 'ball-merge-physics'`, `name: 'Ball Merge Physics'`, and a short description, mounting the `BallMergePhysicsGame` component.

#### Scenario: Prototype appears in picker
- **WHEN** a user opens `/game/prototypes`
- **THEN** "Ball Merge Physics" is listed as a selectable prototype

#### Scenario: Prototype route mounts component
- **WHEN** a user selects "Ball Merge Physics" from the picker
- **THEN** the app navigates to `/game/prototypes/ball-merge-physics` and mounts `BallMergePhysicsGame`

### Requirement: Level picker overlay
The prototype SHALL display a full-screen level picker overlay on first load listing all 8 levels from `levels.ts` with name and difficulty badge. No API calls are made.

#### Scenario: Picker shown on load
- **WHEN** the prototype mounts for the first time
- **THEN** the level picker overlay is visible and no physics simulation is running

#### Scenario: Selecting a level starts the sandbox
- **WHEN** the user selects a level from the picker
- **THEN** the overlay closes, the Matter.js world initializes with that level's container walls, and ball dropping is enabled

#### Scenario: Change Level re-opens picker
- **WHEN** the user taps "Change Level" in the controls panel during an active session
- **THEN** the level picker overlay reopens; selecting a new level resets the world to that level's walls and clears all balls while retaining current physics settings

### Requirement: Drop mechanic
The prototype SHALL allow the user to drop balls by tapping or clicking within the canvas. The drop position SHALL be clamped to the level's `dropMinX`/`dropMaxX` bounds.

#### Scenario: Tap spawns a ball
- **WHEN** the user taps within the canvas bounds
- **THEN** a ball of a randomly chosen size (index 0–4) is spawned at the clamped tap X position at the top of the container

#### Scenario: Aim indicator follows pointer
- **WHEN** the user moves the pointer over the canvas
- **THEN** a vertical aim indicator is drawn each frame at the current (clamped) X position

#### Scenario: Drop position is clamped
- **WHEN** the user taps outside the level's `dropMinX`/`dropMaxX` range
- **THEN** the ball spawns at the nearest boundary X, not outside it

### Requirement: Physics controls panel
The prototype SHALL render a persistent controls panel below the Phaser canvas with four labeled sliders and a "Change Level" button. Each slider SHALL display its current numeric value formatted to 3 significant figures.

| Parameter | Label | Min | Default | Max | Step |
|---|---|---|---|---|---|
| Gravity Y | Gravity | 0.1 | 0.9 | 3.0 | 0.05 |
| Restitution | Bounciness | 0.0 | 0.3 | 0.9 | 0.05 |
| Friction | Friction | 0.0 | 0.1 | 1.0 | 0.05 |
| Air Friction | Air Drag | 0.001 | 0.01 | 0.2 | 0.001 |

#### Scenario: Controls panel always visible
- **WHEN** the prototype is in an active session
- **THEN** all four sliders and their current values are visible without scrolling or toggling

#### Scenario: Slider value displayed
- **WHEN** any slider is at its current position
- **THEN** the label shows the parameter name and its value formatted to 3 significant figures (e.g., "Bounciness: 0.300")

#### Scenario: Canvas resizes to accommodate panel
- **WHEN** the controls panel is rendered
- **THEN** the Phaser canvas uses `Phaser.Scale.FIT` within its container and shrinks to leave room for the panel (~180px tall)

### Requirement: Live physics updates
Moving a slider SHALL immediately update the live Matter.js world with no restart required.

#### Scenario: Gravity slider updates world gravity
- **WHEN** the user moves the Gravity slider
- **THEN** `matter.world.gravity.y` is updated to the new value immediately

#### Scenario: Bounciness slider updates existing and future balls
- **WHEN** the user moves the Bounciness slider
- **THEN** `restitution` is patched on all currently live dynamic bodies and applied to newly spawned balls

#### Scenario: Friction slider updates existing and future balls
- **WHEN** the user moves the Friction slider
- **THEN** `friction` is patched on all currently live dynamic bodies and applied to newly spawned balls

#### Scenario: Air Drag slider updates existing and future balls
- **WHEN** the user moves the Air Drag slider
- **THEN** `frictionAir` is patched on all currently live dynamic bodies and applied to newly spawned balls

### Requirement: Reset button
The controls panel SHALL include a "Reset" button that removes all balls from the world and restores all sliders to their default values without changing the selected level.

#### Scenario: Reset clears all balls
- **WHEN** the user taps "Reset"
- **THEN** all dynamic ball bodies are removed from the Matter.js world

#### Scenario: Reset restores slider defaults
- **WHEN** the user taps "Reset"
- **THEN** all four sliders return to their default values (Gravity 0.9, Bounciness 0.3, Friction 0.1, Air Drag 0.01) and the world is updated accordingly

#### Scenario: Reset retains selected level
- **WHEN** the user taps "Reset"
- **THEN** the container walls of the currently selected level remain in place

### Requirement: Same-size ball merging
When two balls of the same size collide, they SHALL be removed and replaced by a single ball of the next size at the midpoint. The largest ball (Yoga Ball, size index 10) SHALL NOT merge.

#### Scenario: Same-size collision merges
- **WHEN** two balls with the same size index collide
- **THEN** both are removed and a new ball of `nextSize` is spawned at their midpoint

#### Scenario: Largest ball does not merge
- **WHEN** two Yoga Balls (size index 10) collide
- **THEN** they bounce without merging

#### Scenario: No score is emitted
- **WHEN** a merge occurs
- **THEN** no score event is dispatched and no score UI is updated

### Requirement: Ball visuals reuse real-game assets
Balls SHALL use the same 11-size sports-ball set (`SIZES` from `logic.ts`) and the same drawing helpers as `BallMergeScene.ts`, so visuals are identical to the real game.

#### Scenario: Spawned balls match real game appearance
- **WHEN** a ball of any size is spawned in the prototype
- **THEN** it renders with the same graphic (color, label, or texture) as the corresponding ball in the real ball-merge game
