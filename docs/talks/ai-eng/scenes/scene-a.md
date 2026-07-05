# Scene A — Cold open

Source: `../adm-talk-story-board-01.md`, Beats 1–2.
Script: `scene-a.json` (plain `Action[]`, no map/entities needed).

## Currently working

Both beats are fully expressible with actions already **Established** in
`../action-vocabulary.md` — nothing new needed in the engine:

| Beat | Actions used |
|---|---|
| 1 — Boot | `showOverlay(kind: 'title')`, `showMenu(menuKind: 'command')`, `stop` |
| 2 — Headline cycle | `hideMenu`, `showOverlay(kind: 'headline')` ×3, `pause`, `stop` |

- `showMenu`'s `selectedIndex` starts at 0, so listing `options: ["Continue", "New Game"]` already puts the cursor on *Continue* — matches the storyboard with no extra field needed.
- `showOverlay` is a single-slot overlay, so the three headline cards are just three calls with the text replaced each time — no `hideOverlay` needed between them.
- Scene A needs no fixed map, entities, or PixelLab art. `TextCard.tsx` already renders `title`/`headline` overlays as styled DOM text.
- `scene-a.json` is written in the exact format the engine now accepts per the completed `script-selector` change (`openspec/changes/script-selector`, spec `script-library`, requirement "TypeScript or JSON authoring"): a plain JSON array of action objects, same shape as the shipped example `client-talks/src/talk-rpg/scripts/hello-json.json`. It can be copied to `client-talks/src/talk-rpg/scripts/scene-a.json` and registered as-is.

## Needs additional definition (content, not engine work)

- **Title text — blocking.** The storyboard only says "renamed DW-pastiche logo"; no fictional in-world title is decided. `scene-a.json` currently has a placeholder string that must be replaced before this is playable.
- **`initialSceneId` for the registry entry.** `NamedScript` (`client-talks/src/talk-rpg/scripts/index.ts`) requires an `initialSceneId` that exists in `MAPS`, even though this scene never shows a map. Pick one (e.g. `MAP.sceneId`, matching the other registered scripts) — cosmetically irrelevant since the title/headline overlays cover the whole screen.
- **Headline pause timing.** `seconds: 3` per card is a placeholder, not yet timed against Beat 2's spoken line.
- **Headline transition style.** `showOverlay`/`hideOverlay` are instant snaps in `precompute.ts` — there's no flip/wipe effect between the three cards today, so this will hard-cut. Storyboard says "cards flip in sequence"; whether that needs a real transition action or an instant cut is sufficient is still open (rhymes with the encounter-transition `[FORK]` in `../idea-board.md` §9).

## Needs additional engine work

None. Everything above is a content decision, not a missing capability.

## Wiring it in (once the content decisions above are made)

1. Copy `scene-a.json` to `client-talks/src/talk-rpg/scripts/scene-a.json`.
2. Add an entry to `SCRIPTS` in `client-talks/src/talk-rpg/scripts/index.ts`:
   ```ts
   import sceneA from './scene-a.json'
   // ...
   { id: 'scene-a', name: 'Scene A — Cold Open', actions: sceneA as Action[], initialSceneId: MAP.sceneId },
   ```
