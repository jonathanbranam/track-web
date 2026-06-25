# Dungeon Tactics — Content Model & Design Tools

A design specification for the **serialized, editable game content** of Dungeon
Tactics: the themed regions, maps, encounters, and enemy waves a player fights
through — and the dedicated editing area where that content is authored.

This is distinct from the **unit framework** (`unit_framework.md`), which
describes how a single unit's *behavior* is defined. This document describes how
*content* (where you fight, what board, against what) is structured and stored.

> **Status:** design / not yet implemented. Marks MVP scope and open questions
> explicitly. Grounded against the current code, where the board is hardcoded in
> `client-games/src/games/dungeon-tactics-solo/map.ts` and only unit defs are
> persisted.

---

## Motivation

Today, exactly one thing about Dungeon Tactics is data-driven and persisted: the
**unit definitions** (per-archetype stats), stored as `game_scenarios` +
`game_unit_defs` and edited live via the in-game `ScenarioEditor` panel.

Everything else — the board, terrain, structures, spawn zones, enemy waves — is
hardcoded in `map.ts` and compiled into the bundle. The full game needs this to
be **authored content**: many themed regions, each a sequence of maps, each map a
sequence of encounters. All of it serialized to the database and editable.

Because you can't sensibly edit a map or an encounter *while playing it*, this
authoring moves into a **dedicated design section** of `client-games`, separate
from the play flow.

---

## Terminology

We are deliberately **retiring "Scenario" as a name for the unit-def bundle.** In
tactics games "scenario" reads as *a battle setup* (a map plus enemies plus
objectives) — which is exactly what an **Encounter** is here. Reusing the word
would collide with the new model.

| Term | Meaning | Notes |
|---|---|---|
| **Variant** | A named, complete set of unit definitions (all PC + NPC archetypes) — a *provisional* tuning pass you create to playtest balance, then set as the default once you like it. | **Renames today's "Scenario."** Orthogonal to the content tree — see [Variants vs. content](#variants-vs-content). The name signals it's a temporary, experimental thing, not canonical content. |
| **Region** | A themed area the player enters (ice caves, forest, tundra, desert, dungeon…). Contains an ordered list of Maps. | Top of the content tree (for MVP; a "Campaign/World" wrapper above regions is a possible later addition). |
| **Map** | A single board within a region. The terrain, structures, and spawn zones. Maps in a region are completed **in sequence**. | Holds an ordered list of Encounters. |
| **Encounter** | A sequential challenge fought *on* a map, with its own objectives and pacing. A map has one or more, played in order. | Holds an ordered list of Waves + win/lose conditions + achievements. |
| **Wave** | A group of enemies that enters during an encounter, with a **start trigger** governing when it appears. | References archetypes by name; stats resolve through the active Variant. |

> The legacy DB tables are named `game_scenarios` / `game_unit_defs`. Renaming
> them to `game_variants` / `game_variant_unit_defs` is an **optional follow-up
> migration** — the *concept* and UI become "Variant" now; the physical rename can
> trail.

---

## The content hierarchy

```
Region  (themed zone the player enters)
  │   theme · ordered maps
  │
  └─ Map  (a board; maps cleared in sequence within a region)
       │   size · terrain grid · structures · enemy spawn zone · player spawn area
       │   ordered encounters
       │
       └─ Encounter  (a sequential challenge on that board)
            │   ordered waves · win/lose conditions · achievements
            │
            └─ Wave  (enemies entering together, on a start trigger)
                 │   start trigger · [ { archetype, count } … ]
                 │
                 └─ archetype  ──referenced by name──►  active VARIANT  (the stats)
```

A play session through a region is: enter Region → play Map 1 (run its
Encounters in order) → play Map 2 → … until the region is complete.

---

## Entities

JSON shapes below are illustrative, not final schemas. Tile coordinates use
`col,row` with `(0,0)` at the top-left.

### Region

```json
{
  "id": "frostfall-caves",
  "name": "Frostfall Caves",
  "theme": "ice-caves",
  "order": 1,
  "maps": ["entrance", "frozen-hall"]
}
```

- **`theme`** — drives visual/tileset flavor (`ice-caves`, `forest`, `tundra`,
  `desert`, `dungeon`, …). Valid values depend on art assets and designs.
- **`order`** — sequence of regions (when there's more than one).
- **`maps`** — ordered map ids; the completion sequence.

### Map

```json
{
  "id": "entrance",
  "regionId": "frostfall-caves",
  "name": "Cave Entrance",
  "order": 1,
  "size": { "cols": 8, "rows": 10 },
  "terrain": [ ["ice","ice","snow", "…"], "… one inner array per row …" ],
  "structures": [
    { "col": 4, "row": 2, "kind": "power-center", "hp": 3 },
    { "col": 4, "row": 8, "kind": "tower", "hp": 5 }
  ],
  "enemySpawnZone":  ["3,0", "4,0", "5,0"],
  "playerSpawnZone": ["2,9", "3,9", "4,9", "5,9"],
  "encounters": ["ambush", "boss"]
}
```

- **`size`** — `cols × rows`, a **first-class adjustable property of each map**.
  The editor supports variable board sizes from the start (resize grows/crops the
  terrain grid and validates that structures/zones stay in bounds). This is what
  takes board *orientation* off the critical path: the seed can stay today's
  **16×8 landscape**, and a **portrait 8×10** (or any other size) is simply a map
  you author in the editor later — not a precondition for the spine.
- **`terrain`** — terrain type per tile. Terrain enum is theme-influenced;
  today's set is `plains | forest | water | stone` (see `types.ts`).
- **`structures`** — buildings (power centers) and towers, with location + HP.
  Replaces the hand-placed structures in `INITIAL_MAP`.
- **`enemySpawnZone`** — tiles where waves may spawn (replaces hardcoded
  `SPAWNER_POSITIONS`).
- **`playerSpawnZone`** — tiles where the player places/starts units (replaces
  `SPAWN_ZONE_LAYOUT` + `PC_START_TILES`).

### Encounter

```json
{
  "id": "ambush",
  "mapId": "entrance",
  "name": "Ambush",
  "order": 1,
  "waves": [
    {
      "index": 0,
      "start": { "trigger": "immediate" },
      "enemies": [
        { "archetype": "short-range", "count": 2 },
        { "archetype": "long-range",  "count": 1 }
      ]
    },
    {
      "index": 1,
      "start": { "trigger": "after-prev-cleared" },
      "enemies": [ { "archetype": "short-range", "count": 3 } ]
    }
  ],
  "win":  [ { "type": "clear-all-waves" } ],
  "lose": [ { "type": "all-pcs-defeated" }, { "type": "structure-destroyed", "ref": "tower" } ],
  "achievements": [ { "type": "survive-turns", "turns": 5 } ]
}
```

- **`waves`** — ordered; each has a **start trigger** and an enemy manifest.
- **`win`** — a **list** of conditions; the encounter is won when **any one** is
  met (OR semantics). A single-element list is the common case.
- **`lose`** — a **list** of conditions; the encounter is lost when **any one** is
  met. Lose is checked before win on a turn where both could trigger.
- **`achievements`** — a **list** of optional, condition-shaped goals (same
  vocabulary as win/lose) that don't end the encounter — they're tracked for
  bonus/reward/scoring purposes. **Exact content TBD** (what they grant, how
  they're surfaced); the field is reserved now so the schema and editor can carry
  it from the start.

### Wave start triggers

A discriminated union — *when* the wave enters:

| `trigger` | Params | Meaning |
|---|---|---|
| `immediate` | — | Spawns when the encounter begins. |
| `after-prev-cleared` | — | Spawns once the previous wave is fully defeated. |
| `after-turns` | `turns: N` | Spawns N turns into the encounter (or after the previous wave started). |

Enemies spawn into the map's **`enemySpawnZone`** (auto-distributed; the existing
spawn-placement logic — see the `dungeon-tactics-spawn-placement` spec — applies).
Pinning an enemy to a specific tile is a possible later extension.

### Conditions

`win`, `lose`, and `achievements` are each a **list** of condition objects drawn
from one shared, extensible vocabulary — a condition is just a `type` plus its
params. The list it sits in decides what meeting it *does*:

| List | Met when **any** condition is true → |
|---|---|
| `win` | The encounter is won. |
| `lose` | The encounter is lost. (Checked before `win` on a tie turn.) |
| `achievements` | A bonus is recorded; the encounter continues. (Effect **TBD**.) |

Because they share a vocabulary, the same `type` can serve different roles — e.g.
`survive-turns` is a *win* in a defense encounter but an *achievement* ("no-death
clear by turn 5") elsewhere.

**Win-flavored**
| `type` | Params | Meaning |
|---|---|---|
| `clear-all-waves` | — | Defeat every enemy of every wave. (MVP default win.) |
| `survive-turns` | `turns: N` | Reach turn N. |
| `reach-tile` | `tile: "c,r"` | Get a PC to a target tile. |

**Lose-flavored**
| `type` | Params | Meaning |
|---|---|---|
| `all-pcs-defeated` | — | Every player unit is dead. (MVP default lose.) |
| `structure-destroyed` | `ref` | A protected structure is destroyed. |
| `turn-limit` | `turns: N` | Encounter not won within N turns. |

The split above is by *typical use*, not a hard partition — any condition can
appear in any of the three lists.

---

## Variants vs. content

The **Variant** (unit stats) is *orthogonal* to the content tree:

```
   CONTENT  (where + what you fight)        TUNING  (the numbers)
   Region → Map → Encounter → Wave          Variant → per-archetype UnitDef
                         │                        ▲
                         └── names archetype ─────┘
                              "short-range"
```

A wave references an archetype **by name**; the actual stats come from the
**active Variant** at play time (via the existing `defStore`). This keeps content
and tuning independently editable — you can rebalance every enemy in the game by
switching Variants, without touching a single encounter.

Keep the current **single global active Variant** model. Do *not*
let a Region/Map/Encounter pin its own Variant. Variants are a tool to use for
the game designer and NOT a gameplay or game design mechanic.

---

## Where editing lives — the design section

Authoring content such as region, map, encounter moves **out of the play flow**
into a dedicated section of `client-games`, since you can't edit a map or
encounter while playing it.

```
  client-games routes
  ────────────────────
  /                         home / game catalog
  /game/:slug               play a game        ← NavBar hidden in-game
  /game/prototypes          prototypes picker  (precedent for a sub-area)

  /studio                   NEW: design tools home          ┐
  /studio/dungeon-tactics   DT design hub                   │ dedicated
    …/regions  …/maps/:id   region & map editors            │ design area
    …/encounters/:id        encounter / wave editor         │ (DT-scoped now,
    …/variant               in-depth unit (Variant) designer  │ extensible)
    …/test                  sandbox tester                  ┘
```

- The area is **DT-scoped for now** but lives at a generic `/studio` (or
  `/design`) root so other games' tools can join later.
- The **in-game `ScenarioEditor` panel stays** — it's the quick, live, in-match
  tuning affordance. The studio's Variant designer is the roomy, standalone
  counterpart. They edit the same underlying Variants.
- Final route names are open (`/studio` vs `/design` vs `/workshop`).

---

## Persistence

Mirror the existing pattern (`game_scenarios` / `game_unit_defs` + a `defStore`
load/reload seam + a localStorage "active" pointer). Sketch:

```
game_regions     (game_slug, region_id, name, theme, order, …)
game_maps        (game_slug, region_id, map_id, name, order, def_json)   ← terrain/structures/zones as JSON
game_encounters  (game_slug, map_id, encounter_id, name, order, def_json) ← waves/win/lose as JSON
```

- Large, shaped blobs (terrain grid, wave manifests) live as validated
  `def_json` columns; identity/ordering fields are real columns for listing.
- A Zod schema validates every write (as `unitDefSchema` does today) so a
  malformed map/encounter can never be persisted.
- The client gets a **content store** analogous to `defStore`: load the active
  region's map(s) at game start, fall back to a bundled seed on fetch failure so
  the game stays playable offline.

### Seeding

"Seed" means two things, mirroring how unit defs work today
(`BUNDLED_UNIT_DEFS` → `seedDefaultIfEmpty` → `defStore` fallback):

1. **DB seed** — a `BUNDLED_MAP` const + a `seedDefaultIfEmpty`-style insert, so a
   fresh database has one region/map/encounter to load. Never overwrites existing
   content.
2. **Client fallback** — the same bundled map kept in the client so play survives
   a fetch failure (the role `unitDefs.ts` plays for stats).

**The seed is a faithful port of today's `map.ts`** — the current **16×8** board,
its terrain, structures (`SPAWNER_POSITIONS` → enemy spawn zone, `SPAWN_ZONE_LAYOUT`
/ `PC_START_TILES` → player spawn area, power centers/tower → structures). Porting
it 1:1 makes the spine a **pure refactor**: the game should play identically before
and after, which is the easy verification bar. Because map size is adjustable, this
seeded 16×8 board needs no throwaway redesign — any new shape (e.g. 8×10) is authored
in the editor as a separate map.

---

## MVP scope

Single region, single map, single encounter — but with the **real hierarchy and
persistence in place**, so growth is additive, not a rewrite.

1. **Make the map serializable.** Introduce the `Map` entity + persistence + a
   client content store; seed it with a **faithful 16×8 port of today's `map.ts`**
   so the game plays identically (a pure refactor). **Build variable map size in
   from the start** so any later board shape is editor content, not new plumbing.
   *(This is the architectural prerequisite — the heaviest single step.)*
2. **Wire play to load the map** from the store instead of `map.ts` constants
   (board, structures, spawn zones).
3. **One Region + one Encounter**, minimal: the encounter wraps today's spawn
   behavior as a single wave (`clear-all-waves` / `all-pcs-defeated`).
4. **Studio shell + map editor**: a `/studio/dungeon-tactics` section with a
   first real tool — paint terrain, place structures, mark spawn zones.
5. **Variant designer** can initially be the existing editor relocated; "in-depth"
   features layer on after.

Encounter/wave editing UI and multi-region/multi-map navigation come *after* the
map is data-driven — they're cheap once the spine exists.

---

## Open questions

1. **Board size bounds.** *(Resolved: size is adjustable per map; seed stays 16×8.)*
   Remaining: are there **min/max** dimensions, and does the Phaser scene need to
   handle both landscape and portrait aspect ratios gracefully on a phone? (Variable
   size means the renderer can no longer assume 16×8.)
2. **Terrain enum vs. theme.** Is terrain a global closed set, or does each
   `theme` bring its own tileset/terrain types (ice/snow vs. sand/dune)?
3. **Player party.** Are the player's units still the fixed 4 PC archetypes, or
   does the player bring a chosen party into a region? (Affects `playerSpawnZone`
   semantics and whether PCs belong in the Variant the same way enemies do.)
4. **Wave pacing primitives.** Are `immediate` / `after-prev-cleared` /
   `after-turns` enough, or do you want composite conditions (e.g. "after turn 3
   *and* power center still standing")?
5. **Editor route root.** `/studio`, `/design`, or `/workshop`? Top-level vs.
   nested under `/game/dungeon-tactics-solo`?
6. **Variant pinning (post-MVP).** variants are an artifact of game development
   and future game balancing but there is only ONE default, active variant for
   all current games. All variant switching is only for the game designer.
7. **DB rename.** Migrate `game_scenarios` → `game_variants`, or keep the physical
   name and only rename in the UI/domain language?
