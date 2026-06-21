## Context

`client-games` is an existing React 19 + Vite workspace with a game registry (`registry.ts`) and a catalog home page. Games are listed as `GameEntry` objects with a `slug`, `name`, `description`, `category`, and a lazily-loaded `mount` component. Single-player games (Ball Merge) navigate directly to the game component. There is no existing multiplayer infrastructure — no rooms, no turn tracking, no polling.

The backend (`src/`) is a Hono + SQLite monorepo. New routes follow the pattern: a `create*Router` factory in `src/routes/`, registered in `src/app.ts`. Data access goes through repository interfaces in `src/repositories/interfaces.ts` with SQLite implementations in `src/repositories/sqlite/`. Migrations live inline in `src/db.ts` and `TABLE_NAMES` must stay in sync.

This change builds only the lobby layer. No game logic, no Phaser scene, no move submission.

## Goals / Non-Goals

**Goals:**
- Generic `game-lobby` capability reusable across any future multiplayer game
- Create a game room (desired player count, optional `custom_details` JSON)
- Join an open (waiting) room
- Cancel a waiting room (creator only)
- Start a full room (creator only, once min players joined)
- End a running game (any participant)
- Lobby list view: waiting rooms + active rooms for a given slug, polled every ~15s with a manual refresh button
- Room cards: waiting shows creator, player slots, elapsed wait time; active shows player list, elapsed play time, whose turn it is
- "Join Game" button on active rooms navigates to a placeholder game page (`/game/:slug/room/:code`)
- Dungeon Tactics registered in the catalog; navigates to its lobby instead of a game component
- Admin CLI commands for all room operations, all supporting `--json`

**Non-Goals:**
- Game logic, move validation, AI, or Phaser rendering (deferred to `dungeon-tactics-game` change)
- `current_turn_user_id` is stored and surfaced in the API/UI, but is only set by game logic — lobby sets it to `null` on start; the game implementation will update it
- Real-time push (WebSocket, SSE) — REST polling is the entire model
- Matchmaking or stranger-facing discovery — share-the-link only
- Spectator mode
- Notifications ("your turn") — deferred

## Decisions

### D1: `game_rooms` and `game_room_players` as shared infrastructure tables

Two new tables, game-slug-agnostic. Any future multiplayer game reuses the same routes and tables by passing its slug.

`game_rooms`:
```sql
id                INTEGER PRIMARY KEY AUTOINCREMENT
room_code         TEXT NOT NULL UNIQUE          -- short shareable code, e.g. "X7K2PQ"
game_slug         TEXT NOT NULL                 -- e.g. "dungeon-tactics"
host_user_id      INTEGER NOT NULL REFERENCES users(id)
status            TEXT NOT NULL DEFAULT 'waiting'  -- 'waiting'|'active'|'finished'|'canceled'
desired_players   INTEGER NOT NULL
current_turn_user_id  INTEGER REFERENCES users(id) -- null until game logic sets it
custom_details    TEXT                          -- JSON; game-specific display data; nullable
started_at        TEXT                          -- ISO 8601 UTC; null until started
created_at        TEXT NOT NULL DEFAULT (datetime('now'))
```

`game_room_players`:
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
room_id     INTEGER NOT NULL REFERENCES game_rooms(id)
user_id     INTEGER NOT NULL REFERENCES users(id)
join_order  INTEGER NOT NULL                   -- 1-based; host is 1
joined_at   TEXT NOT NULL DEFAULT (datetime('now'))
UNIQUE(room_id, user_id)
```

Both tables added to `TABLE_NAMES` in `db.ts`.

*Considered: storing players as a JSON array in `game_rooms`.* Rejected — a join table makes player queries and uniqueness constraints trivial without JSON parsing.

### D2: Room code generation

6-character alphanumeric code (uppercase A-Z, 0-9, excluding O/0/I/1 for readability). Generated server-side on create with a collision retry loop (probability negligible at low scale). Codes are the URL-safe identifier for rooms in all routes.

*Considered: integer IDs in URLs.* Rejected — room codes are more shareable and less enumerable.

### D3: Route shape

All under `/api/games/rooms`:

```
POST   /api/games/rooms                      create room (body: { gameSlug, desiredPlayers, customDetails? })
GET    /api/games/rooms?slug=<slug>          list waiting + active rooms for a slug
GET    /api/games/rooms/:code                single room detail (players, status, turn)
POST   /api/games/rooms/:code/join           join room (must be waiting, not already joined, not full)
POST   /api/games/rooms/:code/start          start game (host only, min 1 other player joined)
POST   /api/games/rooms/:code/cancel         cancel waiting room (host only)
POST   /api/games/rooms/:code/end            end active game (any participant)
```

All routes require authentication. `/api/games/rooms` registered as a new router in `app.ts`. Repository interface `IGameRoomRepository` with a SQLite implementation.

*Considered: game-slug prefix in URL (`/api/games/dungeon-tactics/rooms`).* Rejected — the lobby is generic; the slug is a filter parameter, not a routing segment.

### D4: Polling model on the client

`LobbyPage` runs a `useEffect` with `setInterval` at a 15-second interval to re-fetch `GET /api/games/rooms?slug=<slug>`. The interval clears on unmount. A "Refresh" button triggers the same fetch immediately and resets the interval timer. This is the same REST-polling pattern used for game state (per `docs/games/design.md`).

### D5: Multiplayer game entries in the registry

`GameEntry` gains two optional fields:

```ts
lobbySlug?: string          // if set, catalog card links to /game/:slug/lobby instead of mounting
minPlayers?: number         // displayed in lobby UI; defaults to 2
```

Single-player games are unaffected. Dungeon Tactics sets `lobbySlug: 'dungeon-tactics'` and `mount` remains `undefined` for now (the "Join Game" placeholder page is a simple React component, not a Phaser scene).

*Considered: a separate `multiplayer` registry.* Rejected — single registry keeps the catalog simple; the flag is enough.

### D6: Client routing

New routes added to `App.tsx`:

```
/game/:slug/lobby           LobbyPage (generic, reads slug from params)
/game/:slug/room/:code      GameRoomPage (placeholder "game in progress" screen)
```

`GamePage` (existing single-player mount) remains at `/game/:slug`. Multiplayer catalog cards navigate to `/game/:slug/lobby` instead.

### D7: Admin CLI

New subcommand group `admin games` under `src/routes/admin/`:

```
admin games list-rooms --slug <slug> [--status waiting|active|finished|canceled] [--json]
admin games create-room --slug <slug> --user <email> --players <n> [--json]
admin games cancel-room --code <code> [--json]
admin games end-room --code <code> [--json]
admin games list-players --code <code> [--json]
```

All data-returning commands support `--json`.

## Risks / Trade-offs

- **SQLite concurrent writes**: WAL mode is already enabled. At single-user / small-group scale, concurrent room joins are unlikely to conflict; if they do, the retry at the application layer (check-then-insert inside a transaction) handles it cleanly.
- **Stale lobby list**: 15-second polling means a new game created by someone else may not appear immediately. Manual refresh is the escape valve; this is acceptable for the share-the-link use case.
- **`current_turn_user_id` is always `null` in this change**: The UI will render "—" or hide the turn indicator when null. The game implementation change will set and update it via move submission. No special handling needed now.
- **Placeholder "Join Game" screen**: Players who click Join on a running game will see an empty/stub page. This is intentional — documenting it as a known gap avoids confusion during review.
- **Room code collisions**: At low scale, negligible. If volume ever grows, add a unique index (already present) and the retry loop handles it.

## Migration Plan

1. Add migration in `db.ts` creating `game_rooms` and `game_room_players`; add both to `TABLE_NAMES`.
2. Add `IGameRoomRepository` interface and SQLite implementation.
3. Add `/api/games/rooms` route file and register in `app.ts`.
4. Add admin CLI subcommands.
5. Extend `GameEntry` type; add Dungeon Tactics entry to registry.
6. Add `LobbyPage`, `GameRoomPage` (placeholder), and new routes in `App.tsx`.
7. Update `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh` if any client-games build steps changed.
8. Update `openapi.yaml` with new routes.
9. Update `llm-context.md` with new feature area.

No rollback complexity — new tables and routes are additive. Dropping the tables is the rollback.

## Open Questions

- **`custom_details` schema for Dungeon Tactics**: Undefined in this change by design. The game implementation change will define what goes in this JSON column (e.g., difficulty, dungeon map seed, number of floors). The lobby just stores and displays it as opaque JSON.
- **Minimum players to start**: Currently hardcoded to "at least 1 other player joined" (i.e., ≥ 2 total). Should Dungeon Tactics support solo play (1 player)? Defer to the game change.
- **Finished vs. canceled room visibility**: Should finished/canceled rooms appear in the lobby list? Currently the `GET /api/games/rooms?slug=` list returns only `waiting` and `active`. A separate history view is not in scope but worth flagging.
