# Scene H — Climax: the Dragonlord (Beats 21–22)

Source: `../adm-talk-story-board-01.md`, Scene H, Beats 21–22.
Script: `client-talks/src/talk-rpg/scripts/scene-h.json` (plain `Action[]`) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

## Currently working

Both beats are fully expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine:

| Beat | Actions used |
|---|---|
| 21 — The prophecy's monster | `partyJoin` ×4 (roster re-introduction), `showOverlay(kind:'act-card')`/`hideOverlay` (encounter announcement), `startBattle` |
| 22 — Won by command | `showMenu`/`selectMenuOption`/`hideMenu` (the single command), `battleAction` ×4 (the coordinated finish), `endDialogue`, `endBattle(outcome:'victory')`, `showOverlay(kind:'act-card')`, `showAchievement` |

**Pacing pass (this is the talk's climax — highest checkpoint density of any
scene): the script now carries 9 `stop`s**, up from 1 in the original draft.
Every fixed-duration reading/narration `pause(seconds)` that stood in for
presenter narration time has been replaced with a `stop` immediately after
the content lands, per the presenter's "many more pauses, unique/important
beats must pause" feedback. Checkpoints now sit after: the encounter
act-card ("The Dragonlord and his minions appear!"), `startBattle` (the
arena reveal — Dragonlord + Hellspawn + minion all take the field), each of
the four `battleAction`s (mage's bolt, scout's strike, healer's
weakness-reveal, fighter's killing blow), `endBattle`, the "Victory!"
act-card, and the closing `showAchievement` toast. Only the pre-fight
`partyJoin` ×4 staging and the `showMenu`/`selectMenuOption`/`hideMenu`
command choreography remain auto-chained (no readable content of their own —
staging/menu theater before the payoff action), matching the "cosmetic
choreography can stay auto-chained" guidance. Verified via a throwaway
`runPrecompute` script: precomputes cleanly with 9 resting states, one per
`stop`.

- **Standalone roster re-introduction.** This script cannot assume Scene G's
  (Beats 17–20) party state — per this folder's `CLAUDE.md` and the
  precompute model, every script is independently `runPrecompute`'d. The
  script opens with four `partyJoin` calls (`fx: 'sparkle'`, matching the
  precedent in `client-talks/src/talk-rpg/scripts/test-script.ts`) before any
  storyboard-visible content, purely so `startBattle`'s `allies` list has
  real entities to reference. This is scaffolding for standalone playback,
  not itself a storyboard beat.
- **Beat 21's quoted announcement** ("The Dragonlord and his minions
  appear!") is realized as `showOverlay(kind: 'act-card')`, then
  `hideOverlay`, then `startBattle` — the same "quoted act-card, then the
  mechanical transition" pattern `scene-c.json` used for the prophecy-scroll
  beat. `startBattle` itself plays an encounter flash on live entry per
  `action-vocabulary.md`, so no separate transition action is needed for
  "the floor darkens; the Dragonlord descends."
- **Four allies exactly fill the four ally slots.** `startBattle`'s
  `allies`/`enemies` arrays place combatants at `allySlot0..3`/
  `enemySlot0..2` (`BATTLE_MAP.namedLocations` in `script.ts`) — four
  familiars is the maximum the engine supports, matching the storyboard's
  "your four familiars (right) vs. the Dragonlord + AI minions (left)"
  exactly. `hellspawn` (the same id as Scenes F/G's recurring enemy) and one
  extra minion (`minion`) join `dragonlord` to fill all three enemy slots.
- **Beat 22's "won by a single command" finish** is depicted as: one
  `showMenu`/`selectMenuOption`/`hideMenu` sequence (the single order given),
  followed by four `battleAction` calls with **no intervening menu** — the
  party acts as one coordinated flurry off that one command, not four
  separate orders. Total damage (20 + 15 + 0 + 25 = 60) exactly zeroes
  `dragonlord`'s 60 HP on the last hit, timed so the finishing blow's text
  ("At your command, the fighter drives the final blow home — the Dragonlord
  falls!") lands as the kill.
- `endDialogue` before `endBattle` mirrors `test-script.ts`'s established
  precedent (clearing the last narration bubble before the battle-outcome
  transition).
- The final `stop` leaves `overlay` (`'Victory!'`) and `achievement` (the
  verbatim Ach line) both visible together, unhidden — matching `scene-b.md`'s
  precedent that a `pause: yes` beat's Rest state is the *composed* screen
  (overlay + toast stacked), not a cleared one. The `battle` field is cleared
  by `endBattle`, but `sceneId`/`entities` stay on the arena (per
  `precompute.ts`'s `endBattle` case, which only nulls `battle`), so the
  defeated-Dragonlord tableau stays on screen under the Victory card.
- `initialSceneId` is `'world-town'` (`MAP.sceneId`), matching Scene A/B's
  precedent — cosmetically irrelevant since the opening `partyJoin`s default
  to the baked `pc` entity's position and the scene immediately moves to the
  `'battle'` arena via `startBattle`.

## Reconciled with Scenes F/G (update — no longer a blind guess)

The task originally briefed this scene as unable to see Scenes F/G (Beats
13–20, authored by parallel siblings), so the familiar-id convention and
Hellspawn HP were meant to be tentative placeholders. Partway through, both
`client-talks/src/talk-rpg/scripts/scene-f.json` and `scene-g.json` landed in
the working tree, so this scene was **updated to match the real established
convention** rather than ship a known-divergent guess:

- **Familiar ids/roles — now matched to Scene G exactly.** Scene G's Beat 17
  ("four role familiars," Stage 3's harness) uses ids `fighter`, `mage`,
  `scout`, `healer` with `showStatus` stats `{level:4}` and HP `18/18`,
  `14/14`, `15/15`, `16/16` respectively. This scene originally invented
  `familiar-warrior`/`familiar-mage`/`familiar-scout`/`familiar-cleric` with
  different HP — both have been renamed/re-valued to Scene G's real ids and
  HP so the "same roster" continuity is accurate, not just plausible. (Scene
  F's Beats 13–16 roster — `familiar`/`familiar-2`/`familiar-3` alongside
  `pc` — is a different, *earlier*-stage roster and was correctly not used
  here; Beat 21 continues from Stage 3's Beat 20 roster, i.e. Scene G's.)
- **`hellspawn` HP — now matched to Scene G's scale.** Scene G's `startBattle`
  uses `hellspawn: { hp: 6, maxHp: 40 }` (already heavily damaged mid-fight
  at that point in the story). This scene's climax reuses the `maxHp: 40`
  scale but starts the Hellspawn at full health (`40/40`) — narratively a
  freshly-summoned minion at the Dragonlord's side, not a continuation of
  Scene G's damaged instance (no state persists between standalone scripts
  regardless).
- **Third enemy id — now matched to Scene G's naming pattern.** Scene G
  names its two Hellspawn-adjacent minions `minion1`/`minion2`; this scene's
  extra minion (previously the placeholder `imp`) was renamed to `minion` to
  read as the same naming family, though it's still a fresh invention (Scene
  G/F never establish a fourth/climax-only minion).
- `dragonlord`'s 60/60 HP and the fighter/mage/scout/healer allies' HP
  (unchanged from Scene G's own values) remain this scene's own invention —
  neither Scene F nor Scene G references a Dragonlord, so there was nothing
  to reconcile against there.

This removes the "familiar-id convention" and "hellspawn HP" items that would
otherwise be listed under "Needs additional definition" as blocking
placeholders — they're now real, cross-scene-consistent values. What's left
open below is genuinely new to this scene, not inherited uncertainty.

## Needs additional definition (content, not engine work)

- **Third enemy (`minion`) — optional, not required.** Invented to fill
  `enemySlot2` and read as a small crowd rather than a lone duel; cutting it
  (two enemies instead of three) is equally valid if a reviewer prefers a
  sparser field.
- **"Hero front and center" — not literally realized, flagged gap.** Beat
  22's Rest description says "hero front and center, having called the
  deciding order," but `startBattle` fully replaces `world.entities` with
  only the authored `allies`/`enemies` (see `precompute.ts`'s `startBattle`
  case) — there's no ally slot left for `pc` once all four are familiars,
  and no established action places a non-combatant observer entity into the
  `'battle'` scene. This script leans on the "commander, not bystander"
  reading already present in Beat 20 (issuing almost nothing, the fight
  proceeding without you) and in `requirements.md`'s parked fork on this
  exact question — the hero's presence is carried entirely by voice/command,
  not a rendered sprite. If a literal on-screen hero is wanted, this needs
  new engine capability (see below), not a content tweak.
- **`initialSceneId`/pre-battle staging — cosmetic.** The four opening
  `partyJoin`s stack all four familiars at `pc`'s baked town position purely
  as a mechanical prerequisite for `startBattle`; there's no attempt to stage
  a meaningful pre-battle tableau (e.g. walking to a dungeon mouth) since the
  storyboard's Beat 21 "Into" (floor darkens, Dragonlord descends) is carried
  by `startBattle`'s own encounter flash, not a walk/scene change.
- ~~**Pause timings** (`1`, `2`, `1.5`, `0.5`s, etc.) are unmeasured
  placeholders, not yet matched to the presenter's spoken narration for
  these two beats.~~ **Addressed via checkpoints, not timing.** Every
  reading/narration `pause` that stood in for spoken-narration duration has
  been replaced with a `stop` right after the content appears (see "Currently
  working" above) — the presenter now controls pacing by clicking `next()`
  whenever their narration for that beat is done, so there's no duration left
  to measure or guess. The handful of remaining `pause`s are short cosmetic
  choreography beats (party-join stagger, menu open/select/close) with no
  narrated content, not stand-ins for spoken lines, so they're left as
  small fixed durations.

## Needs additional engine work

- **A non-combatant/observer entity in the `'battle'` scene.** To literally
  render "hero front and center" during the climax (see the flagged gap
  above), `startBattle` would need either a 5th slot reserved for a
  non-participating observer, or a new action to place/keep an entity in the
  battle scene without it being a `CombatantHp` ally. Not attempted here —
  flagged as a possible future `action-vocabulary.md` addition, not
  something this scene invents inline.
- Everything else in this scene is expressible with today's Established
  vocabulary.

## Wiring it in

Not yet registered. Intended registry entry once a follow-up step wires all
scenes into `SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`):
`id: 'scene-h'`, `name: 'Scene H — Climax: the Dragonlord'`, `actions:
sceneH as Action[]` (imported from `./scene-h.json`), `initialSceneId:
MAP.sceneId`. This doc must be kept aligned with
`client-talks/src/talk-rpg/scripts/scene-h.json` whenever the live script
changes.
