## 1. Script library

- [ ] 1.1 Remove the `SCRIPT: Action[]` export from `client-talks/src/talk-rpg/script.ts`; keep every shared type (`Action` and its member interfaces), `GameMap`, `loadMap`, `TILE_TYPES`/`tileColor`, `BATTLE_SCENE_ID`/`BATTLE_MAP`, and the map registry (`MAPS`, `MAP`, `TOWN_MAP`, `OVERWORLD_MAP`, `CAVE_MAP`) exactly as they are.
- [ ] 1.2 Create `client-talks/src/talk-rpg/scripts/` and move the removed `SCRIPT` array's content into `scripts/test-script.ts`, importing `Action`, `MAP`, etc. from `../script`, unchanged in content.
- [ ] 1.3 Create `client-talks/src/talk-rpg/scripts/index.ts` exporting `NamedScript` (`{ id, name, actions, initialSceneId }`) and `SCRIPTS: NamedScript[]`, registering the moved script as `{ id: 'test-script', name: 'Test Script', actions: TEST_SCRIPT, initialSceneId: MAP.sceneId }`.
- [ ] 1.4 Confirm the registry supports both an inline-defined script (a `const` array written directly in `index.ts`) and a script imported from a separate file, so both authoring styles are exercised at least once (the moved `test-script.ts` covers the separate-file case; add a second, trivial inline script — or a code comment showing the pattern — to cover the inline case if no second real script exists yet).
- [ ] 1.5 Confirm the registry supports a JSON-authored script (e.g. a small `.json` file under `scripts/` imported and cast to `Action[]`), even if only as a minimal example, so the JSON authoring path is proven end-to-end.
- [ ] 1.6 Add `client-talks/src/talk-rpg/scripts/index.test.ts` (vitest) asserting: every `SCRIPTS` entry has a unique `id`; every entry has a non-empty `actions` array; every entry's `initialSceneId` exists in `MAPS`; and `runPrecompute(entry.actions, MAPS, entry.initialSceneId)` completes without throwing for every entry.

## 2. Director and experience take an injected script

- [ ] 2.1 Change `client-talks/src/talk-rpg/Director.tsx`'s `DirectorProvider` to accept `{ script: Action[]; initialSceneId: string; children }` props, replacing its direct `import { MAP, MAPS, SCRIPT } from './script'` of `SCRIPT`/`MAP` (keep importing `MAPS`, which stays global/shared) and using the props in place of `SCRIPT`/`MAP.sceneId` in the `useMemo` precompute/engine construction.
- [ ] 2.2 Change `client-talks/src/talk-rpg/RpgExperience.tsx`'s default export to accept a `{ namedScript: NamedScript }` prop and pass `namedScript.actions`/`namedScript.initialSceneId` through to `DirectorProvider`.
- [ ] 2.3 Add a "back to scripts" control to `Overlay.tsx` (or a small sibling control in the same overlay layer), following the existing DOM-button pattern (plain `onClick`, no scene-level input handling needed — see `kb/phaser-mobile-input.md`, already satisfied by `PhaserStage`'s existing `input: { windowEvents: false }`), that navigates back to the select screen.

## 3. Select screen and routing

- [ ] 3.1 Create `client-talks/src/pages/ScriptSelectPage.tsx`: lists every `SCRIPTS` entry's `name`, and on selection navigates (via `useNavigate`/`Link`, not `window.location.href =`) to the talk's URL with the chosen script's `id` appended.
- [ ] 3.2 Update `client-talks/src/App.tsx`'s route for talks to accept an optional script segment (e.g. `path="/talks/:slug/:script?"`).
- [ ] 3.3 Update `client-talks/src/pages/TalkPage.tsx`: for `kind: 'rpg'` talks, if the `:script` param is absent or does not match any `SCRIPTS` entry's `id`, render `ScriptSelectPage`; if it matches, render `RpgExperience` with that `NamedScript`.
- [ ] 3.4 Wire the "back to scripts" control added in 2.3 to navigate to the talk's URL with no `:script` segment.

## 4. Verification

- [ ] 4.1 Run `npm run test` (vitest) and confirm the new `scripts/index.test.ts` passes alongside the existing `directorEngine.test.ts`/`precompute.test.ts`/`pathfinding.test.ts` suites.
- [ ] 4.2 Run `npm run build:talks` and confirm zero TypeScript errors.
- [ ] 4.3 Manually verify in the browser (Playwright screenshot, saved to `/tmp/track-verify/`): loading `/talks/engineering-with-ai` shows the select screen; selecting `"Test Script"` loads and plays it with the URL showing `test-script`; the in-experience "back to scripts" control and the browser Back button both return to the select screen; navigating directly to an unknown script id (e.g. `/talks/engineering-with-ai/nonexistent`) also shows the select screen.
