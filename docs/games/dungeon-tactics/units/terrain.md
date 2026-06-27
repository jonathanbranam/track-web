## Terrain & Biomes

A **terrain type** defines the properties of a single map tile — what can move through it, how much it costs to enter, whether it deals damage, and whether it can be destroyed or altered. A **biome** is a collection of terrain types that defines the visual and mechanical character of a region. A **region** is one instance of a biome in the game world; the same biome may appear multiple times (e.g. two separate dungeon regions both using cave terrain).

This document defines the terrain data model, the available biomes and their terrain catalogs, and the environmental effects that can alter terrain during play.

---

## Terrain Data Model

Each terrain type is a catalogue entry. Tiles in a region reference terrain types by ID; the runtime holds which type each tile currently is (tiles can transition).

```json
{
  "id": "lava",
  "name": "Lava",
  "passable_by": ["fly", "teleport"],
  "movement_costs": {
    "fly": 1,
    "teleport": 1
  },
  "cover": "none",
  "blocks_los": false,
  "damage_on_enter": { "amount": 1, "type": "fire" },
  "damage_per_turn": { "amount": 2, "type": "fire" },
  "status_on_enter": null,
  "flammable": false,
  "destructible": null
}
```

**`id`** *(string)*
Unique identifier used by tile data and transition rules.

**`name`** *(string)*
Display name for the UI and editor.

**`passable_by`** *(array of traversal types)*
Which traversal modes may enter this tile. Units whose traversal type is not in this list are blocked. An empty array means no unit may enter (solid wall). See traversal types below.

**`movement_costs`** *(object)*
Per-traversal movement cost multiplier for entering this tile. `1` is normal; `2` means each step costs two squares of movement (difficult terrain). Traversal types absent from this map default to `1` if they appear in `passable_by`. This field is *not yet implemented* — see [movement.md](./movement.md#terrain-movement-costs).

**`cover`** *(string)*

| Value | Description |
|---|---|
| `none` | No protection; ranged attacks pass freely |
| `partial` | Low obstacle; ranged attacks can still hit over it but it may provide a defense modifier (TBD) |
| `full` | Blocks line of sight and all ranged attacks entirely |

**`blocks_los`** *(boolean)*
If `true`, units cannot draw line of sight through this tile for ranged targeting. Implies `cover: "full"` in practice; listed separately for clarity.

**`damage_on_enter`** *(object or null)*
Damage dealt once when a unit enters the tile.

**`damage_per_turn`** *(object or null)*
Damage dealt at the start of each turn a unit remains on this tile.

**`status_on_enter`** *(object or null)*
Status effect applied to a unit when it enters the tile.

```json
{ "effect": "slowed", "duration": 1 }
```

**`flammable`** *(boolean)*
Whether this tile can catch fire from an adjacent burning tile or a fire effect. See [Fire Spread](#fire-spread) below.

**`destructible`** *(object or null)*
If non-null, the tile can be reduced to zero HP by attacks. When destroyed it transitions to `transitions_to`. `vulnerable_to` lists damage types that affect it; damage types not listed deal no effect. `null` means indestructible.

```json
{
  "hp": 3,
  "transitions_to": "rubble",
  "vulnerable_to": ["bludgeoning", "fire", "explosive"]
}
```

---

## Traversal Types

Defined in [movement.md](./movement.md). Repeated here for reference.

| Value | What it can and cannot enter |
|---|---|
| `walk` | Standard ground movement. Blocked by walls, pits, deep water, and elevation changes beyond step height. |
| `fly` | Ignores pits, other units, and elevation. Blocked only by solid walls and ceilings. Can cross water and lava. |
| `teleport` | Instant movement to destination. Ignores all intervening terrain. Can reach any tile that is not a solid wall or otherwise marked impassable to teleport. |

> **Unit terrain capabilities (planned, not yet implemented).** Some units can enter terrain normally impassable to their traversal type — an aquatic unit can walk into water, a climber can scale cliff walls. Rather than adding traversal types like `swim` or `climb` (removed as they implied the *only* way a unit moves, not a *capability*), these will be expressed as a unit-level `terrain_capabilities` list. The terrain type's `passable_by` will include a capability token like `"aquatic"` or `"climbing"` alongside standard traversal types, and units that carry that capability token may enter. This is deferred until the terrain movement cost system ships.

---

## Biomes

### Additional biome suggestions

The biomes defined below are: **Cave/Dungeon**, **Forest & Plains**, **Tundra**, **Desert**, and **Island/Archipelago**. Additional biomes to consider for future regions:

- **Volcanic / Magma Depths** — more intense cave variant; obsidian floors, magma rivers, geysers, periodic eruptions, ash clouds that block LOS.
- **Underdark / Crystal Cavern** — underground with no lava; crystal formations, glowing pools, dense mushroom clusters, zero surface light.
- **Swamp / Bayou** — surface wetland that could be its own biome rather than just a terrain type; permanent fog, cypress knees, murky water everywhere, quicksand hidden under normal-looking ground.
- **Ancient Ruins / City** — collapsed urban environment; archways as low obstacles, trapped floors, sewer tunnels, dense destructible walls.
- **Sky / Cloudtop** — floating island chains; some tiles are cloud (temporary footing that collapses after weight), wind-gust tiles, updraft tiles that grant temporary fly capability.

---

### Biome: Cave / Dungeon

Underground stone corridors, chambers, pits, underground water, and lava flows. The defining terrain hazard is the **lava pit** — impassable and punishing, with fire damage to any unit that enters or remains. Pits and chasms force flyers to be valuable party members.

| ID | Name | Passable by | Move cost | Cover | Damage | Status | Flammable | Destructible |
|---|---|---|---|---|---|---|---|---|
| `stone_floor` | Stone Floor | walk, fly, teleport | ×1 | none | — | — | no | no |
| `stone_wall` | Stone Wall | fly\*, teleport | blocked (walk) | full | — | — | no | yes → `rubble` |
| `lava` | Lava | fly, teleport | ×1 (fly) | none | 1 on enter, 2/turn (fire) | burning | no | no |
| `chasm` | Chasm / Pit | fly, teleport | ×1 (fly) | none | 3 on enter (fall) | — | no | no |
| `narrow_ledge` | Narrow Ledge | walk, fly, teleport | ×2 | none | — | — | no | no |
| `underground_pool` | Underground Pool | fly, teleport | ×1 (fly) | none | — | — | no | no |
| `rubble` | Rubble | walk, fly, teleport | ×2 | partial | — | — | no | no |
| `stalagmite_cluster` | Stalagmite Cluster | fly, teleport | blocked (walk) | partial | — | — | no | yes → `rubble` |
| `crystal_formation` | Crystal Formation | fly, teleport | blocked (walk) | partial | — | — | no | yes → `rubble` |
| `mud` | Mud | walk, fly, teleport | ×2 | none | — | slowed (1 turn) | no | no |
| `shallow_water` | Shallow Water | fly, teleport | ×2 (walk) | none | — | — | no | no |

\* Fly above a stone wall is possible if ceiling height permits (map-level flag, not terrain data).

**Notable terrain notes:**

- **Lava** — units on lava at the start of their turn take 2 fire damage before they can act. Entering lava deals 1 damage immediately. Units that begin their turn on lava and cannot leave (movement blocked, stunned) will die over time.
- **Chasm** — a unit that walks into a chasm takes fall damage (3 by default) and lands at the bottom level if one exists, or is removed from the map. Flyers cross freely.
- **Crystal Formation** — destroyed crystal shatters into rubble (difficult terrain). It provides partial cover but its angled faces do not block LOS completely.

---

### Biome: Forest & Plains

Surface terrain ranging from open grassland to dense forest. The primary hazards are **swamp** (slows movement) and **deep water** (blocks non-flyers). Trees and thickets are flammable and destructible, creating dynamic burning zones. Ruins walls scattered through the map give access to cover and collisions.

| ID | Name | Passable by | Move cost | Cover | Damage | Status | Flammable | Destructible |
|---|---|---|---|---|---|---|---|---|
| `grass` | Grass | walk, fly, teleport | ×1 | none | — | — | yes | no |
| `low_brush` | Low Brush | walk, fly, teleport | ×1 | partial | — | — | yes | no |
| `dense_forest` | Dense Forest | walk, fly, teleport | ×2 | full | — | — | yes | no |
| `tree` | Tree | fly, teleport | blocked (walk) | full | — | — | yes | yes → `charred_stump` |
| `thicket` | Thicket | fly, teleport | blocked (walk) | partial | — | — | yes | yes → `ash` |
| `swamp` | Swamp | walk, fly, teleport | ×2 | none | — | slowed (1 turn) | no | no |
| `shallow_river` | Shallow River | fly, teleport | ×2 (walk) | none | — | — | no | no |
| `deep_river` | Deep River | fly, teleport | blocked (walk) | none | — | — | no | no |
| `mud` | Mud | walk, fly, teleport | ×2 | none | — | — | no | no |
| `rocky_outcrop` | Rocky Outcrop | fly, teleport | blocked (walk) | partial | — | — | no | no |
| `ruins_wall` | Ruins Wall | fly, teleport | blocked (walk) | full | — | — | yes | yes → `rubble` |
| `rubble` | Rubble | walk, fly, teleport | ×2 | partial | — | — | no | no |
| `ash` | Ash | walk, fly, teleport | ×1 | none | — | — | no | no |
| `charred_stump` | Charred Stump | fly, teleport | blocked (walk) | partial | — | — | no | no |

**Notable terrain notes:**

- **Swamp** — resists fire. A burning tile adjacent to a swamp tile does not spread there; fire placed directly on swamp is extinguished at the end of the turn.
- **Dense Forest** — blocks line of sight entirely. Units inside cannot be targeted with ranged attacks unless `requires_los: false`. The forest itself can burn (see [Fire Spread](#fire-spread)).
- **Tree** — when destroyed (or burned), becomes `charred_stump` (a low obstacle — blocks walkers, flyable). Does not become open ground.
- **Rocky Outcrop** — functions as a low obstacle. Walkers are blocked; flyers cross over. Provides partial cover to units on adjacent tiles.

---

### Biome: Tundra

Arctic surface — frozen lakes, deep snow, ice walls, and crevasses. The primary mechanic is **ice**, which introduces a slide effect (planned, see below) and which can crack into open water. Fire is mostly ineffective against ice-resistant terrain, but fire actions can *melt* frozen tiles.

| ID | Name | Passable by | Move cost | Cover | Damage | Status | Flammable | Destructible |
|---|---|---|---|---|---|---|---|---|
| `snow` | Snow | walk, fly, teleport | ×1 | none | — | — | no | no |
| `deep_snow` | Deep Snow / Snowdrift | walk, fly, teleport | ×2 | partial | — | slowed (1 turn) | no | no |
| `ice` | Ice | walk, fly, teleport | ×1\* | none | — | — | no | no |
| `frozen_lake` | Frozen Lake | walk, fly, teleport | ×1\* | none | — | — | no | yes → `deep_water` |
| `deep_water` | Deep Water | fly, teleport | blocked (walk) | none | — | — | no | no |
| `crevasse` | Crevasse | fly, teleport | blocked (walk) | none | 3 on enter (fall) | — | no | no |
| `ice_wall` | Ice Wall | fly, teleport | blocked (walk) | full | — | — | no | yes (fire) → `shallow_water` |
| `snow_rubble` | Snow-Covered Rubble | walk, fly, teleport | ×2 | partial | — | — | no | no |
| `permafrost` | Permafrost | walk, fly, teleport | ×1 | none | — | — | no | no |
| `blizzard_zone` | Blizzard Zone | walk, fly, teleport | ×1 | partial\*\* | — | — | no | no |

\* Ice movement: *slide effect not yet implemented.* Planned — a unit that enters an ice tile continues moving in the same direction until hitting a wall or non-ice tile, spending no extra movement for the forced slide. For now, ice is treated as normal movement cost.

\*\* Blizzard zones reduce effective LOS to 2 tiles for ranged targeting (blocks long-range attacks; short-range attacks still work). Treat as a soft `blocks_los` applied only beyond a range threshold — not yet implemented.

**Notable terrain notes:**

- **Frozen Lake** — treated as a `walk`-passable tile normally, but takes `hp: 1` and is `vulnerable_to: ["bludgeoning", "fire"]`. When destroyed, becomes `deep_water`. A unit standing on frozen lake when it breaks falls into `deep_water` (which blocks walk movement — they may not be able to leave without a flyer or teleport).
- **Ice Wall** — only destructible by fire-type damage (fire melts it, bludgeoning/slashing does not). Transitions to `shallow_water` (the melt pool).
- **Blizzard Zone** — not a permanent tile type; applied as a terrain overlay by the Blizzard environmental effect. Reverts to the tile beneath when the blizzard ends.

---

### Biome: Desert

Hot, arid surface — sand dunes, rock formations, quicksand, ancient ruins, and rare oases. Fire spreads quickly across dry terrain. Deep sand and quicksand slow movement significantly. Rock formations function as mid-field obstacles with partial cover.

| ID | Name | Passable by | Move cost | Cover | Damage | Status | Flammable | Destructible |
|---|---|---|---|---|---|---|---|---|
| `sand` | Sand | walk, fly, teleport | ×1 | none | — | — | no | no |
| `dune` | Dune | walk, fly, teleport | ×2 | partial | — | — | no | no |
| `quicksand` | Quicksand | fly, teleport | ×3 (walk)\* | none | — | sinking\*\* | no | no |
| `rock_formation` | Rock Formation | fly, teleport | blocked (walk) | partial | — | — | no | yes → `rubble` |
| `ruins_wall` | Ruins Wall | fly, teleport | blocked (walk) | full | — | — | no | yes → `rubble` |
| `ruins_pillar` | Ancient Pillar | fly, teleport | blocked (walk) | partial | — | — | no | yes → `rubble` |
| `oasis` | Oasis | walk, fly, teleport | ×1 | none | — | — | no | no |
| `scorched_earth` | Scorched Earth | walk, fly, teleport | ×1 | none | — | — | yes | no |
| `rubble` | Rubble | walk, fly, teleport | ×2 | partial | — | — | no | no |
| `ash` | Ash | walk, fly, teleport | ×1 | none | — | — | no | no |
| `sandstorm_zone` | Sandstorm Zone | walk, fly, teleport | ×1 | partial\*\* | — | — | no | no |

\* Quicksand movement cost ×3 represents severe slowing; units may use their full movement budget just to escape. Exact behavior TBD — may also trigger forced movement after each turn spent inside.

\*\* `sinking` status: not yet defined. Placeholder for a stacking slow that eventually makes a unit unable to move without assistance.

\*\* Sandstorm zones reduce effective LOS like blizzard zones. Applied as an overlay by the Sandstorm environmental effect.

**Notable terrain notes:**

- **Dune** — a low elevated tile. Provides partial cover to the unit standing on it (they are higher than the surrounding ground) and potentially a range bonus to ranged attacks (TBD — elevation advantage is not yet defined).
- **Scorched Earth** — created when desert sand is exposed to fire actions or after a sandstorm subsides. Behaves as normal sand but *is* flammable (dry scorched earth can reignite).
- **Oasis** — the only non-flammable ground tile in the desert. Functions as a natural fire break. Units at an oasis cannot catch `burning` status from environmental fire spread.

---

### Biome: Island / Archipelago

Coastal and open-water maps with scattered islands connected by shallow crossings, reefs, and bridges. The terrain split between land and water is the central constraint: non-aquatic units must find crossings or use flyers to bridge gaps. Rock spires and coral clusters create mid-water obstacles.

| ID | Name | Passable by | Move cost | Cover | Damage | Status | Flammable | Destructible |
|---|---|---|---|---|---|---|---|---|
| `beach_sand` | Beach Sand | walk, fly, teleport | ×1 | none | — | — | no | no |
| `shallow_water` | Shallow Water | fly, teleport | ×2 (aquatic) | none | — | — | no | no |
| `deep_water` | Deep Water | fly, teleport | blocked (walk/aquatic) | none | — | — | no | no |
| `reef` | Reef | fly, teleport | ×2 (aquatic) | partial | 1 on enter (piercing) | — | no | no |
| `dock` | Dock / Pier | walk, fly, teleport | ×1 | none | — | — | yes | yes → `wreckage` |
| `rock_spire` | Rock Spire | fly, teleport | blocked (walk) | partial | — | — | no | yes → `rubble_in_water` |
| `coral` | Coral | fly, teleport | blocked (walk) | partial | — | — | no | no |
| `kelp_bed` | Kelp Bed | fly, teleport | ×2 (aquatic) | none | — | — | no | no |
| `island_cliff` | Island Cliff | fly, teleport | blocked (walk) | full | — | — | no | no |
| `tidal_flat` | Tidal Flat | walk, fly, teleport | ×1 (low tide) / water (high tide) | none | — | — | no | no |
| `wreckage` | Wreckage | walk, fly, teleport | ×2 | partial | — | — | yes | no |

**Notable terrain notes:**

- **Shallow Water** — passable by the `aquatic` unit capability (not yet implemented; will cover aquatic enemies and certain ranged floating units). Flyers cross freely. Standard walking units are blocked.
- **Reef** — damages entering units due to sharp coral edges, even if they can traverse it. This makes reefs a terrain hazard for aquatic units, not just a barrier.
- **Tidal Flat** — a tile whose type changes based on game-phase (tide cycle). At low tide it is walkable ground; at high tide it floods to `shallow_water`. The tide cycle is an environmental effect applied at the scenario level, not per-turn.
- **Dock / Pier** — the only flammable tile in the island biome. Burning a dock destroys a crossing route. A burned dock becomes `wreckage` — still passable but difficult terrain.
- **Rock Spire** — a low obstacle in open water. Blocks walking units (they can't enter the water to reach it), but also blocks flyers if it extends to ceiling height (map flag). Destroyed rock spires become `rubble_in_water` — difficult terrain, visible hazard, still in water.

---

## Destructible Terrain

Any terrain type with a non-null `destructible` block can be damaged by attacks whose `applies_to` is `terrain` or `both`. The terrain tile acts as a target with its own HP; when reduced to zero it transitions to the `transitions_to` type immediately.

Key properties:

- **`hp`** — the tile's hit points. Attacks deal damage to the tile's HP total.
- **`transitions_to`** — the terrain ID the tile becomes on destruction. The new tile has full properties of that type (passability, cost, etc.) from that point forward.
- **`vulnerable_to`** — damage types that affect this tile. Attacks with types not in this list do zero damage to the tile. An empty list means the tile is invulnerable (impassable terrain that resists all damage, e.g. map boundaries).

**Destruction examples:**

| Tile | HP | Vulnerable to | Becomes |
|---|---|---|---|
| Stone Wall | 3 | bludgeoning, fire, explosive | Rubble |
| Ice Wall | 2 | fire | Shallow Water |
| Tree | 2 | slashing, fire, explosive | Charred Stump |
| Ruins Wall | 3 | bludgeoning, fire, explosive | Rubble |
| Frozen Lake | 1 | bludgeoning, fire | Deep Water |
| Rock Spire | 4 | bludgeoning, explosive | Rubble (in water) |
| Crystal Formation | 2 | bludgeoning, cold, explosive | Rubble |
| Dock / Pier | 2 | bludgeoning, fire, explosive | Wreckage |
| Stalagmite Cluster | 2 | bludgeoning, explosive | Rubble |

Units targeting a destructible tile use the same attack system as when targeting units — a `tile` targeting mode with `requires_occupied: false` and `applies_to: "terrain"` or `"both"`. The effect's damage is applied to the tile's HP pool rather than (or in addition to) any unit standing on it.

---

## Damaging Terrain

Some terrain types deal damage to units that enter or remain on them. This is expressed via `damage_on_enter` and `damage_per_turn` in the terrain definition, and requires no special action system integration — the engine checks these fields when a unit enters a tile and at the start of the unit's turn.

| Tile | On enter | Per turn | Type |
|---|---|---|---|
| Lava | 1 | 2 | fire |
| Reef | 1 | — | piercing |
| Chasm / Crevasse | 3 (fall) | — | bludgeoning |

**Design notes:**

- Damaging terrain affects all units regardless of faction unless a unit has an immunity to that damage type (immunity system not yet defined).
- `damage_per_turn` fires at the **start** of the unit's turn, before it can act. A unit on lava at the start of its turn takes 2 damage before spending any movement to escape.
- Fall damage from pits and chasms is applied once on entry. If a lower level exists, the unit lands there; otherwise it is removed from play.

---

## Environmental Effects

Environmental effects are **scenario-level events** that alter terrain during play. They are not tied to unit actions — they may be scripted (trigger on round N, or when a condition is met) or random (draw from an event deck each round). This system is **not yet implemented**; this section captures the design intent and the tile transition rules needed when it ships.

---

### Fire Spread

Fire spreads from burning tiles to adjacent flammable tiles at the end of each round. A burning tile deals damage like `lava` while active, then transitions to its burned form.

**Spread rules:**
1. At end of round, each tile that is currently `burning_*` checks each of its four cardinal neighbors.
2. If a neighbor's base tile is `flammable: true` and is not already burning or fire-resistant, it ignites (becomes its burning variant).
3. At end of the burning tile's duration, it transitions to its final form.

**Tile state machine:**

| Base tile | Ignites to | Burns for | Final form |
|---|---|---|---|
| `grass` | `burning_grass` | 1 round | `ash` |
| `low_brush` | `burning_brush` | 1 round | `ash` |
| `scorched_earth` | `burning_ground` | 1 round | `ash` |
| `dense_forest` | `burning_forest` | 2 rounds | `ash` |
| `tree` | `burning_tree` | 2 rounds | `charred_stump` |
| `thicket` | `burning_thicket` | 1 round | `ash` |
| `ruins_wall` | `burning_ruins` | 2 rounds | `rubble` |
| `dock` | `burning_dock` | 2 rounds | `wreckage` |

**Fire resistance:** `swamp`, `snow`, `ice`, `deep_snow`, `oasis`, `shallow_water`, `deep_water` are not flammable and also **extinguish** fire placed on them. A burning tile adjacent to water does not spread toward the water tile.

**Burning tile properties:** A `burning_*` tile inherits the passability of its base type but adds `damage_per_turn: { amount: 1, type: "fire" }` while burning. It also applies `status_on_enter: { effect: "burning", duration: 1 }` to any unit that enters it.

---

### Rockslide

A rockslide event designates a row or column of tiles (or an area). Each affected tile:

1. If currently passable ground: converts to `rubble` (difficult terrain, partial cover). Units on an affected tile take bludgeoning damage (suggested: 2).
2. If currently `rubble` or `rock_formation`: no change.
3. If currently an open tile (ash, grass, sand): converts to `rubble`.

A rockslide can also open new pits: tiles on a cliff edge adjacent to a rockslide may collapse into `chasm`. The specific rules are scenario-configured.

---

### Earthquake

An earthquake event applies to a zone of tiles.

- **Pit opening:** some ground tiles within the zone transition to `chasm`. Units on these tiles take fall damage if they cannot fly.
- **Wall collapse:** destructible walls (`stone_wall`, `ruins_wall`, `ice_wall`) within the zone take their maximum damage instantly, converting to their destroyed form.
- **Rubble creation:** some open tiles become `rubble`.

The set of tiles affected, the proportion that open pits vs. create rubble, and the exact damage values are scenario-configured.

---

### Rain

Rain falls over the entire map or a designated zone for a set number of rounds.

- Extinguishes all `burning_*` tiles immediately on the turn it begins. Burning tiles revert to their final burned form (ash, charred stump, etc.) rather than continuing to burn.
- Prevents fire spread: `flammable` tiles cannot ignite while rain is active.
- Converts `ash` tiles to `mud` (difficult terrain).
- Raises water level: `tidal_flat` tiles (island biome) transition to `shallow_water` for the duration.

---

### Lightning Strike

A targeted event that strikes a specific tile.

- The struck tile and its unit (if any) take damage: `{ amount: 2, type: "lightning" }`.
- If the struck tile is `flammable`, it ignites immediately (does not wait for end-of-round fire spread).
- If the struck tile is `ice` or `frozen_lake`, it cracks: `frozen_lake → deep_water`, `ice → shallow_water`. A unit on the tile falls into the water.

---

### Blizzard

A blizzard applies a `blizzard_zone` overlay to the entire map or a region.

- Reduces effective LOS for all ranged targeting to 2 tiles for the duration.
- At end of each blizzard round: `mud` and `ash` tiles convert to `deep_snow`; `shallow_water` converts to `ice`.
- When the blizzard ends, the overlay is removed but tile conversions (mud → deep_snow, water → ice) persist.

---

### Sandstorm

Analogous to blizzard, for the desert biome.

- Applies a `sandstorm_zone` overlay reducing LOS to 2 tiles.
- Converts `oasis` tiles to `sand` for the duration (the water is obscured/blown away).
- When the sandstorm ends, `ash` tiles left from any fires become `scorched_earth` (passable again, but flammable).

---

## TODOs

- **Tile state machine implementation.** Fire spread, rain, and blizzard conversions need a round-end terrain processing step in the game engine. Tile states (current burning round, hp remaining) are runtime data, not definition data.
- **Elevation.** Dunes and rock formations hint at elevation advantage for ranged attacks. Elevation is not yet in the data model.
- **Aquatic unit capability.** Shallow water and reef passability requires a `terrain_capabilities` system on units (see traversal note above).
- **Ice slide effect.** The slide mechanic for ice tiles needs a movement-phase hook before regular movement resolves.
- **Sinking status.** Quicksand's `sinking` status effect is not yet defined in the status system.
- **Tidal cycle.** Tidal flat toggling between walk and shallow-water states needs a scenario-level tide phase trigger.
- **Blizzard/sandstorm overlay.** The LOS-reduction zone overlay is a separate rendering/targeting layer, not a terrain type; needs its own data model.
- **Elevation advantage (dunes, high ground).** Define whether high-ground tiles grant range bonus, defense bonus, or both, and how the engine resolves them.
- **Damage type immunity.** Damaging terrain (lava, reef) affects all units equally right now. Fire-immune units (certain constructs, fire elementals) should be able to stand in lava safely — depends on a unit immunity system.
