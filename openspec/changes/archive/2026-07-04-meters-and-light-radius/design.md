## Context

`client-talks/src/talk-rpg/` currently models everything on screen as a
`World`/`RestingState` pair (`precompute.ts`): a plain object with fields for
`entities`, `ui`, `overlay`, `camera`, and `battle`, all cloned uniformly by
`cloneWorld`/`restingStateToWorld`/`snapshotRestingState`. The headless
`runPrecompute` pass calls the single `applyAction` reducer once per action
and snapshots a `RestingState` at every `stop`; live playback
(`directorEngine.ts` + `executors.ts`) calls the same `applyAction` for
instant actions and a per-action `Executor` (implementing `start`/`pause`/
`resume`) for anything that animates in real time, always converging on the
value `applyAction` would have computed. `snapTo`/`back`/`skipTo` never
replay — they call `restingStateToWorld` on a cached checkpoint.

This phase adds two more pieces of state to that same World/RestingState
shape: attachable scriptable meters (§4F) and a scriptable light radius/fog
(§4G). Both must fit the existing reducer/executor/clone contract exactly —
no parallel state-tracking mechanism — so `snapTo`/`back`/`skipTo` keep
working for free.

## Goals / Non-Goals

**Goals:**
- Add `setMeter`/`addMeter` actions and a `RestingState.meters` field
  supporting both a bar-style gauge and a plain running counter (the gold/
  cost use case), rendered via a new DOM overlay component.
- Add a `setLightRadius` action and a `RestingState.lightRadius` field,
  with real per-step radius motion over `overSeconds`, rendered as a
  tile-visibility fog effect in `TalkRpgScene`.
- Keep both fully reconstructable via `snapTo`/`back`/`skipTo` with no
  special-casing in `directorEngine.ts`.
- Add unit test coverage in `precompute.test.ts` for both systems (per the
  project's testing rule) and a Playwright verification pass, matching the
  precedent set by Phase 3/4.

**Non-Goals:**
- Deciding which of the two treatments (bar meter vs. light radius) the
  narrative actually uses for "capacity/context" — both are built; the
  choice is content, tracked in `idea-board.md`.
- Any live simulation — meter values and light radius only change on
  authored beats, never computed from gameplay.
- Party/stats model changes (Phase 6) or meta-shell content.
- A generic Phaser lighting/mask object with persistent internal state —
  see the Decisions below for why that's specifically avoided.

## Decisions

### Meters carry their own descriptor inline, like `startBattle`'s `CombatantHp`

`setMeter` takes the full display descriptor plus a value:
```ts
interface SetMeterAction {
  type: 'setMeter'
  meterId: string
  label: string
  style: 'bar' | 'counter'
  value: number
  max?: number        // required for style: 'bar', ignored for 'counter'
  anchorEntity?: string  // world-anchored (e.g. an ally's capacity bar) vs. fixed HUD position (e.g. gold)
}

interface AddMeterAction {
  type: 'addMeter'
  meterId: string
  delta: number
}
```
`applyAction` for `setMeter` always fully replaces the meter's entry in
`world.meters` (idempotent, same pattern as `showOverlay`). `addMeter` only
mutates `value` on an existing entry and is a no-op if the `meterId` hasn't
been `setMeter`'d yet — mirroring `battleAction`'s no-op-if-no-active-battle
behavior. This avoids inventing a separate "attach/define" action type or a
static registry (like `BATTLE_MAP`'s named slots): meters are authored
per-use directly in the script, the same way `startBattle` authors
`CombatantHp` inline instead of pulling from a combatant registry.

**Alternative considered:** a static `MeterDef` registry (à la `GameMap`'s
`namedLocations`) with `setMeter`/`addMeter` referencing only `meterId` +
value. Rejected — it adds a second source of truth for meter metadata for
no benefit, since (unlike map geometry) meter descriptors are cheap to
repeat inline and may reasonably change (e.g. relabeling) mid-script.

### The gold/cost counter is a `meterId`, not a separate action type

Per `requirements.md` §4F, "cost/currency counter" is "a specific instance
of a meter." It's authored as `{ type: 'addMeter', meterId: 'gold', delta: ... }`
against a meter first `setMeter`'d with `style: 'counter'`, `anchorEntity`
omitted (fixed HUD position). No `AddGoldAction` or similar is introduced.

### `RestingState.meters` is a plain record, cloned like every other field

```ts
export interface MeterState {
  label: string
  style: 'bar' | 'counter'
  value: number
  max?: number
  anchorEntity?: string
}
// World / RestingState both gain:
meters: Record<string, MeterState>
```
`cloneMeters` follows the exact shape of `cloneBattle`/`cloneUI` — a shallow
per-entry copy — and is called from `cloneWorld`, `restingStateToWorld`, and
`snapshotRestingState` alongside the existing fields. No changes to
`directorEngine.ts` are needed: `snapTo` already reconstructs the whole
`World` from a `RestingState` generically.

### `RestingState.lightRadius` is a nullable absolute value, like `camera`

```ts
export interface LightRadiusState {
  anchorEntity: string
  radius: number
}
// World / RestingState both gain:
lightRadius: LightRadiusState | null
```
`setLightRadius`'s `applyAction` handler sets this directly to the action's
final `{ anchorEntity, radius }` — exactly like `camera`'s "jump to the
computed final value" semantics, ignoring `overSeconds` (the precompute pass
is headless and doesn't do real-time animation; only the *live* executor
below animates through it). `null` means "full visibility, no fog" — the
default for every scene until the first `setLightRadius`.

### `setLightRadius` with `overSeconds` animates via discrete integer steps, not a Phaser tween

Mirrors the `walk`/`WalkExecutor` split exactly: `applyAction` computes the
final radius instantly (like `walk` sums its whole path instantly), while a
new `LightRadiusExecutor` — structurally identical to `StepWalkExecutor` —
steps the live radius by ±1 on a `setTimeout` cadence derived from
`overSeconds / |Δradius|`, calling `onWorldChange` after each step, until it
reaches the target. Omitting `overSeconds` uses the existing
`InstantExecutor` (one-shot `applyAction` + `onComplete()`), matching how
`enterScene` and dialogue actions complete instantly today.

**Why not a Phaser `tween`/`Light` object:** Phaser's tweening and Lights
Manager keep their own internal interpolation state outside the
`World`/`RestingState` model. That would make the *live, mid-animation*
radius diverge from anything `snapTo`/`back`/`skipTo` could reconstruct
(there is no "resting state" for a mid-tween value — `stop` is the only
checkpoint, same as walking). Using the same discrete-timer-step approach
`StepWalkExecutor` already established keeps light radius animation exactly
as reproducible as movement, for free, with no new category of
non-deterministic state.

### Fog is rendered as a per-tile/per-entity alpha pass recomputed every snapshot, not a persistent mask

`TalkRpgScene.applySnapshot` already fully recomputes `previousPositions`/
`previousBattleHp` and reapplies entity views from `resting` on every call
(`loadArea` even destroys and recreates every tile rectangle on a scene
switch). Fog follows the same "derive display state from `resting`, don't
mutate a persistent object" style: when `resting.lightRadius` is non-null,
`applySnapshot` computes each tile rectangle's and `EntityView`'s alpha as a
pure function of its grid distance (Chebyshev, matching the "3×3"/"7×7"
square-radius language in `idea-board.md`) from the anchor entity's current
position, clamped to `[0, 1]`; when `null`, alpha resets to `1` for
everything. No Phaser `Light`, `Mask`, or `RenderTexture` object is created
or retained across snapshots.

**Alternative considered:** a Phaser 2D `Light`/normal-map pipeline. Rejected
as disproportionate for a placeholder-rectangle rendering style (no
tileset/normal-maps exist yet) and, like the tween concern above, harder to
guarantee produces byte-identical results between live play and a `snapTo`
jump than a plain per-frame alpha computation already is.

## Risks / Trade-offs

- **[Risk]** Recomputing every tile's alpha on every snapshot could be slow
  on a larger map than the current small placeholder ones.
  → **Mitigation:** skip the pass entirely when `resting.lightRadius` is
  `null` (the common case outside cave scenes); defer any further
  optimization until Phase 8 swaps in real tilesets, per the
  placeholder-first principle.
- **[Risk]** A `setLightRadius`/`setMeter` referencing an `anchorEntity` that
  doesn't exist in the current scene (e.g. authoring error, or a scene
  switch that dropped the entity) would silently render nothing.
  → **Mitigation:** match the existing no-op convention (`walk` on a missing
  entity id is already a silent no-op in `applyAction`) rather than adding
  new validation machinery this phase doesn't otherwise have.
- **[Trade-off]** Building both the bar-style meter and the light-radius/fog
  system means part of this change's output may never ship if the narrative
  settles on only one treatment (`idea-board.md`'s capacity/context fork).
  Accepted per explicit direction: build both now per
  `phased-implementation.md`'s current Phase 5 scope; `idea-board.md`'s
  `[CUT]` note is content-level and doesn't block the framework capability.

## Open Questions

- None blocking. The bar-vs-light-radius narrative choice remains an
  explicit non-goal of this change and doesn't need resolving to implement
  either primitive.
