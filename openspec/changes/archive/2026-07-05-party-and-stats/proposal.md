## Why

Phase 4 (`scripted-battle`) proved the battle-sequencing engine end-to-end for
one complete scripted fight, but deliberately scoped to a single ally and
HP-only combatant records (`phased-implementation.md`'s explicit split of
`requirements.md` §8 group D+E). The visible "party grows and gets more
capable" arc — the second half of the talk's thesis
(`idea-board.md` §6's Stage 1 → Stage 2 → Stage 3 headcount growth, §4E) —
doesn't exist yet, and the status screen still shows hardcoded placeholder
text (`ui-overlay`'s "until Phase 6 supplies real content" constraint). Phase
6 is next in `phased-implementation.md`'s sequence: it depends only on Phase
4 (battle engine, now archived) and is explicitly documented as
parallelizable with Phase 5 (meters/light radius, in-flight but unrelated).

## What Changes

- Add a **real entity/stats model** (HP, level, role, and whatever else a
  status screen needs) for the protagonist, allied combatants, NPCs, and
  enemies — narrow and display-oriented (this framework never computes real
  combat outcomes), not a game engine's stats system.
- Add an inspectable status screen with real content: `MenuShell`'s
  `StatusScreen` (currently hardcoded `"HP: --"` placeholder text) renders a
  named entity's real stats instead.
- Widen `startBattle` from a single `ally: CombatantHp` to
  `allies: CombatantHp[]` (one to several), extending — not rewriting — the
  `battle` capability's existing reducer, executor, and rendering path
  (`BattleHud`, arena slots, per-slot facing).
- Add multi-combatant choreography: `partyJoin` (a new ally joins the party,
  with an optional join effect) and `tagCombatant`
  (`in` | `out` | `needs-attention`) so a script can sequence several allies
  acting, waiting, or tagging in/out in a controlled order — still fully
  authored, no real turn logic or AI.
- Add `levelUp`: a fanfare beat showing a stat/ability increase, authored
  like every other instant action.
- Promote `partyJoin`, `tagCombatant`, `showStatus`, `levelUp` from Proposed
  to Established in `action-vocabulary.md`.

Explicitly out of scope (per `phased-implementation.md` Phase 6 non-goals,
carried into this change unchanged):
- No rewrite of Phase 4's battle-sequencing engine beyond what's needed to
  support more than one combatant — additive only.
- No meta-shell content (title screen, save-file framing, achievement
  toasts) — Phase 7.
- No final art — placeholder rectangles/text throughout (Phase 8).
- No real combat AI or computed stats — every stat value and battle outcome
  remains authored data, exactly as Phase 4 established.

## Capabilities

### New Capabilities

- `entity-stats`: the display-oriented entity/stats model (HP, level, role,
  etc.), the inspectable status screen that renders a named entity's real
  stats in place of the Phase 3 placeholder text, and the `levelUp` fanfare
  beat.

### Modified Capabilities

- `battle`: `startBattle` widens from a single `ally: CombatantHp` to
  `allies: CombatantHp[]`; `RestingState.battle` widens correspondingly;
  adds `partyJoin`/`tagCombatant` for multi-combatant choreography
  (sequencing several allies acting, waiting, or tagging in/out in a
  controlled order). The single-combatant contract Phase 4 established
  (`battleAction`, `endBattle`, `defeatSequence`, the encounter transition,
  HP clamping/reconstruction under `snapTo`/`back`/`skipTo`) is preserved
  and extended, not replaced.
- `ui-overlay`: the "On-rails command/status menu shell" requirement's
  placeholder-stat constraint ("stat fields SHALL render as literal
  placeholder text... until Phase 6 supplies real content") is lifted — the
  status screen now sources real stat content from `entity-stats`, with no
  change to the screen's structure or component.

## Impact

- **Code**: `client-talks/src/talk-rpg/` — `script.ts`'s `Action` union
  (`partyJoin`, `tagCombatant`, `showStatus` or an extended `showMenu`,
  `levelUp`; a widened `StartBattleAction`), `precompute.ts` (an
  entity-stats model; `BattleState.ally` → `allies: CombatantHp[]`),
  `executors.ts` (new instant actions), `MenuShell.tsx`'s `StatusScreen`
  (real content instead of placeholder text), `BattleHud.tsx` (N ally HP
  labels instead of one), and the battle arena's named slots (room for
  several allies, not one fixed slot). `action-vocabulary.md` gets the four
  actions above moved to Established.
- **Depends on**: the `battle` capability (`scripted-battle`, archived) for
  the core sequencing engine this change extends, and the `ui-overlay`
  capability (`text-ui-overlay`, archived) for the menu shell whose status
  screen this change gives real content. Independent of the in-flight
  `meters-and-light-radius` change (Phase 5) — different resting-state
  fields, no interaction.
- **No API/DB impact**: entirely client-side presentation state for a
  single internal-use talk app; no backend routes, schema, or auth changes.
- **Dependents**: Phase 7 (meta-shell & flourishes) and Phase 8 (asset
  integration) consume this change's entity/party model as-is; neither is
  expected to modify it further.
