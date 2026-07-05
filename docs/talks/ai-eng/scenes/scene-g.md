# Scene G — Stage 3: The harness

Source: `../adm-talk-story-board-01.md`, Beats 17–20.
Script: `client-talks/src/talk-rpg/scripts/scene-g.json` (plain `Action[]`) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

This scene is the direct payoff of Scene F's Beat 16 (Fire heals the Hellspawn
to full, party wiped): same recurring enemy id (`'hellspawn'`), but this time
the standing order catches the mistake before it happens. The script is
standalone (its own `partyJoin`/`startBattle` calls) so it can be precomputed
independently of Scene F's state, per the parallel-authoring constraint — the
throughline is carried only by the shared entity id string, not by shared
script state.

## Currently working

All four beats are expressible with actions already **Established** in
`../action-vocabulary.md`. Following the same repacing pass already applied to
Scenes A/B/C/E, every distinguishable narrated moment now gets its own
presenter-visible `stop` immediately after its content lands, instead of a
guessed-duration `pause`. The scene now carries **15 `stop` checkpoints** (up
from 1), verified via `runPrecompute` (45 actions, 15 checkpoints, no throw):

| Beat | Actions used | Checkpoints |
|---|---|---|
| 17 — Training ground (complexity) | `partyJoin` ×4, `showStatus` ×4 (role cards), `hideMenu` ×4 | 8 — one `stop` right after each familiar's `partyJoin` (the entrance itself is a distinct beat worth narrating) and one more right after that familiar's `showStatus` role card lands, so each of the four familiars gets two checkpoints |
| 18 — The standing order (review) | `showOverlay(kind: 'act-card')`, `hideOverlay` | 1 — `stop` right after the standing-order card appears |
| 19 — Self-correcting battle (feedback) | `startBattle`, `showMenu`/`selectMenuOption`/`hideMenu`, `battleAction` ×3, `showAchievement` | 5 — `stop` after `startBattle` (arena/enemies appear), after the pivotal "Fire withheld. Order followed." hit (the averted-mistake beat — this scene's single most important checkpoint), after each of the two minion-mop-up hits, and after the "Averted —" achievement toast |
| 20 — Boring is the win | `battleAction` ×2, `hideAchievement`, `endBattle(outcome: 'victory')`, `stop` | 1 — the two calm mop-up hits, `hideAchievement`, and `endBattle` are left auto-chained (small 0.3s settle pauses only) into a single final `stop`, deliberately *not* fragmented further so the "boring/calm, almost no commands" feel of this beat survives |

The command-menu open/select/close chains around the Beat 19 `battleAction`
(`showMenu`/`selectMenuOption`/`hideMenu`) remain auto-chained with only small
(0.15–0.3s) cosmetic settle pauses — pure choreography with no readable
content of its own, matching the "menu before the payoff action" exception.

- **Familiar-id convention:** four role-named ids — `'fighter'`, `'mage'`,
  `'scout'`, `'healer'` — rather than generic `familiar-1..4`. Chosen because
  Beat 17's whole point is "distinct roles, clean boundaries" (the complexity
  principle) — a role-named id reads that intent directly in the script
  without needing the `role` field on `showStatus` to carry all the meaning.
- **Enemy-id convention:** `'hellspawn'` (lowercase, matches Scene F's
  convention per the cross-scene naming instruction) plus two generic
  `'minion1'`/`'minion2'` `CombatantHp` entries for "(+ minions)". All three
  enemies map exactly onto `BATTLE_MAP`'s three `enemySlot0..2` locations; the
  four familiars map exactly onto the four `allySlot0..3` locations — no
  slots left over or short.
- **Role cards realized as `partyJoin` + `showStatus` per familiar**, not a
  single combined `showOverlay`. Chosen over the single-overlay alternative
  because "each with an authored battle-spec card" (storyboard's own wording)
  reads more literally as four discrete card-reveal beats than one shared
  list, and it reuses `partyJoin`'s scale-in tween as the visual for
  "formation snaps into order." `showStatus`'s `role` field carries the role
  name directly (`'Fighter'`/`'Mage'`/`'Scout'`/`'Healer'`); `level`/`hp`/
  `maxHp` are placeholder stat values (see below).
- **The protagonist (`'pc'`) is deliberately not a battle combatant here.**
  Only the four familiars fight (matches `BATTLE_MAP`'s exactly-4 ally slots,
  and Beat 21's climax framing "your four familiars vs. the Dragonlord," which
  likewise doesn't list `pc` as a combatant). The player's presence is the
  *absence* of commands in Beat 20 ("your command cursor goes still"), not an
  HP bar — no `pc` entity needed in this script at all.
- **The self-correction (Beat 19) is depicted via `battleAction` text, not
  mechanics** — per the realization guidance, there's no `damage: 0` or
  "aborted" state; the pivotal action is an ordinary positive-damage
  `kind: 'spell'` hit on `hellspawn` whose `text` reads `"Fire withheld. Order
  followed."` The mechanical effect (a clean hit) and the narrated effect (a
  redirected cast) are two different things layered on the same action — see
  "Needs additional engine work" below.
- **Beat 20's "boring" quality is authored by omission**: the two mop-up
  `battleAction`s that close out the fight have no preceding
  `showMenu`/`selectMenuOption` around them (unlike the Beat 19 pivot, which
  does show a command being chosen) — no visible command input, matching
  "familiars executing calmly" / "the fight proceeds without you."
- **HP arithmetic is exact** (not just narratively plausible): `hellspawn`
  starts at 6/40 HP and the pivotal 6-damage hit brings it to exactly 0 in
  Beat 19 (the recurring threat is resolved at the emotional climax, not left
  dangling into the "boring" mop-up beat); `minion1`/`minion2` start at 8/8
  and are brought down in two hits each (5 in Beat 19, 3 in Beat 20), so the
  mop-up in Beat 20 has real (if trivial) enemies left to finish, not an
  already-empty battle.
- Verified standalone: `runPrecompute(actions, MAPS, MAP.sceneId)` runs
  cleanly, producing 15 checkpoints (45 actions, 15 `stop`s), with
  `battle: null` (post-`endBattle`) and `achievement: null` (post-
  `hideAchievement`) at the final checkpoint — no dangling battle/toast state
  handed off to whatever scene runs after this one.

## Needs additional definition (content, not engine work)

- **`town-square` as the "training ground" location — placeholder, blocking
  only for visual fidelity.** No dedicated training-ground named location or
  map exists; Beat 17's `partyJoin` calls reuse `world-town`'s existing
  `'town-square'` location as a stand-in backdrop. Purely a placeholder-map
  seam (same category as the battle arena's flat-color backdrop) — cosmetic,
  not blocking playback.
- **Familiar `level`/`hp`/`maxHp` values are placeholders.** `level: 4` for
  all four, with modest hand-picked HP (fighter 18, mage 14, scout 15, healer
  16) — no stat-balancing pass has happened; these exist only to be
  "healthy-looking" numbers for the role cards and to carry into
  `startBattle`'s `CombatantHp` list unchanged.
- **`hellspawn`'s starting HP (6/40) is a tuned placeholder**, not sourced
  from Scene F. Since this script is standalone, `hellspawn`'s HP here has no
  required relationship to whatever HP Scene F leaves it at (that state
  doesn't carry over — see `startBattle`'s Established note: it fully
  replaces `entities`, so nothing is inherited across scripts anyway). 6/40
  was chosen just to read as "near death" per Beat 19's `Rest` line and to
  let the pivotal 6-damage hit resolve it exactly to 0.
- **`showOverlay(kind: 'act-card')` for the standing-order card — tentative
  choice between `'act-card'` and `'headline'`.** Both are valid `kind`s for
  a full-screen text card; `'act-card'` was picked because "standing-order
  card" reads more like a special narrative beat than a stage-transition
  headline, but nothing in the vocabulary distinguishes their rendering
  beyond styling. Easy to flip if `'headline'` reads better once styled.
- ~~Beat 19/20 pacing (`pause` durations) are unTimed placeholders~~ —
  **addressed.** Every reading/narration beat that previously relied on a
  guessed-duration `pause` now lands on a presenter-controlled `stop`
  instead (see "Currently working" above), so there's no spoken-line-length
  guess left to validate — the presenter simply advances when ready. The only
  `pause`s remaining are small (0.15–0.3s) cosmetic settle buffers around
  menu open/select/close choreography, which have no reading content and
  don't need to match spoken-line length.

## Needs additional engine work

- **No "action considered, then swapped" mechanic exists.** Beat 19's whole
  premise — a familiar *begins* casting Fire, the standing order *intercepts*
  it, and it *swaps* to the correct move — has no literal representation in
  `battleAction`: `kind` doesn't drive any branch (per
  `action-vocabulary.md`'s "Authored-but-inert fields" note), and there's no
  before/after pair of actions for "attempted X, corrected to Y." This script
  depicts the averted mistake entirely through the `text` field of a single,
  ordinary successful `spell` hit (`"Fire withheld. Order followed."`) — the
  screen doesn't visually show a cast beginning, aborting, and redirecting;
  it just shows one clean hit whose caption narrates that a correction
  happened. If a future phase wants the abort-and-swap to be *visible*
  (e.g. two chained actions, or a new `kind` that maps to a distinct
  animation), that's new engine work, not something this script can express
  today.
- Everything else in this scene is expressible with Established actions.

## Wiring it in

Not yet registered. Intended registry entry (to be added centrally, per this
scene's authoring constraints — not by this change):
`{ id: 'scene-g', name: 'Scene G — Stage 3: The Harness', actions: sceneG as Action[], initialSceneId: MAP.sceneId }`
in `client-talks/src/talk-rpg/scripts/index.ts`. The script file itself,
`client-talks/src/talk-rpg/scripts/scene-g.json`, already exists and has been
verified standalone via `runPrecompute` (see "Currently working" above); only
the registry wiring and `index.test.ts` coverage remain, both left to the
follow-up centralized step per this scene's task instructions.

## Open forks carried from the storyboard

Two `[FORK]`s from `../adm-talk-story-board-01.md` touch this scene directly;
both are left unresolved here per the storyboard's own stated defaults, and
are called out again so they aren't lost:

- **Beat 18 — personify the standing order, or keep it an impersonal spec?**
  Storyboard default is "spec" (`[FORK] — personify this as a companion who
  stays another's hand, or keep it as the impersonal spec. Default: spec.`).
  This script takes the default literally: the standing order is realized as
  a `showOverlay` text card, never a `startDialogue`/`say` from a named
  companion entity. If a future pass decides to personify it, this beat would
  need to change from `showOverlay` to a `startDialogue(speaker: <name>)` +
  `say` pair instead — a content change, not an engine change (the vocabulary
  already supports both realizations).
- **Beat 19 — no "aborted action" engine mechanic**, discussed above under
  "Needs additional engine work." This isn't one of the storyboard's own
  named forks, but it's the same shape of open question: a real capability
  gap the current script papers over with narration text alone. Flagging it
  here explicitly so it's visible next to the storyboard-native fork above,
  per this folder's convention of tracking every open decision a scene's
  script rests on.
