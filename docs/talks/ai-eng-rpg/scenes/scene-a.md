# Scene A — Cold open

Source: `../adm-talk-story-board-01.md`, Beats 1–2.
Script: `client-talks/src/talk-rpg/scripts/scene-a.json` (plain `Action[]`, no map/entities needed) — the actual script lives there, not in this folder; see `CLAUDE.md` in this folder for why.

## Currently working

Both beats are fully expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine:

| Beat | Actions used |
|---|---|
| 1 — Boot | `showOverlay(kind: 'title')`, `showMenu(menuKind: 'command')`, `stop` |
| 2 — Headline cycle | `hideMenu`, `showOverlay(kind: 'headline')` ×3, each followed by its own `stop` |

- `showMenu`'s `selectedIndex` starts at 0, so listing `options: ["Continue", "New Game"]` already puts the cursor on *Continue* — matches the storyboard with no extra field needed.
- `showOverlay` is a single-slot overlay, so the three headline cards are just three calls with the text replaced each time — no `hideOverlay` needed between them.
- **Pacing pass:** each headline card now gets its own `stop` instead of a fixed `pause(3s)` before the next card auto-replaces it. Since `stop` waits indefinitely for `next()`, this both fixes "not enough time to read" (the presenter reads/talks as long as they want, not a timer) and gives a manual advance point per card, matching the "runs like an animated slide deck" framing — each headline really is its own slide now. 4 `stop`s total in this scene (up from 2).
- Scene A needs no fixed map, entities, or PixelLab art. `TextCard.tsx` already renders `title`/`headline` overlays as styled DOM text.
- The live script is written in the exact format the engine accepts per the completed `script-selector` change (`openspec/changes/script-selector`, spec `script-library`, requirement "TypeScript or JSON authoring"): a plain JSON array of action objects, same shape as the shipped example `client-talks/src/talk-rpg/scripts/hello-json.json`.

## Needs additional definition (content, not engine work)

- **Title text — blocking.** The storyboard only says "renamed DW-pastiche logo"; no fictional in-world title is decided. `scene-a.json` currently uses the literal `"DRAGON WARRIOR"` as a temporary stand-in (same placeholder `test-script.ts` already ships with) — the real trademark, not a renamed pastiche, and must be replaced before this is presentable.
- **`initialSceneId` for the registry entry.** `NamedScript` (`client-talks/src/talk-rpg/scripts/index.ts`) requires an `initialSceneId` that exists in `MAPS`, even though this scene never shows a map. Pick one (e.g. `MAP.sceneId`, matching the other registered scripts) — cosmetically irrelevant since the title/headline overlays cover the whole screen.
- **Headline pause timing — resolved.** The fixed `pause(3s)` per card has been replaced with a `stop` after each headline, so timing is no longer a placeholder concern: the presenter controls how long each card holds.
- **Headline transition style.** `showOverlay`/`hideOverlay` are instant snaps in `precompute.ts` — there's no flip/wipe effect between the three cards today, so this will hard-cut. Storyboard says "cards flip in sequence"; whether that needs a real transition action or an instant cut is sufficient is still open (rhymes with the encounter-transition `[FORK]` in `../idea-board.md` §9).

## Needs additional engine work

None. Everything above is a content decision, not a missing capability.

## Wiring it in

Done. `client-talks/src/talk-rpg/scripts/scene-a.json` is registered in
`SCRIPTS` (`client-talks/src/talk-rpg/scripts/index.ts`) as `id: 'scene-a'`,
`name: 'Scene A — Cold Open'` — selectable from the site's script-select
screen. That file is the sole source of truth for the actions; this doc
tracks its known placeholders/open items (see "Needs additional definition"
above) and must be kept aligned whenever the live script changes.
