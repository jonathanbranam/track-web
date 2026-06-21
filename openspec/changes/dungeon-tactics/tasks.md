## 1. Database

- [ ] 1.1 Add migration in `src/db.ts` creating `game_rooms` table (room_code, game_slug, host_user_id, status, desired_players, current_turn_user_id, custom_details, started_at, created_at)
- [ ] 1.2 Add migration creating `game_room_players` table (room_id, user_id, join_order, joined_at) with UNIQUE(room_id, user_id)
- [ ] 1.3 Add `game_rooms` and `game_room_players` to `TABLE_NAMES` in `src/db.ts` in parent-before-child order

## 2. Backend — Repository

- [ ] 2.1 Add `IGameRoomRepository` interface to `src/repositories/interfaces.ts` (methods: createRoom, listRooms, getRoom, addPlayer, setStatus, setStarted)
- [ ] 2.2 Implement `SqliteGameRoomRepository` in `src/repositories/sqlite/gameRooms.ts` with all interface methods
- [ ] 2.3 Add room code generation utility (6-char A–Z/2–9 excluding O/I, with collision retry loop)

## 3. Backend — Routes

- [ ] 3.1 Create `src/routes/games.ts` with `createGamesRouter` factory; mount at `/api/games` in `src/app.ts`
- [ ] 3.2 Implement `POST /api/games/rooms` — create room, add host as player, return room record
- [ ] 3.3 Implement `GET /api/games/rooms?slug=` — list waiting + active rooms with players, ordered by created_at DESC
- [ ] 3.4 Implement `GET /api/games/rooms/:code` — single room detail
- [ ] 3.5 Implement `POST /api/games/rooms/:code/join` — join waiting room (400 if full, already joined, or non-waiting)
- [ ] 3.6 Implement `POST /api/games/rooms/:code/start` — host only, ≥2 players required, sets status=active + started_at
- [ ] 3.7 Implement `POST /api/games/rooms/:code/cancel` — host only, waiting rooms only, sets status=canceled
- [ ] 3.8 Implement `POST /api/games/rooms/:code/end` — participant only, active rooms only, sets status=finished
- [ ] 3.9 All routes: require auth middleware, return 401 for unauthenticated requests

## 4. Backend — Admin CLI

- [ ] 4.1 Add `admin games list-rooms --slug <slug> [--status <s>] [--json]` subcommand in `src/routes/admin/`
- [ ] 4.2 Add `admin games create-room --slug <slug> --user <email> --players <n> [--json]`
- [ ] 4.3 Add `admin games cancel-room --code <code> [--json]`
- [ ] 4.4 Add `admin games end-room --code <code> [--json]`
- [ ] 4.5 Add `admin games list-players --code <code> [--json]`

## 5. Frontend — Game Registry

- [ ] 5.1 Add `lobbySlug?: string` and `minPlayers?: number` optional fields to `GameEntry` type in `registry.ts`
- [ ] 5.2 Add Dungeon Tactics entry: `{ slug: 'dungeon-tactics', name: 'Dungeon Tactics', description: '...', category: 'multiplayer', lobbySlug: 'dungeon-tactics', minPlayers: 2 }`
- [ ] 5.3 Update `HomePage.tsx` catalog card click handler: if `game.lobbySlug` is set, navigate to `/game/:slug/lobby` instead of `/game/:slug`

## 6. Frontend — Lobby Page

- [ ] 6.1 Create `client-games/src/pages/LobbyPage.tsx` reading `slug` from route params; wire `GET /api/games/rooms?slug=<slug>`
- [ ] 6.2 Render waiting room cards: creator name, joined/desired players (e.g. "2 / 3"), elapsed wait time
- [ ] 6.3 Render active room cards: player list, elapsed play time, turn indicator when `currentTurnUserId` is non-null
- [ ] 6.4 Show "Join" button on waiting rooms for non-members; call `POST .../join` on click and refresh list
- [ ] 6.5 Show "Join Game" button on active rooms for members; navigate to `/game/:slug/room/:code`
- [ ] 6.6 Show "Cancel" button on waiting rooms for the host; call `POST .../cancel` on click and refresh list
- [ ] 6.7 Show "Start Game" button on waiting rooms for the host (enabled when ≥2 players); call `POST .../start`
- [ ] 6.8 Show "End Game" button on active rooms for participants; call `POST .../end` on click and refresh list
- [ ] 6.9 Show "New Game" button opening an inline form (desired player count); submit calls `POST /api/games/rooms`
- [ ] 6.10 Implement background polling: `setInterval` at ~15s, cleared on unmount
- [ ] 6.11 Add "Refresh" button: immediate re-fetch + reset poll interval

## 7. Frontend — Placeholder Game Room Page

- [ ] 7.1 Create `client-games/src/pages/GameRoomPage.tsx` reading `slug` and `code` from route params; fetch `GET /api/games/rooms/:code` and display room code, game slug, and player list
- [ ] 7.2 Add routes in `App.tsx`: `/game/:slug/lobby` → `LobbyPage`, `/game/:slug/room/:code` → `GameRoomPage`

## 8. API Documentation & Context

- [ ] 8.1 Add all 8 new routes to `openapi.yaml` with request/response schemas
- [ ] 8.2 Update `llm-context.md` to document the game-lobby feature area, room status lifecycle, and polling pattern

## 9. Build & Type Check

- [ ] 9.1 Run `npm run build:watch` (client-games) and confirm zero TypeScript errors
- [ ] 9.2 Run `npm run build:server` and confirm zero TypeScript errors
- [ ] 9.3 Run existing tests (`src/routes/auth.test.ts`, `entries.test.ts`, etc.) and confirm they pass
