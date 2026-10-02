## ADDED Requirements

### Requirement: Shared session events
The games client SHALL provide a shared tracker that, for every game except Dungeon Tactics, records `session_start`, `session_end` (with reason, active, idle and wall time), idle transitions, and `game_over`, without any per-game code.

#### Scenario: Session recorded
- **WHEN** a player opens a game, plays, and leaves
- **THEN** a `session_start` and a `session_end` event are sent carrying active, idle and wall durations

#### Scenario: Dungeon Tactics excluded
- **WHEN** a player opens Dungeon Tactics
- **THEN** no tracking events are sent

### Requirement: Per-game events
Each instrumented game SHALL declare its own levels and named interactions, and emit `level_start`, `level_end` (outcome `won`, `lost` or `abandoned`), `score`, and interaction events. A level that is started and not ended before the session ends SHALL count as abandoned.

#### Scenario: Level abandoned on exit
- **WHEN** a player leaves a game while a level is in progress
- **THEN** a `level_end` with outcome `abandoned` is sent for that level

#### Scenario: Unknown game events accepted
- **WHEN** a game sends an interaction name the server has not seen before
- **THEN** the server stores it without a server change

### Requirement: Idle detection
The tracker SHALL count active time only while the page is visible and an input occurred in the last 15 seconds, SHALL emit idle events only on transitions, and SHALL end the session after 5 minutes without input.

#### Scenario: Idle period
- **WHEN** a player makes no input for more than 15 seconds
- **THEN** one `idle_start` is emitted, and one `idle_end` on the next input

### Requirement: Asynchronous, non-blocking delivery
The tracker SHALL batch events and send them asynchronously (periodic flush, size threshold, `sendBeacon` or keepalive fetch on page hide), SHALL never block or delay gameplay, and SHALL swallow all delivery errors.

#### Scenario: Flush on page hide
- **WHEN** the page becomes hidden with unsent events
- **THEN** the queue is sent with `sendBeacon`

#### Scenario: Server unavailable
- **WHEN** the ingest endpoint returns an error
- **THEN** the game continues unaffected

### Requirement: Offline retry
Unsent events SHALL be kept in a capped local queue (200 events, oldest dropped) and retried on the next flush, on reconnect, and at next load. Each event SHALL carry a session id and sequence number so that retries are de-duplicated by the server.

#### Scenario: Offline then online
- **WHEN** events are queued while offline and the connection returns
- **THEN** they are sent once and not stored twice

### Requirement: Telemetry ingest
The system SHALL provide `POST /api/games/telemetry` for authenticated users, accepting at most 100 events and 16 KB per request, rate limited per user, stamping user, receipt time, app version and user agent server-side, and storing events in a `game_events` table.

#### Scenario: Batch accepted
- **WHEN** an authenticated player posts a valid batch
- **THEN** the events are stored and the response is `204`

#### Scenario: Oversized or excessive
- **WHEN** a request exceeds the size cap or the rate limit
- **THEN** the response is `413` or `429` and nothing is stored

#### Scenario: Unauthenticated
- **WHEN** a request has no valid session
- **THEN** the response is `401`

### Requirement: Retention
Raw `game_events` rows older than 90 days SHALL be deleted by the scheduled prune.

#### Scenario: Old events pruned
- **WHEN** the prune runs
- **THEN** events older than 90 days are removed and newer ones kept

### Requirement: Privacy notice and stored data
The system SHALL store per event only the user id, session timing, game events, app version and receipt time; SHALL NOT store IP addresses or device identifiers; and the games home page SHALL show a short notice that play time, levels and feedback are recorded.

#### Scenario: Notice shown
- **WHEN** a player opens the games home page
- **THEN** the playtest notice is visible
