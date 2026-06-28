**App**: all

## MODIFIED Requirements

### Requirement: User authentication
The system SHALL authenticate users whose credentials are stored in the `users` table of the shared SQLite database. Multiple user accounts SHALL be supported. No user registration via the UI is supported. Each successful login SHALL create a distinct server-side session record, and logout SHALL revoke only the session that issued the request.

#### Scenario: Successful login
- **WHEN** the user submits a valid email and password matching a record in the `users` table
- **THEN** the server generates a high-entropy opaque session token, stores a row in the `sessions` table containing the token's SHA-256 hash, the `user_id`, an `expires_at` 30 days in the future, and the request `user_agent`, sets the raw token as the session cookie, and returns 200

#### Scenario: Failed login - wrong password
- **WHEN** the user submits a valid email with an incorrect password
- **THEN** the server returns 401, creates no session row, and does not set a session cookie

#### Scenario: Failed login - unknown email
- **WHEN** the user submits an email not found in the `users` table
- **THEN** the server returns 401 (same response as wrong password; no user enumeration)

#### Scenario: Authenticated session required for API
- **WHEN** a request is made to any protected `/api/*` endpoint without a valid session cookie AND without a valid bearer token in the `Authorization` header
- **THEN** the server returns 401

#### Scenario: Logout invalidates only the current session
- **WHEN** the user posts to `/api/auth/logout`
- **THEN** the server deletes the `sessions` row matching the calling cookie's token hash and clears the browser cookie, that session's cookie returns 401 on subsequent API calls, AND the user's other active sessions (on other devices) continue to work

#### Scenario: Logout of an impersonated account does not affect that user's own sessions
- **WHEN** an administrator who logged in as another user posts to `/api/auth/logout`
- **THEN** only the administrator's impersonation session row is deleted, and the impersonated user's own sessions remain valid

### Requirement: Session survives server restart
The system SHALL persist sessions as rows in the `sessions` table so they remain valid across server restarts. A session SHALL be validated by hashing the cookie's opaque token with SHA-256 and looking up a matching, unexpired row; no in-memory session store and no per-user `session_nonce` SHALL be used.

#### Scenario: Session valid after restart
- **WHEN** a user has a valid session cookie and the server is restarted
- **THEN** subsequent API requests with that cookie are authenticated successfully without requiring re-login

#### Scenario: Unknown or forged token rejected
- **WHEN** a request is made with a session cookie whose token does not hash to any row in the `sessions` table
- **THEN** the server returns 401

### Requirement: Session expires after 30 days
The system SHALL enforce a 30-day session expiry recorded as `expires_at` on the `sessions` row at login time and checked on every authenticated request.

#### Scenario: Expired session rejected
- **WHEN** a request is made with a session cookie whose matching `sessions` row has an `expires_at` in the past
- **THEN** the server returns 401 regardless of cookie validity in the browser

#### Scenario: Session within expiry window accepted
- **WHEN** a request is made with a session cookie whose matching `sessions` row has an `expires_at` in the future
- **THEN** the request is authenticated successfully

### Requirement: Password change invalidates all sessions
The system SHALL delete all of a user's rows from the `sessions` table whenever that user's password is changed, via any path (admin API, admin CLI), in the same transaction as the password update. This invalidates every active session for that user, including the session that initiated the change.

#### Scenario: Password change via admin API invalidates existing sessions
- **WHEN** `PUT /api/admin/users/:id/password` is called successfully
- **THEN** all rows in the `sessions` table for that user are deleted and all previously issued session cookies for that user return 401 on subsequent API calls

#### Scenario: Password change via admin CLI invalidates existing sessions
- **WHEN** `users:update-password` is run for a user
- **THEN** all rows in the `sessions` table for that user are deleted and all previously issued session cookies for that user return 401 on subsequent API calls

## ADDED Requirements

### Requirement: Session records label devices for future management
Each `sessions` row SHALL capture the request `user_agent` at login as a display-only label. The `user_agent` value SHALL NOT be used in any authentication or authorization decision.

#### Scenario: User agent captured at login
- **WHEN** a user logs in with a request that includes a `User-Agent` header
- **THEN** the created `sessions` row stores that user-agent string

#### Scenario: User agent never affects validation
- **WHEN** an authenticated request is made with a different `User-Agent` header than the one stored on the session row
- **THEN** the request is still authenticated successfully based solely on the token hash and expiry

### Requirement: Force-logout all sessions via admin CLI
The system SHALL provide a `users:logout-all <email>` admin CLI command that deletes all of a user's rows from the `sessions` table without changing their password, immediately invalidating all active sessions for that user. The command SHALL support a `--json` flag for script-friendly output.

#### Scenario: Logout-all invalidates all sessions
- **WHEN** `users:logout-all <email>` is run for a user
- **THEN** all rows in the `sessions` table for that user are deleted and all previously issued session cookies for that user return 401 on subsequent API calls

#### Scenario: Logout-all reports machine-readable output
- **WHEN** `users:logout-all <email> --json` is run for a user
- **THEN** the command emits JSON including the number of sessions deleted

#### Scenario: Logout-all for unknown user fails gracefully
- **WHEN** `users:logout-all <email>` is run with an email that does not exist
- **THEN** the CLI exits with an error message and a non-zero exit code

### Requirement: Expired sessions are pruned by a maintenance script
The system SHALL provide a `scripts/prune-sessions.ts` maintenance script that deletes all rows from the `sessions` table whose `expires_at` is in the past, reports the number of rows deleted, and supports a `--json` flag. The script SHALL be safe to run when nothing is expired (deleting zero rows) and SHALL be documented in `setup.md` with an example crontab schedule.

#### Scenario: Prune deletes expired sessions
- **WHEN** the prune script runs and the `sessions` table contains rows with `expires_at` in the past
- **THEN** those rows are deleted, rows with a future `expires_at` are retained, and the deleted count is reported

#### Scenario: Prune is a safe no-op when nothing is expired
- **WHEN** the prune script runs and no `sessions` rows have an `expires_at` in the past
- **THEN** no rows are deleted and the script exits successfully reporting zero deletions

#### Scenario: Prune supports machine-readable output
- **WHEN** the prune script is run with `--json`
- **THEN** it emits JSON including the number of rows deleted

## REMOVED Requirements

### Requirement: Manual session invalidation via admin CLI
**Reason**: The per-user `session_nonce` revocation mechanism is replaced by the server-side `sessions` table. Rotating a shared nonce is no longer how sessions are invalidated.
**Migration**: Use `users:logout-all <email>` instead of `users:rotate-nonce <email>`. It deletes all of the user's `sessions` rows, achieving the same "invalidate all sessions for this user" effect against the new storage model.
