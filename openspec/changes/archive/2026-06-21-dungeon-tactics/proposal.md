## Why

Adds the generic multiplayer lobby infrastructure to games.branam.us — the foundation needed before any turn-based multiplayer game can ship. "Dungeon Tactics" is registered as the first game entry in the catalog to give the lobby something concrete to target, but **the game itself (grid, units, AI, Phaser scene) is out of scope for this change**. This change ends when a player can create a game, invite friends, start it, and see it listed as running — nothing more.

## What Changes

- **Out of scope for this change**: game board, tile grid, unit movement, combat, AI, Phaser 3 scene, any in-game UI. Those belong to a follow-on `dungeon-tactics-game` change.
- New **game-lobby** capability: authenticated users can view open and in-progress games for any game slug, create a new game (choosing player count), join an open game, cancel a waiting game they created, and start a full game. Background polling detects newly created games; a manual refresh button is also available.
- Waiting games (not yet started) display: creator, desired player count, joined players, time since created. Creator can cancel; others can join.
- Running games display: all players, time elapsed since start. Turn-based games also show whose turn it is. Players who have joined a running game see a "Join Game" button to enter the game view (placeholder screen in this change) or take their turn.
- "End Game" action available on any running game you are part of (ends the game regardless of state — useful for cleanup during development and for abandoning stuck games).
- New Dungeon Tactics entry in the client-games catalog, linking to its lobby. No game logic or Phaser scene yet.
- New backend routes and DB tables for lobby/room management — generic and shared across all future multiplayer games.

## Capabilities

### New Capabilities

- `game-lobby`: Generic lobby shared by all multiplayer games. Displays open (waiting) and in-progress rooms for a given game slug. Supports: create game (desired player count, `custom_details` JSON for game-specific display), join open game, cancel waiting game (creator only), start game (creator, once minimum players joined), end running game (any participant). Running game cards show elapsed time, player list, and current turn holder (for turn-based games). Includes background polling (≈15s interval) and a manual refresh button. Tapping "Join Game" on a running game you have joined navigates to the game view (a placeholder in this change).

### Modified Capabilities

_(none — all multiplayer infrastructure is new)_

## Impact

- **Backend**: New routes: `POST /api/games/rooms` (create), `GET /api/games/rooms?slug=` (list), `POST /api/games/rooms/:code/join` (join), `POST /api/games/rooms/:code/start` (start), `POST /api/games/rooms/:code/end` (end/cancel). New DB tables: `game_rooms` (room code, game slug, host user ID, status `waiting|active|finished|canceled`, desired player count, `custom_details` JSON, `current_turn_user_id`, `started_at`, `created_at`) and `game_room_players` (room FK, user FK, join order). Migrations added to `db.ts`.
- **client-games**: New `LobbyPage` (generic, parameterized by game slug). Dungeon Tactics catalog entry routes to its lobby. No Phaser dependency yet — Phaser is deferred to the game implementation change.
- **Infra**: No new subdomains or DNS changes. `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh` updated only if new client-games build steps are needed.
- **Auth**: All lobby and room routes require existing cookie session auth. `current_turn_user_id` is set by the backend; clients read it from the room state to display whose turn it is.
- **Polling**: Client polls `GET /api/games/rooms?slug=<slug>` on an interval (≈15s) while the lobby page is open; manual refresh triggers the same fetch immediately.
