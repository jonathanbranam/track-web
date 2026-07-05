# Scene F — Stage 2: Spec-driven development

Source: `../adm-talk-story-board-01.md`, Beats 13–16.
Script: `client-talks/src/talk-rpg/scripts/scene-f.json` (plain `Action[]`) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

**This scene contains the single most important locked story beat in the
whole talk.** Per the storyboard's own header: *"Fire-heal is the single
Stage-2 defeat. It's locked, has the achievement, and must happen once so
Stage 3 can prevent it."* Beat 16 below is authored as the canonical version
of that mistake, not a placeholder — Scenes G and H already reference it by
name (see "Cross-scene dependency" below).

## Currently working

All four beats are expressible with actions already **Established** in
`../action-vocabulary.md`. Following presenter feedback that the original
pacing was "far too fast" with "not enough pauses" to advance on, every
`pause(seconds)` that stood in for reading/narration time has been replaced
(or supplemented) with a `stop` immediately after the relevant content lands
— `stop` waits indefinitely, so the presenter now reads/talks as long as
needed and gets a manual advance point at every distinguishable narrated
moment, instead of a handful of guessed-duration timers. The script is
standalone: `initialSceneId: 'world-town'` (`MAP.sceneId`), and it
re-establishes its own party via `partyJoin` rather than assuming Scene D/E
ran first, per the parallel-authoring constraint. Verified via
`runPrecompute(actions, MAPS, MAP.sceneId)` — precomputes cleanly, produces
**24 checkpoints** (up from 2 in the first pass), and the resting states
match the storyboard's `Rest` descriptions (see below).

| Beat | Actions used | `stop`s |
|---|---|---|
| 13 — Write the spec | `partyJoin` ×3 (`familiar`, `familiar-2`, `familiar-3`), `showOverlay(kind: 'act-card')`, `hideOverlay` | 4 — one after each `partyJoin` lands, one after the spec-scroll overlay appears |
| 14 — The cognitive-load peak | `startBattle` (4 allies vs. 3 `bug-slime`s), repeated `showMenu`/`selectMenuOption`/`hideMenu`/`battleAction`/`tagCombatant` cycles | 7 — after `startBattle`, after each of the first two `battleAction`s, one after the frantic tag-team-alarm flurry (see judgment call below), after the diverted-heal resolution, and after each of the two closing finishing blows |
| 15 — I stopped watching | `pause` (shrunk to a 0.3s settle buffer) | 1 — converted from a bare 2.5s timed `pause` so the presenter's own line ("I stopped reading the code") has as long as it needs before the next battle starts |
| 16 — Fire heals the enemy | `startBattle` (fresh encounter vs. `hellspawn`), `battleAction` ×8 (3 party hits, 1 `wrong-action` heal, 4 retaliation hits), `endDialogue`, `endBattle(outcome: 'defeat')`, `defeatSequence`, `showAchievement` | 12 — after `startBattle`, after each of the 3 build-up hits, **a dedicated `stop` immediately after the `wrong-action` fire-heal lands** (the scene's single most important checkpoint), after each of the 4 retaliation hits, after `endBattle`, after the `defeatSequence` card, after the final `showAchievement` toast |

Total: **24 `stop`s** (up from 2), verified by precompute (see below).

- **Party-id convention:** `familiar` (re-established, matching Stage 1's id
  per the task's own instruction) plus `familiar-2`/`familiar-3` for the two
  new recruits — a plain numbered convention, in contrast to Scene G's
  role-named `fighter`/`mage`/`scout`/`healer` (Stage 3 hasn't happened yet
  at this point in the story, so there are no differentiated roles to name
  yet — Stage 2's whole point is undifferentiated familiars all needing you
  at once).
- **Beat 13's "training hall"** reuses `world-town`'s existing `'shrine'`
  named location for the two new familiars' `partyJoin` (the first,
  `familiar`, omits `at` and defaults to `pc`'s baked position at
  `town-square`) — there's no dedicated training-hall location/map, so this
  is a placeholder backdrop only (see below), same category as Scene G's
  reuse of `town-square` for its own training-ground beat.
- **The spec scroll is a single `showOverlay(kind: 'act-card', text: 'Plan
  of Battle.')`** — matches the storyboard's own `Screen` quote verbatim,
  and mirrors Scene A's precedent that diegetic on-screen text uses the
  overlay slot, never the `say`/dialogue slot.
- **Beat 14 ends without resolving the battle state on purpose.** All three
  `bug-slime`s are brought down to 0 HP (the party is "clearly winning"),
  but `familiar-3` is left at 3/14 HP tagged `needs-attention` — the frozen
  `stop` snapshot literally shows "one flashes low-HP off-plan," matching
  the storyboard's `Rest` line exactly (verified in the precompute
  checkpoint). `familiar-2` is also momentarily tagged `needs-attention`
  mid-beat (a second alarm firing "in the same instant") and is explicitly
  resolved back to `'in'` after a diverted `item` heal — depicting that the
  player can only catch some of what's flashing, not all of it, which is
  the emotional point ("I was the bottleneck").
- **No `endBattle` between Beats 14 and 16.** Per the realization guidance,
  Beat 16 opens with its own fresh `startBattle` (a new encounter vs.
  `hellspawn`), which fully overwrites `battle`/`entities` regardless of
  what Beat 14 left in progress — matching the vocabulary's documented
  `startBattle` semantics ("initializes `RestingState.battle`" from
  scratch). Beat 15's `pause` therefore doesn't need to touch battle state
  at all.
- **Beat 16's HP arithmetic is exact, not just narratively plausible:**
  `hellspawn` starts at 30/30, is brought to 3/30 ("near death") by three
  ordinary `attack`/`attack`/`attack` hits from `pc`/`familiar`/`familiar-2`,
  then the `wrong-action` hit (`damage: -27`) heals it by 27 — `3 - (-27) =
  30`, clamped to `maxHp: 30` — landing on **exactly full HP**, matching
  "it healed to full health!" precisely rather than approximately. The four
  retaliation hits (20/14/14/14 damage) then bring `pc`/`familiar`/
  `familiar-2`/`familiar-3` each to exactly 0 HP, matching "your party
  wiped."
- **The achievement toast text is quoted verbatim from the storyboard's own
  `Ach:` field** — `"You healed an enemy who was near death — and were then
  slain by that enemy."` — with no added "Thou Hast…" framing, since the
  storyboard doesn't give this one a DW-voice title (unlike, e.g., Scene D's
  `"Who Art Thou?"`).
- **The achievement toast and `defeat` overlay are left showing at the final
  `stop`** (neither is hidden before it) — this matches the documented
  intent that `achievement` coexists with `overlay` instead of displacing
  it, and mirrors Scene D's precedent of leaving its own final achievement
  toast up across a scene boundary.
- **Pacing retune (this pass):** per direct presenter feedback ("far too
  fast," "not enough pauses... to advance the slides on my own"), fixed-
  duration reading/narration `pause`s were replaced with a `stop` immediately
  after the relevant content lands — every `battleAction` narration line,
  every `showOverlay`/`showAchievement`/`defeatSequence` appearance, every
  `partyJoin`, and the `endBattle` state change now gets its own checkpoint.
  Menu-cycle choreography (`showMenu`/`selectMenuOption`/`hideMenu` before a
  payoff `battleAction`) is left auto-chained since it has no readable
  content of its own. **Judgment call — Beat 14's frantic flurry:** the
  storyboard explicitly says not to smooth this beat's franticness (it "IS
  the point"), so the rapid tag-team exchange (`familiar-2` and `familiar-3`
  both landing hits, both Bug-Slimes retaliating, both `tagCombatant
  needs-attention` tags firing "in the same instant") is left as one
  uninterrupted auto-played block with a single `stop` at its payoff (both
  alarms now visibly flashing), rather than breaking every micro-action in
  that flurry into its own click — doing so would turn an intentionally
  overwhelming flurry into a slow deliberate click-through and undercut the
  "I was the bottleneck" feeling the beat is going for.
- Verified standalone via a temporary local test run of
  `runPrecompute(sceneF, MAPS, MAP.sceneId)`: precomputes without throwing,
  produces **24 checkpoints** (87 actions total, 24 `stop`s — up from 67
  actions / 2 `stop`s / 2 checkpoints in the first pass), and the frozen
  `battle`/`overlay`/`achievement` fields at each checkpoint still match
  every narrative claim above (verified via a throwaway script, since
  deleted, that imported `runPrecompute` and this updated JSON directly).

## Needs additional definition (content, not engine work)

- **Beat 13's "training hall" location — placeholder, cosmetic only.** No
  dedicated training-hall named location or map exists; the two new
  familiars' `partyJoin` calls reuse `world-town`'s `'shrine'` location as a
  stand-in backdrop, same placeholder-map seam as other scenes' reuse of
  existing town locations. Not blocking playback.
- **Beat 14's enemy composition and all HP/damage numbers are placeholders.**
  Three `bug-slime`s at 12/12 HP each (matching Scene D's Stage-1 trash-mob
  convention, one HP tier higher than Scene D's 10/10 to read as slightly
  tougher this stage) and all `battleAction` damage values were chosen only
  to land the narrative beats (two slimes finished off cleanly, one
  familiar left flashing low, one familiar caught by a diversion) — not
  tuned to any real pacing or difficulty curve.
- ~~Beat 14's pacing (menu-cycle `pause` durations, 0.15–0.5s) are unrhymed
  placeholders~~ — **addressed via checkpoints, this pass.** The
  narration-bearing pauses are gone, replaced by `stop`s that wait
  indefinitely for the presenter (see "Currently working" above); the
  remaining small `pause`s (0.15–0.2s) are purely cosmetic menu-choreography
  timing, not stand-ins for reading time, and don't need to be "timed" against
  anything. The one deliberate exception is Beat 14's frantic tag-team
  flurry, which is intentionally left auto-chained rather than
  checkpointed line-by-line — see the judgment-call note above.
- **Cardboard-sword texture (Beat 15) — omitted, not authored.** The
  storyboard explicitly marks this `[OPTIONAL/PROVISIONAL]` and "likely cut
  for time." Beat 15 is realized as a single bare `pause` with no overlay at
  all (see reasoning below) — the simplest honest realization given the
  beat's own `Screen: —`. This is a still-open `[DECIDE]`: if a future pass
  wants the cardboard-sword texture beat, it would need a new `showOverlay`
  (or similar) call inserted here, plus real asset/text content that doesn't
  exist yet.
- **Beat 15's realization choice — no overlay, bare `pause` only.** The
  storyboard's `Into` describes a camera push with the fight blurring
  *behind* you (i.e., still partially visible, not replaced), but the engine
  has no camera/blur primitive (`panCamera` is still *Proposed*, not
  *Established* — see `../action-vocabulary.md`). A full-screen
  `showOverlay` would fully obscure the battle-arena view, which overstates
  what "blurs behind you" implies; a bare `pause` (shrunk to a 0.3s settle
  buffer, followed by a `stop`) leaves Beat 14's frozen battle-arena resting
  state visibly present underneath, and lets the presenter's own spoken line
  ("I stopped reading the code") carry the beat for as long as they need,
  per the storyboard's own rule that the screen never states the point
  outright. Documented here per the task's explicit instruction to flag this
  choice either way.
- **`hellspawn`'s HP (30/30, brought to 3/30 near-death) is a placeholder
  tuned only for this scene**, not sourced from or reconciled with Scene
  G's/H's own standalone `hellspawn` HP values (6/40 and 20/20
  respectively, per `scene-g.md`/`scene-h.md`) — each scene is independently
  precomputable and `startBattle` always fully re-initializes combatant HP
  from scratch, so no numeric reconciliation is required for correctness,
  only for narrative polish if someone later wants the HP arc to feel
  continuous across scenes.
- **`Fireball` as the specific spell name is an authoring choice**, taken
  directly from the storyboard's own `Into`/`Screen` text ("A familiar casts
  Fireball…" / "Your mage cast Fireball…") — not independently decided here.
- ~~Pause durations in Beat 16 (0.3–2s) are unrhymed placeholders~~ —
  **addressed via checkpoints, this pass.** Every `battleAction` narration
  line in Beat 16 — including, most importantly, the `wrong-action` fire-heal
  line itself — now lands and then `stop`s, so the presenter reads/narrates
  each hit at their own pace instead of racing a fixed timer. Remaining
  `pause`s (0.2–0.5s) are small settle buffers before their adjacent `stop`,
  not reading-time placeholders.

## Needs additional engine work

None. Every beat above is expressed with actions already Established in
`../action-vocabulary.md` — no new action type, field, or engine capability
is required to author this scene as written.

## Wiring it in

Not yet registered. Intended registry entry (to be added centrally, per this
scene's authoring constraints — not by this change):

```ts
{ id: 'scene-f', name: 'Scene F — Stage 2: Spec-Driven Development', actions: sceneF as Action[], initialSceneId: MAP.sceneId }
```

in `client-talks/src/talk-rpg/scripts/index.ts`. The script file itself,
`client-talks/src/talk-rpg/scripts/scene-f.json`, already exists and has been
verified standalone via `runPrecompute` (see "Currently working" above); only
the registry wiring and `index.test.ts` coverage remain, both left to the
follow-up centralized step per this scene's task instructions.

## Cross-scene dependency: `hellspawn` is now a recurring entity id

`hellspawn` (lowercase, matching this scene's own `CombatantHp.id`) is the
**locked recurring enemy** across Stage 2 → Stage 3 → the climax. Scenes G
and H both already reuse this exact id independently (`scene-g.json`,
`scene-h.json`, and their `.md`s explicitly cite "Scene F's convention"), so
this naming is now confirmed consistent across all three scenes:

- **Scene F (this scene, Beat 16):** the mistake — Fire heals `hellspawn` to
  full, party wiped.
- **Scene G (Beats 17–20):** the payoff — the standing order intercepts the
  same mistake before it happens, `hellspawn` is defeated cleanly.
- **Scene H (climax):** `hellspawn` reappears as a minion at the
  Dragonlord's side.

Nothing about `hellspawn`'s HP carries over between these scripts (each
`startBattle` is a fresh, standalone re-initialization — see "Needs
additional definition" above) — the throughline is carried only by the
shared id string and the presenter's own narration, not by any shared script
state. Any future scene introducing `hellspawn` again should keep this exact
lowercase id.
