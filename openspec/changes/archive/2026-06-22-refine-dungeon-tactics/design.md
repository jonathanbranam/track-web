## Context

The current Dungeon Tactics implementation has a single undifferentiated `Unit` type. All PCs share one color and move 2 tiles; all NPCs share one color and attack adjacent structures/PCs. Attack resolution is hardcoded: PCs always one-shot adjacent NPCs, NPCs always attack adjacent structures/PCs.

The goal is to give each unit an archetype that controls its movement range, attack pattern, damage, and visual color. The six logic modules established by the refactor (types, map, pathfinding, turn, pc, npc) provide clean extension points.

## Goals / Non-Goals

**Goals:**
- Four distinct PC archetypes (melee, ranger, magic-user, rogue) with unique move ranges, attack patterns, and damage
- Two distinct NPC archetypes (short-range, long-range) with unique attack patterns
- HP on all units (PCs and NPCs); all start at 3; rendered as pips matching the structure HP style
- Distinct color per archetype for immediate visual identification
- Projectile tween for ranger and long-range NPC attacks
- AoE cross highlight for magic-user attacks
- NPC AI extended to use ranged attacks for long-range type

**Non-Goals:**
- Rogue special ability (stub only — type exists, attack is melee 1 damage, future enhancement slot)
- Pathfinding changes (NPCs still move 1 step per turn toward target regardless of archetype)
- Spawner changes to dynamically assign archetype (initial unit positions hardcoded in `initialState`)

## Decisions

### 1. `unitType` field on `Unit`

Add `unitType: PcType | NpcType` to the `Unit` interface where `PcType = 'melee' | 'ranger' | 'magic-user' | 'rogue'` and `NpcType = 'short-range' | 'long-range'`. A single field is simpler than a discriminated union (`PcUnit | NpcUnit`) because all call sites already branch on `unit.kind`; this gives them a second axis to branch on without a type-narrowing refactor.

**Alternative considered:** `pcType?: PcType; npcType?: NpcType` — rejected because `unit.unitType` is always present and avoids optional chaining at every call site.

### 2. Move range is a stat, not a constant

Replace the hardcoded `steps >= 2` limit in `validMoveDests` with a `moveRange(unit)` helper that returns:

| Archetype | Move range |
|---|---|
| melee | 4 |
| ranger | 3 |
| magic-user | 3 |
| rogue | 4 |
| short-range | 3 |
| long-range | 3 |

The BFS in `validMoveDests` and NPC pathfinding already step one cell at a time; limiting steps to `moveRange(unit)` is the only change needed.

### 3. Attack direction encodes aim; unit type controls resolution

Keep `attackDir: Direction` in `PcPlan` and all existing `PcAction`/`NpcAction` variants. Unit type determines what "attacking in direction D" means at resolution time:

| Archetype | Attack squares (planning) | Resolution |
|---|---|---|
| melee | 1 adjacent cell in D | 2 damage to unit/structure at that cell |
| rogue | 1 adjacent cell in D | 1 damage to unit/structure at that cell |
| ranger | tiles at distance 2–4 in D (straight line) | 1 damage to first unit/structure in D at distance ≥ 2; passes over all between |
| magic-user | cross centered at distance 2 in D | 1 damage to each unit/structure on the cross (center + 4 adjacent) |
| short-range | tiles at distance 1–2 in D | 1 damage to first unit/structure at distance ≤ 2 |
| long-range | tiles at distance ≥ 2 in D | 1 damage to unit/structure at first occupied tile at distance ≥ 2; passes over all between |

**Alternative considered:** Per-type target coordinates stored in plan (`attackTarget: { col, row }`). Rejected because it requires `PcPlan` changes and new UI tap logic; direction-based planning works with the existing arrow-selection UX.

**Magic-user aim:** The player selects a direction; the AoE always lands at distance 2 (the minimum gap tile). This keeps the UX identical to melee (tap a direction arrow) and the AoE tile is deterministic.

### 4. HP on all units; all start at 3

Add `hp: number` to the `Unit` interface. Every unit (PC and NPC) starts at 3 HP. Units are removed from the board when `hp` reaches 0.

Attack damage by archetype:
- melee: 2 damage
- ranger / rogue / magic-user: 1 damage each (magic-user 1 damage per tile in the cross)
- short-range NPC: 1 damage
- long-range NPC: 1 damage

HP is rendered as pips on the unit tile using the same approach as structures: small filled rectangles stacked bottom-to-top on the left edge of the tile, with empty outlines for missing HP. Three pips total per unit, filled with the unit's archetype color.

**Alternative considered:** Different starting HP per archetype (e.g., long-range NPC = 2 HP). Rejected in favor of uniform 3 HP for clarity — the melee PC's 2-damage attack still has meaningful impact (one-shots a 2-HP unit, halves a 3-HP unit).

**Alternative considered:** Keep one-hit-kill for PCs. Rejected because the user explicitly requested HP on PCs.

### 5. NPC AI extended for ranged attacks

`computeNpcPlans` branches on `npc.unitType`:

- **short-range**: existing logic + check tiles at distance 1–2 in each cardinal direction for targets before moving
- **long-range**: instead of attacking adjacent, scan each cardinal direction for the first occupied tile at distance ≥ 2; attack if found, else move toward target

Long-range NPCs skip adjacency attacks (they can't attack at range 1). A long-range NPC adjacent to a structure will move away before attacking.

### 6. Projectile tween as a visual-only scene concern

`DungeonTacticsScene.ts` handles projectile animation. A small circle tween travels from attacker to target for ranger PC and long-range NPC attacks. Magic-user AoE flashes the cross tiles. The game logic modules (`pc.ts`, `npc.ts`) emit no projectile data — the scene infers the animation from the `PcAction` / `NpcAction` kind and the unit's archetype.

### 7. Per-type color constants in the scene

Replace the single `PC_FILL` / `NPC_FILL` constants with a map keyed by `unitType`:

```
melee      → 0x4a90e2  (blue)
ranger     → 0x2ecc71  (green)
magic-user → 0x9b59b6  (purple)
rogue      → 0xe67e22  (orange)
short-range → 0xe24a4a (red — current NPC color)
long-range  → 0xcc8800 (amber)
```

`drawUnit` receives the unit object and looks up the color from this map.

## Risks / Trade-offs

- **NPC AI complexity**: Long-range NPC needs to scan ahead before committing to a move, which adds branching to `computeNpcPlans`. Mitigated by keeping the short-range NPC on the existing adjacent-attack path and only diverging for long-range.
- **Magic-user UX**: Fixed AoE at distance 2 limits tactical flexibility but keeps the UI unchanged. If future designs need a variable aim distance, `PcPlan` will need `attackTarget` coords.
- **HP adds state to resolve**: `resolvePcAction` and `resolveNpcAction` now reduce `hp` rather than removing units directly; removal happens when `hp <= 0`. Both PC and NPC resolution paths change.
- **`initialState` hardcodes archetypes**: The 4 PCs and 5 NPCs are initialized with fixed `unitType` values. Spawner-based archetype assignment is a future concern.

## Open Questions

- Should the long-range NPC be able to attack structures at distance ≥ 2, or only PCs? (Current design: yes, attacks anything in range.)
- What is the max attack range for long-range NPC and ranger PC? (Current design: the full grid width/height — whatever is in that direction.)
- Should rogue have any visual indicator that it's a "stub" (future ability placeholder), or just look like a normal unit?
