## Purpose

Covers single-user authentication: bcrypt-hashed credentials loaded from env, session cookies, rate limiting on login, and a honeypot UI that logs suspicious account activity.

## Requirements

### Requirement: Single hard-coded user authentication
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
- **WHEN** a request is made to any `/api/*` endpoint without a valid session cookie
- **THEN** the server returns 401

#### Scenario: Logout clears session
- **WHEN** the user posts to `/api/auth/logout`
- **THEN** the session cookie is invalidated and subsequent API calls return 401

### Requirement: Password stored as bcrypt hash with salt
The system SHALL provide a `create-user` CLI script to add user accounts to the database. The script SHALL bcrypt-hash the provided password before inserting a record into `users`. Plaintext passwords SHALL never be stored or logged.

#### Scenario: Create user via CLI
- **WHEN** the developer runs `npm run create-user -- <email> <password>`
- **THEN** a new record is inserted into `users` with the bcrypt-hashed password

#### Scenario: Duplicate email rejected
- **WHEN** the developer runs `npm run create-user` with an email already present in `users`
- **THEN** the script exits with an error message and no record is inserted

#### Scenario: Update password via CLI
- **WHEN** the developer runs `npm run create-user -- --update <email> <password>`
- **THEN** the bcrypt hash for that user is updated in `users`

#### Scenario: Update password for unknown email rejected
- **WHEN** the developer runs `npm run create-user -- --update` with an email not in `users`
- **THEN** the script exits with an error message and no record is modified

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
