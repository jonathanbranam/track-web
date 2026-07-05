## Context

Phases 1–5 have landed in code (`archive/2026-07-04-director-precompute-pass`,
`archive/2026-07-04-world-rendering-integration`,
`archive/2026-07-04-text-ui-overlay`,
`archive/2026-07-04-scripted-battle`; `meters-and-light-radius` is
implemented but not yet archived). The concrete building blocks this change
has to build on, all in `client-talks/src/talk-rpg/`:

- **`precompute.ts`**: `World`/`RestingState` currently carry `battle:
  { ally: CombatantHp; enemies: CombatantHp[] } | null` (Phase 4, singular
  ally), `meters: Record<string, MeterState>`, and `lightRadius:
  LightRadiusState | null` (Phase 5) alongside `entities`/`ui`/`overlay`.
  `applyAction` is the single reducer every action goes through.
- **`script.ts`**: `CombatantHp { id; hp; maxHp }` is the authored HP shape
  `startBattle`/`battleAction` use. `BATTLE_MAP`'s `namedLocations` has one
  `allySlot` and `enemySlot0`/`1`/`2`.
- **`executors.ts`**: `InstantExecutor` (apply the reducer, complete
  synchronously) covers every action except `walk`/`walkTo` (stepwise
  motion) and `setLightRadius` (steps `radius` by ±1 on a timer when
  `overSeconds` is set). Every new action in this change is instant.
- **`TalkRpgScene.ts`**: reconciles `resting.entities` against
  `this.entityViews` by id every snapshot (create/update/destroy), plays the
  encounter flash by diffing `sceneId` across snapshots
  (`isPlaying && sceneId changed`), shows damage numbers by diffing
  `battle` HP across snapshots, and recomputes fog alpha declaratively from
  `resting.lightRadius` on every snapshot (Phase 5's "no persistent FX state
  retained across calls" pattern).
- **`MenuShell.tsx`**: `StatusScreen` still renders hardcoded `"HP: --"` /
  `"MP: --"` / `"Level: --"` placeholder text regardless of `ui.options`,
  per `ui-overlay`'s "until Phase 6 supplies real content" constraint.
- **`BattleHud.tsx`**: renders one `HpLabel` for `battle.ally` and one per
  `battle.enemies` entry, each world-anchored via `useWorldAnchor`.

This change widens the single-ally battle into a multi-ally party and gives
the status screen real content, without inventing a persistent "entity
stats database" the framework doesn't otherwise need.

## Goals / Non-Goals

**Goals:**
- Widen `startBattle`/`battle` from one ally to `allies: CombatantHp[]`
  (one to several), extending every existing battle call site
  (`BattleHud`, `TalkRpgScene`'s damage-number diff, `battleAction`'s target
  lookup) the same way they already handle `enemies`.
- Add `tagCombatant` so a script can mark an ally `'in'` / `'out'` /
  `'needs-attention'`, reconstructing correctly under `snapTo`/`back`/`skip`
  (idea-board §6's Stage-2 "relay" party — one fights at a time, tags out).
- Add `partyJoin` so a new ally can appear in a field scene and join the
  roster, with a one-shot join FX on live playback only.
- Add `showStatus` — a real, authored-stats status screen — replacing
  `showMenu`'s placeholder-only `'status'` variant.
- Add `levelUp` — a fanfare narration beat for a stat/ability increase.
- Extend the precompute/directorEngine test suites to cover N-ally battle
  reconstruction, `tagCombatant`, and the new instant actions, matching the
  existing coverage pattern for `battleAction`/`endBattle`.

**Non-Goals:**
- No rewrite of Phase 4's battle-sequencing engine (`battleAction`,
  `endBattle`, `defeatSequence`, the encounter transition, HP
  clamping/reconstruction) — every change here is additive widening.
- No persistent, cross-scene entity-stats database. Stats shown by
  `showStatus` are authored inline on the action, exactly like
  `battleAction`'s narration `text` — not derived from a hidden registry.
- No combat AI, no real turn-order computation — `tagCombatant` records an
  authored tag, it doesn't decide who acts next.
- No meta-shell content (Phase 7) or final art (Phase 8).
- No dedicated `levelUp` fanfare animation in this phase (see Decisions).

## Decisions

**No new persistent "entity stats" resting-state field — `showStatus` and
`levelUp` carry their stat content inline on the action, the same way
`battleAction` carries `damage`/`text`.** `battle.allies[]`'s HP is the one
piece of Phase 6 state that genuinely needs cross-checkpoint persistence,
because it changes turn-by-turn during a fight and must reconstruct
identically under `snapTo`/`skipTo` (exactly Phase 4's existing HP
contract, just pluralized). Level/role/status-screen content has no such
"changes turn-by-turn, must survive a skip" requirement — a script simply
authors whatever numbers a given `showStatus` beat should display, the same
way two different `say` beats carry different text without a hidden
"current dialogue" model beyond the `ui` slot itself.
```ts
export interface EntityStats {
  level: number
  role?: string
  hp: number
  maxHp: number
}

export interface ShowStatusAction {
  type: 'showStatus'
  entity: string
  stats: EntityStats
  options?: string[] // optional footer command list, e.g. ["Close"]
}

export interface LevelUpAction {
  type: 'levelUp'
  entity: string
  text: string // e.g. "PC learned Radiant!"
}
```
`applyAction`'s `showStatus` case sets `ui: { kind: 'menu'; menuKind:
'status'; entity; stats; options: options ?? []; selectedIndex: 0 }`;
`levelUp` sets `ui: { kind: 'dialogue'; text; variant: 'say' }` — the exact
same dialogue-slot reuse `battleAction` already established.
*Alternative considered:* a persistent `entityStats: Record<string,
EntityStats>` resting-state field, mutated by a `setEntityStats` action and
bumped by `levelUp`. Rejected — nothing in this phase's content needs a
stat value to survive between two `showStatus` calls; inventing the
record, its clone/dedup functions, and a mutation action now would be
premature generalization the framework doesn't have a use for yet (the
same reasoning Phase 4's design used to reject folding HP into
`EntityState`, applied in the other direction: don't invent a registry
just because a data model with that name exists in `requirements.md` §4E —
build the resting-state field only once content actually needs values to
persist).

**`showStatus` replaces `showMenu`'s `menuKind: 'status'` variant; `ShowMenuAction.menuKind` narrows to `'command'` only.** **BREAKING** (scoped, small blast radius): Phase 3's status-screen variant was always a placeholder-proving beat (`options: ['pc']` was never actually read for stat content). Retrofitting real stats onto the generic `showMenu` shape would mean two different action types both claiming to open the same UI slot for the same purpose; a single purpose-built `showStatus` action is simpler than teaching `showMenu` two incompatible payload shapes keyed off `menuKind`. `ActiveUI`'s `menu` variant becomes:
```ts
export type ActiveUI =
  | { kind: 'none' }
  | { kind: 'dialogue'; speaker?: string; text: string; variant: 'say' | 'thought' }
  | { kind: 'menu'; menuKind: 'command'; options: string[]; selectedIndex: number }
  | { kind: 'menu'; menuKind: 'status'; entity: string; stats: EntityStats; options: string[]; selectedIndex: number }
```
`selectMenuOption`/`hideMenu` need no changes — both variants share
`options`/`selectedIndex`, and both reducer cases already only check
`world.ui.kind === 'menu'`. `MenuShell.tsx`'s `StatusScreen` reads
`ui.entity`/`ui.stats` for real content instead of hardcoded placeholder
lines; `SCRIPT`'s one existing `showMenu({menuKind:'status', options:
['pc']})` proving beat is replaced with a `showStatus` beat carrying real
authored numbers.
*Alternative considered:* keep `showMenu({menuKind:'status'})` and add the
stats payload to it directly. Rejected per above — two action types for one
UI slot is more confusing than one, and nothing outside `SCRIPT`'s single
proving beat depends on the old shape.

**`battle.allies: PartyMemberState[]` replaces the singular `ally:
CombatantHp`; `PartyMemberState` adds a `tag` field allies carry but
enemies don't.**
```ts
export interface PartyMemberState extends CombatantHp {
  tag: 'in' | 'out' | 'needs-attention'
}

export interface BattleState {
  allies: PartyMemberState[]
  enemies: CombatantHp[]
}
```
`startBattle`'s authored `allies: CombatantHp[]` (no `tag` field — the
reducer defaults every placed ally to `tag: 'in'`, matching how
`EntityDef.facing` is optional on authored data but `EntityState.facing`
always has a value). `BATTLE_MAP`'s single `allySlot` named location
becomes `allySlot0`/`allySlot1`/... (mirroring `enemySlot0`/`1`/`2`
exactly), and `startBattle`'s placement loop treats allies and enemies
identically instead of specially handling the one ally. `enemies` gets no
`tag` — multi-enemy choreography isn't in scope; only ally tagging
(`requirements.md` §4D "multi-combatant choreography", idea-board §6's
Stage-2 relay party) is. `tagCombatant`'s reducer case finds the named
ally in `battle.allies` and replaces its `tag`; a no-op if not in battle or
the entity isn't an ally. `TalkRpgScene` renders `tag`-dependent visuals
(e.g. dimming a tagged-out ally) declaratively off the current snapshot's
`battle.allies`, the same "recompute fresh every snapshot, nothing
persisted in the scene object" pattern `applyFog` already established for
`lightRadius` — not a diff, not a retained Phaser state object.
*Alternative considered:* keep `ally`/`enemies` separate and add a second
`allies2`/`allies3`… field per extra party member. Rejected — obviously
doesn't scale and contradicts "one to several" from `requirements.md` §4E.

**`partyJoin` adds one entity to `world.entities` at a named location (or
next to `pc`); no new resting-state field.**
```ts
export interface PartyJoinAction {
  type: 'partyJoin'
  entity: string
  at?: string // named location; defaults to pc's current position
  fx?: string
}
```
`applyAction`'s case resolves `at` against the current scene's
`namedLocations` (falling back to `pc`'s position, mirroring
`enterScene`'s `at`-or-fallback pattern) and adds one entry to `entities` —
`entities` is already a resting-state field, so no new one is needed. The
one-shot join FX plays on live playback only, detected in `TalkRpgScene`
the same way the encounter flash is: comparing the current snapshot's
entity ids against the previous snapshot's (an id present now that wasn't
present before, while `isPlaying`) — no raw-action-stream hook needed,
consistent with every other FX in this framework being resting-state-diff
driven, not action-driven.
*Alternative considered:* have `partyJoin` also maintain a `party: string[]`
roster field so a later `startBattle` or `showStatus` could look up "who's
recruited so far" automatically. Rejected — every existing scene-to-scene
or battle-to-field transition in this framework is fully explicit
(`endBattle` doesn't auto-restore the prior scene either); the author
already knows the roster and can list it explicitly wherever it's needed,
same reasoning Phase 4 used for not auto-restoring post-battle scene.

**`levelUp` reuses the dialogue `ui` slot for its narration, with no
dedicated fanfare animation in this phase.** Its `applyAction` case is
identical in shape to `battleAction`'s narration-only branch: `{ ...world,
ui: { kind: 'dialogue', text: action.text, variant: 'say' } }`. Pacing is
authored via explicit `pause` actions exactly as `battleAction` already
requires — no new built-in timing.
*Alternative considered:* a `LevelUpExecutor` with a fixed-duration
sparkle/flash tween, plus a resting-state flag so `TalkRpgScene` can detect
it fired even under `snapTo`. Rejected for this phase — nothing currently
in scope needs the fanfare to be more than narration text, and adding
detection machinery for a visual effect content hasn't asked for yet would
be speculative. If rehearsal shows a bare narration line reads as
anticlimactic, this is the one place to revisit, using the same
resting-state-diff technique `partyJoin`'s FX already establishes.

## Risks / Trade-offs

- **[Risk]** Removing `showMenu`'s `'status'` `menuKind` is a breaking
  change to an already-Established action → **Mitigation:** blast radius is
  exactly one line in `SCRIPT` (Phase 3's proving beat), trivially migrated
  to `showStatus`; `hideMenu`/`selectMenuOption` are unaffected since both
  menu variants share `options`/`selectedIndex`.
- **[Risk]** `showStatus`'s fully-authored stats payload means an author
  must manually keep numbers consistent across multiple `showStatus` calls
  for the same entity (e.g. after a `levelUp`) — nothing enforces it →
  **Mitigation:** accepted trade-off, identical in kind to narration text
  already carrying no engine-enforced consistency; revisit only if
  authoring proves error-prone in practice.
- **[Risk]** `battle.allies`/`enemies` widening touches every existing
  call site that assumed a single `ally` (`BattleHud`, `TalkRpgScene`'s
  damage-number diff loop, `battleAction`'s target lookup, existing tests)
  → **Mitigation:** each site already treats `enemies` as an array; the fix
  is mechanically making `allies` symmetric with `enemies`, not a redesign.
- **[Risk]** `partyJoin`'s live-only join FX, detected by diffing entity ids
  across snapshots, would silently not replay if a script re-adds an entity
  id that was never actually removed from `entities` (e.g. after
  `tagCombatant('out')`, which only changes `tag`, not `entities`
  membership) → **Mitigation:** `partyJoin` is an authoring convention for
  genuinely new recruits only (idea-board's stage transitions each
  introduce a brand-new familiar, never a returning one); document this in
  `action-vocabulary.md`'s finalized entry rather than adding an engine
  guarantee for a case content doesn't need.
- **[Risk]** No dedicated `levelUp` fanfare risks the beat reading flat next
  to the encounter flash / damage numbers Phase 4 already shipped →
  **Mitigation:** accepted for this phase per the Decision above; the
  resting-state-diff technique needed to add one later already exists in
  this codebase (`partyJoin`'s join-FX detection, the encounter flash).

## Migration Plan

Client-side-only framework change to an internal-use talk app; no database,
API, or deployment migration. The only "migration" is within `script.ts`'s
`SCRIPT`:
- Replace the Phase 4 battle beat's `{ type: 'startBattle', ally: {...},
  enemies: [...] }` with `allies: [{...}]`.
- Replace the Phase 3 proving beat's `{ type: 'showMenu', menuKind:
  'status', options: ['pc'] }` with a `showStatus` beat carrying real
  authored stats.
- Extend `SCRIPT` with one proving beat each for `partyJoin`, `tagCombatant`,
  and `levelUp`, per this change's tasks.

## Open Questions

- **Exact `BATTLE_MAP` slot count per side** is a content-tunable constant,
  not an architectural decision — idea-board §6's Stage 3 (four familiars)
  suggests four ally slots are enough for this arc, but adding a fifth is a
  one-line `namedLocations` addition, not a reducer change.
- **Whether `tagCombatant`'s `'needs-attention'` tag needs an on-screen
  indicator beyond a subtle visual difference** (vs. leaning on Phase 7's
  achievement-toast machinery for anything louder) is left to
  implementation/rehearsal, not this design.
- **Whether `levelUp` needs a dedicated fanfare animation** is deferred per
  the Decision above; revisit if a bare narration line reads as
  anticlimactic once authored content exists to judge it against.
