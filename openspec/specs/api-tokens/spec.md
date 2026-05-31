## Purpose

TBD — covers API token creation, listing, revocation, and bearer token authentication for programmatic access to protected endpoints.

## Requirements

### Requirement: Token creation
The system SHALL allow a session-authenticated user to create a bearer token with a required human-readable label and a required expiration of 1–180 days from creation. The raw token value SHALL be returned only in the creation response and never stored in plaintext; the server SHALL store a SHA-256 hash of the token. The raw token value SHALL NOT be retrievable after the creation response.

#### Scenario: Successful token creation
- **WHEN** a session-authenticated user POSTs `{ label, days }` to `/api/auth/tokens` with a non-empty `label` and `days` in range 1–180
- **THEN** the server returns 201 with `{ id, label, expiresAt, token }` where `token` is the full raw bearer token value

#### Scenario: Token creation requires session auth
- **WHEN** a POST to `/api/auth/tokens` is made without a valid session cookie
- **THEN** the server returns 401

#### Scenario: Bearer token cannot create tokens
- **WHEN** a POST to `/api/auth/tokens` is authenticated via `Authorization: Bearer` header only (no session cookie)
- **THEN** the server returns 401

#### Scenario: Days out of range rejected
- **WHEN** a POST to `/api/auth/tokens` includes `days` less than 1 or greater than 180
- **THEN** the server returns 400

#### Scenario: Missing or empty label rejected
- **WHEN** a POST to `/api/auth/tokens` omits `label` or provides an empty string
- **THEN** the server returns 400

### Requirement: Token listing
The system SHALL allow a session-authenticated user to list all their tokens (active and expired). The response SHALL include `id`, `label`, `createdAt`, and `expiresAt` for each token. Raw token values SHALL never appear in the list.

#### Scenario: List returns all tokens
- **WHEN** a session-authenticated user GETs `/api/auth/tokens`
- **THEN** the server returns 200 with an array of `{ id, label, createdAt, expiresAt }` records for that user

#### Scenario: Expired tokens included in list
- **WHEN** a user has tokens past their `expiresAt` date
- **THEN** those tokens appear in the list alongside active tokens, allowing the user to identify and revoke them

#### Scenario: Token listing requires session auth
- **WHEN** a GET to `/api/auth/tokens` is made without a valid session cookie
- **THEN** the server returns 401

#### Scenario: Bearer token cannot list tokens
- **WHEN** a GET to `/api/auth/tokens` is authenticated via `Authorization: Bearer` only
- **THEN** the server returns 401

### Requirement: Token revocation
The system SHALL allow a session-authenticated user to revoke any of their tokens by ID. A revoked token SHALL be rejected immediately on the next request that presents it.

#### Scenario: Successful revocation
- **WHEN** a session-authenticated user DELETEs `/api/auth/tokens/:id` for a token they own
- **THEN** the server returns 200 and subsequent requests using that token's value return 401

#### Scenario: Revoke unknown or foreign token returns 404
- **WHEN** a session-authenticated user DELETEs `/api/auth/tokens/:id` for an ID that does not exist or belongs to a different user
- **THEN** the server returns 404

#### Scenario: Token revocation requires session auth
- **WHEN** a DELETE to `/api/auth/tokens/:id` is made without a valid session cookie
- **THEN** the server returns 401

#### Scenario: Bearer token cannot revoke tokens
- **WHEN** a DELETE to `/api/auth/tokens/:id` is authenticated via `Authorization: Bearer` only
- **THEN** the server returns 401

### Requirement: Bearer token authentication
The system SHALL accept a valid, non-expired bearer token in the `Authorization: Bearer <token>` header as authentication for all protected `/api/*` endpoints except the token management endpoints (`/api/auth/tokens`). The provided value SHALL be hashed with SHA-256 and matched against stored token hashes. Expired and revoked tokens SHALL be rejected.

#### Scenario: Valid bearer token grants access
- **WHEN** a request to a protected endpoint includes `Authorization: Bearer <valid-unexpired-token>` and no session cookie
- **THEN** the server authenticates the request as the token's owner and returns the expected response

#### Scenario: Expired bearer token rejected
- **WHEN** a request includes a bearer token whose `expires_at` is in the past
- **THEN** the server returns 401

#### Scenario: Unknown bearer token rejected
- **WHEN** a request includes `Authorization: Bearer <token>` that does not match any stored hash
- **THEN** the server returns 401

#### Scenario: Revoked bearer token rejected
- **WHEN** a request includes a bearer token that has been revoked via DELETE `/api/auth/tokens/:id`
- **THEN** the server returns 401

#### Scenario: Token value format
- **WHEN** a token is created
- **THEN** the raw token value begins with the prefix `track_` followed by 64 lowercase hex characters
