## 1. Database Migration

- [x] 1.1 Add `api_tokens` to `TABLE_NAMES` in `src/db.ts`
- [x] 1.2 Add migration `0019_api_tokens` to `src/db.ts` creating the `api_tokens` table with columns: `id`, `user_id` (FK → users), `token_hash` (TEXT UNIQUE NOT NULL), `label` (TEXT NOT NULL), `expires_at` (TEXT NOT NULL), `created_at` (TEXT NOT NULL DEFAULT datetime('now'))
- [x] 1.3 Add index on `api_tokens(token_hash)` for fast lookup in migration

## 2. Repository Layer

- [x] 2.1 Add `IApiTokenRepository` interface to `src/repositories/interfaces.ts` with methods: `create`, `findByHash`, `listByUser`, `deleteById`
- [x] 2.2 Create `src/repositories/sqlite/apiTokenRepository.ts` implementing `IApiTokenRepository`
- [x] 2.3 Wire `SqliteApiTokenRepository` into app context in `src/app.ts` alongside existing repositories

## 3. Auth Middleware

- [x] 3.1 Update `src/middleware/auth.ts` to check `Authorization: Bearer <token>` header first; hash the value with `crypto.createHash('sha256')` and look up via `findByHash`; validate `expires_at` against current UTC time
- [x] 3.2 Fall through to existing session cookie check if no Bearer header is present
- [x] 3.3 Ensure token-authenticated requests set `userId` on context identically to session-authenticated requests

## 4. Token Management Routes

- [x] 4.1 Add `POST /api/auth/tokens` to auth router — session-auth required, validate `{ label: string (non-empty), days: integer 1–180 }`, generate token as `track_` + 64-char hex via `crypto.randomBytes(32)`, store SHA-256 hash, return 201 with `{ id, label, expiresAt, token }`
- [x] 4.2 Add `GET /api/auth/tokens` to auth router — session-auth required, return array of `{ id, label, createdAt, expiresAt }` for the authenticated user
- [x] 4.3 Add `DELETE /api/auth/tokens/:id` to auth router — session-auth required, return 200 on success, 404 if ID not found or belongs to another user
- [x] 4.4 Confirm token management endpoints return 401 when authenticated via Bearer token only (not session)

## 5. Admin CLI

- [x] 5.1 Add `tokens:create --user-id <id> --label <label> --days <days>` CLI command; print the raw token value to stdout on success; support `--json` flag outputting `{ id, label, expiresAt, token }`
- [x] 5.2 Add `tokens:list --user-id <id>` CLI command; print a table of `id`, `label`, `createdAt`, `expiresAt`; support `--json` flag
- [x] 5.3 Add `tokens:revoke --id <id>` CLI command; print confirmation on success; support `--json` flag

## 6. Verification

- [x] 6.1 Build server (`npm run build:server`) and confirm zero TypeScript errors
- [x] 6.2 Manually test: create a token via CLI, use it with `curl -H "Authorization: Bearer <token>"` against a protected endpoint, confirm 200
- [x] 6.3 Manually test: use an expired or invalid token, confirm 401
- [x] 6.4 Manually test: create token via `POST /api/auth/tokens`, list via `GET /api/auth/tokens`, revoke via `DELETE /api/auth/tokens/:id`, confirm revoked token returns 401

## 7. Documentation

- [x] 7.1 Update `README.md` with the three new CLI commands (`tokens:create`, `tokens:list`, `tokens:revoke`) and their flags
