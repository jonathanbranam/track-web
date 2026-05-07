## Purpose

Vitest-based test suite for the backend. Covers utility unit tests (`tags`, `date`) and route integration tests (`entries`, `auth`) using real in-memory SQLite. Frontend and `packages/auth` workspace are excluded.

## Requirements

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
The system SHALL include `src/utils/tags.test.ts` with unit tests for `parseTags`, `normalizeDescription`, and `tagsToString`. Tests SHALL cover: hash-prefix tags, colon-prefix tags, hyphenated tags, case normalization (uppercase tags lowercased, `:` rewritten to `#` in descriptions), deduplication, and false-positive prevention (e.g., time strings like `10:00am` must not produce tags).

#### Scenario: Time strings are not parsed as tags
- **WHEN** `parseTags` is called with a description containing a time like `"meeting at 10:00am"`
- **THEN** it returns `[]` (digits before `:` do not match the tag pattern)

### Requirement: Unit tests for date utilities
The system SHALL include `src/utils/date.test.ts` with unit tests for `getDayBounds` and `getTodayDateString`. Tests SHALL cover: EDT and EST offset differences (4am ET = 8am UTC in summer, 9am UTC in winter), and before/after 4am boundary behavior for `getTodayDateString`.

#### Scenario: getDayBounds produces correct UTC window for each ET offset
- **WHEN** `getDayBounds` is called for a summer date (EDT, UTC-4) and a winter date (EST, UTC-5)
- **THEN** startUtc is 8am UTC and 9am UTC respectively, with endUtc 24 hours later

### Requirement: Route integration tests for entries
The system SHALL include `src/routes/entries.test.ts` that spins up a Hono app with the entries router backed by a real in-memory SQLite database and a test middleware that injects `userId` into context. Tests SHALL cover: no running entry state, creating a running entry (201), rejecting a concurrent second entry (409), rejecting startedAt before previous endedAt (422), rejecting endedAt before startedAt (422), rejecting adjacent-entry overlap (422), rejecting cross-user access (404), deleting entries (204), and cross-user delete rejection (404).

#### Scenario: Business-logic constraints are enforced at the route layer
- **WHEN** the entries integration test suite runs against a real in-memory SQLite database
- **THEN** all ordering, uniqueness, and ownership constraints return the correct HTTP status codes

### Requirement: Route integration tests for auth
The system SHALL include `src/routes/auth.test.ts` that spins up the auth router with a real in-memory SQLite user repository. Tests SHALL cover: successful login (200 + session cookie), wrong password (401), unknown email (401), rate limit triggering at 5 failures (429 on 6th), logout clearing the session (200), `/me` with valid session (200 + `{ userId, displayName }`), and `/me` without session (401).

#### Scenario: Rate limit triggers after repeated failures
- **WHEN** the auth integration test makes 5 failed login attempts from the same IP and then a 6th
- **THEN** the 6th response is 429
