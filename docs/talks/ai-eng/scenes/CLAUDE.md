# docs/talks/ai-eng/scenes/ — Per-Scene Definitions

Working folder for turning `../adm-talk-story-board-01.md`'s scenes into real,
engine-ready `Action[]` scripts, one scene at a time.

Each scene gets a pair of files:

- **`<scene>.json`** — the actual script: a plain JSON array of action
  objects, using only actions **Established** in `../action-vocabulary.md`.
  Written in the exact format the `talk-rpg` engine's script registry accepts
  per the completed `script-selector` change (`openspec/changes/script-selector`,
  spec `script-library`) — see `client-talks/src/talk-rpg/scripts/hello-json.json`
  for the shipped equivalent. Not wired into the registry yet; these are
  authored here first so content can be iterated on without touching
  `client-talks/`.
- **`<scene>.md`** — status: which beats are fully covered by Established
  actions today, which lines in the `.json` are placeholders pending a content
  decision (e.g. exact wording, timing), and which beats would need a new
  action type (if any) added to `../action-vocabulary.md` first.

## Why a separate folder

Keeps scene-by-scene authoring work out of the parent folder's
narrative/framework docs (`../idea-board.md`, `../action-vocabulary.md`,
`../requirements.md`), which stay scene-agnostic, and out of
`client-talks/src/talk-rpg/scripts/`, which should only receive a scene once
its content decisions are resolved.

## Keep this file in sync

When a new scene is added, or a scene's `.json` graduates into
`client-talks/src/talk-rpg/scripts/` and is registered in `SCRIPTS`, update
this file and the scene's own `.md` to reflect that.
