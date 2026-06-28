## 1. Schema & migration

- [ ] 1.1 Add a `sessions` table migration in `src/db.ts` (`id`, `user_id` FK → users, `token_hash` TEXT UNIQUE, `created_at` default now, `expires_at` TEXT NOT NULL, `user_agent` TEXT nullable) plus `CREATE INDEX idx_sessions_hash ON sessions(token_hash)`
- [ ] 1.2 Add `'sessions'` to `TABLE_NAMES` in `src/db.ts` so export/import stays complete
- [ ] 1.3 Leave the `users.session_nonce` column in place for now (deferred drop — see task 8.x); do NOT add a DROP COLUMN migration in this change

## 2. Session repository

- [ ] 2.1 Add `ISessionRepository` to `src/repositories/interfaces.ts` with `create(userId, tokenHash, expiresAt, userAgent?)`, `findByHash(hash)`, `deleteByHash(hash)`, `deleteByUser(userId)`, `pruneExpired(): number`
- [ ] 2.2 Implement `SqliteSessionRepository` in `src/repositories/sqlite/` mirroring the `api_tokens` access pattern
- [ ] 2.3 Wire the session repository into app/route construction (`src/app.ts`) alongside the existing repositories

## 3. Token & session utilities

- [ ] 3.1 In `src/utils/session.ts`, replace `createSession`/`decodeSession` (HMAC payload) with helpers to mint a high-entropy opaque token (`randomBytes(32).toString('hex')`) and compute its SHA-256 hash
- [ ] 3.2 Remove the no-op `destroySession`; keep `clearSessionCookie` and the `SESSION_COOKIE` / `COOKIE_MAX_AGE` constants
- [ ] 3.3 Keep `SESSION_SECRET` required in `src/env.ts` (no longer used for signing); add a brief code comment noting it is retained for compatibility

## 4. Middleware

- [ ] 4.1 In `src/middleware/auth.ts`, change the cookie path of `createSessionMiddleware`, `createRequireAdminMiddleware`, and the cookie branch of `createAuthMiddleware` to: hash the cookie token → `sessionRepo.findByHash` → reject if missing or `expires_at <= now`; set `userId` from the session row
- [ ] 4.2 Remove all `user.sessionNonce` comparisons from the middleware
- [ ] 4.3 Leave the bearer-token (`api_tokens`) branch of `createAuthMiddleware` unchanged

## 5. Auth routes

- [ ] 5.1 In `src/routes/auth.ts` `POST /login`, after credential success: mint a token, insert a `sessions` row (hash, userId, `expires_at` = now + 30d, `user_agent` from the request header), and set the raw token as the `sid` cookie
- [ ] 5.2 Change `POST /logout` to delete only the current session row (`deleteByHash` of the calling cookie's token hash) and clear the cookie — no nonce rotation
- [ ] 5.3 Confirm `GET /me` still resolves `userId` from middleware and returns `displayName` unchanged

## 6. Invalidation paths

- [ ] 6.1 In `SqliteUserRepository.updatePassword`, stop rotating `session_nonce`; instead delete all of the user's `sessions` rows in the same transaction as the password update
- [ ] 6.2 Add `DELETE FROM sessions WHERE user_id = ?` to the `deleteUser` cascade
- [ ] 6.3 Remove `rotateSessionNonce` from the interface and SQLite implementation, and drop reads/writes of `session_nonce` in `findByEmail`/`findById`/`upsert`/`createUser`/`UserRow`/`toUser` and the `User` type
- [ ] 6.4 Verify `PUT /api/admin/users/:id/password` (admin route) clears sessions via the updated `updatePassword` path

## 7. Admin CLI & maintenance script

- [ ] 7.1 In `scripts/admin.ts`, remove `users:rotate-nonce` and add `users:logout-all <email>` that deletes the user's `sessions` rows; support `--json` emitting the deleted count; error + non-zero exit for unknown email
- [ ] 7.2 Add `scripts/prune-sessions.ts` that calls `pruneExpired()`, logs the deleted count, supports `--json` (`{ "deleted": n }`), and is a safe no-op when nothing is expired
- [ ] 7.3 Add a `prune-sessions` convenience script to `package.json`

## 8. Docs & spec sync

- [ ] 8.1 Update `README.md` Admin CLI section: replace `users:rotate-nonce` with `users:logout-all`; document the `prune-sessions` command
- [ ] 8.2 Add a `setup.md` section (modeled on §9 backup cron) documenting the prune-sessions crontab schedule, including the explicit-PATH note for nvm and an example daily entry
- [ ] 8.3 Update `openapi.yaml` to reflect the new per-session logout semantics for `POST /api/auth/logout`
- [ ] 8.4 Update `llm-context.md` where it describes session/nonce auth behavior to the sessions-table model
- [ ] 8.5 Note the deferred follow-up (later migration to `DROP COLUMN users.session_nonce` and remove the remaining `sessionNonce` field) in the relevant planning doc (`docs/app/planning.md`)

## 9. Tests & verification

- [ ] 9.1 Update `src/routes/auth.test.ts`: per-session logout (other sessions survive), unknown/forged token → 401, expired session → 401, login creates a session row with captured user-agent
- [ ] 9.2 Update `src/routes/admin/admin.test.ts` (or auth tests): password change deletes all of the user's sessions
- [ ] 9.3 Add coverage for `SqliteSessionRepository` (`pruneExpired` deletes only past-expiry rows) and the migration in `src/db.migration.test.ts`
- [ ] 9.4 Remove or rewrite any existing tests that assert nonce-rotation behavior
- [ ] 9.5 Run the full test suite and confirm it passes
- [ ] 9.6 Run `npm run build` (server + clients) and confirm zero TypeScript errors before marking implementation complete
