## MODIFIED Requirements

### Requirement: Structures are authored onto the board

During placement, the engine SHALL let a host place a structure of a given kind
on a tile, remove a structure, and move a structure to another tile. A structure
SHALL carry the HP its kind is worth unless an HP is supplied, and moving one
SHALL preserve its kind and its current HP.

Placing or moving a structure SHALL be refused, with a reason, when the target
tile lies outside the board, already holds a structure, or holds a unit.
Removing SHALL be refused when the tile holds no structure.

A board SHALL hold **at most one tower**: placing a tower SHALL be refused, with
a reason naming the tile the existing tower stands on, when the board already
holds one. Power centers SHALL NOT be constrained in number — a board may hold
none, one, or many.

Moving and removing SHALL NOT apply the tower rule. Moving the one tower leaves
one tower, and removing it SHALL be allowed so that a misplaced tower can be
corrected; a board with no tower is an authoring state that cannot be *started*,
which the turn sequencer refuses rather than this surface.

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

#### Scenario: A second tower is refused

- **WHEN** a tower is placed on an empty in-bounds tile while the board already
  holds a tower
- **THEN** the placement is refused with a reason naming the tile the existing
  tower stands on, and the board is unchanged

#### Scenario: Power centers are not limited

- **WHEN** several power centers are placed on empty in-bounds tiles
- **THEN** each is placed, and the board holds them all

#### Scenario: The one tower can be moved

- **WHEN** the board's only tower is moved to another empty tile
- **THEN** the move succeeds, and the board still holds exactly one tower

#### Scenario: The tower can be removed

- **WHEN** the board's only tower is removed
- **THEN** the removal succeeds and the board holds no tower, and a tower can be
  placed again afterwards
