## 1. Dependency

- [x] 1.1 Add `js-yaml` and `@types/js-yaml` to root `package.json` dependencies and run `npm install`

## 2. Write openapi.yaml

- [x] 2.1 Create `openapi.yaml` at repo root with `openapi: 3.0.3`, `info` block, `servers` entry, and `securitySchemes` defining `cookieAuth` (cookie: `sid`) and `bearerAuth` (http bearer)
- [x] 2.2 Document `/api/auth` routes: `POST /login`, `POST /logout`, `GET /me`, `POST /forgot`, and token management (`POST /api/auth/tokens`, `GET /api/auth/tokens`, `DELETE /api/auth/tokens/{id}`) with correct `security` fields (token endpoints: `cookieAuth` only; `/me`: both; login/forgot: no auth)
- [x] 2.3 Document `/api/time/entries` routes: `GET /running`, `GET /`, `POST /`, `PATCH /{id}`, `DELETE /{id}` with request/response schemas matching existing Zod validators
- [x] 2.4 Document `/api/trips` routes: `GET /current`, `GET /`, `POST /`, `PUT /{id}/set-current`, `PUT /{id}`, `DELETE /{id}`
- [x] 2.5 Document `/api/social` routes: connections, invite-codes, connection-requests, groups, and user-discovery endpoints
- [x] 2.6 Document `/api/watch` routes: tags, movies (including series and watchlist), tv (including watchlist), events (including candidates, votes, invitees, complete/reopen), ratings, and external search/import
- [x] 2.7 Document `/api/deploy` routes: `POST /` (webhook) and `POST /trigger` — note these use a separate secret-based auth, not session/bearer

## 3. Server Endpoint

- [x] 3.1 In `src/app.ts`, read and parse `openapi.yaml` at startup using `js-yaml`; cache the result; log a warning if the file is missing rather than throwing
- [x] 3.2 Register `GET /api/openapi.json` before auth middleware so it requires no credentials; return the cached spec as JSON or `{ error: "API spec not available" }` with 404 if parse failed

## 4. Documentation

- [x] 4.1 Add `openapi.yaml` to the "Keep in sync" list in `CLAUDE.md` alongside `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, and `dev-local.sh`

## 5. Verification

- [x] 5.1 Build server (`npm run build:server`) and confirm zero TypeScript errors
- [x] 5.2 Start server and `curl http://localhost:<port>/api/openapi.json` — confirm 200 with valid JSON and no auth required
- [x] 5.3 Confirm a protected endpoint (e.g. `GET /api/auth/me`) still returns 401 without credentials (endpoint registration order not broken)
- [x] 5.4 Launch a subagent and have it read the spec yaml and compare it to the
    code and look for any discrepancies, listing ones that need to be fixed
