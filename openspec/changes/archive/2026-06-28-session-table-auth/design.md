## Context

Web auth today is a stateless signed cookie (`utils/session.ts`) carrying `{ userId, expiresAt, sessionNonce }`, HMAC-signed with `SESSION_SECRET`. The only server-side revocation state is a single `users.session_nonce` column shared by all of a user's sessions. Every authenticated request already does a DB read — `userRepo.findById(payload.userId)` — to compare that nonce, so the design is not actually saving a round-trip.

Because the nonce is shared, the only revocation primitive is "rotate the nonce," which invalidates **all** of a user's sessions at once. This is the bug: routine logout becomes global logout, and impersonating another user then logging out rotates *their* nonce and kills *their* real sessions.

The codebase already has the right pattern for the fix: `api_tokens` (migration `0019`) stores a sha256 `token_hash` (unique, indexed) with `user_id` and `expires_at`, and `middleware/auth.ts` already hashes an incoming bearer token and looks it up. Web sessions should work the same way.

## Goals / Non-Goals

**Goals:**
- Per-session logout: `POST /api/auth/logout` revokes only the calling device's session.
- Real server-side invalidation: a revoked or expired session fails on the next request even if the cookie is replayed.
- Password change invalidates *all* of a user's sessions (the one place global kill is correct).
- An admin lever to force-logout all of a user's sessions.
- A maintenance script to prune expired session rows, schedulable via cron, documented in `setup.md`.
- Remove the now-redundant `session_nonce` mechanism.

**Non-Goals:**
- No "active sessions" management UI (list/name/revoke individual devices from the client). The table is designed to allow it later, but it is out of scope here.
- No sliding-expiry / session refresh. Keep the existing fixed 30-day expiry computed at login.
- No change to the bearer-token (`api_tokens`) path — it already works this way.
- No change to rate limiting, the honeypot UI, or login credential checks.

## Decisions

### 1. Server-side `sessions` table (allowlist), mirroring `api_tokens`

```
sessions
  id         INTEGER PK AUTOINCREMENT
  user_id    INTEGER NOT NULL REFERENCES users(id)
  token_hash TEXT    NOT NULL UNIQUE      -- sha256(raw cookie token)
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  expires_at TEXT    NOT NULL             -- ISO 8601 UTC, login + 30d
  user_agent TEXT                          -- display-only label for a future sessions-management UI
CREATE INDEX idx_sessions_hash ON sessions(token_hash);
```

`user_agent` is captured from the request at login and is **display-only** — never trusted for auth (UA strings are client-controlled). Its sole purpose is to let a future "active sessions" UI label each live session so the user can pick which device to revoke. No such UI ships in this change; the column is populated now to avoid a backfill gap later.

- The cookie carries a **high-entropy opaque token** (`randomBytes(32).toString('hex')`, optional `sess_` prefix). The server stores only its sha256 hash. On each request: hash the cookie value → `sessionRepo.findByHash(hash)` → reject if missing or `expires_at <= now`.
- `last_seen_at` is intentionally omitted — writing it on every request adds a write to every authenticated call for no current feature. Easy to add later.

**Alternatives considered:**
- *Denylist (revocation list of session IDs in self-contained cookies):* grows on every logout (the common case) rather than shrinking, needs its own pruning, and makes "log out everywhere" awkward. Rejected.
- *Set of valid nonces per user:* an allowlist in disguise, with messier storage and none of the table's future affordances. Rejected.

### 2. Drop HMAC signing for web sessions; rely on the opaque-token lookup

The token is 256 bits of entropy and is validated by a server-side lookup, exactly like `api_tokens` — so an HMAC envelope adds nothing. `decodeSession` / `createSession`'s sign-and-verify logic is replaced by mint-token / hash-token helpers.

- **`SESSION_SECRET`:** keep the env var **required** for this change (cheap, avoids touching `env.ts` and the "startup rejects missing env vars" spec scenario), but it is no longer used to sign sessions. A task will grep for other usages; retiring the var entirely is deferred to avoid scope creep.

**Alternative:** keep signing the token too (defense in depth). Rejected as redundant — the raw token already can't be forged, and a forged token simply misses in the lookup.

### 3. Invalidation semantics

| Action | Old | New |
|---|---|---|
| Logout (current device) | rotate `session_nonce` → all sessions die | `DELETE FROM sessions WHERE token_hash = ?` → only this session |
| Password change (API + CLI) | rotate `session_nonce` | `DELETE FROM sessions WHERE user_id = ?` (in the same txn as the hash update) |
| Manual admin kill | `users:rotate-nonce <email>` | `users:logout-all <email>` → `DELETE FROM sessions WHERE user_id = ?` |
| Delete user | cascade deletes | add `DELETE FROM sessions WHERE user_id = ?` to the `deleteUser` cascade |

- **Changing your own password logs out your current device too.** This is standard and acceptable (you can immediately log back in). Documented rather than special-cased — preserving the current session would mean re-inserting a row, which isn't worth the complexity.

### 4. New `ISessionRepository` + SQLite impl

Methods: `create(userId, tokenHash, expiresAt, userAgent?)`, `findByHash(hash)`, `deleteByHash(hash)`, `deleteByUser(userId)`, `pruneExpired(): number`. The `users` repo loses `rotateSessionNonce`; `updatePassword` stops touching the nonce and instead deletes the user's sessions (wired via the session repo, keeping the password+session-clear atomic in one transaction).

### 5. Maintenance script + cron

- `scripts/prune-sessions.ts` opens the DB, runs `pruneExpired()`, logs the deleted count, exits. Supports `--json` (per the CLI rule) emitting `{ "deleted": <n> }`. Add a `package.json` convenience script (e.g. `prune-sessions`).
- `setup.md` gains a new section modeled on §9 (backup cron): the explicit-PATH crontab note for nvm, an example schedule (daily is plenty — expiry is 30 days), and a one-liner that the script is a safe no-op when nothing is expired.
- Expired rows are also harmless if never pruned (they fail the `expires_at` check); the script is hygiene, not correctness.

## Risks / Trade-offs

- **All existing sessions invalidate on deploy** (old cookies carry a nonce payload, not a session token) → every user re-logs-in once. Mitigation: expected and low-impact for a handful of self-hosted users; call it out in the proposal/release note.
- **Dropping `session_nonce` complicates rollback** — reverting to the old binary would reference a missing column. Mitigation: phase it. This change *stops reading/writing* `session_nonce` and adds the `sessions` table; the actual `ALTER TABLE users DROP COLUMN session_nonce` is a separate, later migration once the new code is proven. Keeps rollback to the prior release safe for one cycle. (SQLite bundled by better-sqlite3 is ≥3.35, so `DROP COLUMN` is available when we do it.)
- **Per-request lookup hits a different table** than before, but it replaces the existing `findById` nonce read — net-neutral, and `idx_sessions_hash` keeps it O(log n).
- **Forgetting the `sessions` entry in `TABLE_NAMES`** would silently break export/import. Mitigation: explicit task to update `TABLE_NAMES` alongside the migration (per repo rule).

## Migration Plan

1. Migration: `CREATE TABLE sessions` + `idx_sessions_hash`; add `'sessions'` to `TABLE_NAMES` in `src/db.ts`.
2. Land code: session repo, middleware lookup, login insert, logout delete, password-change + delete-user cascade clearing sessions, `users:logout-all` CLI (remove `users:rotate-nonce`), prune script, `setup.md` cron section. Leave `session_nonce` column in place but unreferenced.
3. Deploy to `main` → rebuild → all users re-login once.
4. After one stable release, a follow-up migration drops the `session_nonce` column and removes the remaining `sessionNonce` field from the `User` type/interface.

**Rollback:** redeploy the previous release. The `sessions` table is ignored by old code and the `session_nonce` column still exists (because step 4 is deferred), so the prior binary works unchanged. Users re-login once more.

## Open Questions

_All resolved:_

- **`user_agent`:** capture it at login as a display-only label; no UI this change. It exists to enable a future active-sessions management UI (let the user see live sessions and revoke a specific device). Never used for auth.
- **`users:logout-all`:** email only. `users.email` is `NOT NULL UNIQUE`, so it identifies exactly one user.
- **`SESSION_SECRET`:** stays required in `env.ts`; just no longer used for session signing. No follow-up needed for this change.
