## 1. Database Migration

- [x] 1.1 Add migration to `src/db.ts`: `ALTER TABLE users ADD COLUMN session_nonce TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))`

## 2. Repository Layer

- [x] 2.1 Add `sessionNonce: string` to the `User` interface in `src/repositories/interfaces.ts`
- [x] 2.2 Add `rotateSessionNonce(id: number): boolean` to `IUserRepository` in `src/repositories/interfaces.ts`
- [x] 2.3 Update `updatePassword` contract comment in `IUserRepository` to document that it rotates nonce atomically
- [x] 2.4 Update `SqliteUserRepository.findByEmail` and `findById` to select and map `session_nonce`
- [x] 2.5 Update `SqliteUserRepository.updatePassword` to rotate `session_nonce` atomically in a transaction alongside the password hash update
- [x] 2.6 Implement `SqliteUserRepository.rotateSessionNonce`: `UPDATE users SET session_nonce = lower(hex(randomblob(16))) WHERE id = ?`

## 3. Session Module

- [x] 3.1 Rewrite `src/utils/session.ts`: replace in-memory `Map` with `createSession(userId, sessionNonce)` and `decodeSession(token)` using HMAC-SHA256 signed `base64url(payload).base64url(hmac)` format
- [x] 3.2 Payload format: `{ userId: number, expiresAt: string (ISO UTC), sessionNonce: string }`; sign with `HMAC-SHA256(env.SESSION_SECRET, payloadBase64url)`
- [x] 3.3 `decodeSession` returns `{ userId, sessionNonce }` or `null` (verifies HMAC and checks `expiresAt`; does NOT check nonce against DB)
- [x] 3.4 Keep `COOKIE_MAX_AGE` and `SESSION_COOKIE` exports; update `destroySession` to be a no-op (nonce rotation is done by the caller)

## 4. Middleware

- [x] 4.1 Update `sessionMiddleware` in `src/middleware/auth.ts`: call `decodeSession`, then fetch `userRepo.findById(payload.userId)`, verify `user.sessionNonce === payload.sessionNonce`
- [x] 4.2 Update `requireAdmin` in `src/middleware/auth.ts` the same way
- [x] 4.3 Update `createAuthMiddleware` (bearer + session path) the same way for the session branch
- [x] 4.4 Thread `userRepo` into middleware — update `src/app.ts` wiring as needed

## 5. Auth Routes

- [x] 5.1 Update login in `src/routes/auth.ts`: pass `user.sessionNonce` to `createSession(user.id, user.sessionNonce)`
- [x] 5.2 Update logout in `src/routes/auth.ts`: decode the cookie token, extract `userId`, call `userRepo.rotateSessionNonce(userId)`, then clear the cookie; if token is invalid, just clear the cookie

## 6. Admin CLI

- [x] 6.1 Update `users:update-password` in `scripts/admin.ts` to also `UPDATE users SET session_nonce = lower(hex(randomblob(16))) WHERE email = ?` after the password update
- [x] 6.2 Add `users:rotate-nonce <email>` command in `scripts/admin.ts`: rotates `session_nonce` for the given email, exits with error if email not found

## 7. Verification

- [x] 7.1 Run `npm run build:server` and confirm zero TypeScript errors
- [x] 7.2 Verify existing auth tests still pass
- [X] 7.3 Manual smoke test: log in, restart server, confirm session still valid
- [X] 7.4 Manual smoke test: log in, log out, confirm session is invalid
- [X] 7.5 Manual smoke test: log in on two tabs, log out on one, confirm both are logged out
- [x] 7.6 Manual smoke test: change password via admin UI, confirm existing session is invalid

## 8. Documentation

- [x] 8.1 Update `llm-context.md` to reflect that sessions are now signed stateless cookies with per-user nonce (no in-memory store)
- [x] 8.2 Update `README.md` with the new `users:rotate-nonce` CLI command
