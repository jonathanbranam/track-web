# Scene B — The personal fear + who I am (Beat 3 — The save file)

Source: `../adm-talk-story-board-01.md`, Scene B, Beat 3.
Script: `client-talks/src/talk-rpg/scripts/scene-b.json` (plain `Action[]`, no map/entities needed) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

## Currently working

Beat 3 is fully expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine:

| Step | Action used |
|---|---|
| Status/save screen: Lv 99 framing + deed-log | `showSaveFile` (`summary`), then `stop` |
| Achievement toast | `showAchievement` (`text`), then `stop` |

**Pacing pass:** the fixed `pause(1.5s)`/`pause(2s)` before/after the achievement toast have been replaced with two `stop`s — one right after the save-file/deed-log appears, one after the achievement toast lands on top of it. These are two distinguishable narratable moments (the backstory recap, then the toast), so each gets its own presenter-controlled checkpoint instead of a timed wait: 2 `stop`s total (up from 1), and no fixed-duration pause needed since `stop` itself provides unlimited reading/talking time.

- Structural call #4 from the storyboard header (resolved, not open) says the
  who-I-am/backstory content folds into the save-file status screen. This
  scene realizes that via `showSaveFile` — **not** `showStatus`, which is a
  different, simpler stats-only screen used elsewhere (e.g. the in-battle
  roster). `showSaveFile`'s one `summary` string field carries both the Lv 99
  status framing and the compressed deed-log in one held screen, exactly as
  the storyboard's "Notes" call for ("does identity + backstory in one shot").
- `showAchievement` is independent of the `overlay` slot (per
  `action-vocabulary.md`), so the toast pops *on top of* the still-showing
  save-file screen rather than replacing it — matching "Achievement toast
  settling" in the Rest description, and matching the storyboard's "Into"
  sequencing (status screen opens → deed-log settles → achievement pops).
- The script deliberately does **not** call `hideOverlay`/`hideAchievement`
  before its `stop` — the beat's `pause: yes` checkpoint is meant to freeze on
  the composed screen (save-file + toast both visible), which is the "Rest"
  state the storyboard describes.
- `client-talks/src/talk-rpg/scripts/test-script.ts` (lines ~21–27) has a
  near-identical `showSaveFile` call with almost the same achievement text
  as its `summary` — used there as a title-screen "prior playthrough"
  framing gag, not this beat's identity/backstory moment. This scene's script
  is the canonical, purpose-built home for that quote as an actual
  `showAchievement`, separate from the `showSaveFile` summary.
- Needs no fixed map, entities, or PixelLab art — a full-screen overlay beat
  like Scene A. `initialSceneId` is cosmetically set to `MAP.sceneId`
  (`'world-town'`), matching Scene A's precedent.

## Needs additional definition (content, not engine work)

- **Deed-log wording — tentative.** The `summary` string's compressed
  deed-log ("first blade drawn as a boy → the tongues of assembly and C++
  learned → the painting of moving pictures conjured → the web-weaving
  mastered → the ML arts summoned") is a placeholder phrasing of the
  storyboard's five beats (first blade as a boy / assembly & C++ / moving
  pictures / the web / ML arts) into fantasy-deed language. Not checked
  against the presenter's real career timeline or exact word choice.
- **"Lv 99" framing — tentative.** Storyboard just says "a max-level hero";
  `Lv 99` is a placeholder concrete number (traditional DW "max level" flavor)
  standing in for whatever level number reads best once the visual layout of
  `showSaveFile`'s overlay is seen live.
- **Achievement text — verbatim from storyboard, not open.** `showAchievement`
  uses the exact quoted line from the beat (`Ach:` field): "Grandmaster
  Engineer — twenty years, one craft, ten thousand bugs slain." No paraphrase
  applied.
- **Pause timings — resolved.** The prior `1.5s`/`2s` fixed pauses are gone; both moments (save-file/deed-log, then the achievement toast) now end in their own `stop`, so the presenter's actual spoken pace determines how long each holds rather than a guessed duration.
- **"Deed-log scrolls once" — open, cosmetic.** The storyboard's "Into" says
  the deed-log *scrolls* once before settling. `showSaveFile`'s `summary` is
  a single static string with no scroll/reveal mechanism in
  `precompute.ts`/`TalkRpgScene` today, so this scene renders it as an
  instant hard-cut (same resolution Scene A used for its "cards flip in
  sequence" headline beat — see `scene-a.md`). Whether a hard cut is
  sufficient or this needs a real scroll/reveal action is still open; rhymes
  with the encounter-transition `[FORK]` in `../idea-board.md` §9.
- **`initialSceneId` for the registry entry.** Picked `MAP.sceneId`
  (`'world-town'`), cosmetically irrelevant since the save-file overlay and
  achievement toast cover the whole screen — matches Scene A's precedent.

## Needs additional engine work

None. Everything above is a content decision (wording, timing, whether a
hard cut is acceptable), not a missing capability — `showSaveFile` and
`showAchievement` together already cover this beat's full Rest state.

## Wiring it in

Not yet registered. Intended registry entry once a follow-up step wires all
scenes into `SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`):
`id: 'scene-b'`, `name: 'Scene B — The Save File'`, `actions: sceneB as
Action[]` (imported from `./scene-b.json`), `initialSceneId: MAP.sceneId`.
This doc must be kept aligned with `client-talks/src/talk-rpg/scripts/scene-b.json`
whenever the live script changes.
