**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: Turn-0 placement phase on match start
A Dungeon Tactics match SHALL open in a `placement` phase ("turn 0") before the first
normal player turn. During this phase the four PCs SHALL appear on the board at their
fixed starting tiles inside the spawn zone, and the five NPCs SHALL appear at their
starting positions but SHALL be inert — no NPC planned move or attack is computed for
display or animated while the phase is `placement`. Inertness does not prevent inspection:
the player MAY tap an NPC to open its info dialog and read its stats (see "Inspecting units
during placement"). Normal selection/planning of PCs for movement and attacks SHALL NOT be
available during placement; only repositioning within the spawn zone (see "Reposition PCs
within the spawn zone") is allowed.

#### Scenario: Game initializes into placement phase
- **WHEN** the game initializes via `initialState()`
- **THEN** `GameState.phase` SHALL be `placement`
- **AND** all four PCs SHALL be present on the board, each on a tile inside the spawn zone
- **AND** all five NPCs SHALL be present at their starting positions

#### Scenario: NPCs are inert during placement
- **WHEN** the phase is `placement`
- **THEN** no NPC SHALL have a planned move or attack rendered on the board

#### Scenario: Combat planning is unavailable during placement
- **WHEN** the phase is `placement` and the player taps a PC
- **THEN** the game SHALL NOT enter move/attack planning; the only board interaction available for that PC is repositioning within the spawn zone (see "Reposition PCs within the spawn zone")

### Requirement: Inspecting units during placement
During the `placement` phase the player SHALL be able to tap any unit — PC or NPC — to open
its info dialog and read its stats, without affecting the unit's inertness or entering any
combat planning. Tapping an NPC SHALL open the same info-only popup used during combat
(portrait, name/archetype, HP/Move stat lines, Close control) and SHALL NOT show a planned
move or attack for that NPC. An inspected NPC SHALL NOT be repositioned: a subsequent board
tile tap while an NPC is selected SHALL dismiss its dialog rather than move it.

#### Scenario: Inspecting an NPC opens an info-only dialog
- **WHEN** the phase is `placement` and the player taps an NPC
- **THEN** the NPC info dialog SHALL open, showing its portrait, name, and HP/Move stats
- **AND** no planned move or attack SHALL be rendered for that NPC

#### Scenario: An inspected NPC is not repositioned
- **WHEN** the phase is `placement`, an NPC is selected, and the player taps a board tile
- **THEN** the NPC SHALL remain on its current tile and its dialog SHALL be dismissed

### Requirement: Unit dialog during placement with Attack disabled
Selecting a PC during the `placement` phase SHALL open the unit info dialog — the same
popup used during combat, showing the portrait, name/archetype, HP/Move/Attack stat lines,
and a Close dismiss control. The dialog's Attack action button SHALL be present but
disabled: it SHALL render in a visibly disabled, non-active style and SHALL NOT respond to
taps, so tapping it SHALL NOT enter attack planning or toggle any active state. The Close
control SHALL still dismiss the dialog and clear the selection.

#### Scenario: Selecting a PC opens the dialog
- **WHEN** the phase is `placement` and the player taps a PC
- **THEN** the unit info dialog for that PC SHALL open, showing its portrait, name, and HP/Move/Attack stats

#### Scenario: Attack button is disabled during placement
- **WHEN** the unit dialog is open during the `placement` phase
- **THEN** the Attack button SHALL be shown in a disabled style
- **AND** tapping the Attack button SHALL have no effect (no attack planning, no active highlight)

#### Scenario: Close dismisses the placement dialog
- **WHEN** the unit dialog is open during the `placement` phase and the player taps Close (X)
- **THEN** the dialog SHALL close and the PC SHALL no longer be selected

### Requirement: Spawn zone defined by the authored placement map
The spawn zone SHALL be exactly the set of placeable tiles in the placement map authored
in the change's `design.md` — a fixed, hand-authored layout. The implementation SHALL
encode this exact map rather than deriving the zone at runtime. The placeable tiles are:

- row 4: `(6,4) (7,4) (8,4) (9,4) (10,4)`
- row 5: `(3,5) (4,5) (5,5) (6,5) (7,5) (8,5) (9,5) (10,5) (11,5) (12,5) (13,5)`
- row 6: `(3,6) (4,6) (5,6) (6,6) (7,6) (9,6) (10,6) (11,6) (12,6) (13,6)`
- row 7: `(1,7) (2,7) (3,7) (4,7) (5,7) (6,7) (7,7) (8,7) (9,7) (10,7) (11,7) (12,7) (13,7) (14,7) (15,7)`

The center front line is row 4, just behind the forward power center at `(8,3)`. Any tile
not in this set — including the forward generator `(8,3)` and its row-3 rank in front of
the zone, other structure tiles (power centers and the tower), the trimmed flank corners,
and out-of-bounds positions — SHALL NOT be a valid spawn tile.

#### Scenario: Spawn zone equals the authored map
- **WHEN** the spawn zone is computed
- **THEN** it SHALL contain exactly the placeable tiles listed above (41 tiles) and no others

#### Scenario: Interior tile is in the zone
- **WHEN** the spawn zone is computed
- **THEN** a tile inside the authored zone, such as `(8,4)`, SHALL be a valid spawn tile

#### Scenario: Tile in front of the generator line is excluded
- **WHEN** the spawn zone is computed
- **THEN** a tile in front of the power-center line (toward the NPC spawn edge), such as `(8,1)` or the forward generator's rank `(8,3)`, SHALL NOT be a valid spawn tile

#### Scenario: Structure tiles are excluded
- **WHEN** the spawn zone is computed
- **THEN** no tile occupied by a power center or the tower (e.g. `(8,6)`) SHALL be a valid spawn tile

#### Scenario: Trimmed flank tiles are excluded
- **WHEN** the spawn zone is computed
- **THEN** flank tiles omitted by the authored map, such as `(0,7)` and `(1,6)`, SHALL NOT be valid spawn tiles even though they hold no structure

### Requirement: Fixed initial PC positions
`initialState` SHALL place each of the four PCs at the fixed default start tile marked for
its archetype in the authored placement map. The four starting tiles SHALL be distinct and
SHALL be: melee `(4,5)`, ranger `(6,5)`, magic-user `(10,5)`, rogue `(13,5)`.

#### Scenario: PCs start at the fixed spawn tiles
- **WHEN** the game initializes
- **THEN** the melee PC SHALL be at `(4,5)`, the ranger at `(6,5)`, the magic-user at `(10,5)`, and the rogue at `(13,5)`

#### Scenario: Fixed start tiles are inside the spawn zone
- **WHEN** the spawn zone is computed at match start
- **THEN** each of the four PC starting tiles SHALL be a member of the spawn zone

### Requirement: Reposition PCs within the spawn zone
During the `placement` phase the player SHALL be able to move PCs freely within the spawn
zone. Selecting a PC and then tapping a valid spawn-zone tile that is empty SHALL relocate
that PC to the tapped tile. Tapping a tile outside the spawn zone, a structure tile, or a
tile already occupied by another unit SHALL NOT relocate the PC. PCs MAY be repositioned
any number of times until placement is committed.

#### Scenario: Relocate a PC to an empty in-zone tile
- **WHEN** the phase is `placement`, a PC is selected, and the player taps an empty tile inside the spawn zone
- **THEN** that PC SHALL move to the tapped tile

#### Scenario: Tapping outside the zone does not relocate
- **WHEN** the phase is `placement`, a PC is selected, and the player taps a tile outside the spawn zone
- **THEN** the PC SHALL remain on its current tile

#### Scenario: Tapping an occupied tile does not relocate
- **WHEN** the phase is `placement`, a PC is selected, and the player taps a spawn-zone tile occupied by another unit
- **THEN** the PC SHALL remain on its current tile

#### Scenario: Repositioning is repeatable
- **WHEN** the phase is `placement` and the player relocates a PC and then relocates it again
- **THEN** both relocations SHALL take effect in order, with the PC ending on the last valid tapped tile

### Requirement: Spawn zone highlight
During the `placement` phase the scene SHALL highlight every valid spawn-zone tile using a
yellow overlay rendered with the same visual treatment used for move-destination and
attack-target tiles. The highlight SHALL be shown only while the phase is `placement`.

#### Scenario: Zone is highlighted yellow during placement
- **WHEN** the phase is `placement`
- **THEN** every valid spawn-zone tile SHALL be drawn with a yellow highlight matching the move/target tile overlay style

#### Scenario: Highlight is removed after placement
- **WHEN** the phase transitions out of `placement`
- **THEN** the spawn-zone highlight SHALL no longer be rendered

### Requirement: Done commits placement and starts the game
The scene SHALL present a Done control during the `placement` phase. Pressing Done SHALL
fix all PC positions, transition `GameState.phase` to `player` (the first normal player
turn), remove the spawn-zone highlight, and allow NPC planning to proceed as normal.

#### Scenario: Done starts the first player turn
- **WHEN** the phase is `placement` and the player presses Done
- **THEN** `GameState.phase` SHALL become `player`
- **AND** the PCs SHALL retain the positions they held when Done was pressed

#### Scenario: NPC planning resumes after Done
- **WHEN** the game enters the `player` phase after Done
- **THEN** NPC plans SHALL be computed and the spawn-zone highlight SHALL no longer be shown
