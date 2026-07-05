# Scene C — The thesis, as a journey (Beats 4–5)

Source: `../adm-talk-story-board-01.md`, Scene C, Beats 4–5.
Script: `client-talks/src/talk-rpg/scripts/scene-c.json` (plain `Action[]`, no map/entities needed) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

## Currently working

Both beats are fully expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine:

| Beat | Actions used |
|---|---|
| 4 — The enhanced edition | `showSaveFile` (`summary`) + `stop`, then `showMenu` (`menuKind: 'command'`, `options`) + `stop` |
| 5 — The prophecy | `hideMenu`, `hideOverlay`, `showOverlay` (`kind: 'act-card'`), `stop` |

**Pacing pass:** Beat 4 is now split into two checkpoints instead of one — the save-file recap gets its own `stop` before the "Enhanced Edition Available" prompt appears, since those are two distinguishable narrative moments ("here's my accomplished career" → click → "then something changed"). The prior `pause(0.5s)` before the single combined stop is gone; 3 `stop`s total in this scene now (up from 2).

- This scene picks up right after Scene B's Beat 3 (`showSaveFile`'s status
  screen), but per the assignment brief it must be **standalone** —
  `scene-c.json` is precomputed independently of `scene-b.json` (separate
  `SCRIPTS` entries, each with its own `runPrecompute` call; nothing carries
  over between registered scripts today). So Beat 4 opens with its own
  `showSaveFile` call rather than assuming Scene B's state is already on
  screen.
- `showSaveFile` has only one `summary` string field (`../action-vocabulary.md`,
  `client-talks/src/talk-rpg/script.ts`'s `ShowSaveFileAction`) — there is no
  separate field for the "AI-Enhanced Edition Available — Begin?" prompt text.
  `test-script.ts` (~line 23) and `scene-b.json` both fold the "enhanced
  edition available" line directly into `summary`'s prose; this scene follows
  that precedent and appends the storyboard's exact prompt line
  (`✦ AI-ENHANCED EDITION AVAILABLE ✦ — Begin?`) to the end of the same
  deed-log wording `scene-b.json` uses (see "Needs additional definition"
  below re: the coupling this creates).
- `showMenu`'s `selectedIndex` starts at 0 (per `scene-a.md`'s precedent), so
  `options: ["Yes", "No"]` already puts the cursor on *Yes* with no extra
  `selectMenuOption` call needed — matches the storyboard's "cursor moves to
  Yes on its own" with the "on its own" part being: it's already there by
  default.
- `overlay` (used by `showSaveFile`/`showOverlay`) and the menu/dialogue UI
  slot are independent state (`../action-vocabulary.md`), so Beat 4's `stop`
  correctly freezes with **both** the save-file screen and the Yes/No menu
  visible at once — matching the beat's "Rest" description ("Over the save
  file, a prompt").
- Beat 5 needs no fixed map, entities, or PixelLab art — a full-screen overlay
  beat, like Scenes A and B. It clears Beat 4's menu and save-file overlay
  (`hideMenu`, `hideOverlay`) before showing the prophecy as a fresh
  `showOverlay` card, matching the storyboard's "Into: World fades in; scroll
  unrolls" (a hard cut to a new full-screen card, same resolution Scene A used
  for its headline cards — no dedicated scroll/reveal transition exists in
  `precompute.ts` today).
- `initialSceneId`: no map is ever shown, so this is cosmetic. Following Scene
  A/B's precedent, the intended registry entry uses `MAP.sceneId`
  (`'world-town'`).

## Needs additional definition (content, not engine work)

- **`[FORK]` Beat 4 flavor — resolved to the storyboard's stated default, not
  reopened here.** The storyboard's Notes explicitly say "Default = shown" for
  the voluntary New Game+ framing (vs. an unrequested forced-patch
  alternative) — this script authors the shown default only. If the forced-
  patch alternative is ever wanted, it's a different `summary`/prompt wording
  on the same actions, not a new action type.
- **Save-file summary text is duplicated from `scene-b.json` — tentative,
  flagged coupling.** To make Beat 4's "prompt over the save file" read
  correctly standalone, this script's `showSaveFile.summary` repeats
  `scene-b.json`'s exact deed-log prose verbatim (Lv 99 / the five-deed
  compressed backstory) before appending the enhanced-edition prompt. This is
  intentional for narrative consistency across scenes, but it means if
  Scene B's wording changes (it's marked tentative there too), this scene's
  copy will silently drift unless updated in the same change. No single
  source of truth exists for this string across scenes today — flagging in
  case a shared constant is ever warranted.
- **Prompt line wording — verbatim from storyboard, not open.** `"✦
  AI-ENHANCED EDITION AVAILABLE ✦ — Begin?"` is quoted directly from the
  Beat 4 `Screen:` field, unchanged.
- **`act-card` vs. `headline`/`title` for the prophecy — tentative, reasoning
  below.** `showOverlay`'s `kind` is one of `'act-card' | 'headline' |
  'title'`. Chose `'act-card'`: `'title'` is reserved for the game's actual
  title screen (Scene A precedent); `'headline'` reads as an in-world
  newspaper clipping (also Scene A precedent, three headline cards in
  sequence); the prophecy scroll is neither — it's a singular, weighty,
  scene-setting card ("the loaded gun the climax fires," per the storyboard's
  own Notes), which is closer to how an "act" or chapter break would be
  presented. If `TextCard.tsx`'s `act-card` styling turns out visually
  unsuited to a scroll/prophecy motif once seen live, this is a one-line
  change to `headline` instead — flagging as a placeholder pick, not a
  blocking one.
- **Pause timings — resolved.** Beat 4's `pause: 0.5` is gone; the save-file recap and the "Enhanced Edition" prompt now each end in their own `stop`, so the presenter's cadence determines the hold, not a guessed duration. Beat 5 still has no pause before its `stop` (mirrors Scene A Beat 1's single-card-then-stop pattern) — correct as-is, since `stop` already provides unlimited reading time.
- **Final resting state left showing the prophecy card — intentional, but
  flagged for scene D.** Beat 5's authored "Rest" state is the prophecy scroll
  on screen (that's what the presenter talks over), so the script's last
  action is `stop` with the `act-card` overlay still active — it does **not**
  call a trailing `hideOverlay` after that `stop`, matching Scene B's
  precedent of ending on a visible, uncleared overlay. Since scripts are
  precomputed and played independently today (no state carries between
  registered `SCRIPTS` entries), this has no live effect on a next scene. If
  scenes are ever concatenated into one continuous action list in the future,
  whichever scene follows this one (Scene D) will need its own leading
  `hideOverlay`/`hideMenu` rather than assuming a blank screen — flagging so
  that assumption doesn't get lost.
- **`initialSceneId` for the registry entry.** Picked `MAP.sceneId`
  (`'world-town'`), cosmetically irrelevant — matches Scene A/B's precedent.

## Needs additional engine work

None. Everything above is a content decision (wording, timing, `kind` choice,
cross-scene text duplication), not a missing capability — `showSaveFile`,
`showMenu`, and `showOverlay`/`hideOverlay` together already cover both
beats' full Rest states.

## Wiring it in

Not yet registered. Intended registry entry once a follow-up step wires all
scenes into `SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`):
`id: 'scene-c'`, `name: 'Scene C — The Thesis, As A Journey'`, `actions:
sceneC as Action[]` (imported from `./scene-c.json`), `initialSceneId:
MAP.sceneId`. This doc must be kept aligned with
`client-talks/src/talk-rpg/scripts/scene-c.json` whenever the live script
changes.
