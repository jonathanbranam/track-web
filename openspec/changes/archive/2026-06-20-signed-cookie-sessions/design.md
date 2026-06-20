## Context

Sessions are currently stored in an in-memory `Map<sessionId, userId>` in `src/utils/session.ts`. The browser cookie carries a random 64-char hex session ID with a 30-day `maxAge`, but the server-side record is lost on every restart — causing forced re-login after every deploy. There is also no server-side expiry; sessions live until restart or logout.

`SESSION_SECRET` is already a required env var. The `users` table is in SQLite. The `api_tokens` table stores hashed tokens with expiry as a precedent pattern.

## Goals / Non-Goals

**Goals:**
- Sessions survive server restarts
- Server-side 30-day expiry enforced on every request
- Logout (and password change) invalidates all active sessions for the user across all devices
- No new database table
- No new npm dependencies (`crypto` is sufficient)

**Non-Goals:**
- Per-device session management (logout is all-or-nothing per user)
- Session activity tracking or audit log
- Changing the cookie name, path, domain, or security flags

## Decisions

### Token format: signed payload cookie

**Decision:** Replace the random session ID with a dot-separated signed token:

```
base64url(JSON({ userId, expiresAt, sessionNonce })).base64url(HMAC-SHA256(SESSION_SECRET, payload))
```

`createSession(userId, sessionNonce)` encodes and signs. `decodeSession(token)` verifies the HMAC and `expiresAt`, returns `{ userId, sessionNonce }` or `null`. No database access in `session.ts` — it stays pure crypto.

**Why over JWT library:** No new dependency; the format is simple and self-contained. HMAC-SHA256 with `crypto` is the same primitive a JWT HS256 library would use.

**Why over storing sessions in SQLite:** No session table, no per-session row cleanup, O(1) DB reads (one PK lookup on `users`, not a session table scan).

---

### Per-user session nonce for revocation

**Decision:** Add `session_nonce TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))` to the `users` table. The nonce is included in the cookie payload and verified on every authenticated request against the DB value.

```
Request validation:
  1. Verify HMAC                              — tamper check
  2. Check expiresAt                          — expiry check
  3. SELECT session_nonce FROM users WHERE id = userId  — one PK read
  4. Verify payload.sessionNonce === db.sessionNonce    — revocation check
```

**Why not just rotate SECRET_KEY:** Rotating `SESSION_SECRET` invalidates *all* users' sessions globally. Per-user nonce allows per-user invalidation without affecting others.

**Why a random nonce over a counter:** Random nonces don't leak sequencing information. Either works cryptographically, but random is the safer default.

---

### Nonce rotation on logout and password change

**Decision:** `rotateSessionNonce(userId)` is a new method on `IUserRepository`. It issues `UPDATE users SET session_nonce = lower(hex(randomblob(16))) WHERE id = ?`.

- **Logout** (`POST /api/auth/logout`): decode the token (HMAC + expiry check only), extract `userId`, call `rotateSessionNonce`. If token is already invalid, skip rotation and just clear the cookie.
- **`updatePassword`** on the repository rotates the nonce atomically in a single transaction — password hash and nonce update together. This covers the admin API route automatically.
- **Admin CLI `users:update-password`** rotates the nonce explicitly after the SQL update (bypasses repository).
- **New admin CLI `users:rotate-nonce <email>`** for manual "nuke all sessions" without a password change.

---

### Module boundaries

`session.ts` — pure crypto, no imports from repositories or DB:
```
createSession(userId, sessionNonce) → token string
decodeSession(token) → { userId, sessionNonce } | null
```

`middleware/auth.ts` — adds the DB lookup step after `decodeSession`:
```
payload = decodeSession(cookie)
if !payload → 401
user = userRepo.findById(payload.userId)
if !user || user.sessionNonce !== payload.sessionNonce → 401
```

`routes/auth.ts` — login passes `user.sessionNonce` to `createSession`; logout decodes and rotates:
```
login:  sessionNonce from userRepo.findByEmail result → createSession(user.id, user.sessionNonce)
logout: decodeSession(cookie) → rotateSessionNonce(userId) → clearCookie
```

`User` interface gains `sessionNonce: string` so the login path can pass it to `createSession` without an extra DB call.

---

### One DB read per authenticated request

The nonce check requires `SELECT session_nonce FROM users WHERE id = ?` on every request. This is a primary-key lookup on a table with O(1) rows for this single-user app. SQLite WAL mode makes this negligible. The `api_tokens` auth path already does an equivalent DB read; this is not a new class of overhead.

## Risks / Trade-offs

**Logout is all-or-nothing** → By design; acceptable trade-off stated in proposal. No mitigation needed.

**SESSION_SECRET rotation invalidates all sessions** → Document in ops runbook. Warn in the env var comment. Acceptable — a compromised secret requires rotation regardless.

**One re-login required after this deploy** → The migration adds the nonce column with a DEFAULT so existing users get a nonce, but in-memory sessions are lost on restart anyway (as they always have been). No extra disruption beyond the normal restart re-login.

**nonce visible in cookie payload** → The payload is base64-encoded, not encrypted. The nonce value is visible to anyone who can read the cookie. This is fine — the nonce provides no value to an attacker who already has the full signed cookie.

## Migration Plan

1. New migration in `src/db.ts`: `ALTER TABLE users ADD COLUMN session_nonce TEXT NOT NULL DEFAULT (lower(hex(randomblob(16))))` — existing rows get a random nonce on migration.
2. Deploy restarts the server; existing in-memory sessions are already lost (status quo). Users re-login once.
3. From this point forward, sessions survive restarts. No rollback concern — the column is additive and the old code path simply won't exist post-deploy.

## Open Questions

_(none — all decisions settled above)_
