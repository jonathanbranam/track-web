**App**: all

## Purpose

TBD — invite-based user onboarding: admins generate invite links, recipients claim them to activate accounts.

## Requirements

### Requirement: Invite storage
The system SHALL maintain an `invites` table in SQLite with columns: `id` (integer PK), `token` (text, unique), `email` (text), `expires_at` (ISO 8601 UTC), `used_at` (ISO 8601 UTC, nullable), `created_by` (integer FK → users.id). The token SHALL be a cryptographically random URL-safe string. `TABLE_NAMES` in `src/db.ts` SHALL be updated to include `invites`.

#### Scenario: Invite record created
- **WHEN** an invite is generated
- **THEN** a row is inserted into `invites` with a unique token, the target email, an expiry, and the creating user's id

### Requirement: Admin invite generation endpoint
The system SHALL provide `POST /api/admin/invites` restricted to user 1. The request body SHALL include `email` and an optional `expiresIn` duration (defaulting to 7 days). The response SHALL return the full invite URL (`https://me.branam.us/invite/:token`), token, and expiry.

#### Scenario: Invite created for new email
- **WHEN** user 1 posts `{ email, expiresIn? }` to `POST /api/admin/invites`
- **THEN** the server returns 201 with `{ url, token, expiresAt }`

#### Scenario: Duplicate pending invite rejected
- **WHEN** user 1 posts an email that already has an unused, non-expired invite
- **THEN** the server returns 409

#### Scenario: Non-admin request forbidden
- **WHEN** a user other than user 1 calls `POST /api/admin/invites`
- **THEN** the server returns 403

### Requirement: Admin invite list endpoint
The system SHALL provide `GET /api/admin/invites` restricted to user 1, returning all invites ordered by `created_at` DESC with fields: `id`, `email`, `expiresAt`, `usedAt` (null if unused), `url`.

#### Scenario: Invites listed
- **WHEN** user 1 calls `GET /api/admin/invites`
- **THEN** the server returns all invite records with their status

### Requirement: Admin invite revoke endpoint
The system SHALL provide `DELETE /api/admin/invites/:id` restricted to user 1. Revoking an already-used invite SHALL return 409.

#### Scenario: Unused invite revoked
- **WHEN** user 1 deletes an unused invite
- **THEN** the invite record is removed and the token can no longer be claimed

#### Scenario: Used invite cannot be revoked
- **WHEN** user 1 attempts to delete an invite that has already been claimed
- **THEN** the server returns 409

### Requirement: Public invite validation endpoint
The system SHALL provide `GET /api/invites/:token` (unauthenticated) that returns the invite's target email and expiry if the token is valid (exists, not expired, not used). An invalid or expired token SHALL return 404.

#### Scenario: Valid token returns email
- **WHEN** a request is made to `GET /api/invites/:token` with a valid unused non-expired token
- **THEN** the server returns `{ email, expiresAt }`

#### Scenario: Expired token returns 404
- **WHEN** a request is made with a token whose `expires_at` is in the past
- **THEN** the server returns 404

#### Scenario: Used token returns 404
- **WHEN** a request is made with a token that has already been claimed
- **THEN** the server returns 404

### Requirement: Public invite claim endpoint
The system SHALL provide `POST /api/invites/:token/claim` (unauthenticated). The body SHALL include `password` and optional `displayName`. On success, the system SHALL create the user account (if the email does not already exist) or set the password (if the account was pre-created by the admin), mark `used_at`, and return a session cookie for the newly activated account.

#### Scenario: Successful claim activates account
- **WHEN** a recipient submits a valid token with a password
- **THEN** the account is activated with the bcrypt-hashed password, `used_at` is set, and the server responds with a session cookie

#### Scenario: Claim with display name
- **WHEN** a recipient submits a valid token with a password and display name
- **THEN** the account is activated and the display name is stored

#### Scenario: Expired token claim rejected
- **WHEN** a recipient submits an expired token
- **THEN** the server returns 404 and no account is created or modified

#### Scenario: Already-used token claim rejected
- **WHEN** a recipient submits a token that has already been claimed
- **THEN** the server returns 404

### Requirement: Admin CLI invite management
The system SHALL provide CLI commands for invite management:
- `invites:create <email> [--expires-in <duration>]` — generates an invite and prints the URL
- `invites:list [--json]` — lists all invites with status
- `invites:revoke <id>` — revokes an unused invite

#### Scenario: CLI invite creation prints URL
- **WHEN** the admin runs `invites:create user@example.com`
- **THEN** the CLI prints the full invite URL and expiry

#### Scenario: CLI invite list
- **WHEN** the admin runs `invites:list --json`
- **THEN** the CLI outputs a JSON array of invite records

### Requirement: Public invite claim UI
The `me.branam.us` app SHALL provide a public route `/invite/:token` accessible without authentication. On load it SHALL call `GET /api/invites/:token` to validate the token and display the target email. The page SHALL present a form to set a password (and optional display name) and submit to `POST /api/invites/:token/claim`. On success the user is redirected to `/`.

#### Scenario: Valid invite page loads
- **WHEN** a recipient navigates to `me.branam.us/invite/:token` with a valid token
- **THEN** the page shows the target email and a form to set a password

#### Scenario: Invalid invite shows error
- **WHEN** a recipient navigates with an expired or used token
- **THEN** the page shows an error message and no form is presented

#### Scenario: Successful claim redirects to home
- **WHEN** the recipient submits valid credentials
- **THEN** the account is activated and the app redirects to `/`
