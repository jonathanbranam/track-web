## Purpose

Covers single-user authentication: bcrypt-hashed credentials loaded from env, session cookies, rate limiting on login, and a honeypot UI that logs suspicious account activity.

## Requirements

### Requirement: User authentication
The system SHALL authenticate users whose credentials are stored in the `users` table of the shared SQLite database. Multiple user accounts SHALL be supported. No user registration via the UI is supported.

#### Scenario: Successful login
- **WHEN** the user submits a valid email and password matching a record in the `users` table
- **THEN** the server creates a signed session cookie containing `{ userId, expiresAt, sessionNonce }` signed with `SESSION_SECRET` and returns 200

#### Scenario: Failed login - wrong password
- **WHEN** the user submits a valid email with an incorrect password
- **THEN** the server returns 401 and does not set a session cookie

#### Scenario: Failed login - unknown email
- **WHEN** the user submits an email not found in the `users` table
- **THEN** the server returns 401 (same response as wrong password; no user enumeration)

#### Scenario: Authenticated session required for API
- **WHEN** a request is made to any protected `/api/*` endpoint without a valid session cookie AND without a valid bearer token in the `Authorization` header
- **THEN** the server returns 401

#### Scenario: Logout invalidates all sessions for the user
- **WHEN** the user posts to `/api/auth/logout`
- **THEN** the server rotates `session_nonce` in the `users` table, the browser cookie is cleared, and all previously issued session cookies for that user (on any device) return 401 on subsequent API calls

### Requirement: Password stored as bcrypt hash with salt
The system SHALL store user passwords as bcrypt hashes. User accounts are managed via the admin CLI (`users:create`, `users:update-password` — see social-admin-cli). Plaintext passwords SHALL never be stored or logged.

#### Scenario: Startup succeeds with users in database
- **WHEN** the application starts and the `users` table contains at least one record
- **THEN** the process starts normally without any credential-related errors

#### Scenario: Startup rejects missing env vars
- **WHEN** the application starts without required env vars (e.g. `SESSION_SECRET`)
- **THEN** the process exits with a clear error message

### Requirement: Rate limiting on login endpoint
The system SHALL enforce a rate limit of 5 failed login attempts per IP address within any 15-minute window.

#### Scenario: Lockout after 5 failures
- **WHEN** an IP makes 5 failed login attempts within 15 minutes
- **THEN** the 6th attempt returns HTTP 429 with a message indicating the lockout period

#### Scenario: Successful login does not count toward limit
- **WHEN** a login succeeds
- **THEN** the failure count for that IP is not incremented

#### Scenario: Rate limit resets after window
- **WHEN** 15 minutes have elapsed since the first failed attempt
- **THEN** the IP may attempt login again without a 429 response

### Requirement: Honeypot login UI
The system SHALL present a login screen that appears to be an official app login (email + password fields) while silently logging any "Forgot Login" or "Create Account" interaction attempts server-side. The login UI SHALL be provided by the shared `@repo/auth` package and SHALL display app-specific branding (name and icon) supplied by the consuming client.

#### Scenario: Forgot Login flow
- **WHEN** the user clicks "Forgot Login?"
- **THEN** the server logs the attempt (timestamp, IP) and the UI displays a generic message: "For security reasons, please contact support."

#### Scenario: Create Account flow
- **WHEN** the user clicks "Create Account"
- **THEN** the UI displays: "This app is in closed beta. We're not accepting new registrations at this time." No server-side account is created.

#### Scenario: Only configured credentials work
- **WHEN** any email/password combination other than the configured user is submitted
- **THEN** login fails with 401 regardless of the email or password provided

#### Scenario: App-specific branding is displayed
- **WHEN** a client renders the shared login page with a given `appName` and `appIcon`
- **THEN** the login page header displays that app's name and icon

### Requirement: Auth me response includes display name
`GET /api/auth/me` SHALL include `displayName` in its response alongside `userId`. If `display_name` is null in the database, the response SHALL return the username portion of the user's email (text before the `@`).

#### Scenario: Me returns displayName when set
- **WHEN** `GET /api/auth/me` is called with a valid session and the user has a non-null `display_name`
- **THEN** the response includes `{ userId, displayName }` where `displayName` matches `users.display_name`

#### Scenario: Me returns email prefix as fallback
- **WHEN** `GET /api/auth/me` is called with a valid session and the user's `display_name` is null
- **THEN** the response includes `{ userId, displayName }` where `displayName` is the portion of `email` before the `@`

### Requirement: Session survives server restart
The system SHALL issue session cookies that remain valid across server restarts. Session validity SHALL be verified cryptographically using `SESSION_SECRET` and a per-user `session_nonce`; no in-memory session store SHALL be required.

#### Scenario: Session valid after restart
- **WHEN** a user has a valid session cookie and the server is restarted
- **THEN** subsequent API requests with that cookie are authenticated successfully without requiring re-login

#### Scenario: Tampered cookie rejected
- **WHEN** a request is made with a session cookie whose HMAC signature does not verify against `SESSION_SECRET`
- **THEN** the server returns 401

### Requirement: Session expires after 30 days
The system SHALL enforce a server-side 30-day expiry on all session cookies. The `expiresAt` field is embedded in the signed payload and checked on every authenticated request.

#### Scenario: Expired session rejected
- **WHEN** a request is made with a session cookie whose `expiresAt` timestamp is in the past
- **THEN** the server returns 401 regardless of cookie validity in the browser

#### Scenario: Session within expiry window accepted
- **WHEN** a request is made with a session cookie whose `expiresAt` is in the future and whose HMAC and nonce are valid
- **THEN** the request is authenticated successfully

### Requirement: Password change invalidates all sessions
The system SHALL rotate `session_nonce` whenever a user's password is changed, via any path (admin API, admin CLI). This invalidates all active session cookies for that user.

#### Scenario: Password change via admin API invalidates existing sessions
- **WHEN** `PUT /api/admin/users/:id/password` is called successfully
- **THEN** all previously issued session cookies for that user return 401 on subsequent API calls

#### Scenario: Password change via admin CLI invalidates existing sessions
- **WHEN** `users:update-password` is run for a user
- **THEN** all previously issued session cookies for that user return 401 on subsequent API calls

### Requirement: Manual session invalidation via admin CLI
The system SHALL provide a `users:rotate-nonce <email>` admin CLI command that rotates a user's `session_nonce` without changing their password, immediately invalidating all active sessions for that user.

#### Scenario: Rotate nonce invalidates all sessions
- **WHEN** `users:rotate-nonce <email>` is run for a user
- **THEN** all previously issued session cookies for that user return 401 on subsequent API calls

#### Scenario: Rotate nonce for unknown user fails gracefully
- **WHEN** `users:rotate-nonce <email>` is run with an email that does not exist
- **THEN** the CLI exits with an error message and non-zero exit code
