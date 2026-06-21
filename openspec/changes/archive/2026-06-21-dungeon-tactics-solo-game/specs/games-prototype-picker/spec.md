**App**: games

## Purpose

Delta spec for the prototype picker and sub-registry: removes the `grid-rendering` entry now that the game has been promoted to a standalone entry.

## REMOVED Requirements

### Requirement: Grid rendering prototype entry
**Reason**: The grid-rendering prototype has been promoted to a standalone single-player game (`dungeon-tactics-solo`). It no longer belongs in the prototype sub-registry or under the `/game/prototypes/` route.
**Migration**: Access the game at `/game/dungeon-tactics-solo` instead of `/game/prototypes/grid-rendering`. The prototype registry entry and source directory under `prototypes/grid-rendering/` are deleted.
