## ADDED Requirements

### Requirement: Vitest configured as test runner
The system SHALL include Vitest as a devDependency with a `"test": "vitest run"` script in `package.json`. A `vitest.config.ts` SHALL configure the Node test environment and include only `src/**/*.test.ts` files.

#### Scenario: Tests run with npm test
- **WHEN** the developer runs `npm test`
- **THEN** Vitest discovers and runs all `*.test.ts` files under `src/` and exits with a non-zero code if any test fails

### Requirement: In-memory database test helper
The system SHALL provide a `src/test-utils/db.ts` module that creates a fresh in-memory SQLite database per test file. It SHALL export a `setupTestDb()` function that runs migrations, creates `SqliteUserRepository` and `SqliteEntryRepository` instances, and calls `setDb()` to install the database as the module singleton. It SHALL register an `afterEach` hook that resets the singleton via `setDb(null)`.

#### Scenario: Each test file gets an isolated database
- **WHEN** a test file calls `setupTestDb()`
- **THEN** a new in-memory SQLite database is created, all schema migrations are applied, and the returned `{ db, userRepo, entryRepo }` references that database exclusively

#### Scenario: Singleton is reset after tests
- **WHEN** a test file's `afterEach` hook fires
- **THEN** `setDb(null)` is called so subsequent test files start with a clean singleton state

### Requirement: db.ts exports setDb and migrate
The system SHALL export a `setDb(db: Database.Database | null): void` function from `src/db.ts` that replaces the module-level singleton. It SHALL also export the `migrate(db: Database.Database): void` function so test helpers can apply the schema to an arbitrary database instance.

#### Scenario: setDb overrides the singleton
- **WHEN** `setDb(db)` is called with an in-memory Database instance
- **THEN** subsequent calls to `getDb()` return that instance without re-running migrations or touching `env.SQLITE_PATH`

#### Scenario: setDb(null) clears the singleton
- **WHEN** `setDb(null)` is called
- **THEN** the next call to `getDb()` initializes a new database from `env.SQLITE_PATH` as normal

### Requirement: Unit tests for tag utilities
The system SHALL include `src/utils/tags.test.ts` with unit tests for `parseTags`, `normalizeDescription`, and `tagsToString`. Tests SHALL cover hash-prefix tags, colon-prefix tags, hyphenated tags, deduplication, and false-positive prevention (e.g. time strings like "10:00am" must not produce tags).

#### Scenario: Hash-prefix tags parsed
- **WHEN** `parseTags` is called with `"working on #backend today"`
- **THEN** it returns `["backend"]`

#### Scenario: Colon-prefix tags parsed
- **WHEN** `parseTags` is called with `"fixed :bug in auth"`
- **THEN** it returns `["bug"]`

#### Scenario: Time strings not parsed as tags
- **WHEN** `parseTags` is called with `"meeting at 10:00am"`
- **THEN** it returns `[]` (digits before colon do not match the tag pattern)

#### Scenario: Hyphenated tags parsed
- **WHEN** `parseTags` is called with `"#yard-work done"`
- **THEN** it returns `["yard-work"]`

#### Scenario: Duplicate tags deduplicated
- **WHEN** `parseTags` is called with `"#work and more #work"`
- **THEN** it returns `["work"]` (one entry)

#### Scenario: normalizeDescription rewrites colon prefixes
- **WHEN** `normalizeDescription` is called with `"fixed :Bug in auth"`
- **THEN** it returns `"fixed #bug in auth"` (colon replaced with hash, tag lowercased)

#### Scenario: normalizeDescription lowercases hash tags
- **WHEN** `normalizeDescription` is called with `"#Backend work"`
- **THEN** it returns `"#backend work"`

### Requirement: Unit tests for date utilities
The system SHALL include `src/utils/date.test.ts` with unit tests for `getDayBounds` and `getTodayDateString`. Tests SHALL cover standard ET days, the EST/EDT boundary (4am UTC offset difference), and the before/after 4am boundary for `getTodayDateString`.

#### Scenario: getDayBounds returns correct UTC window for an ET day
- **WHEN** `getDayBounds("2024-06-15")` is called (EDT, UTC-4)
- **THEN** `startUtc` is `"2024-06-15T08:00:00.000Z"` (4am EDT = 8am UTC) and `endUtc` is `"2024-06-16T08:00:00.000Z"`

#### Scenario: getDayBounds handles EST offset
- **WHEN** `getDayBounds("2024-01-15")` is called (EST, UTC-5)
- **THEN** `startUtc` is `"2024-01-15T09:00:00.000Z"` (4am EST = 9am UTC) and `endUtc` is `"2024-01-16T09:00:00.000Z"`

#### Scenario: getTodayDateString returns previous calendar day before 4am ET
- **WHEN** the current time is 2:00am ET
- **THEN** `getTodayDateString()` returns the previous calendar day's date string

#### Scenario: getTodayDateString returns current calendar day at or after 4am ET
- **WHEN** the current time is 6:00am ET
- **THEN** `getTodayDateString()` returns today's date string

### Requirement: Route integration tests for entries
The system SHALL include `src/routes/entries.test.ts` that spins up a Hono app with the entries router backed by a real in-memory SQLite database and a test middleware that injects `userId` into context. Tests SHALL cover the key business-logic invariants.

#### Scenario: GET /running returns null when no entry is running
- **WHEN** `GET /running` is called and no entry is running
- **THEN** the response is `{ entry: null }` with status 200

#### Scenario: POST / creates a running entry
- **WHEN** `POST /` is called with a valid description and startedAt
- **THEN** the response is 201 with the created entry

#### Scenario: POST / rejects a second running entry
- **WHEN** one entry is already running and `POST /` is called again
- **THEN** the response is 409

#### Scenario: POST / rejects startedAt before previous entry's endedAt
- **WHEN** a previous entry ended at T and `POST /` is called with `startedAt < T`
- **THEN** the response is 422

#### Scenario: PATCH /:id rejects endedAt before startedAt
- **WHEN** `PATCH /:id` is called with `endedAt` equal to or before `startedAt`
- **THEN** the response is 422

#### Scenario: PATCH /:id rejects overlap with previous entry
- **WHEN** `PATCH /:id` is called with a `startedAt` that precedes the previous entry's `endedAt`
- **THEN** the response is 422

#### Scenario: PATCH /:id rejects overlap with next entry
- **WHEN** `PATCH /:id` is called with an `endedAt` that exceeds the next entry's `startedAt`
- **THEN** the response is 422

#### Scenario: PATCH /:id rejects updates to another user's entry
- **WHEN** `PATCH /:id` is called for an entry owned by a different userId
- **THEN** the response is 404

#### Scenario: DELETE /:id removes an entry
- **WHEN** `DELETE /:id` is called for an existing entry owned by the user
- **THEN** the response is 204 and the entry no longer exists

#### Scenario: DELETE /:id rejects deleting another user's entry
- **WHEN** `DELETE /:id` is called for an entry owned by a different userId
- **THEN** the response is 404

### Requirement: Route integration tests for auth
The system SHALL include `src/routes/auth.test.ts` that spins up the auth router with a real in-memory SQLite user repository. Tests SHALL cover login, logout, rate limiting, and the /me endpoint.

#### Scenario: Login succeeds with correct credentials
- **WHEN** `POST /login` is called with a valid email and matching password
- **THEN** the response is 200 with `{ ok: true }` and a session cookie is set

#### Scenario: Login fails with wrong password
- **WHEN** `POST /login` is called with a valid email and incorrect password
- **THEN** the response is 401 and no session cookie is set

#### Scenario: Login fails with unknown email
- **WHEN** `POST /login` is called with an email not in the database
- **THEN** the response is 401

#### Scenario: Rate limit triggers after 5 failures
- **WHEN** an IP makes 5 failed login attempts within the window and then a 6th attempt
- **THEN** the 6th response is 429

#### Scenario: Logout clears session
- **WHEN** `POST /logout` is called
- **THEN** the response is 200 and the session cookie is cleared

#### Scenario: /me returns userId for authenticated session
- **WHEN** `GET /me` is called with a valid session cookie
- **THEN** the response is 200 with `{ userId: <id> }`

#### Scenario: /me returns 401 without session
- **WHEN** `GET /me` is called without a session cookie
- **THEN** the response is 401
