# Design: dungeon-spawn-placement

## Context

Dungeon Tactics opens with all nine units already on the board: four PCs hard-coded to the
bottom row in `initialState()` (`npc.ts`) and five NPCs near the top edge. The game state
machine (`GameState.phase`) has three phases — `player`, `pc-playback`, `npc-playback` —
and the scene only renders selection/walk/attack overlays and computes NPC plans while in
`player`. This change inserts a **turn-0 `placement` phase** in which the player drags each
PC around a defended spawn zone and then presses **Done** to begin the real game.

Key existing facts the design builds on:
- The board is `GRID_COLS = 16` × `GRID_ROWS = 8`. Power centers sit at `(8,2)`, `(5,4)`,
  `(11,4)`, `(2,6)`, `(14,6)`; the tower at `(8,6)`. NPCs spawn from the top edge, so the
  player's "back line" is the bottom row, `row = GRID_ROWS - 1 = 7`.
- `structureKeys(cells)` (`turn.ts`) already yields the set of structure tiles; `occupiedKey(units)`
  yields occupied tiles. The spawn-zone query reuses both.
- Tile highlighting lives in `drawHighlights()` (`DungeonTacticsScene.ts`): walk tiles are
  green `0x00ff88`, attack tiles orange `0xff6600`, each a `strokeRect` + 0.15-alpha
  `fillRect`. The placement zone reuses this exact treatment in yellow `0xffff00`.
- The HUD (Reset/Done/confirm modal) is drawn in-canvas by the scene's UI camera and emits
  events (`hud-done-confirm`, `hud-reset`, `cell-tapped`, `unit-tapped`) that
  `DungeonTacticsGame.tsx` handles by mutating `stateRef.current` and calling `redraw`.

## Goals / Non-Goals

**Goals**
- Add a `placement` phase that the game starts in; PCs begin at fixed tiles inside the
  spawn zone; the player can relocate them freely within the zone; **Done** commits and
  starts the first `player` turn.
- Derive the spawn zone deterministically from the power-center positions: every
  non-structure tile behind the power-center line, down to the back row.
- Render the zone with a yellow highlight matching the existing overlay style.
- Keep NPCs visible but inert (no planned move/attack shown) during placement.

**Non-Goals**
- No change to combat, NPC AI, pathfinding, attack resolution, or playback.
- No per-unit placement order/turn-taking UI — all four PCs are on the board at once and
  any of them can be moved in any order.
- No randomized or persisted spawn layouts; starting tiles are fixed constants.
- No new server/API/CLI surface — this is a client-only, in-memory game feature.

## The map and the spawn zone

16×8 grid, drawn top (NPC edge, row 0) to bottom (player back line, row 7). Legend:
`N` NPC start · `P` power center · `T` tower · `Y` valid spawn tile (yellow) ·
`1` melee start · `2` ranger start · `3` magic-user start · `4` rogue start · `.` not placeable.

```
        col→  0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
row 0        .   .   .   .   N   .   .   N   .   .   N   .   .   .   .   .
row 1        N   .   .   .   .   .   .   .   .   .   .   .   .   .   .   N
row 2        .   .   .   .   .   .   .   .   P   .   .   .   .   .   .   .
row 3        .   .   .   .   .   .   .   Y   Y   Y   .   .   .   .   .   .
row 4        .   .   .   .   .   P   Y   Y   Y   Y   Y   P   .   .   .   .
row 5        .   .   .   Y   1   Y   2   Y   Y   Y   3   Y   Y   4   .   .
row 6        .   .   P   Y   Y   Y   Y   Y   T   Y   Y   Y   Y   Y   P   .
row 7        .   Y   Y   Y   Y   Y   Y   Y   Y   Y   Y   Y   Y   Y   Y   Y
```

This map is the single source of truth for both the valid spawn zone and the default PC
start positions — there is no separate derivation to keep in sync. The zone is the
arc-shaped region "behind" the generators: it bulges forward to row 3 in the center
(behind the forward `(8,2)` generator) and recedes toward the back row on the flanks.
Structure tiles (the power centers `(5,4)`, `(11,4)`, `(2,6)`, `(14,6)` and the tower
`(8,6)`) and the excluded flank corners are not placeable. NPC starts are all in front of
the line and thus outside the zone.

## Decisions

### 1. Spawn zone = the exact authored map, encoded literally

The valid spawn tiles are exactly the placeable cells (`Y` and the four PC-start markers)
in the map above — a fixed, hand-authored layout, not a runtime-derived approximation. The
map is encoded literally in `map.ts` as a constant (e.g. `SPAWN_ZONE_LAYOUT`: one string
per row mirroring the drawing, or an explicit list of `{col,row}`), and a
`spawnZoneTiles()` helper (in `map.ts` or `turn.ts`, next to `structureKeys`) returns the
`Set<string>` of `"c,r"` keys for those cells. The placeable set is:

```
row 3: (7,3) (8,3) (9,3)
row 4: (6,4) (7,4) (8,4) (9,4) (10,4)
row 5: (3,5) (4,5) (5,5) (6,5) (7,5) (8,5) (9,5) (10,5) (11,5) (12,5) (13,5)
row 6: (3,6) (4,6) (5,6) (6,6) (7,6) (9,6) (10,6) (11,6) (12,6) (13,6)
row 7: (1,7) (2,7) (3,7) (4,7) (5,7) (6,7) (7,7) (8,7) (9,7) (10,7) (11,7) (12,7) (13,7) (14,7) (15,7)
```

(44 tiles. The structure holes `(8,6)` tower and `(2,6)`/`(14,6)` power centers, and the
excluded flank corners on rows 6–7, are simply absent from the layout.)

**Why encode the literal map over computing geometry at runtime?** The layout is
hand-authored fixed map data; a literal copy is trivially testable, matches the drawing
byte-for-byte, and stays correct even though the shape is not a clean "fill behind a front
line" (the flank corners are trimmed). Computing it from generator positions would only
approximate the authored shape.

### 2. New `placement` phase, entered by `initialState`

Add `placement` to the `TurnPhase` union in `types.ts`. `initialState()` returns
`phase: 'placement'` and seeds the four PCs at fixed tiles (decision 3). NPC plan
computation (`computeNpcPlans`) still runs so the data exists, but **no NPC overlay is
drawn** while `phase === 'placement'` — `drawPlanningOverlay()` already early-returns unless
`phase === 'player'`, so NPC plan visuals are naturally suppressed; we keep that guard.

**Why a dedicated phase rather than a boolean flag?** The scene and game already branch on
`phase`; a new enum member slots into every existing `phase !== 'player'` guard (taps,
overlays, playback) for free, keeping placement cleanly outside the combat loop.

### 3. Fixed initial PC positions

The default PC start tiles are the four marked positions in the map above — fixed, spread
left→right along the forward rank of the zone, all inside the zone and mutually distinct:

| PC | archetype | start tile (map marker) |
|----|-----------|-------------------------|
| pc-0 | melee | `(4,5)` — `1` |
| pc-1 | ranger | `(6,5)` — `2` |
| pc-2 | magic-user | `(10,5)` — `3` |
| pc-3 | rogue | `(13,5)` — `4` |

### 4. Repositioning during placement

While `phase === 'placement'`, board taps route differently from combat:
- Tapping a PC selects it (`selectedUnitId`) and **opens the unit info dialog**, but with
  no planning phase. A new placement helper (e.g. `selectForPlacement(state, id)` in
  `pc.ts`, or reuse `selectUnit` with the `placement` phase suppressing the planning phase)
  marks the chosen unit. The dialog reuses `drawUnitPopup()`; during placement its **Attack
  button is rendered disabled** (dimmed) and its hit region is suppressed (set
  `attackRect = null` so `popup-attack-toggle` can never fire). Close (X) still clears the
  selection via the existing `popup-close` event.
- Tapping a tile in the spawn zone that is empty and non-structure moves the selected PC
  there (`placeUnit(state, id, col, row)` in `pc.ts`, validated against `spawnZoneTiles`
  and `occupiedKey`). Taps outside the zone, on structures, or on occupied tiles are no-ops
  (selection retained), so the player can keep trying.
- The scene's existing `unit-tapped` / `cell-tapped` / `popup-close` events are reused; the
  game's handlers gain a `phase === 'placement'` branch ahead of the `phase === 'player'`
  branches.

**Why reuse the dialog and tap events instead of new ones?** The screen→world hit testing,
HUD interception, popup rendering, and event plumbing are identical; placement only
suppresses the planning phase and disables the Attack action, so the dialog stays a pure
info view during setup.

### 5. Yellow zone highlight

`drawHighlights()` gains a leading branch: when `phase === 'placement'`, stroke+fill every
`spawnZoneTiles` tile with yellow `0xffff00` (stroke alpha 0.9, fill alpha 0.15), mirroring
the green walk-tile rendering. The selected PC keeps its existing yellow select stroke
(`PC_SELECT_STROKE = 0xffff00`), which reads naturally against the zone. The highlight is
drawn only in `placement`, so it vanishes the instant Done flips the phase.

### 6. Done commits placement and starts the game

During `placement` the HUD shows a **Done** button (relabeled "Start" is optional; reuse
the existing Done control). Pressing it must **not** open the end-turn confirm modal used in
the `player` phase — instead it emits a distinct event (e.g. `hud-placement-done`, or the
existing Done handler branches on phase). The handler in `DungeonTacticsGame.tsx` sets
`phase: 'player'`, leaves PC positions as-is, clears any placement selection, and redraws.
NPC plans are already computed; combat overlays now render normally.

**Why skip the confirm modal?** Placement is freely reversible up to the moment of Done and
commits nothing destructive, so a confirmation step would be friction. The end-turn confirm
exists because ending a combat turn locks in irreversible NPC retaliation; placement has no
such stakes.

### 7. Reset behavior

`hud-reset` already calls `initialState()`, which now returns the `placement` phase — so
Reset naturally drops the player back into turn 0. No extra work.

## Risks / Trade-offs

- **[Encoded layout drifts from the design map]** → The layout is a literal copy of the
  design map; add a unit test asserting `spawnZoneTiles()` equals the 44-tile set above and
  that every PC start tile is a member, so any future edit that desyncs them fails loudly.
- **[NPC plans computed but must stay hidden in placement]** → Rely on the existing
  `phase === 'player'` guard in `drawPlanningOverlay()`; add a test/assertion that no NPC
  overlay renders while `phase === 'placement'`.
- **[Done reusing the combat confirm modal by accident]** → Branch the Done handler on
  phase explicitly; the placement path emits its own event and bypasses `confirmOpen`.
- **[A PC could be placed onto another PC, losing a unit visually]** → `placeUnit` rejects
  tiles in `occupiedKey`, so two PCs can never share a tile.

## Testing

The repo has no automated test runner configured (`npm run build` is the gate), so coverage
is a mix of a small pure-logic harness and manual verification:
- **Pure-logic checks** for `spawnZoneTiles` and `placeUnit`: zone membership matches the
  drawn map (including structure holes and the back row), out-of-zone/occupied/structure
  placements are rejected, and the four fixed PC starts are all members of the zone.
- **Build**: `npm run build` succeeds (type-checks the new `placement` phase across all
  `phase` switches).
- **Manual** (per CLAUDE.md, dev server already running): start a match → verify yellow
  zone matches the map, NPCs inert; drag each PC to legal tiles and confirm illegal taps
  no-op; press Done → zone highlight clears, NPCs gain plans, normal combat resumes; Reset →
  returns to placement.

## Migration Plan

Client-only, in-memory feature; no data migration. Ship behind no flag — the new opening
simply replaces the old fixed PC start. Rollback is reverting the change; there is no
persisted state to clean up. Per the CLAUDE.md keep-in-sync note, no Caddyfile/deploy files
are affected (no new app or route).

## Open Questions

- **Done button label** during placement — keep "Done" or relabel to "Start" for clarity?
  (Leaning "Start"; trivial to change.)
- Should tapping a PC and then tapping it again (or an out-of-zone tile) **deselect** it, or
  is deselect unnecessary since any in-zone tap just relocates? (Default: out-of-zone tap is
  a no-op that retains selection; no explicit deselect needed.)
