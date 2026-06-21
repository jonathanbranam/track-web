**App**: games

## Purpose

Defines requirements for the grid-rendering prototype: a turn-based tactics demo rendered with Phaser primitives on a fixed 6×6 map.

## Requirements

### Requirement: Grid rendering prototype entry
The system SHALL include a `grid-rendering` entry in the prototype sub-registry with name "Grid Rendering" and a short description. Tapping it from the picker SHALL navigate to `/game/prototypes/grid-rendering` and mount the prototype.

#### Scenario: Grid rendering appears in prototype picker
- **WHEN** a user opens `/game/prototypes`
- **THEN** "Grid Rendering" is listed as a prototype card

#### Scenario: Tapping navigates to prototype
- **WHEN** a user taps the Grid Rendering card
- **THEN** the app navigates to `/game/prototypes/grid-rendering` and the prototype mounts

### Requirement: Fixed 6×6 map with terrain and structures
The system SHALL render a fixed 6×6 grid. Each cell SHALL have a terrain type (`plains`, `forest`, `water`, or `stone`) represented by a distinct background fill color. The map layout SHALL be:

```
     col 0    col 1    col 2    col 3    col 4    col 5
row 0: forest  plains   water    stone    water    forest
row 1: plains  stone    forest   water    stone    plains
row 2: stone   water    plains   forest   plains   stone
row 3: water   [S]      stone    forest   [S]      plains
row 4: plains  forest   water    stone    forest   water
row 5: forest  stone    plains   water    stone    forest
```

Where `[S]` denotes a structure. Structures SHALL be rendered as a visually distinct shape inside the tile (e.g. a filled rectangle with a different color). Structures are impassable.

#### Scenario: Terrain colors are distinct
- **WHEN** the grid is rendered
- **THEN** each terrain type (`plains`, `forest`, `water`, `stone`) uses a visually distinct fill color for its tile background

#### Scenario: Structures are visually distinct
- **WHEN** the grid is rendered
- **THEN** cells at (row 3, col 1) and (row 3, col 4) display a structure marker that is visually distinct from terrain and units

### Requirement: Unit rendering using Phaser primitives
The system SHALL render all units (PCs and NPCs) as filled geometric shapes using Phaser Graphics primitives. No external sprite assets SHALL be used. PCs and NPCs SHALL use visually distinct fill colors and stroke colors. Individual units SHALL be distinguishable from one another.

#### Scenario: PCs render as distinct shapes
- **WHEN** the grid is rendered during the player phase
- **THEN** the two PCs appear at (row 5, col 0) and (row 5, col 5) as filled shapes with a color unique to player characters

#### Scenario: NPCs render as distinct shapes
- **WHEN** the grid is rendered during the player phase
- **THEN** the four NPCs appear at their starting positions as filled shapes with a color unique to enemies, visually different from PC shapes

### Requirement: Camera zoom and pan
The system SHALL support zooming the Phaser camera via mouse scroll wheel on desktop and two-finger pinch on mobile. Zoom SHALL be clamped to a minimum and maximum level. The system SHALL support panning the camera by dragging on an empty tile. Tapping (short press without drag) on a unit or tile SHALL trigger selection, not pan.

#### Scenario: Scroll wheel zooms the map
- **WHEN** a user scrolls the mouse wheel over the game canvas
- **THEN** the camera zooms in or out, keeping the map visible within its bounds

#### Scenario: Pinch gesture zooms on mobile
- **WHEN** a user performs a two-finger pinch on the game canvas
- **THEN** the camera zooms in or out proportionally to the pinch distance change

#### Scenario: Drag pans the camera
- **WHEN** a user drags on the canvas with a pointer travel distance greater than 5px
- **THEN** the camera scrolls in the drag direction

#### Scenario: Short tap does not pan
- **WHEN** a user taps with pointer travel less than 5px
- **THEN** the event is treated as a tap (selection), not a pan

### Requirement: Planning phase — PC selection and action assignment
During the player phase the system SHALL allow the player to assign a move plan and/or an attack direction to each PC in any order. Plans SHALL be assignable, replaceable, and clearable at any time before "Done" is pressed. No PC action SHALL execute during the planning phase.

#### Scenario: Tapping a PC selects it
- **WHEN** the player taps a PC tile during the player phase
- **THEN** the PC is selected (visually highlighted) and the action menu shows "Move", "Attack", and "Cancel"

#### Scenario: Re-selecting a planned PC replaces its plan
- **WHEN** the player taps a PC that already has a plan assigned
- **THEN** the PC is selected again and the player can assign a new plan, replacing the previous one

#### Scenario: Cancel clears selection
- **WHEN** the player taps "Cancel" while a PC is selected
- **THEN** the selection is cleared and no plan changes are made

### Requirement: Planning phase — move planning with ghost and arrow
When the player selects "Move" for a PC the system SHALL highlight valid destination tiles and, upon selection, render a move arrow and a ghost PC at the planned destination.

#### Scenario: Valid move destinations are highlighted
- **WHEN** the player taps "Move" for a selected PC
- **THEN** only orthogonally adjacent tiles that are empty (no structure, no PC, no NPC) are highlighted as valid destinations

#### Scenario: Move arrow and ghost rendered after selection
- **WHEN** the player taps a valid destination tile
- **THEN** an arrow is drawn from the PC's current position to the destination, and a ghost PC (reduced opacity or dashed outline) is rendered at the destination

#### Scenario: Diagonal moves are not offered
- **WHEN** the player taps "Move" for a selected PC
- **THEN** diagonal tiles are not highlighted as valid destinations

#### Scenario: Occupied tiles are not offered as move destinations
- **WHEN** the player taps "Move" for a selected PC
- **THEN** tiles containing structures, other PCs, or NPCs are not highlighted

### Requirement: Planning phase — attack direction planning
When the player selects "Attack" for a PC the system SHALL highlight the four orthogonal tiles around the PC's planned destination (or current position if no move is planned). The player taps one tile to set the attack direction. Attack is a cardinal direction, not a specific target.

#### Scenario: Attack highlights four orthogonal squares around planned position
- **WHEN** the player taps "Attack" after assigning a move plan
- **THEN** the four orthogonal squares around the planned destination are highlighted (regardless of what occupies them)

#### Scenario: Attack highlights four orthogonal squares around current position when no move planned
- **WHEN** the player taps "Attack" without a move plan
- **THEN** the four orthogonal squares around the PC's current position are highlighted

#### Scenario: Tapping an attack square sets the direction
- **WHEN** the player taps one of the four highlighted attack squares
- **THEN** an attack direction indicator is rendered in the upper-right corner of that square and the attack direction is recorded in the plan

#### Scenario: Attack square tap works when an enemy occupies it
- **WHEN** the player taps a highlighted attack square that contains an NPC
- **THEN** the attack direction is set normally (the tap is treated as a cell tap, not a unit-select tap)

### Requirement: Planning phase — Done button
A persistent "Done" button SHALL be visible throughout the player phase. Tapping it SHALL commit all current plans and begin PC playback. The player phase SHALL NOT end automatically.

#### Scenario: Done button is always visible during player phase
- **WHEN** the player phase is active
- **THEN** the "Done" button is rendered on screen at all times

#### Scenario: Done triggers PC playback
- **WHEN** the player taps "Done"
- **THEN** the planning phase ends and PC actions begin resolving in plan-assignment order

#### Scenario: Round does not end without Done
- **WHEN** all PCs have plans assigned but the player has not tapped "Done"
- **THEN** no actions resolve and the player may continue modifying plans

### Requirement: PC playback phase
After the player taps "Done" the system SHALL animate PC plan resolutions one at a time in the order plans were last assigned. Player input SHALL be blocked during playback.

#### Scenario: PC plans resolve in assignment order
- **WHEN** PC playback begins
- **THEN** the first PC whose plan was last assigned resolves first, then the next, and so on

#### Scenario: Move animation plays before attack
- **WHEN** a PC has both a move and an attack planned
- **THEN** the move tween completes before the attack flash plays

#### Scenario: Blocked move does not cancel attack
- **WHEN** a PC's planned destination is occupied at resolution time
- **THEN** the PC stays in place and still attacks in the planned direction from its actual position

#### Scenario: Attack removes NPC in the attacked direction
- **WHEN** a PC attacks in a direction that contains an NPC
- **THEN** the NPC is removed and the attack flash animation plays on that tile

#### Scenario: Attack on PC or empty tile has no effect
- **WHEN** a PC attacks in a direction that contains another PC or no unit
- **THEN** no unit is removed; only the attack flash animation plays

#### Scenario: Ghost and arrows cleared at playback start
- **WHEN** PC playback begins
- **THEN** all move arrows and ghost PC sprites are removed from the scene

### Requirement: NPC playback phase
After all PC actions resolve the system SHALL animate NPC actions one at a time. NPCs march toward the bottom of the map (increasing row). Player input SHALL remain blocked during NPC playback.

#### Scenario: NPC on row 3 exits the map
- **WHEN** it is an NPC's turn during NPC playback and the NPC is on row 3
- **THEN** the NPC animates off the bottom edge of the map and is removed

#### Scenario: NPC moves down to empty square
- **WHEN** it is an NPC's turn and the tile directly below is empty
- **THEN** the NPC animates moving one square downward

#### Scenario: NPC blocked below tries left then right
- **WHEN** it is an NPC's turn and the tile below is occupied by a structure or another NPC
- **THEN** the NPC attempts to move left; if also blocked, it attempts right; if both blocked, it stays

#### Scenario: NPC blocked by PC attacks instead
- **WHEN** it is an NPC's turn and the tile below is occupied by a PC
- **THEN** the NPC does not move and an attack flash animation plays on the NPC tile and the PC tile; the PC is unaffected

### Requirement: Round end and reset
After all NPC actions resolve the system SHALL clear all plans and return to the player phase with all PCs ready for new plan assignment.

#### Scenario: Plans cleared after NPC playback
- **WHEN** NPC playback completes
- **THEN** all move arrows, ghost PCs, attack indicators, and plan records are removed and the player phase begins again
