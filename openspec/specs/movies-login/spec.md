## Purpose

Covers authentication-gated routing in the movies client: unauthenticated users are redirected to the login page; authenticated users reach the app shell. The login page displays movies-specific branding.

## Requirements

### Requirement: Movies client enforces authentication
The movies client SHALL redirect unauthenticated users to `/login` for any route that requires authentication. Authenticated users SHALL access the app shell normally.

#### Scenario: Unauthenticated visit redirected to login
- **WHEN** an unauthenticated user navigates to any protected route in the movies client
- **THEN** the client redirects to `/login`

#### Scenario: Authenticated user accesses app shell
- **WHEN** an authenticated user navigates to `/`
- **THEN** the app shell renders without redirection

#### Scenario: Login page not shown to authenticated users
- **WHEN** an authenticated user navigates to `/login`
- **THEN** the client redirects to `/`

#### Scenario: Unknown routes redirect to home
- **WHEN** any user navigates to an unrecognized path
- **THEN** the client redirects to `/`

### Requirement: Movies login page displays movies branding
The movies login page SHALL display "Movies" as the app name with an appropriate icon. All honeypot behaviors (Forgot Login, Create Account) SHALL function identically to the tracker login page.

#### Scenario: Login page renders movies branding
- **WHEN** the movies login page renders
- **THEN** the app name displayed is "Movies" and the icon reflects the movies app identity

#### Scenario: Successful login navigates to movies home
- **WHEN** the user submits valid credentials on the movies login page
- **THEN** the session is established and the user is navigated to `/`
