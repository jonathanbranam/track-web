**App**: all (backend + client-games)

## ADDED Requirements

### Requirement: Authenticated access only
All lobby and room API routes SHALL require an authenticated session. Unauthenticated requests SHALL receive a 401 response.

#### Scenario: Unauthenticated list request
- **WHEN** an unauthenticated user requests `GET /api/games/rooms?slug=dungeon-tactics`
- **THEN** the server returns 401 Unauthorized

#### Scenario: Unauthenticated create request
- **WHEN** an unauthenticated user sends `POST /api/games/rooms`
- **THEN** the server returns 401 Unauthorized

---

### Requirement: List rooms by game slug
The system SHALL expose `GET /api/games/rooms?slug=<slug>` returning all rooms with status `waiting` or `active` for the given slug, ordered by `created_at` descending. Each room record SHALL include: `roomCode`, `gameSlug`, `status`, `desiredPlayers`, `createdAt`, `startedAt` (null if not started), `currentTurnUserId` (null if not set), `host` (id + display name), and `players` (array of id + display name + joinOrder).

#### Scenario: List returns waiting and active rooms
- **WHEN** rooms exist with status `waiting`, `active`, `finished`, and `canceled` for slug `dungeon-tactics`
- **THEN** only the `waiting` and `active` rooms are returned

#### Scenario: List is empty when no rooms exist
- **WHEN** no rooms exist for a slug
- **THEN** the endpoint returns an empty array with status 200

#### Scenario: List is scoped to slug
- **WHEN** rooms exist for slugs `dungeon-tactics` and `other-game`
- **THEN** `GET /api/games/rooms?slug=dungeon-tactics` returns only `dungeon-tactics` rooms

---

### Requirement: Create room
The system SHALL expose `POST /api/games/rooms` accepting `{ gameSlug, desiredPlayers, customDetails? }`. On success it SHALL create a room with status `waiting`, generate a unique 6-character alphanumeric room code (uppercase A–Z, digits 0–9, excluding O, 0, I, 1), set the caller as host, add the caller as the first player (joinOrder 1), and return the created room record.

#### Scenario: Successful room creation
- **WHEN** an authenticated user posts `{ gameSlug: "dungeon-tactics", desiredPlayers: 3 }`
- **THEN** a room is created with status `waiting`, a unique room code, and the caller listed as host and first player

#### Scenario: customDetails stored as JSON
- **WHEN** a room is created with `customDetails: { difficulty: "hard" }`
- **THEN** the room record returns `customDetails` matching the submitted value

#### Scenario: Missing required fields rejected
- **WHEN** `gameSlug` or `desiredPlayers` is omitted from the request body
- **THEN** the server returns 400 Bad Request

---

### Requirement: Join room
The system SHALL expose `POST /api/games/rooms/:code/join`. The caller SHALL be added as a player if: the room exists, the room status is `waiting`, the caller is not already a member, and the current player count is less than `desiredPlayers`. On success the server returns the updated room record.

#### Scenario: Successful join
- **WHEN** a waiting room has 1 of 3 desired players and a new user joins
- **THEN** the user is added with the next joinOrder and the updated room is returned

#### Scenario: Cannot join a full room
- **WHEN** a waiting room already has `desiredPlayers` players
- **THEN** the join request returns 409 Conflict

#### Scenario: Cannot join the same room twice
- **WHEN** a user who is already in the room attempts to join again
- **THEN** the server returns 409 Conflict

#### Scenario: Cannot join a non-waiting room
- **WHEN** a room has status `active`, `finished`, or `canceled`
- **THEN** the join request returns 409 Conflict

#### Scenario: Non-existent room
- **WHEN** the room code does not exist
- **THEN** the server returns 404 Not Found

---

### Requirement: Cancel waiting room
The system SHALL expose `POST /api/games/rooms/:code/cancel`. Only the room's host MAY cancel it. Canceling is only permitted when status is `waiting`. On success the room status is set to `canceled` and the updated record is returned.

#### Scenario: Host cancels waiting room
- **WHEN** the host sends a cancel request on a waiting room
- **THEN** the room status changes to `canceled`

#### Scenario: Non-host cannot cancel
- **WHEN** a non-host participant sends a cancel request
- **THEN** the server returns 403 Forbidden

#### Scenario: Cannot cancel an active room
- **WHEN** the room status is `active`
- **THEN** the cancel request returns 409 Conflict

---

### Requirement: Start game
The system SHALL expose `POST /api/games/rooms/:code/start`. Only the host MAY start the game. Starting is only permitted when status is `waiting` and at least 2 players have joined (host + at least 1 other). On success the room status is set to `active`, `started_at` is set to the current UTC timestamp, `current_turn_user_id` is set to null (game logic will set it), and the updated record is returned.

#### Scenario: Host starts a room with enough players
- **WHEN** the host starts a waiting room that has ≥ 2 players joined
- **THEN** status becomes `active`, `startedAt` is populated, and `currentTurnUserId` is null

#### Scenario: Host cannot start with only themselves
- **WHEN** the host is the only player and sends a start request
- **THEN** the server returns 409 Conflict

#### Scenario: Non-host cannot start
- **WHEN** a non-host participant sends a start request
- **THEN** the server returns 403 Forbidden

#### Scenario: Cannot start a non-waiting room
- **WHEN** the room status is `active`, `finished`, or `canceled`
- **THEN** the start request returns 409 Conflict

---

### Requirement: End running game
The system SHALL expose `POST /api/games/rooms/:code/end`. Any room participant MAY end a running game. Ending is permitted when status is `active`. On success the status is set to `finished` and the updated record is returned.

#### Scenario: Participant ends active game
- **WHEN** any joined player sends an end request on an active room
- **THEN** status becomes `finished`

#### Scenario: Non-participant cannot end
- **WHEN** a user who is not in the room sends an end request
- **THEN** the server returns 403 Forbidden

#### Scenario: Cannot end a non-active room
- **WHEN** the room status is `waiting`, `finished`, or `canceled`
- **THEN** the end request returns 409 Conflict

---

### Requirement: Single room detail
The system SHALL expose `GET /api/games/rooms/:code` returning the full room record (same shape as list items) for any authenticated user.

#### Scenario: Fetch existing room
- **WHEN** an authenticated user requests a room by its code
- **THEN** the full room record including player list is returned

#### Scenario: Non-existent room returns 404
- **WHEN** the room code does not match any room
- **THEN** the server returns 404 Not Found

---

### Requirement: Lobby page — room list display
The client-games `LobbyPage` SHALL display all waiting and active rooms for the current game slug. Waiting room cards SHALL show: creator display name, joined player count vs. desired player count, and time elapsed since creation. Active room cards SHALL show: all player display names, time elapsed since game started, and — when `currentTurnUserId` is non-null — whose turn it is by display name.

#### Scenario: Waiting room card
- **WHEN** a waiting room exists with 2 of 3 players joined
- **THEN** the card shows the creator's name, "2 / 3 players", and elapsed wait time

#### Scenario: Active room card with turn indicator
- **WHEN** an active room has `currentTurnUserId` set to a known player
- **THEN** the card shows that player's name as the current turn holder

#### Scenario: Active room card without turn indicator
- **WHEN** `currentTurnUserId` is null on an active room
- **THEN** no turn indicator is shown on the card

---

### Requirement: Lobby page — join and navigate actions
On waiting room cards, players who are not yet members SHALL see a "Join" button. On active room cards, players who are already members SHALL see a "Join Game" button that navigates to `/game/:slug/room/:code`. No action buttons are shown to non-members on active rooms.

#### Scenario: Non-member sees Join on waiting room
- **WHEN** an authenticated user who is not in a waiting room views the lobby
- **THEN** a "Join" button is visible on that room's card

#### Scenario: Member sees Join Game on active room
- **WHEN** an authenticated user who is in an active room views the lobby
- **THEN** a "Join Game" button is visible and navigates to `/game/:slug/room/:code`

#### Scenario: Non-member sees no action on active room
- **WHEN** an authenticated user who is not in an active room views the lobby
- **THEN** no join action is displayed for that room

---

### Requirement: Lobby page — create game
The LobbyPage SHALL provide a "New Game" button that opens a form allowing the user to select desired player count and submit. On success the user is added to the newly created room and the lobby list refreshes.

#### Scenario: Create game from lobby
- **WHEN** a user clicks "New Game", fills in desired player count, and submits
- **THEN** a new waiting room is created, the user is the host, and the room appears in the lobby list

---

### Requirement: Lobby page — background polling
The LobbyPage SHALL poll `GET /api/games/rooms?slug=<slug>` approximately every 15 seconds while the page is mounted. The interval SHALL be cleared when the page unmounts.

#### Scenario: Polling updates the room list
- **WHEN** a new room is created by another user while the lobby page is open
- **THEN** within ~15 seconds the new room appears in the lobby without a manual action

#### Scenario: Poll stops on unmount
- **WHEN** the user navigates away from the lobby page
- **THEN** no further polls are issued for that page instance

---

### Requirement: Lobby page — manual refresh
The LobbyPage SHALL provide a "Refresh" button that immediately re-fetches the room list and resets the polling interval.

#### Scenario: Manual refresh fetches latest rooms
- **WHEN** the user clicks "Refresh"
- **THEN** the room list is re-fetched immediately

---

### Requirement: Placeholder game room page
The route `/game/:slug/room/:code` SHALL render a placeholder page showing the room code, game slug, and player list. No game logic or Phaser canvas is rendered in this change.

#### Scenario: Navigate to game room
- **WHEN** a player clicks "Join Game" on an active room they are part of
- **THEN** they are navigated to the placeholder page showing the room details

---

### Requirement: Dungeon Tactics catalog entry
Dungeon Tactics SHALL be registered in the client-games game registry with `slug: "dungeon-tactics"`, `category: "multiplayer"`, and a `lobbySlug` indicating it has a lobby. Its catalog card SHALL navigate to `/game/dungeon-tactics/lobby` instead of mounting a game component.

#### Scenario: Dungeon Tactics appears in catalog
- **WHEN** a user opens the games home page
- **THEN** a Dungeon Tactics card is visible with a "Multiplayer" category badge

#### Scenario: Dungeon Tactics card links to lobby
- **WHEN** a user clicks the Dungeon Tactics catalog card
- **THEN** they are navigated to `/game/dungeon-tactics/lobby`

---

### Requirement: Admin CLI — room management
The system SHALL provide admin CLI commands for all room operations under `admin games`, each supporting `--json` for script-friendly output.

Commands:
- `admin games list-rooms --slug <slug> [--status <status>] [--json]`
- `admin games create-room --slug <slug> --user <email> --players <n> [--json]`
- `admin games cancel-room --code <code> [--json]`
- `admin games end-room --code <code> [--json]`
- `admin games list-players --code <code> [--json]`

#### Scenario: List rooms via CLI
- **WHEN** `admin games list-rooms --slug dungeon-tactics --json` is run
- **THEN** a JSON array of rooms for that slug is printed to stdout

#### Scenario: Create room via CLI
- **WHEN** `admin games create-room --slug dungeon-tactics --user jon@branam.us --players 3` is run
- **THEN** a new waiting room is created with that user as host and the room record is printed
