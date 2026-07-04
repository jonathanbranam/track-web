## Why

Phase 4 (`phased-implementation.md`) is the first full vertical slice of the
talk's central "give orders to your ally" motif (`requirements.md` §2's
battle layer, §4D/§4E, §8 grouping 4 "Scripted battle"). Phases 1–3
(Director precompute pass, world rendering, DOM/menu overlay) establish the
playback engine, a real scene to stand in, and a command-menu shell to issue
orders from, but none of them can demonstrate a fight — the thing the talk's
thesis actually rests on. This change adds that slice, scoped to a single
allied combatant (per `phased-implementation.md`'s explicit split of
`requirements.md` §8 group D+E: multi-combatant party choreography is
deferred to Phase 6 so this stays a small–medium change).

Per explicit user direction (2026-07-04), Phases 1–3 are not yet archived —
this proposal is written ahead of that, consistent with `requirements.md`
§7's note that phases can overlap in practice.

## What Changes

- Add a **battle scene layout**: enemy on the left, party framing on the
  right, command window below — the FF-style side-view arrangement locked in
  `idea-board.md` §1/§9 (replacing DW's original front-view battle screen).
  Reuses the Phase 3 command/status menu shell (`ui-overlay`'s `showMenu`/
  `selectMenuOption`) for the command window rather than building a new one.
- Add `startBattle`/`endBattle` actions: entry into a battle from the world
  scene (encounter transition flash/wipe — FF-style, per `idea-board.md` §9's
  resolved fork) and exit via a scripted outcome (`victory` | `defeat` |
  `flee` | `stalemate`).
- Add `battleAction`: the scripted combat sequence — a combatant acts, an
  enemy retaliates, damage numbers appear, HP changes — with **no combat AI
  and no real mechanics**, every outcome authored. Includes a `wrong-action`
  kind so a scripted mistake (e.g. the fire-heals-the-enemy beat in
  `idea-board.md` §7) can be depicted, not just correct plays.
- Add `defeatSequence`: a defeat/"death" outcome sequence (e.g. "Thou art
  dead"-style text), distinct from `endBattle`'s outcome tagging.
- Track minimal entity HP state (current/max) sufficient to drive damage
  numbers and the HP bar during a fight — not the full entity/stats model
  (level, role, etc.), which is Phase 6.
- Promote `startBattle`, `endBattle`, `battleAction`, and `defeatSequence`
  from Proposed to Established in `action-vocabulary.md`, with shapes
  finalized in this change's design (`partyJoin`, `tagCombatant`,
  `showStatus`, and `levelUp` stay Proposed — they're Phase 6 concerns).

Explicitly out of scope (per `phased-implementation.md` Phase 4 non-goals,
carried into this change unchanged):
- No multi-combatant choreography, tagging in/out, or party scaling beyond
  one ally (Phase 6).
- No inspectable status/stats screens with real content (Phase 6).
- No meters (gold) or light radius (Phase 5) — a defeat sequence's "half
  gold" revive tax (`idea-board.md` §4/§9) is a Phase 5+ content concern once
  the gold meter exists, not this change's.
- No final art — placeholder battle scene visuals only.

## Capabilities

### New Capabilities

- `battle`: The battle scene layout, encounter transition, scripted combat
  sequencing (`battleAction`, including `wrong-action`), command-issuance
  depiction via the reused menu shell, defeat/outcome sequences
  (`endBattle`/`defeatSequence`), and minimal per-combatant HP tracking
  needed to drive the damage/outcome display.

### Modified Capabilities

None. `world-rendering`'s existing "Scene and area management" requirement
already permits battle areas to remain unimplemented in that phase
(`world-rendering-integration`'s delta: "Battle and meta-screen areas MAY
remain unimplemented in this phase") — this change fulfills that allowance
without changing the requirement's text. `talk-director`'s resting-state
contract and action-vocabulary scoping are similarly unchanged: battle
actions are new vocabulary added under the `battle` capability, following
the same pattern `world-rendering-integration` set for `walkTo`/`enterScene`
(new action types don't require editing `talk-director`'s Phase-1-scoped
vocabulary requirement).

## Impact

- **Code**: `client-talks/src/talk-rpg/` — a new battle scene (or an
  in-place mode of `TalkRpgScene.ts`, to be settled in design.md), new action
  executors for `startBattle`/`battleAction`/`endBattle`/`defeatSequence`,
  and a `RestingState` schema addition for battle state (per-combatant HP,
  active battle flag) per `requirements.md` §5's "Battle state" resting-state
  field. `script.ts`'s `Action` union grows accordingly.
  `action-vocabulary.md` gets the four actions above moved to Established.
- **Depends on**: the `world-rendering` capability (`world-rendering-integration`,
  not yet archived) for scene switching into/out of the battle area, and the
  `ui-overlay` capability's command/status menu shell (`text-ui-overlay`,
  still in design/not yet spec'd) for the command window and HP display.
  Both dependencies are still in progress; this change was scoped ahead of
  their completion per explicit user direction, so integration points may
  need reconciling once those phases are implemented and archived.
- **No API/DB impact**: entirely client-side presentation state for a
  single internal-use talk app; no backend routes, schema, or auth changes.
- **Dependents**: Phase 6 (`party-and-stats`) extends this change's
  single-combatant battle engine into multi-ally party choreography and
  swaps in the full entity/stats model, without rewriting the core battle-
  sequencing engine this change establishes.
