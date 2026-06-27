## Attack System

Every attack is defined by three layers: **targeting**, **propagation**, and **effect**. These are composed independently.

---

### Layer 1: Targeting

Targeting defines which tile(s) a unit can aim an attack at. Attacks always target tiles — never units, structures, or objects directly. Some attacks require the target tile to be occupied.

When `targets_all` is `true`, all tiles satisfying arc and range constraints are automatically selected with no player input required (spin attacks, mass heals, adjacent throw).

```json
{
  "targeting": {
    "mode": "tile",
    "targets_all": false,
    "arc": "cardinal",
    "min_range": 1,
    "max_range": 3,
    "requires_los": false,
    "requires_occupied": false,
    "requires_clear_path": false,
    "count": null,
    "selection_constraint": "any"
  }
}
```

**`mode`** *(string)*

| Value | Description |
|---|---|
| `self` | No aim input; attack is centered on the caster |
| `direction` | Player picks a direction (constrained by `arc`); attack extends from the attacker in that direction |
| `tile` | Player picks any single tile within range and arc constraints |
| `tile_multi` | Player picks `count` tiles; each must satisfy range and arc constraints independently |

**`targets_all`** *(boolean)*
If `true`, all tiles satisfying arc, range, and occupation constraints are automatically targeted — no aim input is collected. When `true`, `mode` is ignored.

**`arc`** *(string)*
Which directions from the attacker are valid.

| Value | Description |
|---|---|
| `cardinal` | North, south, east, west only |
| `diagonal` | The four diagonal directions only |
| `both` | All eight directions |

**`min_range`** / **`max_range`** *(integer)*
The minimum and maximum distance to a valid target tile.

For `tile` targeting: bounds which tiles the player may select.

For `direction` targeting: defines how far the attack extends along the chosen direction. If `min_range` is greater than 1, the attack skips tiles closer than `min_range` (useful for weapons that cannot hit adjacent tiles, like a pike with min_range 2).

Set `min_range == max_range` for fixed-distance attacks (adjacent throw at exact range 2, lance).

**`requires_los`** *(boolean)*
Whether the attacker must have unobstructed line of sight to the target tile in order to aim there. Lofted attacks typically set this to `false`.

**`requires_occupied`** *(boolean)*
If `true`, the target tile must contain a unit, structure, or object. The UI should not offer unoccupied tiles as valid targets. Used for charge and grapple.

**`requires_clear_path`** *(boolean)*
If `true`, no unit, structure, or object may occupy any tile between the attacker and target. The target tile itself may be occupied. Used for both charge attacks and reach weapons like the lance — the rule is the same: intervening tiles must be clear. Note: charge is restricted to straight-line paths; diagonal path tile-checking is not yet defined.

**`count`** *(integer or null)*
For `tile_multi` only: how many tiles the player must select.

**`selection_constraint`** *(string)*
For `tile_multi` only: spatial relationship required between selected tiles.

| Value | Description |
|---|---|
| `any` | Selected tiles have no spatial relationship requirement |
| `adjacent` | All selected tiles must be adjacent to each other (wall of fire: two tiles touching) |

---

### Layer 2: Propagation

Propagation defines the shape and travel behavior of the attack from the attacker to (and around) the aim point.

**Range is always determined by targeting.** `propagation.range` is only used for area shapes (`plus`, `radius`, `ring`) to define their size at the aim point — it is not used for `line`, `cone`, or `none` shapes.

```json
{
  "propagation": {
    "shape": "line",
    "loft": false,
    "penetration": "stop_at_first",
    "range": null,
    "on_hit": null
  }
}
```

#### Flight Phase

**`shape`** *(string)*

`line` and `cone` originate from the attacker and extend toward or along the aim direction, reaching `targeting.max_range`. `plus`, `radius`, and `ring` are centered on the aim point, with their size set by `propagation.range`.

| Value | Description |
|---|---|
| `none` | Only the targeted tile(s); no additional area |
| `line` | A straight line from the attacker extending toward the aimed tile (tile mode) or in the chosen direction (direction mode), up to `targeting.max_range`. Penetration determines what it passes through. |
| `plus` | Cross shape centered on the aim point — center plus all tiles within `range` cardinal steps (Manhattan distance ≤ `range`); `range` 1 is the classic 5-tile cross |
| `radius` | Filled square centered on the aim point — all tiles within `range` steps in any direction including diagonals (Chebyshev distance ≤ `range`); `range` 1 is a 3×3 block |
| `ring` | All tiles exactly `range` steps from the aim point |

**`range`** *(integer or null)*
Used only for `plus`, `radius`, and `ring` shapes. Defines the size of the area effect at the aim point. Not used for `line`, `cone`, or `none`.

**`loft`** *(boolean)*
If `true`, the attack arcs over all intervening tiles and units during flight and arrives at the aim point without interacting with anything along the path. Only `shape: none` and area shapes (`plus`, `radius`, `ring`) are meaningful when `loft` is `true`; a `line` shape with `loft: true` produces the same result as `none`. When `loft` is `true`, `requires_los` is ignored.

**`penetration`** *(string)*
What the attack passes through during flight. Applies to `line` and `cone` shapes; ignored when `loft` is `true` or `shape` is `none`.

| Value | Description |
|---|---|
| `stop_at_first` | Halts at the first unit or structure it contacts along the path |
| `penetrate_units` | Passes through units; stopped by structures |
| `penetrate_all` | Passes through and hits every unit and structure in its path |
| `penetrate_N` | Hits up to N targets before stopping (replace N with a number, e.g. `penetrate_2`) |

> **Does the blocking tile take damage?** When `stop_at_first` or `penetrate_units` halts at a structure, whether that structure is itself affected is defined in the effect layer, not here.

#### On-Hit Phase

Some attacks trigger secondary propagation when they arrive — a shockwave radiates out, a boulder continues rolling, a flame front spreads. The `on_hit` block defines this.

```json
{
  "on_hit": {
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
| `inherit` | Continues in the same direction the attack was traveling. Only valid when the primary propagation has a direction (`line`, `cone`). |
| `all` | Radiates outward in all directions from the hit tile (shockwave, explosion) |
| `cardinal` | Radiates in the four cardinal directions only |

**`range`** — how far the on-hit effect travels from the hit tile.

**`penetration`** — same values as the flight penetration field.

---

### Layer 3: Effect

Effect defines what happens to any unit or tile touched by the attack, whether during flight or on hit.

```json
{
  "effect": {
    "damage": {
      "amount": 2,
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
    "on_hit_effect": null
  }
}
```

**`damage`**
The amount and damage type for the attack. `amount` is a flat integer — damage
is deterministic, with no dice or randomness. The same value is what an attack
preview shows and what resolution applies, so the previewed outcome is exact.

```json
{ "amount": 2, "type": "fire" }
```

Common damage types: `bludgeoning`, `piercing`, `slashing`, `fire`, `cold`, `lightning`, `necrotic`, `radiant`, `poison`.

**`applies_at`** *(string)*
Controls at which phase of the attack's travel damage and effects are applied.

| Value | Description |
|---|---|
| `path_only` | Only affects tiles the attack passes through; not the landing tile |
| `landing_only` | Only affects the landing tile |
| `landing_and_roll` | Affects the landing tile and all tiles in the on_hit roll |
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

**`on_hit_effect`** *(object or null)*
A separate effect definition applied only during the on_hit phase. If null, the primary effect applies to all phases as governed by `applies_at`. Using `on_hit_effect` allows the impact and the secondary propagation (roll, shockwave) to deal different damage or cause different conditions.

---

### Forced Movement

Forced movement is a first-class effect used for pushback, knockback, pulls, and shoves. It can appear in the primary `effect` block or in `on_hit_effect`.

```json
{
  "forced_movement": {
    "type": "push",
    "direction": "away_from_origin",
    "distance": 2,
    "blocked_by": ["walls", "other_units"],
    "collision_damage": {
      "amount": 1,
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
