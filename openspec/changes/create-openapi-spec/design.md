## Context

The backend exposes ~50 endpoints across 11 route files (`/api/auth`, `/api/time/entries`, `/api/trips`, `/api/social`, `/api/watch/*`, `/api/deploy`). Currently there is no machine-readable description of this API surface. A coding agent starting a new session must infer the API from source code, which is slow and error-prone — especially for auth requirements, request schemas, and response shapes.

The spec will be static (hand-written), served at `GET /api/openapi.json`, and kept in sync via a CLAUDE.md instruction.

## Goals / Non-Goals

**Goals:**
- Produce an OpenAPI 3.0.3 YAML file covering all `/api/*` endpoints
- Serve it at `GET /api/openapi.json` without authentication
- Document auth requirements clearly (session-only vs. Bearer-or-session vs. no auth)
- Add a CLAUDE.md sync instruction so the spec stays current as routes change

**Non-Goals:**
- Auto-generation from code (Option B) — static is sufficient for now
- A Swagger UI or interactive documentation page
- Documenting internal or non-`/api/*` routes (static file serving, SPA fallback)
- Exhaustive response schemas for every field — shapes for key endpoints are sufficient

## Decisions

### Decision: YAML file location — `openapi.yaml` at repo root
Alternatives: `docs/openapi.yaml`, `src/openapi.yaml`, inline JSON in a route handler.
Repo root is the conventional location, visible alongside `package.json` and `Caddyfile`. It stays out of the compiled `out/` tree.

### Decision: Serve as `GET /api/openapi.json` (parsed at startup)
The route reads and parses `openapi.yaml` once at server startup using `js-yaml` (or Node's built-in `fs` + a small parser) and caches the result. Responding as JSON is more convenient for programmatic consumers than YAML.

Alternative: serve the raw YAML file statically via Caddy. Rejected — it would bypass the Hono auth layer and require Caddy config changes.

### Decision: No auth required on `GET /api/openapi.json`
The spec describes a private, self-hosted app. The endpoint is unauthenticated so an agent can fetch it before it has a token. The spec itself contains no secrets.

### Decision: Use `js-yaml` for YAML parsing
`js-yaml` is a well-established, zero-dependency YAML parser already common in the Node ecosystem. Alternative: write the spec as JSON directly — rejected because YAML is far more readable for a hand-maintained file.

### Decision: Document auth via OpenAPI `securitySchemes`
Define two schemes: `cookieAuth` (session cookie) and `bearerAuth` (API token). Each endpoint lists which apply. Token management endpoints (`/api/auth/tokens`) are marked `cookieAuth` only.

### Decision: Scope of response schemas
Full request schemas (matching existing Zod validators) for all endpoints. Response schemas for the most important shapes (`/api/auth/me`, entries, trips, tokens). Omit exhaustive schemas for watch/social — too many fields for the initial version; mark as `{}` with a comment.

## Risks / Trade-offs

- **Drift** — the spec will drift from reality as routes change. Mitigation: CLAUDE.md instruction makes this explicit; the spec endpoint itself can be tested by an agent to detect stale docs.
- **`js-yaml` dependency** — adds a prod dependency. Small, stable, widely used. Alternative: write in JSON and skip the dependency entirely (lower risk).
- **Startup file read** — reading `openapi.yaml` from disk at startup ties the server to the file's presence. Mitigation: if the file is missing, log a warning and skip the route rather than crashing.

## Migration Plan

1. Add `js-yaml` to dependencies (`npm install js-yaml` + `@types/js-yaml`)
2. Write `openapi.yaml` at repo root
3. Add `GET /api/openapi.json` to `src/app.ts` (unauthenticated, before auth middleware)
4. Add sync instruction to `CLAUDE.md`
5. Build and verify the endpoint returns valid JSON
