## Why

External clients (such as Claude Code and scripts) need to read and write the deployed database through the existing API without requiring SSH access to the server or a browser-based session cookie. Token-based auth provides a stateless, revocable credential that any HTTP client can use.

## What Changes

- New `api_tokens` table stores hashed tokens associated with a user, with a human-readable label and expiry.
- New endpoints to create, list, and revoke API tokens (session-authenticated; tokens cannot self-manage).
- Auth middleware updated to accept a `Bearer <token>` in the `Authorization` header as an alternative to the session cookie.
- Tokens are scoped to the owning user — a token issued for user A cannot access user B's data.
- Token values are shown once at creation time and never stored in plaintext (SHA-256 hash stored).
- Tokens have a required expiration: callers specify a duration (1–180 days) at creation time; expired tokens are rejected automatically.

## Capabilities

### New Capabilities
- `api-tokens`: Issuance, storage, listing, and revocation of bearer tokens tied to a user account; tokens have a required expiration of 1–180 days; token-based authentication as an alternative to session cookies.

### Modified Capabilities
- `user-auth`: The "Authenticated session required for API" requirement expands to accept a valid Bearer token in the `Authorization` header in addition to a session cookie.

## Impact

- **Database**: new `api_tokens` migration in `db.ts`
- **Auth middleware** (`src/middleware/auth.ts`): must check `Authorization: Bearer` header before falling back to session cookie check
- **Routes**: new `/api/auth/tokens` resource (POST create, GET list, DELETE revoke by id)
- **No frontend changes** required initially; tokens are created via API calls (e.g., from the CLI or a script)
- **No new dependencies** — Node's built-in `crypto.createHash` is sufficient for SHA-256
