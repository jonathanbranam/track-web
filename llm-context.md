# track-web — LLM Agent Context

## What This Is

A self-hosted, single-user personal tracking suite. One backend (Hono + SQLite) serves several apps under the `branam.us` domain:

- **time** (`time.branam.us`) — time tracking: start/stop tasks with tags, review daily logs
- **watch** (`watch.branam.us`) — movie and TV tracking: watchlists, ratings, watch events with friends
- **trips** (`trips.branam.us`) — family trip log: current trip with Overview, Days, Info, and Packing tabs; departure/return notes, per-day plans, trip info, and structured packing list rendered as markdown or read-only UI
- **games** (`games.branam.us`) — casual games platform (`client-games`, dev port 6035): Phaser 3 + React, a client-side game registry catalog; first game is **Ball Merge**, a single-player physics ball-merging game with a server-side leaderboard. Ball Merge has 8 selectable container shapes (levels): `box`, `bowl`, `vase`, `cauldron`, `test-tube`, `diamond`, `hex`, `pit` — the player picks one via a pre-game level picker. Scores are stored in `game_scores(id, user_id, game_slug, mode, level, score, achieved_at)` and the `level` field reflects the player-selected container shape (not always `'box'`). Each level has its own independent leaderboard. API: `POST /api/scores` (submit score), `GET /api/scores/leaderboard?game=&mode=&level=&limit=` (top-N personal bests). Admin CLI: `scores:list`, `scores:clear --confirm`. No local score storage — the server leaderboard is authoritative.
- **admin** (`admin.branam.us`) — admin console (`client-admin`, dev port 6040), **restricted to user 1**: trigger deploys, run/restore database backups (scheduled `exports/backup/` + timestamped), manage users and API tokens, and view server logs. API under `/api/admin/*` (guarded by `requireAdmin`). The deploy trigger formerly in the time app was moved here.
- **home** (`home.branam.us`) — app directory (`client-home`, dev port 6050), accessible to **any authenticated user**: a card grid linking to all branam.us apps. Admin and Proto cards shown only to userId 1. Food card shown as "Coming soon". No new backend endpoints — uses existing `GET /api/auth/me`.
- **me** (`me.branam.us`) — personal hub (`client-me`, dev port 6045), accessible to **any authenticated user**: change display name, change password, and manage social graph (connections, groups, invite codes). Self-admin API under `/api/users/me/*`; social API under `/api/social/*`. The People tab formerly in the watch and food apps was moved here.
- **talks** (`talks.branam.us`) — public talks/presentations microsite (`client-talks`, dev port 6055), **no authentication**: a landing page listing talks as cards (title + description) linking to per-talk pages. Standalone light visual design (not the dark app shell); not a PWA. Talk content is defined in-app (`src/talks.ts`); no backend endpoints. Talk pages currently render a placeholder body pending a chosen content format.
- **proto** (`proto.branam.us`) — prototype/experimental app

All apps share one backend and one SQLite database. There is one user account.

## Authentication

Two auth methods are accepted by most protected endpoints:

**Session cookie** — obtained by `POST /api/auth/login` with `{ email, password }`. Sets a `sid` cookie (HttpOnly, 30-day max-age) carrying a high-entropy opaque token. Login inserts a row in the server-side `sessions` table (allowlist, mirroring `api_tokens`) storing the token's SHA-256 hash, `user_id`, an `expires_at` 30 days out, and the request `user_agent` (display-only, never used for auth). On every request the server hashes the cookie token and looks up a live, unexpired row. Sessions survive server restarts. Logout (`POST /api/auth/logout`) deletes **only the current session's row** — other devices stay logged in. Password changes (admin API/CLI) delete **all** of the user's session rows, invalidating every device. Use this for browser-based access.

**Bearer token** — long-lived API tokens created via `POST /api/auth/tokens` (session required to create). Pass as `Authorization: Bearer <token>` header. Tokens have a label and an expiry (1–180 days). Use this for programmatic/agent access.

**Session-only endpoints** — token management (`/api/auth/tokens`) and the manual deploy trigger (`/api/deploy/trigger`) accept session cookies only; bearer tokens are rejected.

**Unauthenticated endpoints** — `POST /api/auth/login`, `POST /api/auth/forgot`, `GET /api/openapi.json`, `GET /api/llm-context.md`, `GET /api/version`, the GitHub deploy webhook (`POST /api/deploy`), and the invite claim endpoints (`GET /api/invites/:token`, `POST /api/invites/:token/claim`).

To authenticate as an agent: call `GET /api/auth/me` to check if you have a valid session or token. If 401, you need credentials. On success it returns `{ userId, displayName, email }`.

## Shared Client Packages

### `@repo/auth`
Provides auth primitives used by all frontend clients: `AuthProvider`, `useAuth`, `AuthGuard`, `LoginPage`, `LogoutPage`, `BetaPage`, `authApi`, and `UserChip`.

**`useAuth()`** returns `{ userId, email, displayName, loading, logout, setUserId }`. `email` and `displayName` are populated from the `/api/auth/me` response on mount and cleared to `null` on logout.

**`UserChip`** — a fixed-position circular initials button rendered in the upper-right corner of each app shell (`position: fixed; top: calc(var(--sat) + 6px); right: 12px; z-index: 50`). Tapping it opens a bottom drawer showing `displayName`, `email`, user ID, a link to `me.branam.us`, and a logout button (with confirmation). Accepts a `hidden?: boolean` prop — pass `true` on routes where the chip would obstruct content (e.g. in-game views, catalog pages). Returns `null` when `userId` is `null` or `hidden` is `true`. Rendered in all client apps except `client-me` (which has an inline logout button on its Account page instead).

## Key Conventions

- **Timestamps** — always ISO 8601 UTC (e.g. `2025-06-01T14:30:00.000Z`). Display layer converts to US/Eastern.
- **"Today" boundary** — 4 AM ET to 4 AM ET the next day, not midnight.
- **Tags** — accept `#tag` or `:tag` prefix in descriptions. Stored as bare lowercase words, comma-separated (e.g. `work,deep-focus`). Hyphens allowed.
- **Running entry** — at most one time entry can be running (no `endedAt`) at a time. Stop it by PATCHing `endedAt` before starting a new one.

## Feature Areas

### Time Tracking (`/api/time/entries`)
CRUD for time entries. Each entry has a `description`, `startedAt`, optional `endedAt`, and parsed `tags`. `GET /api/time/entries/running` returns the active entry (or null). `GET /api/time/entries?date=YYYY-MM-DD` returns completed entries for a day.

### Trips (`/api/trips`)
A trip has a name, optional destination, departure/return notes, night/day counts, optional `startDate` / `endDate` (YYYY-MM-DD), optional `infoMarkdown`, and optional `researchMarkdown` (long-form research rendered on the Research tab with a generated table of contents). One trip can be marked "current" via `PUT /api/trips/:id/set-current`. `GET /api/trips/current` returns it (404 if none set). All trip fields are nullable except `name`; `startDate` and `endDate` drive Days-tab day-record generation.

**Access model:** trips use membership-based authorization via the `trip_members` table. Creating a trip auto-inserts the creator as `owner`. All `/api/trips/:id` routes require the authenticated user to be a member (403 otherwise; 404 if the trip doesn't exist). Mutation routes (`PUT`, `DELETE`, set-current) additionally require `role = 'owner'`. `GET /api/trips` and `GET /api/trips/current` filter by membership — users only see trips they are members of.

**Member management:** `GET/POST /api/trips/:id/members` and `DELETE /api/trips/:id/members/:userId` — list, add (`role=member`), and remove members. All require membership; POST and DELETE require owner role. POST returns 409 on duplicate, 404 if the userId doesn't exist. DELETE returns 400 if the owner tries to remove themselves. Use the `trips:members:*` admin CLI commands for scripted management.

**Trip days:** The `trip_days` table stores one record per calendar date between a trip's `startDate` and `endDate`. Records are auto-generated (via `INSERT OR IGNORE`) whenever a trip is created or updated with both dates set — existing rows are never deleted, so authored content survives date-range edits. Each day has a `date` (YYYY-MM-DD), `title` (defaults to `''`), `body` (markdown, defaults to `''`), and optional `weather` (freeform text).
- `GET /api/trips/:id/days` → `{ days: TripDay[] }` ordered by date ASC; requires membership
- `PUT /api/trips/:id/days/:date` body `{ title?, body?, weather? }` → updated `TripDay`; requires owner role; returns 400 if `:date` is not YYYY-MM-DD, 404 if no day record exists for that date
- CLI: `trips:days:list <tripId>` and `trips:days:update <tripId> <date>` with `--title`, `--body`, `--weather` flags (both support `--json`)

**Packing items:** The `packing_items` table stores structured checklist items per trip. Items have `section` (group heading, defaults to `''`), `text`, `position` (display order within section), and `user_id` (nullable — `NULL` = shared/visible to all; non-null = personal item visible only to that user and the owner). There is no in-app create/edit/delete UI — members use the API directly, and the owner uses the API or CLI.
- `GET /api/trips/:id/packing/items` → `{ items: PackingItem[] }` ordered by section ASC, position ASC; returns shared + requester's personal items (owner sees all items)
- `POST /api/trips/:id/packing/items` body `{ section?, text, position?, userId? }` → `{ item }` (201); requires membership; non-owners always create personal items (stored with their own userId); owner can pass `userId` to assign to a user, or omit for shared
- `PUT /api/trips/:id/packing/items/bulk` body `{ items: [{ section?, text, position?, userId? }] }` → atomically replaces all items; new IDs assigned; requires owner
- `PUT /api/trips/:id/packing/items/:itemId` body `{ section?, text?, position?, userId? }` → `{ item }`; requires owner; `userId` can be set/cleared to reassign; 404 if not found
- `DELETE /api/trips/:id/packing/items/:itemId` → 204; owner can delete any item; members can delete their own personal items (`user_id = requester.id`); 403 for shared or other members' personal items
- CLI: `trips:packing:list <tripId>`, `trips:packing:add <tripId> --text <text> [--user <userId>]`, `trips:packing:update <itemId> [--text] [--section] [--position] [--user <userId|0>]`, `trips:packing:bulk <tripId> --file <path>`, `trips:packing:delete <itemId>` (list and bulk support `--json`)

**Packing state:** Per-user checked state is stored in `packing_state` (`packing_item_id`, `user_id`, `checked`). Rows cascade-delete when items are deleted. Each user tracks their own checked state independently.
- `GET /api/trips/:id/packing/state` → `{ state: Record<itemId, boolean> }` for the authenticated user (absent keys are unchecked); requires membership
- `PUT /api/trips/:id/packing/state` body `{ itemId, checked }` → `{ ok: true }`; validates itemId belongs to the trip (404 if missing, 403 if wrong trip); requires membership
- `GET /api/trips/:id/packing/summary` → `{ members: [{ userId, checked, total }] }`; requires owner role; returns per-member completion counts
- CLI: `trips:packing:state:get <tripId> <userId>`, `trips:packing:state:set <tripId> <userId> <itemId> <true|false>`, `trips:packing:summary <tripId>` (state:get and summary support `--json`)

### Watch Tracking (`/api/watch/*`)
- **Movies** — searchable list with tags, streaming info, runtime, cast. Watchlist per user with state (`unseen` / `watched` / `would_watch_again`) and a rating (-2 to +2).
- **TV** — same structure; watchlist state adds `watching` and tracks current season/episode.
- **Tags** — shared genre/category tags used by both movies and TV.
- **Series** — ordered movie collections (e.g. a franchise).
- **Ratings** — `GET /api/watch/ratings` returns merged movie+TV ratings sorted by score.
- **External search/import** — `GET /api/watch/external/search?type=movie|tv&q=...` searches TMDB; `POST /api/watch/external/import` imports a result into the local database (requires `TMDB_API_KEY` env var).
- **Watch events** — collaborative watch sessions. Create an event with a title and scheduled date, invite connections (users or groups), nominate candidates (movies/TV), vote, select a winner, and complete the event. Completing triggers watchlist and rating updates for attendees.

### Game Lobby (`/api/games/rooms`)

Generic multiplayer lobby infrastructure shared by all multiplayer games. Rooms are identified by a 6-character alphanumeric code (uppercase A–Z excluding O/I, digits 2–9).

**Room lifecycle**: `waiting` → `active` → `finished` (or `waiting` → `canceled`). Only `waiting` and `active` rooms are returned by the list endpoint by default.

**Endpoints:**
- `POST /api/games/rooms` — create room `{ gameSlug, desiredPlayers, customDetails? }`; caller becomes host + first player
- `GET /api/games/rooms?slug=<slug>` — list waiting + active rooms for a slug, ordered by `created_at DESC`; each item includes `host` (id, displayName) and `players` (array with id, displayName, joinOrder)
- `GET /api/games/rooms/:code` — single room detail (same shape)
- `POST /api/games/rooms/:code/join` — join waiting room; 409 if full, already joined, or not waiting
- `POST /api/games/rooms/:code/start` — host only, ≥2 players, sets status=active + startedAt; 409 if < 2 players
- `POST /api/games/rooms/:code/cancel` — host only, waiting rooms only, sets status=canceled
- `POST /api/games/rooms/:code/end` — any participant, active rooms only, sets status=finished

**Admin CLI** (under `/api/admin/games/`):
- `GET /api/admin/games/rooms?slug=<slug>[&status=<status>]`
- `POST /api/admin/games/rooms` `{ slug, userEmail, players }`
- `POST /api/admin/games/rooms/:code/cancel`
- `POST /api/admin/games/rooms/:code/end`
- `GET /api/admin/games/rooms/:code/players`

**Polling pattern**: `LobbyPage` polls `GET /api/games/rooms?slug=<slug>` every 15 seconds while mounted; interval cleared on unmount. A "Refresh" button triggers immediate re-fetch + resets interval.

**`current_turn_user_id`**: Set to `null` on room start; game logic (in a future change) updates it to track whose turn it is. Lobby UI shows the display name when non-null.

**`custom_details`**: Opaque JSON stored per room; game-specific display data; `null` in this change.

**DB tables**: `game_rooms(id, room_code, game_slug, host_user_id, status, desired_players, current_turn_user_id, custom_details, started_at, created_at)` and `game_room_players(id, room_id, user_id, join_order, joined_at)` with `UNIQUE(room_id, user_id)`.

**Dungeon Tactics**: Registered in the client-games catalog with `lobbySlug: 'dungeon-tactics'` and `minPlayers: 2`. Catalog card navigates to `/game/dungeon-tactics/lobby`. No game logic or Phaser scene yet — that belongs to a follow-on `dungeon-tactics-game` change.

**Dungeon Tactics unit definitions (live-editable, scenario-based)**: Unit behavior for `dungeon-tactics-solo` is data-driven by per-archetype `UnitDef`s (maxHp, movement, attack targeting/propagation). The defs are persisted in SQLite, organized into named **scenarios** (a.k.a. **variants**) — `game_dt_variants(variant_id, name, is_default, created_at, updated_at)` (PK `variant_id`, exactly one default; the single-game DT tables carry no `game_slug`) and `game_dt_unit_defs(variant_id, archetype, def_json, updated_at)` (PK `(variant_id, archetype)`, one JSON-document row per archetype). (These were renamed from `game_scenarios` / `game_unit_defs`, dropping the redundant `game_slug` column, in migration `0034`; the `/scenarios` API surface is unchanged — the rename is DB-layer only.) On startup the backend seeds a `default` scenario from the bundled defaults (`src/games/dungeon-tactics/unitDefs.ts`, mirrored client-side in `client-games/.../unitDefs.ts`) if the game has no scenarios. A shared Zod schema (`unitDefSchema`) validates every write. **Play always loads the default scenario.** Endpoints (session auth, **no admin gate** — any logged-in user may edit): `GET /api/games/dungeon-tactics-solo/unit-defs` (default scenario's defs, the play path), `GET .../scenarios` (list), `GET .../scenarios/:scenario/unit-defs`, `POST .../scenarios` `{ name, copyFrom? }` (create, copying a source), bulk `PUT .../scenarios/:scenario/unit-defs` (Zod-validated, 400 on invalid; there is no single-archetype write endpoint — the bulk write upserts each archetype internally), and `PUT .../scenarios/:scenario/default` (set default). The client loads definitions once at game start into an in-memory def store (`defStore.ts`) the engine reads from. Which scenario plays is a **per-browser active selection** stored in `localStorage` (`dungeon-tactics:active-scenario`): the store prefers it, falling back to the server default, then to the bundled table on total fetch failure. Unit tuning happens **exclusively through the in-game Unit editor panel** (`ScenarioEditor.tsx`, shown to any logged-in user; the former in-HUD Admin mode and its in-popup steppers are removed — the unit info popup is permanently read-only). The panel has a scenario picker / "+ New" / "Set as default" / "Reload": **picking a scenario makes it active immediately** (swaps the store, remembered in localStorage; current HP reconciled by the max-HP delta, floored at 1) and the **Reset** button replays the match with the active scenario. **Editing applies live**: each field edit (numeric edits debounced ~250 ms, clamped to engine-valid ranges) mutates the in-memory store immediately — reconciling current HP by the max-HP delta (floored at 1) and re-planning only the affected NPC archetype's units so telegraphs stay honest — with no Save and no reload. **Save** is persist-only (bulk `PUT`); **Reload** hot-swaps the active scenario's persisted defs into the running match (diff + HP reconcile + NPC re-plan) and discards unsaved edits **without restarting** — restarting is Reset's job. "Set as default" controls only the canonical seed/fallback. The former session-only `statOverrides.ts` and the single-archetype persist path are removed.

**Dungeon Tactics board content (serialized Region → Map → Encounter)**: The board itself (terrain grid, tile objects, enemy/player spawn zones, wave manifest) is now persisted content, not hardcoded. Three single-game tables hold it — `game_dt_regions(region_id, name, theme, sort_order, def_json, …)`, `game_dt_maps(region_id, map_id, name, sort_order, def_json, …)`, `game_dt_encounters(map_id, encounter_id, name, sort_order, def_json, …)` — identity/ordering as columns, the shaped payload as a validated `def_json` blob (the `game_dt_unit_defs` pattern). A **Map** carries `size {cols,rows}` (variable 4×4–16×16, seed stays 16×8), a `terrain` grid, `objects` (`{col,row,kind,hp?}` — `hp` present = destructible structure, absent = inert), and `enemySpawnZone`/`playerSpawnZone` (`"col,row"` keys). There is **no `pcStartTiles`** — PC placement derives from `playerSpawnZone` (the four PCs seated on the first N zone tiles sorted by row, then col, in `npc.ts` `initialState`); `mapSchema` requires `playerSpawnZone.length` to exceed the party size (`PC_COUNT = 4`). An **Encounter** holds ordered `waves` (atomic start triggers `immediate`/`after-prev-cleared`/`after-turns`) plus `win`/`lose`/`achievements` condition lists (atomic only — composite `all-of`/`any-of` rejected). Server Zod schemas (`src/games/dungeon-tactics/map.ts`) are the write authority; on startup `contentRepo.seedDefaultIfEmpty(BUNDLED_MAP)` seeds one region/map/encounter — a faithful 1:1 port of the prior hardcoded board — without overwriting. Read endpoints (session auth): `GET /api/games/dungeon-tactics-solo/content/default` (the play tree), `.../content/regions`, `.../content/regions/:regionId` (region + maps), `.../content/maps/:mapId` (map + encounters). **Map writes** (session auth, no admin role; body validated by the shared `mapSchema` plus the region's terrain enum, so a malformed map never persists): `POST .../content/regions/:regionId/maps` (create — server mints a stable de-duplicated `map_id` and the next `sort_order`, returns the stored map), `PUT .../content/maps/:mapId` (wholesale content replace, id/region pinned), `DELETE .../content/maps/:mapId` (cascades to encounters; the last map in a region is kept → `409`). Region and encounter writes are not yet exposed. Admin CLI: `content:list-regions`, `content:show-map`, `content:show-encounter`, `content:seed`, `content:create-map`, `content:update-map`, `content:delete-map`. The client loads the default map once at game start into an in-memory **content store** (`contentStore.ts`, mirroring `defStore`) whose deserializer overlays objects onto the terrain grid and exposes spawn zones as `Set<string>`; the engine reads board/dimensions/objects/spawn zones only through it, falling back to the bundled `bundledMap.ts` on fetch failure. Content authoring lives in the Studio (below); the **map editor** now exists (it consumes the map-write endpoints above), while encounter editing remains a later change.

**Studio (design tools, `/studio`)**: A dedicated front-end design section in `client-games`, a sibling of the `/game/…` play namespace so the bottom nav stays visible (the nav is a two-tab bar — **Games → `/`** and **Studio → `/studio`** — hidden only in-game). Session auth, **no admin gate** (matches the in-game editor). Routes (all under `AuthGuard`): `/studio` (generic hub, lists studio-enabled games from the `STUDIO_GAMES` registry — Dungeon Tactics only for now), `/studio/dungeon-tactics` (DT hub, lists tools from `DT_STUDIO_TOOLS` with an `available | coming-soon` status — Unit Designer and Map editor both available), `/studio/dungeon-tactics/unit-designer` (the **Unit Designer**: the in-game `ScenarioEditor` relocated into a standalone page, editing the same unit defs / saving the same Variants through the **same** `defStore` + `/scenarios/:s/unit-defs` endpoints — no new backend, no new persistence), `/studio/dungeon-tactics/maps` (**map list** — opens, creates, deletes the region's maps; New builds a `blankMap` and `POST`s it then routes to its editor; Delete surfaces the last-map `409`), and `/studio/dungeon-tactics/maps/:mapId` (the **map editor**). The map editor is a deliberate **hybrid**: the board canvas is a **Phaser** `EditorScene` (a dumb renderer + input source — draws the given `ContentMap` and emits `onTilePointer({col,row}, isDrag)`, sharing terrain/structure rendering with the play scene via `boardRender.ts` so authored boards look like played ones), while every control is **ReactDOM** (`MapEditorHud`). React owns the authoritative `ContentMap`, active tool, and brush; each tile event runs a pure `applyTool` (in `editorModel.ts` — also `resizeMap`/`blankMap`/`validateMap`, all unit-tested without Phaser), pushes the next map to the scene, and `validateMap` (a client mirror of `mapSchema`) gates Save and flags offending tiles. Tools: terrain (region `terrainTypes`), object (`kind` + optional `hp`), enemy zone, player zone, erase, plus a numeric resize. Save `PUT`s through the write API (server is the authority) and reloads the stored map. The in-game `ScenarioEditor` panel stays as the live in-match tuning affordance. All studio HUD chrome is ReactDOM (upholding the `dungeon-tactics-react-hud` precedent). No API or DB change.

**Client routes**: `/game/:slug/lobby` → `LobbyPage`; `/game/:slug/room/:code` → `GameRoomPage` (placeholder showing room code, game slug, and player list).

### Social (`/api/social/*`)
Connect with other users via invite codes or connection requests (requires a shared group). Organize connections into groups. Groups are used to invite users to watch events. The UI for social management lives at `me.branam.us/people` (not in the watch or food apps).

### User Self-Admin (`/api/users/me/*`)
Any authenticated user can update their own display name (`PUT /api/users/me/display-name`) or change their password (`PUT /api/users/me/password`). Password change deletes all of the user's `sessions` rows, invalidating every active session (including the current one). UI at `me.branam.us/account`.

### User Invites (`/api/admin/invites`, `/api/invites/:token`)
Admin (user 1) can generate single-use, time-limited invite links tied to a specific email. The recipient visits the link at `me.branam.us/invite/:token` and sets their own password to activate their account. If the email already has an account, the password is updated and all of that user's `sessions` rows are deleted to invalidate existing sessions.

- `POST /api/admin/invites` `{ email, expiresIn? }` — creates invite, returns `{ id, url, token, expiresAt }`; 409 if a pending invite already exists for that email
- `GET /api/admin/invites` — list all invites with email, expiry, used status, and URL
- `DELETE /api/admin/invites/:id` — revoke unused invite; 409 if already used
- `GET /api/invites/:token` (public) — validate token, returns `{ email, expiresAt }`; 404 if invalid/expired/used
- `POST /api/invites/:token/claim` (public) `{ password, displayName? }` — activates account, sets `used_at`, returns session cookie

CLI: `invites:create <email> [--expires-in <days>]`, `invites:list [--json]`, `invites:revoke <id>`

The invite claim UI lives at `me.branam.us/invite/:token` (public route, no auth required) since `me.branam.us` is the identity-management surface.

### API Tokens (`/api/auth/tokens`)
Create, list, and delete bearer tokens. Tokens are scoped to the authenticated user. The raw token value is only returned at creation time.

## Machine-Readable API Reference

Full endpoint documentation with request/response schemas is available at:

```
GET /api/openapi.json
```

Returns the OpenAPI 3.0.3 spec as JSON. No authentication required.
