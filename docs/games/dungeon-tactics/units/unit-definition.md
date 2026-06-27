# Dungeon Tactics — Unit Definition Framework

This document defines how a unit is described in data. It is the top-level
framework that ties together the two composable subsystems documented separately:

- **Movement** — how a unit paths across the grid → [`movement.md`](./movement.md)
- **Attacks** — targeting, propagation, and effect → [`attack.md`](./attack.md)

The attack system (targeting → propagation → effect) and the movement pathing
model are **unchanged**. What is new is the **turn structure**: player characters
now take a *sequence* of interleaved moves and actions on their turn instead of a
single move-then-attack. This document describes how that turn flexibility is
modeled.

---

## Design principle: archetypes own the rules, data owns the values

Rather than encode one universal turn engine that can express every class's
economy through data, the turn rules live in **code**, organized into a small
set of **archetypes**. An archetype is a coded ruleset that drives the turn:
what choices are offered, in what order, and when the turn ends.

A unit declares exactly **one archetype**. The unit's data then only supplies the
**values** that archetype's ruleset reads — resource amounts, the list of
actions, their costs, and per-action flags. The same archetype is reused across
many concrete units:

| Archetype | Example units | Turn rule (summary) |
|---|---|---|
| `brute`   | skeleton, zombie, most enemies | One move, then one attack. AI-driven. |
| `fighter` | barbarian, knight, paladin | Move (splittable), then one action. Actions may carry built-in movement (charge) or pushback. |
| `rogue`   | thief, assassin | Move / action / move. Movement is a pool; some actions refill it, some end the turn. |
| `ranger`  | hunter, scout | Ranged actions, **forced to move between actions**. Rotating ammo. |
| `mage`    | wizard, sorcerer, geomancer | Mana pool; cast spells costing mana; teleport freely between casts. |

Adding a new class is usually **data only** (pick an archetype, fill in actions).
A genuinely new turn rule is the only thing that requires a new coded archetype.

---

## Common unit shape

Every unit — regardless of archetype — shares the same top-level shape. Only the
`archetype` value and the contents of `params` / `actions` vary.

```json
{
  "id": "barbarian",
  "name": "Barbarian",
  "archetype": "fighter",
  "max_hp": 4,
  "movement": { "range": 3, "traversal": "walk", "diagonal": false,
                "passthrough": [], "blocked_by": [] },
  "params": {},
  "actions": [ /* shared-shell action objects, see below */ ]
}
```

**`id`** *(string)* — stable identifier for the archetype instance (used by the
designer and the engine).

**`name`** *(string)* — display name.

**`archetype`** *(string)* — `brute | fighter | rogue | ranger | mage`. Selects
the coded turn ruleset. This is the only field that changes which code path runs.

**`max_hp`** *(integer)* — maximum hit points. Unchanged from the prior framework
(start at full HP; removed at 0). Current HP is runtime state, not part of the
definition.

**`movement`** *(object)* — the base movement/pathing block from
[`movement.md`](./movement.md). Defines **how** the unit moves each step (range,
traversal, diagonal, passthrough/blocked_by). How that movement budget is *spent
across the turn* is the archetype's job, not this block's.

**`params`** *(object)* — **archetype-scoped, unit-level** values the ruleset
reads (e.g. a Mage's `mana` pool size). Empty `{}` when the archetype needs no
unit-level configuration. The set of recognized keys is defined per archetype
below.

**`actions`** *(array)* — the menu of things this unit can do on its turn, each in
the shared action shell.

---

## The shared action shell

Every action — a sword swing, a spell, a net throw, a charge — uses one common
object shape. Fields the archetype doesn't use are simply omitted. The
archetype-specific knobs live inside `params`, which only the owning archetype
interprets.

```json
{
  "id": "bash",
  "name": "Bash",
  "icon": "hammer",
  "attack":   { /* targeting + propagation + effect — see attack.md */ },
  "movement": { /* optional self-movement for this action — see movement.md */ },
  "ends_turn": false,
  "max_uses": null,
  "params": { /* archetype-specific: mana_cost, grants_move, rotation, ... */ }
}
```

**`id`** / **`name`** / **`icon`** — identity and presentation.

**`attack`** *(object or null)* — an attack definition (targeting → propagation →
effect) exactly as specified in [`attack.md`](./attack.md). Present whenever the
action deals damage, applies a status, or modifies terrain. A pure-movement
action (a plain reposition, a teleport with no strike) may omit it.

**`movement`** *(object or null)* — an **action-embedded self-movement** block
that moves the *acting unit* as part of resolving this action (charge in, leap
away, blink). It reuses the [`movement.md`](./movement.md) field shape. This is
distinct from:
  - the unit's **base `movement`** block (free movement spent across the turn), and
  - **`effect.forced_movement`** in attack.md (which moves the *target*, e.g.
    pushback).

The *timing and semantics* of an action's `movement` (before vs. after the
attack, toward vs. away from the target) are decided by the owning archetype,
optionally steered by `params`. See [movement.md → Action-embedded
movement](./movement.md#action-embedded-movement).

**`ends_turn`** *(boolean, default `false`)* — if `true`, the unit's turn ends
immediately after this action resolves. Used by archetypes with multi-action
turns (rogue, mage) to mark committing/finishing moves.

**`max_uses`** *(integer or null, default `null`)* — how many times this action
may be taken **per turn**. `null` means "unlimited, subject to the archetype's
economy" (e.g. still gated by mana or movement). `1` covers once-per-turn
specials; `2` covers twice-per-turn, etc.

**`params`** *(object)* — archetype-specific values. Documented per archetype
below. Keys an archetype doesn't recognize are ignored, which keeps the editor
schema uniform.

> **One editor, one schema.** Because every action shares this shell, the unit
> designer renders one action form for all archetypes; the archetype only changes
> which `params` inputs are shown and how the engine interprets them.

---

## Archetypes

Each archetype below documents three things: the **turn rule** (the coded
behavior), **what it reads from data** (the only fields the ruleset consumes), and
a **complete example unit**.

### `brute` — simple enemy

The baseline used by almost all NPCs/enemies.

**Turn rule.** One movement (up to `movement.range`), then one attack, then the
turn ends. AI-controlled: the engine moves toward a target and uses the unit's
attack when in range. No action menu is presented; if the unit has more than one
attack, the AI picks the first usable one.

**Reads from data.** `movement`; the first usable `attack` in `actions`. Ignores
`ends_turn`, `max_uses`, `params`.

```json
{
  "id": "skeleton-warrior",
  "name": "Skeleton Warrior",
  "archetype": "brute",
  "max_hp": 3,
  "movement": { "range": 3, "traversal": "walk", "diagonal": false,
                "passthrough": [], "blocked_by": [] },
  "params": {},
  "actions": [
    {
      "id": "rusty-sword",
      "name": "Rusty Sword",
      "attack": {
        "targeting": { "mode": "tile", "arc": "cardinal", "min_range": 1,
                       "max_range": 1, "requires_occupied": true },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 3, "type": "slashing" },
                    "applies_at": "landing_only", "friendly_fire": false }
      }
    }
  ]
}
```

---

### `fighter` — move then act

**Turn rule.** The unit may spend its movement (up to `movement.range`), then take
**one** action from its menu, and may spend any remaining movement after the
action (movement is splittable around the single action). The turn ends after the
action resolves, or earlier if the action's `ends_turn` is set. Actions can carry
their own `movement` block (e.g. **charge**: close to the target then strike) and
commonly apply pushback via `effect.forced_movement`.

**Reads from data.** `movement` (splittable budget); the chosen action's `attack`
and optional `movement`. `params.move_after` *(boolean, default `true`)* — whether
leftover movement may be spent after the action.

```json
{
  "id": "barbarian",
  "name": "Barbarian",
  "archetype": "fighter",
  "max_hp": 4,
  "movement": { "range": 3, "traversal": "walk", "diagonal": false,
                "passthrough": [], "blocked_by": [] },
  "params": { "move_after": true },
  "actions": [
    {
      "id": "bash",
      "name": "Bash",
      "attack": {
        "targeting": { "mode": "tile", "arc": "cardinal", "min_range": 1,
                       "max_range": 1, "requires_occupied": true },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": {
          "damage": { "amount": 3, "type": "bludgeoning" },
          "applies_at": "landing_only", "friendly_fire": false,
          "forced_movement": { "type": "push", "direction": "away_from_origin",
            "distance": 1, "blocked_by": ["walls", "other_units"],
            "collision_damage": { "amount": 1, "type": "bludgeoning" } }
        }
      }
    },
    {
      "id": "shove",
      "name": "Shove",
      "attack": {
        "targeting": { "mode": "tile", "arc": "cardinal", "min_range": 1,
                       "max_range": 1, "requires_occupied": true },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": {
          "damage": { "amount": 0, "type": "bludgeoning" },
          "applies_at": "landing_only", "friendly_fire": false,
          "forced_movement": { "type": "push", "direction": "away_from_origin",
            "distance": 2, "blocked_by": ["walls", "other_units"],
            "collision_damage": { "amount": 1, "type": "bludgeoning" } }
        }
      }
    },
    {
      "id": "charge",
      "name": "Charge",
      "movement": { "range": 4, "traversal": "walk", "diagonal": false,
                    "passthrough": [], "blocked_by": [] },
      "attack": {
        "targeting": { "mode": "tile", "arc": "cardinal", "min_range": 2,
                       "max_range": 4, "requires_occupied": true,
                       "requires_clear_path": true },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": {
          "damage": { "amount": 2, "type": "bludgeoning" },
          "applies_at": "landing_only", "friendly_fire": false,
          "forced_movement": { "type": "push", "direction": "away_from_origin",
            "distance": 1, "blocked_by": ["walls", "other_units"],
            "collision_damage": { "amount": 1, "type": "bludgeoning" } }
        }
      }
    }
  ]
}
```

> **Taunt / enrage / raging** from the design brief depend on the deferred status
> system and are **not yet expressible** — see [TODOs](#todos).

---

### `rogue` — move / action / move

**Turn rule.** The unit begins with a movement pool equal to `movement.range`. It
may freely alternate **moving** (drawing down the pool) and **taking actions**.
Most actions cost nothing but the opportunity, and some **refill movement**
(`params.grants_move`) so the unit can keep going — the classic move → strike →
keep moving flow. The turn ends when an `ends_turn` action is taken, when no
affordable/available action remains, or when the player chooses to stop.
`max_uses` caps how often a given action can be repeated in the turn.

**Reads from data.** `movement` (initial pool = `range`); per action:
`params.grants_move` *(integer, default `0`)*, `ends_turn`, `max_uses`, `attack`,
optional `movement`.

```json
{
  "id": "thief",
  "name": "Thief",
  "archetype": "rogue",
  "max_hp": 3,
  "movement": { "range": 4, "traversal": "walk", "diagonal": false,
                "passthrough": ["enemy_units"], "blocked_by": [] },
  "params": {},
  "actions": [
    {
      "id": "backstab",
      "name": "Backstab",
      "max_uses": 1,
      "attack": {
        "targeting": { "mode": "tile", "arc": "both", "min_range": 1,
                       "max_range": 1, "requires_occupied": true },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 3, "type": "piercing" },
                    "applies_at": "landing_only", "friendly_fire": false }
      },
      "params": { "grants_move": 2 }
    },
    {
      "id": "throw-dagger",
      "name": "Throw Dagger",
      "attack": {
        "targeting": { "mode": "tile", "arc": "both", "min_range": 1,
                       "max_range": 3, "requires_occupied": true,
                       "requires_los": true },
        "propagation": { "shape": "line", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 2, "type": "piercing" },
                    "applies_at": "landing_only", "friendly_fire": false }
      },
      "params": { "grants_move": 0 }
    },
    {
      "id": "vanish",
      "name": "Vanish",
      "ends_turn": true,
      "movement": { "range": 3, "traversal": "walk", "diagonal": false,
                    "passthrough": ["enemy_units"], "blocked_by": [] },
      "params": { "grants_move": 0 }
    }
  ]
}
```

> Whether the rogue may move diagonally or path *through* enemy units is a balance
> question flagged for playtesting in the brief; it is expressed entirely through
> the `movement` block (`diagonal`, `passthrough`) and needs no archetype change.

---

### `ranger` — forced to move between actions

**Turn rule.** A skirmisher built around ranged attacks. The ruleset **requires a
move between consecutive actions**: after taking any action, the unit must spend
at least one tile of movement before it may act again (kiting). Movement is a pool
of `movement.range`. The signature bow action **rotates ammo**: each use advances
through `params.rotation`, cycling normal → poison → exploding → normal. Rotation
state is **runtime** and persists across turns within a match. The turn ends on an
`ends_turn` action, when no further action is legal (e.g. no movement left to
satisfy the between-actions move), or by player choice.

**Reads from data.** `movement` (pool, and the forced between-actions move); per
action: `params.rotation` *(array of attack variants, optional)*, `attack`,
`ends_turn`, `max_uses`.

```json
{
  "id": "ranger",
  "name": "Ranger",
  "archetype": "ranger",
  "max_hp": 3,
  "movement": { "range": 4, "traversal": "walk", "diagonal": false,
                "passthrough": [], "blocked_by": [] },
  "params": {},
  "actions": [
    {
      "id": "longbow",
      "name": "Longbow",
      "icon": "bow",
      "params": {
        "rotation": [
          {
            "name": "Normal Arrow",
            "attack": {
              "targeting": { "mode": "tile", "arc": "both", "min_range": 2,
                             "max_range": 6, "requires_occupied": true,
                             "requires_los": true },
              "propagation": { "shape": "line", "penetration": "stop_at_first" },
              "effect": { "damage": { "amount": 3, "type": "piercing" },
                          "applies_at": "landing_only", "friendly_fire": false }
            }
          },
          {
            "name": "Poison Arrow",
            "attack": {
              "targeting": { "mode": "tile", "arc": "both", "min_range": 2,
                             "max_range": 6, "requires_occupied": true,
                             "requires_los": true },
              "propagation": { "shape": "line", "penetration": "stop_at_first" },
              "effect": { "damage": { "amount": 1, "type": "piercing" },
                          "applies_at": "landing_only", "status": "poisoned",
                          "status_duration": 2, "friendly_fire": false }
            }
          },
          {
            "name": "Exploding Arrow",
            "attack": {
              "targeting": { "mode": "tile", "arc": "both", "min_range": 2,
                             "max_range": 6, "requires_los": false },
              "propagation": { "shape": "none", "loft": true,
                               "penetration": "stop_at_first" },
              "effect": { "damage": { "amount": 2, "type": "fire" },
                          "applies_at": "landing_only", "splash_radius": 1,
                          "applies_to": "units", "friendly_fire": true }
            }
          }
        ]
      }
    },
    {
      "id": "throw-net",
      "name": "Throw Net",
      "max_uses": 1,
      "attack": {
        "targeting": { "mode": "tile", "arc": "both", "min_range": 1,
                       "max_range": 3, "requires_occupied": true },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 0, "type": "bludgeoning" },
                    "applies_at": "landing_only", "status": "stunned",
                    "status_duration": 1, "friendly_fire": false }
      }
    },
    {
      "id": "caltrops",
      "name": "Drop Caltrops",
      "max_uses": 1,
      "attack": {
        "targeting": { "mode": "tile", "arc": "both", "min_range": 1,
                       "max_range": 2 },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 0, "type": "piercing" },
                    "applies_at": "landing_only", "applies_to": "terrain",
                    "terrain_effect": "difficult_terrain", "terrain_duration": -1,
                    "friendly_fire": true }
      }
    }
  ]
}
```

> **Spear** and **crossbow** from the brief are additional `actions` of the same
> shell shape and are omitted here for brevity.

---

### `mage` — mana and free teleport

**Turn rule.** The unit has a **mana pool** of `params.mana`, reset each turn. It
may cast any spell it can afford (`action.params.mana_cost`), spending mana down,
and may **move freely between casts** up to its `movement.range` (movement
`traversal` is `teleport`, so movement ignores intervening units/obstacles). The
turn ends when the mage can no longer afford any spell, on an `ends_turn` action,
or by player choice. Spells are ordinary actions: damage spells carry an `attack`;
utility spells (create/destroy wall) use an `attack` whose `effect.applies_to` is
`terrain`; "freeze enemy" uses `effect.status` (already supported by attack.md).

**Reads from data.** `movement` (teleport budget, spent freely between casts);
`params.mana` *(integer, unit-level pool)*; per action: `params.mana_cost`
*(integer)*, `attack`, `ends_turn`, `max_uses`.

```json
{
  "id": "wizard",
  "name": "Wizard",
  "archetype": "mage",
  "max_hp": 3,
  "movement": { "range": 4, "traversal": "teleport", "diagonal": true,
                "passthrough": [], "blocked_by": [] },
  "params": { "mana": 3 },
  "actions": [
    {
      "id": "create-wall",
      "name": "Create Wall",
      "params": { "mana_cost": 1 },
      "attack": {
        "targeting": { "mode": "tile", "arc": "both", "min_range": 1,
                       "max_range": 4 },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 0, "type": "bludgeoning" },
                    "applies_at": "landing_only", "applies_to": "terrain",
                    "terrain_effect": "wall", "terrain_duration": -1,
                    "friendly_fire": true }
      }
    },
    {
      "id": "wall-of-fire",
      "name": "Wall of Fire",
      "params": { "mana_cost": 2 },
      "attack": {
        "targeting": { "mode": "tile_multi", "arc": "both", "min_range": 1,
                       "max_range": 4, "count": 2,
                       "selection_constraint": "adjacent" },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 2, "type": "fire" },
                    "applies_at": "landing_only", "applies_to": "both",
                    "status": "burning", "status_duration": 2,
                    "terrain_effect": "burning_ground", "terrain_duration": 2,
                    "friendly_fire": true }
      }
    },
    {
      "id": "freeze",
      "name": "Freeze Enemy",
      "params": { "mana_cost": 2 },
      "attack": {
        "targeting": { "mode": "tile", "arc": "both", "min_range": 1,
                       "max_range": 4, "requires_occupied": true,
                       "requires_los": true },
        "propagation": { "shape": "none", "penetration": "stop_at_first" },
        "effect": { "damage": { "amount": 0, "type": "cold" },
                    "applies_at": "landing_only", "status": "frozen",
                    "status_duration": 1, "friendly_fire": false }
      }
    }
  ]
}
```

> The `terrain_effect` values `wall` and `obscuring_fog` (the latter costing extra
> movement to traverse) are new terrain types implied by the brief; see
> [TODOs](#todos). "Ice flow" / sliding is explicitly out of scope.

---

## Data structure reference

```
unit
├── id
├── name
├── archetype           (brute | fighter | rogue | ranger | mage)
├── max_hp
├── movement            (movement.md block — base pathing)
├── params              (archetype-scoped, unit-level; e.g. mage { mana })
└── actions[]
    ├── id
    ├── name
    ├── icon
    ├── attack          (attack.md: targeting + propagation + effect) — optional
    ├── movement        (movement.md block — action-embedded self-movement) — optional
    ├── ends_turn       (boolean)
    ├── max_uses        (integer | null)
    └── params          (archetype-scoped; e.g. mana_cost | grants_move | rotation)
```

**Params recognized per archetype**

| Archetype | Unit-level `params` | Action-level `params` |
|---|---|---|
| `brute`   | — | — |
| `fighter` | `move_after` | — |
| `rogue`   | — | `grants_move` |
| `ranger`  | — | `rotation` |
| `mage`    | `mana` | `mana_cost` |

---

## Persistence, scenarios, and the unit designer

Storage, scenarios, the API surface, and the in-game editor are **unchanged** from
the archived plan — see
[`../archive/unit_framework.md`](../archive/unit_framework.md) (sections
"Persisting unit definitions" through "Live iteration"). The only schema change is
that a `UnitDef` now carries `archetype`, `params`, and an `actions[]` list (shared
shell) instead of a bare `attacks[]` list. Because definitions are stored as a JSON
blob validated by a Zod schema at the API layer, this is an additive change with no
table migration; the Zod schema gains the `archetype` enum and the per-archetype
`params` shapes.

---

## TODOs

Carried forward from the subsystem docs and surfaced by this design:

- **Status system (blocking several brief features).** Deferred. Needed to express
  Fighter `raging` (self-buff: +movement/+damage), `enrage` (force an enemy to
  target the barbarian), `taunt` (pull/force enemy to approach), and any status
  whose effect is a *behavior modifier* rather than the simple
  `effect.status`/`status_duration` already in attack.md. Until it lands, those
  three Barbarian actions and similar are not authorable.
- **New terrain types.** `wall`, `obscuring_fog` (extra movement cost to traverse)
  are referenced by Mage spells but need definitions in the terrain/region model.
  "Ice flow" / sliding is explicitly out of scope.
- **Action-embedded movement semantics.** Pin down, per archetype, the exact
  timing (before/after the attack) and aim (toward/away from target/free) of an
  action's `movement` block, and what `params` (if any) steer it.
- **Ranger rotation state.** Confirm rotation index persists across turns within a
  match (assumed yes) and define where that runtime state lives and how it resets.
- **Fighter action count.** Confirmed as move + one action for now; revisit if
  playtesting wants combo turns.
- **Rogue diagonal / pass-through-enemy movement.** Flagged for playtesting in the
  brief; expressed via the `movement` block, no archetype change required.
- Inherited from [`movement.md`](./movement.md): terrain movement costs; per-unit
  terrain traversal capabilities (swim/climb replacement); `passthrough` /
  `blocked_by` validation and rule-application order.
- Inherited from [`attack.md`](./attack.md): diagonal path-tile checking for
  `requires_clear_path` (charge); blocking-tile damage clarification.
