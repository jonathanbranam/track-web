**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: HUD renders as a ReactDOM overlay
The dungeon-tactics-solo HUD SHALL be rendered as ReactDOM elements layered over the Phaser game canvas. The HUD overlay MUST NOT block pointer interactions with the underlying board: interactive HUD controls capture pointer events, while non-interactive overlay regions pass pointer events through to the Phaser canvas.

#### Scenario: HUD layers over the canvas
- **WHEN** the game is mounted
- **THEN** the HUD chrome (status pill, action buttons, and any open popup or modal) is rendered as DOM elements positioned over the Phaser canvas

#### Scenario: Empty HUD regions do not block the board
- **WHEN** the user taps a board tile in an area not covered by an interactive HUD control
- **THEN** the tap reaches the Phaser board and is handled as a board interaction (no HUD element intercepts it)

#### Scenario: HUD reflects current game state
- **WHEN** the authoritative game state changes (phase, selected unit, undo availability, etc.)
- **THEN** the HUD re-renders from that state without requiring a Phaser redraw of HUD elements

### Requirement: Status pill reflects the current phase
The HUD SHALL display a status pill whose text reflects the current game phase: the placement prompt during unit placement, the PC-action label during the player phase, and the enemy-action label during NPC playback.

#### Scenario: Placement phase
- **WHEN** the game is in the unit-placement phase
- **THEN** the status pill shows the placement prompt ("Place your units")

#### Scenario: Player phase
- **WHEN** it is the player's turn to act
- **THEN** the status pill shows the PC-actions label

#### Scenario: Enemy phase
- **WHEN** NPC actions are being played back
- **THEN** the status pill shows the enemy-actions label

### Requirement: Reset control
The HUD SHALL present a Reset control that is available in all phases. Activating it SHALL reset the game to the start of the active scenario.

#### Scenario: Reset the game
- **WHEN** the user activates the Reset control
- **THEN** the game resets to the active scenario's starting state and the HUD updates to reflect the reset state

### Requirement: Placement Start control
During the unit-placement phase the HUD SHALL present a Start control that begins the first player turn. The control SHALL NOT be present outside the placement phase.

#### Scenario: Start from placement
- **WHEN** the user is in the placement phase and activates Start
- **THEN** placement ends and the first player turn begins

#### Scenario: Start hidden outside placement
- **WHEN** the game is not in the placement phase
- **THEN** the Start control is not shown

### Requirement: Done control
During the player phase the HUD SHALL present a Done control that ends the player's turn. Activating Done SHALL open the end-of-turn confirmation modal.

#### Scenario: Done opens confirmation
- **WHEN** the user is in the player phase and activates Done
- **THEN** the end-of-turn confirmation modal opens

#### Scenario: Done hidden outside player phase
- **WHEN** the game is not in the player phase
- **THEN** the Done control is not shown

### Requirement: Undo control
During the player phase the HUD SHALL present an Undo control. The control SHALL be enabled when there is at least one undoable action on the stack and disabled (and visually dimmed) when the undo stack is empty. Activating an enabled Undo control SHALL revert the most recent player action.

#### Scenario: Undo available
- **WHEN** the player has performed at least one undoable action
- **THEN** the Undo control is enabled, and activating it reverts the most recent action and updates the HUD

#### Scenario: Undo unavailable
- **WHEN** the undo stack is empty
- **THEN** the Undo control is disabled and dimmed, and activating it has no effect

### Requirement: Unit info popup
When a unit is selected the HUD SHALL display a unit info popup containing the unit's display name, its HP / Move / Attack stat lines, a portrait area, a Close control, and an Attack toggle control. The portrait area SHALL be a DOM element prepared to host a simple unit image in the future. Closing the popup SHALL deselect the unit (or otherwise dismiss the popup) and the Attack toggle SHALL toggle the selected unit's attack-action mode.

#### Scenario: Popup shows selected unit
- **WHEN** a unit is selected
- **THEN** the popup shows that unit's display name and its HP, Move, and Attack stat lines, with a portrait area present

#### Scenario: Close the popup
- **WHEN** the user activates the popup's Close control
- **THEN** the popup is dismissed

#### Scenario: Toggle attack mode
- **WHEN** the user activates the popup's Attack toggle
- **THEN** the selected unit's attack-action mode is toggled and the board overlay updates accordingly

#### Scenario: Portrait area ready for image
- **WHEN** the popup is rendered
- **THEN** the portrait area is a DOM element that can host a unit image without further structural change

### Requirement: End-of-turn confirmation modal
The HUD SHALL render the end-of-turn confirmation modal as a ReactDOM component whose open/closed state is owned by React (not by the Phaser scene). The modal SHALL show the confirmation prompt and, when applicable, a warning about units that have not yet attacked, with Cancel and Confirm controls. Cancel SHALL close the modal without ending the turn; Confirm SHALL end the player's turn.

#### Scenario: Modal warns about un-acted units
- **WHEN** the modal opens while one or more units have not attacked
- **THEN** the modal shows the confirmation prompt and a warning naming the count of units that have not attacked

#### Scenario: Cancel keeps the turn active
- **WHEN** the user activates Cancel in the modal
- **THEN** the modal closes and the player's turn remains active

#### Scenario: Confirm ends the turn
- **WHEN** the user activates Confirm in the modal
- **THEN** the player's turn ends, the modal closes, and play proceeds to the enemy phase

### Requirement: Board-anchored visuals remain in Phaser
Board-anchored, tile-relative visuals SHALL continue to be rendered by Phaser in the world layer and SHALL NOT move to the DOM HUD. These include move arrows, attack/walk/spawn highlights, ghost destination markers, NPC intent arrows, unit order labels, and HP pips.

#### Scenario: Planning overlays stay on the board
- **WHEN** a unit's move or attack is being planned
- **THEN** the move arrows, highlights, and ghost destinations are rendered by Phaser on the board layer, not by the DOM HUD

#### Scenario: Board pans and zooms independently of HUD
- **WHEN** the board is panned or zoomed
- **THEN** the board-anchored visuals transform with the board while the DOM HUD chrome remains screen-anchored

### Requirement: HUD interactions invoke the engine directly
HUD control activations SHALL invoke the game engine functions directly through React handlers, without round-tripping through Phaser scene events. The legacy Phaser HUD events (`hud-done-confirm`, `hud-reset`, `hud-placement-done`, `hud-undo`, `popup-attack-toggle`, `popup-close`) SHALL no longer be used for HUD interaction.

#### Scenario: Direct invocation
- **WHEN** the user activates any HUD control
- **THEN** the corresponding engine function runs via a React handler and the new state is reflected in both the HUD and the Phaser board

#### Scenario: No Phaser HUD event round-trip
- **WHEN** a HUD control is activated
- **THEN** no `hud-*` or `popup-*` Phaser scene event is emitted to drive the interaction
