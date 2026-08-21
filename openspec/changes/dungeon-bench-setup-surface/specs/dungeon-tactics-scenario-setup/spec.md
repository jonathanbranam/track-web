**App**: all

## Purpose

Lets a design bench author a starting position outright — board structures and
units of either side, on any tile, at any starting HP — as an engine surface
fenced to the bench and to the placement phase, so that setting up a scenario is
refereed by the same engine that referees playing it.

## ADDED Requirements

### Requirement: A scenario is authored from an empty starting position

The engine SHALL expose an operation that produces a starting position from a
board's cells: no units, no spawn zones, and the round in the **placement**
phase. This is the bench's counterpart to the game's loaded starting position,
and it SHALL be the only way a host obtains an authored starting position — no
host constructs one itself.

The scenario SHALL leave placement by the engine's existing scenario-start
transition, so an authored scenario and a loaded one enter the round the same
way.

#### Scenario: A new scenario starts in placement

- **WHEN** a scenario is created from a board's cells
- **THEN** the state holds those cells, no units, no spawn zones, and the round
  is in the placement phase

#### Scenario: An authored scenario enters the round like a loaded one

- **WHEN** a scenario authored this way is started
- **THEN** the round is in the enemy movement phase, exactly as it is after the
  game's loaded starting position is started

### Requirement: The scenario-setup surface is fenced to the bench and to placement

Every scenario-setup operation SHALL be refused unless the engine is running in
bench mode. Every operation that takes an existing state SHALL additionally be
refused unless the round is in the **placement** phase.

A refusal SHALL carry a human-readable reason and SHALL leave the state
unchanged. The reason SHALL say which fence was hit, so a host can tell "the
game cannot do this at all" from "not at this point in the round".

This fence covers two different kinds of thing, and the difference matters: the
engine's bench-only rule-break (amending a locked telegraph) is a rule the game
must never reach, while this surface is an authoring affordance the game simply
has no use for. Neither implies the bench plays by different rules once a
scenario has started.

#### Scenario: The game cannot author a scenario

- **WHEN** a scenario-setup operation is called while the engine is in game mode
- **THEN** it is refused with a reason, and no state is changed

#### Scenario: Setup is refused once the scenario has started

- **WHEN** a unit is placed while the round is in the player phase, the enemy
  movement phase, or the telegraph resolution phase
- **THEN** the placement is refused with a reason naming the phase, and the state
  is unchanged

### Requirement: Units are authored onto any tile

During placement, the engine SHALL let a host place a unit of any archetype on
any tile, **regardless of the game's spawn zones**; remove a unit; relocate a
unit without spending any part of its turn; set a unit's current HP; and clear
every unit from the board.

A placement or relocation SHALL be refused, with a reason, when the target tile
lies outside the board, already holds a unit, or holds a structure. A placed
unit SHALL start at its archetype's maximum HP unless a starting HP is supplied.
Setting HP SHALL be refused below 1 — removing the unit is the way to take it
off the board.

Every one of these facts is the engine's: no host SHALL decide tile occupancy,
structure blocking, or a starting HP for itself.

#### Scenario: A unit is placed outside every spawn zone

- **WHEN** a unit is placed on an empty tile that belongs to no spawn zone
- **THEN** the unit is placed there

#### Scenario: An occupied, obstructed, or off-board tile is refused

- **WHEN** a unit is placed on a tile that already holds a unit, holds a
  structure, or lies outside the board
- **THEN** the placement is refused with a reason, and the state is unchanged

#### Scenario: A placed unit starts at full health

- **WHEN** a unit is placed without a starting HP
- **THEN** its HP is its archetype's maximum, taken from the unit-definition
  store, including any session override in force

#### Scenario: Relocation is not a turn

- **WHEN** a unit is relocated during placement to a tile beyond its movement
  range
- **THEN** it stands on that tile, and nothing about its turn — remaining
  movement, or having attacked — is changed

#### Scenario: HP cannot be set to zero

- **WHEN** a unit's HP is set to zero or below
- **THEN** the operation is refused with a reason, and the unit is untouched

### Requirement: The engine names an authored unit

The engine SHALL assign every authored unit its id. An id SHALL identify the
unit's archetype, and SHALL be unique among the units in the state it is being
added to.

The id SHALL be derived from that state alone. A host SHALL NOT have to carry a
counter for the engine, so that installing units the host did not place —
stepping back through a timeline, or restoring a saved position whose ids have
gaps — cannot produce a collision.

#### Scenario: Two units of one archetype get distinct ids

- **WHEN** two units of the same archetype are placed
- **THEN** they have different ids, and both name that archetype

#### Scenario: An id does not collide after units arrive from elsewhere

- **WHEN** a state whose unit ids have gaps in their numbering is handed back to
  the engine and another unit of that archetype is placed
- **THEN** the new unit's id matches no unit already in that state

### Requirement: Structures are authored onto the board

During placement, the engine SHALL let a host place a structure of a given kind
on a tile, remove a structure, and move a structure to another tile. A structure
SHALL carry the HP its kind is worth unless an HP is supplied, and moving one
SHALL preserve its kind and its current HP.

Placing or moving a structure SHALL be refused, with a reason, when the target
tile lies outside the board, already holds a structure, or holds a unit.
Removing SHALL be refused when the tile holds no structure.

#### Scenario: A structure is placed on an empty tile

- **WHEN** a structure of a given kind is placed on an empty in-bounds tile
- **THEN** that cell holds a structure of that kind, at the HP its kind is worth

#### Scenario: A structure cannot be stacked or dropped on a unit

- **WHEN** a structure is placed on a tile that holds a unit or another structure
- **THEN** the placement is refused with a reason, and the board is unchanged

#### Scenario: Moving a structure carries its damage with it

- **WHEN** a damaged structure is moved to an empty tile
- **THEN** the destination holds that structure at the HP it had, and the origin
  cell holds no structure

#### Scenario: A structure changes what the board reports

- **WHEN** a structure is placed on a tile that a unit could previously path
  through or shoot across
- **THEN** the engine's movement and threat queries account for it on the next
  read, exactly as for a structure that came from loaded board content
