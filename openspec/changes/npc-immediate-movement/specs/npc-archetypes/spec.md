**App**: dungeon-tactics-solo

## MODIFIED Requirements

### Requirement: NPC movement via committed A* path
When the NPC AI plans an NPC's turn, it SHALL use A* pathfinding to find the shortest route toward the target, treating other NPCs and PCs as passable for routing purposes but stopping at structures. The path SHALL be trimmed to the NPC's move range. The NPC's movement SHALL be executed **immediately**, at the moment it is that NPC's turn to plan, against the current board state — not deferred to a later batched playback phase. Because each NPC plans and moves in turn order, every NPC SHALL compute its route against the board as it stands after all prior NPCs in the round have already moved. The NPC's movement SHALL NOT be telegraphed as an intended-route overlay; no movement polyline SHALL be drawn. As the move takes effect, the NPC SHALL animate stepping through each cell of the computed path in order at a consistent per-tile speed.

#### Scenario: NPC path computed via A*
- **WHEN** the NPC AI plans movement toward a target
- **THEN** the route SHALL be the shortest orthogonal path, treating structures as impassable and other units as passable, trimmed to the NPC's move range

#### Scenario: NPC moves immediately in turn order
- **WHEN** it becomes an NPC's turn during the NPC phase
- **THEN** that NPC's movement SHALL be applied immediately against the current board state before the next NPC plans, with no separate batched `npc-playback` movement step replaying all NPC moves afterward

#### Scenario: NPC plans against the post-move board of prior NPCs
- **WHEN** an NPC plans its turn and earlier NPCs in the same round have already moved
- **THEN** its A* route SHALL be computed against the board reflecting those completed moves

#### Scenario: NPC movement is not telegraphed
- **WHEN** an NPC takes its turn
- **THEN** no intended-route movement polyline SHALL be drawn for that NPC; the movement is simply executed

#### Scenario: NPC move animates through each cell
- **WHEN** an NPC's move is applied
- **THEN** the NPC SHALL animate through each cell of its computed path in sequence at a consistent per-tile speed
