## 1. Test Infrastructure

- [ ] 1.1 Add `vitest` to devDependencies in root `package.json` and add `"test": "vitest run"` script
- [ ] 1.2 Create `vitest.config.ts` at the repo root: Node environment, include `src/**/*.test.ts` (intentionally excludes `packages/` — frontend package tests are out of scope)
- [ ] 1.3 Export `setDb(db: Database.Database | null): void` from `src/db.ts` (sets `_db` directly)
- [ ] 1.4 Export `migrate(db: Database.Database): void` from `src/db.ts` (change existing `function migrate` to `export function migrate`)
- [ ] 1.5 Create `src/test-utils/db.ts`: `setupTestDb()` creates `new Database(':memory:')`, calls `migrate()`, creates `SqliteUserRepository` and `SqliteEntryRepository`, calls `setDb(db)`, registers `afterEach(() => setDb(null))`, returns `{ db, userRepo, entryRepo }`

## 2. Unit Tests: Tag Utilities

- [ ] 2.1 Create `src/utils/tags.test.ts`
- [ ] 2.2 Test `parseTags`: hash-prefix (`#backend`), colon-prefix (`:bug`), hyphenated (`#yard-work`), deduplication, returns lowercase
- [ ] 2.3 Test `parseTags` false-positive prevention: `"10:00am"` → `[]`, `"V1.2"` → `[]`
- [ ] 2.4 Test `normalizeDescription`: colon-prefix rewritten to hash (`":Bug"` → `"#bug"`), hash tags lowercased, plain text unchanged
- [ ] 2.5 Test `tagsToString`: array joined as comma-separated string, empty array returns `""`

## 3. Unit Tests: Date Utilities

- [ ] 3.1 Create `src/utils/date.test.ts`
- [ ] 3.2 Test `getDayBounds` for an EDT date (UTC-4): `"2024-06-15"` → startUtc `2024-06-15T08:00:00.000Z`, endUtc `2024-06-16T08:00:00.000Z`
- [ ] 3.3 Test `getDayBounds` for an EST date (UTC-5): `"2024-01-15"` → startUtc `2024-01-15T09:00:00.000Z`, endUtc `2024-01-16T09:00:00.000Z`
- [ ] 3.4 Test `getTodayDateString` before 4am ET: mock `Date` to 2:00am ET, assert returns previous calendar day
- [ ] 3.5 Test `getTodayDateString` at/after 4am ET: mock `Date` to 6:00am ET, assert returns current calendar day

## 4. Route Integration Tests: Entries

- [ ] 4.1 Create `src/routes/entries.test.ts`
- [ ] 4.2 Write `buildApp(userId)` helper: creates a Hono app with a `userId`-injecting middleware followed by the entries router (from `setupTestDb`)
- [ ] 4.3 Test `GET /running` returns `{ entry: null }` when nothing is running
- [ ] 4.4 Test `POST /` creates a running entry (201) and `GET /running` then returns it
- [ ] 4.5 Test `POST /` returns 409 when an entry is already running
- [ ] 4.6 Test `POST /` returns 422 when `startedAt` is before previous entry's `endedAt`
- [ ] 4.7 Test `PATCH /:id` returns 422 when `endedAt ≤ startedAt`
- [ ] 4.8 Test `PATCH /:id` returns 422 when new `startedAt` overlaps previous entry's `endedAt`
- [ ] 4.9 Test `PATCH /:id` returns 422 when new `endedAt` overlaps next entry's `startedAt`
- [ ] 4.10 Test `PATCH /:id` returns 404 when entry belongs to a different userId
- [ ] 4.11 Test `DELETE /:id` returns 204 and entry is gone
- [ ] 4.12 Test `DELETE /:id` returns 404 for another user's entry

## 5. Route Integration Tests: Auth

- [ ] 5.1 Create `src/routes/auth.test.ts`
- [ ] 5.2 Write setup helper: uses `setupTestDb`, inserts a test user via `userRepo.upsert(email, bcryptHash)`, creates auth router
- [ ] 5.3 Test `POST /login` returns 200 and sets session cookie on correct credentials
- [ ] 5.4 Test `POST /login` returns 401 on wrong password
- [ ] 5.5 Test `POST /login` returns 401 on unknown email
- [ ] 5.6 Test rate limiting: fire 5 failed logins, assert 6th returns 429 (reset rate-limit state between tests via `clearFailures` export or by restarting the module)
- [ ] 5.7 Test `POST /logout` returns 200 and clears cookie
- [ ] 5.8 Test `GET /me` returns 200 with `{ userId }` when session cookie is present
- [ ] 5.9 Test `GET /me` returns 401 without session cookie
