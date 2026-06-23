## ADDED Requirements

### Requirement: Selecting a PC opens an info popup
When the game is in the player phase and the player taps a PC unit, the system SHALL select that unit and open a unit info popup for it. The popup SHALL display the unit's archetype (`unitType`), current and maximum HP (max 3), move range, and attack damage, sourced from the same `moveRange`/`attackDamage` helpers the engine uses. The popup SHALL be rendered in the Phaser scene (not React DOM) and anchored to the bottom of the screen with a fixed position that does not move as the board is panned or zoomed.

#### Scenario: Tapping a PC selects it and opens the popup
- **WHEN** the game is in the player phase and the player taps a PC unit
- **THEN** that unit becomes the selected unit
- **AND** a bottom-anchored info popup opens showing its archetype, HP/max HP, move range, and attack damage

#### Scenario: Popup stat values match the engine
- **WHEN** a PC info popup is shown
- **THEN** the move range and attack damage displayed SHALL equal `moveRange(unit)` and `attackDamage(unit)` for that unit

#### Scenario: Popup stays fixed while the board moves
- **WHEN** a unit info popup is open and the player pans or zooms the board
- **THEN** the popup SHALL remain anchored at the bottom of the screen and not move with the board

### Requirement: Selecting a PC immediately shows walk-destination tiles
When a PC is selected and no action is active, the system SHALL immediately display that unit's valid walk-destination tiles, without requiring a separate "Move" step. Tapping a highlighted walk-destination tile SHALL plan the move exactly as the prior implementation did.

#### Scenario: Walk tiles appear on selection
- **WHEN** a PC is selected and no action is active
- **THEN** the unit's valid walk-destination tiles SHALL be highlighted on the board

#### Scenario: Tapping a walk tile plans the move
- **WHEN** a PC is selected with walk tiles shown and the player taps a valid walk-destination tile
- **THEN** the system SHALL plan a move to that tile (computing the A* path) as before

### Requirement: PC action bar with active-highlight
While a PC is selected, the popup SHALL present an action bar containing the unit's actions. The action bar SHALL contain an **Attack** action and SHALL be structured to hold additional attacks/actions in the future. An action button SHALL indicate that it is active by rendering in a highlighted/active style rather than by changing its label. At most one action SHALL be active at a time.

#### Scenario: Action bar shows the Attack action
- **WHEN** a PC is selected
- **THEN** the popup SHALL show an action bar containing an Attack button

#### Scenario: Activating Attack highlights the button and shows attack tiles
- **WHEN** the player taps the Attack button while it is inactive
- **THEN** the Attack button SHALL render in its highlighted/active style
- **AND** the walk-destination tiles SHALL be hidden and the attack-target tiles SHALL be shown

#### Scenario: Active button keeps its label
- **WHEN** the Attack action is active
- **THEN** the button label SHALL remain "Attack" (the active state is shown by highlight, not by relabeling)

### Requirement: Canceling an active action
An active action SHALL be canceled — returning the unit to the default walk-tile view with no action active — when the player taps the active action's highlighted button again, or taps a tile that is not a valid target for that action. Canceling an action SHALL NOT dismiss the unit; the popup SHALL remain open and the walk-destination tiles SHALL be shown again.

#### Scenario: Re-tapping the active button cancels the action
- **WHEN** the Attack action is active and the player taps the highlighted Attack button again
- **THEN** the action SHALL become inactive
- **AND** the attack tiles SHALL be hidden, the walk tiles SHALL be shown, and the unit SHALL remain selected with the popup open

#### Scenario: Tapping a non-target tile cancels the action
- **WHEN** the Attack action is active and the player taps a tile that is not a valid attack target
- **THEN** the action SHALL become inactive and the unit SHALL return to the walk-tile view with the popup still open

### Requirement: Tapping an empty tile dismisses the selected unit
When a unit is selected with no action active, tapping a tile that is neither a valid walk-destination nor the selected unit itself SHALL cancel the selection: the popup SHALL close, the selected unit SHALL be cleared, and all walk/attack overlays SHALL be removed.

#### Scenario: Empty-tile tap dismisses the unit
- **WHEN** a unit is selected with no action active and the player taps an empty, non-actionable tile
- **THEN** the selection SHALL be cleared, the popup SHALL close, and no walk/attack tiles SHALL remain

#### Scenario: Empty-tile tap does not dismiss while an action is active
- **WHEN** an action is active and the player taps a non-target tile
- **THEN** the unit SHALL remain selected (the action is canceled instead, per the canceling-an-action requirement)

### Requirement: Close button dismisses the selected unit
Each unit info popup SHALL include a Close (X) control. Tapping it SHALL cancel the current selection: closing the popup, clearing the selected unit, and removing any walk/attack overlays.

#### Scenario: Close button clears selection
- **WHEN** a unit info popup is open and the player taps its Close (X) control
- **THEN** the popup SHALL close, the selected unit SHALL be cleared, and any walk/attack overlays SHALL be removed

### Requirement: Selecting an NPC opens an info-only popup
NPC units SHALL be tappable during the player phase. Tapping an NPC SHALL select it and open an info-only popup showing the NPC's name (its `unitType` string, e.g. `short-range`), its movement (move range), and its current and maximum HP. The NPC popup SHALL NOT show walk-destination tiles, attack-target tiles, or any action bar, because NPCs are not player-controlled. The NPC popup SHALL include the same Close (X) dismiss behavior.

#### Scenario: Tapping an NPC opens its info popup
- **WHEN** the game is in the player phase and the player taps an NPC unit
- **THEN** an info-only popup opens showing the NPC's unitType as its name, its movement, and its HP/max HP

#### Scenario: NPC popup shows no planning overlays or actions
- **WHEN** an NPC is selected
- **THEN** no walk-destination tiles, attack-target tiles, or action bar SHALL be shown

#### Scenario: NPC name is the unit type
- **WHEN** an NPC info popup is shown for a unit with `unitType` `short-range`
- **THEN** the popup SHALL display `short-range` as the NPC's name

### Requirement: Selecting another unit replaces the open popup
When a unit is already selected and the player selects a different unit, the system SHALL switch the selection to the newly tapped unit and show that unit's popup (PC or NPC variant), replacing the previous popup and clearing the previous unit's overlays.

#### Scenario: Switching selection updates the popup
- **WHEN** a unit is selected and the player taps a different selectable unit
- **THEN** the popup SHALL update to the newly selected unit and the previous unit's walk/attack overlays SHALL be cleared

### Requirement: Popups only appear during the player phase
Unit info popups and selection SHALL be available only while the game is in the player phase. During PC playback or NPC playback, tapping units SHALL NOT open a popup or change the selection.

#### Scenario: No popup during playback
- **WHEN** the game is in PC-playback or NPC-playback phase and the player taps a unit
- **THEN** no info popup SHALL open and the selection SHALL not change

### Requirement: Attack-targeting still takes precedence over NPC selection
While a PC's Attack action is active (attack tiles shown), tapping a tile occupied by an NPC SHALL be treated as choosing an attack target, not as selecting that NPC.

#### Scenario: Attacking an NPC tile does not select the NPC
- **WHEN** a PC's Attack action is active and the player taps a valid attack-target tile occupied by an NPC
- **THEN** the system SHALL set the attack on that tile and SHALL NOT select the NPC or open the NPC popup
