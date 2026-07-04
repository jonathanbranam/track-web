## Context

Phases 1–3 have landed in code and are archived
(`archive/2026-07-04-director-precompute-pass`,
`archive/2026-07-04-world-rendering-integration`,
`archive/2026-07-04-text-ui-overlay`). The concrete building blocks this
change has to build on:

- **`script.ts`**: `GameMap` (`sceneId`, `width`/`height`, `tiles`,
  `walkableGrid`, `namedLocations`, `entities`), loaded either from a Tiled
  JSON fixture (`TOWN_MAP`/`OVERWORLD_MAP`) or, as this change introduces,
  hand-constructed in TS. `MAPS: Record<string, GameMap>` is the registry
  `enterScene`/`walkTo` resolve scene IDs against.
- **`precompute.ts`**: `World`/`RestingState` carry `sceneId`, `entities`
  (`Record<string, EntityState>`), `ui: ActiveUI`, `overlay: OverlayCard |
  null`, `camera`. `applyAction` is the single reducer both the headless
  precompute pass and live playback call into. `enterScene`'s case swaps
  `sceneId` + rebuilds `entities` from the target map, entirely in place — no
  Phaser scene-manager transition.
- **`executors.ts`**: two proven patterns — `InstantExecutor` (dialogue/menu/
  overlay/`enterScene`: apply the reducer, fire `onComplete` synchronously)
  and `StepWalkExecutor` (timer-driven, for real stepwise motion). Every
  action is one or the other; there is no third "durationed, non-walk"
  executor class today.
- **`TalkRpgScene.ts`**: `applySnapshot` detects `resting.sceneId !==
  activeSceneId` and calls `loadArea` (destroys/rebuilds tile rects +
  `EntityView`s, resets camera bounds), then reconciles `resting.entities`
  against `this.entityViews` (create/update/destroy by id), follows the
  camera on a live-playback move or snaps it otherwise. `getScreenPosition
  (entityId)` reads straight from `this.entityViews[id]` — anything that
  becomes an `EntityView` automatically gets world-anchoring for free.
- **`MenuShell.tsx`/`DialogueBox.tsx`/`TextCard.tsx`/`useWorldAnchor.ts`**:
  read `resting.ui`/`resting.overlay` directly via `useDirector()`.
  `MenuShell`'s `CommandWindow` already renders exactly the
  `{ menuKind: 'command', options: string[], selectedIndex }` shape a battle
  command window needs (`SCRIPT` in `script.ts` already exercises it with
  `['Fight', 'Spell', 'Item', 'Run']`). Its `StatusScreen` is placeholder-only
  by design (`"HP: --"`) and is **not** reusable for a live battle HP display.

This change is scoped to a single allied combatant against one or more fixed
enemies (`phased-implementation.md` Phase 4; multi-ally choreography is
Phase 6). No entity/stats model exists yet — HP is the only piece of combat
state this phase needs, so it's carried as its own small resting-state
field rather than waiting on Phase 6's entity model.

## Goals / Non-Goals

**Goals:**
- A reusable battle arrangement (enemy slot(s) left, ally slot right,
  command window) that any authored fight can enter via `startBattle` and
  leave via `endBattle`.
- `startBattle`/`endBattle`/`battleAction`/`defeatSequence` promoted to
  Established in `action-vocabulary.md` with concrete, final shapes (see
  Decisions).
- Scripted combat sequencing: `battleAction` mutates combatant HP and shows
  a narration line, including a `wrong-action` kind (e.g. the fire-heals-
  the-enemy beat).
- A minimal `RestingState.battle` field (HP only) that reconstructs
  correctly under `snapTo`/`back`/`skip`, per `requirements.md` §5.
- Command-window reuse: the battle command menu is `MenuShell`'s existing
  `CommandWindow`, driven by `showMenu`/`selectMenuOption`/`hideMenu` exactly
  as Phase 3 already established — no new menu component.

**Non-Goals:**
- No multi-combatant party, tagging in/out, or role/stat model (Phase 6).
- No real HP/level/role entity model — `battle`'s combatant records are a
  narrow HP-only shape, not a generalized entity schema.
- No meters (gold/MP), light radius, or their interaction with battle
  (Phase 5); `battleAction`'s `wrong-action` kind depicts a scripted mistake
  narratively (on-screen text), not via an MP/context meter, which doesn't
  exist until Phase 5.
- No combat AI, no real targeting/selection input — `battleAction` is fully
  authored, `selectMenuOption` remains on-rails.
- No final art — placeholder rectangles (`EntityView`) for combatants, a
  solid-color backdrop for the arena.

## Decisions

**Battle is a `sceneId` switch to one well-known, reusable, code-authored
`GameMap` — not a new `GameMap.kind` flag, not a separate rendering
pathway disconnected from `entities`.** A single `BATTLE_SCENE_ID = 'battle'`
map is added to `MAPS` alongside `TOWN_MAP`/`OVERWORLD_MAP`. It has fixed
slot coordinates for the ally and up to a few enemies, but — unlike the
field maps — `entities: []` in its static definition; `startBattle`
populates `world.entities` at those fixed slots at runtime for whichever
combatant ids the action names. This means `TalkRpgScene`'s existing
`applySnapshot`/`loadArea` scene-switch detection, `EntityView`
create/update/destroy reconciliation, and `getScreenPosition` all apply to
battle combatants **for free** — no parallel rendering path, no new
world-anchoring plumbing. `TalkRpgScene` special-cases `sceneId ===
BATTLE_SCENE_ID` in exactly one place: skip the tile-rect grid draw (render
one full-arena backdrop rectangle instead) and don't `startFollow` the
camera (`snapCamera` to a fixed wide framing baked onto the battle map,
reusing the same `cameras.main.setZoom`/`centerOn` calls `snapCamera`
already makes — just with different constants).
*Alternative considered:* add a generic `GameMap.kind: 'field' | 'battle'`
discriminant. Rejected as premature generalization — this phase has exactly
one battle arrangement; a single named scene id is simpler and the `kind`
generalization can be added later if a second, differently-shaped battle
arena is ever needed.
*Alternative considered:* an independent `world.battle`-only rendering path
that never touches `world.entities`/`EntityView`. Rejected — it would
duplicate `TalkRpgScene`'s entity lifecycle and `useWorldAnchor` support
instead of reusing it, for no benefit.

**The battle map is a hand-authored TS constant, not a Tiled JSON asset.**
`TOWN_MAP`/`OVERWORLD_MAP` go through `loadMap()` because they're real,
edited tile layouts with baked NPCs. The battle arena is a fixed backdrop
color plus two named coordinate slots (`allySlot`, `enemySlots: Point[]`)
with no tile art and no baked entities to author — round-tripping that
through the Tiled JSON pipeline buys nothing. `BATTLE_MAP: GameMap` is
defined directly in `script.ts` next to `TOWN_MAP`, with `tiles`/
`walkableGrid` sized just large enough to give `TalkRpgScene` bounds to set
camera limits against.

**`RestingState.battle: BattleState | null` carries only combatant HP,
keyed by the same entity ids already in `world.entities`.** Position/
facing/animation for battle combatants continue to live in `entities` (via
the scene-switch above); `battle` adds exactly the piece nothing else
tracks:
```ts
interface CombatantHp { id: string; hp: number; maxHp: number }
interface BattleState { enemies: CombatantHp[]; ally: CombatantHp }
```
`null` means "not in battle" — no separate `active` boolean, since the
optionality already carries that. Singular `ally` (not `allies: […]`) matches
this phase's single-combatant scope; Phase 6 widens it without reshaping
`enemies`.
*Alternative considered:* fold HP into `EntityState` itself (add optional
`hp?/maxHp?` there). Rejected — `EntityState` is a field-rendering concept
(position/facing/animation) shared by every scene; smuggling combat-only
data into it would leak Phase 4 concerns into Phase 2's contract for every
entity, including ones that are never in a fight.

**`startBattle` and `endBattle` carry explicit combatant HP and ids —
extending, not just promoting, `action-vocabulary.md`'s sketch — because no
entity/stats model exists yet to source that data from.**
```ts
interface StartBattleAction {
  type: 'startBattle'
  ally: CombatantHp
  enemies: CombatantHp[]
  surprised?: 'party' | 'enemy'
}
interface EndBattleAction {
  type: 'endBattle'
  outcome: 'victory' | 'defeat' | 'flee' | 'stalemate'
}
```
`applyAction`'s `startBattle` case: switches `sceneId` to `BATTLE_SCENE_ID`,
places `ally`/`enemies` into `entities` at the map's fixed slots, sets
`battle: { ally, enemies }`, and sets camera to the battle framing — all in
one instant reducer step, matching `enterScene`'s existing shape.
`endBattle` clears `battle` to `null` but **does not** restore the prior
field scene/position — see the next decision.
*Alternative considered:* keep `enemies`/`ally` as bare `string[]`/`string`
per the original sketch, sourcing HP from some registry. Rejected — no such
registry exists before Phase 6; inventing one now to avoid putting HP on the
action would be a hand-authored-resting-state workaround in disguise (the
data still has to come from *somewhere* the author writes, so the action is
the right place per §5).

**`endBattle` doesn't auto-restore the previous scene; the script
explicitly re-issues `enterScene` afterward, exactly like any other
scene-to-scene transition.** Every existing scene change in `SCRIPT`
(`script.ts`) is an explicit authored `enterScene`, never implicit
state-stashing. Making battle exit implicitly "pop back" to wherever the
party was would be the one hidden-state exception in an otherwise fully
explicit action list, and it's unnecessary: the author already knows where
the story returns to and can say so with one more action.
*Alternative considered:* have `startBattle` snapshot the pre-battle
`sceneId`/position into `battle` so `endBattle` can restore it
automatically. Rejected — adds a hidden field purely to save one authored
`enterScene` call, at the cost of a resting-state shape most other actions
don't need to reason about.

**`battleAction` executes instantly, like every other non-motion action;
all pacing is authored via explicit `pause` actions, not baked into the
action.** Shape:
```ts
interface BattleActionAction {
  type: 'battleAction'
  actor: string
  target: string
  kind: 'attack' | 'spell' | 'item' | 'wrong-action'
  damage: number // signed HP delta subtracted from target's hp; negative = heal
}
```
`applyAction` finds `target` in `battle.enemies`/`battle.ally`, sets `hp =
clamp(hp - damage, 0, maxHp)`, and sets `ui: { kind: 'dialogue', text:
<narration>, variant: 'say' }` — reusing the exact dialogue-box rendering
Phase 3 already built, satisfying `idea-board.md` §7's requirement that the
fire-heal mistake shows real on-screen text, not just a number. The
narration string itself is content the executor/reducer doesn't compose —
it comes from the action (a `text` field, see Open Questions) so the
engine stays narrative-agnostic. This matches `InstantExecutor`'s existing
pattern exactly; `WALK_STEP_DURATION_MS`-style built-in timing is
deliberately not added, since every other instant action (`say`, `showMenu`)
already relies on the author inserting `pause` for readability, and battle
shouldn't need a different convention.
*Alternative considered:* a `BattleActionExecutor` with its own fixed
duration (mirroring `PauseExecutor`). Rejected — introduces a second way to
control pacing (baked-in duration vs. authored `pause`) for no reason; one
convention is simpler to author against.

**Damage-number popups and the encounter flash/wipe are fire-and-forget
Phaser FX with no resting-state footprint — the same category as
`EntityView`'s walk-step bob tween.** They play once, live, off the instant
world mutation (`startBattle`'s scene switch; `battleAction`'s HP change)
and are always finished well before the next `stop`. `snapTo`/`back`/`skip`
never need to reconstruct "a number mid-flight," exactly as they never
reconstruct "a character mid-step" today — only the settled HP value (in
`battle`) and settled position (in `entities`) are ever checkpointed.
*Alternative considered:* track an ephemeral `lastAction` in `RestingState`
so a skip could show "what just happened." Rejected — nothing in the
framework does this for movement or dialogue reveal either; it would be a
new category of transient state the precompute model doesn't need.

**`defeatSequence` reuses the existing `overlay` slot with a new `kind:
'defeat'`, not a new resting-state field or component.**
`OverlayCard['kind']` grows from `'act-card' | 'headline' | 'title'` to
include `'defeat'`; `defeatSequence(text)`'s `applyAction` case is
`{ ...world, overlay: { kind: 'defeat', text } }` — identical mechanism to
`showOverlay`, paired with the same `hideOverlay` to clear it.
`TextCard.tsx` grows one more branch for `'defeat'`'s distinct "Thou art
dead"-style full-screen styling. This satisfies "distinct from `endBattle`'s
outcome tagging" (proposal.md) as a distinct *action* and *visual
treatment*, while reusing 100% of the existing full-screen-card plumbing.
*Alternative considered:* a dedicated `DefeatScreen.tsx` reading a new
`resting.defeat` field. Rejected — `overlay` already exists for exactly
"a full-screen card is showing, here's its text"; a defeat screen is that,
stylistically distinct but not structurally different.

**The battle command window is `MenuShell`'s existing `CommandWindow`,
completely unchanged.** `showMenu({ menuKind: 'command', options: [...] })`
/`selectMenuOption`/`hideMenu` drive it exactly as `SCRIPT`'s Phase 3 proving
beat already does. No battle-specific menu variant is added; "Fight/Spell/
Item/Run"-style options are just content passed to the same action.

**A new `BattleHud.tsx` renders world-anchored HP labels over battle
combatants, reading `resting.battle` and using the existing
`useWorldAnchor(entityId)` hook — one per combatant id in `battle.enemies`/
`battle.ally`.** Since battle combatants are regular `entities` (per the
first decision), `useWorldAnchor` already works for them with zero changes.
`BattleHud` is mounted as one more sibling in `RpgExperience.tsx`'s
`Experience`, alongside `DialogueBox`/`MenuShell`/`TextCard`, and renders
nothing when `resting.battle` is `null`.

## Risks / Trade-offs

- **[Risk]** Reusing `entities`/`EntityView` for battle combatants means a
  combatant needs a `Direction` facing even though "facing" isn't a
  meaningful battle concept → **Mitigation:** bake a fixed facing per slot
  (`ally` faces `left` toward the enemy side, `enemies` face `right`) at
  scene-entry time; `EntityView`'s notch is a minor placeholder detail
  anyway and Phase 8 replaces it with real directional battle sprites/poses.
- **[Risk]** No Phaser `pointer`/touch input is added by this change —
  `selectMenuOption`/`battleAction` are all script-driven, not real
  input — so the `kb/phaser-mobile-input.md` patterns don't come into play
  here → **Mitigation:** none needed; noted so a future reviewer doesn't
  wonder why battle has no tap-to-select handling. If Phase 6+ ever adds
  real input, that's the point to revisit the doc.
- **[Risk]** A single shared `BATTLE_SCENE_ID` map means two different
  fights both "enter the same scene" back-to-back — if `back()`/`skipTo()`
  is used to jump between two different battles' checkpoints, the only
  thing that changes is `entities`/`battle`'s content, not the scene itself,
  so `TalkRpgScene`'s `resting.sceneId !== activeSceneId` guard won't
  re-trigger `loadArea` between them → **Mitigation:** this is actually
  correct/desirable (the arena backdrop doesn't need rebuilding between two
  fights in the same arena), but combatant `EntityView`s must be fully
  reconciled from `entities` on every snapshot regardless of scene change,
  which `applySnapshot`'s existing create/update/destroy-by-id loop already
  does unconditionally — verify this explicitly in testing rather than
  assuming it.
- **[Risk]** `damage` as a signed delta (negative = heal) is a slightly
  unusual convention to author against → **Mitigation:** accepted trade-off
  to keep the wire shape a single number rather than a `damage`/`heal`
  discriminated pair; document the sign convention prominently in
  `action-vocabulary.md`'s finalized entry.

## Testing

- Unit tests for `RestingState.battle` reducer transitions: `startBattle`
  sets `sceneId`/`entities`/`battle` together; `battleAction` clamps HP into
  `[0, maxHp]` for both damage and heal (`wrong-action`) directions and sets
  the narration `ui` slot; `endBattle` clears `battle` to `null` without
  touching `sceneId`/`entities`; `defeatSequence`/`hideOverlay` round-trip
  through the `overlay` slot's new `'defeat'` kind.
- Headless precompute tests: a script `startBattle` → `battleAction`
  (normal) → `battleAction` (`wrong-action`) → `endBattle('victory')` →
  `enterScene` (back to town) asserts the cached resting state at each
  `stop` has the expected `battle`/`entities`/`sceneId` shape, and that the
  post-`endBattle`-and-`enterScene` checkpoint matches what a same-town
  `enterScene` would produce outside of battle (no leftover battle-only
  state).
- Manual verification in-browser (Playwright, saved to `/tmp/track-verify/`):
  the encounter flash plays on `startBattle`, the command window opens via
  the reused `MenuShell`, a `battleAction` updates an HP label and shows
  narration text, `defeatSequence` shows a distinct full-screen defeat card,
  and `back()`/`skipTo()` across a battle checkpoint land combatant
  positions/HP/`ui` correctly with no stale state from the field scene or a
  prior fight.

## Open Questions

- **Where does `battleAction`'s narration string come from?** Leaning
  toward an explicit `text` field on the action itself (fully authored,
  narrative-agnostic engine, consistent with `say`) rather than the engine
  templating "X attacks Y for Z damage" from `actor`/`target`/`kind`/
  `damage` — the latter would bake presentation strings into the framework,
  which cuts against framework/content separation. Revisit if authoring
  every narration line by hand proves tedious enough to want a default
  template with per-beat override.
- **Exact arena pixel layout** (backdrop color, ally/enemy slot coordinates,
  command window position relative to the battle backdrop) is left to
  implementation — these are content/styling choices with no architectural
  weight, unlike the decisions above.
