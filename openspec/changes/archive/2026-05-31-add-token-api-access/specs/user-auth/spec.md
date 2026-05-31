**App**: all

## MODIFIED Requirements

### Requirement: User authentication
The system SHALL authenticate users whose credentials are stored in the `users` table of the shared SQLite database. Multiple user accounts SHALL be supported. No user registration via the UI is supported.

#### Scenario: Successful login
- **WHEN** the user submits a valid email and password matching a record in the `users` table
- **THEN** the server creates a signed session cookie and returns 200

#### Scenario: Failed login - wrong password
- **WHEN** the user submits a valid email with an incorrect password
- **THEN** the server returns 401 and does not set a session cookie

#### Scenario: Failed login - unknown email
- **WHEN** the user submits an email not found in the `users` table
- **THEN** the server returns 401 (same response as wrong password; no user enumeration)

#### Scenario: Authenticated session required for API
- **WHEN** a request is made to any protected `/api/*` endpoint without a valid session cookie AND without a valid bearer token in the `Authorization` header
- **THEN** the server returns 401

#### Scenario: Logout clears session
- **WHEN** the user posts to `/api/auth/logout`
- **THEN** the session cookie is invalidated and subsequent API calls return 401
