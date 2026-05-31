## Context

The backend uses Hono with cookie-based session auth (`src/middleware/auth.ts`). Sessions are in-memory and checked by looking up a session ID from the cookie in the session store. External HTTP clients (scripts, Claude Code) cannot maintain cookies across calls and should not require server access to obtain sessions. The existing auth route (`src/routes/auth.ts`) handles login, logout, and `/me` under `/api/auth`.

## Goals / Non-Goals

**Goals:**
- Allow external HTTP clients to authenticate with a long-lived bearer token
- Tokens are user-scoped, revocable, and expire after at most 180 days
- Token management (create/list/revoke) is only possible via an authenticated session
- All operations accessible via admin CLI (`--json` flag on list)

**Non-Goals:**
- Fine-grained permission scopes per token (all tokens get full user-level access)
- Token rotation or refresh
- Frontend UI for token management (out of scope for this change)
- Automatic cleanup of expired tokens (lazy validation is sufficient at this scale)

## Decisions

### Token value format
**Decision:** `track_<32-random-bytes-as-hex>` (64-char hex with a prefix).

`crypto.randomBytes(32)` provides 256 bits of entropy — effectively unguessable. The `track_` prefix makes tokens identifiable in secrets managers and `.env` files. Hex is universally copyable without encoding edge cases.

Alternatives considered:
- Base64url: slightly more compact but less copy-paste friendly across shells
- JWT: would allow offline validation but adds complexity and a dependency; no benefit since we have a database

### Token storage (hash algorithm)
**Decision:** Store `SHA-256(token)` — no salt, no bcrypt.

Tokens are 256-bit random values, not user-chosen passwords. The input space is astronomically large, so dictionary/rainbow-table attacks are impossible regardless of salting. SHA-256 is fast and appropriate here; bcrypt's intentional slowness would add latency on every authenticated API request.

### Auth middleware check order
**Decision:** Check `Authorization: Bearer` header first; fall back to session cookie.

API clients explicitly set the header. Checking it first avoids an unnecessary cookie parse on every bearer-authenticated request and makes the control flow clear.

### Token management endpoint location
**Decision:** Mount token endpoints at `/api/auth/tokens` within the existing auth router.

Tokens are a sub-resource of auth. Keeping them in the auth router avoids creating a new router file and mirrors how `/me` and `/logout` live alongside login.

### Token management requires session auth (not bearer auth)
**Decision:** The `POST`, `GET`, and `DELETE /api/auth/tokens` endpoints require a session cookie, not a bearer token.

This prevents a compromised token from being used to create more tokens or list existing ones. Token management is an admin action, only possible interactively.

### Expiry enforcement
**Decision:** Reject expired tokens at lookup time; no background cleanup job.

SQLite is embedded and single-writer. A background job would add complexity without meaningful benefit — expired rows are simply ignored on lookup. Row count for this table will be tiny.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Token value logged in server access logs if passed as query param | Only accept token via `Authorization` header; never as a query param |
| Token hash compromise allows impersonation | SHA-256 of a 256-bit random value is not practically reversible |
| Old expired rows accumulate over time | Not a concern at single-user scale; can add a `DELETE WHERE expires_at < now()` sweep later if needed |

## Migration Plan

1. Add migration `0019_api_tokens` to `db.ts` — creates `api_tokens` table and adds it to `TABLE_NAMES`.
2. Add `IApiTokenRepository` interface and `SqliteApiTokenRepository` implementation.
3. Update `authMiddleware` to check Bearer header before session cookie.
4. Add token routes to auth router (POST/GET/DELETE), guarded by session auth.
5. Add admin CLI commands: `tokens:create`, `tokens:list`, `tokens:revoke`.
6. Deploy: standard `npm run build && npm start`; no data migration required.

Rollback: remove the migration (or simply leave the table unused), revert middleware and route changes.

## Open Questions

- Should the CLI `tokens:create` prompt for a label interactively, or require `--label` as a flag? (Flag is simpler for scripts.)
