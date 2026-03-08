## ADDED Requirements

### Requirement: Single hard-coded user authentication
The system SHALL authenticate a single user whose email and bcrypt-hashed password are loaded from environment variables at startup. No user registration or password reset is supported in the backend.

#### Scenario: Successful login
- **WHEN** the user submits the correct email and password
- **THEN** the server creates a signed session cookie and returns 200

#### Scenario: Failed login - wrong password
- **WHEN** the user submits the correct email with an incorrect password
- **THEN** the server returns 401 and does not set a session cookie

#### Scenario: Failed login - unknown email
- **WHEN** the user submits an email not matching the configured user
- **THEN** the server returns 401 (same response as wrong password; no user enumeration)

#### Scenario: Authenticated session required for API
- **WHEN** a request is made to any /api/entries/* endpoint without a valid session cookie
- **THEN** the server returns 401

#### Scenario: Logout clears session
- **WHEN** the user posts to /api/auth/logout
- **THEN** the session cookie is invalidated and subsequent API calls return 401

### Requirement: Password stored as bcrypt hash with salt
The system SHALL never store or log a plaintext password. The .env file SHALL contain only the bcrypt hash. A CLI utility SHALL be provided to generate the hash from a plaintext password.

#### Scenario: Hash generation utility
- **WHEN** the developer runs `npm run hash-password`
- **THEN** the utility prompts for a plaintext password and outputs only the bcrypt hash string to stdout

#### Scenario: Startup rejects missing env vars
- **WHEN** the application starts without EMAIL or PASSWORD_HASH set in .env
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
The system SHALL present a login screen that appears to be an official app login (email + password fields) while silently logging any "Forgot Login" or "Create Account" interaction attempts server-side.

#### Scenario: Forgot Login flow
- **WHEN** the user clicks "Forgot Login?"
- **THEN** the server logs the attempt (timestamp, IP) and the UI displays a generic message: "For security reasons, please contact support."

#### Scenario: Create Account flow
- **WHEN** the user clicks "Create Account"
- **THEN** the UI displays: "This app is in closed beta. We're not accepting new registrations at this time." No server-side account is created.

#### Scenario: Only configured credentials work
- **WHEN** any email/password combination other than the configured user is submitted
- **THEN** login fails with 401 regardless of the email or password provided
