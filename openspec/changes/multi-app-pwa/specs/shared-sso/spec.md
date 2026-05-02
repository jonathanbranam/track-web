## ADDED Requirements

### Requirement: Wildcard domain session cookie
The system SHALL set the session cookie with `Domain=.branam.us` so that the cookie is automatically sent by browsers to all subdomains.

#### Scenario: Cookie shared across subdomains
- **WHEN** a user logs in at `tracker.branam.us`
- **THEN** the session cookie is set with `Domain=.branam.us` and subsequent requests to any other app subdomain include the same cookie

#### Scenario: Session validated at any subdomain
- **WHEN** a valid session cookie is sent to any app's `/api/*` endpoint
- **THEN** the server authenticates the request without requiring re-login

#### Scenario: Unauthenticated request rejected at any app
- **WHEN** a request arrives at any app's `/api/*` endpoint without a valid session cookie
- **THEN** the server returns 401

### Requirement: Shared authentication middleware across all apps
The system SHALL use a single session-validation middleware applied to all app route prefixes. Session lookup logic SHALL NOT be duplicated per app.

#### Scenario: Middleware covers all app routes
- **WHEN** any `/api/*` route is registered in the backend
- **THEN** the shared auth middleware runs before the route handler regardless of which app prefix is used
