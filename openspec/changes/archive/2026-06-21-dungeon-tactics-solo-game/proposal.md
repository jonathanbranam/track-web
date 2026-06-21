## Why

The "grid-rendering" prototype has evolved into a complete single-player game experience and should live alongside the other games rather than buried in a prototype sub-menu. Promoting it to a proper game makes it discoverable and removes the need for the prototype scaffolding.

## What Changes

- Add a `dungeon-tactics-solo` entry in the games registry (single-player, direct mount, no lobby)
- Move the prototype code from `client-games/src/games/prototypes/grid-rendering/` to `client-games/src/games/dungeon-tactics-solo/` — no logic changes, rename only
- Remove the `grid-rendering` entry from the prototype sub-registry
- Replace the `games-grid-rendering-prototype` spec with a new `dungeon-tactics-solo` spec
- Retire (delete) the `games-grid-rendering-prototype` spec once superseded

## Capabilities

### New Capabilities

- `dungeon-tactics-solo`: Standalone single-player game entry in the games registry backed by the current grid-rendering prototype code, navigable from the games home page without a lobby.

### Modified Capabilities

- `games-prototype-picker`: The `grid-rendering` entry is removed from the prototype sub-registry; the remaining entries (tilt-tester, ball-merge-physics) are unchanged.

## Impact

- `client-games/src/games/registry.ts` — new `dungeon-tactics-solo` entry added
- `client-games/src/games/prototypes/registry.ts` — `grid-rendering` entry removed
- `client-games/src/games/prototypes/grid-rendering/` — directory moved to `client-games/src/games/dungeon-tactics-solo/`
- `openspec/specs/games-grid-rendering-prototype/` — spec retired (directory deleted)
- No backend changes; no new routes (existing `/game/:slug` routing handles the new slug)
