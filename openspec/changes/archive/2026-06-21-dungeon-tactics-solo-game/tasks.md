## 1. Move source files

- [x] 1.1 Create directory `client-games/src/games/dungeon-tactics-solo/`
- [x] 1.2 Move `GridRenderingGame.tsx`, `GridScene.ts`, and `GridModel.ts` from `client-games/src/games/prototypes/grid-rendering/` to `client-games/src/games/dungeon-tactics-solo/`
- [x] 1.3 Delete the now-empty `client-games/src/games/prototypes/grid-rendering/` directory

## 2. Update registries

- [x] 2.1 In `client-games/src/games/registry.ts`, add a `dungeon-tactics-solo` entry with name "Dungeon Tactics", category `single-player`, and a lazy `mount` pointing to `./dungeon-tactics-solo/GridRenderingGame`; insert it before the `prototypes` entry
- [x] 2.2 In `client-games/src/games/prototypes/registry.ts`, remove the `grid-rendering` entry (slug, name, description, and lazy import)

## 3. Retire the prototype spec

- [x] 3.1 Delete `openspec/specs/games-grid-rendering-prototype/` directory and its `spec.md`

## 4. Verify

- [x] 4.1 Run `npm run build` and confirm zero TypeScript errors
- [X] 4.2 Open the games home page and confirm "Dungeon Tactics" appears as a single-player card
- [X] 4.3 Tap the card and confirm the game loads at `/game/dungeon-tactics-solo` with working move/attack/playback
- [X] 4.4 Open `/game/prototypes` and confirm the "Dungeon Tactics" (grid-rendering) card no longer appears
