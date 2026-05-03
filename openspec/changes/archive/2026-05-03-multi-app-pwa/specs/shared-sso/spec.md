## ADDED Requirements

### Requirement: Wildcard domain session cookie
The system SHALL set the session cookie with `Domain=.branam.us` and `SameSite=Lax` in production so that the cookie is automatically sent by browsers to all subdomains. The domain is only set in production; in development the cookie is scoped to localhost.

#### Scenario: Cookie shared across subdomains
- **WHEN** a user logs in at `time.branam.us`
- **THEN** the session cookie is set with `Domain=.branam.us` and subsequent requests to any other app subdomain include the same cookie

#### Scenario: Session validated at any subdomain
- **WHEN** a valid session cookie is sent to any app's `/api/*` endpoint
- **THEN** the server authenticates the request without requiring re-login

#### Scenario: Unauthenticated request rejected at any app
- **WHEN** a request arrives at any app's `/api/*` endpoint without a valid session cookie
- **THEN** the server returns 401

#### Scenario: Browser logout clears shared cookie
- **WHEN** a user navigates to `/logout` on any app
- **THEN** the session is destroyed, the cookie is cleared with `Domain=.branam.us`, and the browser is redirected to `/login`

### Requirement: Shared authentication middleware across all apps
The system SHALL use a single session-validation middleware applied to all app-prefixed routes. Auth routes (`/api/auth/*`) are excluded — they manage their own auth. Session lookup logic SHALL NOT be duplicated per app.

#### Scenario: Middleware covers all app-prefixed routes
- **WHEN** a request arrives at any app-prefixed route (e.g. `/api/tracker/*`, `/api/movies/*`)
- **THEN** the shared auth middleware runs before the route handler

#### Scenario: Auth routes remain public
- **WHEN** a request arrives at `/api/auth/login` or `/api/auth/forgot`
- **THEN** the shared auth middleware does NOT run; these routes handle auth themselves
