# docs/talks/ai-eng/scenes/ — Per-Scene Planning & Status

Working folder for turning `../adm-talk-story-board-01.md`'s scenes into real
`Action[]` scripts, one scene at a time.

**This folder holds markdown only** — planning notes, outlines, and status
for each scene. **It does NOT hold the scripts themselves.** A scene's actual
`Action[]` (JSON or TypeScript) lives in
`client-talks/src/talk-rpg/scripts/`, registered in `SCRIPTS`
(`client-talks/src/talk-rpg/scripts/index.ts`) so it's selectable from the
site's script-select screen. Earlier versions of this folder held a copy of
the JSON here too — that was a mistake (two copies of the same script drift);
don't reintroduce it.

Each scene gets one file, `<scene>.md` — a general planning document tracking
what's working, what isn't, what still needs a decision, and what
implementation is missing. `scene-a.md` is the reference example; new scenes
should follow the same section structure:

- **Header** — source link (the storyboard section/beats this scene covers)
  and script link (the live path under `client-talks/src/talk-rpg/scripts/`).
  Link to the script, don't restate its contents.
- **Currently working** — which beats are fully covered by actions already
  **Established** in `../action-vocabulary.md`, and any other reasons the
  scene already functions as authored (no map needed, no art needed, etc.).
- **Needs additional definition (content, not engine work)** — every open
  decision that blocks or weakens the scene: placeholder text, untimed
  pauses, an unresolved `[FORK]` carried over from `../idea-board.md`, wording
  that needs to match the storyboard's `Say` line. Mark any that are
  actually blocking playback, not just cosmetic.
- **Needs additional engine work** — beats that need a new/changed action
  type in `../action-vocabulary.md` before they can be authored at all, or
  explicitly "None" if everything is expressible today. Keep this distinct
  from the section above: this one is the engine's TODO, not the writer's.
- **Wiring it in** — registration status: whether the script exists under
  `client-talks/src/talk-rpg/scripts/` and is registered in `SCRIPTS`
  (`id`, `name`), or what's left to do to get there.

Add other sections when a scene's content calls for them (e.g. open
`[FORK]`s that need their own discussion, or a dependency on another scene's
recurring entity/state) — the four above are the minimum every scene file
needs, not an exhaustive list.

## Keeping this folder and `client-talks/src/talk-rpg/scripts/` aligned

These two folders describe the same scenes and must not drift:

- When a scene's script changes in `client-talks/src/talk-rpg/scripts/`
  (new placeholder resolved, action added, beat restructured), update that
  scene's `.md` here in the same change.
- When a new scene is started here, don't write its `.json`/`.ts` in this
  folder — add it directly under `client-talks/src/talk-rpg/scripts/` and
  register it in `SCRIPTS`, then write its planning/status `.md` here.
- If a scene in `SCRIPTS` has no corresponding `.md` here (or vice versa),
  that's a sync bug — fix it before doing further work on that scene.

## Code references needed when writing or editing a scene

- **`../action-vocabulary.md`** — the single source of truth for what
  actions exist (`Established`) vs. don't yet (`Proposed`). A scene should
  only use `Established` actions; if a beat needs something not listed,
  that's a gap to flag in the scene's `.md`, not something to invent inline.
- **`client-talks/src/talk-rpg/script.ts`** — the shared module: the `Action`
  type (and every member action type's exact fields), `GameMap`, map-loading
  helpers, and the map registry (`MAP`, `MAPS`). Scripts import from here,
  never redefine these.
- **`client-talks/src/talk-rpg/scripts/index.ts`** — the `SCRIPTS` registry.
  Shows every other currently-registered scene/script (id, name,
  `initialSceneId`) for reference, and is where a new scene must be added to
  become selectable.
- **`client-talks/src/talk-rpg/scripts/test-script.ts`** and
  **`hello-json.json`** — worked examples of the two authoring styles
  (TypeScript importing shared types vs. plain JSON array), useful as a
  template for a new scene file.
- **`client-talks/src/talk-rpg/scripts/index.test.ts`** — the registry test
  suite (unique ids, non-empty actions, valid `initialSceneId`, precomputes
  without throwing). Run it after registering a new/edited scene.
- **`../requirements.md`** §5 — the action-list / derived-resting-state
  model itself, for the underlying rules a scene's actions must respect
  (e.g. only `stop` is a presenter-visible checkpoint).
- **`openspec/changes/script-selector`** — the (completed) change that
  defined the registry contract (`specs/script-library/spec.md`,
  `specs/script-select-screen/spec.md`); the authority for the registry's
  exact requirements if a question comes up that this file doesn't answer.

## Keep this file in sync

When a new scene's planning doc is added here, or the code-reference list
above goes stale (a file moves, a new example script is added), update this
file in the same change.
