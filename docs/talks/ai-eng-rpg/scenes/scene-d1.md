# Scene D1 — Stage 1: Vibe coding (into the dungeon → command spam → whack-a-mole → the 47 tabs)

Source: `../adm-talk-story-board-01.md`, Beats 6–9 (first half of Scene D).
Script: `client-talks/src/talk-rpg/scripts/scene-d1.json` (plain `Action[]`) —
the actual script lives there, not in this folder; see `CLAUDE.md` in this
folder for why.

**Split note.** Beats 6–11 were originally authored as one continuous
`scene-d` file (75 actions). That made it the largest scene by a wide margin
(every other scene is 2–18 actions) and hard to plan/review/iterate on as a
unit, so it's been split at the storyboard's own first `stop` checkpoint (end
of Beat 9) into **Scene D1** (this file, Beats 6–9) and
[**Scene D2**](./scene-d2.md) (Beats 10–11). Both halves stay fully
standalone/independently registrable, matching every other scene's
convention — Scene D2 re-establishes the mid-battle resting state at its own
start rather than assuming this scene ran first (see scene-d2.md).

## Currently working

All four beats are expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine.

**Pacing pass:** every distinguishable narrated moment across Beats 6–9 now
gets its own `stop` instead of relying on fixed `pause` durations for reading
time. `showMenu`/`selectMenuOption`/`hideMenu` cursor choreography still
auto-chains straight into the `battleAction` it sets up (no `stop` needed for
the menu dance itself), but every resulting `battleAction` text,
`partyJoin`, `startBattle` settle, `showAchievement` toast, and `showOverlay`
card now ends its own auto-played segment with a `stop`. That's **11 `stop`s**
in this scene, up from the original single `stop` at the very end.

| Beat | Actions used | New checkpoints |
|---|---|---|
| 6 — Into the dungeon | `walkTo` (pc → `cave-entrance` on `world-overworld`), `partyJoin` (`familiar`) | `stop` after the walk settles, `stop` after the familiar joins (2) |
| 7 — Spamming commands | `setMeter` (`mp` bar, `gold` counter), `startBattle` (3× `bug-slime`), 3× `showMenu`/`selectMenuOption`/`hideMenu`/`battleAction`/`addMeter` cycle (one per `bug-slime`) | `stop` after `startBattle` settles, plus one `stop` per command→attack cycle (1 + 3 = 4) |
| 8 — Whack-a-mole | 4th command→attack cycle (kills `bug-slime-2`), `battleAction` (`wrong-action`, negative damage = heal, on `bug-slime-1`), `showAchievement`/`hideAchievement` | `stop` after the kill cycle's `battleAction` text, `stop` after the revive `battleAction` text, `stop` after the Necromancer achievement toast appears (3) |
| 9 — The 47 tabs | `showOverlay(kind: 'act-card')`, `showAchievement` | `stop` after the act-card lands, `stop` after the Working As Intended achievement appears — the scene's final checkpoint (2) |

Key choreography notes:
- Beat 6 never enters `world-cave` — `startBattle` itself switches the scene
  to the shared `'battle'` arena and plays its own "encounter flash on live
  entry," which serves as the "screen darkens to dungeon" transition. This
  avoids pulling in `world-cave.json`'s baked `bat` entity, which isn't part
  of this scene's story.
- Beat 7 fires three command→action cycles (one per `bug-slime`), draining
  `mp` by 4/4/3 and adding `gold` +5/+5/+10 — `mp` lands at 9/20, `gold` at 20,
  after Beat 7.
- Beat 8 kills `bug-slime-2` (mp −3 → 6) then revives `bug-slime-1` (already
  dead from Beat 7) via a `wrong-action` `battleAction` with `damage: -10`
  (mp −5 → 1), producing the exact `Screen` quote *"Familiar cast Revive on
  Bug-Slime!"*.
- **This scene ends (at the Beat 9 `stop`) with the `act-card` overlay and
  the "Working As Intended" achievement toast both left showing** — not
  hidden before the checkpoint, matching the `showAchievement → pause → stop`
  pattern in `test-script.ts`. Scene D2 opens by reconstructing this exact
  resting state (see scene-d2.md) and then hides both as its own first move,
  before Beat 10 proper begins.
- End-of-scene resting values Scene D2 must match: `pc` 20/20 hp, `familiar`
  14/14 hp (neither has taken damage yet), `bug-slime-1` 10/10 (revived to
  full), `bug-slime-2` 0/10 (dead, still on the field), `bug-slime-3` 5/10;
  `mp` 1/20; `gold` 20.

## Needs additional definition (content, not engine work)

- **Enemy/damage/HP numbers are placeholders.** Three `bug-slime`s at 10/10
  HP each, and all `battleAction` damage values (10/6/5/4), were chosen only
  to make the Beat 7→9 arc land on the right narrative beats (one slime
  dead-then-revived) — not tuned to any real pacing or difficulty curve.
- **`mp`/`gold` meter values are placeholders.** `mp` starts at 20/20 and is
  drained to 1 by the end of Beat 9 (−4/−4/−3/−3/−5 across five actions);
  `gold` climbs to 20 across Beat 7 (+5/+5/+10). Real values should come from
  whatever the MP-as-context-window metaphor needs once tuned against the
  spoken narration's timing.
- **Beat 9's "47 tabs" card text is a condensed placeholder** — a single
  `showOverlay(kind: 'act-card')` line (`"47 TABS OPEN. NOT ONE YOU ASKED
  FOR."`) standing in for "an absurd tab sprawl." The overlay slot only
  carries one text block, so the "dozens of tabs cascading open" visual
  described in `Into` isn't literally represented — see engine gap below.
- **`world-overworld`'s baked `wanderer` entity** is visible in the
  background during Beat 6 (it's baked into the map, not something this
  script controls) even though the storyboard's Rest only mentions "lone
  hero + one generic familiar." Cosmetic only — not blocking.
- **Pause durations — resolved.** The old fixed `pause` reading-time durations
  (0.2–2s) have been replaced with a `stop` after every distinguishable
  narrated moment (see "Currently working" above); no beat depends on a
  guessed pause length anymore. The remaining short `pause`s (0.2–0.3s) are
  cosmetic choreography settles (menu-open/select/close beats, an effect
  landing before the freeze) — not reading time — so they don't need further
  tuning against spoken narration.
- **Cross-file coupling with Scene D2:** if this scene's ending values (HP,
  `mp`/`gold`, overlay/achievement text) change, Scene D2's opening
  re-establishment block must be updated to match — same category of risk as
  Scene B/C's duplicated `showSaveFile` summary text.

## Needs additional engine work

Nothing blocks authoring today — every beat above is expressed with
Established actions — but two things are worth flagging for a future pass:

- **No scene-transition/darken action exists** (`transitionScene` is still
  *Proposed*, not *Established*, per `../action-vocabulary.md`). Beat 6's
  "screen darkens to dungeon" is approximated by `startBattle`'s existing
  encounter-flash-on-entry rather than an authored darken effect. If
  `transitionScene` is ever formalized, this beat is a good candidate to
  adopt it.
- **No compositing for "many small UI elements at once."** Beat 9's absurd
  tab sprawl really wants dozens of overlapping tab/window elements, but
  `showOverlay` only carries a single full-screen text block. Worked around
  with one condensed line (see above); a richer "cluttered UI" card variant
  would need new action/rendering support, not just new content.

## Wiring it in

Not yet registered — a follow-up centralized step adds this scene to
`SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`). Intended entry:

```ts
{ id: 'scene-d1', name: 'Scene D1 — Stage 1: Vibe Coding (Into the Fight)', actions: sceneD1 as Action[], initialSceneId: OVERWORLD_MAP.sceneId }
```

(`initialSceneId` must be `'world-overworld'` — the script's first action is
a `walkTo` on that map — not `MAP.sceneId`/town like most other registered
scripts.)
