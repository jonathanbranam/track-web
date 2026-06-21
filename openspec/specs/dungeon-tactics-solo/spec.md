**App**: games

## Purpose

Defines requirements for the Dungeon Tactics Solo game: a standalone single-player entry in the games registry backed by the grid-rendering implementation.

## Requirements

### Requirement: Dungeon Tactics Solo entry in games registry
The system SHALL include a `dungeon-tactics-solo` entry in `registry.ts` with name "Dungeon Tactics", description matching the game's turn-based tactical nature, and category `single-player`. The entry SHALL have a `mount` component pointing to the game component (no lobby, no `lobbySlug`). The entry SHALL appear before the `prototypes` entry in the `games` array.

#### Scenario: Dungeon Tactics Solo appears on the games home page
- **WHEN** a user opens the games home page at `/`
- **THEN** a card for "Dungeon Tactics" with category `single-player` is listed and tappable

#### Scenario: Tapping the card navigates directly into the game
- **WHEN** a user taps the Dungeon Tactics card
- **THEN** the app navigates to `/game/dungeon-tactics-solo` and the game component mounts without a lobby

#### Scenario: Game component mounts with standard chrome
- **WHEN** a user navigates to `/game/dungeon-tactics-solo`
- **THEN** the game page renders with the standard back link ("← Games" to `/`) and the game title in the header

### Requirement: Game source at dungeon-tactics-solo directory
The system SHALL locate the Dungeon Tactics Solo source files at `client-games/src/games/dungeon-tactics-solo/`. The component, scene, and model files (`GridRenderingGame.tsx`, `GridScene.ts`, `GridModel.ts`) reside in this directory.

#### Scenario: Build succeeds after directory move
- **WHEN** the source files are at the new path and the registry lazy-import is updated
- **THEN** `npm run build` completes without errors

#### Scenario: Game functions identically after move
- **WHEN** a user plays the game at `/game/dungeon-tactics-solo`
- **THEN** all gameplay (grid rendering, move/attack planning, PC playback, NPC playback, round reset) behaves identically to the former prototype
