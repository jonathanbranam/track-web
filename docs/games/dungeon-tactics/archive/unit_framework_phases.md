# Unit Framework — Capability Tiers & Implementation Ordering

A companion to [`unit_framework.md`](./unit_framework.md). That document describes
the *full* data model for unit behavior. This one organizes those capabilities
into tiers — what is mandatory, what to consider later, and what to record but
not build — and proposes an implementation order.

The intent is to guide phased implementation without losing any of the good ideas
in the framework. Nothing here changes the data model; it groups and prioritizes
it.

---

## Recommended cuts

Five capabilities in the framework add significant cost for limited payoff. The
recommendation is to remove or defer all of them.

| Item | Verdict | Why |
|---|---|---|
| **`layer` (ground/air/ethereal)** | **Cut** | This is a *collision-layer* system (units coexisting on the same tile). It's a large rules-and-rendering cost for one payoff: flyers sharing tiles. Most of "flying" comes from `traversal: fly` alone (ignores pits/obstacles for pathing) while flyers still occupy and block tiles normally. Drop the field entirely. |
| **`ethereal` / non-corporeal** | **Cut** | Only exists because of `layer`. Its one real effect — moving through walls — is already expressible as `passthrough: ["structures"]`. No separate concept needed. |
| **`climb` / `swim`** | **Cut (defer)** | Both require vertical surfaces / water terrain that don't exist yet. Adding the traversal values later is cheap; building the terrain that makes them meaningful is the real cost. Don't reserve the slots now. |
| **`requires_los`** | **Cut** | True line-of-sight is a complexity sink (the LOS algorithm, low-walls-vs-flyers, height). `penetration` (`stop_at_first`) already models "blocked by things in the way." Prefer a single global rule over a per-attack flag. Revisit only if walls-block-arrows becomes a real design need. |

Effect of these cuts:

- `traversal` collapses to `walk` / `fly` / `jump`.
- `layer` is removed from the entire spec (movement field, examples, reference).
- `requires_los` is removed from targeting.

---

## Tier 1 — Core (mandatory, MVP foundation)

The minimum to have data-driven units that move and hit each other. Deliberately
trimmed to the smallest set that produces a playable, data-driven match.

- **Health** — `max_hp`
- **Movement**
  - `range`
  - `traversal` — `walk` / `fly` only (**defer** `jump`)
  - **defer** `diagonal` and `passthrough`
- **Targeting** — `mode` (`adjacent`, `tile`, `tile_line`, `direction`), `arc`,
  `min_range`, `max_range`
  > Not restated in the Core MVP list but assumed still required — an attack needs
  > a way to pick its target. Flag if this should also be trimmed.
- **Propagation**
  - `shape` — `single`, `line` (**drop** `cone`)
  - `range`, `loft`
  - `penetration` — `none`, `stop_at_first`, `penetrate_all` only
- **Effect**
  - `damage.amount` — the only field with active mechanical effect
  - `damage.type` — kept as a **pure annotation** (recorded/displayed, no mechanical effect yet)
  - **defer** `applies_at`, `applies_to`, `friendly_fire`

---

## Tier 2 — Mandatory, later phases

Wanted for real variety, but each is a self-contained follow-up, not MVP. This
tier also absorbs the items deferred out of the Core MVP.

- **Deferred from Core MVP:**
  - Movement — `diagonal`, `passthrough` (`allied_units`, `enemy_units`)
  - Propagation — `penetration: penetrate_N`
  - Effect — `applies_at`, `applies_to: units`, `friendly_fire`, and giving
    `damage.type` actual mechanical effect (resistances/weaknesses)
- **Shapes** — `reach_line` (spears), `plus` / `radius` (AoE), `ring` (shockwave)
- **`on_land` propagation** — rolling boulder, shockwave radiating outward
- **`splash_radius`** — explosions
- **Status effects** — `status`, `status_duration` (burning, frozen, stunned…)
  plus the stacking rules
- **`forced_movement`** — push/pull/slide + `collision_damage` (the
  Into-the-Breach hook; high gameplay value)
- **`self` targeting mode** — heals / buffs

---

## Tier 3 — Consider for later

Genuinely good, but only pays off once the world is richer.

- **Terrain effects** — `applies_to: terrain/both`, `terrain_effect`,
  `terrain_duration`; burning ground / ice / pits
- **Terrain movement costs** — per-traversal entry cost (swamp, etc.)
- **`on_land_effect`** — a different effect for impact vs. roll/shockwave
- **`jump` + `jump_width`** — only if pits worth clearing are added
- **`passthrough` extensions** — `structures`, `objects`, `any`

---

## Tier 4 — Crazy cool, probably won't use

Recorded so the ideas aren't lost, but clearly out of scope.

- **Collision layers** (`layer`, air/ethereal coexistence)
- **`climb` / `swim`** traversal + the vertical/water terrain they imply
- **True line of sight** with height and low-wall nuance
- **`cone` shape** (breath weapons) — dropped from the shape set
- **Conditional effects** (flanking bonus, elemental resistance) — already noted
  as out of scope in the framework's open questions

---

## Implementation ordering

The Tier 1 → Tier 2 sequence to build in:

1. **Tier 1 core** (done / in progress)
2. **Status effects** — touches the turn loop; unlocks the most unit personality
   per unit of work
3. **AoE shapes + `splash_radius`** (`plus` / `radius` / `ring`) — pure geometry,
   no new systems
4. **`forced_movement`** — highest gameplay payoff, but needs collision resolution
5. **`on_land` + `reach_line` / `cone`** — the showy projectiles
6. **Terrain (Tier 3)** as a later milestone, once tiles need state
