# Tactical Grid Game — Unit Behavior Framework

A data-driven design specification for movement and action systems in a turn-based tactical grid game. This document covers the data structures needed to define unit capabilities for both player characters and enemies.

---

## Design Philosophy

Every unit's behavior is described entirely in data. No unit requires custom code — new units, attacks, and abilities are created by combining fields from this specification. The system is built around three independently composable concerns:

- **Movement** — how a unit traverses the grid
- **Targeting** — how a unit selects a destination or direction for an attack
- **Effect** — what happens when an attack resolves

Separating these three allows enormous combinatorial flexibility. A fireball and a boulder throw may share the same targeting mode but have completely different propagation and landing behaviors.

---

## Health

```json
{
  "max_hp": 3
}
```

**`max_hp`** *(integer)*
The unit's maximum hit points. A unit starts each match at full HP (`hp == max_hp`) and is removed from the board when its HP reaches 0. `max_hp` is a per-archetype default that lives in the unit definition so it has a single canonical home; today every archetype uses `3`. (Current HP is runtime state on the unit instance, not part of the definition.)

---

## Movement

```json
{
  "movement": {
    "range": 3,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": []
  }
}
```

### Fields

**`range`** *(integer)*
The number of squares the unit can move per turn.

**`traversal`** *(string)*
How the unit physically moves through the environment.

| Value | Description |
|---|---|
| `walk` | Blocked by pits, walls, and elevation changes beyond step height |
| `fly` | Ignores pits, low obstacles, and elevation; blocked only by solid walls and ceilings |
| `jump` | Can clear pits up to N tiles wide (pair with `jump_width`); still blocked by walls |
| `climb` | Can move along vertical surfaces |
| `swim` | Moves through water terrain; most other traversal types are slowed or blocked by water |

**`layer`** *(string)*
The collision layer the unit occupies. Units on different layers can share tiles without blocking each other, except where passthrough rules restrict it.

| Value | Description |
|---|---|
| `ground` | Standard layer for most units |
| `air` | Flying units; can share tiles with ground units but are blocked by other air-layer units |
| `ethereal` | Incorporeal units; generally passes through all other layers |

**`diagonal`** *(boolean)*
Whether the unit can move diagonally. Most units move only in the four cardinal directions. Some units — spiders, ghosts, certain monsters — may move diagonally as well.

**`passthrough`** *(array of strings)*
A list of entity categories this unit can move *through* during its movement, without being blocked by that tile. Note that a unit cannot end its movement on a tile occupied by another unit; passthrough only affects pathing.

| Value | Description |
|---|---|
| `allied_units` | Can move through friendly units (common; may also be a global rule) |
| `enemy_units` | Can slip past enemy units without being blocked (rogue, thief) |
| `structures` | Can pass through walls, doors, pillars (ghost, ethereal creatures) |
| `objects` | Can pass through barrels, boulders, furniture |
| `any` | Fully incorporeal; passes through all other entities |

### Terrain Movement Costs

Terrain can modify the effective cost of entering a tile. Rather than treating terrain as binary passable/impassable, each terrain type can define a movement cost per traversal type.

```json
{
  "terrain": {
    "id": "swamp",
    "movement_costs": {
      "walk": 2,
      "fly": 1,
      "swim": 1
    },
    "passable_by": ["walk", "fly", "swim"]
  }
}
```

A unit with `range: 3` moving through two swamp tiles would only have 1 square of movement remaining.

### Movement Examples

**Rogue**
```json
{
  "movement": {
    "range": 4,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": ["allied_units", "enemy_units"]
  }
}
```

**Harpy (flying unit)**
```json
{
  "movement": {
    "range": 5,
    "traversal": "fly",
    "layer": "air",
    "diagonal": false,
    "passthrough": ["ground_units"]
  }
}
```

**Wraith (incorporeal)**
```json
{
  "movement": {
    "range": 4,
    "traversal": "walk",
    "layer": "ethereal",
    "diagonal": true,
    "passthrough": ["any"]
  }
}
```

---

## Attack System

Every attack is defined by three layers: **targeting**, **propagation**, and **effect**. These are composed independently.

---

### Layer 1: Targeting

Targeting defines what the player (or AI) selects when initiating an attack. It does not describe what the attack hits — only how the aim input is captured.

```json
{
  "targeting": {
    "mode": "tile_line",
    "arc": "cardinal",
    "min_range": 0,
    "max_range": 6,
    "requires_los": true
  }
}
```

**`mode`** *(string)*

| Value | Description |
|---|---|
| `adjacent` | No aim input; automatically targets all occupied neighboring tiles |
| `direction` | Player picks a cardinal (or diagonal) direction |
| `tile` | Player picks any tile within range |
| `tile_line` | Player picks a tile; the attack travels in a straight line to reach it |
| `self` | Centered on the caster; no aim input required |

**`arc`** *(string)*
Which directions the attack can be aimed.

| Value | Description |
|---|---|
| `cardinal` | North, south, east, west only |
| `diagonal` | The four diagonal directions only |
| `both` | All eight directions |

**`min_range`** *(integer)*
The minimum distance to a valid target. Useful for attacks that cannot hit adjacent tiles (lobbed grenades, mortars).

**`max_range`** *(integer)*
The maximum distance to a valid target tile.

**`requires_los`** *(boolean)*
Whether the attacker must have an unobstructed line of sight to the target tile. Lofted attacks often set this to `false`.

---

### Layer 2: Propagation

Propagation defines how the attack travels from the attacker to the target, and what happens after it lands. It has two phases: **flight** and **on_land**.

```json
{
  "propagation": {
    "shape": "line",
    "range": 5,
    "loft": false,
    "penetration": "stop_at_first",
    "on_land": null
  }
}
```

#### Flight Phase

**`shape`** *(string)*
The geometric shape the attack occupies as it travels.

| Value | Description |
|---|---|
| `single` | One tile only — the target tile |
| `line` | All tiles from origin to max range in a straight line |
| `reach_line` | Tiles at distance 2 (or 2–3) in a direction; useful for spears and whips |
| `cone` | An expanding wedge of tiles in a direction (breath weapons) |
| `plus` | The orthogonal cross around a center point — the center plus all tiles within N **cardinal** steps (Manhattan distance ≤ N); `plus` of N=1 is the classic 5-tile cross |
| `radius` | A filled square block around a center point — all tiles within N steps in any direction including diagonals (Chebyshev distance ≤ N); N=1 is a 3×3 block |
| `ring` | All tiles exactly N squares from a center point (shockwave) |

**`range`** *(integer)*
How far the attack travels or reaches.

**`loft`** *(boolean)*
If `true`, the attack arcs over intervening units and obstacles, landing at the target tile without interacting with anything along the path. If `false`, it travels along the surface and can be blocked or deflected. Loft and penetration are independent — a lofted attack can still have a `penetration` value that applies during the `on_land` roll phase.

**`penetration`** *(string)*
What stops the attack as it travels (applies during the flight phase, and during any on_land roll).

| Value | Description |
|---|---|
| `none` | Only affects the target tile; does not continue |
| `stop_at_first` | Halts at the first unit it hits |
| `penetrate_all` | Passes through and hits every unit in its path |
| `penetrate_N` | Hits up to N units before stopping (replace N with a number, e.g. `penetrate_2`) |

#### On-Land Phase

Some attacks continue after landing — a boulder rolls, a fireball scorches the ground, a shockwave radiates outward. The `on_land` block defines this secondary propagation.

```json
{
  "on_land": {
    "shape": "line",
    "direction": "inherit",
    "range": 2,
    "penetration": "penetrate_all"
  }
}
```

**`shape`** — same values as the flight shape field.

**`direction`** *(string)*

| Value | Description |
|---|---|
| `inherit` | Continues in the same direction the projectile was traveling (rolling boulder) |
| `all` | Radiates outward in all directions from the landing point (shockwave, explosion) |
| `cardinal` | Radiates in the four cardinal directions only |

**`range`** — how far the on-land effect travels from the landing tile.

**`penetration`** — same values as the flight penetration field.

---

### Layer 3: Effect

Effect defines what happens to any unit or tile touched by the attack, whether during flight or on landing.

```json
{
  "effect": {
    "damage": {
      "amount": "2",
      "type": "fire"
    },
    "applies_at": "landing_only",
    "splash_radius": 0,
    "applies_to": "units",
    "status": null,
    "status_duration": 0,
    "terrain_effect": null,
    "terrain_duration": 0,
    "friendly_fire": true,
    "forced_movement": null,
    "on_land_effect": null
  }
}
```

**`damage`**
The amount and damage type for the attack.

```json
{ "damage": "2", "type": "fire" }
```

Common damage types: `bludgeoning`, `piercing`, `slashing`, `fire`, `cold`, `lightning`, `necrotic`, `radiant`, `poison`.

**`applies_at`** *(string)*
Controls at which phase of the attack's travel damage and effects are applied.

| Value | Description |
|---|---|
| `path_only` | Only affects tiles the attack passes through; not the landing tile |
| `landing_only` | Only affects the landing tile |
| `landing_and_roll` | Affects the landing tile and all tiles in the on_land roll |
| `all` | Affects every tile touched during both flight and landing phases |

**`splash_radius`** *(integer)*
If greater than 0, the effect radiates outward from the landing point by this many squares. Used for explosions and area spells.

**`applies_to`** *(string)*
Whether the effect targets units, the terrain itself, or both.

| Value | Description |
|---|---|
| `units` | Affects only units occupying touched tiles |
| `terrain` | Modifies the tile itself (sets it on fire, creates ice, opens a pit) |
| `both` | Affects units and modifies terrain |

**`status`** *(string or null)*
A status condition applied to affected units: `burning`, `frozen`, `poisoned`, `stunned`, `blinded`, `prone`, etc.

**`status_duration`** *(integer)*
Number of turns the status persists.

**`terrain_effect`** *(string or null)*
A persistent terrain modification placed on affected tiles: `burning_ground`, `ice_patch`, `acid_pool`, `pit`, `difficult_terrain`.

**`terrain_duration`** *(integer)*
Number of turns the terrain effect persists. Use `-1` for permanent.

**`friendly_fire`** *(boolean)*
Whether the effect distinguishes friend from foe. If `true`, allies are affected just as enemies are.

**`on_land_effect`** *(object or null)*
A separate effect definition applied only during the on_land phase. If null, the primary effect applies to all phases as governed by `applies_at`. Using `on_land_effect` allows the impact and the roll (or shockwave) to deal different damage or cause different conditions.

---

### Forced Movement

Forced movement is a first-class effect used for pushback, knockback, pulls, and shoves. It can appear in the primary `effect` block or in `on_land_effect`.

```json
{
  "forced_movement": {
    "type": "push",
    "direction": "away_from_origin",
    "distance": 2,
    "blocked_by": ["walls", "other_units"],
    "collision_damage": {
      "amount": "1",
      "type": "bludgeoning"
    }
  }
}
```

**`type`** *(string)*

| Value | Description |
|---|---|
| `push` | Unit is moved away from the attack's origin |
| `pull` | Unit is moved toward the attack's origin |
| `slide` | Unit is moved perpendicular to the attack's direction |
| `fixed` | Unit is moved in a specific cardinal or diagonal direction regardless of origin |

**`direction`** *(string)*
For `push` and `pull`, this is typically `away_from_origin` or `toward_origin`. For `slide` and `fixed`, specify a cardinal or diagonal direction.

**`distance`** *(integer)*
How many squares the unit is displaced.

**`blocked_by`** *(array)*
What can stop the forced movement early: `walls`, `other_units`, `structures`, `objects`.

**`collision_damage`** *(object or null)*
If the forced movement is stopped early by a wall or another unit, both the displaced unit and the obstacle take this damage (classic Into the Breach–style collision).

---

## Complete Unit Examples

### Skeleton Warrior (simple melee)

```json
{
  "name": "Skeleton Warrior",
  "max_hp": 3,
  "movement": {
    "range": 3,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": []
  },
  "attacks": [
    {
      "name": "Rusty Sword",
      "targeting": { "mode": "adjacent", "arc": "cardinal" },
      "propagation": {
        "shape": "single",
        "range": 1,
        "loft": false,
        "penetration": "none",
        "on_land": null
      },
      "effect": {
        "damage": { "amount": "3", "type": "slashing" },
        "applies_at": "landing_only",
        "friendly_fire": false
      }
    }
  ]
}
```

### Skeleton Archer (ranged, with arcing shot)

```json
{
  "name": "Skeleton Archer",
  "max_hp": 3,
  "movement": {
    "range": 3,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": []
  },
  "attacks": [
    {
      "name": "Bone Arrow",
      "targeting": {
        "mode": "tile_line",
        "arc": "cardinal",
        "min_range": 1,
        "max_range": 6,
        "requires_los": true
      },
      "propagation": {
        "shape": "line",
        "range": 6,
        "loft": false,
        "penetration": "stop_at_first",
        "on_land": null
      },
      "effect": {
        "damage": { "amount": "3", "type": "piercing" },
        "applies_at": "landing_only",
        "friendly_fire": false
      }
    },
    {
      "name": "Arcing Shot",
      "targeting": {
        "mode": "tile_line",
        "arc": "cardinal",
        "min_range": 3,
        "max_range": 8,
        "requires_los": false
      },
      "propagation": {
        "shape": "single",
        "range": 8,
        "loft": true,
        "penetration": "none",
        "on_land": null
      },
      "effect": {
        "damage": { "amount": "3", "type": "piercing" },
        "applies_at": "landing_only",
        "friendly_fire": false
      }
    }
  ]
}
```

### Spear Fighter (reach melee, hits two tiles)

```json
{
  "name": "Spear Fighter",
  "max_hp": 3,
  "movement": {
    "range": 3,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": []
  },
  "attacks": [
    {
      "name": "Spear Thrust",
      "targeting": {
        "mode": "direction",
        "arc": "cardinal",
        "min_range": 1,
        "max_range": 2,
        "requires_los": false
      },
      "propagation": {
        "shape": "reach_line",
        "range": 2,
        "loft": false,
        "penetration": "penetrate_all",
        "on_land": null
      },
      "effect": {
        "damage": { "amount": "4", "type": "piercing" },
        "applies_at": "all",
        "friendly_fire": false
      }
    }
  ]
}
```

### Fire Mage (line spell + fireball)

```json
{
  "name": "Fire Mage",
  "max_hp": 3,
  "movement": {
    "range": 2,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": []
  },
  "attacks": [
    {
      "name": "Fire Bolt",
      "targeting": {
        "mode": "direction",
        "arc": "cardinal",
        "min_range": 1,
        "max_range": 5,
        "requires_los": false
      },
      "propagation": {
        "shape": "line",
        "range": 5,
        "loft": false,
        "penetration": "penetrate_all",
        "on_land": null
      },
      "effect": {
        "damage": { "amount": "2", "type": "fire" },
        "applies_at": "all",
        "status": "burning",
        "status_duration": 1,
        "friendly_fire": true
      }
    },
    {
      "name": "Fireball",
      "targeting": {
        "mode": "tile",
        "arc": "both",
        "min_range": 1,
        "max_range": 6,
        "requires_los": false
      },
      "propagation": {
        "shape": "single",
        "range": 6,
        "loft": true,
        "penetration": "none",
        "on_land": null
      },
      "effect": {
        "damage": { "amount": "4", "type": "fire" },
        "applies_at": "landing_only",
        "splash_radius": 2,
        "applies_to": "both",
        "terrain_effect": "burning_ground",
        "terrain_duration": 2,
        "friendly_fire": true
      }
    }
  ]
}
```

### Troll (boulder throw — rolls on landing)

```json
{
  "name": "Troll",
  "max_hp": 3,
  "movement": {
    "range": 3,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": []
  },
  "attacks": [
    {
      "name": "Hurl Boulder (Roll)",
      "targeting": {
        "mode": "tile_line",
        "arc": "cardinal",
        "min_range": 2,
        "max_range": 5,
        "requires_los": false
      },
      "propagation": {
        "shape": "single",
        "range": 5,
        "loft": true,
        "penetration": "none",
        "on_land": {
          "shape": "line",
          "direction": "inherit",
          "range": 2,
          "penetration": "penetrate_all"
        }
      },
      "effect": {
        "damage": { "amount": "3", "type": "bludgeoning" },
        "applies_at": "landing_and_roll",
        "friendly_fire": true
      }
    },
    {
      "name": "Hurl Boulder (Shockwave)",
      "targeting": {
        "mode": "tile_line",
        "arc": "cardinal",
        "min_range": 2,
        "max_range": 5,
        "requires_los": false
      },
      "propagation": {
        "shape": "single",
        "range": 5,
        "loft": true,
        "penetration": "none",
        "on_land": {
          "shape": "radius",
          "direction": "all",
          "range": 1,
          "penetration": "penetrate_all"
        }
      },
      "effect": {
        "damage": { "amount": "2", "type": "bludgeoning" },
        "applies_at": "landing_only",
        "friendly_fire": true,
        "on_land_effect": {
          "damage": null,
          "forced_movement": {
            "type": "push",
            "direction": "away_from_origin",
            "distance": 1,
            "blocked_by": ["walls", "other_units"],
            "collision_damage": { "amount": "1", "type": "bludgeoning" }
          }
        }
      }
    }
  ]
}
```

### Rogue (passes through enemies, diagonal melee)

```json
{
  "name": "Rogue",
  "max_hp": 3,
  "movement": {
    "range": 4,
    "traversal": "walk",
    "layer": "ground",
    "diagonal": false,
    "passthrough": ["allied_units", "enemy_units"]
  },
  "attacks": [
    {
      "name": "Backstab",
      "targeting": { "mode": "adjacent", "arc": "both" },
      "propagation": {
        "shape": "single",
        "range": 1,
        "loft": false,
        "penetration": "none",
        "on_land": null
      },
      "effect": {
        "damage": { "amount": "2", "type": "piercing" },
        "applies_at": "landing_only",
        "friendly_fire": false
      }
    }
  ]
}
```

---

## Data Structure Reference Summary

```
unit
├── name
├── max_hp
├── movement
│   ├── range
│   ├── traversal          (walk | fly | jump | climb | swim)
│   ├── layer              (ground | air | ethereal)
│   ├── diagonal
│   └── passthrough        (array of entity categories)
└── attacks[]
    ├── name
    ├── targeting
    │   ├── mode           (adjacent | direction | tile | tile_line | self)
    │   ├── arc            (cardinal | diagonal | both)
    │   ├── min_range
    │   ├── max_range
    │   └── requires_los
    ├── propagation
    │   ├── shape          (single | line | reach_line | cone | plus | radius | ring)
    │   ├── range
    │   ├── loft
    │   ├── penetration    (none | stop_at_first | penetrate_all | penetrate_N)
    │   └── on_land
    │       ├── shape
    │       ├── direction  (inherit | all | cardinal)
    │       ├── range
    │       └── penetration
    └── effect
        ├── damage         { amount, type }
        ├── applies_at     (path_only | landing_only | landing_and_roll | all)
        ├── splash_radius
        ├── applies_to     (units | terrain | both)
        ├── status
        ├── status_duration
        ├── terrain_effect
        ├── terrain_duration
        ├── friendly_fire
        ├── forced_movement
        │   ├── type       (push | pull | slide | fixed)
        │   ├── direction
        │   ├── distance
        │   ├── blocked_by
        │   └── collision_damage { amount, type }
        └── on_land_effect (same structure as effect; overrides primary effect during on_land phase)
```

---

## Persisting unit definitions

Unit definitions are data, so they belong in data storage — not only in bundled
source. The implementation lands in two stages (see
[`unit_framework_plan.md`](./unit_framework_plan.md)):

1. **In code first.** The definitions begin life as a bundled TypeScript table
   (`unitDefs.ts`) so the data-driven shape can be proven against the existing
   game with no behavior change.
2. **On disk next.** The source of truth then moves to the app's SQLite database
   so a game designer can **edit definitions live during gameplay** through an
   admin interface, iterating on balance without a code change or redeploy.

### Storage

Definitions are stored one row per archetype in a dedicated table, reusing the
project's existing migration-based SQLite setup (`src/db.ts`):

```sql
CREATE TABLE game_unit_defs (
  game_slug  TEXT NOT NULL,
  archetype  TEXT NOT NULL,   -- e.g. 'melee', 'ranger', 'short-range'
  def_json   TEXT NOT NULL,   -- JSON-serialized UnitDef
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (game_slug, archetype)
);
```

- **JSON column, not normalized columns.** A `UnitDef` is a nested, evolving
  document (`movement` / `attack.targeting` / `attack.propagation` / …). Storing
  it as a JSON blob means later stages add fields to the schema without a data
  migration. Validation is enforced at the API layer (a Zod schema mirroring the
  `UnitDef` interface), not by the table shape.
- **Per-archetype rows** (rather than a single document) give clean upserts and
  let the admin edit one unit at a time.
- **Code stays canonical for defaults.** The bundled table is the seed: on first
  load, or when a row is missing, the backend seeds the table from the bundled
  defaults rather than hardcoding seed data into a migration.

### API surface

Reusing the existing games + admin routers:

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `GET`  | `/api/games/dungeon-tactics-solo/unit-defs` | session | Players load the full set at game start |
| `GET`  | `/api/admin/games/dungeon-tactics-solo/unit-defs` | admin | Designer reads current defs for editing |
| `PUT`  | `/api/admin/games/dungeon-tactics-solo/unit-defs/:archetype` | admin | Upsert one archetype |
| `PUT`  | `/api/admin/games/dungeon-tactics-solo/unit-defs` | admin | Bulk upsert |

Writes are validated against the `UnitDef` Zod schema before upsert. Admin routes
are guarded by the existing admin middleware (admin = `userId 1`).

### Live iteration

The whole point of moving definitions to disk is fast balance iteration. The
client loads definitions **once at game start** into an in-memory def store that
the engine reads from (falling back to the bundled defaults if the fetch fails,
so the game stays playable offline or on error).

Editing happens through an **in-game admin panel** rendered inside the game
client (gated to the admin) so it shares the running game's runtime. Each saved
edit does two things: it **mutates the in-memory store directly** — so the change
applies immediately, with no reload or re-fetch — and it **calls the backend PUT
to persist**. The game does not poll or re-fetch to apply changes.

> The editor lives in the game client (`client-games`), not the separate admin
> app, precisely because a separate bundle would not share the game's in-memory
> defs and would require a reload to take effect.

An optional **"Reload from server"** button re-runs the load path to discard
unsaved in-memory edits and re-sync from the persisted values.

```
                    ┌──────────────── in-game admin panel ────────────────┐
                    │  (a) mutate in-memory store  ──▶ applies immediately │
 designer edits ────┤                                                      │
                    │  (b) PUT (admin, Zod-validated) ──▶ game_unit_defs   │
                    └──────────────────────────────────────────────────────┘

 game start ──▶ GET unit-defs ──▶ in-memory def store ──▶ engine reads
                (fallback: bundled unitDefs.ts on fetch failure)

 "Reload from server" ──▶ re-runs GET ──▶ overwrites in-memory store
```

---

## Open Design Questions

These are items worth resolving before implementation begins.

**Action economy** — Do units have one attack per turn, or a pool of action points that attacks and movement both draw from? FFT and Into the Breach handle this differently, and it affects how the unit definition is structured at the top level.

**Minimum range for melee** — Most melee attacks implicitly have `min_range: 1` (can't target your own tile). This should probably be enforced at the system level rather than requiring it in every attack definition.

**Line of sight rules** — The `requires_los` field is a boolean, but LOS itself may need nuance: does a low wall block LOS for ground units but not flying ones? Does height difference affect it?

**Self-targeting** — Can a unit target itself? Relevant for healing spells, buffs, and self-destructing abilities. A `self` targeting mode handles this explicitly, but it should be clear whether `adjacent` or `tile` modes can also select the caster's own tile.

**Conditional effects** — Some attacks deal bonus damage under conditions (backstab requires flanking, fire is resisted by fire elementals). A `conditions` block on the effect may be needed later, but is out of scope for the initial framework.

**Status stacking** — If a unit is already burning and gets hit by another fire attack, does the duration reset, stack, or do nothing? This is a rule that probably belongs in the status system definition, not in individual attack data.
