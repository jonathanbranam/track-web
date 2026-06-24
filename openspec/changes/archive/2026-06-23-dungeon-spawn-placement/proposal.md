## Why

When a Dungeon Tactics match begins, the player's four PCs are pre-placed on fixed
bottom-row tiles while the enemies and structures are already in position. The player
has no say in where their units start, removing a meaningful tactical decision. Adding
a "turn 0" placement phase — where the player positions each PC inside a defended spawn
zone before combat begins — gives the player agency over their opening and makes the
power-generator structures matter as the line the team forms up behind.

## What Changes

- **New turn-0 placement phase**: the match opens in a `placement` phase before the
  normal player turn. PCs appear on the board inside the spawn zone, and the player can
  move them around freely within that zone before combat starts.
- **Spawn zone defined by the power generators**: PCs may only be placed on tiles within
  the zone formed by the power-center structures. The zone is the region one square
  "behind" each power center (the side facing the player) plus the perimeter connecting
  those tiles. PCs can be anywhere inside that perimeter; tiles outside it, structure
  tiles, and occupied tiles are not valid placements.
- **Spawn-zone highlight**: render the placement zone with a distinct highlight color
  (yellow), reusing the same overlay treatment already used for move-destination and
  attack-target tiles.
- **Move units within the zone**: selecting a PC during placement lets the player pick a
  new tile for it inside the spawn zone (a swap/relocate, not a combat move). Units can
  be repositioned any number of times until the player commits.
- **"Done" commits placement and starts the game**: pressing Done fixes all PC positions
  and transitions into the first normal player turn (`phase: 'player'`).
- **NPCs are visible but inert during placement**: the enemies appear on the board in
  their starting positions but have no planned move or attack shown during turn 0; NPC
  planning happens as usual once the game starts.
- **BREAKING (gameplay)**: PCs are no longer pre-positioned at fixed bottom-row tiles on
  match start; their starting positions are chosen by the player during turn 0.

## Capabilities

### New Capabilities
- `dungeon-tactics-spawn-placement`: The turn-0 placement phase — how the spawn zone is
  derived from the power-center structures, which tiles are valid, how PCs are placed and
  repositioned within the zone, the yellow zone highlight, the inert-NPC presentation
  during placement, and how "Done" commits positions and starts the first player turn.

### Modified Capabilities
- `dungeon-tactics-solo`: `initialState` no longer starts the game in the `player` phase
  with PCs at fixed bottom-row coordinates; instead the game begins in the new placement
  phase. The `TurnPhase` set gains a `placement` member. (PC archetype/HP assignment is
  unchanged.)

## Impact

- `client-games/src/games/dungeon-tactics-solo/types.ts` — add `placement` to `TurnPhase`;
  possibly a spawn-zone helper type.
- `client-games/src/games/dungeon-tactics-solo/map.ts` / `turn.ts` — derive the spawn-zone
  tile set from the power-center structure positions.
- `client-games/src/games/dungeon-tactics-solo/pc.ts` — placement-time selection and
  relocate helpers; valid-placement-tile query.
- `client-games/src/games/dungeon-tactics-solo/npc.ts` — `initialState` begins in
  `placement`; defer NPC plan computation/display until the game starts.
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsScene.ts` — render the yellow
  spawn-zone overlay, draw inert NPCs, handle placement taps and the Done button during
  turn 0.
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsGame.tsx` — drive the
  placement phase and the transition to the first player turn on Done.
- `openspec/specs/dungeon-tactics-solo/spec.md` — update initial-state / turn-phase
  scenarios affected by the new opening phase.
