**App**: dungeon-tactics-solo

## Purpose

Defines admin mode for Dungeon Tactics Solo: an upper-right Admin toggle that enables
game-designer capabilities, and the first such capability — editing per-archetype max HP
and movement values directly in the unit info popup. Overrides are session-scoped and drive
the engine's stat helpers so the board reflects them immediately. Persistence is out of
scope for this change.

## Requirements

### Requirement: Admin toggle button in the upper-right
The system SHALL render an **Admin** toggle control anchored to the upper-right of the
Dungeon Tactics Solo screen. The control SHALL default to **off** and SHALL visually
indicate whether admin mode is on or off (e.g., a highlighted/active style when on). Tapping
the control SHALL flip admin mode between on and off. The control SHALL remain anchored in
the upper-right and SHALL NOT move as the board is panned or zoomed.

#### Scenario: Admin toggle is present and off by default
- **WHEN** a Dungeon Tactics Solo match is shown
- **THEN** an Admin toggle control SHALL be visible in the upper-right of the screen
- **AND** it SHALL indicate the off state

#### Scenario: Tapping the toggle turns admin mode on
- **WHEN** admin mode is off and the player taps the Admin toggle
- **THEN** admin mode SHALL become on
- **AND** the toggle SHALL render in its active/on style

#### Scenario: Tapping the toggle again turns admin mode off
- **WHEN** admin mode is on and the player taps the Admin toggle
- **THEN** admin mode SHALL become off
- **AND** the toggle SHALL render in its inactive/off style

#### Scenario: Toggle stays fixed while the board moves
- **WHEN** the player pans or zooms the board
- **THEN** the Admin toggle SHALL remain anchored in the upper-right and SHALL NOT move with the board

### Requirement: Gameplay is unchanged while admin mode is off
While admin mode is off, the system SHALL behave exactly as before this change. The unit
info popup SHALL present max HP and movement as read-only values, and no editing affordance
SHALL be shown.

#### Scenario: Popup is read-only when admin is off
- **WHEN** admin mode is off and a unit info popup is open
- **THEN** the max HP and movement values SHALL be displayed as read-only
- **AND** no editing controls SHALL be present in the popup

### Requirement: Editing max HP and movement in the info popup while admin is on
While admin mode is on, the unit info popup SHALL present editable controls for the unit's
**max HP** and **movement (move range)**. Only these two stats SHALL be editable; all other
displayed stats (including attack damage) SHALL remain read-only. Edited values SHALL be
constrained to valid non-negative integers within the engine's allowed range, and committing
an edit SHALL update the displayed value to the committed value.

#### Scenario: Editing controls appear when admin is on
- **WHEN** admin mode is on and a unit info popup is open
- **THEN** the popup SHALL present editable controls for max HP and movement
- **AND** attack damage and other stats SHALL remain read-only

#### Scenario: Committing a movement edit updates the displayed value
- **WHEN** admin mode is on, a unit info popup is open, and the designer sets movement to a new valid value
- **THEN** the popup SHALL display the new movement value

#### Scenario: Committing a max HP edit updates the displayed value
- **WHEN** admin mode is on, a unit info popup is open, and the designer sets max HP to a new valid value
- **THEN** the popup SHALL display the new max HP value

### Requirement: Edits apply per archetype
An edit to max HP or movement SHALL apply to the edited unit's archetype (`unitType`), not to
a single unit. After an edit, every unit sharing that `unitType` SHALL use the new value, and
units of other archetypes SHALL be unaffected.

#### Scenario: Editing one unit changes all units of that archetype
- **WHEN** admin mode is on and the designer sets movement to a new value in a melee unit's popup
- **THEN** all melee units SHALL use the new movement value
- **AND** units of other archetypes SHALL keep their existing values

### Requirement: Overrides drive the engine immediately
Committed max HP and movement overrides SHALL be the values the engine uses for affected
behavior — at minimum the move-range helper that computes walk-destination tiles and the
max-HP value used for HP display and clamping. After an override is committed, dependent board
state (such as walk-destination tiles when a unit of that archetype is next selected) SHALL
reflect the new value without requiring a reload.

#### Scenario: New movement value changes walk-destination tiles
- **WHEN** admin mode is on, the designer increases movement for an archetype, and a unit of that archetype is then selected in the player phase
- **THEN** the unit's walk-destination tiles SHALL be computed using the new movement value

#### Scenario: Raised max HP raises current HP by the same amount
- **WHEN** the designer increases an archetype's max HP
- **THEN** each affected unit's current HP SHALL increase by the same amount (e.g. a 3/3 unit becomes 4/4 and a 1/3 unit becomes 2/4)

#### Scenario: Lowered max HP lowers current HP by the same amount, floored at 1
- **WHEN** the designer decreases an archetype's max HP
- **THEN** each affected unit's current HP SHALL decrease by the same amount (e.g. a 4/4 unit becomes 3/3 and a 2/4 unit becomes 1/3)
- **AND** current HP SHALL never drop below 1, so lowering max HP can never kill a unit

### Requirement: Overrides are session-scoped
Max HP and movement overrides SHALL exist only for the current session and SHALL NOT be
persisted. Reloading the game SHALL discard all overrides and restore the default
archetype values. Turning admin mode off SHALL NOT by itself discard committed overrides
(they remain in effect for the session); only a reload resets them.

#### Scenario: Reload discards overrides
- **WHEN** overrides have been set and the game is reloaded
- **THEN** all archetypes SHALL use their default max HP and movement values

#### Scenario: Turning admin off keeps committed overrides for the session
- **WHEN** the designer commits an override and then turns admin mode off
- **THEN** the committed override SHALL remain in effect for the rest of the session
