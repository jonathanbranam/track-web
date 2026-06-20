## Why

Server restarts (frequent during development deploys) destroy the in-memory session store, forcing re-login even though the browser's session cookie is still valid. Sessions should survive restarts without requiring a new session table, while still supporting real logout revocation across all devices.

## What Changes

- Add `session_nonce` column to the `users` table (random 16-byte hex, generated on row creation)
- Replace the in-memory `Map`-based session store with HMAC-SHA256 signed stateless cookie tokens
- Cookie payload encodes `{ userId, expiresAt, sessionNonce }`; signed with `SESSION_SECRET` (already required by `env.ts`)
- On every authenticated request: verify signature, check expiry, fetch `users.session_nonce` by `userId`, verify it matches the cookie — one primary-key DB read per request
- Logout rotates `session_nonce` in the DB and clears the browser cookie, invalidating all active sessions for that user across all devices
- **Password changes also rotate `session_nonce`** — changing a password invalidates all active sessions
- Add `rotateSessionNonce(userId)` method to `IUserRepository` and its SQLite implementation
- Update `IUserRepository.updatePassword()` to rotate the nonce atomically in the same transaction
- Update `scripts/admin.ts users:update-password` to rotate the nonce (it bypasses the repository with raw SQL)
- Server-side 30-day expiry enforced on every request (previously sessions had no server-side expiry)

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `user-auth`: Session lifetime, persistence, and revocation requirements are changing — sessions now survive server restarts, carry a 30-day server-enforced expiry, and can be fully revoked via logout or password change

## Impact

- **`src/utils/session.ts`** — full rewrite; `createSession`, `getSession`, `destroySession` interface preserved
- **`src/repositories/interfaces.ts`** — add `rotateSessionNonce(userId)` to `IUserRepository`; update `updatePassword` contract to include nonce rotation
- **`src/repositories/sqlite/user.repository.ts`** — implement `rotateSessionNonce`; update `updatePassword` to rotate nonce atomically
- **`src/routes/admin/users.ts`** — no change needed (calls `userRepo.updatePassword`, which will rotate nonce automatically)
- **`scripts/admin.ts`** — update `users:update-password` command to rotate nonce (raw SQL path, bypasses repository)
- **`src/db.ts`** — new migration to add `session_nonce` column to `users`
- `SESSION_SECRET` env var is already required and present; no new dependencies
