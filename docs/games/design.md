# Games App — Design

## Concept

`games.branam.us` is a platform for casual, **asynchronous turn-based strategy games** — visual, grid-based, and designed for small groups of friends. Think Polytopia (light 4X on a hex map) or Final Fantasy Tactics (tactical squad combat on a tile grid). Games are not real-time; a player takes their full turn — moving units, attacking, building — then ends it. The opponent sees the result when they next open the game.

The platform is built for rapid iteration: ship an MVP game quickly (rough map, basic units, working win condition), then polish. Shared infrastructure (auth, rooms, lobbying, turn management, polling) is built once; each game is a tilemap + unit rules + a Phaser scene.

---

## Design Principles

- **Async by design.** A turn can sit for hours. No real-time requirement — REST + polling is the entire multiplayer model. This also means a player can think carefully before acting.
- **Visual first.** The game canvas is the primary interface. Phaser 3 handles tile rendering, unit sprites, selection, and animation. React wraps it for HUD, menus, and lobby.
- **Flat grid for MVP, isometric later.** Top-down square tiles ship fast. Isometric (FF Tactics perspective) is a visual upgrade, not a prerequisite.
- **Rapid game scaffolding.** A new game = a tilemap definition + unit ruleset + a Phaser Scene. Room management, turn model, and polling are shared.
- **Small groups, existing auth.** 2–4 players per game, all logged in with branam.us accounts. No matchmaking, no strangers — share the link.
- **Mobile-aware but desktop-first.** Strategy games with a tile grid work better with a larger screen. Mobile is a good spectator and notification surface; desktop is where you play.

---

## Tech Approach

### Renderer: Phaser 3 (primary) + React (shell)

| Layer | Technology | Responsibility |
|-------|-----------|----------------|
| **Game canvas** | **Phaser 3** | Tilemap, unit sprites, selection highlight, move range, animations, camera pan/zoom |
| **HUD overlays** | React | Health bars, unit info panel, action menu, turn indicator, end-turn button |
| **Lobby / room / results** | React | Everything outside the game canvas |

Phaser mounts on a `<div ref>` inside a React component. The two layers communicate via a shared event bus or a zustand/context store: React reads game state from the server and passes it to Phaser; Phaser fires action events (unit selected, tile clicked, attack confirmed) back to React, which sends the move to the API.

### Why Phaser 3

- First-class tilemap support (Tiled JSON format natively)
- Camera: drag, zoom, bounds clamping
- Input: pointer on tiles, keyboard shortcuts, touch
- Sprite sheet animations (unit idle, move, attack, death)
- Active community; good docs for exactly this use case
- v3 is stable and maintained

### Alternatives considered

- **PixiJS** — faster renderer, but no built-in tilemap or input handling; more assembly required
- **Pure React + CSS grid** — viable for tiny grids but breaks down at 20×20+ with animations
- **Three.js / Babylon.js** — overkill unless going 3D; adds significant complexity

### Frontend workspace

New `client-games/` workspace — React 19 + Vite + Tailwind + PWA. Dev port **6035**.

Phaser 3 and its type definitions are npm dependencies of this workspace only.

---

## Grid Architecture

### Coordinate system

Square grid, row-major: `{ col, row }` where `(0,0)` is top-left. Elevation is a separate integer per cell used for line-of-sight and visual layering (higher cells drawn on top of lower, important for isometric later).

```
Cell: { col, row, terrain, elevation, feature, unit? }
terrain: 'plains' | 'forest' | 'mountain' | 'water' | 'desert' | ...
feature: null | 'city' | 'ruin' | 'resource'
unit: null | UnitSnapshot
```

### Map format

Maps are stored as JSON (Tiled-compatible). Built-in maps are checked into `client-games/src/maps/`. Procedural generation is a planned option using simplex noise for terrain elevation + biome assignment.

Tiled's export format gives:
```json
{
  "width": 20, "height": 20, "tilewidth": 64, "tileheight": 64,
  "layers": [ { "name": "terrain", "data": [...] }, { "name": "features", "data": [...] } ],
  "tilesets": [{ "source": "tiles.tsj" }]
}
```

Phaser loads this with `this.make.tilemap({ key: 'map-forest-skirmish' })`.

### Camera

Phaser camera: drag to pan (pointer drag or WASD), scroll wheel to zoom. Camera bounds clamped to map edges. Unit selection centers the camera on the selected unit.

---

## Turn Model

**End-turn model:** A player takes any number of actions (move units, attack, build, research) during their turn. Each action is submitted to the server immediately and applied to game state — but the server keeps `active_player_id` pointing to the current player until they explicitly submit an "end-turn" move. The opponent's poll returns `{ yourTurn: false }` until then.

This means:
- Server state is always up-to-date (no client-side buffering)
- Opponent sees changes only after "End Turn" (clean semantic boundary)
- No undo — a move applied is permanent
- Easy to implement: `active_player_id` is just a column on `game_instances`

### Action types (examples, game-specific)

```
move-unit       { unitId, toCol, toRow }
attack          { unitId, targetId }
end-turn        {}
build           { col, row, buildingType }
research        { techKey }
found-city      { unitId }
```

The server runs the game's `applyMove` function, validates legality, mutates the state JSON, increments `version`, and returns the new state.

### Initiative / unit turn order (FF Tactics style)

For tactical games where each unit acts individually (not "all your units, then all mine"):

- Add `initiative` or `speed` stat to units
- Maintain a `turnQueue: UnitId[]` in game state — sorted by speed, rebuilt each round
- Active actor = `turnQueue[0]`; after acting, unit moves to back of queue (or is re-sorted by a countdown timer value)
- `active_player_id` is derived from whose unit is at the front of the queue

This is still REST-friendly: whoever controls the active unit submits the next move.

---

## Data Model

Same shared tables as the original design, with richer `state` JSON:

**`game_rooms`** — room code, host, game slug, state (waiting/active/finished)

**`game_room_players`** — player roster per room

**`game_instances`** — one row per game play; key columns:
```sql
state           TEXT NOT NULL  -- full game state as JSON (map + units + resources + tech)
version         INTEGER        -- incremented on every move
active_player_id INTEGER       -- whose turn it is (or whose unit is acting)
```

**`game_moves`** — append-only log; enables replay, audit, and debugging

### Game state JSON shape (sketch)

```json
{
  "turn": 4,
  "map": { "width": 20, "height": 20, "cells": [...] },
  "players": {
    "1": { "resources": { "gold": 12, "stars": 3 }, "tech": ["riding", "archery"] },
    "2": { "resources": { "gold": 8,  "stars": 2 }, "tech": ["climbing"] }
  },
  "units": [
    { "id": "u1", "ownerId": 1, "type": "warrior", "col": 4, "row": 3,
      "hp": 8, "maxHp": 10, "actionsLeft": 1, "movesLeft": 2 }
  ],
  "cities": [
    { "id": "c1", "ownerId": 1, "col": 5, "row": 5, "level": 2, "population": 4 }
  ],
  "turnQueue": ["u3", "u1", "u2"],
  "phase": "action",
  "winner": null
}
```

Fog of war: the server strips enemy unit positions from cells outside the requesting player's vision range before returning state.

---

## REST + Polling

```
POST   /api/games/rooms              — create room
GET    /api/games/rooms/:code        — room info + player list
POST   /api/games/rooms/:code/join   — join room
POST   /api/games/rooms/:code/start  — host starts game

GET    /api/games/instances/:id/state?since=<version>
       — returns state when version > since; long-polls up to 8s otherwise
POST   /api/games/instances/:id/move — submit action; returns updated state
```

Client polls when it's not the active player's turn. On "End Turn" the active flag shifts and the opponent's next poll fires immediately.

---

## Game Registration

```ts
interface GameDefinition {
  slug: string
  name: string
  minPlayers: number
  maxPlayers: number
  mapKey: string          // Tiled map asset key, or 'procedural'

  // Server-side
  initialState(players: PlayerSlot[], mapData: TiledMap): GameState
  applyMove(state: GameState, move: Move, playerId: number): GameState | MoveError
  visibleState(state: GameState, playerId: number): GameState  // strips fog of war
  isFinished(state: GameState): boolean
  winners(state: GameState): number[]

  // Client-side
  scene: typeof Phaser.Scene     // the Phaser Scene class for this game
  hudComponent: React.ComponentType<HudProps>
}
```

---

## Candidate Games (Build Order)

### 1. Mini Tactics *(first build target)*

FF Tactics–inspired squad combat. 2 players, 8×8 grid, 4–5 units per side. No base-building or tech tree — pure tactical combat.

**Units:** Warrior (melee, 2-tile move), Archer (ranged 2, 1-tile move), Mage (AOE, low HP), Healer (restores HP, no attack).

**Rules:**
- Initiative queue: units act in speed order (fastest first)
- Each unit: move up to its MOV range, then optionally attack in RNG range
- Attacks deal ATK - DEF damage; defeated unit is removed
- Win: eliminate all enemy units, or capture the enemy base tile

**State:** unit positions, HP, actions-remaining, initiative queue, turn count.

**Renderer:** Phaser top-down square grid, 64×64 tiles, sprite sheet per unit type.

---

### 2. Mini Conquest *(Polytopia-lite)*

2–4 players, 16×16 procedurally generated map. Light 4X: expand, build, research, fight.

**Resources:** Stars (income from cities each turn). Spend stars to build units, research tech, grow cities.

**Tech tree (3 levels deep):** e.g. Riding → Chivalry, Climbing → Mountaineering, Fishing → Whaling.

**Win condition:** Score-based after N turns, or last player with cities standing.

**Renderer:** Phaser hex or square grid. Cities display level. Unit types differ visually.

---

### 3. Dungeon Crawl *(co-op variant)*

1–3 players navigate a hand-crafted dungeon tile by tile, fighting monsters controlled by a simple server-side AI. One player acts, then monsters act (server resolves), then next player. Win: reach the exit.

Useful for testing the initiative queue model without PvP complexity.

---

## Open Questions

- **Isometric rendering.** Flat top-down is MVP. Phaser's `IsometricPlugin` (or manual depth-sorting by row+col) enables the FF Tactics perspective. The tileset art changes; the game logic doesn't. Target this after first game ships.
- **Procedural map generation.** Simplex noise → terrain height → biome assignment is ~100 lines and makes every game different. Worth adding early for Mini Conquest.
- **Fog of war.** Server strips invisible cells. The client's Phaser scene renders an overlay on unexplored tiles. Needs a per-player `explored` bitmask stored in game state.
- **Animations.** Move tweens and attack flash can be done entirely in Phaser without touching the state model. The scene interpolates between known states on each poll response.
- **Spectator mode.** All players' fog-of-war stripped — show the full map. Cheap with the polling model.
- **Mobile.** Pinch-to-zoom + tap-to-select work in Phaser with pointer input. The HUD needs a compact layout. A notification ("your turn") needs a push or PWA badge — same deferred problem as the play app's timers.
