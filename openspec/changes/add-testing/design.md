## Context

The codebase has no tests. The backend is a Hono app with repository-injected routers and pure utility functions. The repository constructors already accept a `Database.Database` instance, and the routers are factory functions — both patterns are already favorable for testing. The main gap is that `db.ts` exposes only `getDb()`, which reads from `env.SQLITE_PATH`. Tests need a way to supply their own in-memory database.

## Goals / Non-Goals

**Goals:**
- Layer 1: unit tests for `src/utils/tags.ts` and `src/utils/date.ts`
- Layer 2: route integration tests for entries and auth using Hono `testClient` + real in-memory SQLite
- Minimal production-code change: export `setDb()` and `migrate()` from `db.ts`
- `npm test` runs all tests via Vitest

**Non-Goals:**
- Frontend (React component) tests
- E2E browser tests
- Mocking of repositories or the database
- CI integration (out of scope for this change)

## Decisions

**Vitest over Jest**
Vitest has zero TypeScript config overhead in a `tsx`-based project, runs faster due to ESM-native execution, and shares Vite's transform pipeline. Jest would require `ts-jest` or Babel. No meaningful downside for a Node-only backend test suite.

**Real in-memory SQLite over mocked repositories**
Using `new Database(':memory:')` with the actual `migrate()` function means route tests exercise real SQL queries, real constraint enforcement, and real schema shape. Mocking `IEntryRepository` would test only the route layer in isolation — masking bugs where the route and repository interact incorrectly (e.g., wrong userId filtering). The cost is negligible since SQLite in-memory is extremely fast.

**Export `setDb()` and `migrate()` from `db.ts`**
Tests create their own `Database(':memory:')`, call `migrate()` to apply the schema, then call `setDb()` to install it as the module singleton. This is simpler than passing a DB instance through every call chain, and only two lines of production code change. The test helper calls `setDb(null)` in `afterEach` to reset state between test files.

Alternative considered: pass a DB factory to `app.ts` and thread it through. Rejected — too much refactoring for no runtime benefit.

**Shared test helper: `src/test-utils/db.ts`**
Centralizes the boilerplate: create DB, run migrations, return `{ db, userRepo, entryRepo }`. Every test file that needs route-level integration just calls `setupTestDb()`. This keeps test files focused on assertions.

**Auth middleware in route tests**
Route integration tests set `userId` on the Hono context directly (via a lightweight test middleware injected before the router) rather than going through real bcrypt login. This keeps tests fast and decouples auth correctness (tested separately in `auth.test.ts`) from entry logic.

## Risks / Trade-offs

- `setDb()` bypasses `env.SQLITE_PATH` — if test files forget to call `setDb(null)` after use, bleed between test files is possible. Mitigation: the shared helper includes the `afterEach` reset, and Vitest runs each file in a separate worker by default.
- The 4am boundary tests in `date.test.ts` depend on fixed timestamps — DST transition edge cases require careful fixture construction. Mitigation: document the fixture dates in test comments.
