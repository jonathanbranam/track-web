## Context

The `grid-rendering` prototype has been developed into a full single-player game experience (turn-based tactics, move/attack planning, animated playback). It currently lives at `client-games/src/games/prototypes/grid-rendering/` and is accessible only through the Prototypes sub-menu. A separate multiplayer `dungeon-tactics` game already exists in the games registry (lobby-based, minPlayers: 2). The goal is to promote the prototype to a first-class single-player game with no changes to gameplay logic.

## Goals / Non-Goals

**Goals:**
- Add a `dungeon-tactics-solo` entry in `registry.ts` that mounts the existing game component directly
- Move the source directory to `client-games/src/games/dungeon-tactics-solo/` with no logic changes
- Remove the `grid-rendering` entry from the prototype sub-registry
- Retire the `games-grid-rendering-prototype` spec (delete it)

**Non-Goals:**
- No gameplay changes, no refactoring of GridModel or GridScene
- No multiplayer integration — the existing `dungeon-tactics` lobby game is unchanged
- No new routes — the existing `/game/:slug` catch-all handles the new slug

## Decisions

### Slug: `dungeon-tactics-solo`
The multiplayer game uses slug `dungeon-tactics`. Using `dungeon-tactics-solo` avoids a collision and makes the distinction explicit in the URL.

### Display name: "Dungeon Tactics"
The games home page shows the name field; "Dungeon Tactics" is sufficient because the category badge ("single-player") provides the disambiguation that the slug-level `-solo` suffix exists for routing purposes only. Alternative considered: "Dungeon Tactics - Solo" — rejected because it's redundant with the category indicator.

### Directory: `client-games/src/games/dungeon-tactics-solo/`
Mirrors the naming convention of `client-games/src/games/ball-merge/`. The three moved files (`GridRenderingGame.tsx`, `GridScene.ts`, `GridModel.ts`) use only relative imports among themselves, so no import path changes are needed beyond the registry lazy-import path.

### Code: move as-is
The prototype is complete enough to ship unchanged. Refactoring before the move adds risk with no user-visible benefit. Cleanup can happen in a follow-on change.

### Spec retirement
`openspec/specs/games-grid-rendering-prototype/spec.md` describes the prototype-system integration (picking, routing via `/game/prototypes/grid-rendering`). Those requirements no longer apply once the entry is removed from the prototype registry. The directory is deleted as part of this change's tasks rather than left as a stale spec.

## Risks / Trade-offs

- [File move breaks lazy import path] → The games `registry.ts` lazy import must point to the new path `./dungeon-tactics-solo/GridRenderingGame`. The prototype `registry.ts` entry is removed. Both changes happen in the same tasks step.
- [Name collision confusion] → Users may see both "Dungeon Tactics" (solo) and a future multiplayer variant on the games home. The category field (`single-player`) distinguishes them; no further UI change needed.
