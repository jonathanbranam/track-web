## Why

Authentication currently uses a stateless signed cookie plus a **single `session_nonce` per user**. Every session a user holds embeds that same nonce, so the only revocation lever is rotating it — which invalidates *every* session for that user at once. This makes routine logout behave as a global logout: logging out on one device kills all the user's other devices, and logging out of an impersonated account rotates that account's nonce and rudely terminates the real user's own sessions. There is no way to revoke a single session.

## What Changes

- **BREAKING**: Replace the per-user `session_nonce` model with a server-side **`sessions` table** (allowlist). Each login inserts one row keyed by a hash of an opaque session token (mirroring the existing `api_tokens` pattern); the cookie carries the raw token.
- **BREAKING**: `POST /api/auth/logout` now deletes **only the current session's row**, invalidating just that device. Other sessions for the same user keep working.
- **BREAKING**: Remove the `session_nonce` column from `users`, the `rotateSessionNonce` repository method, and the `users:rotate-nonce` admin CLI command (replaced — see below).
- Session validation in `middleware/auth.ts` changes from "decode cookie → compare user nonce" to "hash cookie token → look up live session row → check expiry".
- Password change (admin API and admin CLI) now invalidates all of a user's sessions by **deleting all their rows** from the `sessions` table instead of rotating a nonce.
- Replace the manual `users:rotate-nonce <email>` CLI with a `users:logout-all <email>` command that deletes all of a user's session rows (same "kill everything" capability, expressed against the new table).
- Add a **session cleanup script** (`scripts/prune-sessions.ts`) that deletes expired rows from the `sessions` table, documented in `setup.md` with a crontab schedule (modeled on the existing backup cron in section 9).

## Capabilities

### New Capabilities
<!-- None — this reshapes an existing capability rather than introducing a new one. -->

### Modified Capabilities
- `user-auth`: The session storage and invalidation model changes at the requirement level — session cookie contents, logout semantics (per-session vs. global), the underlying storage (server-side `sessions` table vs. stateless nonce), password-change invalidation, manual invalidation tooling, and a new expired-session pruning requirement.

## Impact

- **Schema**: new `sessions` table + index (migration in `src/db.ts`); drop/retire `users.session_nonce`.
- **Backend**: `utils/session.ts` (token mint/hash instead of nonce payload), `middleware/auth.ts` (session lookup), `routes/auth.ts` (login insert, logout delete), `repositories/interfaces.ts` + `repositories/sqlite/user.repository.ts` (remove nonce methods, add session repo).
- **New repository**: `ISessionRepository` + SQLite implementation (create / find-by-hash / delete-by-id / delete-by-user / prune-expired).
- **Admin**: `scripts/admin.ts` (replace `rotate-nonce` with `logout-all`), `PUT /api/admin/users/:id/password` invalidation path.
- **Ops**: new `scripts/prune-sessions.ts`; `setup.md` gains a cron section; `package.json` may gain a convenience script.
- **Migration cost**: existing cookies carry a nonce, not a session token — on deploy all current sessions become invalid and every user re-logs-in once.
- **Spec/doc sync**: `openspec/specs/user-auth/spec.md`, `social-admin-cli` (CLI command rename), `openapi.yaml` (logout semantics note), `llm-context.md`.
