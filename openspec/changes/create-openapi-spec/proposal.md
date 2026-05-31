## Why

LLM coding agents working against this API need a machine-readable description of available endpoints, auth requirements, and request/response shapes — without having to read and infer from source code. A static OpenAPI spec served at a known URL provides this in a format agents can `fetch` directly.

## What Changes

- Add a hand-written `openapi.yaml` spec covering all existing `/api/*` endpoints
- Serve the spec at `GET /api/openapi.json` (parsed from the YAML at startup)
- Update `CLAUDE.md` with an instruction to keep `openapi.yaml` in sync when routes are added, modified, or removed

## Capabilities

### New Capabilities
- `api-docs`: OpenAPI 3.0 spec file and the endpoint that serves it; covers all `/api/*` routes including auth requirements, request schemas, and response shapes

### Modified Capabilities
<!-- none — no existing spec-level behavior changes -->

## Impact

- `src/app.ts` — add `GET /api/openapi.json` route
- `openapi.yaml` — new file at repo root (or `docs/`)
- `CLAUDE.md` — new sync instruction under the "Keep in sync" note
- No breaking changes; no new dependencies (YAML parsed with Node's built-in `fs`, or a small `js-yaml` import)
