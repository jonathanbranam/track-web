# Scene I — The turn: cost of change (Beat 23)

Source: `../adm-talk-story-board-01.md`, Scene I, Beat 23.
Script: `client-talks/src/talk-rpg/scripts/scene-i.json` (plain `Action[]`, no map/entities needed) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

## Currently working

The beat is expressible — as a best-effort standalone substitute for its full
storyboard description (see "Needs additional engine work" below) — with
actions already **Established** in `../action-vocabulary.md`:

| Beat | Actions used |
|---|---|
| 23 — The thing you can't afford to rebuild | `showOverlay` (`kind: 'act-card'`), `stop` |

- This is a deliberately quiet, single-beat scene — just one card, then the
  checkpoint. Same minimal shape as Scene A's Beat 1 (single card → `stop`,
  no intervening `pause` action needed since `stop` itself is already the
  presenter-visible checkpoint) and Scene C's Beat 5 (single `act-card` then
  `stop`, no trailing `hideOverlay`).
- `kind: 'act-card'` follows Scene C's precedent exactly (`scene-c.md`,
  "`act-card` vs. `headline`/`title`"): `'title'` is reserved for the actual
  title screen; `'headline'` reads as an in-world newspaper clipping; this
  beat is a singular, weighty, scene-setting quote card — the same category
  as Scene C's prophecy scroll, not a headline or the game logo.
- No fixed map, entities, or PixelLab art needed — a full-screen overlay
  beat, like Scenes A and C.
- Precomputes cleanly starting from a blank resting state (no open overlay
  or menu to clear first), so no leading `hideOverlay`/`hideMenu` is needed —
  matching Scene A Beat 1's precedent rather than Scene C's mid-scene
  transition precedent (which *did* need to clear a prior beat's menu/overlay
  within the same script).

## Needs additional definition (content, not engine work)

- **Quote text — not open.** `"Still standing. Too costly to raze."` is
  quoted verbatim from the storyboard's `Screen:` field, unchanged.
- **No pause before `stop` — tentative.** The beat has no authored `pause`
  action before its `stop`, mirroring Scene A Beat 1 and Scene C Beat 5's
  single-card-then-stop pattern. Since `pause: yes` in the storyboard means
  the beat itself is a presenter checkpoint (via `stop`), not that a timed
  `pause` action is also required, this is believed correct — but it's
  unmatched against the presenter's actual spoken narration (a longer quote
  than Scene C's), so flagging as open.
- **`initialSceneId` for the registry entry.** Picked `MAP.sceneId`
  (`'world-town'`), cosmetically irrelevant — matches Scene A/C's precedent
  since no map is ever shown.
- **Final resting state left showing the quote card — intentional.** Like
  Scene C Beat 5, the script's last action is `stop` with the `act-card`
  overlay still active (no trailing `hideOverlay`), since that's the visible
  state the presenter talks over. No live effect today since scenes are
  precomputed and played independently.

## Needs additional engine work

- **Camera pan / "still here" marker — cannot be authored today.** The
  storyboard's `Into:` field calls for "Camera pans back to the earlier
  dungeon; a 'still here' marker," and the `Rest:` field describes "A view of
  the old Stage-2 stronghold still standing, cracks and all — un-migrated,
  inhabited." Neither is literally achievable:
  - There is no dedicated "stronghold" map/location baked into
    `client-talks/public/rpg/maps/world-town.json`,
    `world-overworld.json`, or `world-cave.json` today, and this scene isn't
    allowed to add one (map JSONs are out of scope for this assignment — a
    shared file another step owns).
  - `panCamera` (real camera motion, `{ type: 'panCamera'; x; y; zoom;
    overSeconds? }`) is only **Proposed** in `../action-vocabulary.md`
    (§"Camera & scene transitions"), not yet part of the `Action` type in
    `client-talks/src/talk-rpg/script.ts` — it can't be authored until it's
    formalized and implemented.
  - `transitionScene` (`{ type: 'transitionScene'; style: 'flash' | 'wipe';
    to: string }`) is likewise only **Proposed**, so there's no engine-level
    "cut back to an earlier place" transition beyond a hard `showOverlay` cut
    either.
  - This mirrors Scene A's flagged gap (`scene-a.md`, "Headline transition
    style" — no flip/wipe effect exists in `precompute.ts` today) and Scene
    C's flagged gap (no scroll/reveal transition) — same underlying missing
    capability, different beat.
  - **Best-effort substitute authored instead:** a plain full-screen
    `showOverlay(kind: 'act-card')` hard cut with the quoted text, which is
    exactly the content-only, no-map-needed treatment Scenes A and C already
    use for beats in this same situation. Once `panCamera`/`transitionScene`
    land, this beat is the natural candidate to revisit with the literal
    "pan back to the stronghold" flourish the storyboard describes.

## Wiring it in

Not yet registered. Intended registry entry once a follow-up step wires all
scenes into `SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`):
`id: 'scene-i'`, `name: 'Scene I — The Turn: Cost Of Change'`, `actions:
sceneI as Action[]` (imported from `./scene-i.json`), `initialSceneId:
MAP.sceneId`. This doc must be kept aligned with
`client-talks/src/talk-rpg/scripts/scene-i.json` whenever the live script
changes.
