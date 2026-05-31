**App**: all

## Purpose

Machine-readable and LLM-readable descriptions of the API surface, served as unauthenticated endpoints so agents and tooling can discover capabilities without credentials.

## Requirements

### Requirement: OpenAPI spec file
The project SHALL maintain a hand-written `openapi.yaml` at the repo root following OpenAPI 3.0.3. The spec SHALL document all `/api/*` endpoints including HTTP method, path, request schema, response shape, and authentication requirement. It SHALL define two security schemes: `cookieAuth` (session cookie) and `bearerAuth` (API token via `Authorization: Bearer`).

#### Scenario: Spec covers all routes
- **WHEN** a developer or agent reads `openapi.yaml`
- **THEN** every `/api/*` endpoint is listed with its method, path, request schema, and at least one response code

#### Scenario: Auth requirements are explicit
- **WHEN** a consumer reads a protected endpoint in the spec
- **THEN** the endpoint lists either `cookieAuth`, `bearerAuth`, or both under its `security` field; token-management endpoints list only `cookieAuth`

#### Scenario: Unauthenticated endpoints have no security
- **WHEN** a consumer reads `POST /api/auth/login`, `POST /api/auth/forgot`, `GET /api/openapi.json`, or `GET /api/llm-context.md`
- **THEN** those endpoints have `security: []` (explicitly unauthenticated)

### Requirement: OpenAPI spec endpoint
The server SHALL expose `GET /api/openapi.json` that returns the parsed contents of `openapi.yaml` as JSON. The endpoint SHALL require no authentication. The endpoint SHALL be registered before auth middleware so it is always accessible.

#### Scenario: Unauthenticated fetch succeeds
- **WHEN** any client sends `GET /api/openapi.json` without credentials
- **THEN** the server returns 200 with `Content-Type: application/json` and the full OpenAPI document as JSON

#### Scenario: Missing spec file is handled gracefully
- **WHEN** `openapi.yaml` cannot be read at startup
- **THEN** the server logs a warning and `GET /api/openapi.json` returns 404 with `{ "error": "API spec not available" }` rather than crashing

### Requirement: Spec kept in sync with routes
`CLAUDE.md` SHALL include an instruction requiring `openapi.yaml` to be updated whenever an API route is added, modified, or removed.

#### Scenario: Sync instruction is present
- **WHEN** a developer reads the "Keep in sync" section of `CLAUDE.md`
- **THEN** `openapi.yaml` is listed alongside `Caddyfile`, `Caddyfile.local`, `server-deploy.sh`, `dev-local.sh`, and `llm-context.md` as a file that must be kept current

### Requirement: LLM context endpoint
The server SHALL expose `GET /api/llm-context.md` that returns the contents of `llm-context.md` as `text/markdown`. The endpoint SHALL require no authentication and SHALL be registered before auth middleware.

#### Scenario: Unauthenticated fetch succeeds
- **WHEN** any client sends `GET /api/llm-context.md` without credentials
- **THEN** the server returns 200 with `Content-Type: text/markdown` and the full context document

#### Scenario: Missing context file is handled gracefully
- **WHEN** `llm-context.md` cannot be read at startup
- **THEN** the server logs a warning and `GET /api/llm-context.md` returns 404 with `{ "error": "LLM context not available" }` rather than crashing

### Requirement: LLM context kept in sync
`CLAUDE.md` and `openspec/config.yaml` SHALL include instructions requiring `llm-context.md` to be updated whenever feature areas, auth behavior, or key conventions visible to API consumers change.

#### Scenario: Sync instruction is present
- **WHEN** a developer reads the "Keep in sync" section of `CLAUDE.md`
- **THEN** `llm-context.md` is listed as a file that must be kept current when feature areas or auth behavior change
