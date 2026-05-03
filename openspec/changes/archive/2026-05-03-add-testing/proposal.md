## Why

No tests exist in the codebase today. The utility functions (tag parsing, timezone/4am-boundary logic) and route business logic (entry overlap validation, running-entry enforcement) are the most likely sources of silent regressions when the code changes, yet they have no safety net.

## What Changes

- Add Vitest as the test framework (devDependency, `npm test` script)
- Export `setDb()` and `migrate()` from `src/db.ts` so tests can inject a fresh in-memory database
- Add Layer 1 unit tests for `src/utils/tags.ts` and `src/utils/date.ts`
- Add Layer 2 route integration tests for entries and auth routes using Hono's `testClient` and real in-memory SQLite repositories
- Add a shared test helper (`src/test-utils/db.ts`) to provision a fresh in-memory database per test file

The `packages/auth` workspace package (React components and fetch-based auth API client) is not covered by this change — see Non-Goals.

## Capabilities

### New Capabilities
- `test-suite`: Vitest configuration, shared DB test helper, unit tests for utils, and integration tests for Hono routes

### Modified Capabilities

## Impact

- `src/db.ts`: exports `setDb()` and `migrate()` (additive, non-breaking)
- `package.json`: adds `vitest` to devDependencies and a `"test"` script
- No runtime behavior changes — all changes are test-only or narrow DB module additions
